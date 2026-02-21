import * as Print from 'expo-print';
// import { BLEPrinter } from '@haroldtran/react-native-thermal-printer'; // Removed static import for Expo Go safety

import { EstimationItem, PurchaseItem, ChitItem, AdvanceItem } from '../types';
import { getSetting } from './dbService';
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
            font-family: 'Inter', sans-serif;
            padding: 20px;
            color: #333;
            max-width: 400px;
            margin: auto;
        }
        .header {
            text-align: center;
            margin-bottom: 20px;
        }
        .shop-name {
            font-size: 24px;
            font-weight: bold;
            margin-bottom: 5px;
            text-transform: uppercase;
        }
        .shop-info {
            font-size: 14px;
            color: #666;
            margin-bottom: 2px;
        }
        .divider {
            border-top: 1px dashed #ccc;
            margin: 15px 0;
        }
        .receipt-title {
            text-align: center;
            font-size: 18px;
            font-weight: bold;
            margin-bottom: 15px;
            text-decoration: underline;
        }
        .row {
            display: flex;
            justify-content: space-between;
            margin-bottom: 5px;
            font-size: 14px;
        }
        .item-name {
            font-weight: bold;
            margin-top: 10px;
            font-size: 16px;
        }
        .total-section {
            margin-top: 20px;
            padding-top: 10px;
            border-top: 2px solid #333;
        }
        .total-row {
            display: flex;
            justify-content: space-between;
            font-size: 16px;
            font-weight: bold;
            margin-top: 5px;
        }
        .footer {
            text-align: center;
            margin-top: 30px;
            font-size: 12px;
            color: #888;
            font-style: italic;
        }
        @media print {
            body { padding: 0; }
        }
    </style>
`;

const getShopHeaderHTML = async (shopDetailsInput?: any) => {
    const shopName = shopDetailsInput?.name || await getSetting('shop_name') || 'GOLD ESTIMATION';
    const shopAddress = shopDetailsInput?.address || await getSetting('shop_address') || '';
    const shopPhone = shopDetailsInput?.phone || await getSetting('shop_phone') || '';
    const shopGst = shopDetailsInput?.gstNumber || await getSetting('shop_gst') || '';
    const deviceName = shopDetailsInput?.deviceName || await getSetting('device_name') || '';

    return `
        <div class="header">
            <div class="shop-name">${shopName}</div>
            ${deviceName ? `<div class="shop-info" style="font-weight: bold;">Device: ${deviceName}</div>` : ''}
            ${shopAddress ? `<div class="shop-info">${shopAddress}</div>` : ''}
            ${shopPhone ? `<div class="shop-info">Tel: ${shopPhone}</div>` : ''}
            ${shopGst ? `<div class="shop-info">GSTIN: ${shopGst}</div>` : ''}
        </div>
        <div class="divider"></div>
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

export const sendTestPrint = async (): Promise<void> => {
    const { type, printer } = await getPrinterConfig();

    if (type === 'thermal' && printer?.address) {
        const connected = await ensureThermalConnection(printer.address);
        if (connected) {
            const { BLEPrinter } = require('react-native-thermal-receipt-printer');
            const payload = `${thermalCommands.reset}${thermalCommands.center}${thermalCommands.doubleOn}TEST PRINT${thermalCommands.doubleOff}\x0aSTATUS: SUCCESSFUL\x0a${thermalCommands.divider}${new Date().toLocaleString()}\x0a\x0a\x0a\x0a`;
            BLEPrinter.printText(payload);
            return;
        } else {
            Alert.alert('Printer Error', 'Could not connect to thermal printer. Please ensure it is ON and nearby.');
        }
    }

    const header = await getShopHeaderHTML();
    const html = `
        <html>
            <head>${getCommonStyles()}</head>
            <body>
                ${header}
                <div class="receipt-title">TEST PRINT</div>
                <div class="row">
                    <span>Status:</span>
                    <span style="color: green; font-weight: bold;">SUCCESSFUL</span>
                </div>
                <div class="row">
                    <span>Date:</span>
                    <span>${new Date().toLocaleString()}</span>
                </div>
                <div class="divider"></div>
                <div class="footer">Thank you for using Gold Estimation App</div>
            </body>
        </html>
    `;

    await Print.printAsync({ html });
};

