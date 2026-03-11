import { thermalCommands, padR, padL, thermalRow, formatCurrency, chunkString } from '../helpers/thermalHelpers';
import { EstimationItem } from '../../../types';
import { ReceiptConfig } from '../../../store/GeneralSettingsContext';
import { getThermalHeader, getThermalCustomer, getThermalFooter } from '../helpers/baseTemplates';

/**
 * Optimized 80mm Estimation Template (48 characters)
 * Focus: Compact layout, reduced paper waste, no redundant Rs.
 */
export const getEstimation80mmPayload = (
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
    const width = 48;
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

    // Header
    payload += `${padR('ITEM', 13)}${padR('PCS', 4)}${padR('G.WT', 7)}${padR('MC', 7)}${padR('VA', 6)}${padL('AMOUNT', 11)}\x0a`;
    payload += divider;

    // Item Row
    const itemSubtotal = config?.showGST ? (item.totalValue - (item.gstValue || 0)) : item.totalValue;
    const amountStr = formatCurrency(itemSubtotal);
    const weightStr = `${item.grossWeight.toFixed(3)}`;
    const mcStr = formatCurrency(item.makingChargeValue);

    const nameChunks = chunkString(item.name.toUpperCase(), 12);
    const itemNamePrimary = nameChunks[0];

    const pcsStr = item.pcs.toString();
    const vWeight = item.wastageType === 'percentage' ? (item.netWeight * item.wastage / 100) : item.wastage;
    const vaStr = vWeight.toFixed(2);

    payload += `${padR(itemNamePrimary, 13)}${padR(pcsStr, 4)}${padR(weightStr, 7)}${padR(mcStr, 7)}${padR(vaStr, 6)}${padL(amountStr, 11)}\x0a`;

    for (let i = 1; i < nameChunks.length; i++) {
        payload += `${nameChunks[i]}\x0a`;
    }

    if (item.stoneWeight > 0) {
        payload += `  Stone: ${item.stoneWeight.toFixed(3)}g\x0a`;
    }

    payload += divider;

    // Weight Totals
    const gWtStr = `Gross WT: ${item.grossWeight.toFixed(3)}g`;
    const sWtStr = item.stoneWeight > 0 ? `Stone: ${item.stoneWeight.toFixed(3)}g` : '';
    payload += padR(gWtStr, width - sWtStr.length) + sWtStr + '\x0a';

    const nWtStr = `Net WT: ${item.netWeight.toFixed(3)}g`;
    payload += padR(nWtStr, width) + '\x0a';

    // Summary Section
    payload += thermalRow('Items Value', amountStr, width);
    if (config?.showGST) {
        const cgst = (item.gstValue || 0) / 2;
        const sgst = (item.gstValue || 0) / 2;
        payload += thermalRow('CGST (1.5%)', formatCurrency(cgst), width);
        payload += thermalRow('SGST (1.5%)', formatCurrency(sgst), width);
    }

    const grandTotal = item.totalValue;
    payload += `${thermalCommands.boldOn}${thermalRow('ESTIMATION TOTAL', 'Rs. ' + formatCurrency(grandTotal), width)}${thermalCommands.boldOff}`;

    payload += divider;

    // Pass empty customer object because it's already at the top
    payload += getThermalFooter(employeeName, {}, width, config, footerMessage, true);

    return payload;
};
