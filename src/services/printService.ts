import * as Print from 'expo-print';
import { EstimationItem, PurchaseItem, ChitItem, AdvanceItem } from '../types';
import { getSetting } from './dbService';
import { ReceiptConfig } from '../store/GeneralSettingsContext';
import { NativeModules } from 'react-native';

type TFunction = (key: string, params?: Record<string, string>) => string;
type ExtendedItem = (EstimationItem | PurchaseItem | ChitItem | AdvanceItem) & { customerName?: string };

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
export { thermalCommands, getCharWidth, padR, padL, formatCurrency, cleanThermalPayload } from './printing/helpers/thermalHelpers';
import { thermalCommands, getCharWidth, padR, padL } from './printing/helpers/thermalHelpers';

// 58mm
import { getEstimation58mmPayload } from './printing/58mm/estimation';
import { getPurchase58mmPayload } from './printing/58mm/purchase';
import { getChit58mmPayload } from './printing/58mm/chit';
import { getAdvance58mmPayload } from './printing/58mm/advance';
import { getConsolidated58mmPayload } from './printing/58mm/consolidated';
import { getRepair58mmPayload } from './printing/58mm/repair';

// 80mm
import { getEstimation80mmPayload } from './printing/80mm/estimation';
import { getPurchase80mmPayload } from './printing/80mm/purchase';
import { getChit80mmPayload } from './printing/80mm/chit';
import { getAdvance80mmPayload } from './printing/80mm/advance';
import { getConsolidated80mmPayload } from './printing/80mm/consolidated';
import { getRepair80mmPayload } from './printing/80mm/repair';

// 112mm
import { getEstimation112mmPayload } from './printing/112mm/estimation';
import { getPurchase112mmPayload } from './printing/112mm/purchase';
import { getChit112mmPayload } from './printing/112mm/chit';
import { getAdvance112mmPayload } from './printing/112mm/advance';
import { getConsolidated112mmPayload } from './printing/112mm/consolidated';
import { getRepair112mmPayload } from './printing/112mm/repair';

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
                const connected = await ensureThermalConnection(printer.address);
                if (connected) return printer;
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
        return true;
    } catch (e: any) {
        console.log('Printer connection failed:', e.message || 'Printer offline');
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
            const paperWidth = config?.paperWidth || '58mm';
            const charWidth = getCharWidth(paperWidth);
            let payload = `${thermalCommands.reset}${thermalCommands.center}`;
            if (!config || config.showHeader) {
                payload += `${thermalCommands.doubleOn}${shopName}${thermalCommands.doubleOff}\x0a`;
                if (config?.showDeviceName !== false && deviceName) payload += `Device: ${deviceName}\x0a`;
            }
            payload += `STATUS: SUCCESSFUL\x0a`;
            payload += `${thermalCommands.divider(charWidth)}${new Date().toLocaleString()}\x0a\x0a`;
            if ((!config || config.showOperator) && employeeName) payload += `Employee: ${employeeName}\x0a`;
            payload += `\x0a\x0a\x0a\x0a`;
            BLEPrinter.printText(payload);
            return;
        }
    }
    const html = `<html><body><h1>TEST PRINT</h1><p>Date: ${new Date().toLocaleString()}</p></body></html>`;
    await Print.printAsync({ html });
};