export const printEstimationItem = async (item: EstimationItem, shopDetails?: any): Promise<void> => {
    const { type, printer } = await getPrinterConfig();

    if (type === 'thermal' && printer?.address) {
        const connected = await ensureThermalConnection(printer.address);
        if (connected) {
            const shopName = shopDetails?.name || await getSetting('shop_name') || 'GOLD ESTIMATION';
            const deviceName = await getSetting('device_name') || '';
            let payload = `${thermalCommands.reset}${thermalCommands.center}${thermalCommands.boldOn}${shopName}${thermalCommands.boldOff}\x0a`;
            if (deviceName) payload += `Device: ${deviceName}\x0a`;
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
            payload += `Gold Val: Rs. ${item.goldValue.toLocaleString()}\x0a`;
            payload += `VA (${item.wastageType === 'percentage' ? `${item.wastage}%` : `${item.wastage}g`}): ${vWeight.toFixed(3)}g\x0a`;
            const mcLabel = item.makingChargeType === 'percentage' ? `${item.makingCharge}%` : (item.makingChargeType === 'perGram' ? 'Weight' : 'Fixed');
            payload += `MC (${mcLabel}): Rs. ${item.makingChargeValue.toFixed(2)}\x0a`;
            payload += `GST (3%):  Rs. ${item.gstValue.toFixed(2)}\x0a`;
            payload += `${thermalCommands.divider}`;
            payload += `${thermalCommands.boldOn}${thermalCommands.doubleOn}TOTAL: Rs. ${item.totalValue.toLocaleString()}${thermalCommands.doubleOff}${thermalCommands.boldOff}\x0a`;
            payload += `\x0a\x0a\x0a\x0a`;

            const { BLEPrinter } = require('react-native-thermal-receipt-printer');
            BLEPrinter.printText(payload);
            return;
        }
    }

    const header = await getShopHeaderHTML(shopDetails);
    const html = `
        <html>
            <head>${getCommonStyles()}</head>
            <body>
                ${header}
                <div class="receipt-title">ESTIMATION DETAILS</div>
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
                
                <div class="row"><span>Gold Value:</span><span>Rs. ${item.goldValue.toLocaleString()}</span></div>
                <div class="row">
                    <span>VA (${item.wastageType === 'percentage' ? `${item.wastage}%` : `${item.wastage}g`}):</span>
                    <span>${(item.wastageType === 'percentage' ? (item.netWeight * item.wastage / 100) : item.wastage).toFixed(3)} g</span>
                </div>
                <div class="row">
                    <span>MC (${item.makingChargeType === 'percentage' ? `${item.makingCharge}%` : (item.makingChargeType === 'perGram' ? 'Weight' : 'Fixed')}):</span>
                    <span>Rs. ${item.makingChargeValue.toFixed(2)}</span>
                </div>
                <div class="row"><span>GST (3%):</span><span>Rs. ${item.gstValue.toFixed(2)}</span></div>
                
                <div class="total-section">
                    <div class="total-row">
                        <span>TOTAL:</span>
                        <span>Rs. ${item.totalValue.toLocaleString()}</span>
                    </div>
                </div>
                
                <div class="footer">This is a computer generated estimation.</div>
            </body>
        </html>
    `;

    await Print.printAsync({ html });
};

