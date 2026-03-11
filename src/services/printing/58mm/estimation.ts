import { thermalCommands, padR, padL, thermalRow, formatCurrency, chunkString } from '../helpers/thermalHelpers';
import { EstimationItem } from '../../../types';
import { ReceiptConfig } from '../../../store/GeneralSettingsContext';
import { getThermalHeader, getThermalCustomer, getThermalFooter } from '../helpers/baseTemplates';

/**
 * Optimized 58mm Estimation Template (32 characters)
 * Focus: Stacked layout for readability on small paper.
 */
export const getEstimation58mmPayload = (
    item: EstimationItem,
    shopName: string,
    deviceName: string,
    employeeName: string,
    config?: ReceiptConfig,
    goldRate?: number,
    silverRate?: number,
    estimationNumber?: number,
    footerMessage?: string
) => {
    const width = 32;
    const divider = thermalCommands.divider(width);

    let payload = getThermalHeader(shopName, deviceName, config, goldRate, silverRate);
    payload += divider;
    payload += `${thermalCommands.center}${thermalCommands.boldOn}ESTIMATION SLIP${thermalCommands.boldOff}\x0a`;
    if (estimationNumber) {
        payload += `${thermalCommands.center}${thermalCommands.smallOn}Est No: ${estimationNumber}${thermalCommands.smallOff}\x0a`;
    }
    payload += divider;

    // Customer Info at Top
    const customer = { name: (item as any).customerName };
    payload += getThermalCustomer(customer, width, config);
    if (customer.name) payload += divider;

    // Item Row
    payload += thermalCommands.smallOn;
    const itemSubtotal = config?.showGST ? (item.totalValue - (item.gstValue || 0)) : item.totalValue;
    const amountStr = formatCurrency(itemSubtotal);
    const weightStr = `${item.grossWeight.toFixed(3)}`;
    const mcStr = formatCurrency(item.makingChargeValue);

    const nameChunks = chunkString(item.name.toUpperCase(), 16);
    const itemNamePrimary = nameChunks[0];

    const pcsStr = item.pcs.toString();
    const vWeight = item.wastageType === 'percentage' ? (item.netWeight * item.wastage / 100) : item.wastage;
    const vaStr = vWeight.toFixed(2);

    // Two-line layout for 58mm
    payload += `${thermalCommands.boldOn}${padR(itemNamePrimary, 16)}${padL(amountStr, 16)}${thermalCommands.boldOff}\n`;
    for (let i = 1; i < nameChunks.length; i++) {
        payload += `${thermalCommands.boldOn}${nameChunks[i]}${thermalCommands.boldOff}\n`;
    }
    payload += `  P:${pcsStr} GW:${weightStr} MC:${mcStr} VA:${vaStr}\n`;

    if (item.stoneWeight > 0) {
        payload += `  Stone: ${item.stoneWeight.toFixed(3)}g\n`;
    }
    payload += thermalCommands.smallOff;

    payload += divider;

    // Weight Totals
    const gWtStr = `Gross WT: ${item.grossWeight.toFixed(3)}g`;
    const sWtStr = item.stoneWeight > 0 ? `Stone: ${item.stoneWeight.toFixed(3)}g` : '';
    payload += padR(gWtStr, width - sWtStr.length) + sWtStr + '\x0a';

    const nWtStr = `Net WT: ${item.netWeight.toFixed(3)}g`;
    payload += padR(nWtStr, width) + '\x0a';

    // Summary Section
    payload += thermalRow('Net Amount', amountStr, width);
    if (config?.showGST) {
        const cgst = (item.gstValue || 0) / 2;
        const sgst = (item.gstValue || 0) / 2;
        payload += thermalRow('CGST (1.5%)', formatCurrency(cgst), width);
        payload += thermalRow('SGST (1.5%)', formatCurrency(sgst), width);
    }

    const grandTotal = item.totalValue;
    payload += `${thermalCommands.boldOn}${thermalRow('GRAND TOTAL', 'Rs. ' + formatCurrency(grandTotal), width)}${thermalCommands.boldOff}`;

    // Pass empty customer object because it's already at the top
    payload += getThermalFooter(employeeName, {}, width, config, footerMessage, true);

    return payload;
};
