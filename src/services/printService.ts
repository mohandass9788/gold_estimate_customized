import * as Print from 'expo-print';
// import { BLEPrinter } from '@haroldtran/react-native-thermal-printer'; // Removed static import for Expo Go safety

import { EstimationItem, PurchaseItem, ChitItem, AdvanceItem } from '../types';

// Extended types for items that may have customer details from DB
type ExtendedItem = (EstimationItem | PurchaseItem | ChitItem | AdvanceItem) & { customerName?: string };

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

const padR = (s: string, w: number) => s.length >= w ? s : s + ' '.repeat(w - s.length);
const padL = (s: string, w: number) => s.length >= w ? s : ' '.repeat(w - s.length) + s;

const formatCurrency = (amount: number): string => {
    return 'Rs. ' + amount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

import {
    getCommonStyles,
    getShopHeaderHTML,
    getEstimationItemsHTML,
    getPurchaseItemsHTML,
    getChitItemsHTML,
    getAdvanceItemsHTML,
    getMarketRatesHTML,
    getCustomerInfoHTML,
    getEmployeeFooterHTML,
    getReceiptFooterHTML
} from './receiptTemplates';

// Wrapper for back-compat or simpler calls
const getShopHeader = async (shopDetailsInput?: any, config?: ReceiptConfig) => {
    const shopDetails = {
        name: shopDetailsInput?.name || await getSetting('shop_name') || 'GOLD ESTIMATION',
        address: shopDetailsInput?.address || await getSetting('shop_address') || '',
        phone: shopDetailsInput?.phone || await getSetting('shop_phone') || '',
        gstNumber: shopDetailsInput?.gstNumber || await getSetting('shop_gst') || '',
    };
    return getShopHeaderHTML(shopDetails, config);
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
            payload += `${thermalCommands.divider}${new Date().toLocaleString()}\x0a\x0a`;
            if ((!config || config.showOperator) && employeeName) payload += `Employee: ${employeeName}\x0a`;
            payload += `\x0a\x0a`;
            BLEPrinter.printText(payload);
            return;
        } else {
            throw new Error('Could not connect to thermal printer. Please ensure it is ON and nearby.');
        }
    }

    const header = await getShopHeader(null, config);
    const html = `
        <html>
            <head>${getCommonStyles(config?.paperWidth)}</head>
            <body>
                ${header}
                <div class="receipt-title">TEST PRINT</div>
                <div class="row">
                    <span>Date:</span>
                    <span>${new Date().toLocaleString()}</span>
                </div>
                <div class="divider"></div>
                ${(config?.showOperator !== false && employeeName) ? `<div class="employee-row">${employeeName}</div>` : ''}
                ${(!config || config.showFooter) ? '<div class="footer">Thank you for using Gold Estimation App</div>' : ''}
            </body>
        </html>
    `;
    await Print.printAsync({ html });
};

export const printEstimationItem = async (item: EstimationItem, shopDetails?: any, employeeName?: string, config?: ReceiptConfig): Promise<void> => {
    const extItem = item as ExtendedItem;
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

            payload += `${thermalCommands.divider(32)}${thermalCommands.boldOn}ESTIMATION DETAILS${thermalCommands.boldOff}\x0a`;
            payload += `${thermalCommands.left}${item.name.toUpperCase()}\x0a`;
            if (item.tagNumber) payload += `Tag: ${item.tagNumber}\x0a`;
            payload += `${thermalCommands.divider(32)}`;
            payload += `Metal: ${item.metal} ${item.purity}${item.metal === 'SILVER' ? '' : 'k'}\x0a`;
            payload += `Gross Wt: ${item.grossWeight.toFixed(3)}g\x0a`;
            payload += `Net Wt:   ${item.netWeight.toFixed(3)}g\x0a`;
            payload += `Rate/g:   Rs. ${item.rate}\x0a`;
            payload += `${thermalCommands.divider(32)}`;
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

            payload += `${thermalCommands.divider(32)}`;
            payload += `${thermalCommands.boldOn}${thermalCommands.doubleOn}TOTAL: Rs. ${Math.round(item.totalValue).toLocaleString()}${thermalCommands.doubleOff}${thermalCommands.boldOff}\x0a`;
            if ((!config || config.showOperator) && employeeName) payload += `Employee: ${employeeName}\x0a`;
            payload += `\x0a\x0a\x0a\x0a`;

            const { BLEPrinter } = require('react-native-thermal-receipt-printer');
            BLEPrinter.printText(payload);
            return;
        } else {
            throw new Error('Could not connect to thermal printer. Please ensure it is ON and nearby.');
        }
    }

    // Fetch gold/silver rates for display
    const goldRate24k = await getSetting('rate_24k') || '0';
    const goldRate22k = await getSetting('rate_22k') || '0';
    const silverRate = await getSetting('rate_silver') || '0';
    const dateStr = new Date().toLocaleDateString('en-IN', { day: '2-digit', month: '2-digit', year: 'numeric' });

    const header = await getShopHeaderHTML(shopDetails, config);
    const marketRates = getMarketRatesHTML({ rate24k: goldRate24k, rate22k: goldRate22k, silver: silverRate, date: dateStr }, (key: string) => key);
    const employeeFooter = (config?.showOperator !== false && employeeName) ? getEmployeeFooterHTML(employeeName, (key: string) => key) : '';

    const html = `
        <html>
            <head>${getCommonStyles(config?.paperWidth)}</head>
            <body>
                ${header}
                <div class="receipt-title">ESTIMATION DETAILS</div>
                ${marketRates}
                ${(config?.showCustomer !== false && extItem.customerName) ? `<div class="customer-block">Customer: ${extItem.customerName.toUpperCase()}</div>` : ''}
                
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
                
                ${employeeFooter}
                ${(!config || config.showFooter) ? `<div class="footer">${shopDetails?.footerMessage || 'This is a computer generated estimation.'}</div>` : ''}
            </body>
        </html>
    `;

    await Print.printAsync({ html });
};