export const printPurchaseItem = async (item: PurchaseItem, shopDetails?: any): Promise<void> => {
    const { type, printer } = await getPrinterConfig();

    if (type === 'thermal' && printer?.address) {
        const connected = await ensureThermalConnection(printer.address);
        if (connected) {
            const shopName = shopDetails?.name || await getSetting('shop_name') || 'GOLD ESTIMATION';
            const deviceName = await getSetting('device_name') || '';
            let payload = `${thermalCommands.reset}${thermalCommands.center}${thermalCommands.boldOn}${shopName}${thermalCommands.boldOff}\x0a`;
            if (deviceName) payload += `Device: ${deviceName}\x0a`;
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

    const header = await getShopHeaderHTML(shopDetails);
    const lessLabel = item.lessWeightType === 'percentage' ? `${item.lessWeight}%` : item.lessWeightType === 'amount' ? `Rs.${item.lessWeight}` : `${item.lessWeight}g`;

    const html = `
        <html>
            <head>${getCommonStyles()}</head>
            <body>
                ${header}
                <div class="receipt-title">PURCHASE / OLD GOLD</div>
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
    employeeName?: string
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
            let payload = `${thermalCommands.reset}${thermalCommands.center}${thermalCommands.boldOn}${shopName}${thermalCommands.boldOff}\x0a`;
            if (deviceName) payload += `Device: ${deviceName}\x0a`;
            payload += `Date: ${new Date().toLocaleDateString()}\x0a`;
            if (customerName) payload += `Customer: ${customerName}\x0a`;
            if (employeeName) payload += `Employee: ${employeeName}\x0a`;
            payload += `${thermalCommands.divider}${thermalCommands.boldOn}ESTIMATION RECEIPT${thermalCommands.boldOff}\x0a`;

            let totalTaxableValue = 0;
            let totalPurchaseAmount = 0;

            items.forEach((item, index) => {
                const itemTaxable = item.goldValue + item.wastageValue + item.makingChargeValue;
                totalTaxableValue += itemTaxable;
                const vWeight = item.wastageType === 'percentage' ? (item.netWeight * item.wastage / 100) : item.wastage;
                payload += `${thermalCommands.left}${index + 1}. ${item.name} (${item.netWeight.toFixed(3)}g)\x0a`;
                const mcSubLabel = item.makingChargeType === 'percentage' ? `${item.makingCharge}%` : (item.makingChargeType === 'perGram' ? 'Weight' : 'Fixed');
                payload += `   VA: ${vWeight.toFixed(3)}g | MC: Rs.${item.makingChargeValue.toFixed(2)}\x0a`;
                payload += `   Item Total: Rs. ${itemTaxable.toLocaleString()}\x0a`;
            });

            if (purchaseItems.length > 0) {
                payload += `${thermalCommands.divider}OLD GOLD / PURCHASE\x0a`;
                purchaseItems.forEach((item, index) => {
                    totalPurchaseAmount += item.amount;
                    payload += `${index + 1}. ${item.category} -Rs. ${item.amount.toLocaleString()}\x0a`;
                });
            }

            let totalChit = 0;
            if (chitItems.length > 0) {
                payload += `${thermalCommands.divider}CHITS\x0a`;
                chitItems.forEach(item => {
                    totalChit += item.amount;
                    payload += `Chit ${item.chitId}: -Rs. ${item.amount.toLocaleString()}\x0a`;
                });
            }

            let totalAdvance = 0;
            if (advanceItems.length > 0) {
                payload += `${thermalCommands.divider}ADVANCES\x0a`;
                advanceItems.forEach(item => {
                    totalAdvance += item.amount;
                    payload += `Adv ${item.advanceId}: -Rs. ${item.amount.toLocaleString()}\x0a`;
                });
            }

            const totalGST = totalTaxableValue * 0.03;
            const grossTotal = totalTaxableValue + totalGST;
            const netPayable = grossTotal - totalPurchaseAmount - totalChit - totalAdvance;

            payload += `${thermalCommands.divider}`;
            payload += `Taxable Val: Rs. ${totalTaxableValue.toLocaleString()}\x0a`;
            payload += `GST (3%):    Rs. ${totalGST.toFixed(2)}\x0a`;
            payload += `${thermalCommands.boldOn}Gross Total: Rs. ${grossTotal.toLocaleString()}${thermalCommands.boldOff}\x0a`;
            if (totalPurchaseAmount > 0) payload += `Purchases:   -Rs. ${totalPurchaseAmount.toLocaleString()}\x0a`;
            if (totalChit > 0) payload += `Chits:       -Rs. ${totalChit.toLocaleString()}\x0a`;
            if (totalAdvance > 0) payload += `Advances:    -Rs. ${totalAdvance.toLocaleString()}\x0a`;
            payload += `${thermalCommands.divider}`;
            payload += `${thermalCommands.boldOn}${thermalCommands.doubleOn}NET: Rs. ${netPayable.toLocaleString()}${thermalCommands.doubleOff}${thermalCommands.boldOff}\x0a`;
            payload += `${thermalCommands.divider}`;
            payload += `${thermalCommands.center}THANK YOU VISIT AGAIN\x0a`;
            payload += `\x0a\x0a\x0a\x0a`;

            const { BLEPrinter } = require('react-native-thermal-receipt-printer');
            BLEPrinter.printText(payload);
            return;
        }
    }

    const headerHTMLContent = await getShopHeaderHTML(shopDetails);

    const totalGoldValue = items.reduce((sum, item) => sum + item.goldValue, 0);
    const totalVAMC = items.reduce((sum, item) => sum + item.makingChargeValue + item.wastageValue, 0);
    const totalTaxableValue = totalGoldValue + totalVAMC;
    const totalGST = items.reduce((sum, item) => sum + item.gstValue, 0);
    const grossTotal = items.reduce((sum, item) => sum + item.totalValue, 0);

    const totalPurchaseAmount = purchaseItems.reduce((sum, item) => sum + item.amount, 0);
    const totalChitAmount = chitItems.reduce((sum, item) => sum + item.amount, 0);
    const totalAdvanceAmount = advanceItems.reduce((sum, item) => sum + item.amount, 0);

    const netPayable = grossTotal - totalPurchaseAmount - totalChitAmount - totalAdvanceAmount;

    const itemsHTML = items.map(item => `
        <div class="row">
            <div style="flex: 1;">
                <div style="font-weight: bold;">${item.name}</div>
                <div style="font-size: 10px; color: #666;">
                    ${item.netWeight.toFixed(3)}g @ ₹${item.rate}
                </div>
            </div>
            <div style="text-align: right;">₹${item.totalValue.toLocaleString()}</div>
        </div>
    `).join('');

    const purchaseHTML = purchaseItems.map(item => `
        <div class="row">
            <div style="flex: 1;">
                <div>OLD GOLD: ${item.category}</div>
                <div style="font-size: 10px; color: #666;">
                    ${item.netWeight.toFixed(3)}g @ ₹${item.rate}
                </div>
            </div>
            <div style="text-align: right; color: #d32f2f;">-₹${item.amount.toLocaleString()}</div>
        </div>
    `).join('');

    const chitHTML = chitItems.map(item => `
        <div class="row">
            <div style="flex: 1;">CHIT: ${item.chitId}</div>
            <div style="text-align: right; color: #2e7d32;">-₹${item.amount.toLocaleString()}</div>
        </div>
    `).join('');

    const advanceHTML = advanceItems.map(item => `
        <div class="row" style="color: #2e7d32; font-style: italic;">
            <div style="flex: 1;">ADVANCE: ${item.advanceId}</div>
            <div style="text-align: right;">-₹${item.amount.toLocaleString()}</div>
        </div>
    `).join('');

    const header = await getShopHeaderHTML(shopDetails);

    const html = `
        <html>
            <head>${getCommonStyles()}</head>
            <body>
                ${header}
                <div class="receipt-title">ESTIMATION RECEIPT</div>
                <div class="row"><span>Date:</span><span>${new Date().toLocaleString()}</span></div>
                ${customerName ? `<div class="row"><span>Customer:</span><span>${customerName}</span></div>` : ''}
                ${employeeName ? `<div class="row"><span>By:</span><span>${employeeName}</span></div>` : ''}
                
                <div class="divider"></div>
                
                <div style="font-weight: bold; text-align: center; margin-bottom: 10px;">ITEMS:</div>
                ${itemsHTML}
                
                ${purchaseItems.length > 0 ? `
                    <div class="divider"></div>
                    <div style="font-weight: bold; text-align: center; margin-bottom: 5px;">OLD GOLD / PURCHASE:</div>
                    ${purchaseHTML}
                ` : ''}

                ${chitItems.length > 0 ? `
                    <div class="divider"></div>
                    <div style="font-weight: bold; text-align: center; margin-bottom: 5px;">CHIT ADJUSTMENT:</div>
                    ${chitHTML}
                ` : ''}

                ${advanceItems.length > 0 ? `
                    <div class="divider"></div>
                    <div style="font-weight: bold; text-align: center; margin-bottom: 5px;">ADVANCE ADJUSTMENT:</div>
                    ${advanceHTML}
                ` : ''}
                
                <div class="total-section">
                    <div class="row"><span>Total Gold Value:</span><span>Rs. ${totalGoldValue.toLocaleString()}</span></div>
                    <div class="row"><span>Total VA/MC:</span><span>Rs. ${totalVAMC.toFixed(2)}</span></div>
                    <div class="row"><span>SubTotal:</span><span>Rs. ${totalTaxableValue.toLocaleString()}</span></div>
                    <div class="row"><span>GST (3%):</span><span>Rs. ${totalGST.toFixed(2)}</span></div>
                    <div class="divider"></div>
                    <div class="row" style="font-size: 16px;"><span>GROSS TOTAL:</span><span>Rs. ${grossTotal.toLocaleString()}</span></div>
                    ${totalPurchaseAmount > 0 ? `<div class="row"><span>Old Gold Deduction:</span><span>-Rs. ${totalPurchaseAmount.toLocaleString()}</span></div>` : ''}
                    ${totalChitAmount > 0 ? `<div class="row"><span>Chit Deduction:</span><span>-Rs. ${totalChitAmount.toLocaleString()}</span></div>` : ''}
                    ${totalAdvanceAmount > 0 ? `<div class="row"><span>Advance Deduction:</span><span>-Rs. ${totalAdvanceAmount.toLocaleString()}</span></div>` : ''}
                    <div class="divider"></div>
                    <div class="total-row">
                        <span>NET:</span>
                        <span>Rs. ${netPayable.toLocaleString()}</span>
                    </div>
                </div>
                
                ${shopDetails?.footerMessage ? `<div class="footer">${shopDetails.footerMessage}</div>` : ''}
            </body>
        </html>
    `;

    await Print.printAsync({ html });
};

export const printChitItem = async (item: ChitItem, shopDetails: any) => {
    const header = await getShopHeaderHTML(shopDetails);
    const html = `
        <html>
            <head>${getCommonStyles()}</head>
            <body>
                ${header}
                <div class="receipt-title">CHIT RECEIPT</div>
                <div class="row"><span>Date:</span><span>${new Date().toLocaleString()}</span></div>
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
                ${shopDetails?.footerMessage ? `<div class="footer">${shopDetails.footerMessage}</div>` : ''}
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
${shopDetails?.name || 'RECEIPT'}
${deviceName ? `Device: ${deviceName}\n` : ''}CHIT RECEIPT
--------------------------------
Date: ${new Date().toLocaleString()}
CHIT ID: ${item.chitId}
--------------------------------
NET PAID: Rs. ${item.amount.toLocaleString()}
--------------------------------
${shopDetails?.footerMessage || ''}

\n\n\n`;
            await BLEPrinter.printText(text);
            return;
        } catch (e) {
            console.error('Thermal print failed:', e);
        }
    }

    await Print.printAsync({ html });
};

export const printAdvanceItem = async (item: AdvanceItem, shopDetails: any) => {
    const header = await getShopHeaderHTML(shopDetails);
    const html = `
        <html>
            <head>${getCommonStyles()}</head>
            <body>
                ${header}
                <div class="receipt-title">ADVANCE RECEIPT</div>
                <div class="row"><span>Date:</span><span>${new Date().toLocaleString()}</span></div>
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
                ${shopDetails?.footerMessage ? `<div class="footer">${shopDetails.footerMessage}</div>` : ''}
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
${shopDetails?.name || 'RECEIPT'}
${deviceName ? `Device: ${deviceName}\n` : ''}ADVANCE RECEIPT
--------------------------------
Date: ${new Date().toLocaleString()}
ADVANCE ID: ${item.advanceId}
--------------------------------
ADVANCE PAID: Rs. ${item.amount.toLocaleString()}
--------------------------------
${shopDetails?.footerMessage || ''}

\n\n\n`;
            await BLEPrinter.printText(text);
            return;
        } catch (e) {
            console.error('Thermal print failed:', e);
        }
    }

    await Print.printAsync({ html });
};
