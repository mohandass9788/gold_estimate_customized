import React, { useState, useEffect } from 'react';
import { View as RNView, Text as RNText, StyleSheet, ScrollView as RNScrollView, Alert, TouchableOpacity as RNRTouchableOpacity, Modal as RNModal, ActivityIndicator as RNActivityIndicator } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import ScreenContainer from '../components/ScreenContainer';
import HeaderBar from '../components/HeaderBar';
import InputField from '../components/InputField';
import DropdownField from '../components/DropdownField';
import PrimaryButton from '../components/PrimaryButton';
import SummaryCard from '../components/SummaryCard';
import EstimationForm from '../components/EstimationForm';
import CardItemRow from '../components/CardItemRow';
import { useEstimation } from '../store/EstimationContext';
import { useGeneralSettings } from '../store/GeneralSettingsContext';
import { calculateNetWeight } from '../utils/calculations';
import { getPurchaseCategories, getPurchaseSubCategories, DBPurchaseCategory, DBPurchaseSubCategory, getNextEstimationNumber } from '../services/dbService';
import { EstimationItem, PurchaseItem, ChitItem, AdvanceItem, LessWeightType } from '../types';
import { COLORS, SPACING, FONT_SIZES, BORDER_RADIUS, LIGHT_COLORS, DARK_COLORS } from '../constants/theme';
import { printEstimationItem, printPurchaseItem, printEstimationReceipt, printChitItem, printAdvanceItem } from '../services/printService';

// Fix for React 19 type mismatch
const View = RNView as any;
const Text = RNText as any;
const Icon = Ionicons as any;
const ScrollView = RNScrollView as any;
const TouchableOpacity = RNRTouchableOpacity as any;
const Modal = RNModal as any;
const ActivityIndicator = RNActivityIndicator as any;

type Mode = 'TAG' | 'MANUAL' | 'PURCHASE' | 'CHIT' | 'ADVANCE';

