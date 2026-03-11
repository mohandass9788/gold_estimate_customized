import { thermalCommands, padR, padL, thermalRow, formatCurrency, chunkString } from '../helpers/thermalHelpers';
import { EstimationItem, PurchaseItem, ChitItem, AdvanceItem } from '../../../types';
import { ReceiptConfig } from '../../../store/GeneralSettingsContext';
import { getThermalHeader, getThermalCustomer, getThermalFooter } from '../helpers/baseTemplates';

/**
 * Consolidated 80mm Template (48 characters)
 * Focus: Combined receipt for all billing items, extremely compact.
 */
export const getConsolidated80mmPayload = (
    data: {
        estimationItems: EstimationItem[],
        purchaseItems: PurchaseItem[],
        chitItems: ChitItem[],
        advanceItems: AdvanceItem[],
        customer: { name?: string, mobile?: string, address?: string },
        totals: {
            estimationTotal: number,
            purchaseTotal: number,
            chitTotal: number,
            advanceTotal: number,
            taxableAmount: number,
            cgst: number,
            sgst: number,
            igst: number,
            grandTotal: number
        }
    },
    shopName: string,
    deviceName: string,
    employeeName: string,
    config?: ReceiptConfig,
    goldRate?: number,
    silverRate?: number,
    estimationNumber?: number,
    skipFooter: boolean = false,
    footerMessage?: string
) => {
    const width = 48;
    const divider = thermalCommands.divider(width);
    const line = thermalCommands.line(width);

    let payload = getThermalHeader(shopName, deviceName, config, goldRate, silverRate);

    let title = 'ESTIMATION SLIP';
    if (data.estimationItems.length === 0 && data.purchaseItems.length > 0) title = 'PURCHASE SLIP';
    else if (data.estimationItems.length === 0 && data.purchaseItems.length === 0) title = 'ADJUSTMENT SLIP';

    payload += line;
    payload += `${thermalCommands.center}${thermalCommands.boldOn}${title}${thermalCommands.boldOff}\x0a`;
    if (estimationNumber && data.estimationItems.length > 0) {
        payload += `${thermalCommands.center}${thermalCommands.smallOn}Est No: ${estimationNumber}${thermalCommands.smallOff}\x0a`;
    }
    payload += line;

    // Customer Info at Top
    payload += getThermalCustomer(data.customer, width, config);
    if (data.customer.name || data.customer.mobile || data.customer.address) payload += line;

    // 1. Estimation Items
    if (data.estimationItems.length > 0) {
        payload += `${padR('ITEM', 13)}${padR('PCS', 4)}${padR('G.WT', 7)}${padR('MC', 7)}${padR('VA', 6)}${padL('AMOUNT', 11)}\x0a`;
        payload += divider;

        data.estimationItems.forEach(item => {
            const weightStr = `${item.grossWeight.toFixed(3)}`;
            const mcStr = formatCurrency(item.makingChargeValue);
            const itemSubtotal = config?.showGST ? (item.totalValue - (item.gstValue || 0)) : item.totalValue;
            const amountStr = formatCurrency(itemSubtotal);

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
        });
        payload += divider;
        const totalGrossWt = data.estimationItems.reduce((sum, item) => sum + item.grossWeight, 0);
        const totalNetWt = data.estimationItems.reduce((sum, item) => sum + item.netWeight, 0);
        const totalStoneWt = data.estimationItems.reduce((sum, item) => sum + (item.stoneWeight || 0), 0);

        // Row 1: Gross WT & Stone
        const gWtStr = `Gross WT: ${totalGrossWt.toFixed(3)}g`;
        const sWtStr = totalStoneWt > 0 ? `Stone: ${totalStoneWt.toFixed(3)}g` : '';
        payload += padR(gWtStr, width - sWtStr.length) + sWtStr + '\x0a';

        // Row 2: Net WT & Total
        const nWtStr = `Net WT: ${totalNetWt.toFixed(3)}g`;
        payload += padR(nWtStr, width) + '\x0a';

        // Subtotal and GST
        const subtotal = config?.showGST ? (data.totals.estimationTotal - (data.totals.cgst * 2 || 0)) : data.totals.estimationTotal;
        payload += thermalRow('Items Subtotal', formatCurrency(subtotal), width);
        if (config?.showGST) {
            if (data.totals.cgst > 0) payload += thermalRow('CGST (1.5%)', formatCurrency(data.totals.cgst), width);
            if (data.totals.sgst > 0) payload += thermalRow('SGST (1.5%)', formatCurrency(data.totals.sgst), width);
        }

        const estWithTax = data.totals.estimationTotal;
        payload += `${thermalCommands.boldOn}${thermalRow('ESTIMATION TOTAL', formatCurrency(estWithTax), width)}${thermalCommands.boldOff}`;
        payload += line;
    }

    // 2. Purchase Items
    if (data.purchaseItems.length > 0) {
        payload += `${thermalCommands.center}${thermalCommands.boldOn}PURCHASE (OLD GOLD)${thermalCommands.boldOff}\x0a`;
        payload += `${padR('ITEM', 16)}${padR('N.WT', 10)}${padR('RATE', 8)}${padL('AMOUNT', 14)}\x0a`;
        payload += divider;

        data.purchaseItems.forEach(item => {
            const weightStr = `${item.netWeight.toFixed(3)}g`;
            const rateStr = `${item.rate}`;
            const amountStr = formatCurrency(item.amount);
            const itemName = item.category.toUpperCase().substring(0, 15);
            payload += `${padR(itemName, 16)}${padR(weightStr, 10)}${padR(rateStr, 8)}${padL(amountStr, 14)}\x0a`;

            if (item.lessWeightType === 'grams' && item.lessWeight > 0) {
                payload += `  Net WT: ${item.netWeight.toFixed(3)}g | Less: ${item.lessWeight}g\x0a\x0a`;
            } else {
                payload += `  Net WT: ${item.netWeight.toFixed(3)}g\x0a\x0a`;
            }
        });
        payload += divider;
        payload += thermalRow('Purchase Deduction', '-' + formatCurrency(data.totals.purchaseTotal), width);
        payload += '\x0a';
    }

    // 3. Adjustments (Chit/Advance)
    if (data.chitItems.length > 0 || data.advanceItems.length > 0) {
        payload += `${thermalCommands.center}${thermalCommands.boldOn}ADJUSTMENTS${thermalCommands.boldOff}\x0a`;
        data.chitItems.forEach(item => {
            payload += thermalRow(`Chit (${item.chitId})`, '-' + formatCurrency(item.amount), width);
        });
        data.advanceItems.forEach(item => {
            payload += thermalRow(`Advance (${item.advanceId})`, '-' + formatCurrency(item.amount), width);
        });
        payload += divider;
    }

    // 4. TAX & GRAND TOTAL
    payload += line;
    payload += `${thermalCommands.boldOn}${thermalRow('GRAND TOTAL', 'Rs. ' + formatCurrency(data.totals.grandTotal), width)}${thermalCommands.boldOff}`;
    payload += line;

    if (!skipFooter) {
        // Pass empty customer object to avoid duplication with the top section
        payload += getThermalFooter(employeeName, {}, width, config, footerMessage, true);
    }

    return payload;
};