export const printEstimationItem = async (
    item: EstimationItem,
    shopDetails?: any,
    employeeName?: string,
    config?: ReceiptConfig,
    t?: TFunction,
    estimationNumber?: number
): Promise<void> => {
    const { type, printer } = await getPrinterConfig();
    if (type === 'thermal' && printer?.address) {
        const connected = await ensureThermalConnection(printer.address);
        if (connected) {
            const shopName = shopDetails?.name || await getSetting('shop_name') || 'GOLD ESTIMATION';
            const deviceName = await getSetting('device_name') || '';
            const paperWidth = config?.paperWidth || '58mm';

            // Get current rates for header
            const gRate = await getSetting('rate_22k');
            const sRate = await getSetting('rate_silver');
            const goldRate = gRate ? parseFloat(gRate) : undefined;
            const silverRate = sRate ? parseFloat(sRate) : undefined;

            let payload = '';
            const footerMessage = shopDetails?.footerMessage;
            if (paperWidth === '80mm') payload = getEstimation80mmPayload(item, shopName, deviceName, employeeName || '', config, goldRate, silverRate, estimationNumber, footerMessage);
            else if (paperWidth === '112mm') payload = getEstimation112mmPayload(item, shopName, deviceName, employeeName || '', config, goldRate, silverRate, estimationNumber, footerMessage);
            else payload = getEstimation58mmPayload(item, shopName, deviceName, employeeName || '', config, goldRate, silverRate, estimationNumber, footerMessage);

            const { BLEPrinter } = require('react-native-thermal-receipt-printer');
            BLEPrinter.printText(payload);
            return;
        }
    }
    // Minimal HTML Print logic for EstimationItem (as required by current app structure)
    const _t = t || ((key: string) => key);
    const html = `<html><body><h2>ESTIMATION</h2><p>${item.name}</p></body></html>`;
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
    const { type, printer } = await getPrinterConfig();
    if (type === 'thermal' && printer?.address) {
        const connected = await ensureThermalConnection(printer.address);
        if (connected) {
            const shopName = shopDetails?.name || await getSetting('shop_name') || 'GOLD ESTIMATION';
            const deviceName = await getSetting('device_name') || '';
            const paperWidth = config?.paperWidth || '58mm';

            const gRate = await getSetting('rate_22k');
            const sRate = await getSetting('rate_silver');
            const goldRate = gRate ? parseFloat(gRate) : undefined;
            const silverRate = sRate ? parseFloat(sRate) : undefined;

            let payload = '';
            const purchaseWithCust = { ...item, customerName, customerMobile, customerAddress };
            const footerMessage = shopDetails?.footerMessage;
            if (paperWidth === '80mm') payload = getPurchase80mmPayload(purchaseWithCust as any, shopName, deviceName, employeeName || '', config, goldRate, silverRate, footerMessage);
            else if (paperWidth === '112mm') payload = getPurchase112mmPayload(purchaseWithCust as any, shopName, deviceName, employeeName || '', config, goldRate, silverRate, footerMessage);
            else payload = getPurchase58mmPayload(purchaseWithCust as any, shopName, deviceName, employeeName || '', config, goldRate, silverRate, footerMessage);

            const { BLEPrinter } = require('react-native-thermal-receipt-printer');
            BLEPrinter.printText(payload);
            return;
        }
    }
    const _t = t || ((key: string) => key);
    const html = `<html><body><h2>PURCHASE</h2><p>${item.category}</p></body></html>`;
    await Print.printAsync({ html });
};

export const printChitItem = async (
    item: ChitItem,
    shopDetails?: any,
    employeeName?: string,
    config?: ReceiptConfig,
    t?: TFunction,
    customerName?: string,
    customerMobile?: string,
    customerAddress?: string
): Promise<void> => {
    const { type, printer } = await getPrinterConfig();
    if (type === 'thermal' && printer?.address) {
        const connected = await ensureThermalConnection(printer.address);
        if (connected) {
            const shopName = shopDetails?.name || await getSetting('shop_name') || 'GOLD ESTIMATION';
            const deviceName = await getSetting('device_name') || '';
            const paperWidth = config?.paperWidth || '58mm';

            const gRate = await getSetting('rate_22k');
            const sRate = await getSetting('rate_silver');
            const goldRate = gRate ? parseFloat(gRate) : undefined;
            const silverRate = sRate ? parseFloat(sRate) : undefined;

            let payload = '';
            const itemWithCust = { ...item, customerName, customerMobile, customerAddress };
            const footerMessage = shopDetails?.footerMessage;
            if (paperWidth === '80mm') payload = getChit80mmPayload(itemWithCust as any, shopName, deviceName, employeeName || '', config, goldRate, silverRate, footerMessage);
            else if (paperWidth === '112mm') payload = getChit112mmPayload(itemWithCust as any, shopName, deviceName, employeeName || '', config, goldRate, silverRate, footerMessage);
            else payload = getChit58mmPayload(itemWithCust as any, shopName, deviceName, employeeName || '', config, goldRate, silverRate, footerMessage);

            const { BLEPrinter } = require('react-native-thermal-receipt-printer');
            BLEPrinter.printText(payload);
            return;
        }
    }
};