export default function UnifiedEstimationScreen({ initialMode = 'TAG' }: { initialMode?: Mode }) {
    const router = useRouter();
    const params = useLocalSearchParams();
    const { state, addTagItem, addManualItem, addPurchaseItem, addChitItem, addAdvanceItem, removeItem, resetEstimation, clearEstimation } = useEstimation();
    const { theme, t, shopDetails, deviceName, requestPrint, currentEmployeeName, receiptConfig } = useGeneralSettings();
    const [mode, setMode] = useState<Mode>((params.mode as Mode) || initialMode);
    const [editingItem, setEditingItem] = useState<EstimationItem | null>(null);
    const [viewingItem, setViewingItem] = useState<EstimationItem | null>(null);
    const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
    const [isPrinting, setIsPrinting] = useState(false);
    const [showPrintPreview, setShowPrintPreview] = useState(false);
    const [previewContent, setPreviewContent] = useState<string>('');
    const [previewType, setPreviewType] = useState<'merged' | 'separate'>('merged');
    const [itemsToPrint, setItemsToPrint] = useState<EstimationItem[]>([]);
    const [purchaseItemsToPrint, setPurchaseItemsToPrint] = useState<PurchaseItem[]>([]);
    const [chitItemsToPrint, setChitItemsToPrint] = useState<ChitItem[]>([]);
    const [advanceItemsToPrint, setAdvanceItemsToPrint] = useState<AdvanceItem[]>([]);
    const [estimationNum, setEstimationNum] = useState<number | null>(null);
    const [scrollOffset, setScrollOffset] = useState(0);
    const [contentWidth, setContentWidth] = useState(0);
    const [containerWidth, setContainerWidth] = useState(0);
    const modeScrollRef = React.useRef<any>(null);
    const isInitialLoadPurchase = React.useRef(false);

    const activeColors = theme === 'light' ? LIGHT_COLORS : DARK_COLORS;

    // Form State
    const [customerName, setCustomerName] = useState('');

    // Purchase Panel State
    const [categories, setCategories] = useState<DBPurchaseCategory[]>([]);
    const [subCategories, setSubCategories] = useState<DBPurchaseSubCategory[]>([]);
    const [purchaseCategoryId, setPurchaseCategoryId] = useState('');
    const [purchaseSubCategoryId, setPurchaseSubCategoryId] = useState('');
    const [purchasePurity, setPurchasePurity] = useState('22');
    const [purchasePcs, setPurchasePcs] = useState('1');
    const [purchaseGross, setPurchaseGross] = useState('');
    const [purchaseLess, setPurchaseLess] = useState('0');
    const [purchaseLessType, setPurchaseLessType] = useState<LessWeightType>('grams');
    const [purchaseRate, setPurchaseRate] = useState('');
    const [purchaseMetal, setPurchaseMetal] = useState<'GOLD' | 'SILVER'>('GOLD');

    // Chit State
    const [chitId, setChitId] = useState('');
    const [chitAmount, setChitAmount] = useState('');

    // Advance State
    const [advanceId, setAdvanceId] = useState('');
    const [advanceAmount, setAdvanceAmount] = useState('');

    useEffect(() => {
        const loadCategories = async () => {
            const cats = await getPurchaseCategories();
            setCategories(cats);
        };
        loadCategories();
    }, []);

    // Handle Scanned Data from TagScanScreen
    useEffect(() => {
        if (params.scannedData) {
            try {
                const scannedProduct = JSON.parse(params.scannedData as string);

                // Check for duplicates in the list (only if tagNumber is present)
                const existingItem = scannedProduct.tagNumber
                    ? state.items.find(item => item.tagNumber === scannedProduct.tagNumber)
                    : null;

                if (existingItem) {
                    Alert.alert(
                        t('duplicate_item') || 'Duplicate Item',
                        t('duplicate_item_msg', { tag: scannedProduct.tagNumber }) || `Item with Tag ${scannedProduct.tagNumber} is already in the list.`,
                        [
                            { text: 'OK', onPress: () => router.setParams({ scannedData: undefined }) }
                        ]
                    );
                    return;
                }

                // Construct an EstimationItem-like object for editing
                // We need to calculate values based on current rates
                const currentRate = state.goldRate ? (scannedProduct.purity === 24 ? state.goldRate.rate24k :
                    scannedProduct.purity === 22 ? state.goldRate.rate22k :
                        scannedProduct.purity === 18 ? state.goldRate.rate18k : 0) : 0;

                // If metal is silver, use silver rate
                const finalRate = scannedProduct.metal === 'SILVER' && state.goldRate ? state.goldRate.silver : currentRate;

                const itemToEdit: any = {
                    ...scannedProduct,
                    id: Date.now().toString(), // Temp ID
                    rate: finalRate || scannedProduct.rate || 0,
                    // Ensure defaults if missing
                    makingChargeType: (scannedProduct.makingChargeType as any) || 'fixed',
                    wastageType: (scannedProduct.wastageType as any) || 'percentage',
                };

                setEditingItem(itemToEdit);
                setMode('TAG');
                router.setParams({ scannedData: undefined });
            } catch (e) {
                console.error('Error parsing scanned data:', e);
            }
        }
    }, [params.scannedData]);

    // Unified handle for mode changes from params or parent
    useEffect(() => {
        if (params.mode && params.mode !== mode) {
            const newMode = params.mode as Mode;
            setMode(newMode);
            // Clear the param after handling it to avoid sticky behavior
            router.setParams({ mode: undefined });
        }
    }, [params.mode]);

    // Auto-scroll to active tab when mode changes
    useEffect(() => {
        if (modeScrollRef.current && containerWidth > 0) {
            const modeToIndex: Record<Mode, number> = {
                'TAG': 0,
                'MANUAL': 1,
                'PURCHASE': 2,
                'CHIT': 3,
                'ADVANCE': 4
            };
            const index = modeToIndex[mode];
            const buttonWidth = 110; // minWidth(100) + margin(4*2) + padding
            const targetX = Math.max(0, (index * buttonWidth) - (containerWidth / 2) + (buttonWidth / 2));

            setTimeout(() => {
                modeScrollRef.current.scrollTo({ x: targetX, animated: true });
            }, 100);
        }
    }, [mode, containerWidth]);

    useEffect(() => {
        if (purchaseCategoryId && !isInitialLoadPurchase.current) {
            const loadSubCategories = async () => {
                const subs = await getPurchaseSubCategories(parseInt(purchaseCategoryId));
                setSubCategories(subs);
                setPurchaseSubCategoryId(''); // Reset sub when category changes
            };
            loadSubCategories();
        } else if (!purchaseCategoryId) {
            setSubCategories([]);
        }
    }, [purchaseCategoryId]);


    // Auto-fill rate based on purity (only if NOT loading initial data)
    useEffect(() => {
        if (state.goldRate && !isInitialLoadPurchase.current) {
            const purity = parseInt(purchasePurity);
            let rate = 0;
            if (purchaseMetal === 'SILVER') {
                rate = state.goldRate.silver;
            } else {
                if (purity === 24) rate = state.goldRate.rate24k;
                else if (purity === 22) rate = state.goldRate.rate22k;
                else if (purity === 18) rate = state.goldRate.rate18k;
            }

            if (rate > 0) setPurchaseRate(rate.toString());
        }
    }, [purchasePurity, purchaseMetal, state.goldRate]);

    const handleToggleSelection = (id: string) => {
        const newSelected = new Set(selectedItems);
        if (newSelected.has(id)) {
            newSelected.delete(id);
        } else {
            newSelected.add(id);
        }
        setSelectedItems(newSelected);
    };

    const handleSelectAll = () => {
        if (selectedItems.size === state.items.length + state.purchaseItems.length + state.chitItems.length + state.advanceItems.length) {
            setSelectedItems(new Set());
        } else {
            const allIds = [
                ...state.items.map(i => i.id),
                ...state.purchaseItems.map(i => i.id),
                ...state.chitItems.map(i => i.id),
                ...state.advanceItems.map(i => i.id)
            ];
            setSelectedItems(new Set(allIds));
        }
    };

    const handlePrintSelected = async () => {
        if (selectedItems.size === 0) {
            Alert.alert(t('no_items_selected') || 'No Items Selected');
            return;
        }

        // Fetch the next estimation number for today
        const nextNum = await getNextEstimationNumber();
        setEstimationNum(nextNum);

        requestPrint(async (empName) => {
            const items = state.items.filter(item => selectedItems.has(item.id));
            const purchases = state.purchaseItems.filter(item => selectedItems.has(item.id));
            const chits = state.chitItems.filter(item => selectedItems.has(item.id));
            const advances = state.advanceItems.filter(item => selectedItems.has(item.id));

            setItemsToPrint(items);
            setPurchaseItemsToPrint(purchases);
            setChitItemsToPrint(chits);
            setAdvanceItemsToPrint(advances);

            // Validation: If both product items and deduction items are selected, merged printing is not allowed
            const hasProducts = items.length > 0 || purchases.length > 0;
            const hasDeductions = chits.length > 0 || advances.length > 0;

            // If ONLY Chit or Advance items are selected, default to separate/one-by-one
            if (hasDeductions && !hasProducts) {
                setPreviewType('separate');
                setShowPrintPreview(true);
                return;
            }

            Alert.alert(
                t('print'),
                'Choose print format:',
                [
                    {
                        text: t('merged_receipt') || 'Single Receipt (Merged)',
                        onPress: () => {
                            setPreviewType('merged');
                            setShowPrintPreview(true);
                        }
                    },
                    {
                        text: t('separate_receipts') || 'Separate Receipts',
                        onPress: () => {
                            setPreviewType('separate');
                            setShowPrintPreview(true);
                        }
                    },
                    { text: t('cancel'), style: 'cancel' }
                ]
            );
        });
    };

    const confirmPrint = async () => {
        setIsPrinting(true);
        setShowPrintPreview(false);
        try {
            if (previewType === 'merged') {
                await printEstimationReceipt(itemsToPrint, purchaseItemsToPrint, chitItemsToPrint, advanceItemsToPrint, { ...shopDetails, deviceName }, customerName, currentEmployeeName, receiptConfig, estimationNum || undefined);

                // Save Order to History
                try {
                    const totalGross = itemsToPrint.reduce((sum, item) => sum + item.totalValue, 0);
                    const purchaseTotal = purchaseItemsToPrint.reduce((sum, i) => sum + i.amount, 0);
                    const chitTotal = chitItemsToPrint.reduce((sum, i) => sum + i.amount, 0);
                    const advanceTotal = advanceItemsToPrint.reduce((sum, i) => sum + i.amount, 0);
                    const netPayable = totalGross - (purchaseTotal + chitTotal + advanceTotal);

                    const { saveOrder, getNextOrderId } = require('../services/dbService');
                    const orderId = await getNextOrderId();

                    const orderData = {
                        orderId,
                        customerName,
                        customerMobile: '', // We should probably add this to state
                        employeeName: currentEmployeeName,
                        date: new Date().toISOString(),
                        grossTotal: totalGross,
                        netPayable,
                        status: 'completed',
                        estimationNumber: estimationNum
                    };

                    const orderItems: any[] = [
                        ...itemsToPrint.map(i => ({ type: 'PRODUCT' as const, data: i })),
                        ...purchaseItemsToPrint.map(i => ({ type: 'PURCHASE' as const, data: i })),
                        ...chitItemsToPrint.map(i => ({ type: 'CHIT' as const, data: i })),
                        ...advanceItemsToPrint.map(i => ({ type: 'ADVANCE' as const, data: i }))
                    ];

                    await saveOrder(orderData, orderItems);

                    Alert.alert(
                        t('print_success') || 'Print Successful',
                        t('print_success_msg') || 'Receipt printed and order saved. Clear list?',
                        [
                            { text: t('keep_list') || 'Keep List', style: 'cancel' },
                            { text: t('clear_list_confirm') || 'Clear List', onPress: () => clearEstimation(), style: 'destructive' }
                        ]
                    );
                } catch (saveError) {
                    console.error('Error saving order:', saveError);
                }
            } else {
                // Group Estimation items and Purchase items into one detailed bill
                if (itemsToPrint.length > 0 || purchaseItemsToPrint.length > 0) {
                    await printEstimationReceipt(
                        itemsToPrint,
                        purchaseItemsToPrint,
                        [],
                        [],
                        { ...shopDetails, deviceName },
                        customerName,
                        currentEmployeeName,
                        receiptConfig,
                        estimationNum || undefined
                    );
                }

                // Print each Chit and Advance item as a completely separate receipt
                for (const item of chitItemsToPrint) await printChitItem(item, shopDetails, currentEmployeeName, receiptConfig);
                for (const item of advanceItemsToPrint) await printAdvanceItem(item, shopDetails, currentEmployeeName, receiptConfig);
            }
            Alert.alert(t('success'), t('printing_completed') || 'Printing completed');
            setSelectedItems(new Set());
        } catch (error: any) {
            Alert.alert(t('error'), error.message || t('print_failed') || 'Failed to print items');
        } finally {
            setIsPrinting(false);
        }
    };

    const handleEditItem = (item: EstimationItem) => {
        setEditingItem(item);
        setMode(item.isManual ? 'MANUAL' : 'TAG');
        removeItem(item.id, 'estimation');
    };

    const handleEditPurchase = async (item: PurchaseItem) => {
        isInitialLoadPurchase.current = true;
        setPurchaseMetal(item.metal);
        setPurchasePcs(item.pcs.toString());
        setPurchaseGross(item.grossWeight.toString());
        setPurchaseLess(item.lessWeight.toString());
        setPurchaseLessType(item.lessWeightType);
        setPurchaseRate(item.rate.toString());
        setPurchasePurity(item.purity.toString());

        // Find category ID
        const cat = categories.find(c => c.name === item.category);
        if (cat) {
            setPurchaseCategoryId(cat.id.toString());
            // Fetch and set subcategory
            const subs = await getPurchaseSubCategories(cat.id);
            setSubCategories(subs);
            const sub = subs.find(s => s.name === item.subCategory);
            if (sub) setPurchaseSubCategoryId(sub.id.toString());
        }

        setMode('PURCHASE');
        removeItem(item.id, 'purchase');

        // Brief timeout to let states settle before allowing effects
        setTimeout(() => {
            isInitialLoadPurchase.current = false;
        }, 150);

        Alert.alert(t('editing') || 'Editing', t('purchase_loaded') || 'Purchase item loaded into form.');
    };

    const handleEditChit = (item: ChitItem) => {
        setChitId(item.chitId);
        setChitAmount(item.amount.toString());
        setMode('CHIT');
        removeItem(item.id, 'chit');
        Alert.alert(t('editing') || 'Editing', t('chit_loaded') || 'Chit details loaded into form.');
    };

    const handleEditAdvance = (item: AdvanceItem) => {
        setAdvanceId(item.advanceId);
        setAdvanceAmount(item.amount.toString());
        setMode('ADVANCE');
        removeItem(item.id, 'advance');
        Alert.alert(t('editing') || 'Editing', t('advance_loaded') || 'Advance details loaded into form.');
    };

    const handleRemoveItem = (id: string, type: 'estimation' | 'purchase' | 'chit' | 'advance' = 'estimation') => {
        Alert.alert(
            t('confirm_remove') || 'Remove Item',
            t('confirm_remove_msg') || 'Are you sure you want to remove this item?',
            [
                { text: t('cancel'), style: 'cancel' },
                { text: t('remove'), onPress: () => removeItem(id, type), style: 'destructive' }
            ]
        );
    };

    const purchaseNetWeight = calculateNetWeight(parseFloat(purchaseGross) || 0, parseFloat(purchaseLess) || 0, purchaseLessType);

    const handleAddPurchase = () => {
        const gWeightNum = parseFloat(purchaseGross);
        let rateValNum = parseFloat(purchaseRate);

        // Smart Rate Auto-fill if missing
        if ((!purchaseRate || isNaN(rateValNum) || rateValNum <= 0) && state.goldRate) {
            const purity = parseInt(purchasePurity);
            if (purchaseMetal === 'SILVER') {
                rateValNum = state.goldRate.silver;
            } else {
                if (purity === 24) rateValNum = state.goldRate.rate24k;
                else if (purity === 22) rateValNum = state.goldRate.rate22k;
                else if (purity === 18) rateValNum = state.goldRate.rate18k;
            }
            if (rateValNum > 0) setPurchaseRate(rateValNum.toString());
        }

        if (!purchaseCategoryId || isNaN(gWeightNum) || gWeightNum <= 0 || isNaN(rateValNum) || rateValNum <= 0) {
            Alert.alert(t('error') || 'Error', t('field_required') || 'Please fill mandatory fields: Category, Weight and Rate');
            return;
        }

        const categoryName = categories.find(c => c.id.toString() === purchaseCategoryId)?.name || '';
        const subCategoryName = subCategories.find(s => s.id.toString() === purchaseSubCategoryId)?.name || '';

        const amount = purchaseNetWeight * rateValNum;
        const item: PurchaseItem = {
            id: Date.now().toString(),
            category: categoryName,
            subCategory: subCategoryName,
            purity: parseFloat(purchasePurity),
            pcs: parseInt(purchasePcs) || 1,
            grossWeight: gWeightNum,
            lessWeight: parseFloat(purchaseLess) || 0,
            lessWeightType: purchaseLessType,
            netWeight: purchaseNetWeight,
            rate: rateValNum,
            amount,
            metal: purchaseMetal,
        };

        addPurchaseItem(item);
        clearPurchaseForm();
        Alert.alert(t('success') || 'Success', t('item_added') || 'Purchase item added');
    };

    const handleAddChit = () => {
        if (!chitId || !chitAmount) {
            Alert.alert('Error', t('field_required'));
            return;
        }
        addChitItem({
            id: Date.now().toString(),
            chitId,
            amount: parseFloat(chitAmount),
        });
        setChitId('');
        setChitAmount('');
        Alert.alert('Success', 'Chit item added');
    };

    const handleAddAdvance = () => {
        if (!advanceId || !advanceAmount) {
            Alert.alert('Error', t('field_required'));
            return;
        }
        addAdvanceItem({
            id: Date.now().toString(),
            advanceId,
            amount: parseFloat(advanceAmount),
        });
        setAdvanceId('');
        setAdvanceAmount('');
        Alert.alert('Success', 'Advance item added');
    };


    const handleReset = () => {
        if (state.items.length === 0 && state.purchaseItems.length === 0) return;

        Alert.alert(
            t('reset') || 'Reset',
            t('reset_confirm_msg') || 'Clear the current list of items? This will not save to history.',
            [
                { text: t('cancel'), style: 'cancel' },
                {
                    text: t('reset') || 'Reset',
                    style: 'destructive',
                    onPress: () => {
                        resetEstimation();
                        setCustomerName('');
                        setPurchaseCategoryId('');
                        setPurchaseSubCategoryId('');
                        setPurchaseGross('');
                        setPurchaseLess('0');
                        setPurchaseRate('');
                        setChitId('');
                        setChitAmount('');
                        setAdvanceId('');
                        setAdvanceAmount('');
                        Alert.alert('Reset', 'Items list and form cleared.');
                    }
                }
            ]
        );
    };

    const generateHtmlForCurrentEstimation = () => {
        const taxableValue = state.items.reduce((sum, i) => sum + i.goldValue + i.makingChargeValue + i.wastageValue, 0);
        const gstTotal = taxableValue * 0.03;
        const splitGst = gstTotal / 2;

        const rows = state.items.map(i => `
            <tr>
                <td style="padding: 6px 4px; border-bottom: 1px solid #eee;">
                    ${i.name}${i.subProductName ? `<br/><small>(${i.subProductName})</small>` : ''}
                </td>
                <td style="padding: 6px 4px; text-align: right; border-bottom: 1px solid #eee;">${i.netWeight.toFixed(3)}g</td>
                <td style="padding: 6px 4px; text-align: right; border-bottom: 1px solid #eee;">₹${Math.round(i.makingChargeValue + i.wastageValue).toLocaleString()}</td>
                <td style="padding: 6px 4px; text-align: right; border-bottom: 1px solid #eee;">₹${Math.round(i.goldValue + i.makingChargeValue + i.wastageValue).toLocaleString()}</td>
            </tr>
        `).join('');

        const purchaseRows = state.purchaseItems.map(p => `
            <tr>
                <td style="padding: 6px 4px; border-bottom: 1px dotted #eee;">${p.category}</td>
                <td style="padding: 6px 4px; text-align: right; border-bottom: 1px dotted #eee;">${p.netWeight.toFixed(3)}g</td>
                <td style="padding: 6px 4px; text-align: right; border-bottom: 1px dotted #eee;">₹${p.rate}</td>
                <td style="padding: 6px 4px; text-align: right; color: #d32f2f; border-bottom: 1px dotted #eee;">-₹${Math.round(p.amount).toLocaleString()}</td>
            </tr>
        `).join('');

        const chitRows = state.chitItems.map(c => `
            <div style="display: flex; justify-content: space-between; padding: 4px 0;">
                <span>Chit ID: ${c.chitId}</span>
                <span style="color: #d32f2f; font-weight: bold;">-₹${Math.round(c.amount).toLocaleString()}</span>
            </div>
        `).join('');

        const advanceRows = state.advanceItems.map(a => `
            <div style="display: flex; justify-content: space-between; padding: 4px 0;">
                <span>Advance ID: ${a.advanceId}</span>
                <span style="color: #d32f2f; font-weight: bold;">-₹${Math.round(a.amount).toLocaleString()}</span>
            </div>
        `).join('');

        return `
            <html>
                <body style="font-family: sans-serif; padding: 20px; font-size: 13px; color: #333;">
                    <div style="text-align: center; margin-bottom: 20px; border-bottom: 2px solid #f59e0b; padding-bottom: 10px;">
                        <h1 style="margin: 0; color: #f59e0b; font-size: 24px;">${shopDetails?.name || 'ESTIMATION'}</h1>
                        <div style="font-size: 11px;">${shopDetails.address || ''}</div>
                        <div style="font-size: 11px;">GSTIN: ${shopDetails.gstNumber || ''} | Ph: ${shopDetails.phone || ''}</div>
                    </div>

                    <div style="display: flex; justify-content: space-between; margin-bottom: 15px; font-size: 11px;">
                        <div>Date: ${new Date().toLocaleString()}</div>
                        ${estimationNum ? `<div>Est #: <b>${estimationNum}</b></div>` : ''}
                        ${customerName ? `<div>Customer: <b>${customerName}</b></div>` : ''}
                    </div>

                    <table style="width: 100%; border-collapse: collapse; margin-bottom: 15px;">
                        <thead>
                            <tr style="background: #f8f9fa;">
                                <th style="text-align: left; padding: 8px 4px;">Item</th>
                                <th style="text-align: right; padding: 8px 4px;">Wt</th>
                                <th style="text-align: right; padding: 8px 4px;">MC+VA</th>
                                <th style="text-align: right; padding: 8px 4px;">Total</th>
                            </tr>
                        </thead>
                        <tbody>${rows}</tbody>
                    </table>

                    ${purchaseRows ? `
                        <div style="font-weight: bold; background: #fff5f5; padding: 5px; margin-top: 15px;">DEDUCTIONS: OLD GOLD</div>
                        <table style="width: 100%; border-collapse: collapse; font-size: 11px;">
                            <thead><tr style="color: #666;">
                                <th style="text-align: left;">Cat</th>
                                <th style="text-align: right;">Wt</th>
                                <th style="text-align: right;">Rate</th>
                                <th style="text-align: right;">Value</th>
                            </tr></thead>
                            <tbody>${purchaseRows}</tbody>
                        </table>
                    ` : ''}

                    ${chitRows ? `<div style="font-weight: bold; background: #f0fff4; padding: 5px; margin-top: 10px;">CHIT ADJUSTMENTS</div>${chitRows}` : ''}
                    ${advanceRows ? `<div style="font-weight: bold; background: #fffaf0; padding: 5px; margin-top: 10px;">ADVANCE ADJUSTMENTS</div>${advanceRows}` : ''}

                    <div style="margin-top: 20px; border-top: 2px solid #333; padding-top: 10px;">
                        <div style="display: flex; justify-content: space-between; padding: 2px 0;">
                            <span>Taxable Value:</span>
                            <span>₹${Math.round(taxableValue).toLocaleString()}</span>
                        </div>
                        <div style="display: flex; justify-content: space-between; padding: 2px 0;">
                            <span>SGST (1.5%):</span>
                            <span>₹${Math.round(splitGst).toLocaleString()}</span>
                        </div>
                        <div style="display: flex; justify-content: space-between; padding: 2px 0;">
                            <span>CGST (1.5%):</span>
                            <span>₹${Math.round(splitGst).toLocaleString()}</span>
                        </div>
                        <div style="display: flex; justify-content: space-between; padding: 10px 0; font-weight: bold; font-size: 16px; border-top: 1px solid #eee;">
                            <span>GROSS TOTAL:</span>
                            <span>₹${Math.round(taxableValue + gstTotal).toLocaleString()}</span>
                        </div>
                        <div style="display: flex; justify-content: space-between; padding: 10px 0; font-weight: bold; font-size: 20px; color: #000; border-top: 2px solid #333;">
                            <span>NET PAYABLE:</span>
                            <span>₹${Math.round(state.totals.grandTotal).toLocaleString()}</span>
                        </div>
                    </div>

                    <div style="text-align: center; margin-top: 30px; font-style: italic; color: #666;">
                        ${shopDetails.footerMessage || 'Thank you for your visit!'}
                    </div>
                </body>
            </html>
        `;
    };

    const handleShare = async () => {
        if (state.items.length === 0 && state.purchaseItems.length === 0) {
            Alert.alert(t('no_items'));
            return;
        }

        try {
            const html = generateHtmlForCurrentEstimation();
            const { uri } = await Print.printToFileAsync({ html });
            await Sharing.shareAsync(uri, { UTI: '.pdf', mimeType: 'application/pdf' });
        } catch (error) {
            Alert.alert('Error', 'Failed to share');
        }
    };

    const clearPurchaseForm = () => {
        setPurchaseCategoryId('');
        setPurchaseSubCategoryId('');
        setPurchaseGross('');
        setPurchaseLess('0');
        setPurchaseLessType('grams');
        setPurchaseRate('');
    };

    const ModeButton = ({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) => (
        <TouchableOpacity
            style={[
                styles.modeButton,
                active && {
                    backgroundColor: activeColors.primary,
                    shadowColor: activeColors.primary,
                    shadowOffset: { width: 0, height: 4 },
                    shadowOpacity: 0.3,
                    shadowRadius: 8,
                    elevation: 5,
                }
            ]}
            onPress={onPress}
        >
            <Text style={[
                styles.modeButtonText,
                { color: theme === 'light' ? '#666' : '#AAA' },
                active && { color: '#FFF', fontWeight: '800' }
            ]}>
                {label}
            </Text>
        </TouchableOpacity>
    );

    const handleTabScroll = (direction: 'left' | 'right') => {
        if (!modeScrollRef.current) return;
        const scrollAmount = containerWidth * 0.6;
        const target = direction === 'left' ? scrollOffset - scrollAmount : scrollOffset + scrollAmount;
        modeScrollRef.current.scrollTo({ x: target, animated: true });
    };

    const showLeftArrow = scrollOffset > 10;
    const showRightArrow = contentWidth > containerWidth && scrollOffset < (contentWidth - containerWidth - 10);

    const DetailViewModal = () => (
        <Modal
            visible={!!viewingItem}
            animationType="slide"
            transparent={true}
            onRequestClose={() => setViewingItem(null)}
        >
            <View style={styles.modalOverlay}>
                <View style={[styles.modalContent, { backgroundColor: activeColors.cardBg }]}>
                    <View style={styles.modalHeader}>
                        <Text style={[styles.modalTitle, { color: activeColors.text }]}>{viewingItem?.name}</Text>
                        <TouchableOpacity onPress={() => setViewingItem(null)}>
                            <Icon name="close" size={24} color={activeColors.text} />
                        </TouchableOpacity>
                    </View>

                    <ScrollView style={styles.modalBody}>
                        {viewingItem && (
                            <>
                                <DetailRow label={t('tag_number')} value={viewingItem.tagNumber || 'Manual'} />
                                <DetailRow label={t('customer_name')} value={viewingItem.customerName || '-'} />
                                <DetailRow label={t('metal')} value={viewingItem.metal} />
                                <DetailRow label={t('purity')} value={`${viewingItem.purity}K`} />
                                <DetailRow label={t('net_weight')} value={`${viewingItem.netWeight.toFixed(3)} g`} />
                                <DetailRow label={t('rate')} value={`₹ ${viewingItem.rate.toLocaleString()}`} />
                                <View style={styles.modalDivider} />
                                <DetailRow label={t('gold_value')} value={`₹ ${viewingItem.goldValue.toLocaleString()}`} />
                                <DetailRow label={t('wastage')} value={`₹ ${viewingItem.wastageValue.toLocaleString()} (${viewingItem.wastage}${viewingItem.wastageType === 'percentage' ? '%' : 'g'})`} />
                                <DetailRow label={t('making_charge')} value={`₹ ${viewingItem.makingChargeValue.toLocaleString()}`} />
                                <DetailRow label={t('gst')} value={`₹ ${viewingItem.gstValue.toLocaleString()}`} />
                                <View style={styles.modalTotalRow}>
                                    <Text style={[styles.modalTotalLabel, { color: activeColors.text }]}>{t('total')}</Text>
                                    <Text style={[styles.modalTotalValue, { color: activeColors.primary }]}>₹ {viewingItem.totalValue.toLocaleString()}</Text>
                                </View>
                            </>
                        )}
                    </ScrollView>

                    <View style={styles.modalFooter}>
                        <PrimaryButton
                            title={t('print') || 'Print'}
                            onPress={async () => {
                                if (viewingItem) {
                                    requestPrint(async (empName) => {
                                        try {
                                            await printEstimationItem(viewingItem, shopDetails, empName, receiptConfig);
                                        } catch (e: any) {
                                            Alert.alert('Error', e.message);
                                        }
                                    });
                                }
                            }}
                            style={{ flex: 1 }}
                        />
                    </View>
                </View>
            </View>
        </Modal>
    );

    const PrintPreviewModal = () => (
        <Modal
            visible={showPrintPreview}
            transparent={true}
            animationType="fade"
            onRequestClose={() => setShowPrintPreview(false)}
        >
            <View style={[styles.modalOverlay, { justifyContent: 'center', alignItems: 'center' }]}>
                <View style={[styles.previewModalContent, { backgroundColor: activeColors.cardBg }]}>
                    <View style={styles.modalHeader}>
                        <Text style={[styles.modalTitle, { color: activeColors.text }]}>{t('print_preview')}</Text>
                        <TouchableOpacity onPress={() => setShowPrintPreview(false)}>
                            <Icon name="close" size={24} color={activeColors.text} />
                        </TouchableOpacity>
                    </View>

                    <ScrollView style={styles.previewBody} showsVerticalScrollIndicator={false}>
                        <View style={[styles.previewReceipt, { backgroundColor: '#FFF', borderColor: '#EEE', borderWidth: 1 }]}>
                            <View style={[styles.previewHeader, { alignItems: 'center' }]}>
                                <Text style={[styles.previewShopName, { color: '#000' }]}>{shopDetails.name}</Text>
                                <Text style={[styles.previewShopInfo, { color: '#666' }]}>Device: {deviceName || 'Main Terminal'}</Text>
                                <Text style={[styles.previewShopInfo, { color: '#666' }]}>{shopDetails.address}</Text>
                                <Text style={[styles.previewShopInfo, { color: '#666' }]}>{shopDetails.phone}</Text>
                            </View>
                            <View style={styles.previewDivider} />
                            <View style={styles.previewSubHeader}>
                                <View style={{ width: '45%' }}>
                                    <Text style={[styles.previewInfo, { color: activeColors.textLight }]}>Date: {new Date().toLocaleDateString()}</Text>
                                    <Text style={[styles.previewInfo, { color: activeColors.textLight, fontWeight: 'bold' }]}>{t('estimation_number') || 'Est #'}: {estimationNum || '...'}</Text>
                                </View>
                                <View style={{ width: '45%', alignItems: 'flex-end' }}>
                                    {customerName ? <Text style={[styles.previewInfo, { color: activeColors.textLight }]}>Cust: {customerName}</Text> : null}
                                    {currentEmployeeName ? <Text style={[styles.previewInfo, { color: activeColors.textLight }]}>By: {currentEmployeeName}</Text> : null}
                                </View>
                            </View>
                            <View style={styles.previewDivider} />
                            {/* Preview Body - Items */}
                            {itemsToPrint.map((item, index) => (
                                <View key={item.id} style={[styles.previewRow, { alignItems: 'flex-start', marginBottom: 6 }]}>
                                    <View style={{ flex: 1, paddingRight: 10 }}>
                                        <Text style={{ fontSize: 11, fontWeight: 'bold' }}>{item.name} {item.subProductName ? `(${item.subProductName})` : ''}</Text>
                                        <Text style={{ fontSize: 9, color: '#444', marginTop: 1 }}>{item.netWeight.toFixed(3)}g x ₹{item.rate.toLocaleString()}</Text>
                                    </View>
                                    <Text style={{ fontSize: 11, fontWeight: 'bold', textAlign: 'right' }}>₹ {Math.round(item.totalValue).toLocaleString()}</Text>
                                </View>
                            ))}

                            <View style={[styles.previewDivider, { height: 1, backgroundColor: '#000', opacity: 0.1, marginVertical: 8 }]} />

                            {/* Totals Section */}
                            <View style={styles.previewRow}>
                                <Text style={[styles.previewInfo, { fontSize: 10 }]}>Items Total:</Text>
                                <Text style={[styles.previewInfo, { fontWeight: 'bold', fontSize: 10 }]}>₹ {Math.round(itemsToPrint.reduce((s, i) => s + i.totalValue, 0)).toLocaleString()}</Text>
                            </View>

                            {purchaseItemsToPrint.length > 0 && (
                                <View style={styles.previewRow}>
                                    <Text style={[styles.previewInfo, { fontSize: 10 }]}>Old Gold Deduction:</Text>
                                    <Text style={[styles.previewInfo, { color: activeColors.error, fontSize: 10 }]}>- ₹ {Math.round(purchaseItemsToPrint.reduce((s, i) => s + i.amount, 0)).toLocaleString()}</Text>
                                </View>
                            )}

                            {chitItemsToPrint.length > 0 && (
                                <View style={styles.previewRow}>
                                    <Text style={[styles.previewInfo, { fontSize: 10 }]}>Chit Deduction:</Text>
                                    <Text style={[styles.previewInfo, { color: activeColors.error, fontSize: 10 }]}>- ₹ {Math.round(chitItemsToPrint.reduce((s, i) => s + i.amount, 0)).toLocaleString()}</Text>
                                </View>
                            )}

                            {advanceItemsToPrint.length > 0 && (
                                <View style={styles.previewRow}>
                                    <Text style={[styles.previewInfo, { fontSize: 10 }]}>Advance Deduction:</Text>
                                    <Text style={[styles.previewInfo, { color: activeColors.error, fontSize: 10 }]}>- ₹ {Math.round(advanceItemsToPrint.reduce((s, i) => s + i.amount, 0)).toLocaleString()}</Text>
                                </View>
                            )}

                            {/* Add other deductions similarly with Math.round */}

                            <View style={[styles.previewDivider, { height: 2, backgroundColor: '#000', opacity: 0.8, marginVertical: 10 }]} />

                            <View style={styles.previewRow}>
                                <Text style={{ fontSize: 13, fontWeight: 'bold' }}>Net Payable:</Text>
                                <Text style={{ fontSize: 16, fontWeight: 'bold', color: activeColors.success }}>₹ {Math.round(
                                    itemsToPrint.reduce((s, i) => s + i.totalValue, 0) -
                                    (purchaseItemsToPrint.reduce((s, i) => s + i.amount, 0) +
                                        chitItemsToPrint.reduce((s, i) => s + i.amount, 0) +
                                        advanceItemsToPrint.reduce((s, i) => s + i.amount, 0))
                                ).toLocaleString()}</Text>
                            </View>

                            <Text style={styles.previewFooter}>{shopDetails.footerMessage}</Text>
                        </View>
                    </ScrollView>
                    <View style={styles.modalFooter}>
                        <PrimaryButton
                            title={t('print')}
                            onPress={confirmPrint}
                            isLoading={isPrinting}
                        />
                    </View>
                </View>
            </View>
        </Modal>
    );

    const DetailRow = ({ label, value }: { label: string; value: string }) => (
        <View style={styles.detailRow}>
            <Text style={[styles.detailLabel, { color: activeColors.textLight }]}>{label}</Text>
            <Text style={[styles.detailValue, { color: activeColors.text }]}>{value}</Text>
        </View>
    );

    return (
        <ScreenContainer backgroundColor={activeColors.background} keyboardAvoiding={false}>
            <HeaderBar
                title={t('app_name')}
                showBack
                rightAction={
                    <TouchableOpacity onPress={handleReset} style={{ padding: 4 }}>
                        <Icon name="refresh-circle-outline" size={28} color={activeColors.error} />
                    </TouchableOpacity>
                }
            />

            <PrintPreviewModal />

            <View style={[styles.modeSelectorContainer, { backgroundColor: activeColors.cardBg, borderBottomColor: activeColors.border }]}
                onLayout={(e: any) => setContainerWidth(e.nativeEvent.layout.width)}
            >
                {showLeftArrow && (
                    <TouchableOpacity style={styles.scrollArrow} onPress={() => handleTabScroll('left')}>
                        <Icon name="chevron-back" size={20} color={activeColors.primary} />
                    </TouchableOpacity>
                )}
                <ScrollView
                    ref={modeScrollRef}
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={styles.modeSelectorScroll}
                    onScroll={(e: any) => setScrollOffset(e.nativeEvent.contentOffset.x)}
                    onContentSizeChange={(w: any) => setContentWidth(w)}
                    scrollEventThrottle={16}
                >
                    <ModeButton label="SCAN TAG" active={mode === 'TAG'} onPress={() => setMode('TAG')} />
                    <ModeButton label="MANUAL ENTRY" active={mode === 'MANUAL'} onPress={() => setMode('MANUAL')} />
                    <ModeButton label="PURCHASE" active={mode === 'PURCHASE'} onPress={() => setMode('PURCHASE')} />
                    <ModeButton label="CHIT" active={mode === 'CHIT'} onPress={() => setMode('CHIT')} />
                    <ModeButton label="ADVANCE" active={mode === 'ADVANCE'} onPress={() => setMode('ADVANCE')} />
                </ScrollView>
                {showRightArrow && (
                    <TouchableOpacity style={styles.scrollArrow} onPress={() => handleTabScroll('right')}>
                        <Icon name="chevron-forward" size={20} color={activeColors.primary} />
                    </TouchableOpacity>
                )}
            </View>

            <ScrollView
                style={styles.content}
                contentContainerStyle={styles.scrollContent}
                keyboardShouldPersistTaps="handled"
            >
                {mode === 'TAG' || mode === 'MANUAL' ? (
                    <EstimationForm
                        initialMode={mode}
                        initialData={editingItem}
                        onScanPress={() => router.push('/(tabs)/scan')}
                        onAdd={(item) => {
                            if (mode === 'TAG') addTagItem(item);
                            else addManualItem(item);
                            setEditingItem(null);
                            Alert.alert('Success', t('item_added_to_list') || 'Item added to list');
                        }}
                        onClear={() => setEditingItem(null)}
                    />
                ) : mode === 'CHIT' ? (
                    <View style={[styles.section, { backgroundColor: activeColors.cardBg }]}>
                        <InputField
                            label="Chit ID"
                            value={chitId}
                            onChangeText={setChitId}
                            placeholder="Enter Chit ID"
                        />
                        <InputField
                            label="Chit Amount"
                            value={chitAmount}
                            onChangeText={setChitAmount}
                            keyboardType="numeric"
                            placeholder="Enter Amount"
                        />
                        <PrimaryButton
                            title="Add Chit"
                            onPress={handleAddChit}
                            style={{ marginTop: SPACING.md }}
                        />
                    </View>
                ) : mode === 'ADVANCE' ? (
                    <View style={[styles.section, { backgroundColor: activeColors.cardBg }]}>
                        <InputField
                            label="Advance ID"
                            value={advanceId}
                            onChangeText={setAdvanceId}
                            placeholder="Enter ID"
                        />
                        <InputField
                            label="Advance Amount"
                            value={advanceAmount}
                            onChangeText={setAdvanceAmount}
                            keyboardType="numeric"
                            placeholder="Enter Amount"
                        />
                        <PrimaryButton
                            title="Add Advance"
                            onPress={handleAddAdvance}
                            style={{ marginTop: SPACING.md }}
                        />
                    </View>
                ) : (
                    <View style={[styles.section, { backgroundColor: activeColors.cardBg }]}>
                        <DropdownField
                            label={t('metal')}
                            value={purchaseMetal}
                            onSelect={(val) => {
                                setPurchaseMetal(val as any);
                                if (val === 'SILVER') setPurchasePurity('100');
                                else setPurchasePurity('22');
                            }}
                            options={[
                                { label: t('gold'), value: 'GOLD' },
                                { label: t('silver'), value: 'SILVER' },
                            ]}
                        />
                        <DropdownField
                            label={t('category')}
                            value={purchaseCategoryId}
                            onSelect={setPurchaseCategoryId}
                            options={categories.map(c => ({ label: c.name, value: c.id.toString() }))}
                        />
                        {subCategories.length > 0 && (
                            <DropdownField
                                label={t('sub_category')}
                                value={purchaseSubCategoryId}
                                onSelect={setPurchaseSubCategoryId}
                                options={subCategories.map(s => ({ label: s.name, value: s.id.toString() }))}
                            />
                        )}
                        <DropdownField
                            label={purchaseMetal === 'GOLD' ? t('purity') : 'Silver Type'}
                            value={purchasePurity}
                            onSelect={setPurchasePurity}
                            options={purchaseMetal === 'GOLD' ? [
                                { label: '24K', value: '24' },
                                { label: '22K', value: '22' },
                                { label: '18K', value: '18' },
                            ] : [
                                { label: 'Pure Silver', value: '100' },
                                { label: 'Sterling', value: '92.5' },
                                { label: 'Common', value: '80' },
                            ]}
                        />
                        <View style={styles.row}>
                            <InputField
                                label={t('pcs')}
                                value={purchasePcs}
                                onChangeText={setPurchasePcs}
                                keyboardType="numeric"
                                style={{ flex: 1, marginRight: SPACING.md }}
                            />
                            <InputField
                                label={t('gross_weight')}
                                value={purchaseGross}
                                onChangeText={setPurchaseGross}
                                keyboardType="numeric"
                                style={{ flex: 1 }}
                            />
                        </View>
                        <View style={styles.row}>
                            <InputField
                                label={t('less_weight')}
                                value={purchaseLess}
                                onChangeText={setPurchaseLess}
                                keyboardType="numeric"
                                style={{ flex: 1, marginRight: SPACING.md }}
                            />
                            <DropdownField
                                label={t('type')}
                                value={purchaseLessType}
                                onSelect={(val) => setPurchaseLessType(val as LessWeightType)}
                                options={[
                                    { label: t('weight') || 'Grams (g)', value: 'grams' },
                                    { label: t('percentage') || 'Percentage (%)', value: 'percentage' },
                                    { label: t('fixed') || 'Amount (₹)', value: 'amount' },
                                ]}
                                style={{ flex: 1 }}
                            />
                        </View>
                        <InputField
                            label={t('rate')}
                            value={purchaseRate}
                            onChangeText={setPurchaseRate}
                            keyboardType="numeric"
                        />
                        <View style={styles.purchaseSummary}>
                            <Text style={[styles.purchaseSummaryLabel, { color: activeColors.textLight }]}>{t('net_weight')}</Text>
                            <Text style={[styles.purchaseSummaryValue, { color: activeColors.text }]}>{calculateNetWeight(parseFloat(purchaseGross) || 0, parseFloat(purchaseLess) || 0, purchaseLessType).toFixed(3)} g</Text>
                        </View>
                        <View style={[styles.purchaseSummary, { borderTopWidth: 1, borderTopColor: activeColors.border, paddingTop: SPACING.sm }]}>
                            <Text style={[styles.purchaseSummaryLabel, { color: activeColors.text }]}>{t('total_purchase_amount')}</Text>
                            <Text style={[styles.purchaseSummaryTotal, { color: activeColors.primary }]}>₹ {(purchaseNetWeight * (parseFloat(purchaseRate) || 0)).toLocaleString()}</Text>
                        </View>
                        <PrimaryButton
                            title={t('add_purchase')}
                            onPress={handleAddPurchase}
                            style={{ marginTop: SPACING.md }}
                        />
                    </View>
                )}

                {/* Added Items List */}
                <View style={styles.listHeader}>
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                        <Text style={[styles.listHeaderTitle, { color: activeColors.textLight }]}>
                            {t('added_items') || 'Added Items'} ({state.items.length + state.purchaseItems.length + state.chitItems.length + state.advanceItems.length})
                        </Text>
                        {(state.items.length > 0 || state.purchaseItems.length > 0 || state.chitItems.length > 0 || state.advanceItems.length > 0) && (
                            <TouchableOpacity style={[styles.selectAllButton, { marginLeft: 12 }]} onPress={handleSelectAll}>
                                <Icon
                                    name={selectedItems.size === (state.items.length + state.purchaseItems.length + state.chitItems.length + state.advanceItems.length) ? "checkbox" : "square-outline"}
                                    size={14}
                                    color={COLORS.primary}
                                />
                                <Text style={styles.selectAllText}>
                                    {selectedItems.size === (state.items.length + state.purchaseItems.length + state.chitItems.length + state.advanceItems.length) ? t('deselect_all') : t('select_all')}
                                </Text>
                            </TouchableOpacity>
                        )}
                    </View>
                    {selectedItems.size > 0 && (
                        <TouchableOpacity
                            style={[styles.printButton, { backgroundColor: activeColors.primary }]}
                            onPress={handlePrintSelected}
                            disabled={isPrinting}
                        >
                            {isPrinting ? (
                                <ActivityIndicator color={COLORS.white} size="small" />
                            ) : (
                                <>
                                    <Icon name="print-outline" size={18} color={COLORS.white} />
                                    <Text style={styles.printButtonText}>{t('print_selected')}</Text>
                                </>
                            )}
                        </TouchableOpacity>
                    )}
                </View>

                {state.items.map((item) => (
                    <CardItemRow
                        key={item.id}
                        item={item}
                        selected={selectedItems.has(item.id)}
                        onToggleSelection={() => handleToggleSelection(item.id)}
                        onRemove={() => handleRemoveItem(item.id, 'estimation')}
                        onEdit={() => handleEditItem(item)}
                        onView={() => setViewingItem(item)}
                    />
                ))}

                {state.purchaseItems.map((item) => (
                    /* ... purchase item row ... */
                    <TouchableOpacity
                        key={item.id}
                        activeOpacity={0.7}
                        onPress={() => handleToggleSelection(item.id)}
                        style={[
                            styles.purchaseCard,
                            { backgroundColor: activeColors.cardBg, borderColor: activeColors.border },
                            selectedItems.has(item.id) && { borderColor: activeColors.primary, borderWidth: 2 }
                        ]}
                    >
                        <View style={styles.rowBetween}>
                            <View style={{ marginRight: 8 }}>
                                <Icon
                                    name={selectedItems.has(item.id) ? "checkbox" : "square-outline"}
                                    size={20}
                                    color={selectedItems.has(item.id) ? activeColors.primary : activeColors.textLight}
                                />
                            </View>
                            <View style={{ flex: 1 }}>
                                <Text style={[styles.purchaseTitle, { color: activeColors.text }]}>
                                    {item.category}{item.subCategory ? ` - ${item.subCategory}` : ''}
                                </Text>
                                <Text style={[styles.purchaseSub, { color: activeColors.textLight }]}>
                                    {item.metal} | {item.purity}{item.metal === 'SILVER' ? '' : 'K'} | {item.pcs} Pcs | Gross: {item.grossWeight.toFixed(3)}g | Less: {item.lessWeight}{item.lessWeightType === 'percentage' ? '%' : item.lessWeightType === 'amount' ? '₹' : 'g'} | Net: {item.netWeight.toFixed(3)}g
                                </Text>
                            </View>
                            <View style={{ flexDirection: 'row' }}>
                                <TouchableOpacity onPress={() => handleEditPurchase(item)} style={{ marginLeft: 8, padding: 4 }}>
                                    <Icon name="pencil-outline" size={20} color={activeColors.primary} />
                                </TouchableOpacity>
                                <TouchableOpacity onPress={() => handleRemoveItem(item.id, 'purchase')} style={{ marginLeft: 8, padding: 4 }}>
                                    <Icon name="trash-outline" size={20} color={activeColors.error} />
                                </TouchableOpacity>
                            </View>
                        </View>
                        <View style={styles.purchaseFooter}>
                            <Text style={[styles.purchasePrice, { color: activeColors.success }]}>₹ {item.amount.toLocaleString()}</Text>
                        </View>
                    </TouchableOpacity>
                ))}

                {state.chitItems.map((item) => (
                    <TouchableOpacity
                        key={item.id}
                        activeOpacity={0.7}
                        onPress={() => handleToggleSelection(item.id)}
                        style={[
                            styles.purchaseCard,
                            { backgroundColor: activeColors.cardBg, borderColor: activeColors.border },
                            selectedItems.has(item.id) && { borderColor: activeColors.primary, borderWidth: 2 }
                        ]}
                    >
                        <View style={styles.rowBetween}>
                            <View style={{ marginRight: 8 }}>
                                <Icon
                                    name={selectedItems.has(item.id) ? "checkbox" : "square-outline"}
                                    size={20}
                                    color={selectedItems.has(item.id) ? activeColors.primary : activeColors.textLight}
                                />
                            </View>
                            <View style={{ flex: 1 }}>
                                <Text style={[styles.purchaseTitle, { color: activeColors.text }]}>
                                    CHIT: {item.chitId}
                                </Text>
                            </View>
                            <View style={{ flexDirection: 'row' }}>
                                <TouchableOpacity onPress={() => handleEditChit(item)} style={{ marginLeft: 8, padding: 4 }}>
                                    <Icon name="pencil-outline" size={20} color={activeColors.primary} />
                                </TouchableOpacity>
                                <TouchableOpacity onPress={() => handleRemoveItem(item.id, 'chit')} style={{ marginLeft: 8, padding: 4 }}>
                                    <Icon name="trash-outline" size={20} color={activeColors.error} />
                                </TouchableOpacity>
                            </View>
                        </View>
                        <View style={styles.purchaseFooter}>
                            <Text style={[styles.purchasePrice, { color: activeColors.text }]}>₹ {item.amount.toLocaleString()}</Text>
                        </View>
                    </TouchableOpacity>
                ))}

                {state.advanceItems.map((item) => (
                    <TouchableOpacity
                        key={item.id}
                        activeOpacity={0.7}
                        onPress={() => handleToggleSelection(item.id)}
                        style={[
                            styles.purchaseCard,
                            { backgroundColor: activeColors.cardBg, borderColor: activeColors.border },
                            selectedItems.has(item.id) && { borderColor: activeColors.primary, borderWidth: 2 }
                        ]}
                    >
                        <View style={styles.rowBetween}>
                            <View style={{ marginRight: 8 }}>
                                <Icon
                                    name={selectedItems.has(item.id) ? "checkbox" : "square-outline"}
                                    size={20}
                                    color={selectedItems.has(item.id) ? activeColors.primary : activeColors.textLight}
                                />
                            </View>
                            <View style={{ flex: 1 }}>
                                <Text style={[styles.purchaseTitle, { color: activeColors.text }]}>
                                    ADVANCE: {item.advanceId}
                                </Text>
                            </View>
                            <View style={{ flexDirection: 'row' }}>
                                <TouchableOpacity onPress={() => handleEditAdvance(item)} style={{ marginLeft: 8, padding: 4 }}>
                                    <Icon name="pencil-outline" size={20} color={activeColors.primary} />
                                </TouchableOpacity>
                                <TouchableOpacity onPress={() => handleRemoveItem(item.id, 'advance')} style={{ marginLeft: 8, padding: 4 }}>
                                    <Icon name="trash-outline" size={20} color={activeColors.error} />
                                </TouchableOpacity>
                            </View>
                        </View>
                        <View style={styles.purchaseFooter}>
                            <Text style={[styles.purchasePrice, { color: activeColors.text }]}>₹ {item.amount.toLocaleString()}</Text>
                        </View>
                    </TouchableOpacity>
                ))}

                {state.items.length === 0 && state.purchaseItems.length === 0 && state.chitItems.length === 0 && state.advanceItems.length === 0 && (
                    <View style={styles.emptyContainer}>
                        <Text style={[styles.emptyText, { color: activeColors.textLight }]}>No items added yet</Text>
                    </View>
                )}
            </ScrollView>

            <DetailViewModal />
            <SummaryCard totals={state.totals} style={{ marginBottom: 10 }} />
        </ScreenContainer>
    );
}

const styles = StyleSheet.create({
    content: {
        flex: 1,
    },
    scrollContent: {
        padding: SPACING.md,
        paddingBottom: 220, // Adjusted padding
    },
    modeSelectorContainer: {
        flexDirection: 'row',
        height: 60,
        alignItems: 'center',
        marginVertical: SPACING.md,
        paddingHorizontal: SPACING.sm,
    },
    scrollArrow: {
        width: 36,
        height: 36,
        borderRadius: 18,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'rgba(255,255,255,0.8)',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
        zIndex: 10,
    },
    modeSelectorScroll: {
        paddingHorizontal: SPACING.sm,
        alignItems: 'center',
    },
    modeButton: {
        paddingHorizontal: SPACING.md,
        paddingVertical: 12,
        marginHorizontal: 6,
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: 25,
        minWidth: 110,
        borderWidth: 1,
        borderColor: 'rgba(0,0,0,0.05)',
    },
    modeButtonText: {
        fontSize: FONT_SIZES.sm,
        fontWeight: 'bold',
    },
    section: {
        padding: SPACING.md,
        borderRadius: BORDER_RADIUS.lg,
        marginBottom: SPACING.lg,
        elevation: 4,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.05,
        shadowRadius: 10,
        borderWidth: 1,
        borderColor: 'rgba(0,0,0,0.02)',
    },
    row: {
        flexDirection: 'row',
    },
    rowBetween: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    summaryRow: {
        flexDirection: 'row',
        marginBottom: SPACING.md,
    },
    netWeightContainer: {
        padding: SPACING.md,
        borderRadius: BORDER_RADIUS.sm,
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: SPACING.md,
    },
    netWeightLabel: {
        fontSize: FONT_SIZES.md,
    },
    netWeightValue: {
        fontSize: FONT_SIZES.md,
        fontWeight: 'bold',
    },
    purchaseAmountContainer: {
        padding: SPACING.md,
        alignItems: 'center',
        marginBottom: SPACING.md,
    },
    purchaseAmountLabel: {
        fontSize: FONT_SIZES.sm,
    },
    purchaseAmountValue: {
        fontSize: FONT_SIZES.xl,
        fontWeight: 'bold',
    },
    purchaseSummary: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: SPACING.xs,
    },
    purchaseSummaryLabel: {
        fontSize: FONT_SIZES.sm,
    },
    purchaseSummaryValue: {
        fontSize: FONT_SIZES.md,
        fontWeight: 'bold',
    },
    purchaseSummaryTotal: {
        fontSize: FONT_SIZES.lg,
        fontWeight: 'bold',
    },
    sectionTitle: {
        fontSize: FONT_SIZES.md,
        fontWeight: 'bold',
        marginBottom: SPACING.sm,
    },
    printButton: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: SPACING.md,
        paddingVertical: 8,
        borderRadius: BORDER_RADIUS.md,
    },
    printButtonText: {
        color: COLORS.white,
        fontSize: FONT_SIZES.sm,
        fontWeight: 'bold',
        marginLeft: SPACING.xs,
    },
    listHeader: {
        marginTop: SPACING.md,
        marginBottom: SPACING.sm,
        paddingHorizontal: SPACING.xs,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    listHeaderTitle: {
        fontSize: FONT_SIZES.sm,
        fontWeight: 'bold',
        textTransform: 'uppercase',
    },
    printSelectedBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: SPACING.sm,
        paddingVertical: SPACING.xs,
        borderRadius: BORDER_RADIUS.sm,
    },
    printBatchText: {
        color: '#FFF',
        fontSize: 10,
        fontWeight: 'bold',
        marginLeft: 4,
    },
    purchaseCard: {
        padding: SPACING.md,
        borderRadius: BORDER_RADIUS.md,
        marginBottom: SPACING.sm,
        borderWidth: 1,
    },
    purchaseTitle: {
        fontSize: FONT_SIZES.md,
        fontWeight: 'bold',
    },
    purchaseSub: {
        fontSize: FONT_SIZES.xs,
    },
    purchaseFooter: {
        marginTop: SPACING.sm,
        alignItems: 'flex-end',
    },
    purchasePrice: {
        fontSize: FONT_SIZES.lg,
        fontWeight: 'bold',
    },
    emptyContainer: {
        padding: SPACING.xl,
        alignItems: 'center',
    },
    emptyText: {
        fontSize: FONT_SIZES.sm,
        fontStyle: 'italic',
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'flex-end',
    },
    modalContent: {
        borderTopLeftRadius: BORDER_RADIUS.lg,
        borderTopRightRadius: BORDER_RADIUS.lg,
        padding: SPACING.lg,
        maxHeight: '80%',
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: SPACING.md,
    },
    modalTitle: {
        fontSize: FONT_SIZES.lg,
        fontWeight: 'bold',
    },
    modalBody: {
        marginBottom: SPACING.md,
    },
    detailRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        paddingVertical: SPACING.xs,
    },
    detailLabel: {
        fontSize: FONT_SIZES.sm,
    },
    detailValue: {
        fontSize: FONT_SIZES.sm,
        fontWeight: '600',
    },
    modalDivider: {
        height: 1,
        backgroundColor: '#EEE',
        marginVertical: SPACING.sm,
    },
    modalTotalRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginTop: SPACING.sm,
        paddingTop: SPACING.sm,
        borderTopWidth: 1,
        borderColor: '#EEE',
    },
    modalTotalLabel: {
        fontSize: FONT_SIZES.md,
        fontWeight: 'bold',
    },
    modalTotalValue: {
        fontSize: FONT_SIZES.lg,
        fontWeight: 'bold',
    },
    modalFooter: {
        marginTop: SPACING.md,
    },
    footerButtons: {
        flexDirection: 'row',
        marginTop: SPACING.lg,
        paddingBottom: SPACING.xl,
    },
    // Preview Modal Styles
    previewModalContent: {
        width: '90%',
        maxHeight: '80%',
        borderRadius: BORDER_RADIUS.lg,
        padding: SPACING.md,
        elevation: 10,
    },
    previewBody: {
        paddingVertical: SPACING.sm,
    },
    previewReceipt: {
        padding: SPACING.md,
        borderRadius: BORDER_RADIUS.md,
        borderWidth: 1,
        marginTop: SPACING.md,
    },
    previewHeader: {
        alignItems: 'center',
        marginBottom: SPACING.sm,
    },
    previewShopName: {
        fontSize: 18,
        fontWeight: 'bold',
        textAlign: 'center',
    },
    previewShopInfo: {
        fontSize: 10,
        textAlign: 'center',
    },
    previewSubHeader: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'space-between',
        paddingVertical: 5,
    },
    previewInfo: {
        fontSize: 10,
    },
    previewDivider: {
        height: 1,
        backgroundColor: COLORS.border,
        marginVertical: 5,
        borderStyle: 'dashed',
        borderWidth: 1,
    },
    previewRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 4,
    },
    previewFooter: {
        marginTop: 10,
        fontSize: 10,
        textAlign: 'center',
        fontStyle: 'italic',
    },
    selectAllButton: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(255,255,255,0.05)',
        paddingHorizontal: SPACING.sm,
        paddingVertical: 4,
        borderRadius: BORDER_RADIUS.sm,
        borderWidth: 1,
        borderColor: COLORS.primary,
    },
    selectAllText: {
        fontSize: 10,
        color: COLORS.primary,
        fontWeight: 'bold',
        marginLeft: 4,
    },
});
