import { thermalCommands, padR, padL, thermalRow, formatCurrency } from '../helpers/thermalHelpers';
import { PurchaseItem } from '../../../types';
import { ReceiptConfig } from '../../../store/GeneralSettingsContext';
import { getThermalHeader, getThermalCustomer, getThermalFooter } from '../helpers/baseTemplates';

/**
 * Optimized 112mm Purchase Template (64 characters)
 */
export const getPurchase112mmPayload = (
    item: PurchaseItem,
    shopName: string,
    deviceName: string,
    employeeName: string,
    config?: ReceiptConfig,
    goldRate?: number,
    silverRate?: number,
    footerMessage?: string
) => {
    const width = 64;
    const divider = thermalCommands.divider(width);

    let payload = getThermalHeader(shopName, deviceName, config, goldRate, silverRate);
    payload += divider;
    payload += `${thermalCommands.center}${thermalCommands.boldOn}PURCHASE (OLD GOLD)${thermalCommands.boldOff}\x0a`;
    payload += divider;

    payload += getThermalCustomer({ 
        name: (item as any).customerName,
        mobile: (item as any).customerMobile,
        address: (item as any).customerAddress
    }, width, config);

    // Header
    // 24 (Name) + 14 (Weight) + 12 (Rate) + 14 (Amount) = 64
    payload += `${padR('ITEM', 24)}${padR('G.WT', 14)}${padR('RATE', 12)}${padL('AMOUNT', 14)}\x0a`;
    payload += divider;

    // Item Row
    const amountStr = formatCurrency(item.amount);
    const weightStr = `${item.grossWeight.toFixed(3)}g`;
    const rateStr = `${item.rate}`;
    const itemName = item.category.toUpperCase().substring(0, 23);
    payload += `${padR(itemName, 24)}${padR(weightStr, 14)}${padR(rateStr, 12)}${padL(amountStr, 14)}\x0a`;

    // Grand Total (Keeping Rs. here)
    payload += divider;
    payload += `${thermalCommands.boldOn}${thermalRow('PURCHASE AMOUNT', 'Rs. ' + amountStr, width)}${thermalCommands.boldOff}`;

    payload += getThermalFooter(employeeName, { name: (item as any).customerName, mobile: (item as any).customerMobile, address: (item as any).customerAddress }, width, config, footerMessage, false);
    return payload;
};
