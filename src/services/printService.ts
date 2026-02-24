import * as Print from 'expo-print';
// import { BLEPrinter } from '@haroldtran/react-native-thermal-printer'; // Removed static import for Expo Go safety

import { EstimationItem, PurchaseItem, ChitItem, AdvanceItem } from '../types';
import { getSetting } from './dbService';
import { ReceiptConfig } from '../store/GeneralSettingsContext';
import { NativeModules, Alert } from 'react-native';

type TFunction = (key: string, params?: Record<string, string>) => string;

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
    doubleOn: `${GS}!\x11`, // Double height and width
    doubleOff: `${GS}!\x00`,
    divider: (width: number) => '-'.repeat(width) + '\n',
    line: (width: number) => '='.repeat(width) + '\n',
};

export const getCharWidth = (paperWidth: string = '58mm') => {
    if (paperWidth === '80mm') return 48;
    if (paperWidth === '112mm') return 64;
    return 32;
};

export const getColumnConfig = (paperWidth: string = '58mm') => {
    switch (paperWidth) {
        case '80mm':
            return { name: 16, pcs: 4, wt: 8, wst: 6, mc: 6, amt: 8 };
        case '112mm':
            return { name: 24, pcs: 6, wt: 10, wst: 8, mc: 8, amt: 8 };
        case '58mm':
        default:
            return { name: 8, pcs: 3, wt: 7, wst: 5, mc: 4, amt: 5 };
    }
};

export const cleanThermalPayload = (payload: string) => {
    return payload
        .replace(/\x1b@/g, '') // Reset
        .replace(/\x1ba\x01/g, '') // Center
        .replace(/\x1ba\x00/g, '') // Left
        .replace(/\x1ba\x02/g, '') // Right
        .replace(/\x1bE\x01/g, '') // Bold On
        .replace(/\x1bE\x00/g, '') // Bold Off
        .replace(/\x1d!\x11/g, '') // Double On
        .replace(/\x1d!\x00/g, '') // Double Off
        .replace(/\x0a/g, '\n') // Newline
        .replace(/\x00/g, ''); // Null
};

const padR = (s: string, w: number) => s.length >= w ? s.substring(0, w) : s + ' '.repeat(w - s.length);
const padL = (s: string, w: number) => s.length >= w ? s.substring(0, w) : ' '.repeat(w - s.length) + s;