export const printPurchaseItem = async (
    item: PurchaseItem,
    shopDetails?: any,
    employeeName?: string,
    config?: ReceiptConfig,
    t?: TFunction,
    customerName?: string,
    customerMobile?: string,
    customerAddress?: string
): Promise<void> => {
    const _t = t || ((key: string) => key);
    const extItem = item as ExtendedItem;
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
                if ((!config || config.showOperator) && employeeName) payload += `${_t('operator')}: ${employeeName}\x0a`;
            }

            if (config?.showCustomer !== false && (customerName || customerMobile || customerAddress)) {
                if (customerName && config?.showCustomerName !== false) payload += `${_t('customer_label')} ${customerName.toUpperCase()}\x0a`;
                if (customerMobile && config?.showCustomerMobile !== false) payload += `${_t('phone_label')} ${customerMobile}\x0a`;
                if (customerAddress && config?.showCustomerAddress !== false) payload += `${_t('address_label')} ${customerAddress.toUpperCase()}\x0a`;
            }

            const cw = getCharWidth(config?.paperWidth);

            payload += `${thermalCommands.divider(cw)}${thermalCommands.boldOn}${_t('purchase_receipt')}${thermalCommands.boldOff}\x0a`;
            payload += `${thermalCommands.left}${item.category.toUpperCase()}\x0a`;
            if (item.subCategory) payload += `${item.subCategory}\x0a`;

            payload += `${thermalCommands.divider(cw)}`;

            if (cw === 32) {
                payload += `${_t('purity')}: ${item.purity}\x0a`;
                payload += `${_t('gross_wt_label')}: ${item.grossWeight.toFixed(3)} g\x0a`;
                const lessLabel = item.lessWeightType === 'percentage' ? `${item.lessWeight}%` : item.lessWeightType === 'amount' ? `Rs.${item.lessWeight}` : `${item.lessWeight}g`;
                payload += `${_t('less_label')} (${lessLabel}): -${item.lessWeightType === 'amount' ? item.lessWeight : (item.grossWeight - item.netWeight).toFixed(3)}\x0a`;
                payload += `${_t('net_wt_label')}:   ${item.netWeight.toFixed(3)} g\x0a`;
                payload += `${_t('rate_per_g')}: Rs.${item.rate}\x0a`;
            } else {
                const lessLabel = item.lessWeightType === 'percentage' ? `${item.lessWeight}%` : item.lessWeightType === 'amount' ? `Rs.${item.lessWeight}` : `${item.lessWeight}g`;
                const c1 = Math.floor(cw / 2);
                payload += `${padR(`${_t('purity')}: ${item.purity}`, c1)}${padR(`${_t('rate_per_g')}: Rs.${item.rate}`, cw - c1)}\x0a`;
                payload += `${padR(`G.Wt: ${item.grossWeight.toFixed(3)}g`, c1)}${padR(`N.Wt: ${item.netWeight.toFixed(3)}g`, cw - c1)}\x0a`;
                payload += `${_t('less_label')} (${lessLabel}): -${item.lessWeightType === 'amount' ? item.lessWeight : (item.grossWeight - item.netWeight).toFixed(3)}\x0a`;
            }

            payload += `${thermalCommands.divider(cw)}`;
            payload += `${thermalCommands.boldOn}${thermalCommands.doubleOn}${_t('value_label')}: Rs.${item.amount.toLocaleString()}${thermalCommands.doubleOff}${thermalCommands.boldOff}\x0a`;
            if ((!config || config.showOperator) && employeeName) payload += `${_t('employee_name')}: ${employeeName}\x0a`;

            const { BLEPrinter } = require('react-native-thermal-receipt-printer');
            BLEPrinter.printText(payload);
            await printQRCodeImage(item.id, type);
            let footer = '';
            if (!config || config.showFooter) footer += `${thermalCommands.center}${_t('thank_you_visit_again')}\x0a`;
            footer += `\x0a\x0a\x0a\x0a`;
            BLEPrinter.printText(footer);
            return;
        } else {
            throw new Error('Could not connect to thermal printer. Please ensure it is ON and nearby.');
        }
    }

    // Fetch gold/silver rates for display
    const goldRate24k = await getSetting('rate_24k') || '0';
    const goldRate22k = await getSetting('rate_22k') || '0';
    const silverRate = await getSetting('rate_silver') || '0';
    const dateStr = new Date().toLocaleDateString('en-IN', { day: '2-digit', month: '2-digit', year: 'numeric' });

    const header = await getShopHeaderHTML(shopDetails, config);
    const marketRates = getMarketRatesHTML({ rate24k: goldRate24k, rate22k: goldRate22k, silver: silverRate, date: dateStr }, _t);
    const employeeFooter = (config?.showOperator !== false && employeeName) ? getEmployeeFooterHTML(employeeName, _t) : '';
    const lessLabel = item.lessWeightType === 'percentage' ? `${item.lessWeight}%` : item.lessWeightType === 'amount' ? `Rs.${item.lessWeight}` : `${item.lessWeight} g`;

    const html = `
        <html>
            <head>${getCommonStyles(config?.paperWidth)}</head>
            <body>
                ${header}
                <div class="receipt-title">${_t('purchase_old_gold')}</div>
                ${marketRates}
                ${(config?.showCustomer !== false && (customerName || customerMobile || customerAddress)) ? getCustomerInfoHTML({
        name: customerName,
        mobile: customerMobile,
        address: customerAddress
    }, _t, config) : ''}
                
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
                
                ${employeeFooter}
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

    let payload = `${thermalCommands.reset}${thermalCommands.center} `;

    const hasItems = items.length > 0;
    const hasPurchase = purchaseItems.length > 0;
    const hasChit = chitItems.length > 0;
    const hasAdvance = advanceItems.length > 0;

    if (!config || config.showHeader) {
        payload += `${thermalCommands.center}${thermalCommands.boldOn}${thermalCommands.doubleOn}${shopName}${thermalCommands.doubleOff}${thermalCommands.boldOff} \x0a`;
        if (config?.showDeviceName !== false && deviceName) payload += `Device: ${deviceName} \x0a`;
        payload += `${thermalCommands.left} `;
    }

    // Header logic for Standalone vs Full Estimation
    if (hasItems) {
        payload += `${thermalCommands.center}${thermalCommands.boldOn}${_t('estimation_slip')}${thermalCommands.boldOff} \x0a`;
    } else if (hasPurchase && !hasChit && !hasAdvance) {
        payload += `${thermalCommands.center}${thermalCommands.boldOn}${_t('purchase_voucher')}${thermalCommands.boldOff} \x0a`;
    } else if (hasChit && !hasPurchase && !hasAdvance) {
        payload += `${thermalCommands.center}${thermalCommands.boldOn}${_t('chit_receipt_title')}${thermalCommands.boldOff} \x0a`;
    } else if (hasAdvance && !hasPurchase && !hasChit) {
        payload += `${thermalCommands.center}${thermalCommands.boldOn}${_t('advance_receipt_title')}${thermalCommands.boldOff} \x0a`;
    } else {
        payload += `${thermalCommands.center}${thermalCommands.boldOn}${_t('receipt_title')}${thermalCommands.boldOff} \x0a`;
    }

    if (estimationNumber) {
        payload += `${thermalCommands.center}Est #: ${estimationNumber} \x0a`;
    }

    payload += `${thermalCommands.right}Date: ${dateStr}${thermalCommands.left}\x0a`;

    // Rates section (hide if only deductions are present)
    if (hasItems) {
        payload += `${thermalCommands.boldOn}G: Rs.${parseFloat(rate22k).toLocaleString()} | S: Rs.${parseFloat(silverRate).toLocaleString()}/g${thermalCommands.boldOff}\x0a`;
        payload += LINE;
    } else {
        payload += LINE;
    }
    if (config?.showCustomer !== false && (customerName || (shopDetails as any)?.customerMobile || (shopDetails as any)?.customerAddress)) {
        if (customerName && config?.showCustomerName !== false) payload += `${_t('customer')}: ${customerName.toUpperCase()} \x0a`;
        if ((shopDetails as any)?.customerMobile && config?.showCustomerMobile !== false) payload += `${_t('phone_number')}: ${(shopDetails as any).customerMobile} \x0a`;
        if ((shopDetails as any)?.customerAddress && config?.showCustomerAddress !== false) payload += `${_t('address')}: ${(shopDetails as any).customerAddress.toUpperCase()} \x0a`;
        payload += LINE;
    }

    let totalTaxableValue = 0;
    let totalGrossWeight = 0;
    let totalNetWeight = 0;
    let totalPurchaseAmount = 0;

    if (hasItems) {
        if (paperWidth === '58mm') {
            // 58mm 2-Col (Max 32 chars)
            // Allocate 16 chars to Item Name, 16 chars to Amount 
            const cwItem = 16;
            const cwAmt = 16;
            payload += `${thermalCommands.boldOn}${padR(_t('item'), cwItem)}${padL(_t('amount_header'), cwAmt)}${thermalCommands.boldOff} \x0a`;
            payload += DASH;

            items.forEach(item => {
                const itemTaxable = item.goldValue + item.wastageValue + item.makingChargeValue;
                totalTaxableValue += itemTaxable;
                totalGrossWeight += item.grossWeight;
                totalNetWeight += item.netWeight;

                payload += `${thermalCommands.boldOn}${padR(item.name.toUpperCase().substring(0, cwItem - 1), cwItem)}${padL(formatCurrency(item.totalValue).substring(0, cwAmt), cwAmt)}${thermalCommands.boldOff} \x0a`;
                payload += `  ${item.pcs} Pcs \x0a`;
                if (item.tagNumber) payload += `  TAG: ${item.tagNumber} \x0a`;

                payload += `  N.Wt: ${item.netWeight.toFixed(3)}g | @Rs.${item.rate} \x0a`;

                if (!config || config.showWastage) {
                    const vWeight = item.wastageType === 'percentage' ? (item.netWeight * item.wastage / 100) : item.wastage;
                    const wLabel = item.wastageType === 'percentage' ? `${item.wastage}%` : `${item.wastage}g`;
                    payload += `  VA: ${vWeight.toFixed(3)}g (${wLabel})\x0a`;
                }

                if (!config || config.showMakingCharge) {
                    const mcLabel = item.makingChargeType === 'percentage' ? `${item.makingCharge}%` : (item.makingChargeType === 'perGram' ? `${item.makingCharge}/g` : `Rs.${item.makingCharge}`);
                    payload += `  MC: ${mcLabel}\x0a`;
                }
                payload += DASH;
            });
        } else if (paperWidth === '80mm') {
            // 3-Column Layout for 80mm (ITEM | WEIGHT | AMOUNT) -> Max 48 chars
            const cwItem = 20;
            const cwWt = 12;
            const cwAmt = 16;
            payload += `${thermalCommands.boldOn}${padR(_t('item'), cwItem)}${padR('WEIGHT', cwWt)}${padL(_t('amount'), cwAmt)}${thermalCommands.boldOff} \x0a`;
            payload += DASH;

            items.forEach(item => {
                const itemTaxable = item.goldValue + item.wastageValue + item.makingChargeValue;
                totalTaxableValue += itemTaxable;
                totalGrossWeight += item.grossWeight;
                totalNetWeight += item.netWeight;

                payload += `${thermalCommands.boldOn}${padR(item.name.toUpperCase().substring(0, cwItem - 1), cwItem)}${padR(item.netWeight.toFixed(3) + 'g', cwWt)}${padL(formatCurrency(item.totalValue), cwAmt)}${thermalCommands.boldOff} \x0a`;
                if (item.tagNumber) payload += `${padR(`  TAG: ${item.tagNumber}`, cwItem)}\x0a`;

                const wLabel = item.wastageType === 'percentage' ? `${item.wastage}%` : `${item.wastage}g`;
                payload += `${padR(`  ${item.pcs} Pcs`, cwItem)}${padR(`VA:${wLabel}`, cwWt)} \x0a`;

                const mcLabel = item.makingChargeType === 'percentage' ? `${item.makingCharge}%` : (item.makingChargeType === 'perGram' ? `${item.makingCharge}/g` : `Rs.${item.makingCharge}`);
                payload += `${padR(`  @Rs.${item.rate}`, cwItem)}${padR(`MC:${mcLabel}`, cwWt)} \x0a`;
                payload += DASH;
            });
        } else if (paperWidth === '112mm') {
            // 4-Column Layout for 112mm (ITEM | WEIGHT | VA & MC | AMOUNT) -> Max 64 chars
            const cwItem = 22;
            const cwWt = 12;
            const cwVaMc = 14;
            const cwAmt = 16;
            payload += `${thermalCommands.boldOn}${padR(_t('item'), cwItem)}${padR('WEIGHT', cwWt)}${padR('VA & MC', cwVaMc)}${padL(_t('amount'), cwAmt)}${thermalCommands.boldOff} \x0a`;
            payload += DASH;

            items.forEach(item => {
                const itemTaxable = item.goldValue + item.wastageValue + item.makingChargeValue;
                totalTaxableValue += itemTaxable;
                totalGrossWeight += item.grossWeight;
                totalNetWeight += item.netWeight;

                payload += `${thermalCommands.boldOn}${padR(item.name.toUpperCase().substring(0, cwItem - 1), cwItem)}${padR('N:' + item.netWeight.toFixed(3) + 'g', cwWt)}`;

                const wLabel = item.wastageType === 'percentage' ? `${item.wastage}%` : `${item.wastage}g`;
                payload += `${padR(`V:${wLabel}`, cwVaMc)}`;

                payload += `${padL(formatCurrency(item.totalValue), cwAmt)}${thermalCommands.boldOff} \x0a`;

                if (item.tagNumber) payload += `${padR(`  TAG: ${item.tagNumber}`, cwItem)}\x0a`;
                payload += `${padR(`  ${item.pcs} Pcs`, cwItem)}${padR('G:' + item.grossWeight.toFixed(3) + 'g', cwWt)}`;

                const mcLabel = item.makingChargeType === 'percentage' ? `${item.makingCharge}%` : (item.makingChargeType === 'perGram' ? `${item.makingCharge}/g` : `Rs.${item.makingCharge}`);
                payload += `${padR(`M:${mcLabel}`, cwVaMc)} \x0a`;
                payload += `${padR(`  @Rs.${item.rate}`, cwItem)}\x0a`;
                payload += DASH;
            });
        }

        payload += DASH;
        if (paperWidth === '58mm') {
            const totalPrefix = _t('total');
            const totalWidth = charWidth - totalPrefix.length;
            payload += `${thermalCommands.boldOn}${totalPrefix}${padL(formatCurrency(totalTaxableValue), totalWidth)}${thermalCommands.boldOff}\x0a`;
            payload += DASH;
            const netWeightPrefix = _t('net_wt_label');
            const netWeightWidth = charWidth - netWeightPrefix.length;
            payload += `${netWeightPrefix}${padL(totalNetWeight.toFixed(3) + 'g', netWeightWidth)}\x0a`;
        } else if (paperWidth === '80mm') {
            const cwItem = 20;
            const cwWt = 12;
            const cwAmt = 16;
            payload += `${thermalCommands.boldOn}${padR(_t('total'), cwItem)}${padR(totalGrossWeight.toFixed(3), cwWt)}${padL(formatCurrency(totalTaxableValue).substring(0, cwAmt), cwAmt)}${thermalCommands.boldOff}\x0a`;
            payload += DASH;
            payload += `${padR(_t('net_wt_label'), cwItem)}${padR(totalNetWeight.toFixed(3), cwWt)}\x0a`;
        } else if (paperWidth === '112mm') {
            const cwItem = 22;
            const cwWt = 12;
            const cwVaMc = 14;
            const cwAmt = 16;
            payload += `${thermalCommands.boldOn}${padR(_t('total'), cwItem)}${padR(totalGrossWeight.toFixed(3), cwWt)}${padR('', cwVaMc)}${padL(formatCurrency(totalTaxableValue).substring(0, cwAmt), cwAmt)}${thermalCommands.boldOff}\x0a`;
            payload += DASH;
            payload += `${padR(_t('net_wt_label'), cwItem)}${padR(totalNetWeight.toFixed(3), cwWt)}\x0a`;
        }
        payload += DASH;

        const totalGST = totalTaxableValue * 0.03;
        const splitGST = totalGST / 2;
        const estimationAmt = totalTaxableValue + totalGST;

        if (!config || config.showGST) {
            payload += `${padL(_t('cgst_label') + ' ' + formatCurrency(splitGST), charWidth)}\x0a`;
            payload += `${padL(_t('sgst_label') + ' ' + formatCurrency(splitGST), charWidth)}\x0a`;
        }
        // Grand Total Highlight and Shift
        payload += `${thermalCommands.divider(charWidth)}`;
        const grandTotalStr = _t('est_hash') + ': ' + formatCurrency(estimationAmt);
        if (paperWidth === '58mm') {
            payload += `${thermalCommands.boldOn}${padR(grandTotalStr, charWidth)}${thermalCommands.boldOff}\x0a`;
        } else {
            payload += `${thermalCommands.boldOn}${padL(grandTotalStr + '   ', charWidth)}${thermalCommands.boldOff}\x0a`;
        }
    }

    if (hasPurchase) {
        payload += LINE;
        payload += `${thermalCommands.center}${thermalCommands.boldOn}${_t('pur_quotation_title')}${thermalCommands.boldOff}\x0a`;

        const isTableLayout = paperWidth === '80mm' || paperWidth === '112mm';

        if (isTableLayout) {
            // Purchase Table Header: ITEMS | WT | LESS | RATE | AMOUNT
            // Re-using col config or defining specific for purchase
            const pCol = paperWidth === '80mm' ?
                { name: 10, wt: 8, less: 8, rate: 6, amt: 16 } : // 10+8+8+6+16 = 48
                { name: 16, wt: 10, less: 12, rate: 10, amt: 16 }; // 16+10+12+10+16 = 64

            payload += `${thermalCommands.boldOn}${padR(_t('item'), pCol.name)}${padL(_t('weight_g'), pCol.wt)}${padL(_t('less_label'), pCol.less)}${padL(_t('rate'), pCol.rate)}${padL(_t('amount_header'), pCol.amt)}${thermalCommands.boldOff}\x0a`;
            payload += DASH;

            let totalPurWeight = 0;
            purchaseItems.forEach(item => {
                totalPurchaseAmount += item.amount;
                totalPurWeight += item.netWeight;

                const lessWeightValue = item.lessWeightType === 'percentage' ? (item.grossWeight * item.lessWeight / 100) : (item.lessWeightType === 'amount' ? 0 : item.lessWeight);
                const lessStr = item.lessWeightType === 'percentage' ? `${item.lessWeight}%` : (item.lessWeightType === 'amount' ? `Rs.${item.lessWeight}` : `${item.lessWeight}g`);
                // Truncate category name to avoid shifting columns
                const catName = item.category.toUpperCase().substring(0, pCol.name - 1);
                payload += `${padR(catName, pCol.name)}${padL(item.netWeight.toFixed(3), pCol.wt)}${padL(lessStr.substring(0, pCol.less), pCol.less)}${padL(item.rate.toString().substring(0, pCol.rate), pCol.rate)}${padL(formatCurrency(item.amount).substring(0, pCol.amt), pCol.amt)}\x0a`;
            });
            payload += DASH;
            payload += `${thermalCommands.boldOn}${padR(_t('purchase_total'), pCol.name)}${padL(totalPurWeight.toFixed(3), pCol.wt)}${padR('', pCol.less)}${padR('', pCol.rate)}${padL(formatCurrency(totalPurchaseAmount).substring(0, pCol.amt), pCol.amt)}${thermalCommands.boldOff}\x0a`;
        } else {
            // 58mm Purchase Layout (Max 32 chars)
            // Header: ITEM (16 chars)  AMOUNT (16 chars)
            const pCwItem = 16;
            const pCwAmt = 16;
            payload += `${thermalCommands.left}${padR(_t('item'), pCwItem)}${padL(_t('amount_header'), pCwAmt)}\x0a`;
            payload += DASH;
            let totalPurWeight = 0;
            purchaseItems.forEach(item => {
                totalPurchaseAmount += item.amount;
                totalPurWeight += item.netWeight;

                // Truncate category name if too long
                const catName = item.category.toUpperCase().substring(0, pCwItem - 1);
                payload += `${thermalCommands.boldOn}${padR(catName, pCwItem)}${padL(formatCurrency(item.amount).substring(0, pCwAmt), pCwAmt)}${thermalCommands.boldOff}\x0a`;

                const lessWeightValue = item.lessWeightType === 'percentage' ? (item.grossWeight * item.lessWeight / 100) : (item.lessWeightType === 'amount' ? 0 : item.lessWeight);
                const lessStr = item.lessWeightType === 'percentage' ? `${item.lessWeight}%` : (item.lessWeightType === 'amount' ? `Rs.${item.lessWeight}` : `${item.lessWeight}g`);

                payload += `  ${_t('gross_wt_label')}: ${item.grossWeight.toFixed(3)}g\x0a`;
                payload += `  ${_t('less_label')}: ${lessStr}\x0a`;
                payload += `  ${_t('net_wt_label')}: ${item.netWeight.toFixed(3)}g | @Rs.${item.rate}\x0a`;
                payload += DASH;
            });
            const purTotalPrefix = _t('purchase_total');
            const purTotalWidth = charWidth - purTotalPrefix.length;
            payload += `${thermalCommands.boldOn}${purTotalPrefix}${padL(formatCurrency(totalPurchaseAmount), purTotalWidth)}${thermalCommands.boldOff}\x0a`;
        }
    }

    let totalChit = 0;
    if (hasChit) {
        payload += LINE;
        payload += `${thermalCommands.center}${thermalCommands.boldOn}${_t('chit_scheme_title')}${thermalCommands.boldOff}\x0a`;
        payload += `${thermalCommands.left}`;
        chitItems.forEach(item => {
            totalChit += item.amount;
            payload += `${padR(_t('chit') + ' (' + item.chitId + ')', charWidth - 15)}${padL(formatCurrency(item.amount), 15)}\x0a`;
        });
    }

    let totalAdvance = 0;
    if (hasAdvance) {
        payload += LINE;
        payload += `${thermalCommands.center}${thermalCommands.boldOn}${_t('advance_adjustment_title')}${thermalCommands.boldOff}\x0a`;
        payload += `${thermalCommands.left}`;
        advanceItems.forEach(item => {
            totalAdvance += item.amount;
            payload += `${padR(_t('advance') + ' (' + item.advanceId + ')', charWidth - 15)}${padL(formatCurrency(item.amount), 15)}\x0a`;
        });
    }

    const totalDeductions = totalPurchaseAmount + totalChit + totalAdvance;
    const estimationAmt = totalTaxableValue + (totalTaxableValue * 0.03); // Recalculate if needed
    const netPayable = (hasItems ? estimationAmt : 0) - totalDeductions;

    payload += LINE;
    if (hasItems && totalDeductions > 0) {
        payload += `${padL(_t('deductions_capital') + ': ' + formatCurrency(totalDeductions), charWidth)}\x0a`;
    }
    // Net Payable Highlight
    const netPayableStr = _t('net_amt_label') + ': ' + formatCurrency(Math.abs(netPayable));
    payload += `${thermalCommands.center}${thermalCommands.boldOn}${netPayableStr}${netPayable < 0 ? ' (CR)' : ''}${thermalCommands.boldOff}\x0a`;
    payload += LINE;
    if (config?.showOperator !== false && employeeName) {
        payload += `\x0a${_t('employee_name')}: ${employeeName} \x0a`;
    }

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
            // if (estimationNumber) {
            //     await printQRCodeImage(estimationNumber.toString(), type);
            // }
            let footer = '';
            if (!config || config.showFooter) footer += `${thermalCommands.center}${_t('thank_you_visit_again')}\x0a`;
            footer += `\x0a\x0a\x0a\x0a`;
            BLEPrinter.printText(footer);
            return;
        }
    }

    // Fetch gold/silver rates for display
    const goldRate24k = await getSetting('rate_24k') || '0';
    const goldRate22k = await getSetting('rate_22k') || '0';
    const goldRate18k = await getSetting('rate_18k') || '0';
    const silverRate = await getSetting('rate_silver') || '0';
    const dateStr = new Date().toLocaleDateString('en-IN', { day: '2-digit', month: '2-digit', year: 'numeric' });

    const header = await getShopHeaderHTML(shopDetails, config);
    const marketRates = getMarketRatesHTML({
        rate24k: goldRate24k,
        rate22k: goldRate22k,
        silver: silverRate,
        date: dateStr
    }, _t);
    const customerInfo = (config?.showCustomer !== false && (customerName || (shopDetails as any)?.customerMobile || (shopDetails as any)?.customerAddress)) ? getCustomerInfoHTML({
        name: customerName,
        mobile: (shopDetails as any)?.customerMobile || '',
        address: (shopDetails as any)?.customerAddress || ''
    }, _t, config) : '';
    const employeeFooter = (config?.showOperator !== false && employeeName) ? getEmployeeFooterHTML(employeeName, _t) : '';
    const receiptFooter = (!config || config.showFooter) ? getReceiptFooterHTML(_t) : '';

    // Calculate totals
    const totalItemAmount = items.reduce((sum, item) => sum + item.goldValue + item.wastageValue + item.makingChargeValue, 0);
    const totalGST = items.reduce((sum, item) => sum + item.gstValue, 0);
    const estimationAmount = totalItemAmount + totalGST;

    const totalPurchaseAmount = purchaseItems.reduce((sum, item) => sum + item.amount, 0);
    const totalChitAmount = chitItems.reduce((sum, item) => sum + item.amount, 0);
    const totalAdvanceAmount = advanceItems.reduce((sum, item) => sum + item.amount, 0);

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

    const itemsHTML = hasItems ? getEstimationItemsHTML(items, config, _t) : '';

    const gstHTML = (hasItems && (!config || config.showGST)) ? `
        <div class="row"><span>${_t('cgst_label')}</span><span>${formatCurrency(totalGST / 2)}</span></div>
        <div class="row"><span>${_t('sgst_label')}</span><span>${formatCurrency(totalGST / 2)}</span></div>
        <div class="row-bold"><span>${_t('taxable_total')}</span><span>${formatCurrency(estimationAmount)}</span></div>
    ` : hasItems ? `
        <div class="row-bold"><span>Total Amount</span><span>${formatCurrency(estimationAmount)}</span></div>
    ` : '';

    const purchaseHTML = purchaseItems.length > 0 ? getPurchaseItemsHTML(purchaseItems, totalPurchaseAmount, _t) : '';
    const chitHTML = chitItems.length > 0 ? getChitItemsHTML(chitItems, _t) : '';
    const advanceHTML = advanceItems.length > 0 ? getAdvanceItemsHTML(advanceItems, _t) : '';

    const totalDeductions = totalPurchaseAmount + totalChitAmount + totalAdvanceAmount;
    const finalNetPayable = (hasItems ? estimationAmount : 0) - totalDeductions;

    const html = `
        <html>
            <head>${getCommonStyles(config?.paperWidth)}</head>
            <body>
                ${header}
                <div class="receipt-title">${receiptTitle}</div>
                ${estimationNumber ? `<div class="row-bold" style="justify-content: center; margin-bottom: 5px;">Est #: ${estimationNumber}</div>` : ''}
                ${marketRates}
                ${customerInfo}
                <div class="double-line">${DOUBLE_DASH}</div>

                ${itemsHTML}
                ${gstHTML}
                ${purchaseHTML}
                ${chitHTML}
                ${advanceHTML}

                <div class="double-line" style="margin-top: 10px;">${DOUBLE_DASH}</div>
                <div class="net-amt">${_t('net_amt_label')} &nbsp; ${formatCurrency(Math.abs(finalNetPayable))}${finalNetPayable < 0 ? ' (CR)' : ''}</div>
                <div class="double-line">${DOUBLE_DASH}</div>
                
                ${employeeFooter}
                ${receiptFooter}
            </body>
        </html>
    `;

    await Print.printAsync({ html });
};

export const printChitItem = async (
    item: ChitItem,
    shopDetails: any,
    employeeName?: string,
    config?: ReceiptConfig,
    t?: TFunction,
    customerName?: string,
    customerMobile?: string,
    customerAddress?: string
) => {
    const _t = t || ((key: string) => key);
    const extItem = item as ExtendedItem;
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
                if ((!config || config.showOperator) && employeeName) payload += `${_t('operator')}: ${employeeName}\x0a`;
            }

            if (config?.showCustomer !== false && (customerName || customerMobile || customerAddress)) {
                if (customerName) payload += `${_t('customer_label')} ${customerName.toUpperCase()}\x0a`;
                if (customerMobile) payload += `${_t('phone_label')} ${customerMobile}\x0a`;
                if (customerAddress) payload += `${_t('address_label')} ${customerAddress.toUpperCase()}\x0a`;
            }

            payload += `${thermalCommands.divider(32)}${thermalCommands.boldOn}${_t('chit_receipt_title')}${thermalCommands.boldOff}\x0a`;
            payload += `${thermalCommands.left}${_t('chit_id')}: ${item.chitId}\x0a`;
            payload += `${thermalCommands.divider(32)}`;
            payload += `${thermalCommands.boldOn}${thermalCommands.doubleOn}${_t('net_paid_label')}: Rs.${item.amount.toLocaleString()}${thermalCommands.doubleOff}${thermalCommands.boldOff}\x0a`;
            if ((!config || config.showOperator) && employeeName) payload += `${_t('employee_name')}: ${employeeName}\x0a`;
            payload += `\x0a\x0a\x0a\x0a`;

            const { BLEPrinter } = require('react-native-thermal-receipt-printer');
            BLEPrinter.printText(payload);
            return;
        } else {
            throw new Error('Could not connect to thermal printer. Please ensure it is ON and nearby.');
        }
    }

    const header = await getShopHeaderHTML(shopDetails, config);
    const goldRate24k = await getSetting('rate_24k') || '0';
    const goldRate22k = await getSetting('rate_22k') || '0';
    const silverRate = await getSetting('rate_silver') || '0';
    const dateStr = new Date().toLocaleDateString('en-IN', { day: '2-digit', month: '2-digit', year: 'numeric' });
    const marketRates = getMarketRatesHTML({ rate24k: goldRate24k, rate22k: goldRate22k, silver: silverRate, date: dateStr }, _t);
    const employeeFooter = (config?.showOperator !== false && employeeName) ? getEmployeeFooterHTML(employeeName, _t) : '';

    const html = `
        <html>
            <head>${getCommonStyles(config?.paperWidth)}</head>
            <body>
                ${header}
                <div class="receipt-title">${_t('chit_receipt_title')}</div>
                ${marketRates}
                ${(config?.showCustomer !== false && (customerName || customerMobile || customerAddress)) ? getCustomerInfoHTML({
        name: customerName || '',
        mobile: customerMobile || '',
        address: customerAddress || ''
    }, _t) : ''}
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
                ${employeeFooter}
                ${(!config || config.showFooter) ? `<div class="footer">${shopDetails?.footerMessage || _t('thank_you_visit_again')}</div>` : ''}
            </body>
        </html>
    `;

    await Print.printAsync({ html });
};

export const printAdvanceItem = async (
    item: AdvanceItem,
    shopDetails: any,
    employeeName?: string,
    config?: ReceiptConfig,
    t?: TFunction,
    customerName?: string,
    customerMobile?: string,
    customerAddress?: string
) => {
    const _t = t || ((key: string) => key);
    const extItem = item as ExtendedItem;
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
                if ((!config || config.showOperator) && employeeName) payload += `${_t('operator')}: ${employeeName}\x0a`;
            }

            if (config?.showCustomer !== false && (customerName || customerMobile || customerAddress)) {
                if (customerName) payload += `${_t('customer_label')} ${customerName.toUpperCase()}\x0a`;
                if (customerMobile) payload += `${_t('phone_label')} ${customerMobile}\x0a`;
                if (customerAddress) payload += `${_t('address_label')} ${customerAddress.toUpperCase()}\x0a`;
            }

            payload += `${thermalCommands.divider(32)}${thermalCommands.boldOn}${_t('advance_receipt_title')}${thermalCommands.boldOff}\x0a`;
            payload += `${thermalCommands.left}${_t('advance_id')}: ${item.advanceId}\x0a`;
            payload += `${thermalCommands.divider(32)}`;
            payload += `${thermalCommands.boldOn}${thermalCommands.doubleOn}${_t('advance_amount_label')}: Rs.${item.amount.toLocaleString()}${thermalCommands.doubleOff}${thermalCommands.boldOff}\x0a`;
            if ((!config || config.showOperator) && employeeName) payload += `${_t('employee_name')}: ${employeeName}\x0a`;
            payload += `\x0a\x0a\x0a\x0a`;

            const { BLEPrinter } = require('react-native-thermal-receipt-printer');
            BLEPrinter.printText(payload);
            return;
        } else {
            throw new Error('Could not connect to thermal printer. Please ensure it is ON and nearby.');
        }
    }

    const header = await getShopHeaderHTML(shopDetails, config);
    const goldRate24k = await getSetting('rate_24k') || '0';
    const goldRate22k = await getSetting('rate_22k') || '0';
    const silverRate = await getSetting('rate_silver') || '0';
    const dateStr = new Date().toLocaleDateString('en-IN', { day: '2-digit', month: '2-digit', year: 'numeric' });
    const marketRates = getMarketRatesHTML({ rate24k: goldRate24k, rate22k: goldRate22k, silver: silverRate, date: dateStr }, _t);
    const employeeFooter = (config?.showOperator !== false && employeeName) ? getEmployeeFooterHTML(employeeName, _t) : '';

    const html = `
        <html>
            <head>${getCommonStyles(config?.paperWidth)}</head>
            <body>
                ${header}
                <div class="receipt-title">${_t('advance_receipt_title')}</div>
                ${marketRates}
                ${(config?.showCustomer !== false && (customerName || customerMobile || customerAddress)) ? getCustomerInfoHTML({
        name: customerName || '',
        mobile: customerMobile || '',
        address: customerAddress || ''
    }, _t) : ''}
                <div class="row" style="font-size: 16px; margin-top: 10px;">
                    <span>${_t('advance_id')}:</span>
                    <span style="font-weight: bold;">${item.advanceId}</span>
                </div>
                <div class="total-section" style="margin-top: 20px;">
                    <div class="total-row">
                        <span>${_t('advance_amount_label')}:</span>
                        <span>Rs. ${item.amount.toLocaleString()}</span>
                    </div>
                </div>
                ${employeeFooter}
                ${(!config || config.showFooter) ? `<div class="footer">${shopDetails?.footerMessage || _t('thank_you_visit_again')}</div>` : ''}
            </body>
        </html>
    `;

    await Print.printAsync({ html });
};

export const printRepairDelivery = async (
    repair: any,
    extraAmount: number,
    gstAmount: number,
    shopDetails?: any,
    employeeName?: string,
    config?: ReceiptConfig
): Promise<void> => {
    const { type, printer } = await getPrinterConfig();

    if (type === 'thermal' && printer?.address) {
        const connected = await ensureThermalConnection(printer.address);
        if (!connected) return;
        const { BLEPrinter } = require('react-native-thermal-receipt-printer');
        const payload = await _getRepairDeliveryThermalPayload(repair, extraAmount, gstAmount, shopDetails, employeeName, config);
        BLEPrinter.printText(payload.trim());
        await new Promise(res => setTimeout(res, 120));
        BLEPrinter.printText('\n');
        await printQRCodeImage(repair.id, type);
        let footer = '\n\x1b\x61\x01Thank You! Visit Again\x1b\x61\x00\n\n\n\n';
        BLEPrinter.printText(footer);
        return;
    }

    const html = await _getRepairDeliveryHTMLPayload(repair, extraAmount, gstAmount, shopDetails, employeeName, config);
    await Print.printAsync({ html });
};

export const getRepairReceiptThermalPayload = async (
    repair: any,
    shopDetails?: any,
    employeeName?: string,
    config?: ReceiptConfig,
    t?: TFunction
): Promise<string> => {
    const _t = t || ((key: string) => key);
    const shopName = shopDetails?.name || await getSetting('shop_name') || 'GOLD ESTIMATION';
    const paperWidth = config?.paperWidth || '58mm';
    const lineWidth = paperWidth === '58mm' ? 32 : paperWidth === '80mm' ? 48 : 64;

    const fmt = (val: number) => new Intl.NumberFormat('en-IN').format(Math.round(val ?? 0));
    const fmtDate = (d: string | Date) => new Date(d).toLocaleDateString('en-IN');
    const row = (left: string, right: string) => {
        const space = lineWidth - left.length - right.length;
        return left + ' '.repeat(Math.max(space, 1)) + right;
    };
    const center = (text: string) => {
        const space = Math.floor((lineWidth - text.length) / 2);
        return ' '.repeat(Math.max(space, 0)) + text;
    };
    const divider = '-'.repeat(lineWidth);
    const dblDivider = '='.repeat(lineWidth);

    let p = '\x1b@';
    p += `${center(shopName)}\n${divider}\n`;
    p += `\x1b\x45\x01${center('REPAIR RECEIPT')}\x1b\x45\x00\n${divider}\n`;
    p += `${row('Repair No:', repair.id || '')}\n`;

    if (lineWidth === 32) {
        p += `${row('Date:', fmtDate(repair.date || new Date()))}\n`;
        p += `${row('Due Date:', fmtDate(repair.dueDate || new Date()))}\n`;
    } else {
        const d1 = fmtDate(repair.date || new Date());
        const d2 = fmtDate(repair.dueDate || new Date());
        const c1 = Math.floor(lineWidth / 2);
        p += `${padR(`Date: ${d1}`, c1)}${padR(`Due Date: ${d2}`, lineWidth - c1)}\n`;
    }

    p += `${divider}\n`;

    if (repair.customerName) p += `${row('Customer:', repair.customerName.toUpperCase())}\n`;
    if (repair.customerMobile) p += `${row('Phone:', repair.customerMobile)}\n`;

    p += `${divider}\n`;

    const issueText = repair.issue || 'N/A';
    const totalAmount = repair.amount || (repair.advance + repair.balance);

    if (lineWidth === 32) {
        // 58mm -> Stacked (ITEM | AMOUNT)
        p += `\x1b\x45\x01${padR('ITEM', 20)}${padL('AMOUNT', 12)}\x1b\x45\x00\n`;
        p += `${divider}\n`;
        p += `\x1b\x45\x01${padR((repair.itemName || '').toUpperCase().substring(0, 19), 20)}${padL(fmt(totalAmount), 12)}\x1b\x45\x00\n`;
        if (repair.subProductName) p += `${repair.subProductName}\n`;
        p += `Issue: ${issueText}\n`;
        p += `${divider}\n`;
        p += `${row('Advance Paid:', 'Rs. ' + fmt(repair.advance))}\n`;
        p += `${row('Balance Due:', 'Rs. ' + fmt(repair.balance))}\n`;
        p += `${dblDivider}\n`;
        p += `\x1b\x45\x01${row('Total:', 'Rs. ' + fmt(totalAmount))}\x1b\x45\x00\n`;
    } else if (lineWidth === 48) {
        // 80mm -> 3 Columns (ITEM | ISSUE | AMOUNT) -> Max 48 chars
        const cwItem = 18;
        const cwIssue = 14;
        const cwAmt = 16;
        p += `\x1b\x45\x01${padR('ITEM', cwItem)}${padR('ISSUE', cwIssue)}${padL('AMOUNT', cwAmt)}\x1b\x45\x00\n`;
        p += `${divider}\n`;
        p += `\x1b\x45\x01${padR((repair.itemName || '').toUpperCase().substring(0, cwItem - 1), cwItem)}${padR(issueText.substring(0, cwIssue - 1), cwIssue)}${padL(fmt(totalAmount).substring(0, cwAmt), cwAmt)}\x1b\x45\x00\n`;
        if (repair.subProductName) p += `${repair.subProductName}\n`;

        p += `${divider}\n`;
        const adv = 'Rs. ' + fmt(repair.advance);
        const bal = 'Rs. ' + fmt(repair.balance);
        const cw1 = Math.floor(lineWidth / 2);
        p += `${padR(`Advance: ${adv}`, cw1)}${padR(`Balance: ${bal}`, lineWidth - cw1)}\n`;
        p += `${dblDivider}\n`;
        p += `\x1b\x45\x01${padL(`Total: Rs. ${fmt(totalAmount)}`, lineWidth)}\x1b\x45\x00\n`;
    } else {
        // 112mm -> 4 Columns (ITEM | ISSUE | ADVANCE | AMOUNT) -> Max 64 chars
        const cwItem = 20;
        const cwIssue = 14;
        const cwAdv = 14;
        const cwAmt = 16;
        p += `\x1b\x45\x01${padR('ITEM', cwItem)}${padR('ISSUE', cwIssue)}${padR('ADVANCE', cwAdv)}${padL('AMOUNT', cwAmt)}\x1b\x45\x00\n`;
        p += `${divider}\n`;
        p += `\x1b\x45\x01${padR((repair.itemName || '').toUpperCase().substring(0, cwItem - 1), cwItem)}${padR(issueText.substring(0, cwIssue - 1), cwIssue)}${padR(fmt(repair.advance).substring(0, cwAdv), cwAdv)}${padL(fmt(totalAmount).substring(0, cwAmt), cwAmt)}\x1b\x45\x00\n`;
        if (repair.subProductName) p += `${repair.subProductName}\n`;

        p += `${divider}\n`;
        p += `${padL(`Balance Due: Rs. ${fmt(repair.balance)}`, lineWidth)}\n`;
        p += `${dblDivider}\n`;
        p += `\x1b\x45\x01${padL(`Total: Rs. ${fmt(totalAmount)}`, lineWidth)}\x1b\x45\x00\n`;
    }

    p += `${dblDivider}\n`;

    p += `${row('Status:', repair.status || 'PENDING')}\n`;
    if (employeeName || repair.empId) p += `${row('Operator:', employeeName || repair.empId)}\n`;
    return p;
};

export const printRepair = async (
    repair: any,
    shopDetails?: any,
    employeeName?: string,
    config?: ReceiptConfig,
    t?: TFunction
): Promise<void> => {
    const { type, printer } = await getPrinterConfig();

    if (type === 'thermal' && printer?.address) {
        const connected = await ensureThermalConnection(printer.address);
        if (!connected) return;
        const { BLEPrinter } = require('react-native-thermal-receipt-printer');
        const payload = await getRepairReceiptThermalPayload(repair, shopDetails, employeeName, config, t);
        BLEPrinter.printText(payload.trim());
        await new Promise(res => setTimeout(res, 120));
        BLEPrinter.printText('\n');
        await printQRCodeImage(repair.id, type);
        let footer = '\n\x1b\x61\x01Thank You! Visit Again\x1b\x61\x00\n\n\n\n';
        BLEPrinter.printText(footer);
        return;
    }

    const _t = t || ((key: string) => key);
    const fmt = (val: number) => new Intl.NumberFormat('en-IN').format(Math.round(val ?? 0));
    const fmtDate = (d: string | Date) => new Date(d).toLocaleDateString('en-IN');
    const paperWidth = config?.paperWidth || '58mm';
    const width = paperWidth === '58mm' ? '220px' : paperWidth === '80mm' ? '300px' : '420px';

    const html = `
  <html><head><style>
    body{font-family:monospace;width:${width};margin:0 auto;padding:5px;font-size:12px}
    .center{text-align:center}.bold{font-weight:bold}
    .div{border-top:1px dashed #000;margin:5px 0}.ddiv{border-top:2px solid #000;margin:5px 0}
    .row{display:flex;justify-content:space-between;margin:2px 0}
    .title{font-size:13px;font-weight:bold;text-align:center;margin:5px 0}
    .footer{text-align:center;margin-top:8px;font-size:11px}
  </style></head><body>
    <div class="center bold">${shopDetails?.name || 'GOLD ESTIMATION'}</div>
    ${shopDetails?.address1 ? `<div class="center">${shopDetails.address1}</div>` : ''}
    ${shopDetails?.mobile ? `<div class="center">Mob: ${shopDetails.mobile}</div>` : ''}
    <div class="div"></div><div class="title">REPAIR RECEIPT</div><div class="div"></div>
    <div class="row"><span>Repair No:</span><span>${repair.id}</span></div>
    <div class="row"><span>Date:</span><span>${fmtDate(repair.date || new Date())}</span></div>
    <div class="row"><span>Due Date:</span><span>${fmtDate(repair.dueDate || new Date())}</span></div>
    ${(repair.customerName || repair.customerMobile) ? `
      <div class="div"></div>
      ${repair.customerName ? `<div class="row"><span>Customer:</span><span>${repair.customerName.toUpperCase()}</span></div>` : ''}
      ${repair.customerMobile ? `<div class="row"><span>Phone:</span><span>${repair.customerMobile}</span></div>` : ''}
    ` : ''}
    <div class="div"></div>
    <div class="bold center">${(repair.itemName || '').toUpperCase()}</div>
    ${repair.subProductName ? `<div class="center">${repair.subProductName}</div>` : ''}
    <div class="div"></div>
    ${repair.issue ? `<div class="row"><span>Issue:</span><span>${repair.issue}</span></div>` : ''}
    <div class="row"><span>Advance Paid</span><span>Rs. ${fmt(repair.advance)}</span></div>
    <div class="row"><span>Balance Due</span><span>Rs. ${fmt(repair.balance)}</span></div>
    <div class="ddiv"></div>
    <div class="row bold"><span>Total</span><span>Rs. ${fmt(repair.amount || repair.advance + repair.balance)}</span></div>
    <div class="ddiv"></div>
    <div class="row"><span>Status</span><span>${repair.status || 'PENDING'}</span></div>
    ${(employeeName || repair.empId) ? `<div class="div"></div><div class="row"><span>Operator</span><span>${employeeName || repair.empId}</span></div>` : ''}
    <div class="footer">Thank You! Visit Again.</div>
  </body></html>`;

    await Print.printAsync({ html });
};

const _getRepairDeliveryThermalPayload = async (
    repair: any,
    extraAmount: number,
    gstAmount: number,
    shopDetails?: any,
    employeeName?: string,
    config?: ReceiptConfig
): Promise<string> => {
    const shopName = shopDetails?.name || await getSetting('shop_name') || 'GOLD ESTIMATION';
    const paperWidth = config?.paperWidth || '58mm';
    const lineWidth = paperWidth === '58mm' ? 32 : paperWidth === '80mm' ? 48 : 64;
    const fmt = (val: number) => new Intl.NumberFormat('en-IN').format(Math.round(val ?? 0));
    const fmtDate = (d: string | Date) => new Date(d).toLocaleDateString('en-IN');
    const row = (left: string, right: string) => {
        const space = lineWidth - left.length - right.length;
        return left + ' '.repeat(Math.max(space, 1)) + right;
    };
    const center = (text: string) => {
        const space = Math.floor((lineWidth - text.length) / 2);
        return ' '.repeat(Math.max(space, 0)) + text;
    };
    const divider = '-'.repeat(lineWidth);
    const dblDivider = '='.repeat(lineWidth);
    const totalPaid = repair.balance + extraAmount + gstAmount;
    let p = '\x1b@';
    p += `${center(shopName)}\n${divider}\n`;
    p += `\x1b\x45\x01${center('DELIVERY RECEIPT')}\x1b\x45\x00\n${divider}\n`;

    if (lineWidth === 32) {
        p += `${row('Repair No:', repair.id || '')}\n`;
        p += `${row('Date:', fmtDate(new Date()))}\n`;
    } else {
        const c1 = Math.floor(lineWidth / 2);
        p += `${padR(`Repair No: ${repair.id || ''}`, c1)}${padR(`Date: ${fmtDate(new Date())}`, lineWidth - c1)}\n`;
    }

    p += `${divider}\n`;

    if (repair.customerName) p += `${row('Customer:', repair.customerName.toUpperCase())}\n`;
    if (repair.customerMobile) p += `${row('Phone:', repair.customerMobile)}\n`;
    p += `${divider}\n`;

    if (lineWidth === 32) {
        p += `\x1b\x45\x01${padR('ITEM', 20)}${padL('AMOUNT', 12)}\x1b\x45\x00\n`;
        p += `${divider}\n`;
        p += `\x1b\x45\x01${padR((repair.itemName || '').toUpperCase().substring(0, 19), 20)}${padL(fmt(repair.balance), 12)}\x1b\x45\x00\n`;
        if (repair.subProductName) p += `${repair.subProductName}\n`;
        p += `${divider}\n`;
        p += `${row('Advance Paid:', 'Rs. ' + fmt(repair.advance))}\n`;
        p += `${row('Balance:', 'Rs. ' + fmt(repair.balance))}\n`;
        if (extraAmount > 0) p += `${row('Extra Amount:', 'Rs. ' + fmt(extraAmount))}\n`;
        if (gstAmount > 0) p += `${row('GST:', 'Rs. ' + fmt(gstAmount))}\n`;
        p += `${dblDivider}\n\x1b\x45\x01${row('Total Paid:', 'Rs. ' + fmt(totalPaid))}\x1b\x45\x00\n${dblDivider}\n`;
    } else if (lineWidth === 48) {
        // 80mm Delivery -> 3 Col -> Max 48 chars
        const cwItem = 18;
        const cwIssue = 14;
        const cwAmt = 16;
        p += `\x1b\x45\x01${padR('ITEM', cwItem)}${padR('STATUS', cwIssue)}${padL('AMOUNT', cwAmt)}\x1b\x45\x00\n`;
        p += `${divider}\n`;
        const statusTxt = (repair.status || 'DELIVERED').substring(0, cwIssue - 1);
        p += `\x1b\x45\x01${padR((repair.itemName || '').toUpperCase().substring(0, cwItem - 1), cwItem)}${padR(statusTxt, cwIssue)}${padL(fmt(repair.balance).substring(0, cwAmt), cwAmt)}\x1b\x45\x00\n`;
        if (repair.subProductName) p += `${repair.subProductName}\n`;

        p += `${divider}\n`;
        const c1 = Math.floor(lineWidth / 2);
        p += `${padR(`Advance: Rs. ${fmt(repair.advance)}`, c1)}${padR(`Balance: Rs. ${fmt(repair.balance)}`, lineWidth - c1)}\n`;
        if (extraAmount > 0 || gstAmount > 0) {
            p += `${padR(extraAmount > 0 ? `Extra: Rs. ${fmt(extraAmount)}` : '', c1)}${padR(gstAmount > 0 ? `GST: Rs. ${fmt(gstAmount)}` : '', lineWidth - c1)}\n`;
        }
        p += `${dblDivider}\n\x1b\x45\x01${padL(`Total Paid: Rs. ${fmt(totalPaid)}`, lineWidth)}\x1b\x45\x00\n${dblDivider}\n`;
    } else {
        // 112mm Delivery -> 4 Col -> Max 64 chars
        const cwItem = 20;
        const cwIssue = 14;
        const cwAdv = 14;
        const cwAmt = 16;
        p += `\x1b\x45\x01${padR('ITEM', cwItem)}${padR('STATUS', cwIssue)}${padR('ADVANCE', cwAdv)}${padL('AMOUNT', cwAmt)}\x1b\x45\x00\n`;
        p += `${divider}\n`;
        const statusTxt = (repair.status || 'DELIVERED').substring(0, cwIssue - 1);
        p += `\x1b\x45\x01${padR((repair.itemName || '').toUpperCase().substring(0, cwItem - 1), cwItem)}${padR(statusTxt, cwIssue)}${padR(fmt(repair.advance).substring(0, cwAdv), cwAdv)}${padL(fmt(repair.balance).substring(0, cwAmt), cwAmt)}\x1b\x45\x00\n`;
        if (repair.subProductName) p += `${repair.subProductName}\n`;

        p += `${divider}\n`;
        const c1 = Math.floor(lineWidth / 2);
        p += `${padR('Balance: Rs. ' + fmt(repair.balance), c1)}`;
        if (extraAmount > 0) p += `${padR('Extra: Rs. ' + fmt(extraAmount), Math.floor(lineWidth / 4))}`;
        if (gstAmount > 0) p += `${padR('GST: Rs. ' + fmt(gstAmount), Math.floor(lineWidth / 4))}`;
        p += '\n';
        p += `${dblDivider}\n\x1b\x45\x01${padL(`Total Paid: Rs. ${fmt(totalPaid)}`, lineWidth)}\x1b\x45\x00\n${dblDivider}\n`;
    }
    if (employeeName || repair.empId) p += `${row('Operator:', employeeName || repair.empId)}\n`;
    return p;
};

const _getRepairDeliveryHTMLPayload = async (
    repair: any,
    extraAmount: number,
    gstAmount: number,
    shopDetails?: any,
    employeeName?: string,
    config?: ReceiptConfig
): Promise<string> => {
    const paperWidth = config?.paperWidth || '58mm';
    const width = paperWidth === '58mm' ? '220px' : paperWidth === '80mm' ? '300px' : '420px';
    const fmt = (val: number) => new Intl.NumberFormat('en-IN').format(Math.round(val ?? 0));
    const fmtDate = (d: string | Date) => new Date(d).toLocaleDateString('en-IN');
    const totalPaid = repair.balance + extraAmount + gstAmount;
    return `
  <html><head><style>
    body{font-family:monospace;width:${width};margin:0 auto;padding:5px;font-size:12px}
    .center{text-align:center}.bold{font-weight:bold}
    .div{border-top:1px dashed #000;margin:5px 0}.ddiv{border-top:2px solid #000;margin:5px 0}
    .row{display:flex;justify-content:space-between;margin:2px 0}
    .title{font-size:13px;font-weight:bold;text-align:center;margin:5px 0}
    .footer{text-align:center;margin-top:8px;font-size:11px}
  </style></head><body>
    <div class="center bold">${shopDetails?.name || 'GOLD ESTIMATION'}</div>
    ${shopDetails?.address1 ? `<div class="center">${shopDetails.address1}</div>` : ''}
    ${shopDetails?.mobile ? `<div class="center">Mob: ${shopDetails.mobile}</div>` : ''}
    <div class="div"></div><div class="title">REPAIR DELIVERY RECEIPT</div><div class="div"></div>
    <div class="row"><span>Repair No:</span><span>${repair.id}</span></div>
    <div class="row"><span>Date:</span><span>${fmtDate(new Date())}</span></div>
    ${(repair.customerName || repair.customerMobile) ? `
      <div class="div"></div>
      ${repair.customerName ? `<div class="row"><span>Customer:</span><span>${repair.customerName.toUpperCase()}</span></div>` : ''}
      ${repair.customerMobile ? `<div class="row"><span>Phone:</span><span>${repair.customerMobile}</span></div>` : ''}
    ` : ''}
    <div class="div"></div>
    <div class="bold center">${(repair.itemName || '').toUpperCase()}</div>
    <div class="div"></div>
    <div class="row"><span>Advance Paid</span><span>Rs. ${fmt(repair.advance)}</span></div>
    <div class="row"><span>Balance</span><span>Rs. ${fmt(repair.balance)}</span></div>
    ${extraAmount > 0 ? `<div class="row"><span>Extra Amount</span><span>Rs. ${fmt(extraAmount)}</span></div>` : ''}
    ${gstAmount > 0 ? `<div class="row"><span>GST Amount</span><span>Rs. ${fmt(gstAmount)}</span></div>` : ''}
    <div class="ddiv"></div>
    <div class="row bold"><span>Total Due Paid</span><span>Rs. ${fmt(totalPaid)}</span></div>
    <div class="ddiv"></div>
    ${(employeeName || repair.empId) && config?.showOperator !== false ? `
      <div class="div"></div>
      <div class="row"><span>Operator</span><span>${employeeName || repair.empId}</span></div>` : ''}
    ${config?.showFooter !== false ? `<div class="footer">${shopDetails?.footerMessage || 'Thank You! Visit Again.'}</div>` : ''}
  </body></html>`;
};

export const printQRCodeImage = async (text: string, printerType: string = 'thermal'): Promise<boolean> => {
    return new Promise((resolve) => {
        try {
            const { NativeModules } = require('react-native');
            const qrUrl = `https://quickchart.io/qr?text=${encodeURIComponent(text)}&size=200&margin=0`;
            const handleResult = (err: any) => resolve(!err);

            if (printerType === 'thermal' || printerType === 'bluetooth') {
                if (NativeModules.RNBLEPrinter && NativeModules.RNBLEPrinter.printImageData) {
                    NativeModules.RNBLEPrinter.printImageData(qrUrl, handleResult);
                } else resolve(false);
            } else if (printerType === 'usb') {
                if (NativeModules.RNUSBPrinter && NativeModules.RNUSBPrinter.printImageData) {
                    NativeModules.RNUSBPrinter.printImageData(qrUrl, handleResult);
                } else resolve(false);
            } else if (printerType === 'net') {
                if (NativeModules.RNNetPrinter && NativeModules.RNNetPrinter.printImageData) {
                    NativeModules.RNNetPrinter.printImageData(qrUrl, handleResult);
                } else resolve(false);
            } else {
                resolve(false);
            }
        } catch (e) {
            console.error('Failed to print QR code image:', e);
            resolve(false);
        }
    });
};

