import { EstimationItem, PurchaseItem, ChitItem, AdvanceItem } from '../types';
import { ReceiptConfig } from '../store/GeneralSettingsContext';

type TFunction = (key: string, params?: Record<string, string>) => string;

export const getCommonStyles = (paperWidth: string = '58mm') => {
    let maxWidth = '380px';
    if (paperWidth === '58mm') maxWidth = '220px';
    if (paperWidth === '112mm') maxWidth = '450px';

    return `
    <style>
        body {
            font-family: 'Courier New', 'Courier', monospace;
            padding: 8px 4px;
            color: #000;
            max-width: ${maxWidth};
            margin: auto;
            font-size: 11px;
            line-height: 1.5;
        }
        .header {
            text-align: center;
            margin-bottom: 8px;
        }
        .shop-name {
            font-size: 18px;
            font-weight: bold;
            text-transform: uppercase;
            letter-spacing: 1.5px;
            margin-bottom: 2px;
        }
        .shop-info {
            font-size: 11px;
            color: #000;
            margin-bottom: 2px;
        }
        .rate-line {
            font-size: 11px;
            text-align: left;
            margin: 2px 0;
        }
        .dash-line {
            font-size: 11px;
            letter-spacing: -1px;
            margin: 4px 0;
            overflow: hidden;
            white-space: nowrap;
        }
        .double-line {
            font-size: 11px;
            letter-spacing: -1px;
            margin: 4px 0;
            overflow: hidden;
            white-space: nowrap;
        }
        .receipt-title {
            text-align: center;
            font-size: 15px;
            font-weight: bold;
            margin: 8px 0;
            padding: 4px 0;
            border-top: 1.5px solid #000;
            border-bottom: 1.5px solid #000;
            text-transform: uppercase;
        }
        .section-title {
            text-align: center;
            font-size: 13px;
            font-weight: bold;
            margin: 8px 0 4px 0;
            text-decoration: underline;
        }
        table {
            width: 100%;
            border-collapse: collapse;
            font-size: 11px;
            margin-bottom: 4px;
        }
        th {
            text-align: left;
            padding: 2px;
            font-weight: bold;
            font-size: 11px;
            border-bottom: 1px solid #000;
        }
        td {
            padding: 2px;
            vertical-align: top;
            font-size: 11px;
        }
        .text-right { text-align: right; }
        .row {
            display: flex;
            justify-content: space-between;
            margin-bottom: 2px;
            font-size: 11px;
        }
        .row-bold {
            display: flex;
            justify-content: space-between;
            margin-bottom: 2px;
            font-size: 12px;
            font-weight: bold;
        }
        .total-row {
            display: flex;
            justify-content: space-between;
            font-size: 14px;
            font-weight: bold;
            margin: 4px 0;
            padding: 4px 0;
            border-top: 1px solid #000;
        }
        .net-amt {
            text-align: center;
            font-size: 16px;
            font-weight: bold;
            margin: 10px 0;
            padding: 8px;
            border: 2px solid #000;
        }
        .footer {
            text-align: center;
            margin-top: 15px;
            font-size: 11px;
            font-weight: bold;
            color: #000;
            font-style: italic;
        }
        .employee-row {
            text-align: right;
            margin-top: 15px;
            font-size: 11px;
            font-weight: bold;
            padding-right: 5px;
        }
        .items-table {
            width: 100%;
            border-collapse: collapse;
            margin: 4px 0;
            font-size: 10.5px;
        }
        .items-table th {
            text-align: left;
            border-bottom: 1px solid #000;
            padding: 2px 0;
            font-weight: bold;
        }
        .items-table td {
            vertical-align: top;
            padding: 1px 0;
        }
        .col-details { width: 50%; }
        .col-qty { width: 25%; text-align: right; white-space: nowrap; }
        .col-amt { width: 25%; text-align: right; }
        .top-right-date {
            float: right;
            font-size: 10px;
            font-weight: normal;
        }
        .rate-block {
            display: block;
            margin-bottom: 2px;
            font-weight: bold;
        }
        .customer-block {
            font-size: 11px;
            margin: 8px 0;
            padding: 4px;
            border: 0.5px solid #000;
        }
        .market-rates {
            font-size: 11px;
            margin: 6px 0;
            border-top: 1px dashed #000;
            border-bottom: 1px dashed #000;
            padding: 4px 0;
        }
        @media print {
            body { padding: 0; }
        }
    </style>
`;
};

