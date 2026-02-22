import * as Print from 'expo-print';
// import { BLEPrinter } from '@haroldtran/react-native-thermal-printer'; // Removed static import for Expo Go safety

import { EstimationItem, PurchaseItem, ChitItem, AdvanceItem } from '../types';
import { getSetting } from './dbService';
import { ReceiptConfig } from '../store/GeneralSettingsContext';
import { NativeModules, Alert } from 'react-native';

const { RNBLEPrinter, RNUSBPrinter, RNNetPrinter } = NativeModules;

const patchModule = (module: any) => {
    if (module) {
        if (!module.addListener) module.addListener = () => { };
        if (!module.removeListeners) module.removeListeners = () => { };
    }
};

patchModule(RNBLEPrinter);
patchModule(RNUSBPrinter);
patchModule(RNNetPrinter);

/**
 * Service to handle Printing operations.
 * Supports both System Printing (via expo-print) and Thermal Printing (via ESC/POS).
 */

// ESC/POS Command Helpers
const ESC = '\x1b';
const GS = '\x1d';

const thermalCommands = {
    reset: `${ESC}@`,
    center: `${ESC}a\x01`,
    left: `${ESC}a\x00`,
    right: `${ESC}a\x02`,
    boldOn: `${ESC}E\x01`,
    boldOff: `${ESC}E\x00`,
    doubleOn: `${GS}!\x01`, // Double height only (less intrusive than \x11)
    doubleOff: `${GS}!\x00`,
    divider: '--------------------------------\n',
};

const getCommonStyles = () => `
    <style>
        body {
            font-family: 'Courier New', 'Courier', monospace;
            padding: 4px;
            color: #000;
            max-width: 380px;
            margin: auto;
            font-size: 12px;
            line-height: 1.4;
        }
        .header {
            text-align: center;
            margin-bottom: 4px;
        }
        .shop-name {
            font-size: 16px;
            font-weight: bold;
            text-transform: uppercase;
            letter-spacing: 1px;
        }
        .shop-info {
            font-size: 10px;
            color: #000;
            margin-bottom: 1px;
        }
        .rate-line {
            font-size: 11px;
            text-align: left;
            margin: 1px 0;
        }
        .dash-line {
            font-size: 11px;
            letter-spacing: -1px;
            margin: 3px 0;
            overflow: hidden;
            white-space: nowrap;
        }
        .double-line {
            font-size: 11px;
            letter-spacing: -1px;
            margin: 3px 0;
            overflow: hidden;
            white-space: nowrap;
        }
        .receipt-title {
            text-align: center;
            font-size: 14px;
            font-weight: bold;
            margin: 4px 0;
            text-decoration: underline;
        }
        .section-title {
            text-align: center;
            font-size: 12px;
            font-weight: bold;
            margin: 6px 0 2px 0;
        }
        table {
            width: 100%;
            border-collapse: collapse;
            font-size: 11px;
            margin-bottom: 2px;
        }
        th {
            text-align: left;
            padding: 1px 2px;
            font-weight: bold;
            font-size: 11px;
        }
        td {
            padding: 1px 2px;
            vertical-align: top;
            font-size: 11px;
        }
        .text-right { text-align: right; }
        .row {
            display: flex;
            justify-content: space-between;
            margin-bottom: 1px;
            font-size: 11px;
        }
        .row-bold {
            display: flex;
            justify-content: space-between;
            margin-bottom: 1px;
            font-size: 12px;
            font-weight: bold;
        }
        .total-row {
            display: flex;
            justify-content: space-between;
            font-size: 13px;
            font-weight: bold;
            margin: 2px 0;
        }
        .net-amt {
            text-align: center;
            font-size: 16px;
            font-weight: bold;
            margin: 6px 0;
        }
        .footer {
            text-align: center;
            margin-top: 8px;
            font-size: 10px;
            color: #000;
        }
        .customer-block {
            font-size: 11px;
            margin: 2px 0;
        }
        @media print {
            body { padding: 0; }
        }
    </style>
`;

const getShopHeaderHTML = async (shopDetailsInput?: any, config?: ReceiptConfig) => {
    if (config && !config.showHeader) return '';

    const shopName = shopDetailsInput?.name || await getSetting('shop_name') || 'GOLD ESTIMATION';
    const shopAddress = shopDetailsInput?.address || await getSetting('shop_address') || '';
    const shopPhone = shopDetailsInput?.phone || await getSetting('shop_phone') || '';
    const shopGst = shopDetailsInput?.gstNumber || await getSetting('shop_gst') || '';
    const deviceName = shopDetailsInput?.deviceName || await getSetting('device_name') || '';

    return `
        <div class="header">
            <div class="shop-name">${shopName}</div>
            ${shopAddress ? `<div class="shop-info">${shopAddress}</div>` : ''}
            ${shopPhone ? `<div class="shop-info">Tel: ${shopPhone}</div>` : ''}
            ${(config?.showGST !== false && shopGst) ? `<div class="shop-info">GSTIN: ${shopGst}</div>` : ''}
            ${(config?.showDeviceName !== false && deviceName) ? `<div class="shop-info" style="font-weight: bold; margin-top: 2px;">Device: ${deviceName}</div>` : ''}
        </div>
    `;
};