export const printAdvanceItem = async (
    item: AdvanceItem,
    shopDetails?: any,
    employeeName?: string,
    config?: ReceiptConfig,
    t?: TFunction,
    customerName?: string,
    customerMobile?: string,
    customerAddress?: string
): Promise<void> => {
    const { type, printer } = await getPrinterConfig();
    if (type === 'thermal' && printer?.address) {
        const connected = await ensureThermalConnection(printer.address);
        if (connected) {
            const shopName = shopDetails?.name || await getSetting('shop_name') || 'GOLD ESTIMATION';
            const deviceName = await getSetting('device_name') || '';
            const paperWidth = config?.paperWidth || '58mm';

            const gRate = await getSetting('rate_22k');
            const sRate = await getSetting('rate_silver');
            const goldRate = gRate ? parseFloat(gRate) : undefined;
            const silverRate = sRate ? parseFloat(sRate) : undefined;

            let payload = '';
            const itemWithCust = { ...item, customerName, customerMobile, customerAddress };
            const footerMessage = shopDetails?.footerMessage;
            if (paperWidth === '80mm') payload = getAdvance80mmPayload(itemWithCust as any, shopName, deviceName, employeeName || '', config, goldRate, silverRate, footerMessage);
            else if (paperWidth === '112mm') payload = getAdvance112mmPayload(itemWithCust as any, shopName, deviceName, employeeName || '', config, goldRate, silverRate, footerMessage);
            else payload = getAdvance58mmPayload(itemWithCust as any, shopName, deviceName, employeeName || '', config, goldRate, silverRate, footerMessage);

            const { BLEPrinter } = require('react-native-thermal-receipt-printer');
            BLEPrinter.printText(payload);
            return;
        }
    }
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
    t?: TFunction,
    skipFooter: boolean = false
): Promise<string> => {
    const shopName = shopDetails?.name || await getSetting('shop_name') || 'GOLD ESTIMATION';
    const deviceName = await getSetting('device_name') || '';
    const paperWidth = config?.paperWidth || '58mm';
    const estimationTotal = items.reduce((sum, i) => sum + i.totalValue, 0);
    const purchaseTotal = purchaseItems.reduce((sum, i) => sum + i.amount, 0);
    const chitTotal = chitItems.reduce((sum, i) => sum + i.amount, 0);
    const advanceTotal = advanceItems.reduce((sum, i) => sum + i.amount, 0);
    const gstTotal = items.reduce((sum, i) => sum + i.gstValue, 0);
    const estimationWithGst = estimationTotal + gstTotal;
    const grandTotal = (estimationWithGst - purchaseTotal - chitTotal - advanceTotal);

    const gRate = await getSetting('rate_22k');
    const sRate = await getSetting('rate_silver');
    const goldRate = gRate ? parseFloat(gRate) : undefined;
    const silverRate = sRate ? parseFloat(sRate) : undefined;

    const data = {
        estimationItems: items,
        purchaseItems,
        chitItems,
        advanceItems,
        customer: {
            name: customerName,
            mobile: shopDetails?.customerMobile,
            address: shopDetails?.customerAddress
        },
        totals: {
            estimationTotal,
            purchaseTotal,
            chitTotal,
            advanceTotal,
            taxableAmount: estimationTotal,
            cgst: gstTotal / 2,
            sgst: gstTotal / 2,
            igst: 0,
            estimationWithGst,
            grandTotal
        }
    };
    const footerMessage = shopDetails?.footerMessage;

    if (paperWidth === '80mm') return getConsolidated80mmPayload(data as any, shopName, deviceName, employeeName || '', config, goldRate, silverRate, estimationNumber, skipFooter, footerMessage);
    if (paperWidth === '112mm') return getConsolidated112mmPayload(data as any, shopName, deviceName, employeeName || '', config, goldRate, silverRate, estimationNumber, skipFooter, footerMessage);
    return getConsolidated58mmPayload(data as any, shopName, deviceName, employeeName || '', config, goldRate, silverRate, estimationNumber, skipFooter, footerMessage);
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
    const { type, printer } = await getPrinterConfig();
    if (type === 'thermal' && printer?.address) {
        const connected = await ensureThermalConnection(printer.address);
        if (connected) {
            // Get payload WITH footer
            const payload = await getEstimationReceiptThermalPayload(items, purchaseItems, chitItems, advanceItems, shopDetails, customerName, employeeName, config, estimationNumber, t, false);
            const { BLEPrinter } = require('react-native-thermal-receipt-printer');

            // Print combined content
            await BLEPrinter.printText(payload);
            return;
        }
    }
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
        if (connected) {
            const payload = await getRepairReceiptThermalPayload(repair, shopDetails, employeeName, config, t, false, false);
            const { BLEPrinter } = require('react-native-thermal-receipt-printer');
            BLEPrinter.printText(payload);

            await printQRCodeImage(repair.id, type, config?.qrEndpointUrl);
            await new Promise(resolve => setTimeout(resolve, 1000));
            BLEPrinter.printText('\x0a\x0a\x1d\x56\x42\x00'); // Final cut if needed after QR
            return;
        }
    }
};

