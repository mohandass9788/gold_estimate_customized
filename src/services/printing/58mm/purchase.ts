import { thermalCommands, padR, padL, thermalRow, formatCurrency } from '../helpers/thermalHelpers';
import { PurchaseItem } from '../../../types';
import { ReceiptConfig } from '../../../store/GeneralSettingsContext';
import { getThermalHeader, getThermalCustomer, getThermalFooter } from '../helpers/baseTemplates';

/**
 * Optimized 58mm Purchase Template (32 characters)
 */
export const getPurchase58mmPayload = (
    item: PurchaseItem,
    shopName: string,
    deviceName: string,
    employeeName: string,
    config?: ReceiptConfig,
    goldRate?: number,
    silverRate?: number,
    footerMessage?: string
) => {
    const width = 32;
    const divider = thermalCommands.divider(width);

    let payload = getThermalHeader(shopName, deviceName, config, goldRate, silverRate);
    payload += divider;
    payload += `${thermalCommands.center}${thermalCommands.boldOn}PURCHASE (OLD GOLD)${thermalCommands.boldOff}\x0a`;
    payload += divider;

    payload += getThermalCustomer({ name: (item as any).customerName, mobile: (item as any).customerMobile, address: (item as any).customerAddress }, width, config);

    // Header (Small Font)
    payload += thermalCommands.smallOn;
    payload += `${padR('ITEM', 14)}${padR('N.WT', 9)}${padR('RATE', 8)}${padL('AMOUNT', 11)}\x0a`;
    payload += thermalCommands.smallOff;
    payload += divider;

    // Item Row
    payload += thermalCommands.smallOn;
    const amountStr = formatCurrency(item.amount);
    const weightStr = `${item.netWeight.toFixed(3)}g`;
    const rateStr = `${item.rate}`;
    const itemName = item.category.toUpperCase().substring(0, 13);

    payload += `${thermalCommands.boldOn}${padR(itemName, 14)}${thermalCommands.boldOff}${padR(weightStr, 9)}${padR(rateStr, 8)}${padL(amountStr, 11)}\x0a`;

    // Sub-details (Compact)
    if (item.lessWeightType === 'grams' && item.lessWeight > 0) {
        payload += `  Net Wt: ${item.netWeight.toFixed(3)}g | Less: ${item.lessWeight}g\x0a`;
    } else {
        payload += `  Net Wt: ${item.netWeight.toFixed(3)}g\x0a`;
    }
    payload += thermalCommands.smallOff;

    payload += divider;
    payload += `${thermalCommands.boldOn}${thermalRow('PURCHASE AMT', 'Rs. ' + amountStr, width)}${thermalCommands.boldOff}`;

    payload += getThermalFooter(employeeName, { name: (item as any).customerName, mobile: (item as any).customerMobile, address: (item as any).customerAddress }, width, config, footerMessage, false);

    return payload;
};