const getCommonStyles = (paperWidth: string = '58mm') => {
    let maxWidth = '380px';
    if (paperWidth === '58mm') maxWidth = '220px';
    if (paperWidth === '112mm') maxWidth = '450px';

    return `
    <style>
        body {
            font-family: 'Courier New', 'Courier', monospace;
            padding: 4px;
            color: #000;
            max-width: ${maxWidth};
            margin: auto;
            font-size: 11px;
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
};

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

export interface PrinterData {
    id: string;
    name: string;
    address: string;
    type: 'bluetooth' | 'usb' | 'net';
}

/**
 * Attempts to auto-connect to the saved printer.
 */
export const initAutoConnect = async (): Promise<PrinterData | null> => {
    try {
        const savedPrinter = await getSetting('connected_printer');
        const printerType = await getSetting('printer_type');

        if (printerType === 'thermal' && savedPrinter) {
            const printer = JSON.parse(savedPrinter);
            if (printer && printer.address) {
                console.log('Attempting auto-connect to:', printer.address);
                const connected = await ensureThermalConnection(printer.address);
                if (connected) {
                    return printer;
                }
            }
        }
    } catch (e) {
        console.error('Auto-connect failed:', e);
    }
    return null;
};

const ensureThermalConnection = async (macAddress: string) => {
    try {
        const { BLEPrinter } = require('react-native-thermal-receipt-printer');
        await BLEPrinter.init();
        await BLEPrinter.connectPrinter(macAddress);
        console.log('Successfully connected to thermal printer');
        return true;
    } catch (e: any) {
        console.error('Printer connection failed:', e);
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
            <head>${getCommonStyles(config?.paperWidth)}</head>
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
            <head>${getCommonStyles(config?.paperWidth)}</head>
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

export const printPurchaseItem = async (item: PurchaseItem, shopDetails?: any, employeeName?: string, config?: ReceiptConfig, t?: TFunction): Promise<void> => {
    const _t = t || ((key: string) => key);
    const { type, printer } = await getPrinterConfig();

    if (type === 'thermal' && printer?.address) {
        const connected = await ensureThermalConnection(printer.address);
        if (connected) {
            const shopName = shopDetails?.name || await getSetting('shop_name') || 'GOLD ESTIMATION';
            const deviceName = await getSetting('device_name') || '';
            let payload = `${thermalCommands.reset}${thermalCommands.center}`;

            if (!config || config.showHeader) {
                payload += `${thermalCommands.boldOn}${shopName}${thermalCommands.boldOff}\x0a`;
                if (config?.showDeviceName !== false && deviceName) payload += `${_t('device_label')}: ${deviceName}\x0a`;
            }

            payload += `${thermalCommands.divider}${thermalCommands.boldOn}${_t('purchase_receipt')}${thermalCommands.boldOff}\x0a`;
            payload += `${thermalCommands.left}${item.category.toUpperCase()}\x0a`;
            payload += `${thermalCommands.divider}`;
            payload += `${_t('gross_wt_label')}: ${item.grossWeight.toFixed(3)}g\x0a`;
            payload += `${_t('net_wt_label')}:   ${item.netWeight.toFixed(3)}g\x0a`;
            payload += `${_t('rate_per_g')}:   Rs. ${item.rate}\x0a`;
            payload += `${thermalCommands.divider}`;
            payload += `${thermalCommands.boldOn}${thermalCommands.doubleOn}${_t('value_label')}: Rs. ${item.amount.toLocaleString()}${thermalCommands.doubleOff}${thermalCommands.boldOff}\x0a`;
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
            <head>${getCommonStyles(config?.paperWidth)}</head>
            <body>
                ${header}
                <div class="receipt-title">${_t('purchase_old_gold')}</div>
                ${(config?.showOperator !== false && employeeName) ? `<div class="row"><span>${_t('operator')}:</span><span>${employeeName}</span></div>` : ''}
                <div class="item-name">${item.category.toUpperCase()}</div>
                ${item.subCategory ? `<div class="shop-info">${item.subCategory}</div>` : ''}
                
                <div class="divider"></div>
                
                <div class="row"><span>${_t('purity')}:</span><span>${item.purity}</span></div>
                <div class="row"><span>${_t('gross_weight')}:</span><span>${item.grossWeight.toFixed(3)} g</span></div>
                <div class="row">
                    <span>${_t('less_label')} (${lessLabel}):</span>
                    <span>-${item.lessWeightType === 'amount' ? '' : ' '}${item.lessWeightType === 'amount' ? item.lessWeight : (item.grossWeight - item.netWeight).toFixed(3)}</span>
                </div>
                <div class="row" style="font-weight: bold;"><span>${_t('net_weight')}:</span><span>${item.netWeight.toFixed(3)} g</span></div>
                <div class="row"><span>${_t('rate_per_g')}:</span><span>Rs. ${item.rate.toLocaleString()}</span></div>
                
                <div class="total-section">
                    <div class="total-row">
                        <span>${_t('purchase_value_label')}:</span>
                        <span>Rs. ${item.amount.toLocaleString()}</span>
                    </div>
                </div>
                ${(!config || config.showFooter) ? `<div class="footer">${shopDetails?.footerMessage || _t('thank_you_visit_again')}</div>` : ''}
            </body>
        </html>
    `;

    await Print.printAsync({ html });
};

