import { EstimationItem, EstimationTotals, WastageType, MakingChargeType, PurchaseItem, LessWeightType, ChitItem, AdvanceItem } from '../types';

export const calculateNetWeight = (gross: number, loss: number, type: LessWeightType = 'grams'): number => {
    if (type === 'percentage') {
        return gross - (gross * loss) / 100;
    }
    return Math.max(0, gross - loss);
};

export const calculateGoldValue = (weight: number, rate: number): number => {
    return weight * rate;
};

export const calculateMakingCharge = (
    weight: number,
    goldValue: number,
    charge: number,
    type: MakingChargeType
): number => {
    if (type === 'perGram') {
        return weight * charge;
    }
    if (type === 'percentage') {
        return (goldValue * charge) / 100;
    }
    return charge; // fixed
};

export const calculateWastageValue = (
    goldValue: number,
    wastage: number,
    type: WastageType,
    rate: number
): number => {
    if (type === 'percentage') {
        return (goldValue * wastage) / 100;
    }
    return wastage * rate; // wastage weight * rate
};

export const calculateGST = (totalBeforeTax: number, gstPercentage: number = 3): number => {
    return (totalBeforeTax * gstPercentage) / 100;
};

export const calculateItemTotal = (
    netWeight: number,
    rate: number,
    mc: number,
    mcType: MakingChargeType,
    wastage: number,
    wastageType: WastageType,
    gstPercentage: number = 3
): {
    goldValue: number;
    makingChargeValue: number;
    wastageValue: number;
    gstValue: number;
    total: number;
} => {
    const goldValue = calculateGoldValue(netWeight, rate);
    const makingChargeValue = calculateMakingCharge(netWeight, goldValue, mc, mcType);
    const wastageValue = calculateWastageValue(goldValue, wastage, wastageType, rate);
    const subTotal = goldValue + makingChargeValue + wastageValue;
    const gstValue = calculateGST(subTotal, gstPercentage);
    const total = subTotal + gstValue;

    return {
        goldValue,
        makingChargeValue,
        wastageValue,
        gstValue,
        total,
    };
};

export const calculateEstimationTotals = (
    items: EstimationItem[],
    purchaseItems: PurchaseItem[] = [],
    chitItems: ChitItem[] = [],
    advanceItems: AdvanceItem[] = []
): EstimationTotals => {
    const itemsTotals = items.reduce(
        (acc, item) => {
            acc.totalWeight += item.grossWeight;
            acc.totalGoldValue += item.goldValue;
            acc.totalMakingCharge += item.makingChargeValue;
            acc.totalWastage += item.wastageValue;
            acc.totalGST += item.gstValue;
            acc.grandTotal += item.totalValue;
            return acc;
        },
        {
            totalWeight: 0,
            totalGoldValue: 0,
            totalMakingCharge: 0,
            totalWastage: 0,
            totalGST: 0,
            grandTotal: 0,
        }
    );

    const totalPurchase = purchaseItems.reduce((sum, item) => sum + item.amount, 0);
    const totalChit = chitItems.reduce((sum, item) => sum + item.amount, 0);
    const totalAdvance = advanceItems.reduce((sum, item) => sum + item.amount, 0);

    return {
        ...itemsTotals,
        totalChit,
        totalAdvance,
        totalPurchase,
        grandTotal: Math.max(0, itemsTotals.grandTotal - totalPurchase - totalChit - totalAdvance),
    };
};