const getPrinterConfig = async () => {
    const type = await getSetting('printer_type') || 'system';
    const savedPrinter = await getSetting('connected_printer');
    let printer = null;
    if (savedPrinter) {
        try {
            printer = JSON.parse(savedPrinter);
        } catch (e) {
            console.error('Failed to parse printer config', e);
        }
    }
    return { type, printer };
};

const ensureThermalConnection = async (macAddress: string) => {
    try {
        const { BLEPrinter } = require('react-native-thermal-receipt-printer');
        await BLEPrinter.init();
        await BLEPrinter.connectPrinter(macAddress);
        return true;
    } catch (e) {
        console.error('Failed to connect to thermal printer:', e);
        return false;
    }
};

export const sendTestPrint = async (employeeName?: string, config?: ReceiptConfig): Promise<void> => {
    const { type, printer } = await getPrinterConfig();

    if (type === 'thermal' && printer?.address) {
        const connected = await ensureThermalConnection(printer.address);
        if (connected) {
            const { BLEPrinter } = require('react-native-thermal-receipt-printer');
            const shopName = await getSetting('shop_name') || 'GOLD ESTIMATION';
            const deviceName = await getSetting('device_name') || '';

            let payload = `${thermalCommands.reset}${thermalCommands.center}`;

            if (!config || config.showHeader) {
                payload += `${thermalCommands.doubleOn}${shopName}${thermalCommands.doubleOff}\x0a`;
                if (config?.showDeviceName !== false && deviceName) payload += `Device: ${deviceName}\x0a`;
            }

            payload += `STATUS: SUCCESSFUL\x0a`;
            if ((!config || config.showOperator) && employeeName) payload += `By: ${employeeName}\x0a`;
            payload += `${thermalCommands.divider}${new Date().toLocaleString()}\x0a\x0a\x0a\x0a`;
            BLEPrinter.printText(payload);
            return;
        } else {
            Alert.alert('Printer Error', 'Could not connect to thermal printer. Please ensure it is ON and nearby.');
        }
    }

    const header = await getShopHeaderHTML(null, config);
    const html = `
        <html>
            <head>${getCommonStyles()}</head>
            <body>
                ${header}
                <div class="receipt-title">TEST PRINT</div>
                ${(config?.showOperator !== false && employeeName) ? `<div class="row"><span>By:</span><span>${employeeName}</span></div>` : ''}
                <div class="row">
                    <span>Status:</span>
                    <span style="color: green; font-weight: bold;">SUCCESSFUL</span>
                </div>
                <div class="row">
                    <span>Date:</span>
                    <span>${new Date().toLocaleString()}</span>
                </div>
                <div class="divider"></div>
                ${(!config || config.showFooter) ? '<div class="footer">Thank you for using Gold Estimation App</div>' : ''}
            </body>
        </html>
    `;

    await Print.printAsync({ html });
};

