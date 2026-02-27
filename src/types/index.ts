export type WastageType = 'percentage' | 'weight';
export type MakingChargeType = 'perGram' | 'fixed' | 'percentage';

export interface Product {
  tagNumber?: string;
  name: string;
  subProductName?: string;
  pcs: number;
  grossWeight: number;
  stoneWeight: number;
  netWeight: number;
  purity: number; // e.g., 22, 24
  makingCharge: number;
  makingChargeType: MakingChargeType;
  wastage: number;
  wastageType: WastageType;
  category?: string;
  rate: number;
  metal?: 'GOLD' | 'SILVER';
  hsnCode?: string;
}

export interface EstimationItem extends Product {
  id: string;
  isManual: boolean;
  goldValue: number;
  makingChargeValue: number;
  wastageValue: number;
  gstValue: number;
  totalValue: number;
  metal: 'GOLD' | 'SILVER';
}

export type LessWeightType = 'grams' | 'percentage' | 'amount';

export interface PurchaseItem {
  id: string;
  category: string;
  subCategory?: string;
  purity: number;
  pcs: number;
  grossWeight: number;
  lessWeight: number;
  lessWeightType: LessWeightType;
  netWeight: number;
  rate: number;
  amount: number;
  metal: 'GOLD' | 'SILVER';
}

export interface ChitItem {
  id: string;
  chitId: string;
  amount: number;
}

export interface AdvanceItem {
  id: string;
  advanceId: string;
  amount: number;
}

export interface Customer {
  name: string;
  mobile: string;
  email?: string;
  address?: string;
}

export interface GoldRate {
  rate18k: number;
  rate20k: number;
  rate22k: number;
  rate24k: number;
  silver: number;
  date: string;
}

export interface MetalType {
  id: number;
  name: string;
  purity: number;
  metal: 'GOLD' | 'SILVER';
}

export interface EstimationTotals {
  totalWeight: number;
  totalGoldValue: number;
  totalMakingCharge: number;
  totalWastage: number;
  totalGST: number;
  totalChit: number;
  totalAdvance: number;
  totalPurchase: number;
  grandTotal: number;
}
