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
    payload += `${padR('ITEM', 10)}${padR('WT', 7)}${padR('RATE', 7)}${padL('AMOUNT', 8)}\x0a`;
    payload += thermalCommands.smallOff;
    payload += divider;

    // Item Row
    payload += thermalCommands.smallOn;
    const amountStr = formatCurrency(item.amount);
    const weightStr = `${item.grossWeight.toFixed(2)}`;
    const rateStr = `${item.rate}`;
    const itemName = item.category.toUpperCase().substring(0, 10);

    // 10 (Name) + 7 (Weight) + 7 (Rate) + 8 (Amount) = 32
    payload += `${thermalCommands.boldOn}${padR(itemName, 10)}${thermalCommands.boldOff}${padR(weightStr, 7)}${padR(rateStr, 7)}${padL(amountStr, 8)}\x0a`;

    payload += thermalCommands.smallOff;

    payload += divider;
    payload += `${thermalCommands.boldOn}${thermalRow('PURCHASE AMT', 'Rs. ' + amountStr, width)}${thermalCommands.boldOff}`;

    payload += getThermalFooter(employeeName, { name: (item as any).customerName, mobile: (item as any).customerMobile, address: (item as any).customerAddress }, width, config, footerMessage, false);

    return payload;
};