export const printEstimationItem = async (item: EstimationItem, shopDetails?: any, employeeName?: string, config?: ReceiptConfig): Promise<void> => {
    const { type, printer } = await getPrinterConfig();

    if (type === 'thermal' && printer?.address) {
        const connected = await ensureThermalConnection(printer.address);
        if (connected) {
            const shopName = shopDetails?.name || await getSetting('shop_name') || 'GOLD ESTIMATION';
            const deviceName = await getSetting('device_name') || '';
            let payload = `${thermalCommands.reset}${thermalCommands.center}`;

            if (!config || config.showHeader) {
                payload += `${thermalCommands.boldOn}${shopName}${thermalCommands.boldOff}\x0a`;
                if (config?.showDeviceName !== false && deviceName) payload += `Device: ${deviceName}\x0a`;
            }

            payload += `${thermalCommands.divider}${thermalCommands.boldOn}ESTIMATION DETAILS${thermalCommands.boldOff}\x0a`;
            payload += `${thermalCommands.left}${item.name.toUpperCase()}\x0a`;
            if (item.tagNumber) payload += `Tag: ${item.tagNumber}\x0a`;
            payload += `${thermalCommands.divider}`;
            payload += `Metal: ${item.metal} ${item.purity}${item.metal === 'SILVER' ? '' : 'K'}\x0a`;
            payload += `Gross Wt: ${item.grossWeight.toFixed(3)}g\x0a`;
            payload += `Net Wt:   ${item.netWeight.toFixed(3)}g\x0a`;
            payload += `Rate/g:   Rs. ${item.rate}\x0a`;
            payload += `${thermalCommands.divider}`;
            const vWeight = item.wastageType === 'percentage' ? (item.netWeight * item.wastage / 100) : item.wastage;
            payload += `Gold Val: Rs. ${Math.round(item.goldValue).toLocaleString()}\x0a`;

            if (!config || config.showWastage) {
                const wValue = config?.wastageDisplayType === 'grams' ? `${vWeight.toFixed(3)}g` : `${item.wastage}${item.wastageType === 'percentage' ? '%' : 'g'}`;
                payload += `VA (${wValue}): Rs. ${Math.round(item.wastageValue).toLocaleString()}\x0a`;
            }
            if (!config || config.showMakingCharge) {
                let mcLabel = '';
                if (config?.makingChargeDisplayType === 'percentage') mcLabel = `${item.makingCharge}%`;
                else if (config?.makingChargeDisplayType === 'grams') mcLabel = 'Weight';
                else if (config?.makingChargeDisplayType === 'fixed') mcLabel = 'Fixed';
                else mcLabel = item.makingChargeType === 'percentage' ? `${item.makingCharge}%` : (item.makingChargeType === 'perGram' ? 'Weight' : 'Fixed');

                payload += `MC (${mcLabel}): Rs. ${Math.round(item.makingChargeValue).toLocaleString()}\x0a`;
            }
            if (!config || config.showGST) {
                payload += `GST (3%):  Rs. ${Math.round(item.gstValue).toLocaleString()}\x0a`;
            }

            payload += `${thermalCommands.divider}`;
            payload += `${thermalCommands.boldOn}${thermalCommands.doubleOn}TOTAL: Rs. ${Math.round(item.totalValue).toLocaleString()}${thermalCommands.doubleOff}${thermalCommands.boldOff}\x0a`;
            payload += `\x0a\x0a\x0a\x0a`;

            const { BLEPrinter } = require('react-native-thermal-receipt-printer');
            BLEPrinter.printText(payload);
            return;
        }
    }

    const header = await getShopHeaderHTML(shopDetails, config);
    const html = `
        <html>
            <head>${getCommonStyles()}</head>
            <body>
                ${header}
                <div class="receipt-title">ESTIMATION DETAILS</div>
                ${(config?.showOperator !== false && employeeName) ? `<div class="row"><span>Operator:</span><span>${employeeName}</span></div>` : ''}
                <div class="item-name">${item.name.toUpperCase()}</div>
                ${item.subProductName ? `<div class="shop-info">${item.subProductName}</div>` : ''}
                ${item.tagNumber ? `<div class="shop-info">Tag: ${item.tagNumber}</div>` : ''}
                
                <div class="divider"></div>
                
                <div class="row"><span>Metal/Purity:</span><span>${item.metal} ${item.purity}${item.metal === 'SILVER' ? '' : 'K'}</span></div>
                <div class="row"><span>Gross Weight:</span><span>${item.grossWeight.toFixed(3)} g</span></div>
                ${item.stoneWeight > 0 ? `<div class="row"><span>Stone Weight:</span><span>${item.stoneWeight.toFixed(3)} g</span></div>` : ''}
                <div class="row" style="font-weight: bold;"><span>Net Weight:</span><span>${item.netWeight.toFixed(3)} g</span></div>
                <div class="row"><span>Rate/g:</span><span>Rs. ${item.rate.toLocaleString()}</span></div>
                
                <div class="divider"></div>
                
                <div class="row"><span>Gold Value:</span><span>Rs. ${Math.round(item.goldValue).toLocaleString()}</span></div>
                ${(!config || config.showWastage) ? `
                <div class="row">
                    <span>VA (${config?.wastageDisplayType === 'grams' ? `${(item.wastageType === 'percentage' ? (item.netWeight * item.wastage / 100) : item.wastage).toFixed(3)} g` : `${item.wastage}${item.wastageType === 'percentage' ? '%' : 'g'}`}):</span>
                    <span>Rs. ${Math.round(item.wastageValue).toLocaleString()}</span>
                </div>` : ''}
                ${(!config || config.showMakingCharge) ? `
                <div class="row">
                    <span>MC (${config?.makingChargeDisplayType === 'percentage' ? `${item.makingCharge}%` : (config?.makingChargeDisplayType === 'grams' ? 'Weight' : (config?.makingChargeDisplayType === 'fixed' ? 'Fixed' : (item.makingChargeType === 'percentage' ? `${item.makingCharge}%` : (item.makingChargeType === 'perGram' ? 'Weight' : 'Fixed'))))}):</span>
                    <span>Rs. ${Math.round(item.makingChargeValue).toLocaleString()}</span>
                </div>` : ''}
                ${(!config || config.showGST) ? `<div class="row"><span>GST (3%):</span><span>Rs. ${Math.round(item.gstValue).toLocaleString()}</span></div>` : ''}
                
                <div class="total-section">
                    <div class="total-row">
                        <span>TOTAL:</span>
                        <span>Rs. ${Math.round(item.totalValue).toLocaleString()}</span>
                    </div>
                </div>
                
                ${(!config || config.showFooter) ? '<div class="footer">This is a computer generated estimation.</div>' : ''}
            </body>
        </html>
    `;

    await Print.printAsync({ html });
};