export const getEstimationReceiptThermalPayload = async (
    items: EstimationItem[],
    purchaseItems: PurchaseItem[],
    chitItems: ChitItem[] = [],
    advanceItems: AdvanceItem[] = [],
    shopDetails: any,
    customerName?: string,
    employeeName?: string,
    config?: ReceiptConfig,
    estimationNumber?: number,
    t?: TFunction
): Promise<string> => {
    const _t = t || ((key: string) => key);
    const paperWidth = config?.paperWidth || '58mm';
    const charWidth = getCharWidth(paperWidth);
    const col = getColumnConfig(paperWidth);

    const shopName = shopDetails?.name || await getSetting('shop_name') || 'GOLD ESTIMATION';
    const deviceName = shopDetails?.deviceName || await getSetting('device_name') || '';
    const rate22k = await getSetting('rate_22k') || '0';
    const rate18k = await getSetting('rate_18k') || '0';
    const silverRate = await getSetting('rate_silver') || '0';
    const dateStr = new Date().toLocaleDateString('en-IN', { day: '2-digit', month: '2-digit', year: 'numeric' });

    const LINE = thermalCommands.line(charWidth);
    const DASH = thermalCommands.divider(charWidth);

    let payload = `${thermalCommands.reset}${thermalCommands.center}`;

    const hasItems = items.length > 0;
    const hasPurchase = purchaseItems.length > 0;
    const hasChit = chitItems.length > 0;
    const hasAdvance = advanceItems.length > 0;

    if (!config || config.showHeader) {
        payload += `${thermalCommands.center}${thermalCommands.boldOn}${thermalCommands.doubleOn}${shopName}${thermalCommands.doubleOff}${thermalCommands.boldOff}\x0a`;
        if (config?.showDeviceName !== false && deviceName) payload += `Device: ${deviceName}\x0a`;
        payload += `${thermalCommands.left}`;
    }

    // Header logic for Standalone vs Full Estimation
    if (hasItems) {
        payload += `${thermalCommands.center}${thermalCommands.boldOn}${_t('estimation_slip')}${thermalCommands.boldOff}${thermalCommands.left}\x0a`;
    } else if (hasPurchase && !hasChit && !hasAdvance) {
        payload += `${thermalCommands.center}${thermalCommands.boldOn}${_t('purchase_voucher')}${thermalCommands.boldOff}${thermalCommands.left}\x0a`;
    } else if (hasChit && !hasPurchase && !hasAdvance) {
        payload += `${thermalCommands.center}${thermalCommands.boldOn}${_t('chit_receipt_title')}${thermalCommands.boldOff}${thermalCommands.left}\x0a`;
    } else if (hasAdvance && !hasPurchase && !hasChit) {
        payload += `${thermalCommands.center}${thermalCommands.boldOn}${_t('advance_receipt_title')}${thermalCommands.boldOff}${thermalCommands.left}\x0a`;
    } else {
        payload += `${thermalCommands.center}${thermalCommands.boldOn}${_t('receipt_title')}${thermalCommands.boldOff}${thermalCommands.left}\x0a`;
    }

    if (estimationNumber) {
        payload += `${_t('est_hash')}: ${estimationNumber}\x0a`;
    }

    // Rates section (hide if only deductions are present)
    if (hasItems) {
        payload += `${_t('rate')}:22K:${parseFloat(rate22k).toLocaleString()}  ${_t('date')}:${dateStr}\x0a`;
        payload += `${_t('rate')}:18K:${parseFloat(rate18k).toLocaleString()}  ${_t('silver_label')}:${parseFloat(silverRate).toLocaleString()}\x0a`;
        payload += LINE;
    } else {
        payload += `${_t('date')}: ${dateStr}\x0a`;
        payload += LINE;
    }

    if (config?.showCustomer !== false && customerName) {
        payload += `${_t('customer')}: ${customerName.toUpperCase()}\x0a`;
    }
    if (config?.showOperator !== false && employeeName) {
        payload += `${_t('operator')}: ${employeeName}\x0a`;
    }
    if ((config?.showCustomer !== false && customerName) || (config?.showOperator !== false && employeeName)) {
        payload += LINE;
    }

    let totalTaxableValue = 0;
    let totalGrossWeight = 0;
    let totalNetWeight = 0;
    let totalPurchaseAmount = 0;

    if (hasItems) {
        const isTableLayout = paperWidth === '80mm' || paperWidth === '112mm';

        if (isTableLayout) {
            // Table Header: ITEM | PCS | WEIGHT | VA | MC | TOTAL
            payload += `${thermalCommands.boldOn}${padR(_t('item'), col.name)}${padL(_t('pcs'), col.pcs)}${padL(_t('weight_g'), col.wt)}${padL(_t('va_label'), col.wst)}${padL(_t('mc_label'), col.mc)}${padL(_t('total'), col.amt)}${thermalCommands.boldOff}\x0a`;
            payload += DASH;

            items.forEach(item => {
                const itemTaxable = item.goldValue + item.wastageValue + item.makingChargeValue;
                totalTaxableValue += itemTaxable;
                totalGrossWeight += item.grossWeight;
                totalNetWeight += item.netWeight;

                const name = item.name.toUpperCase();
                const vWeight = item.wastageType === 'percentage' ? (item.netWeight * item.wastage / 100) : item.wastage;
                const mcVal = Math.round(item.makingChargeValue);
                const wstVal = Math.round(item.wastageValue);

                payload += `${padR(name, col.name)}${padL(item.pcs.toString(), col.pcs)}${padL(item.netWeight.toFixed(3), col.wt)}${padL(Math.round(wstVal).toString(), col.wst)}${padL(Math.round(mcVal).toString(), col.mc)}${padL(Math.round(itemTaxable).toString(), col.amt)}\x0a`;
                if (item.tagNumber) payload += `  Tag: ${item.tagNumber}\x0a`;
            });
        } else {
            // Multi-line layout for 58mm
            payload += `${thermalCommands.boldOn}${padR(_t('items_and_details'), charWidth - 12)}${padL(_t('amount_header'), 12)}${thermalCommands.boldOff}\x0a`;
            payload += DASH;

            items.forEach(item => {
                const itemTaxable = item.goldValue + item.wastageValue + item.makingChargeValue;
                totalTaxableValue += itemTaxable;
                totalGrossWeight += item.grossWeight;
                totalNetWeight += item.netWeight;

                payload += `${item.name.toUpperCase()} | ${item.pcs} ${_t('pcs')}\x0a`;
                if (item.tagNumber) payload += `  Tag: ${item.tagNumber}\x0a`;

                // Detail 1: Weights and Basic Info
                payload += `  ${_t('gross_wt_label')}: ${item.grossWeight.toFixed(3)}g\x0a`;
                if (item.stoneWeight > 0) {
                    payload += `  ${_t('stone_weight')}: ${item.stoneWeight.toFixed(3)}g\x0a`;
                }
                payload += `  ${_t('net_wt_label')}  : ${item.netWeight.toFixed(3)}g | @Rs.${item.rate}\x0a`;

                // Detail 2: Wastage formula
                if (!config || config.showWastage) {
                    const vWeight = item.wastageType === 'percentage' ? (item.netWeight * item.wastage / 100) : item.wastage;
                    const wLabel = item.wastageType === 'percentage' ? `${item.wastage}%` : `${item.wastage}g`;
                    payload += `  ${_t('va_label')}: ${wLabel} (${vWeight.toFixed(3)}g) -> Rs.${Math.round(item.wastageValue).toLocaleString()}\x0a`;
                }

                // Detail 3: Making charge formula
                if (!config || config.showMakingCharge) {
                    const mcLabel = item.makingChargeType === 'percentage' ? `${item.makingCharge}%` : (item.makingChargeType === 'perGram' ? `${item.makingCharge}/g` : `Rs.${item.makingCharge} Fixed`);
                    payload += `  ${_t('mc_label')}: ${mcLabel} -> Rs.${Math.round(item.makingChargeValue).toLocaleString()}\x0a`;
                }

                // Total for this item
                payload += `${padL('Rs. ' + Math.round(itemTaxable).toLocaleString(), charWidth)}\x0a`;
            });
        }

        payload += DASH;
        payload += `${thermalCommands.boldOn}${padR(_t('total'), col.name)}${padR('', col.pcs)}${padR(totalGrossWeight.toFixed(3), col.wt)}${padR('', col.wst)}${padR('', col.mc)}${padL(Math.round(totalTaxableValue).toString(), col.amt)}${thermalCommands.boldOff}\x0a`;
        payload += DASH;
        payload += `${padR(_t('net_wt_label'), col.name)}${padR('', col.pcs)}${padR(totalNetWeight.toFixed(3), col.wt)}\x0a`;
        payload += DASH;

        const totalGST = totalTaxableValue * 0.03;
        const splitGST = totalGST / 2;
        const estimationAmt = totalTaxableValue + totalGST;

        if (!config || config.showGST) {
            payload += `${padL(_t('cgst_label') + ' Rs.' + Math.round(splitGST).toLocaleString(), charWidth)}\x0a`;
            payload += `${padL(_t('sgst_label') + ' Rs.' + Math.round(splitGST).toLocaleString(), charWidth)}\x0a`;
        }
        payload += `${thermalCommands.boldOn}${padL(_t('est_hash') + ': Rs.' + Math.round(estimationAmt).toLocaleString(), charWidth)}${thermalCommands.boldOff}\x0a`;
    }

    if (hasPurchase) {
        payload += LINE;
        payload += `${thermalCommands.center}${thermalCommands.boldOn}${_t('pur_quotation_title')}${thermalCommands.boldOff}\x0a`;

        const isTableLayout = paperWidth === '80mm' || paperWidth === '112mm';

        if (isTableLayout) {
            // Purchase Table Header: ITEMS | WT | LESS | RATE | AMOUNT
            // Re-using col config or defining specific for purchase
            const pCol = paperWidth === '80mm' ?
                { name: 12, wt: 8, less: 12, rate: 8, amt: 8 } :
                { name: 20, wt: 10, less: 16, rate: 10, amt: 8 };

            payload += `${thermalCommands.boldOn}${padR(_t('item'), pCol.name)}${padL(_t('weight_g'), pCol.wt)}${padL(_t('less_label'), pCol.less)}${padL(_t('rate'), pCol.rate)}${padL(_t('amount_header'), pCol.amt)}${thermalCommands.boldOff}\x0a`;
            payload += DASH;

            let totalPurWeight = 0;
            purchaseItems.forEach(item => {
                totalPurchaseAmount += item.amount;
                totalPurWeight += item.netWeight;

                const lessWeightValue = item.lessWeightType === 'percentage' ? (item.grossWeight * item.lessWeight / 100) : (item.lessWeightType === 'amount' ? 0 : item.lessWeight);
                const lessStr = item.lessWeightType === 'percentage' ? `${item.lessWeight}%` : (item.lessWeightType === 'amount' ? `Rs.${item.lessWeight}` : `${item.lessWeight}g`);

                payload += `${padR(item.category.toUpperCase(), pCol.name)}${padL(item.netWeight.toFixed(3), pCol.wt)}${padL(lessStr, pCol.less)}${padL(item.rate.toString(), pCol.rate)}${padL(Math.round(item.amount).toString(), pCol.amt)}\x0a`;
            });
            payload += DASH;
            payload += `${thermalCommands.boldOn}${padR(_t('purchase_total'), pCol.name)}${padL(totalPurWeight.toFixed(3), pCol.wt)}${padR('', pCol.less)}${padR('', pCol.rate)}${padL(Math.round(totalPurchaseAmount).toString(), pCol.amt)}${thermalCommands.boldOff}\x0a`;
        } else {
            payload += `${thermalCommands.left}${padR(_t('item'), charWidth - 12)}${padL(_t('amount_header'), 12)}\x0a`;
            payload += DASH;
            let totalPurWeight = 0;
            purchaseItems.forEach(item => {
                totalPurchaseAmount += item.amount;
                totalPurWeight += item.netWeight;
                payload += `${item.category.toUpperCase()}\x0a`;
                const lessWeightValue = item.lessWeightType === 'percentage' ? (item.grossWeight * item.lessWeight / 100) : (item.lessWeightType === 'amount' ? 0 : item.lessWeight);
                const lessStr = item.lessWeightType === 'percentage' ? `${item.lessWeight}% (${lessWeightValue.toFixed(3)}g)` : (item.lessWeightType === 'amount' ? `Rs. ${item.lessWeight}` : `${item.lessWeight}g`);
                payload += ` ${_t('gross_wt_label')}: ${item.grossWeight.toFixed(3)}g  \n ${_t('less_label')}:${lessStr} \n`;
                payload += ` ${_t('net_wt_label')}: ${item.netWeight.toFixed(3)}g | @Rs.${item.rate}\x0a`;
                payload += `${padL('Rs. ' + Math.round(item.amount).toLocaleString(), charWidth)}\x0a`;
            });
            payload += DASH;
            payload += `${thermalCommands.boldOn}${padR(_t('purchase_total'), charWidth - 18)}${padR(totalPurWeight.toFixed(3), 8)}${padL(Math.round(totalPurchaseAmount).toString(), 10)}${thermalCommands.boldOff}\x0a`;
        }
    }

    let totalChit = 0;
    if (hasChit) {
        payload += LINE;
        payload += `${thermalCommands.center}${thermalCommands.boldOn}${_t('chit_scheme_title')}${thermalCommands.boldOff}\x0a`;
        payload += `${thermalCommands.left}`;
        chitItems.forEach(item => {
            totalChit += item.amount;
            payload += `${padR(_t('chit') + ' (' + item.chitId + ')', charWidth - 15)}${padL('Rs. ' + Math.round(item.amount).toLocaleString(), 15)}\x0a`;
        });
    }

    let totalAdvance = 0;
    if (hasAdvance) {
        payload += LINE;
        payload += `${thermalCommands.center}${thermalCommands.boldOn}${_t('advance_adjustment_title')}${thermalCommands.boldOff}\x0a`;
        payload += `${thermalCommands.left}`;
        advanceItems.forEach(item => {
            totalAdvance += item.amount;
            payload += `${padR(_t('advance') + ' (' + item.advanceId + ')', charWidth - 15)}${padL('Rs. ' + Math.round(item.amount).toLocaleString(), 15)}\x0a`;
        });
    }

    const totalDeductions = totalPurchaseAmount + totalChit + totalAdvance;
    const estimationAmt = totalTaxableValue + (totalTaxableValue * 0.03); // Recalculate if needed
    const netPayable = (hasItems ? estimationAmt : 0) - totalDeductions;

    payload += LINE;
    if (hasItems && totalDeductions > 0) {
        payload += `${padL(_t('deductions_capital') + ': Rs.' + Math.round(totalDeductions).toLocaleString(), charWidth)}\x0a`;
    }
    payload += `${thermalCommands.center}${thermalCommands.boldOn}${_t('net_amt_label')}: Rs.${Math.round(Math.abs(netPayable)).toLocaleString()}${netPayable < 0 ? ' (CR)' : ''}${thermalCommands.doubleOff}${thermalCommands.boldOff}\x0a`;
    payload += LINE;

    if (!config || config.showFooter) payload += `${thermalCommands.center}${_t('thank_you_visit_again')}\x0a`;
    payload += `\x0a\x0a\x0a\x0a`;

    return payload;
};

