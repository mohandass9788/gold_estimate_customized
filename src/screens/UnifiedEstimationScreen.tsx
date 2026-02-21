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
import { getPurchaseCategories, getPurchaseSubCategories, DBPurchaseCategory, DBPurchaseSubCategory } from '../services/dbService';
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
    const { state, addTagItem, addManualItem, addPurchaseItem, addChitItem, addAdvanceItem, removeItem, clearEstimation } = useEstimation();
    const { theme, t, shopDetails, deviceName } = useGeneralSettings();
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
    const [scrollOffset, setScrollOffset] = useState(0);
    const [contentWidth, setContentWidth] = useState(0);
    const [containerWidth, setContainerWidth] = useState(0);
    const modeScrollRef = React.useRef<any>(null);

    const activeColors = theme === 'light' ? LIGHT_COLORS : DARK_COLORS;

    // Form State
    const [customerName, setCustomerName] = useState('');
    const [employeeName, setEmployeeName] = useState('');

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

                // Check for duplicates in the list
                const existingItem = state.items.find(item => item.tagNumber === scannedProduct.tagNumber);

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
        if (purchaseCategoryId) {
            const loadSubCategories = async () => {
                const subs = await getPurchaseSubCategories(parseInt(purchaseCategoryId));
                setSubCategories(subs);
                setPurchaseSubCategoryId(''); // Reset sub when category changes
            };
            loadSubCategories();
        } else {
            setSubCategories([]);
        }
    }, [purchaseCategoryId]);


    // Auto-fill rate based on purity
    useEffect(() => {
        if (state.goldRate) {
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
        if (!employeeName.trim()) {
            Alert.alert(t('operator_required') || 'Operator Required', t('enter_operator_msg') || 'Please enter employee name before printing.');
            return;
        }

        if (selectedItems.size === 0) {
            Alert.alert(t('no_items_selected') || 'No Items Selected');
            return;
        }

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

        // Validation removed: Chit and Advance items can now be printed with product items

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
    };

    const confirmPrint = async () => {
        setIsPrinting(true);
        setShowPrintPreview(false);
        try {
            if (previewType === 'merged') {
                await printEstimationReceipt(itemsToPrint, purchaseItemsToPrint, chitItemsToPrint, advanceItemsToPrint, { ...shopDetails, deviceName }, customerName, employeeName);

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
                        employeeName,
                        date: new Date().toISOString(),
                        grossTotal: totalGross,
                        netPayable,
                        status: 'completed'
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
                for (const item of itemsToPrint) await printEstimationItem(item, shopDetails);
                for (const item of purchaseItemsToPrint) await printPurchaseItem(item, shopDetails);
                for (const item of chitItemsToPrint) await printChitItem(item, shopDetails);
                for (const item of advanceItemsToPrint) await printAdvanceItem(item, shopDetails);
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
        removeItem(item.id, 'estimation');
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
        if (!purchaseCategoryId || !purchaseGross || !purchaseRate) {
            Alert.alert('Error', t('field_required'));
            return;
        }

        const categoryName = categories.find(c => c.id.toString() === purchaseCategoryId)?.name || '';
        const subCategoryName = subCategories.find(s => s.id.toString() === purchaseSubCategoryId)?.name || '';

        const amount = purchaseNetWeight * parseFloat(purchaseRate);
        const item: PurchaseItem = {
            id: Date.now().toString(),
            category: categoryName,
            subCategory: subCategoryName,
            purity: parseFloat(purchasePurity),
            pcs: parseInt(purchasePcs),
            grossWeight: parseFloat(purchaseGross),
            lessWeight: parseFloat(purchaseLess),
            lessWeightType: purchaseLessType,
            netWeight: purchaseNetWeight,
            rate: parseFloat(purchaseRate),
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
                        // We need a way to clear just the items from the context without saving
                        // Since useEstimation doesn't expose a direct 'reset' that doesn't save, 
                        // we might need to rely on clearEstimation but modify it or add a new method.
                        // For now, we'll try to use the existing clearEstimation but WITHOUT saving history if possible,
                        // OR (better) strict adherence to user request "Clear added item list". 

                        // Actually, looking at context in previous turns, clearEstimation DOES save history. 
                        // We need to implement a "clearCurrent" if it doesn't exist. 
                        // Checking context usage: 
                        // state.items.forEach(i => removeItem(i.id, 'estimation'));
                        // state.purchaseItems.forEach(i => removeItem(i.id, 'purchase'));

                        // A loop is inefficient but works without context changes for now.
                        // Ideally we should add a 'reset' action to context. 
                        // Let's assume for this step we will iterate remove.

                        // WAIT: The user said "Reset button... delete added item list... keeping here erase".
                        // And "reset logic... clear only added items list".

                        // We will clear existing items.
                        state.items.forEach(i => removeItem(i.id, 'estimation'));
                        state.purchaseItems.forEach(i => removeItem(i.id, 'purchase'));
                        state.chitItems.forEach(i => removeItem(i.id, 'chit'));
                        state.advanceItems.forEach(i => removeItem(i.id, 'advance'));

                        // Also clear purchase form just in case
                        clearPurchaseForm();
                        Alert.alert('Reset', 'Items list cleared.');
                    }
                }
            ]
        );
    };

    const generateHtmlForCurrentEstimation = () => {
        // Simple HTML generation for current items
        const rows = state.items.map(i =>
            `<div>${i.name} (${i.netWeight.toFixed(3)}g) - Rs.${i.totalValue.toLocaleString()}</div>`
        ).join('');

        const purchaseRows = state.purchaseItems.map(p =>
            `<div>${p.category} (${p.netWeight.toFixed(3)}g) - Rs.${p.amount.toLocaleString()}</div>`
        ).join('');

        return `
            <html>
                <body style="font-family: sans-serif; padding: 20px;">
                    <h2 style="text-align:center;">Estimation</h2>
                    <h3 style="text-align:center;">${shopDetails?.name || 'Gold Estimation'}</h3>
                    <div style="margin-bottom:20px;">
                        <div>Date: ${new Date().toLocaleString()}</div>
                        ${customerName ? `<div>Customer: ${customerName}</div>` : ''}
                    </div>
                    <h4>Items</h4>
                    ${rows}
                    ${purchaseRows ? `<h4>Purchase / Exchange</h4>${purchaseRows}` : ''}
                    <hr/>
                    <div style="font-weight:bold; font-size:18px; text-align:right;">
                        Grand Total: Rs. ${state.totals.grandTotal.toLocaleString()}
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
            style={[styles.modeButton, active && { backgroundColor: activeColors.primary + '20', borderBottomColor: activeColors.primary, borderBottomWidth: 2 }]}
            onPress={onPress}
        >
            <Text style={[styles.modeButtonText, { color: activeColors.textLight }, active && { color: activeColors.primary }]}>
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
                                    try {
                                        await printEstimationItem(viewingItem, shopDetails);
                                    } catch (e: any) {
                                        Alert.alert('Error', e.message);
                                    }
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
                                <Text style={[styles.previewInfo, { color: activeColors.textLight }]}>Date: {new Date().toLocaleDateString()}</Text>
                                {customerName ? <Text style={[styles.previewInfo, { color: activeColors.textLight }]}>Cust: {customerName}</Text> : null}
                                {employeeName ? <Text style={[styles.previewInfo, { color: activeColors.textLight }]}>By: {employeeName}</Text> : null}
                            </View>
                            <View style={styles.previewDivider} />
                            {/* Preview Body - Items */}
                            {itemsToPrint.map((item, index) => (
                                <View key={item.id} style={styles.previewRow}>
                                    <View style={{ flex: 1 }}>
                                        <Text style={{ fontSize: 10, fontWeight: 'bold' }}>{item.name} {item.subProductName ? `(${item.subProductName})` : ''}</Text>
                                        <Text style={{ fontSize: 8, color: '#666' }}>{item.netWeight.toFixed(3)}g x ₹{item.rate.toLocaleString()}</Text>
                                    </View>
                                    <Text style={{ fontSize: 10, fontWeight: 'bold' }}>₹ {item.totalValue.toLocaleString()}</Text>
                                </View>
                            ))}

                            <View style={styles.previewDivider} />

                            {/* Totals Section */}
                            <View style={styles.previewRow}>
                                <Text style={styles.previewInfo}>Gross Total:</Text>
                                <Text style={[styles.previewInfo, { fontWeight: 'bold' }]}>₹ {itemsToPrint.reduce((s, i) => s + i.totalValue, 0).toLocaleString()}</Text>
                            </View>

                            {purchaseItemsToPrint.length > 0 && (
                                <View style={styles.previewRow}>
                                    <Text style={styles.previewInfo}>Old Gold Deduction:</Text>
                                    <Text style={[styles.previewInfo, { color: 'red' }]}>- ₹ {purchaseItemsToPrint.reduce((s, i) => s + i.amount, 0).toLocaleString()}</Text>
                                </View>
                            )}

                            {chitItemsToPrint.length > 0 && (
                                <View style={styles.previewRow}>
                                    <Text style={styles.previewInfo}>Chit Deduction:</Text>
                                    <Text style={[styles.previewInfo, { color: 'red' }]}>- ₹ {chitItemsToPrint.reduce((s, i) => s + i.amount, 0).toLocaleString()}</Text>
                                </View>
                            )}

                            {advanceItemsToPrint.length > 0 && (
                                <View style={styles.previewRow}>
                                    <Text style={styles.previewInfo}>Advance Deduction:</Text>
                                    <Text style={[styles.previewInfo, { color: 'red' }]}>- ₹ {advanceItemsToPrint.reduce((s, i) => s + i.amount, 0).toLocaleString()}</Text>
                                </View>
                            )}

                            <View style={styles.previewDivider} />

                            <View style={styles.previewRow}>
                                <Text style={{ fontSize: 12, fontWeight: 'bold' }}>Net Payable:</Text>
                                <Text style={{ fontSize: 14, fontWeight: 'bold' }}>₹ {(
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
                            label={t('employee_name') || 'Employee Name'}
                            value={employeeName}
                            onChangeText={setEmployeeName}
                            style={{ flex: 1 }}
                        />
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
                            <TouchableOpacity onPress={() => handleRemoveItem(item.id, 'purchase')} style={{ marginLeft: 8 }}>
                                <Icon name="trash-outline" size={20} color={activeColors.error} />
                            </TouchableOpacity>
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
                            <TouchableOpacity onPress={() => handleRemoveItem(item.id, 'chit')} style={{ marginLeft: 8 }}>
                                <Icon name="trash-outline" size={20} color={activeColors.error} />
                            </TouchableOpacity>
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
                            <TouchableOpacity onPress={() => handleRemoveItem(item.id, 'advance')} style={{ marginLeft: 8 }}>
                                <Icon name="trash-outline" size={20} color={activeColors.error} />
                            </TouchableOpacity>
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
        borderBottomWidth: 1,
        height: 50,
        alignItems: 'center',
    },
    scrollArrow: {
        width: 30,
        height: '100%',
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'rgba(0,0,0,0.02)',
        zIndex: 10,
    },
    modeSelectorScroll: {
        paddingHorizontal: SPACING.sm,
        alignItems: 'center',
    },
    modeButton: {
        paddingHorizontal: SPACING.md,
        paddingVertical: 10,
        marginHorizontal: 4,
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: BORDER_RADIUS.sm,
        minWidth: 100,
    },
    modeButtonText: {
        fontSize: FONT_SIZES.sm,
        fontWeight: 'bold',
    },
    section: {
        padding: SPACING.md,
        borderRadius: BORDER_RADIUS.md,
        marginBottom: SPACING.lg,
        elevation: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
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