export const printPurchaseItem = async (item: PurchaseItem, shopDetails?: any, employeeName?: string, config?: ReceiptConfig): Promise<void> => {
    const { type, printer } = await getPrinterConfig();

    if (type === 'thermal' && printer?.address) {
        const connected = await ensureThermalConnection(printer.address);
        if (connected) {
            const shopName = shopDetails?.name || await getSetting('shop_name') || 'GOLD ESTIMATION';
            const deviceName = await getSetting('device_name') || '';
            let payload = `${thermalCommands.reset}${thermalCommands.center}`;

            if (!config || config.showHeader) {
                payload += `${thermalCommands.boldOn}${shopName}${thermalCommands.boldOff}\x0a`;
                if (config?.showDeviceName !== false && deviceName) payload += `Device: ${deviceName}\x0a`;
            }

            payload += `${thermalCommands.divider}${thermalCommands.boldOn}PURCHASE RECEIPT${thermalCommands.boldOff}\x0a`;
            payload += `${thermalCommands.left}${item.category.toUpperCase()}\x0a`;
            payload += `${thermalCommands.divider}`;
            payload += `Gross Wt: ${item.grossWeight.toFixed(3)}g\x0a`;
            payload += `Net Wt:   ${item.netWeight.toFixed(3)}g\x0a`;
            payload += `Rate/g:   Rs. ${item.rate}\x0a`;
            payload += `${thermalCommands.divider}`;
            payload += `${thermalCommands.boldOn}${thermalCommands.doubleOn}VALUE: Rs. ${item.amount.toLocaleString()}${thermalCommands.doubleOff}${thermalCommands.boldOff}\x0a`;
            payload += `\x0a\x0a\x0a\x0a`;

            const { BLEPrinter } = require('react-native-thermal-receipt-printer');
            BLEPrinter.printText(payload);
            return;
        }
    }

    const header = await getShopHeaderHTML(shopDetails, config);
    const lessLabel = item.lessWeightType === 'percentage' ? `${item.lessWeight}%` : item.lessWeightType === 'amount' ? `Rs.${item.lessWeight}` : `${item.lessWeight}g`;

    const html = `
        <html>
            <head>${getCommonStyles()}</head>
            <body>
                ${header}
                <div class="receipt-title">PURCHASE / OLD GOLD</div>
                ${(config?.showOperator !== false && employeeName) ? `<div class="row"><span>Operator:</span><span>${employeeName}</span></div>` : ''}
                <div class="item-name">${item.category.toUpperCase()}</div>
                ${item.subCategory ? `<div class="shop-info">${item.subCategory}</div>` : ''}
                
                <div class="divider"></div>
                
                <div class="row"><span>Purity:</span><span>${item.purity}</span></div>
                <div class="row"><span>Gross Weight:</span><span>${item.grossWeight.toFixed(3)} g</span></div>
                <div class="row">
                    <span>Less (${lessLabel}):</span>
                    <span>-${item.lessWeightType === 'amount' ? '' : ' '}${item.lessWeightType === 'amount' ? item.lessWeight : (item.grossWeight - item.netWeight).toFixed(3)}</span>
                </div>
                <div class="row" style="font-weight: bold;"><span>Net Weight:</span><span>${item.netWeight.toFixed(3)} g</span></div>
                <div class="row"><span>Rate/g:</span><span>Rs. ${item.rate.toLocaleString()}</span></div>
                
                <div class="total-section">
                    <div class="total-row">
                        <span>PURCHASE VALUE:</span>
                        <span>Rs. ${item.amount.toLocaleString()}</span>
                    </div>
                </div>
                ${(!config || config.showFooter) ? `<div class="footer">${shopDetails?.footerMessage || 'Thank You! Visit Again.'}</div>` : ''}
            </body>
        </html>
    `;

    await Print.printAsync({ html });
};