export const getShopHeaderHTML = (shopDetails: any, config?: ReceiptConfig) => {
    if (config && !config.showHeader) return '';

    return `
        <div class="header">
            <div class="shop-name">${shopDetails.name}</div>
            ${shopDetails.address ? `<div class="shop-info">${shopDetails.address}</div>` : ''}
            ${shopDetails.phone ? `<div class="shop-info">Tel: ${shopDetails.phone}</div>` : ''}
            ${(config?.showGST !== false && shopDetails.gstNumber) ? `<div class="shop-info">GSTIN: ${shopDetails.gstNumber}</div>` : ''}
        </div>
    `;
};

export const getMarketRatesHTML = (rates: { rate24k: string, rate22k: string, silver: string, date: string }, t: TFunction) => {
    return `
        <div class="market-rates">
            <div class="top-right-date">Date: ${rates.date}</div>
            <div class="rate-block">G: Rs.${parseFloat(rates.rate22k).toFixed(2)} | S: Rs.${parseFloat(rates.silver).toFixed(2)}/g</div>
        </div>
    `;
};

export const getCustomerInfoHTML = (customer: { name?: string, mobile?: string, address?: string }, t: TFunction, config?: ReceiptConfig) => {
    if (!customer.name && !customer.mobile && !customer.address) return '';
    const showName = config ? config.showCustomerName : true;
    const showMobile = config ? config.showCustomerMobile : true;
    const showAddress = config ? config.showCustomerAddress : true;

    return `
        <div class="customer-block">
            ${(customer.name && showName) ? `<div class="row"><span><b>Name:</b> ${customer.name.toUpperCase()}</span></div>` : ''}
            ${(customer.mobile && showMobile) ? `<div class="row"><span><b>Phone:</b> ${customer.mobile}</span></div>` : ''}
            ${(customer.address && showAddress) ? `<div class="row"><span><b>Place:</b> ${customer.address.toUpperCase()}</span></div>` : ''}
        </div>
    `;
};

export const getEmployeeFooterHTML = (employeeName: string, t: TFunction) => {
    if (!employeeName) return '';
    return `
        <div class="employee-row">
            ${t('employee_name')}: ${employeeName}
        </div>
    `;
};

export const getReceiptFooterHTML = (t: TFunction) => {
    return `
        <div class="footer">
            ${t('thank_you_visit_again') || 'THANK YOU VISIT AGAIN'}
        </div>
    `;
};