export const getRepairReceiptThermalPayload = async (
    repair: any,
    shopDetails?: any,
    employeeName?: string,
    config?: ReceiptConfig,
    t?: TFunction,
    isDelivery: boolean = false,
    skipFooter: boolean = false
): Promise<string> => {
    const shopName = shopDetails?.name || await getSetting('shop_name') || 'GOLD ESTIMATION';
    const deviceName = await getSetting('device_name') || '';
    const paperWidth = config?.paperWidth || '58mm';

    const gRate = await getSetting('rate_22k');
    const sRate = await getSetting('rate_silver');
    const goldRate = gRate ? parseFloat(gRate) : undefined;
    const silverRate = sRate ? parseFloat(sRate) : undefined;

    const footerMessage = shopDetails?.footerMessage;

    if (paperWidth === '80mm') return getRepair80mmPayload(repair, 0, 0, shopName, deviceName, employeeName || '', config, goldRate, silverRate, isDelivery, skipFooter, footerMessage);
    if (paperWidth === '112mm') return getRepair112mmPayload(repair, 0, 0, shopName, deviceName, employeeName || '', config, goldRate, silverRate, isDelivery, skipFooter, footerMessage);
    return getRepair58mmPayload(repair, 0, 0, shopName, deviceName, employeeName || '', config, goldRate, silverRate, isDelivery, skipFooter, footerMessage);
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
        if (connected) {
            const shopName = shopDetails?.name || await getSetting('shop_name') || 'GOLD ESTIMATION';
            const deviceName = await getSetting('device_name') || '';
            const paperWidth = config?.paperWidth || '58mm';
            const footerMessage = shopDetails?.footerMessage;

            const gRate = await getSetting('rate_22k');
            const sRate = await getSetting('rate_silver');
            const goldRate = gRate ? parseFloat(gRate) : undefined;
            const silverRate = sRate ? parseFloat(sRate) : undefined;

            let payload = '';
            if (paperWidth === '80mm') payload = getRepair80mmPayload(repair, extraAmount, gstAmount, shopName, deviceName, employeeName || '', config, goldRate, silverRate, true, false, footerMessage);
            else if (paperWidth === '112mm') payload = getRepair112mmPayload(repair, extraAmount, gstAmount, shopName, deviceName, employeeName || '', config, goldRate, silverRate, true, false, footerMessage);
            else payload = getRepair58mmPayload(repair, extraAmount, gstAmount, shopName, deviceName, employeeName || '', config, goldRate, silverRate, true, false, footerMessage);

            const { BLEPrinter } = require('react-native-thermal-receipt-printer');
            BLEPrinter.printText(payload);
            return;
        }
    }
};

export const printQRCodeImage = async (text: string, printerType: string = 'thermal', qrEndpointUrl?: string): Promise<boolean> => {
    return new Promise((resolve) => {
        try {
            const qrContent = qrEndpointUrl ? `${qrEndpointUrl}${encodeURIComponent(text)}` : encodeURIComponent(text);
            const qrUrl = `https://quickchart.io/qr?text=${qrContent}&size=200&margin=0`;

            // Fallback timeout in case the native printer module hangs during remote image download
            const safetyTimeout = setTimeout(() => {
                console.warn('printQRCodeImage timed out after 5000ms. Returning false to prevent UI lock.');
                resolve(false);
            }, 8000); // Increased to 8s for better reliability on slow networks


            const handleResult = (err: any) => {
                clearTimeout(safetyTimeout);
                resolve(!err);
            };

            if (printerType === 'thermal' || printerType === 'bluetooth') {
                if (NativeModules.RNBLEPrinter?.printImageData) NativeModules.RNBLEPrinter.printImageData(qrUrl, handleResult);
                else { clearTimeout(safetyTimeout); resolve(false); }
            } else if (printerType === 'usb') {
                if (NativeModules.RNUSBPrinter?.printImageData) NativeModules.RNUSBPrinter.printImageData(qrUrl, handleResult);
                else { clearTimeout(safetyTimeout); resolve(false); }
            } else if (printerType === 'net') {
                if (NativeModules.RNNetPrinter?.printImageData) NativeModules.RNNetPrinter.printImageData(qrUrl, handleResult);
                else { clearTimeout(safetyTimeout); resolve(false); }
            } else { clearTimeout(safetyTimeout); resolve(false); }
        } catch (e) {
            console.error('Failed to print QR code image:', e);
            resolve(false);
        }
    });
};
