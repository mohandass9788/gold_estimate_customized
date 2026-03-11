import { thermalCommands, thermalRow, formatCurrency } from '../helpers/thermalHelpers';
import { ReceiptConfig } from '../../../store/GeneralSettingsContext';
import { getThermalHeader, getThermalCustomer, getThermalFooter } from '../helpers/baseTemplates';

export const getRepair80mmPayload = (
    repair: any,
    extraAmount: number,
    gstAmount: number,
    shopName: string,
    deviceName: string,
    employeeName: string,
    config?: ReceiptConfig,
    goldRate?: number,
    silverRate?: number,
    isDelivery: boolean = false,
    skipFooter: boolean = false,
    footerMessage?: string
) => {
    const width = 48;
    const divider = thermalCommands.divider(width);
    const line = thermalCommands.line(width);

    let payload = getThermalHeader(shopName, deviceName, config, goldRate, silverRate);
    payload += line;
    const title = isDelivery ? 'REPAIR DELIVERY RECEIPT' : 'REPAIR RECEIPT';
    payload += `${thermalCommands.center}${thermalCommands.boldOn}${title}${thermalCommands.boldOff}\x0a`;
    payload += line;

    payload += divider;
    payload += `${thermalCommands.boldOn}${repair.itemName.toUpperCase()}${thermalCommands.boldOff}\x0a`;
    payload += thermalRow(`Qty: ${repair.pcs}  Gross Wt: ${repair.grossWeight}g`, '', width);
    if (repair.natureOfRepair) {
        payload += `Desc: ${repair.natureOfRepair}\x0a`;
    }

    if (isDelivery) {
        const baseAmt = repair.amount || (repair.advance + repair.balance - (repair.gstAmount || 0));
        payload += thermalRow('Original Amount', formatCurrency(baseAmt), width);
        payload += thermalRow('Advance Paid', '-' + formatCurrency(repair.advance), width);
        payload += thermalRow('Balance Due', formatCurrency(repair.balance), width);

        if (extraAmount > 0) payload += thermalRow('Extra Charges', formatCurrency(extraAmount), width);
        if (gstAmount > 0) payload += thermalRow('GST (3%)', formatCurrency(gstAmount), width);

        const totalPaid = repair.balance + extraAmount + gstAmount;
        payload += divider;
        payload += `${thermalCommands.boldOn}${thermalRow('TOTAL PAID', 'Rs. ' + formatCurrency(totalPaid), width)}${thermalCommands.boldOff}`;
        payload += divider;
        payload += `${thermalCommands.center}${thermalCommands.boldOn}*** DELIVERED ***${thermalCommands.boldOff}\x0a`;
        payload += divider;
    } else {
        payload += thermalRow('Est. Cost', formatCurrency(repair.amount), width);
        if (repair.gstAmount > 0) payload += thermalRow('GST Amount', formatCurrency(repair.gstAmount), width);
        if (repair.advance > 0) payload += thermalRow('Advance Paid', '-' + formatCurrency(repair.advance), width);
        payload += divider;
        payload += `${thermalCommands.boldOn}${thermalRow('BALANCE DUE', 'Rs. ' + formatCurrency(repair.balance), width)}${thermalCommands.boldOff}`;
        payload += divider;
    }

    if (!skipFooter) {
        payload += getThermalFooter(employeeName || repair.empId, { name: repair.customerName, mobile: repair.customerMobile }, width, config, footerMessage, false, true);
    }

    return payload;
};
