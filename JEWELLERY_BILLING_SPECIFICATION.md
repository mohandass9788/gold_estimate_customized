# 💎 JEWELLERY BILLING VERTICAL - BUSINESS LOGIC & TECHNICAL SPECIFICATION
> **Target Project:** Angular Multi-Business Billing SaaS Platform (`src/app/features/billing`)  
> **Source Project:** Antigravity Mobile Jewellery Estimation & Billing App  
> **Purpose:** Detailed implementation guide for the AI Agent building the Angular Jewellery Billing Module.  
> **Note:** Chit Savings Scheme is intentionally **EXCLUDED** as per instructions.

---

## 📑 TABLE OF CONTENTS
1. [Core Domain Overview & Workflow](#1-core-domain-overview--workflow)
2. [Market Rates Engine (Gold & Silver Daily Rates)](#2-market-rates-engine-gold--silver-daily-rates)
3. [Category & Product Hierarchy (Master Data)](#3-category--product-hierarchy-master-data)
4. [QR Code & Barcode Scanner Integration](#4-qr-code--barcode-scanner-integration)
5. [New Jewellery Calculation Engine (Formulas & BIS Standards)](#5-new-jewellery-calculation-engine-formulas--bis-standards)
6. [Old Gold Purchase & Exchange Workflow](#6-old-gold-purchase--exchange-workflow)
7. [Repair Gold Management Lifecycle](#7-repair-gold-management-lifecycle)
8. [Cart Totals, Order Finalization & Receipts](#8-cart-totals-order-finalization--receipts)
9. [TypeScript Models & Angular Architecture Recommendations](#9-typescript-models--angular-architecture-recommendations)

---

## 1. CORE DOMAIN OVERVIEW & WORKFLOW

The Jewellery Billing Vertical consists of 3 synchronized workflows:
1. **Sales / Estimation:** Adding hallmarked/retail jewellery items via barcode tag scan or manual entry, calculating real-time values (Gold Value + Wastage/VA + Making Charges + 3% GST).
2. **Old Gold Purchase / Exchange:** Accepting scrap or old ornaments from customers, deducting stone/impurity loss (via grams, percentage, or amount), and crediting the value against the purchase bill.
3. **Repair Gold Management:** Taking customer ornaments for service (soldering, polishing, resizing, stone fixing), capturing advance payments, generating `REP-` tracking QR codes, and processing delivery with optional extra material charges.

```
       +-------------------------------------------------------+
       |           LIVE DAILY RATES (24K, 22K, 18K, Silver)    |
       +---------------------------+---------------------------+
                                   |
            +----------------------+----------------------+
            |                                             |
            v                                             v
+-----------------------+                     +-----------------------+
|  TAG / BARCODE SCAN   |                     |  MANUAL ITEM ENTRY    |
| (API or REP- Repair)  |                     | (Category & Defaults) |
+-----------+-----------+                     +-----------+-----------+
            |                                             |
            +----------------------+----------------------+
                                   |
                                   v
             +-------------------------------------------+
             |         ESTIMATION / BILLING CART         |
             |  - Items: Gold Value + VA + MC + 3% GST   |
             |  - Old Gold Deduction (Grams / % / Flat)  |
             |  - Advance Payments                       |
             |  = NET PAYABLE GRAND TOTAL                |
             +---------------------+---------------------+
                                   |
                                   v
             +-------------------------------------------+
             |   ORDER GENERATION & THERMAL RECEIPT      |
             |   (ORD-YYYYMM-XXXX, Daily Est No, 58/80mm)|
             +-------------------------------------------+
```

---

## 2. MARKET RATES ENGINE (GOLD & SILVER DAILY RATES)

### 2.1 Daily Rate Fields
The store maintains daily market rates per gram:
- `rate24k` (Pure Gold 99.9%)
- `rate22k` (Standard 916 Hallmarked Gold - Primary reference rate)
- `rate20k` (83.3% Gold)
- `rate18k` (75.0% Gold)
- `silver` (1 gram pure silver)
- `lastUpdatedDate` (Timestamp)

### 2.2 Smart 22K Auto-Calculation Formula
When the jeweller inputs the **22K rate per gram**, the system automatically derives all other gold purities based on standard hallmarking purity ratios:
```typescript
const entered22k = parseFloat(rate22k);

// 1. Calculate 100% Base Rate (24K Pure)
const baseRate24k = entered22k / 0.916;

// 2. Derive other karat rates
const rate24k = Math.round(baseRate24k);
const rate20k = Math.round(baseRate24k * 0.833);
const rate18k = Math.round(baseRate24k * 0.750);
```

### 2.3 Rate Resolution for Items
When an item is processed:
- If `metal === 'SILVER'`, use `silver` rate.
- If `metal === 'GOLD'`:
  - `purity === 24` -> `rate24k`
  - `purity === 22` -> `rate22k`
  - `purity === 20` -> `rate20k`
  - `purity === 18` -> `rate18k`
  - Custom purity: `Math.round(baseRate24k * (purity / 24))`

---

## 3. CATEGORY & PRODUCT HIERARCHY (MASTER DATA)

### 3.1 Two-Tier Structure: Product (Category) -> Sub-Product (Design)
In jewellery trade:
- **Product (Category):** Bangle, Chain, Ring, Earring, Necklace, Coin, Anklet, Bracelet.
- **Sub-Product (Sub-Category / Design):** Plain, Casting, Fancy, Diamond Look, Machine Made, Stud, Antique, Nakas.

### 3.2 Category-Level Default Properties
Each Product Category stores default manufacturing and pricing parameters:
- `metal`: `'GOLD' | 'SILVER'`
- `defaultPurity`: Default karat (typically `22`)
- `defaultWastage`: Default VA / Wastage value (e.g. `8.0` or `12.0`)
- `defaultWastageType`: `'percentage'` (VA %) or `'weight'` (grams per piece)
- `defaultMakingCharge`: Default MC (e.g. `450` or `12`)
- `defaultMakingChargeType`: `'perGram'` (₹/gram) | `'fixed'` (₹ flat) | `'percentage'` (% of gold value)
- `hsnCode`: Harmonized System of Nomenclature (e.g. `7113` for Gold Articles, `7114` for Silverware)

### 3.3 Dynamic Form Auto-Fill Behavior
When the billing clerk selects a Category (e.g., "Ring"):
1. The **Sub-Product** dropdown is immediately filtered for that category's designs.
2. The form's `purity`, `wastage`, `wastageType`, `makingCharge`, `makingChargeType`, and `metal` are pre-filled with the category's defaults.
3. The live rate per gram is auto-filled based on the category's metal and default purity.
4. The clerk only needs to enter **Gross Weight** (and optional stone weight if studded).

---

## 4. QR CODE & BARCODE SCANNER INTEGRATION

The scanner supports physical USB/Bluetooth handheld barcode guns, camera scanning, and direct manual barcode entry.

### 4.1 Dual-Routing Scanner Logic
When a barcode string is scanned:
1. **Check for Repair Job Prefix:**
   - If the code starts with `REP-` (e.g. `REP-202610-0005`):
   - It is an existing **Repair Job QR Code**.
   - Directly navigate to / open the **Repair Delivery Modal** for that ID.
2. **Product Tag Lookup:**
   - If it does not start with `REP-`, query the tag catalog endpoint `/api/product/scan-tag` with payload `{ itemtag: tagString }`.

### 4.2 API Tag Payload Mapping
The tag API returns the item's specifications:
| Backend API Key | Internal Property | Description / Parsing Logic |
|---|---|---|
| `ITEMTAG` | `tagNumber` | Tag ID / Barcode string |
| `PRODUCTNAME` | `name` / `category` | Product Name (e.g., "Ladies Ring 22k") |
| `SUBPRODUCTNAME` | `subProductName` | Design Type (e.g., "Casting") |
| `NOOFPIECES` | `pcs` | Integer (default 1) |
| `GRSWEIGHT` | `grossWeight` | Float (grams to 3 decimals, e.g. 5.450) |
| `LESSWT` | `stoneWeight` | Float (stones, enamel, dust in grams) |
| `NETWEIGHT` | `netWeight` | Float (`grossWeight - stoneWeight`) |
| `MAXMCAMOUNT` | `makingCharge` | If > 0, set type `'fixed'` |
| `MAXMCGR` | `makingCharge` | If > 0 and no fixed MC, set type `'perGram'` |
| `MAXWASTAGEPER` | `wastage` | Wastage / VA % (type `'percentage'`) |
| `METNAME` | `metal` | If "SILVER", metal is `'SILVER'`, else `'GOLD'` |
| `RATE` | `rate` | Tag-fixed rate, or fallback to live rate for purity |

### 4.3 Duplicate Tag Prevention
- Before adding a scanned tag to the cart, verify:
  `cartItems.some(item => item.tagNumber === scannedTag.tagNumber)`
- If found: Display alert: *"Item with Tag [ID] is already added to this bill."*

### 4.4 Batch / Multi-Tag Scan Mode
- Jewellers frequently scan 5-10 items consecutively.
- Use a 2-second debounce between identical barcode readings.
- Display each scanned tag in a temporary batch list with a checkmark.
- On clicking "Add All to Bill", bulk calculate and insert into the cart.

---

## 5. NEW JEWELLERY CALCULATION ENGINE (FORMULAS & BIS STANDARDS)

### 5.1 Weight Calculations
- **Gross Weight ($W_G$):** Total physical weight on scale (e.g., `10.250` g).
- **Stone / Less Weight ($W_S$):** Weight of CZ stones, pearls, beads, enamel, or wax.
- **Net Weight ($W_N$):**
  $$W_N = \max(0, W_G - W_S)$$

### 5.2 Gold Value ($V_{Gold}$)
- Based on current rate per gram ($R$) for the specific purity:
  $$V_{Gold} = W_N \times R$$

### 5.3 Wastage / Value Addition ($V_{VA}$)
Wastage (Sedharam / Kadam) accounts for gold lost in melting, filing, and finishing:
- **If Type is Percentage (`'percentage'`):**
  $$V_{VA} = \frac{V_{Gold} \times \text{Wastage}\%}{100}$$
- **If Type is Weight (`'weight'` in grams):**
  $$V_{VA} = \text{Wastage Weight} \times R$$

### 5.4 Making Charges ($V_{MC}$)
Labour cost for crafting the ornament:
- **If Type is Per Gram (`'perGram'`):**
  $$V_{MC} = W_N \times \text{ChargePerGram}$$
- **If Type is Fixed (`'fixed'`):**
  $$V_{MC} = \text{ChargeAmount}$$
- **If Type is Percentage (`'percentage'`):**
  $$V_{MC} = \frac{V_{Gold} \times \text{Charge}\%}{100}$$

### 5.5 Item Subtotal & GST ($V_{GST}$, $V_{Total}$)
- **Taxable Subtotal ($V_{Sub}$):**
  $$V_{Sub} = V_{Gold} + V_{VA} + V_{MC}$$
- **GST (Standard 3% in India: 1.5% CGST + 1.5% SGST):**
  $$V_{GST} = \frac{V_{Sub} \times 3}{100}$$
- **Total Item Price ($V_{Total}$):**
  $$V_{Total} = V_{Sub} + V_{GST}$$

---

## 6. OLD GOLD PURCHASE & EXCHANGE WORKFLOW

Customers trade old gold or silver towards the purchase of new jewellery. This reduces the final payable amount.

### 6.1 Purchase Categories
Master categories:
- `Old Gold` (Metal: `GOLD`, default purity 22K or 18K)
- `Old Silver` (Metal: `SILVER`, default purity 92.5 or 100)
- `Exchange (Gold)`
- `Exchange (Silver)`

### 6.2 Three Modes of Deduction (`LessWeightType`)
Old jewellery contains dirt, solder, copper joints, or stones. The system handles 3 deduction models:

1. **Grams Deduction (`'grams'`):**
   - Customer brings 10.000g, 0.500g solder/stone deducted:
     $$\text{Net Weight} = \max(0, \text{Gross Weight} - \text{Less Weight})$$
     $$\text{Amount} = \text{round}(\text{Net Weight} \times \text{Purchase Rate})$$

2. **Percentage Melting Loss (`'percentage'`):**
   - E.g., 5% melting loss deducted on 10.000g:
     $$\text{Net Weight} = \text{Gross Weight} - \frac{\text{Gross Weight} \times \text{Less}\%}{100}$$
     $$\text{Amount} = \text{round}(\text{Net Weight} \times \text{Purchase Rate})$$

3. **Flat Cash Deduction (`'amount'`):**
   - Weight is not reduced, but a flat rupee deduction is made (e.g. ₹500 stone charge):
     $$\text{Base Amount} = \text{Gross Weight} \times \text{Purchase Rate}$$
     $$\text{Amount} = \max(0, \text{Base Amount} - \text{Less Amount})$$

### 6.3 Impact on Cart Total
All accepted old gold items are summed:
$$\text{Total Old Gold Purchase} = \sum \text{PurchaseItem.amount}$$
This acts as a negative line item on the bill before final customer settlement.

---

## 7. REPAIR GOLD MANAGEMENT LIFECYCLE

The Repair Module tracks custom repairs (customer ornaments) and in-house rework (company ornaments).

### 7.1 Repair Job Creation (`RepairEntry`)
- **Repair Number:** Auto-generated sequence with year and month:  
  `REP-YYYYMM-XXXX` (e.g., `REP-202610-0001`).
- **Nature of Repair:** Soldering, Polishing, Resizing, Stone Fixing, Cleaning, Custom.
- **Weights:** Gross Weight, Stone Weight, Net Weight ($W_G - W_S$).
- **Dates:** Booking Date, Due Days (e.g., 7 days), and auto-calculated Due Date (`BookingDate + DueDays`).
- **Customer Association:** Customer Name, 10-digit mobile auto-lookup, and address.
- **Photos:** Array of base64/image URLs to record item condition upon receiving.
- **Financials:**
  - `amount`: Base repair service fee.
  - `gstType`: `'none' | 'amount' | 'percentage'`.
  - `gstAmount`: Calculated GST.
  - `totalWithGst = amount + gstAmount`.
  - `advance`: Advance deposit received from customer.
  - `balance = totalWithGst - advance`.
- **Status:** Initialized to `'PENDING'`.

### 7.2 Thermal Job Slip / QR Receipt
On saving a repair, generate a 2-inch/3-inch thermal slip with:
- Store Header, Customer Info, Repair Number.
- **QR Code containing string `REP-YYYYMM-XXXX`** so that upon delivery, the slip can simply be scanned with a barcode reader.
- Item description, nature of repair, weights, advance paid, and balance due.

### 7.3 Repair Delivery Flow (`RepairDeliveryModal`)
When the customer returns:
1. Scan the slip QR code or search by Repair Number.
2. Form displays: Repair details, original balance due.
3. **Extra Amount Input (`extraAmount`):**
   - Used when additional gold, silver, or parts were consumed during repair (e.g., added 0.5g gold wire = ₹3,500).
4. **Final Payable at Delivery:**
   $$\text{Final Balance to Collect} = \text{Original Balance} + \text{extraAmount} + \text{newGst}$$
5. On clicking **Deliver & Print**:
   - Update `status = 'DELIVERED'`
   - Record `deliveryDate = now()`
   - Record `extraAmount` and final total collected
   - Print Delivery Receipt

---

## 8. CART TOTALS, ORDER FINALIZATION & RECEIPTS

### 8.1 Bill Grand Total Calculation
$$\text{Gross New Items Total} = \sum (\text{Item.goldValue} + \text{Item.wastageValue} + \text{Item.makingChargeValue} + \text{Item.gstValue})$$
$$\text{Deductions} = \sum \text{PurchaseItems.amount} + \sum \text{AdvanceItems.amount}$$
$$\text{Net Payable Grand Total} = \max(0, \text{Gross New Items Total} - \text{Deductions})$$

### 8.2 Order & Estimation Identifiers
- **Order ID:** `ORD-YYYYMM-XXXX` (e.g. `ORD-202610-0012`).
- **Daily Estimation Number:** Resets daily starting at 1 (`EST #1`, `EST #2`...).
- **Customer Auto-Save:** Auto-inserts or updates customer in customer master if mobile number is present.

### 8.3 Thermal Receipt Specifications (58mm / 80mm)
- **Monospace Font:** Clean layout using `Courier New` / 11px font.
- **Header:** Shop Name (uppercase, bold 18px), Address, Phone, GSTIN.
- **Rate Strip:** Today's Gold 22K and Silver rates printed at top.
- **Itemized Table:** Tag, Item Name, Purity, Pcs, Gr Wt, Net Wt, VA%, MC, Amount.
- **Deduction Section:** Old Gold exchange breakdown (Gross, Less, Net, Rate, Less Amount).
- **Payment Summary:** Gross Total, Less Old Gold, Less Advance, **NET PAYABLE** in bold double-line box.

---

## 9. TYPESCRIPT MODELS & ANGULAR ARCHITECTURE RECOMMENDATIONS

### 9.1 TypeScript Models (`src/app/features/billing/models/jewellery.models.ts`)
```typescript
export type WastageType = 'percentage' | 'weight';
export type MakingChargeType = 'perGram' | 'fixed' | 'percentage';
export type LessWeightType = 'grams' | 'percentage' | 'amount';
export type MetalType = 'GOLD' | 'SILVER';
export type RepairStatus = 'PENDING' | 'DELIVERED';
export type RepairType = 'CUSTOMER' | 'COMPANY';

export interface GoldRate {
  rate18k: number;
  rate20k: number;
  rate22k: number;
  rate24k: number;
  silver: number;
  date: string;
}

export interface JewelleryItem {
  id: string;
  tagNumber?: string;
  name: string;
  subProductName?: string;
  pcs: number;
  grossWeight: number;
  stoneWeight: number;
  netWeight: number;
  purity: number; // 18, 20, 22, 24
  metal: MetalType;
  rate: number;
  wastage: number;
  wastageType: WastageType;
  makingCharge: number;
  makingChargeType: MakingChargeType;
  goldValue: number;
  wastageValue: number;
  makingChargeValue: number;
  gstValue: number;
  totalValue: number;
  isManual: boolean;
}

export interface OldGoldPurchaseItem {
  id: string;
  category: string;
  subCategory?: string;
  metal: MetalType;
  purity: number;
  pcs: number;
  grossWeight: number;
  lessWeight: number;
  lessWeightType: LessWeightType;
  netWeight: number;
  rate: number;
  amount: number;
}

export interface RepairItem {
  id: string; // REP-YYYYMM-XXXX
  date: string;
  type: RepairType;
  dueDays: number;
  dueDate: string;
  itemName: string;
  subProductName?: string;
  pcs: number;
  grossWeight: number;
  netWeight: number;
  natureOfRepair: string;
  empId?: string;
  images: string[];
  amount: number;
  advance: number;
  balance: number;
  status: RepairStatus;
  extraAmount?: number;
  deliveryDate?: string;
  customerName?: string;
  customerMobile?: string;
  customerAddress?: string;
  gstAmount?: number;
  gstType?: 'none' | 'amount' | 'percentage';
}

export interface JewelleryCartTotals {
  totalGrossWeight: number;
  totalNetWeight: number;
  totalGoldValue: number;
  totalMakingCharge: number;
  totalWastage: number;
  totalGST: number;
  grossBillTotal: number;
  totalOldGoldPurchase: number;
  totalAdvance: number;
  netPayableGrandTotal: number;
}
```

### 9.2 Angular Implementation Recommendations
1. **Vertical Service (`JewelleryBillingService`):**
   - Maintain Signals for `goldRates = signal<GoldRate>(...)` and `cartItems = signal<JewelleryItem[]>([])`.
   - Maintain `computed()` signals for all sub-totals and the net grand total.
2. **Scanner Service (`BarcodeScanService`):**
   - Global `keydown` / scanner listener for fast keyboard wedge barcode readers.
   - If buffer matches `/^REP-\d{6}-\d{4}/`, emit to `RepairService.openDelivery(id)`.
   - Else, invoke `fetchTagDetails(tag)` and add item to cart.
3. **Old Gold Component (`OldGoldExchangeComponent`):**
   - Modal or expandable drawer in billing screen with reactive controls for Gross, Less Type (Grams, %, Flat ₹), and Purity.
4. **Repair Management (`RepairModule`):**
   - Dedicated tabs: "New Repair Booking" and "Active Repair List".
   - Fast delivery action via QR scan.
