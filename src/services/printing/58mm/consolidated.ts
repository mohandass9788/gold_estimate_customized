import { thermalCommands, padR, padL, thermalRow, formatCurrency, chunkString } from '../helpers/thermalHelpers';
import { EstimationItem, PurchaseItem, ChitItem, AdvanceItem } from '../../../types';
import { ReceiptConfig } from '../../../store/GeneralSettingsContext';
import { getThermalHeader, getThermalCustomer, getThermalFooter } from '../helpers/baseTemplates';

/**
 * Consolidated 58mm Template (32 characters)
 * Focus: Stacked and compact for small paper.
 */
export const getConsolidated58mmPayload = (
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
    footerMessage?: string,
    summaryOnly: boolean = false
) => {
    const width = 32;
    const divider = thermalCommands.divider(width);

    let payload = getThermalHeader(shopName, deviceName, config, goldRate, silverRate);

    let title = 'ESTIMATION SLIP';
    if (data.estimationItems.length === 0 && data.purchaseItems.length > 0) title = 'PURCHASE SLIP';
    else if (data.estimationItems.length === 0 && data.purchaseItems.length === 0) title = 'ADJUSTMENT SLIP';

    payload += divider;
    payload += `${thermalCommands.center}${thermalCommands.boldOn}${title}${thermalCommands.boldOff}\x0a`;
    if (estimationNumber && data.estimationItems.length > 0) {
        payload += `${thermalCommands.center}${thermalCommands.smallOn}Est No: ${estimationNumber}${thermalCommands.smallOff}\x0a`;
    }
    payload += divider;

    // Customer Info at Top
    payload += getThermalCustomer(data.customer, width, config);
    if (data.customer.name || data.customer.mobile || data.customer.address) payload += divider;

    // 1. Estimation Items (Skip if summaryOnly)
    if (data.estimationItems.length > 0 && !summaryOnly) {
        data.estimationItems.forEach(item => {
            payload += thermalCommands.smallOn;
            const weightStr = `${item.grossWeight.toFixed(3)}`;
            const mcStr = formatCurrency(item.makingChargeValue);
            const itemSubtotal = config?.showGST ? (item.totalValue - (item.gstValue || 0)) : item.totalValue;
            const amountStr = formatCurrency(itemSubtotal);

            const nameChunks = chunkString(item.name.toUpperCase(), 16);
            const itemNamePrimary = nameChunks[0];

            const pcsStr = item.pcs.toString();
            const vWeight = item.wastageType === 'percentage' ? (item.netWeight * item.wastage / 100) : item.wastage;
            const vaStr = vWeight.toFixed(3);

            // First Line: Name + Amount
            payload += `${thermalCommands.boldOn}${padR(itemNamePrimary, 16)}${padL(amountStr, 16)}${thermalCommands.boldOff}\n`;
            for (let i = 1; i < nameChunks.length; i++) {
                payload += `${thermalCommands.boldOn}${nameChunks[i]}${thermalCommands.boldOff}\n`;
            }
            // Second Line: Specs
            payload += `  P:${pcsStr} GW:${weightStr} MC:${mcStr} VA:${vaStr}\n`;

            if (item.stoneWeight > 0) {
                payload += `  Stone: ${item.stoneWeight.toFixed(3)}g\x0a`;
            }
            payload += thermalCommands.smallOff;
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

        // Items Subtotal Section
        const subtotal = config?.showGST ? (data.totals.estimationTotal - (data.totals.cgst * 2 || 0)) : data.totals.estimationTotal;
        payload += thermalRow('Items Value', formatCurrency(subtotal), width);
        if (config?.showGST) {
            if (data.totals.cgst > 0) payload += thermalRow('CGST (1.5%)', formatCurrency(data.totals.cgst), width);
            if (data.totals.sgst > 0) payload += thermalRow('SGST (1.5%)', formatCurrency(data.totals.sgst), width);
        }

        const estWithTax = data.totals.estimationTotal;
        payload += `${thermalCommands.boldOn}${thermalRow('EST. TOTAL', formatCurrency(estWithTax), width)}${thermalCommands.boldOff}`;
        payload += divider;
    }

    // 2. Purchase Items (Skip if summaryOnly)
    if (data.purchaseItems.length > 0 && !summaryOnly) {
        payload += `${thermalCommands.center}${thermalCommands.boldOn}PURCHASE (OLD GOLD)${thermalCommands.boldOff}\x0a`;
        payload += divider;
        payload += thermalCommands.smallOn;
        payload += `${padR('ITEM', 12)}${padR('G.WT', 9)}${padR('RATE', 9)}${padL('AMOUNT', 12)}\x0a`;
        payload += divider;

        data.purchaseItems.forEach(item => {
            const weightStr = `${item.grossWeight.toFixed(3)}g`;
            const rateStr = `${item.rate}`;
            const amountStr = formatCurrency(item.amount);
            const itemName = item.category.toUpperCase().substring(0, 11);

            payload += `${thermalCommands.boldOn}${padR(itemName, 12)}${thermalCommands.boldOff}${padR(weightStr, 9)}${padR(rateStr, 9)}${padL(amountStr, 12)}\n`;
        });
        payload += thermalCommands.smallOff;
        payload += divider;

        payload += thermalRow('Purchase Total', '-' + formatCurrency(data.totals.purchaseTotal), width);
        payload += divider;
    }

    // 3. Adjustments (Chit/Advance)
    if (data.chitItems.length > 0 || data.advanceItems.length > 0) {
        payload += `${thermalCommands.center}${thermalCommands.boldOn}ADJUSTMENTS${thermalCommands.boldOff}\x0a`;
        payload += divider;
        data.chitItems.forEach(item => {
            payload += thermalRow(`Chit (${item.chitId})`, '-' + formatCurrency(item.amount), width);
        });
        data.advanceItems.forEach(item => {
            payload += thermalRow(`Adv (${item.advanceId})`, '-' + formatCurrency(item.amount), width);
        });
        payload += divider;
    }

    // 4. Grand Total
    payload += `${thermalCommands.boldOn}${thermalRow('GRAND TOTAL', 'Rs. ' + formatCurrency(data.totals.grandTotal), width)}${thermalCommands.boldOff}`;
    payload += divider;

    if (!skipFooter) {
        // Pass empty customer object to avoid duplication with the top section
        payload += getThermalFooter(employeeName, {}, width, config, footerMessage, true);
    }
    return payload;
};
