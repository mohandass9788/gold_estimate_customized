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
    let payload = '';

    // ==================== HEADER SECTION ====================
    payload += getThermalHeader(shopName, deviceName, config, goldRate, silverRate);
    payload += divider;

    // ==================== TITLE SECTION ====================
    let title = 'ESTIMATION SLIP';
    if (data.estimationItems.length === 0 && data.purchaseItems.length > 0) {
        title = 'PURCHASE SLIP';
    } else if (data.estimationItems.length === 0 && data.purchaseItems.length === 0) {
        title = 'ADJUSTMENT SLIP';
    }

    payload += `${thermalCommands.center}${thermalCommands.boldOn}${title}${thermalCommands.boldOff}\x0a`;

    if (estimationNumber && data.estimationItems.length > 0) {
        payload += `${thermalCommands.center}Est No: ${estimationNumber}\x0a`;
    }
    payload += divider;

    // ==================== CUSTOMER SECTION ====================
    payload += getThermalCustomer(data.customer, width, config);
    if (data.customer.name || data.customer.mobile || data.customer.address) {
        payload += divider;
    }

    // ==================== ESTIMATION ITEMS ====================
    if (data.estimationItems.length > 0 && !summaryOnly) {
        payload += `${thermalCommands.boldOn}${thermalCommands.center}JEWELLERY ITEMS${thermalCommands.boldOff}\x0a`;
        payload += divider;

        data.estimationItems.forEach((item, index) => {
            payload += thermalCommands.smallOn;

            // Item name with bold formatting
            const nameChunks = chunkString(item.name.toUpperCase(), 16);
            const itemSubtotal = config?.showGST
                ? (item.totalValue - (item.gstValue || 0))
                : item.totalValue;
            const amountStr = formatCurrency(itemSubtotal);

            // First line: Item name and amount
            payload += `${thermalCommands.boldOn}${padR(nameChunks[0], 16)}${padL(amountStr, 16)}${thermalCommands.boldOff}\n`;

            // Additional name lines if any
            for (let i = 1; i < nameChunks.length; i++) {
                payload += `${thermalCommands.boldOn}${nameChunks[i]}${thermalCommands.boldOff}\n`;
            }

            // Specifications line
            const weightStr = `${item.grossWeight.toFixed(3)}g`;
            const mcStr = formatCurrency(item.makingChargeValue);
            const vWeight = item.wastageType === 'percentage'
                ? (item.netWeight * item.wastage / 100)
                : item.wastage;
            const vaStr = vWeight.toFixed(3);

            payload += `  Pcs:${item.pcs}  WT:${weightStr}  MC:${mcStr}\n`;
            payload += `  VA:${vaStr}g`;

            if (item.stoneWeight > 0) {
                payload += `  Stone:${item.stoneWeight.toFixed(3)}g`;
            }
            payload += `\n`;

            if (index < data.estimationItems.length - 1) {
                payload += `\x0a`; // Add spacing between items
            }

            payload += thermalCommands.smallOff;
        });

        payload += divider;

        // Item totals summary
        const totalGrossWt = data.estimationItems.reduce((sum, item) => sum + item.grossWeight, 0);
        const totalNetWt = data.estimationItems.reduce((sum, item) => sum + item.netWeight, 0);
        const totalStoneWt = data.estimationItems.reduce((sum, item) => sum + (item.stoneWeight || 0), 0);

        // Weight summary line
        let weightSummary = `Gross:${totalGrossWt.toFixed(3)}g  Net:${totalNetWt.toFixed(3)}g`;
        if (totalStoneWt > 0) {
            weightSummary += `  Stone:${totalStoneWt.toFixed(3)}g`;
        }
        payload += `${thermalCommands.smallOn}${weightSummary}\x0a${thermalCommands.smallOff}`;
        payload += divider;

        // Financial summary
        const subtotal = config?.showGST
            ? (data.totals.estimationTotal - (data.totals.cgst + data.totals.sgst + data.totals.igst))
            : data.totals.estimationTotal;

        payload += thermalRow('Items Subtotal', formatCurrency(subtotal), width);

        if (config?.showGST) {
            if (data.totals.cgst > 0) {
                payload += thermalRow('CGST (1.5%)', formatCurrency(data.totals.cgst), width);
            }
            if (data.totals.sgst > 0) {
                payload += thermalRow('SGST (1.5%)', formatCurrency(data.totals.sgst), width);
            }
            if (data.totals.igst > 0) {
                payload += thermalRow('IGST (3%)', formatCurrency(data.totals.igst), width);
            }
        }

        payload += `${thermalCommands.boldOn}${thermalRow('ESTIMATION TOTAL', formatCurrency(data.totals.estimationTotal), width)}${thermalCommands.boldOff}`;
        payload += divider;
    }

    // ==================== PURCHASE ITEMS ====================
    if (data.purchaseItems.length > 0 && !summaryOnly) {
        payload += `${thermalCommands.boldOn}${thermalCommands.center}OLD GOLD PURCHASE${thermalCommands.boldOff}\x0a`;
        payload += divider;

        payload += thermalCommands.smallOn;
        payload += `${padR('ITEM', 10)}${padR('WT', 7)}${padR('RATE', 7)}${padL('AMOUNT', 8)}\x0a`;
        payload += divider;

        data.purchaseItems.forEach(item => {
            const itemName = item.category.toUpperCase().substring(0, 10);
            const weightStr = `${item.grossWeight.toFixed(2)}`;
            const rateStr = `${item.rate}`;
            const amountStr = formatCurrency(item.amount);

            // 10 (Name) + 7 (Weight) + 7 (Rate) + 8 (Amount) = 32
            payload += `${padR(itemName, 10)}${padR(weightStr, 7)}${padR(rateStr, 7)}${padL(amountStr, 8)}\n`;
        });

        payload += thermalCommands.smallOff;
        payload += divider;
        payload += thermalRow('PURCHASE TOTAL', `-${formatCurrency(data.totals.purchaseTotal)}`, width);
        payload += divider;
    }

    // ==================== ADJUSTMENTS ====================
    if (data.chitItems.length > 0 || data.advanceItems.length > 0) {
        payload += `${thermalCommands.boldOn}${thermalCommands.center}ADJUSTMENTS${thermalCommands.boldOff}\x0a`;
        payload += divider;

        data.chitItems.forEach(item => {
            payload += thermalRow(`Chit ${item.chitId}`, `-${formatCurrency(item.amount)}`, width);
        });

        data.advanceItems.forEach(item => {
            payload += thermalRow(`Advance ${item.advanceId}`, `-${formatCurrency(item.amount)}`, width);
        });

        payload += divider;
    }

    // ==================== GRAND TOTAL ====================
    const totalPayable = data.totals.estimationTotal - data.totals.purchaseTotal - data.totals.chitTotal - data.totals.advanceTotal;

    payload += `${thermalCommands.boldOn}${thermalCommands.doubleOn}`;
    payload += thermalRow('GRAND TOTAL', `Rs. ${formatCurrency(totalPayable)}`, width);
    payload += `${thermalCommands.doubleOff}${thermalCommands.boldOff}`;
    payload += divider;

    // ==================== FOOTER SECTION ====================
    if (!skipFooter) {
        payload += getThermalFooter(employeeName, {}, width, config, footerMessage, true);
    }

    return payload;
};