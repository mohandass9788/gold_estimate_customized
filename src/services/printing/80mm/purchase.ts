import { thermalCommands, padR, padL, thermalRow, formatCurrency } from '../helpers/thermalHelpers';
import { PurchaseItem } from '../../../types';
import { ReceiptConfig } from '../../../store/GeneralSettingsContext';
import { getThermalHeader, getThermalCustomer, getThermalFooter } from '../helpers/baseTemplates';

/**
 * Optimized 80mm Purchase Template (48 characters)
 */
export const getPurchase80mmPayload = (
    item: PurchaseItem,
    shopName: string,
    deviceName: string,
    employeeName: string,
    config?: ReceiptConfig,
    goldRate?: number,
    silverRate?: number,
    footerMessage?: string
) => {
    const width = 48;
    const divider = thermalCommands.divider(width);

    let payload = getThermalHeader(shopName, deviceName, config, goldRate, silverRate);
    payload += divider;
    payload += `${thermalCommands.center}${thermalCommands.boldOn}PURCHASE (OLD GOLD)${thermalCommands.boldOff}\x0a`;
    payload += divider;

    payload += getThermalCustomer({ name: (item as any).customerName, mobile: (item as any).customerMobile, address: (item as any).customerAddress }, width, config);

    // Header
    payload += `${padR('ITEM', 16)}${padR('N.WT', 10)}${padR('RATE', 8)}${padL('AMOUNT', 14)}\x0a`;
    payload += divider;

    // Item Row (Simplified, no Rs. here)
    const amountStr = formatCurrency(item.amount);
    const weightStr = `${item.netWeight.toFixed(3)}g`;
    const rateStr = `${item.rate}`;
    const itemName = item.category.toUpperCase().substring(0, 15);
    payload += `${padR(itemName, 16)}${padR(weightStr, 10)}${padR(rateStr, 8)}${padL(amountStr, 14)}\x0a`;

    // Sub-details (Compact)
    if (item.lessWeightType === 'grams' && item.lessWeight > 0) {
        payload += `  Net Wt: ${item.netWeight.toFixed(3)}g | Less: ${item.lessWeight}g\x0a`;
    } else {
        payload += `  Net Wt: ${item.netWeight.toFixed(3)}g\x0a`;
    }

    payload += divider;
    // Grand Total (Keeping Rs. here)
    payload += `${thermalCommands.boldOn}${thermalRow('PURCHASE AMT', 'Rs. ' + amountStr, width)}${thermalCommands.boldOff}`;

    payload += getThermalFooter(employeeName, { name: (item as any).customerName, mobile: (item as any).customerMobile, address: (item as any).customerAddress }, width, config, footerMessage, false);

    return payload;
};