export const printEstimationReceipt = async (
    items: EstimationItem[],
    purchaseItems: PurchaseItem[],
    chitItems: ChitItem[] = [],
    advanceItems: AdvanceItem[] = [],
    shopDetails: any,
    customerName?: string,
    employeeName?: string,
    config?: ReceiptConfig,
    estimationNumber?: number,
    t?: TFunction
): Promise<void> => {
    const _t = t || ((key: string) => key);
    const { type, printer } = await getPrinterConfig();

    if (type === 'thermal' && printer?.address) {
        const connected = await ensureThermalConnection(printer.address);
        if (connected) {
            const payload = await getEstimationReceiptThermalPayload(
                items, purchaseItems, chitItems, advanceItems, shopDetails, customerName, employeeName, config, estimationNumber, t
            );
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

    const hasItems = items.length > 0;
    const hasPurchase = purchaseItems.length > 0;
    const hasChit = chitItems.length > 0;
    const hasAdvance = advanceItems.length > 0;

    let receiptTitle = _t('receipt_title');
    if (hasItems) receiptTitle = _t('estimation_slip');
    else if (hasPurchase && !hasChit && !hasAdvance) receiptTitle = _t('purchase_voucher');
    else if (hasChit && !hasPurchase && !hasAdvance) receiptTitle = _t('chit_receipt_title');
    else if (hasAdvance && !hasPurchase && !hasChit) receiptTitle = _t('advance_receipt_title');

    // --- Estimation Items Section ---
    const itemsHTML = hasItems ? `
        <div class="dash-line">${DASH}</div>
        <div class="row-bold">
            <span>${_t('items_and_details')}</span>
            <span style="text-align: right;">${_t('amount_header')}</span>
        </div>
        <div class="dash-line">${DASH}</div>
        ${items.map(item => {
        const itemTotal = item.goldValue + item.wastageValue + item.makingChargeValue;
        const vWeight = item.wastageType === 'percentage' ? (item.netWeight * item.wastage / 100) : item.wastage;
        const wLabel = item.wastageType === 'percentage' ? `${item.wastage}%` : `${item.wastage}g`;
        const mcLabel = item.makingChargeType === 'percentage' ? `${item.makingCharge}%` : (item.makingChargeType === 'perGram' ? `${item.makingCharge}/g` : `Rs.${item.makingCharge} Fix`);

        return `
                <div style="margin-bottom: 6px;">
                    <div style="font-weight:bold;">${item.name.toUpperCase()} | ${item.pcs} Pcs </div>
                    ${item.tagNumber ? `<div style="font-size:10px;">Tag: ${item.tagNumber}</div>` : ''}
                    <div class="row">
                        <span>${_t('gross_wt_label')}: ${item.grossWeight.toFixed(3)}g</span>
                    </div>
                    ${item.stoneWeight > 0 ? `
                    <div class="row">
                        <span>Stone: ${item.stoneWeight.toFixed(3)}g</span>
                    </div>` : ''}
                    <div class="row">
                        <span>${_t('net_wt_label')}  : ${item.netWeight.toFixed(3)}g  | @Rs.${item.rate}</span>
                    </div>
                    ${(!config || config.showWastage) ? `
                    <div class="row" style="font-size:10px; color: #333;">
                        <span>VA: ${wLabel} (${vWeight.toFixed(3)}g)</span>
                        <span>Rs.${Math.round(item.wastageValue).toLocaleString()}</span>
                    </div>` : ''}
                    ${(!config || config.showMakingCharge) ? `
                    <div class="row" style="font-size:10px; color: #333;">
                        <span>MC: ${mcLabel}</span>
                        <span>Rs.${Math.round(item.makingChargeValue).toLocaleString()}</span>
                    </div>` : ''}
                    <div class="row-bold" style="border-top: 0.5px dashed #ccc; padding-top: 1px;">
                        <span></span>
                        <span>Rs. ${Math.round(itemTotal).toLocaleString()}</span>
                    </div>
                </div>
            `;
    }).join('')}
        <div class="dash-line">${DASH}</div>
        <div class="row-bold">
            <span>${_t('total')}</span>
            <span style="margin-left:auto;margin-right:20px;">G.Wt: ${totalGrossWeight.toFixed(3)}</span>
            <span>Rs.${Math.round(totalItemAmount).toLocaleString()}</span>
        </div>
        <div class="dash-line">${DASH}</div>
        <div class="row">
            <span>NETWT</span>
            <span>${totalWeight.toFixed(3)}g</span>
        </div>
        <div class="dash-line">${DASH}</div>
    ` : '';

    // --- GST Section ---
    const gstHTML = (hasItems && (!config || config.showGST)) ? `
        <div class="row"><span>${_t('cgst_label')}</span><span>Rs.${Math.round(totalGST / 2).toLocaleString()}</span></div>
        <div class="row"><span>${_t('sgst_label')}</span><span>Rs.${Math.round(totalGST / 2).toLocaleString()}</span></div>
        <div class="row-bold"><span>${_t('taxable_total')}</span><span>Rs.${Math.round(estimationAmount).toLocaleString()}</span></div>
    ` : hasItems ? `
        <div class="row-bold"><span>Total Amount</span><span>Rs.${Math.round(estimationAmount).toLocaleString()}</span></div>
    ` : '';

    // --- Purchase Quotation Section ---
    const purchaseHTML = purchaseItems.length > 0 ? `
        <div class="double-line">${DOUBLE_DASH}</div>
        <div class="section-title">${_t('pur_quotation_title')}</div>
        <table>
            <thead>
                <tr>
                    <th style="text-align: left;">ITEMS</th>
                    <th style="text-align: right;">Amount</th>
                </tr>
            </thead>
            <tbody>
                ${purchaseItems.map(p => {
        const lessStr = p.lessWeightType === 'percentage' ? `${p.lessWeight}%` : `${p.lessWeight}g`;
        return `
                                <tr>
                                    <td style="font-weight:bold;">${p.category.toUpperCase()}</td>
                                    <td class="text-right"></td>
                                </tr>
                                <tr style="font-size:10px; color: #333;">
                                    <td>${p.netWeight.toFixed(3)}g <br>
                                    Less:${p.lessWeightType === 'percentage' ? `${p.lessWeight}% (${(p.grossWeight - p.netWeight).toFixed(3)}g)` : p.lessWeightType === 'amount' ? `Rs.${p.lessWeight}` : `${p.lessWeight}g`} | @Rs.${p.rate}</td>
                                    <td class="text-right"></td>
                                </tr>
                                <tr>
                                    <td colspan="2" class="text-right" style="border-top: 0.5px dashed #ccc;">Rs. ${Math.round(p.amount).toLocaleString()}</td>
                                </tr>
                            `;
    }).join('')}
            </tbody>
        </table>
        <div class="dash-line">${DASH}</div>
        <div class="row-bold">
            <span>${_t('purchase_total')}</span>
            <span>Rs.${Math.round(totalPurchaseAmount).toLocaleString()}</span>
        </div>
    ` : '';

    // --- Chit/Advance Deduction rows ---
    const chitHTML = chitItems.length > 0 ? `
        <div class="double-line">${DOUBLE_DASH}</div>
        <div class="section-title">${_t('chit_scheme_title')}</div>
        ${chitItems.map(item => `
            <div class="row">
                <span>Chit (${item.chitId})</span>
                <span>Rs. ${Math.round(item.amount).toLocaleString()}</span>
            </div>
        `).join('')}
    ` : '';

    const advanceHTML = advanceItems.length > 0 ? `
        <div class="double-line">${DOUBLE_DASH}</div>
        <div class="section-title">${_t('advance_adjustment_title')}</div>
        ${advanceItems.map(item => `
            <div class="row">
                <span>Advance (${item.advanceId})</span>
                <span>Rs. ${Math.round(item.amount).toLocaleString()}</span>
            </div>
        `).join('')}
    ` : '';

    // --- Rate info lines ---
    const rateInfoHTML = hasItems ? `
        <div class="rate-line">Rate : 22K: ${parseFloat(goldRate22k).toLocaleString()} &nbsp; Date: ${dateStr}</div>
        <div class="rate-line">Rate : 18K: ${parseFloat(goldRate18k).toLocaleString()} &nbsp; Silv: ${parseFloat(silverRate).toLocaleString()}</div>
    ` : `<div class="rate-line">Date: ${dateStr}</div>`;

    const totalDeductions = totalPurchaseAmount + totalChitAmount + totalAdvanceAmount;
    const finalNetPayable = (hasItems ? estimationAmount : 0) - totalDeductions;

    const html = `
        <html>
            <head>${getCommonStyles(config?.paperWidth)}</head>
            <body>
                ${header}
                <div class="receipt-title">${receiptTitle}</div>
                ${estimationNumber ? `<div class="row-bold" style="justify-content: center; margin-bottom: 5px;">Est #: ${estimationNumber}</div>` : ''}
                ${rateInfoHTML}
                <div class="double-line">${DOUBLE_DASH}</div>
                ${(config?.showCustomer !== false && customerName) ? `
                    <div class="customer-block">
                        Customer: ${customerName.toUpperCase()}
                    </div>
                ` : ''}
                <div class="double-line">${DOUBLE_DASH}</div>

                ${itemsHTML}

                ${gstHTML}

                ${purchaseHTML}

                ${chitHTML}

                ${advanceHTML}

                <div class="double-line" style="margin-top: 10px;">${DOUBLE_DASH}</div>
                <div class="net-amt">${_t('net_amt_label')} &nbsp; Rs.${Math.round(Math.abs(finalNetPayable)).toLocaleString()}${finalNetPayable < 0 ? ' (CR)' : ''}</div>
                <div class="double-line">${DOUBLE_DASH}</div>

                ${(config?.showOperator !== false && employeeName) ? `<div class="footer">Operator: ${employeeName}</div>` : ''}
                ${(!config || config.showFooter) ? `<div class="footer">${shopDetails?.footerMessage || 'THANK YOU VISIT AGAIN'}</div>` : ''}
            </body>
        </html>
    `;

    await Print.printAsync({ html });
};

export const printChitItem = async (item: ChitItem, shopDetails: any, employeeName?: string, config?: ReceiptConfig, t?: TFunction) => {
    const _t = t || ((key: string) => key);
    const header = await getShopHeaderHTML(shopDetails, config);
    const html = `
        <html>
            <head>${getCommonStyles(config?.paperWidth)}</head>
            <body>
                ${header}
                <div class="receipt-title">${_t('chit_receipt_title')}</div>
                <div class="row"><span>${_t('date')}:</span><span>${new Date().toLocaleString()}</span></div>
                ${(config?.showOperator !== false && employeeName) ? `<div class="row"><span>${_t('operator')}:</span><span>${employeeName}</span></div>` : ''}
                <div class="divider"></div>
                <div class="row" style="font-size: 16px; margin-top: 10px;">
                    <span>${_t('chit_id')}:</span>
                    <span style="font-weight: bold;">${item.chitId}</span>
                </div>
                <div class="total-section" style="margin-top: 20px;">
                    <div class="total-row">
                        <span>${_t('net_paid_label')}:</span>
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
${(!config || config.showHeader) ? shopDetails?.name || _t('receipt_title') : ''}
${(config?.showDeviceName !== false && deviceName) ? `${_t('device_label')}: ${deviceName}\n` : ''}${(!config || config.showOperator) && employeeName ? `${_t('operator')}: ${employeeName}\n` : ''}${_t('chit_receipt_title')}
--------------------------------
${_t('date')}: ${new Date().toLocaleString()}
${_t('chit_id')}: ${item.chitId}
--------------------------------
${_t('net_paid_label')}: Rs. ${item.amount.toLocaleString()}
--------------------------------
${(!config || config.showFooter) ? shopDetails?.footerMessage || _t('thank_you_visit_again') : ''}

\n\n\n`;
            await BLEPrinter.printText(text);
            return;
        } catch (e) {
            console.error('Thermal print failed:', e);
        }
    }

    await Print.printAsync({ html });
};

export const printAdvanceItem = async (item: AdvanceItem, shopDetails: any, employeeName?: string, config?: ReceiptConfig, t?: TFunction) => {
    const _t = t || ((key: string) => key);
    const header = await getShopHeaderHTML(shopDetails, config);
    const html = `
        <html>
            <head>${getCommonStyles(config?.paperWidth)}</head>
            <body>
                ${header}
                <div class="receipt-title">${_t('advance_receipt_title')}</div>
                <div class="row"><span>${_t('date')}:</span><span>${new Date().toLocaleString()}</span></div>
                ${(config?.showOperator !== false && employeeName) ? `<div class="row"><span>${_t('operator')}:</span><span>${employeeName}</span></div>` : ''}
                <div class="divider"></div>
                <div class="row" style="font-size: 16px; margin-top: 10px;">
                    <span>${_t('advance_id')}:</span>
                    <span style="font-weight: bold;">${item.advanceId}</span>
                </div>
                <div class="total-section" style="margin-top: 20px;">
                    <div class="total-row">
                        <span>${_t('advance_paid_label')}:</span>
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
${(!config || config.showHeader) ? shopDetails?.name || _t('receipt_title') : ''}
${(config?.showDeviceName !== false && deviceName) ? `${_t('device_label')}: ${deviceName}\n` : ''}${(!config || config.showOperator) && employeeName ? `${_t('operator')}: ${employeeName}\n` : ''}${_t('advance_receipt_title')}
--------------------------------
${_t('date')}: ${new Date().toLocaleString()}
${_t('advance_id')}: ${item.advanceId}
--------------------------------
${_t('advance_paid_label')}: Rs. ${item.amount.toLocaleString()}
--------------------------------
${(!config || config.showFooter) ? shopDetails?.footerMessage || _t('thank_you_visit_again') : ''}

\n\n\n`;
            await BLEPrinter.printText(text);
            return;
        } catch (e) {
            console.error('Thermal print failed:', e);
        }
    }

    await Print.printAsync({ html });
};
