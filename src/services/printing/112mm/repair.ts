import { thermalCommands, thermalRow, formatCurrency } from '../helpers/thermalHelpers';
import { ReceiptConfig } from '../../../store/GeneralSettingsContext';
import { getThermalHeader, getThermalCustomer, getThermalFooter } from '../helpers/baseTemplates';
import { format } from 'date-fns';

export const getRepair112mmPayload = (
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
    const width = 64;
    const divider = thermalCommands.divider(width);
    const line = thermalCommands.line(width);

    let payload = getThermalHeader(shopName, deviceName, config, goldRate, silverRate);
    payload += line;
    const title = isDelivery ? 'REPAIR DELIVERY RECEIPT' : 'REPAIR RECEIPT';
    payload += `${thermalCommands.center}${thermalCommands.boldOn}${title}${thermalCommands.boldOff}\x0a`;
    if (repair.id) {
        payload += `${thermalCommands.center}${thermalCommands.smallOn}Repair ID: ${repair.id}${thermalCommands.smallOff}\x0a`;
    }
    payload += line;

    payload += getThermalCustomer({ name: repair.customerName, mobile: repair.customerMobile, address: repair.customerAddress }, width, config);
    if (repair.customerName || repair.customerMobile || repair.customerAddress) {
        payload += divider;
    }

    payload += `${thermalCommands.boldOn}${repair.itemName.toUpperCase()}${thermalCommands.boldOff}\x0a`;
    payload += thermalRow(`Qty: ${repair.pcs}  Gross Wt: ${repair.grossWeight}g`, '', width);
    if (repair.natureOfRepair) {
        payload += `Repair Type: ${repair.natureOfRepair}\x0a`;
    }

    // Dates for History
    try {
        payload += thermalRow(`Inward Date: ${format(new Date(repair.date), 'dd/MM/yyyy')}`, '', width);
        if (isDelivery && repair.deliveryDate) {
            payload += thermalRow(`Delivery Date: ${format(new Date(repair.deliveryDate), 'dd/MM/yyyy')}`, '', width);
        }
    } catch (e) {
        console.error('Date format error in repair receipt:', e);
    }
    payload += divider;

    if (isDelivery) {
        const baseAmt = repair.amount || 0;
        const advPaid = repair.advance || 0;
        const balDue = repair.balance || 0;
        const finalExtra = extraAmount || 0;
        const grandTotalFull = baseAmt + (repair.gstAmount || 0) + finalExtra;

        payload += thermalRow('Original Repair Cost', formatCurrency(baseAmt), width);
        if ((repair.gstAmount || 0) > 0) {
            payload += thermalRow('GST Amount', formatCurrency(repair.gstAmount || 0), width);
        }
        payload += thermalRow('Total Repair Cost', formatCurrency(baseAmt + (repair.gstAmount || 0)), width);
        payload += line;

        payload += thermalRow('Advance Paid (Earlier)', '-' + formatCurrency(advPaid), width);
        payload += thermalRow('Balance Paid (Today)', '-' + formatCurrency(balDue), width);

        if (finalExtra > 0) {
            payload += thermalRow('Extra Charges', '-' + formatCurrency(finalExtra), width);
        }

        payload += line;
        payload += `${thermalCommands.boldOn}${thermalRow('TOTAL PAID (SETTLED)', 'Rs. ' + formatCurrency(grandTotalFull), width)}${thermalCommands.boldOff}`;
        payload += divider;
        payload += thermalRow('Closing Balance', 'Rs. 0.00', width);
        payload += divider;
        payload += `${thermalCommands.center}${thermalCommands.boldOn}*** DELIVERED ***${thermalCommands.boldOff}\x0a`;
        payload += divider;
    } else {
        payload += thermalRow('Est. Cost', formatCurrency(repair.amount), width);
        if (repair.gstAmount > 0) {
            payload += thermalRow('GST (3%)', formatCurrency(repair.gstAmount), width);
        }
        if (repair.advance > 0) {
            payload += thermalRow('Advance Paid', '-' + formatCurrency(repair.advance), width);
        }
        payload += divider;
        const bal = (repair.amount + (repair.gstAmount || 0)) - repair.advance;
        payload += `${thermalCommands.boldOn}${thermalRow('BALANCE DUE', 'Rs. ' + formatCurrency(bal), width)}${thermalCommands.boldOff}`;
        payload += divider;
    }

    if (!skipFooter) {
        // Only show QR if NOT a delivery receipt
        payload += getThermalFooter(employeeName || repair.empId, {}, width, config, footerMessage, true, !isDelivery);
    }

    return payload;
};
