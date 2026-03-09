import { thermalCommands, formatCurrency, thermalRow } from '../helpers/thermalHelpers';
import { AdvanceItem } from '../../../types';
import { ReceiptConfig } from '../../../store/GeneralSettingsContext';
import { getThermalHeader, getThermalCustomer, getThermalFooter } from '../helpers/baseTemplates';

export const getAdvance112mmPayload = (
    item: AdvanceItem,
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
    payload += `${thermalCommands.center}${thermalCommands.boldOn}ADVANCE ADJUSTMENT${thermalCommands.boldOff}\x0a`;
    payload += divider;

    payload += getThermalCustomer({ name: (item as any).customerName, mobile: (item as any).customerMobile, address: (item as any).customerAddress }, width, config);

    payload += `  Advance ID: ${item.advanceId}\x0a`;
    payload += `${thermalRow('AMOUNT', 'Rs. ' + formatCurrency(item.amount), width)}`;

    payload += divider;
    payload += getThermalFooter(employeeName, { name: (item as any).customerName, mobile: (item as any).customerMobile, address: (item as any).customerAddress }, width, config, footerMessage, false);
    return payload;
};