export const printEstimationReceipt = async (
    items: EstimationItem[],
    purchaseItems: PurchaseItem[],
    chitItems: ChitItem[] = [],
    advanceItems: AdvanceItem[] = [],
    shopDetailsInput: any,
    customerName?: string,
    employeeName?: string,
    config?: ReceiptConfig,
    estimationNumber?: number
): Promise<void> => {
    const { type, printer } = await getPrinterConfig();
    const shopDetails = shopDetailsInput || {
        name: 'Gold Management System',
        address: 'Your Shop Address',
        phone: '1234567890',
        footerMessage: 'Thank you for your visit!'
    };

    if (type === 'thermal' && printer?.address) {
        const connected = await ensureThermalConnection(printer.address);
        if (connected) {
            const shopName = shopDetails?.name || await getSetting('shop_name') || 'GOLD ESTIMATION';
            const deviceName = await getSetting('device_name') || '';
            const thermGoldRate22k = await getSetting('rate_22k') || '0';
            const thermGoldRate18k = await getSetting('rate_18k') || '0';
            const thermSilverRate = await getSetting('rate_silver') || '0';
            const thermDateStr = new Date().toLocaleDateString('en-IN', { day: '2-digit', month: '2-digit', year: 'numeric' });

            // Helper: pad string to fixed width for 32-char thermal printer
            const padR = (s: string, w: number) => s.length >= w ? s.substring(0, w) : s + ' '.repeat(w - s.length);
            const padL = (s: string, w: number) => s.length >= w ? s.substring(0, w) : ' '.repeat(w - s.length) + s;
            const LINE = '================================\x0a';
            const DASH = '--------------------------------\x0a';

            let payload = `${thermalCommands.reset}${thermalCommands.center}`;

            if (!config || config.showHeader) {
                payload += `${thermalCommands.boldOn}${thermalCommands.doubleOn}${shopName}${thermalCommands.doubleOff}${thermalCommands.boldOff}\x0a`;
                if (config?.showDeviceName !== false && deviceName) payload += `Device: ${deviceName}\x0a`;
            }

            payload += `${thermalCommands.boldOn}ESTIMATION SLIP${thermalCommands.boldOff}\x0a`;
            if (estimationNumber) {
                payload += `Est #: ${estimationNumber}\x0a`;
            }
            payload += `${thermalCommands.left}`;
            payload += `Rate:22K:${parseFloat(thermGoldRate22k).toFixed(2)}  Date:${thermDateStr}\x0a`;
            payload += `Rate:18K:${parseFloat(thermGoldRate18k).toFixed(2)}  Silver:${parseFloat(thermSilverRate).toFixed(2)}\x0a`;
            payload += LINE;

            if (config?.showCustomer !== false && customerName) {
                payload += `Customer: ${customerName.toUpperCase()}\x0a`;
            }
            if (config?.showOperator !== false && employeeName) {
                payload += `Operator: ${employeeName}\x0a`;
            }
            if ((config?.showCustomer !== false && customerName) || (config?.showOperator !== false && employeeName)) {
                payload += LINE;
            }

            // Items header: 32 chars total
            // NAME(8) PCS(3) WT(7) WST(5) MC(4) AMT(5) = 32
            payload += `${thermalCommands.boldOn}${padR('ITEMS', 8)}${padR('Pcs', 3)}${padR('WT', 7)}${padR('WST', 5)}${padR('MC', 4)}${padL('AMT', 5)}${thermalCommands.boldOff}\x0a`;
            payload += DASH;

            let totalTaxableValue = 0;
            let totalGrossWeight = 0;
            let totalNetWeight = 0;
            let totalPurchaseAmount = 0;

            items.forEach(item => {
                const itemTaxable = item.goldValue + item.wastageValue + item.makingChargeValue;
                totalTaxableValue += itemTaxable;
                totalGrossWeight += item.grossWeight;
                totalNetWeight += item.netWeight;

                // Item name on its own line
                payload += `${item.name.substring(0, 20).toUpperCase()}\x0a`;
                if (item.tagNumber) payload += `(${item.tagNumber})\x0a`;
                // Data row: aligned columns
                const pcsStr = item.pcs.toString();
                const wtStr = item.grossWeight.toFixed(3);
                const wstStr = Math.round(item.wastageValue).toString();
                const mcStr = Math.round(item.makingChargeValue).toString();
                const amtStr = Math.round(itemTaxable).toFixed(2);
                payload += `${padR('', 8)}${padR(pcsStr, 3)}${padR(wtStr, 7)}${padR(wstStr, 5)}${padR(mcStr, 4)}${padL(amtStr, 5)}\x0a`;
            });

            payload += DASH;
            payload += `${thermalCommands.boldOn}${padR('TOTAL', 8)}${padR('', 3)}${padR(totalGrossWeight.toFixed(3), 7)}${padR('', 5)}${padR('', 4)}${padL(Math.round(totalTaxableValue).toFixed(2), 5)}${thermalCommands.boldOff}\x0a`;
            payload += DASH;
            payload += `${padR('NETWT', 8)}${padR('', 3)}${padR(totalNetWeight.toFixed(3), 7)}\x0a`;
            payload += DASH;

            // GST
            const splitGST = (totalTaxableValue * 0.03) / 2;
            const totalGST = totalTaxableValue * 0.03;
            const estimationAmt = totalTaxableValue + totalGST;

            if (!config || config.showGST) {
                payload += `     CGST 1.50%  ${padL(Math.round(splitGST).toFixed(2), 10)}\x0a`;
                payload += `     SGST 1.50%  ${padL(Math.round(splitGST).toFixed(2), 10)}\x0a`;
            }
            payload += `${thermalCommands.boldOn}Est.Amount:-  ${padL(Math.round(estimationAmt).toFixed(2), 12)}${thermalCommands.boldOff}\x0a`;

            // Purchase section
            if (purchaseItems.length > 0) {
                payload += LINE;
                payload += `${thermalCommands.center}${thermalCommands.boldOn}* Purchase Quotation *${thermalCommands.boldOff}\x0a`;
                payload += `${thermalCommands.left}Date : ${thermDateStr}\x0a`;
                payload += `${padR('ITEMS', 14)}${padR('WT', 8)}${padL('Amount', 10)}\x0a`;
                let totalPurWeight = 0;
                purchaseItems.forEach(item => {
                    totalPurchaseAmount += item.amount;
                    totalPurWeight += item.netWeight;
                    payload += `${padR(item.category.toUpperCase().substring(0, 14), 14)}${padR(item.netWeight.toFixed(3), 8)}${padL(Math.round(item.amount).toFixed(2), 10)}\x0a`;
                });
                payload += DASH;
                payload += `${thermalCommands.boldOn}${padR('PurTot', 14)}${padR(totalPurWeight.toFixed(3), 8)}${padL(Math.round(totalPurchaseAmount).toFixed(2), 10)}${thermalCommands.boldOff}\x0a`;
            }

            // Chit section
            let totalChit = 0;
            if (chitItems.length > 0) {
                payload += DASH;
                chitItems.forEach(item => {
                    totalChit += item.amount;
                    payload += `${padR('Chit (' + item.chitId + ')', 20)}${padL('-' + Math.round(item.amount).toFixed(2), 12)}\x0a`;
                });
            }

            // Advance section
            let totalAdvance = 0;
            if (advanceItems.length > 0) {
                payload += DASH;
                advanceItems.forEach(item => {
                    totalAdvance += item.amount;
                    payload += `${padR('Advance (' + item.advanceId + ')', 20)}${padL('-' + Math.round(item.amount).toFixed(2), 12)}\x0a`;
                });
            }

            const netPayable = estimationAmt - totalPurchaseAmount - totalChit - totalAdvance;

            payload += LINE;
            payload += `${thermalCommands.center}${thermalCommands.boldOn}${thermalCommands.doubleOn}Net Amt Rs.${Math.round(netPayable).toLocaleString('en-IN')}.00${thermalCommands.doubleOff}${thermalCommands.boldOff}\x0a`;
            payload += LINE;

            // if (config?.showOperator !== false && employeeName) payload += `${employeeName}\x0a`;
            if (!config || config.showFooter) payload += `THANK YOU VISIT AGAIN\x0a`;
            payload += `\x0a\x0a\x0a\x00`;

            const { BLEPrinter } = require('react-native-thermal-receipt-printer');
            BLEPrinter.printText(payload);
            return;
        }
    }

    // Fetch gold/silver rates for display
    const goldRate22k = await getSetting('rate_22k') || '0';
    const goldRate18k = await getSetting('rate_18k') || '0';
    const silverRate = await getSetting('rate_silver') || '0';
    const dateStr = new Date().toLocaleDateString('en-IN', { day: '2-digit', month: '2-digit', year: 'numeric' });

    const header = await getShopHeaderHTML(shopDetails, config);

    // Calculate totals
    const totalWeight = items.reduce((sum, item) => sum + item.netWeight, 0);
    const totalGrossWeight = items.reduce((sum, item) => sum + item.grossWeight, 0);
    const totalItemAmount = items.reduce((sum, item) => {
        // Amount before GST = goldValue + wastageValue + makingChargeValue
        return sum + item.goldValue + item.wastageValue + item.makingChargeValue;
    }, 0);
    const totalGST = items.reduce((sum, item) => sum + item.gstValue, 0);
    const estimationAmount = totalItemAmount + totalGST;

    const totalPurchaseAmount = purchaseItems.reduce((sum, item) => sum + item.amount, 0);
    const totalPurchaseWeight = purchaseItems.reduce((sum, item) => sum + item.netWeight, 0);
    const totalChitAmount = chitItems.reduce((sum, item) => sum + item.amount, 0);
    const totalAdvanceAmount = advanceItems.reduce((sum, item) => sum + item.amount, 0);

    const netPayable = estimationAmount - totalPurchaseAmount - totalChitAmount - totalAdvanceAmount;

    const DASH = '--------------------------------------';
    const DOUBLE_DASH = '======================================';

    // --- Estimation Items Section ---
    const itemsHTML = items.length > 0 ? `
        <div class="dash-line">${DASH}</div>
        <table>
            <thead>
                <tr>
                    <th>ITEMS</th>
                    <th class="text-right">Pcs</th>
                    <th class="text-right">WT</th>
                    <th class="text-right">WST</th>
                    <th class="text-right">MC</th>
                    <th class="text-right">AMOUNT</th>
                </tr>
            </thead>
        </table>
        <div class="dash-line">${DASH}</div>
        ${items.map(item => {
        const itemTotal = item.goldValue + item.wastageValue + item.makingChargeValue;
        return `
                <table>
                    <tr>
                        <td colspan="6" style="font-weight:bold;padding-bottom:0;">${item.name.toUpperCase()}</td>
                    </tr>
                    ${item.tagNumber ? `<tr><td colspan="6" style="font-size:10px;padding-top:0;">(${item.tagNumber})</td></tr>` : ''}
                    ${item.subProductName ? `<tr><td colspan="6" style="font-size:10px;padding-top:0;">${item.subProductName}</td></tr>` : ''}
                    <tr>
                        <td></td>
                        <td class="text-right">${item.pcs}</td>
                        <td class="text-right">${item.grossWeight.toFixed(3)}</td>
                        <td class="text-right">${Math.round(item.wastageValue)}</td>
                        <td class="text-right">${Math.round(item.makingChargeValue)}</td>
                        <td class="text-right">${Math.round(itemTotal).toFixed(2)}</td>
                    </tr>
                </table>
            `;
    }).join('')}
        <div class="dash-line">${DASH}</div>
        <div class="row-bold">
            <span>TOTAL</span>
            <span style="margin-left:auto;margin-right:40px;">${totalGrossWeight.toFixed(3)}</span>
            <span>${Math.round(totalItemAmount).toFixed(2)}</span>
        </div>
        <div class="dash-line">${DASH}</div>
        <div class="row">
            <span>NETWT</span>
            <span>${totalWeight.toFixed(3)}</span>
        </div>
        <div class="dash-line">${DASH}</div>
    ` : '';

    // --- GST Section ---
    const gstHTML = (!config || config.showGST) ? `
        <div class="row"><span style="margin-left:40%;">CGST 1.50%</span><span>${Math.round(totalGST / 2).toFixed(2)}</span></div>
        <div class="row"><span style="margin-left:40%;">SGST 1.50%</span><span>${Math.round(totalGST / 2).toFixed(2)}</span></div>
        <div class="row-bold"><span style="margin-left:40%;">Est.Amount :-</span><span>${Math.round(estimationAmount).toFixed(2)}</span></div>
    ` : `
        <div class="row-bold"><span>Est.Amount :-</span><span>${Math.round(estimationAmount).toFixed(2)}</span></div>
    `;

    // --- Purchase Quotation Section ---
    const purchaseHTML = purchaseItems.length > 0 ? `
        <div class="double-line">${DOUBLE_DASH}</div>
        <div class="section-title">* Purchase Quotation *</div>
        <div class="rate-line">Date : ${dateStr}</div>
        <table>
            <thead>
                <tr>
                    <th>ITEMS</th>
                    <th class="text-right">WT</th>
                    <th class="text-right">Amount</th>
                </tr>
            </thead>
            <tbody>
                ${purchaseItems.map(p => `
                    <tr>
                        <td>${p.category.toUpperCase()}</td>
                        <td class="text-right">${p.netWeight.toFixed(3)}</td>
                        <td class="text-right">${Math.round(p.amount).toFixed(2)}</td>
                    </tr>
                `).join('')}
            </tbody>
        </table>
        <div class="dash-line">${DASH}</div>
        <div class="row-bold">
            <span>PurTot</span>
            <span>${totalPurchaseWeight.toFixed(3)}</span>
            <span>${Math.round(totalPurchaseAmount).toFixed(2)}</span>
        </div>
    ` : '';

    // --- Chit/Advance Deduction rows ---
    const chitHTML = chitItems.length > 0 ? `
        <div class="dash-line">${DASH}</div>
        ${chitItems.map(item => `
            <div class="row">
                <span>Chit (${item.chitId})</span>
                <span>-${Math.round(item.amount).toFixed(2)}</span>
            </div>
        `).join('')}
    ` : '';

    const advanceHTML = advanceItems.length > 0 ? `
        <div class="dash-line">${DASH}</div>
        ${advanceItems.map(item => `
            <div class="row">
                <span>Advance (${item.advanceId})</span>
                <span>-${Math.round(item.amount).toFixed(2)}</span>
            </div>
        `).join('')}
    ` : '';

    // --- Rate info lines ---
    const rateInfoHTML = `
        <div class="rate-line">Rate : Gold 91.6 : ${parseFloat(goldRate22k).toFixed(2)} &nbsp; Date :- ${dateStr}</div>
        <div class="rate-line">Rate : 18 KT : ${parseFloat(goldRate18k).toFixed(2)} &nbsp; Silver : ${parseFloat(silverRate).toFixed(2)}</div>
    `;

    const html = `
        <html>
            <head>${getCommonStyles()}</head>
            <body>
                ${header}
                <div class="receipt-title">ESTIMATION SLIP</div>
                ${estimationNumber ? `<div class="row-bold" style="justify-content: center; margin-bottom: 5px;">Est #: ${estimationNumber}</div>` : ''}
                ${rateInfoHTML}
                <div class="double-line">${DOUBLE_DASH}</div>
                ${(config?.showCustomer !== false && customerName) ? `
                    <div class="customer-block">
                        Customer Name : ${customerName.toUpperCase()}
                    </div>
                ` : ''}
                <div class="double-line">${DOUBLE_DASH}</div>

                ${itemsHTML}

                ${gstHTML}

                <div class="double-line">${DOUBLE_DASH}</div>

                ${purchaseHTML}

                ${chitHTML}

                ${advanceHTML}

                <div class="double-line">${DOUBLE_DASH}</div>
                <div class="net-amt">Net Amt &nbsp; Rs.${Math.round(netPayable).toLocaleString('en-IN')}.00</div>
                <div class="double-line">${DOUBLE_DASH}</div>

                ${(config?.showOperator !== false && employeeName) ? `<div class="footer">${employeeName}</div>` : ''}
                ${(!config || config.showFooter) ? `<div class="footer">${shopDetails?.footerMessage || 'THANK YOU VISIT AGAIN'}</div>` : ''}
            </body>
        </html>
    `;

    await Print.printAsync({ html });
};

export const printChitItem = async (item: ChitItem, shopDetails: any, employeeName?: string, config?: ReceiptConfig) => {
    const header = await getShopHeaderHTML(shopDetails, config);
    const html = `
        <html>
            <head>${getCommonStyles()}</head>
            <body>
                ${header}
                <div class="receipt-title">CHIT RECEIPT</div>
                <div class="row"><span>Date:</span><span>${new Date().toLocaleString()}</span></div>
                ${(config?.showOperator !== false && employeeName) ? `<div class="row"><span>Operator:</span><span>${employeeName}</span></div>` : ''}
                <div class="divider"></div>
                <div class="row" style="font-size: 16px; margin-top: 10px;">
                    <span>CHIT ID:</span>
                    <span style="font-weight: bold;">${item.chitId}</span>
                </div>
                <div class="total-section" style="margin-top: 20px;">
                    <div class="total-row">
                        <span>NET PAID:</span>
                        <span>Rs. ${item.amount.toLocaleString()}</span>
                    </div>
                </div>
                ${(!config || config.showFooter) ? `<div class="footer">${shopDetails?.footerMessage || ''}</div>` : ''}
            </body>
        </html>
    `;

    const macAddress = await getSetting('thermal_printer_address');
    if (macAddress && typeof macAddress === 'string') {
        try {
            const { BLEPrinter } = require('react-native-thermal-receipt-printer');
            await ensureThermalConnection(macAddress);
            const deviceName = await getSetting('device_name') || '';
            const text = `
${(!config || config.showHeader) ? shopDetails?.name || 'RECEIPT' : ''}
${(config?.showDeviceName !== false && deviceName) ? `Device: ${deviceName}\n` : ''}${(!config || config.showOperator) && employeeName ? `Operator: ${employeeName}\n` : ''}CHIT RECEIPT
--------------------------------
Date: ${new Date().toLocaleString()}
CHIT ID: ${item.chitId}
--------------------------------
NET PAID: Rs. ${item.amount.toLocaleString()}
--------------------------------
${(!config || config.showFooter) ? shopDetails?.footerMessage || '' : ''}

\n\n\n`;
            await BLEPrinter.printText(text);
            return;
        } catch (e) {
            console.error('Thermal print failed:', e);
        }
    }

    await Print.printAsync({ html });
};

export const printAdvanceItem = async (item: AdvanceItem, shopDetails: any, employeeName?: string, config?: ReceiptConfig) => {
    const header = await getShopHeaderHTML(shopDetails, config);
    const html = `
        <html>
            <head>${getCommonStyles()}</head>
            <body>
                ${header}
                <div class="receipt-title">ADVANCE RECEIPT</div>
                <div class="row"><span>Date:</span><span>${new Date().toLocaleString()}</span></div>
                ${(config?.showOperator !== false && employeeName) ? `<div class="row"><span>Operator:</span><span>${employeeName}</span></div>` : ''}
                <div class="divider"></div>
                <div class="row" style="font-size: 16px; margin-top: 10px;">
                    <span>ADVANCE ID:</span>
                    <span style="font-weight: bold;">${item.advanceId}</span>
                </div>
                <div class="total-section" style="margin-top: 20px;">
                    <div class="total-row">
                        <span>ADVANCE PAID:</span>
                        <span>Rs. ${item.amount.toLocaleString()}</span>
                    </div>
                </div>
                ${(!config || config.showFooter) ? `<div class="footer">${shopDetails?.footerMessage || ''}</div>` : ''}
            </body>
        </html>
    `;

    const macAddress = await getSetting('thermal_printer_address');
    if (macAddress && typeof macAddress === 'string') {
        try {
            const { BLEPrinter } = require('react-native-thermal-receipt-printer');
            await ensureThermalConnection(macAddress);
            const deviceName = await getSetting('device_name') || '';
            const text = `
${(!config || config.showHeader) ? shopDetails?.name || 'RECEIPT' : ''}
${(config?.showDeviceName !== false && deviceName) ? `Device: ${deviceName}\n` : ''}${(!config || config.showOperator) && employeeName ? `Operator: ${employeeName}\n` : ''}ADVANCE RECEIPT
--------------------------------
Date: ${new Date().toLocaleString()}
ADVANCE ID: ${item.advanceId}
--------------------------------
ADVANCE PAID: Rs. ${item.amount.toLocaleString()}
--------------------------------
${(!config || config.showFooter) ? shopDetails?.footerMessage || '' : ''}

\n\n\n`;
            await BLEPrinter.printText(text);
            return;
        } catch (e) {
            console.error('Thermal print failed:', e);
        }
    }

    await Print.printAsync({ html });
};