export const getEstimationItemsHTML = (items: EstimationItem[], config: ReceiptConfig | undefined, t: TFunction) => {
    return `
        <table class="items-table">
            <thead>
                <tr>
                    <th class="col-details">${t('item_header') || 'ITEM DETAILS'}</th>
                    <th class="col-qty">${t('quantity_header') || 'QTY/RATE'}</th>
                    <th class="col-amt">${t('amount_header') || 'AMOUNT'}</th>
                </tr>
            </thead>
            <tbody>
                ${items.map(item => {
        const vWeight = item.wastageType === 'percentage' ? (item.netWeight * item.wastage / 100) : item.wastage;
        const wLabel = item.wastageType === 'percentage' ? `${item.wastage}%` : `${item.wastage}g`;
        const mcLabel = item.makingChargeType === 'percentage' ? `${item.makingCharge}%` : (item.makingChargeType === 'perGram' ? `${item.makingCharge}/g` : `Rs.${item.makingCharge}`);

        return `
                        <tr>
                            <td class="col-details" style="font-weight:bold;">${item.name.toUpperCase()}</td>
                            <td class="col-qty">${item.pcs} Pcs</td>
                            <td class="col-amt" style="font-weight:bold;">Rs. ${item.totalValue.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                        </tr>
                        ${item.tagNumber ? `<tr><td class="col-details" style="font-size:9px;">TAG: ${item.tagNumber}</td><td></td><td></td></tr>` : ''}
                        <tr>
                            <td class="col-details">  GROSS WT</td>
                            <td class="col-qty">${item.grossWeight.toFixed(3)}g</td>
                            <td class="col-amt"></td>
                        </tr>
                        ${item.stoneWeight > 0 ? `
                        <tr>
                            <td class="col-details">  STONE WT</td>
                            <td class="col-qty">${item.stoneWeight.toFixed(3)}g</td>
                            <td class="col-amt"></td>
                        </tr>` : ''}
                        <tr>
                            <td class="col-details">  NET WT</td>
                            <td class="col-qty">${item.netWeight.toFixed(3)}g</td>
                            <td class="col-amt"></td>
                        </tr>
                        <tr>
                            <td class="col-details">  GOLD RATE</td>
                            <td class="col-qty">@Rs.${item.rate}</td>
                            <td class="col-amt"></td>
                        </tr>
                        <tr>
                            <td class="col-details">  VA (${wLabel})</td>
                            <td class="col-qty">${vWeight.toFixed(3)}g</td>
                            <td class="col-amt"></td>
                        </tr>
                        <tr>
                            <td class="col-details">  MAKING CHARGE</td>
                            <td class="col-qty">${mcLabel}</td>
                            <td class="col-amt"></td>
                        </tr>
                        <tr><td colspan="3" style="border-bottom: 0.5px dashed #ccc; padding: 2px 0;"></td></tr>
                    `;
    }).join('')}
            </tbody>
        </table>
    `;
};

export const getPurchaseItemsHTML = (purchaseItems: PurchaseItem[], totalPurchaseAmount: number, t: TFunction) => {
    const DASH = '--------------------------------------';
    const DOUBLE_DASH = '======================================';
    return `
        <div class="double-line">${DOUBLE_DASH}</div>
        <div class="section-title">${t('pur_quotation_title')}</div>
        <table>
            <thead>
                <tr>
                    <th style="text-align: left;">ITEMS</th>
                    <th style="text-align: right;">Amount</th>
                </tr>
            </thead>
            <tbody>
                ${purchaseItems.map(p => {
        return `
                                <tr>
                                    <td style="font-weight:bold;">${p.category.toUpperCase()}</td>
                                    <td class="text-right"></td>
                                </tr>
                                <tr style="font-size:10px; color: #333;">
                                    <td>${p.netWeight.toFixed(3)}g <br>
                                    Less:${p.lessWeightType === 'percentage' ? `${p.lessWeight}% (${(p.grossWeight - p.netWeight).toFixed(3)}g)` : p.lessWeightType === 'amount' ? `Rs.${p.lessWeight}` : `${p.lessWeight}g`}</td>
                                    <td class="text-right"></td>
                                </tr>
                                <tr>
                                    <td colspan="2" style="border-top: 0.5px dashed #ccc;">Rs. ${p.amount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                                </tr>
                            `;
    }).join('')}
            </tbody>
        </table>
        <div class="dash-line">${DASH}</div>
        <div class="row-bold">
            <span>${t('purchase_total')}</span>
            <span>Rs. ${totalPurchaseAmount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
        </div>
    `;
};

export const getChitItemsHTML = (chitItems: ChitItem[], t: TFunction) => {
    const DOUBLE_DASH = '======================================';
    return `
        <div class="double-line">${DOUBLE_DASH}</div>
        <div class="section-title">${t('chit_scheme_title')}</div>
        ${chitItems.map(item => `
            <div class="row">
                <span>Chit (${item.chitId})</span>
                <span>Rs. ${item.amount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
            </div>
        `).join('')}
    `;
};

export const getAdvanceItemsHTML = (advanceItems: AdvanceItem[], t: TFunction) => {
    const DOUBLE_DASH = '======================================';
    return `
        <div class="double-line">${DOUBLE_DASH}</div>
        <div class="section-title">${t('advance_adjustment_title')}</div>
        ${advanceItems.map(item => `
            <div class="row">
                <span>Advance (${item.advanceId})</span>
                <span>Rs. ${item.amount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
            </div>
        `).join('')}
    `;
};
