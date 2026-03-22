import React, { useState, useCallback, useMemo } from 'react';
import { View as RNView, Text as RNText, StyleSheet, FlatList as RNFlatList, TouchableOpacity as RNRTouchableOpacity, ActivityIndicator as RNActivityIndicator, Platform, Modal as RNModal, ScrollView as RNScrollView } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { format } from 'date-fns';
import ScreenContainer from '../components/ScreenContainer';
import HeaderBar from '../components/HeaderBar';
import PrimaryButton from '../components/PrimaryButton';
import { useGeneralSettings } from '../store/GeneralSettingsContext';
import { useEstimation } from '../store/EstimationContext';
import { getFilteredEstimations, deleteEstimation, DBEstimation } from '../services/dbService';
import { useAuth } from '../store/AuthContext';
import { printEstimationReceipt, getEstimationReceiptThermalPayload } from '../services/printService';
import PrintPreviewModal from '../modals/PrintPreviewModal';
import { COLORS, SPACING, FONT_SIZES, BORDER_RADIUS, LIGHT_COLORS, DARK_COLORS } from '../constants/theme';

const View = RNView as any;
const Text = RNText as any;
const TouchableOpacity = RNRTouchableOpacity as any;
const Icon = Ionicons as any;
const FlatList = RNFlatList as any;
const ActivityIndicator = RNActivityIndicator as any;
const Modal = RNModal as any;
const ScrollView = RNScrollView as any;
const RNFlatListAny = RNFlatList as any;
import { TextInput } from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';

export default function OrdersScreen() {
    const router = useRouter();
    const { theme, t, showAlert, shopDetails, requestPrint, currentEmployeeName, receiptConfig } = useGeneralSettings();
    const { currentUser, validateSubscription } = useAuth();
    const { clearEstimation, loadEstimationIntoContext } = useEstimation();
    const activeColors = theme === 'light' ? LIGHT_COLORS : DARK_COLORS;

    const [orders, setOrders] = useState<DBEstimation[]>([]);
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
    const [isLoading, setIsLoading] = useState(false);
    const [isPrinting, setIsPrinting] = useState(false);
    const [isSharing, setIsSharing] = useState(false);
    const [previewData, setPreviewData] = useState<any>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [showFilterModal, setShowFilterModal] = useState(false);
    const [dateFilter, setDateFilter] = useState<'all' | 'today' | 'yesterday' | '7days' | '30days' | 'custom'>('all');
    const [customStart, setCustomStart] = useState(new Date().toISOString().split('T')[0]);
    const [customEnd, setCustomEnd] = useState(new Date().toISOString().split('T')[0]);
    const [showStartPicker, setShowStartPicker] = useState(false);
    const [showEndPicker, setShowEndPicker] = useState(false);
    const [selectedOrder, setSelectedOrder] = useState<DBEstimation | null>(null);
    const [selectedOrderItems, setSelectedOrderItems] = useState<any[]>([]); // Unified storage for all item types
    const [showOrderDetails, setShowOrderDetails] = useState(false);
    const [isPreviewVisible, setIsPreviewVisible] = useState(false);
    const [previewPayload, setPreviewPayload] = useState('');
    const estimationLabel = t('estimation_number') || 'Estimation #';
    const walkInLabel = t('walk_in') || 'Walk-in';

    const getOrderCustomerLabel = useCallback((customerName?: string | null, estimationNumber?: number | null) => {
        if (
            customerName &&
            customerName !== 'Walk-in' &&
            customerName !== walkInLabel &&
            !customerName.startsWith('Estimation #') &&
            !customerName.startsWith(estimationLabel)
        ) {
            return customerName;
        }

        return `${estimationLabel}${estimationNumber ?? ''}`;
    }, [estimationLabel, walkInLabel]);

    const onDateChange = (event: any, selectedDate?: Date, type: 'start' | 'end' = 'start') => {
        if (type === 'start') {
            setShowStartPicker(false);
            if (selectedDate) {
                setCustomStart(format(selectedDate, 'yyyy-MM-dd'));
            }
        } else {
            setShowEndPicker(false);
            if (selectedDate) {
                setCustomEnd(format(selectedDate, 'yyyy-MM-dd'));
            }
        }
    };


    const loadOrders = useCallback(async () => {
        setIsLoading(true);
        try {
            let start = '';
            let end = new Date().toISOString();
            const now = new Date();

            if (dateFilter === 'all') {
                start = '';
            } else if (dateFilter === 'today') {
                start = new Date(now.setHours(0, 0, 0, 0)).toISOString();
                end = new Date(now.setHours(23, 59, 59, 999)).toISOString();
            } else if (dateFilter === 'yesterday') {
                const yest = new Date(Date.now() - 86400000);
                start = new Date(yest.setHours(0, 0, 0, 0)).toISOString();
                end = new Date(yest.setHours(23, 59, 59, 999)).toISOString();
            } else if (dateFilter === '7days') {
                start = new Date(now.getTime() - 7 * 86400000).toISOString();
            } else if (dateFilter === '30days') {
                start = new Date(now.getTime() - 30 * 86400000).toISOString();
            } else if (dateFilter === 'custom') {
                start = new Date(customStart + 'T00:00:00.000Z').toISOString();
                end = new Date(customEnd + 'T23:59:59.999Z').toISOString();
            }

            const data = await getFilteredEstimations(start, end, 500);
            setOrders(data);
        } catch (error) {
            console.error('Failed to load history', error);
        } finally {
            setIsLoading(false);
        }
    }, [dateFilter, customStart, customEnd]);

    const filteredOrders = useMemo(() => {
        if (!searchQuery.trim()) return orders;
        const query = searchQuery.toLowerCase();
        return orders.filter(order => 
            order.id.toLowerCase().includes(query) || 
            (order.customerName && order.customerName.toLowerCase().includes(query)) ||
            (order.estimationNumber && order.estimationNumber.toString().includes(query))
        );
    }, [orders, searchQuery]);

    useFocusEffect(
        useCallback(() => {
            loadOrders();
            return () => { };
        }, [loadOrders])
    );

    const toggleSelection = (orderId: string) => {
        const newSelected = new Set(selectedIds);
        if (newSelected.has(orderId)) {
            newSelected.delete(orderId);
        } else {
            newSelected.add(orderId);
        }
        setSelectedIds(newSelected);
    };

    const handleViewDetails = async (order: DBEstimation) => {
        try {
            const products = JSON.parse(order.items || '[]');
            const purchases = JSON.parse(order.purchaseItems || '[]');
            const chits = JSON.parse(order.chitItems || '[]');
            const advances = JSON.parse(order.advanceItems || '[]');

            // Format into compatible structure for the modal
            const items = [
                ...products.map((p: any) => ({ type: 'PRODUCT', itemData: JSON.stringify(p) })),
                ...purchases.map((p: any) => ({ type: 'PURCHASE', itemData: JSON.stringify(p) })),
                ...chits.map((c: any) => ({ type: 'CHIT', itemData: JSON.stringify(c) })),
                ...advances.map((a: any) => ({ type: 'ADVANCE', itemData: JSON.stringify(a) }))
            ];

            setSelectedOrder(order);
            setSelectedOrderItems(items);
            setShowOrderDetails(true);
        } catch (error) {
            console.error('Details Error:', error);
            showAlert(t('error'), t('failed_to_load_details'), 'error');
        }
    };

    const handlePrint = async (orderId: string) => {
        if (!validateSubscription()) return;
        
        try {
            setIsPrinting(true);
            const order = orders.find(o => o.id === orderId);
            if (!order) return;

            const products = JSON.parse(order.items || '[]');
            const purchases = JSON.parse(order.purchaseItems || '[]');
            const chits = JSON.parse(order.chitItems || '[]');
            const advances = JSON.parse(order.advanceItems || '[]');

            const payload = await getEstimationReceiptThermalPayload(
                products,
                purchases,
                chits,
                advances,
                shopDetails,
                order.customerName,
                currentEmployeeName || t('admin') || 'Admin',
                receiptConfig,
                order.estimationNumber,
                t
            );

            setPreviewPayload(payload);
            setSelectedOrder(order);
            setPreviewData({
                ...order,
                items: products,
                purchaseItems: purchases,
                chitItems: chits,
                advanceItems: advances,
                grandTotal: order.grandTotal,
                totalWeight: order.totalWeight
            });
            setIsPreviewVisible(true);

        } catch (error: any) {
            console.error('Print Error:', error);
            showAlert(t('print_error'), error.message || t('failed_to_generate_print_preview'), 'error');
        } finally {
            setIsPrinting(false);
        }
    };

    const handleReload = async (id: string) => {
        showAlert(
            t('reload_order') || 'Reload Estimation',
            t('reload_order_msg') || 'This will clear your current estimation and load this for editing. Proceed?',
            'warning',
            [
                { text: t('cancel'), onPress: () => { }, style: 'cancel' },
                {
                    text: t('reload_btn') || 'Reload',
                    onPress: async () => {
                        try {
                            const order = orders.find(o => o.id === id);
                            if (order) {
                                loadEstimationIntoContext(order);
                                router.push('/estimation');
                            }
                        } catch (error) {
                            console.error('Reload Error:', error);
                            showAlert(t('error'), t('failed_to_reload_estimation'), 'error');
                        }
                    }
                }
            ]
        );
    };

    const handleDelete = (id: string) => {
        showAlert(
            t('delete_history') || 'Delete History',
            t('delete_history_msg') || 'Are you sure you want to delete this from history?',
            'warning',
            [
                { text: t('cancel'), onPress: () => { }, style: 'cancel' },
                {
                    text: t('delete'),
                    style: 'destructive',
                    onPress: async () => {
                        await deleteEstimation(id);
                        loadOrders();
                    }
                }
            ]
        );
    };

    const renderItem = ({ item }: { item: DBEstimation }) => (
        <TouchableOpacity
            style={[
                styles.card,
                { backgroundColor: activeColors.cardBg, borderColor: activeColors.border },
                selectedIds.has(item.id) && { borderColor: activeColors.primary, borderWidth: 1.5 }
            ]}
            onPress={() => {
                if (selectedIds.size > 0) {
                    toggleSelection(item.id);
                } else {
                    handleViewDetails(item);
                }
            }}
            onLongPress={() => toggleSelection(item.id)}
            activeOpacity={0.7}
        >
            <View style={styles.cardHeader}>
                <View style={{ flex: 1 }}>
                    <Text style={[styles.customerName, { color: activeColors.text }]} numberOfLines={1}>
                        {getOrderCustomerLabel(item.customerName, item.estimationNumber)}
                    </Text>
                    <Text style={[styles.dateText, { color: activeColors.textLight }]}>
                        {format(new Date(item.date), 'dd MMM, hh:mm a')} • {item.id.slice(-6)}
                    </Text>
                </View>
                <View style={styles.headerActions}>
                    <TouchableOpacity onPress={() => handlePrint(item.id)} style={styles.actionIcon} disabled={isPrinting}>
                        <Icon name="print-outline" size={20} color={activeColors.primary} />
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => handleReload(item.id)} style={styles.actionIcon}>
                        <Icon name="create-outline" size={20} color={COLORS.success} />
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => handleDelete(item.id)} style={styles.actionIcon}>
                        <Icon name="trash-outline" size={20} color={activeColors.error} />
                    </TouchableOpacity>
                </View>
            </View>

            <View style={[styles.divider, { backgroundColor: activeColors.border }]} />

            <View style={styles.cardFooter}>
                <Text style={[styles.employeeName, { color: activeColors.textLight }]}>
                    {item.totalWeight.toFixed(3)}g
                </Text>
                <Text style={[styles.totalAmount, { color: activeColors.success }]}>
                    ₹ {Math.round(item.grandTotal).toLocaleString()}
                </Text>
            </View>
        </TouchableOpacity>
    );

    const OrderDetailsModal = () => {
        if (!selectedOrder) return null;

        const products = selectedOrderItems.filter((i: any) => i.type === 'PRODUCT').map((i: any) => JSON.parse(i.itemData));
        const deductions = selectedOrderItems.filter((i: any) => i.type === 'CHIT' || i.type === 'ADVANCE');
        const purchases = selectedOrderItems.filter((i: any) => i.type === 'PURCHASE').map((i: any) => JSON.parse(i.itemData));

        return (
            <Modal visible={showOrderDetails} transparent animationType="slide" onRequestClose={() => setShowOrderDetails(false)}>
                <View style={styles.modalOverlay}>
                    <View style={[styles.detailsModalContent, { backgroundColor: activeColors.cardBg }]}>
                        <View style={styles.modalHeader}>
                            <View>
                                <Text style={[styles.modalTitle, { color: activeColors.primary }]}>{t('order_details') || 'Order Details'}</Text>
                                <Text style={[styles.modalSubtitle, { color: activeColors.textLight }]}>{selectedOrder.id.slice(-8)}</Text>
                            </View>
                            <TouchableOpacity onPress={() => setShowOrderDetails(false)}>
                                <Icon name="close" size={24} color={activeColors.text} />
                            </TouchableOpacity>
                        </View>

                        <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false}>
                            <View style={[styles.receiptBox, { borderColor: activeColors.border }]}>
                                {/* Header Info */}
                                <View style={styles.receiptHeader}>
                                    <Text style={[styles.shopNameSmall, { color: activeColors.primary }]}>{shopDetails.name}</Text>
                                    <Text style={[styles.receiptDate, { color: activeColors.textLight }]}>{format(new Date(selectedOrder.date), 'dd MMM yyyy, hh:mm a')}</Text>
                                </View>

                                <View style={[styles.divider, { backgroundColor: activeColors.border }]} />

                                {/* Customer Info */}
                                <View style={styles.infoRow}>
                                    <Text style={[styles.infoLabel, { color: activeColors.textLight }]}>{t('customer_label')}</Text>
                                    <Text style={[styles.infoValue, { color: activeColors.text }]}>{getOrderCustomerLabel(selectedOrder.customerName, selectedOrder.estimationNumber)}</Text>
                                </View>

                                <View style={[styles.divider, { backgroundColor: activeColors.border, marginVertical: SPACING.md }]} />

                                {/* Items Table */}
                                <View style={styles.tableHeader}>
                                    <Text style={[styles.tableHead, { flex: 2, color: activeColors.textLight }]}>{t('item_header')}</Text>
                                    <Text style={[styles.tableHead, { flex: 1, textAlign: 'right', color: activeColors.textLight }]}>{t('weight_header')}</Text>
                                    <Text style={[styles.tableHead, { flex: 1, textAlign: 'right', color: activeColors.textLight }]}>{t('total_header')}</Text>
                                </View>

                                {products.map((product: any, idx: number) => (
                                    <View key={`prod-${idx}`} style={styles.tableRow}>
                                        <Text style={[styles.itemText, { flex: 2, color: activeColors.text }]}>{product.name}</Text>
                                        <Text style={[styles.itemText, { flex: 1, textAlign: 'right', color: activeColors.text }]}>{product.grossWeight.toFixed(3)}g</Text>
                                        <Text style={[styles.itemText, { flex: 1, textAlign: 'right', color: activeColors.text }]}>₹{Math.round(product.totalValue).toLocaleString()}</Text>
                                    </View>
                                ))}

                                {products.map((product: any, idx: number) => (
                                    <View key={`prod-extra-${idx}`} style={[styles.detailCard, { backgroundColor: activeColors.background, borderColor: activeColors.border }]}>
                                        <View style={styles.detailCardHeader}>
                                            <View style={{ flex: 1 }}>
                                                <Text style={[styles.detailCardTitle, { color: activeColors.text }]}>{product.name}</Text>
                                                {!!product.subProductName && (
                                                    <Text style={[styles.detailCardSubtitle, { color: activeColors.textLight }]}>{product.subProductName}</Text>
                                                )}
                                            </View>
                                            <Text style={[styles.detailCardAmount, { color: activeColors.primary }]}>{`₹${Math.round(product.totalValue || 0).toLocaleString()}`}</Text>
                                        </View>
                                        <View style={styles.detailGrid}>
                                            <View style={[styles.detailChip, { backgroundColor: activeColors.cardBg, borderColor: activeColors.border }]}>
                                                <Text style={[styles.detailChipLabel, { color: activeColors.textLight }]}>{t('metal') || 'Metal'}</Text>
                                                <Text style={[styles.detailChipValue, { color: activeColors.text }]}>{product.metal || '-'}</Text>
                                            </View>
                                            <View style={[styles.detailChip, { backgroundColor: activeColors.primary + '10', borderColor: activeColors.primary + '25' }]}>
                                                <Text style={[styles.detailChipLabel, { color: activeColors.textLight }]}>{t('rate') || 'Rate'}</Text>
                                                <Text style={[styles.detailChipValue, { color: activeColors.primary }]}>{`₹${Math.round(product.rate || 0).toLocaleString()}`}</Text>
                                            </View>
                                            <View style={[styles.detailChip, { backgroundColor: activeColors.cardBg, borderColor: activeColors.border }]}>
                                                <Text style={[styles.detailChipLabel, { color: activeColors.textLight }]}>{t('gross_weight') || 'Gross Weight'}</Text>
                                                <Text style={[styles.detailChipValue, { color: activeColors.text }]}>{`${(product.grossWeight || 0).toFixed(3)}g`}</Text>
                                            </View>
                                            <View style={[styles.detailChip, { backgroundColor: activeColors.cardBg, borderColor: activeColors.border }]}>
                                                <Text style={[styles.detailChipLabel, { color: activeColors.textLight }]}>{t('net_weight') || 'Net Weight'}</Text>
                                                <Text style={[styles.detailChipValue, { color: activeColors.text }]}>{`${(product.netWeight || 0).toFixed(3)}g`}</Text>
                                            </View>
                                            <View style={[styles.detailChip, { backgroundColor: activeColors.cardBg, borderColor: activeColors.border }]}>
                                                <Text style={[styles.detailChipLabel, { color: activeColors.textLight }]}>{t('stone_weight') || 'Stone Weight'}</Text>
                                                <Text style={[styles.detailChipValue, { color: activeColors.text }]}>{`${(product.stoneWeight || 0).toFixed(3)}g`}</Text>
                                            </View>
                                            <View style={[styles.detailChip, { backgroundColor: activeColors.cardBg, borderColor: activeColors.border }]}>
                                                <Text style={[styles.detailChipLabel, { color: activeColors.textLight }]}>{t('less_weight') || 'Less Weight'}</Text>
                                                <Text style={[styles.detailChipValue, { color: activeColors.text }]}>{`${product.lessWeightType === 'amount' ? '₹' : ''}${product.lessWeight || 0}${product.lessWeightType === 'grams' ? 'g' : product.lessWeightType === 'percentage' ? '%' : ''}`}</Text>
                                            </View>
                                            <View style={[styles.detailChip, { backgroundColor: activeColors.cardBg, borderColor: activeColors.border }]}>
                                                <Text style={[styles.detailChipLabel, { color: activeColors.textLight }]}>{t('wastage') || 'VA'}</Text>
                                                <Text style={[styles.detailChipValue, { color: activeColors.text }]}>{`${product.wastage || 0}${product.wastageType === 'percentage' ? '%' : ''}`}</Text>
                                            </View>
                                            <View style={[styles.detailChip, { backgroundColor: activeColors.cardBg, borderColor: activeColors.border }]}>
                                                <Text style={[styles.detailChipLabel, { color: activeColors.textLight }]}>{t('making_charge') || 'MC'}</Text>
                                                <Text style={[styles.detailChipValue, { color: activeColors.text }]}>{`${product.makingCharge || 0}${product.makingChargeType === 'perGram' ? '/g' : ''}`}</Text>
                                            </View>
                                        </View>
                                    </View>
                                ))}

                                {purchases.map((item: any, idx: number) => (
                                    <View key={`purchase-extra-${idx}`} style={[styles.detailCard, { backgroundColor: activeColors.background, borderColor: activeColors.border }]}>
                                        <View style={styles.detailCardHeader}>
                                            <View style={{ flex: 1 }}>
                                                <Text style={[styles.detailCardTitle, { color: activeColors.text }]}>{item.category}</Text>
                                                <Text style={[styles.detailCardSubtitle, { color: activeColors.textLight }]}>{`${item.metal} • ${item.purity}`}</Text>
                                            </View>
                                            <Text style={[styles.detailCardAmount, { color: activeColors.error }]}>{`-₹${Math.round(item.amount || 0).toLocaleString()}`}</Text>
                                        </View>
                                        <View style={styles.detailGrid}>
                                            <View style={[styles.detailChip, { backgroundColor: activeColors.primary + '10', borderColor: activeColors.primary + '25' }]}>
                                                <Text style={[styles.detailChipLabel, { color: activeColors.textLight }]}>{t('rate') || 'Rate'}</Text>
                                                <Text style={[styles.detailChipValue, { color: activeColors.primary }]}>{`₹${Math.round(item.rate || 0).toLocaleString()}`}</Text>
                                            </View>
                                            <View style={[styles.detailChip, { backgroundColor: activeColors.cardBg, borderColor: activeColors.border }]}>
                                                <Text style={[styles.detailChipLabel, { color: activeColors.textLight }]}>{t('gross_weight') || 'Gross Weight'}</Text>
                                                <Text style={[styles.detailChipValue, { color: activeColors.text }]}>{`${(item.grossWeight || 0).toFixed(3)}g`}</Text>
                                            </View>
                                            <View style={[styles.detailChip, { backgroundColor: activeColors.cardBg, borderColor: activeColors.border }]}>
                                                <Text style={[styles.detailChipLabel, { color: activeColors.textLight }]}>{t('net_weight') || 'Net Weight'}</Text>
                                                <Text style={[styles.detailChipValue, { color: activeColors.text }]}>{`${(item.netWeight || 0).toFixed(3)}g`}</Text>
                                            </View>
                                            <View style={[styles.detailChip, { backgroundColor: activeColors.cardBg, borderColor: activeColors.border }]}>
                                                <Text style={[styles.detailChipLabel, { color: activeColors.textLight }]}>{t('less_weight') || 'Less Weight'}</Text>
                                                <Text style={[styles.detailChipValue, { color: activeColors.text }]}>{`${item.lessWeightType === 'amount' ? '₹' : ''}${item.lessWeight || 0}${item.lessWeightType === 'grams' ? 'g' : item.lessWeightType === 'percentage' ? '%' : ''}`}</Text>
                                            </View>
                                        </View>
                                    </View>
                                ))}

                                {deductions.length > 0 && (
                                    <>
                                        <View style={[styles.divider, { backgroundColor: activeColors.border, marginVertical: SPACING.md, borderStyle: 'dashed', borderWidth: 0.5 }]} />
                                        <Text style={[styles.deductionTitle, { color: activeColors.error }]}>{t('deductions_title')}</Text>
                                        {deductions.map((item: any, idx: number) => {
                                            const data = JSON.parse(item.itemData);
                                            let label = '';
                                            if (item.type === 'PURCHASE') label = `${t('old_gold')} (${data.category})`;
                                            else if (item.type === 'CHIT') label = `${t('chit')} (${data.chitId})`;
                                            else if (item.type === 'ADVANCE') label = `${t('advance')} (${data.advanceId})`;

                                            return (
                                                <View key={`ded-${idx}`} style={styles.tableRow}>
                                                    <Text style={[styles.itemText, { flex: 3, color: activeColors.textLight }]}>{label}</Text>
                                                    <Text style={[styles.itemText, { flex: 1, textAlign: 'right', color: activeColors.error }]}>-₹{Math.round(data.amount).toLocaleString()}</Text>
                                                </View>
                                            );
                                        })}
                                    </>
                                )}

                                <View style={[styles.divider, { backgroundColor: activeColors.border, marginVertical: SPACING.md }]} />

                                {/* Totals */}
                                <View style={styles.totalRow}>
                                    <Text style={[styles.totalLabel, { color: activeColors.text }]}>{t('gross_total_label')}</Text>
                                    <Text style={[styles.totalValue, { color: activeColors.text }]}>₹{Math.round(selectedOrder.grandTotal).toLocaleString()}</Text>
                                </View>
                                <View style={[styles.totalRow, styles.grandTotalRow]}>
                                    <Text style={[styles.grandTotalLabel, { color: activeColors.primary }]}>{t('net_payable_label')}</Text>
                                    <Text style={[styles.grandTotalValue, { color: activeColors.primary }]}>₹{Math.round(selectedOrder.grandTotal).toLocaleString()}</Text>
                                </View>
                            </View>
                        </ScrollView>

                        <View style={styles.modalFooter}>
                            <View style={{ flexDirection: 'row', gap: SPACING.sm }}>
                                <View style={{ flex: 1 }}>
                                    <PrimaryButton
                                        title={t('print') || "Print"}
                                        onPress={() => { setShowOrderDetails(false); handlePrint(selectedOrder.id); }}
                                    />
                                </View>
                                <View style={{ flex: 1 }}>
                                    <TouchableOpacity
                                        style={[styles.reloadBtn, { borderColor: COLORS.success }]}
                                        onPress={() => { setShowOrderDetails(false); handleReload(selectedOrder.id); }}
                                    >
                                        <Icon name="create-outline" size={20} color={COLORS.success} />
                                        <Text style={[styles.reloadText, { color: COLORS.success }]}>{t('reload_btn')}</Text>
                                    </TouchableOpacity>
                                </View>
                            </View>
                        </View>
                    </View>
                </View>
            </Modal>
        );
    };

    return (
        <ScreenContainer backgroundColor={activeColors.background}>
            <HeaderBar
                title={t('orders_history')}
                rightAction={
                    <TouchableOpacity onPress={() => loadOrders()} style={{ paddingHorizontal: SPACING.sm }}>
                        <Icon name="refresh" size={22} color={activeColors.primary} />
                    </TouchableOpacity>
                }
            />

            <View style={[styles.searchFilterRow, { backgroundColor: activeColors.cardBg, borderColor: activeColors.border }]}>
                <View style={[styles.searchContainer, { backgroundColor: activeColors.background }]}>
                    <Icon name="search-outline" size={18} color={activeColors.textLight} />
                    <TextInput
                        style={[styles.searchInput, { color: activeColors.text }]}
                        placeholder={t('search_order') || "Search by ID or Name"}
                        placeholderTextColor={activeColors.textLight}
                        value={searchQuery}
                        onChangeText={setSearchQuery}
                    />
                    {searchQuery.length > 0 && (
                        <TouchableOpacity onPress={() => setSearchQuery('')}>
                            <Icon name="close-circle" size={18} color={activeColors.textLight} />
                        </TouchableOpacity>
                    )}
                </View>
                
                <TouchableOpacity 
                    style={[styles.filterButton, { backgroundColor: activeColors.primary }]}
                    onPress={() => setShowFilterModal(true)}
                >
                    <Icon name="filter-outline" size={18} color={COLORS.white} />
                    <Text style={styles.filterButtonText}>
                        {dateFilter === 'all' ? t('all') : 
                         dateFilter === 'today' ? t('today') : 
                         dateFilter === 'yesterday' ? t('yesterday') : 
                         dateFilter === '7days' ? t('last_7_days') : 
                         dateFilter === '30days' ? t('last_month') : t('custom_range')}
                    </Text>
                    <Icon name="chevron-down" size={14} color={COLORS.white} />
                </TouchableOpacity>
            </View>

            <Modal visible={showFilterModal} transparent animationType="fade" onRequestClose={() => setShowFilterModal(false)}>
                <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setShowFilterModal(false)}>
                    <View style={[styles.filterModalContent, { backgroundColor: activeColors.cardBg }]}>
                        <Text style={[styles.filterModalTitle, { color: activeColors.primary }]}>{t('select_filter')}</Text>
                        {[
                            { id: 'all', label: t('all') },
                            { id: 'today', label: t('today') },
                            { id: 'yesterday', label: t('yesterday') },
                            { id: '7days', label: t('last_7_days') },
                            { id: '30days', label: t('last_month') },
                            { id: 'custom', label: t('custom_range') },
                        ].map((item) => (
                            <TouchableOpacity 
                                key={item.id}
                                style={[
                                    styles.filterOption, 
                                    dateFilter === item.id && { backgroundColor: activeColors.primary + '15' }
                                ]}
                                onPress={() => {
                                    setDateFilter(item.id as any);
                                    setShowFilterModal(false);
                                }}
                            >
                                <Text style={[
                                    styles.filterOptionText, 
                                    { color: activeColors.text },
                                    dateFilter === item.id && { color: activeColors.primary, fontWeight: 'bold' }
                                ]}>
                                    {item.label}
                                </Text>
                                {dateFilter === item.id && <Icon name="checkmark" size={18} color={activeColors.primary} />}
                            </TouchableOpacity>
                        ))}
                    </View>
                </TouchableOpacity>
            </Modal>

            {dateFilter === 'custom' && (
                <View style={styles.customDateContainer}>
                    <TouchableOpacity
                        style={styles.dateInputWrapper}
                        onPress={() => setShowStartPicker(true)}
                    >
                        <Text style={[styles.dateLabel, { color: activeColors.textLight }]}>{t('from_date') || 'From'}</Text>
                        <View style={[styles.dateInput, { borderColor: activeColors.border, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }]}>
                            <Text style={{ color: activeColors.text, fontSize: 12 }}>{customStart}</Text>
                            <Icon name="calendar-outline" size={16} color={activeColors.primary} />
                        </View>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={styles.dateInputWrapper}
                        onPress={() => setShowEndPicker(true)}
                    >
                        <Text style={[styles.dateLabel, { color: activeColors.textLight }]}>{t('to_date') || 'To'}</Text>
                        <View style={[styles.dateInput, { borderColor: activeColors.border, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }]}>
                            <Text style={{ color: activeColors.text, fontSize: 12 }}>{customEnd}</Text>
                            <Icon name="calendar-outline" size={16} color={activeColors.primary} />
                        </View>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={[styles.applyBtn, { backgroundColor: activeColors.primary }]}
                        onPress={() => loadOrders()}
                    >
                        <Icon name="checkmark" size={20} color={COLORS.white} />
                    </TouchableOpacity>
                </View>
            )}

            {showStartPicker && (
                <DateTimePicker
                    value={new Date(customStart)}
                    mode="date"
                    display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                    onChange={(e, date) => onDateChange(e, date, 'start')}
                />
            )}

            {showEndPicker && (
                <DateTimePicker
                    value={new Date(customEnd)}
                    mode="date"
                    display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                    onChange={(e, date) => onDateChange(e, date, 'end')}
                />
            )}

            {isLoading ? (
                <View style={styles.center}>
                    <ActivityIndicator size="large" color={activeColors.primary} />
                </View>
            ) : filteredOrders.length === 0 ? (
                <View style={styles.center}>
                    <Icon name="search-outline" size={48} color={activeColors.border} />
                    <Text style={{ color: activeColors.textLight, marginTop: 8 }}>{t('no_history_found')}</Text>
                </View>
            ) : (
                <FlatList
                    data={filteredOrders}
                    keyExtractor={(item: DBEstimation) => item.id}
                    contentContainerStyle={{ paddingBottom: 100, paddingTop: SPACING.md }}
                    renderItem={renderItem}
                />
            )}

            <PrintPreviewModal
                visible={isPreviewVisible}
                onClose={() => setIsPreviewVisible(false)}
                onPrint={async () => {
                    try {
                        const { BLEPrinter } = require('react-native-thermal-receipt-printer');
                        await BLEPrinter.printText(previewPayload);
                        setIsPreviewVisible(false);
                        showAlert(t('success'), t('printed_success') || 'Printed successfully', 'success');
                    } catch (error) {
                        showAlert(t('print_error'), t('failed_to_send_data_to_printer'), 'error');
                    }
                }}
                thermalPayload={previewPayload}
                title={(t('estimation_slip') || 'Estimation Slip') + " #" + selectedOrder?.estimationNumber}
                data={previewData}

            />


            <OrderDetailsModal />
        </ScreenContainer>
    );
}

const styles = StyleSheet.create({
    center: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    card: {
        marginHorizontal: SPACING.md,
        padding: SPACING.md,
        borderRadius: BORDER_RADIUS.md,
        borderWidth: 1,
        marginBottom: SPACING.md,
    },
    cardHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    headerActions: {
        flexDirection: 'row',
    },
    actionIcon: {
        marginLeft: SPACING.sm,
        padding: 4,
    },
    customerName: {
        fontSize: FONT_SIZES.md,
        fontWeight: 'bold',
    },
    dateText: {
        fontSize: 10,
    },
    divider: {
        height: 1,
        marginVertical: SPACING.sm,
    },
    cardFooter: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    employeeName: {
        fontSize: FONT_SIZES.sm,
    },
    totalAmount: {
        fontSize: FONT_SIZES.lg,
        fontWeight: 'bold',
    },
    customDateContainer: {
        flexDirection: 'row',
        paddingHorizontal: SPACING.md,
        paddingVertical: SPACING.sm,
        alignItems: 'flex-end',
        borderBottomWidth: 1,
        borderBottomColor: COLORS.border,
        gap: 8,
    },
    dateInputWrapper: {
        flex: 1,
    },
    applyBtn: {
        width: 44,
        height: 38,
        borderRadius: BORDER_RADIUS.sm,
        justifyContent: 'center',
        alignItems: 'center',
    },
    dateLabel: {
        fontSize: 11,
        marginBottom: 4,
        fontWeight: '600',
    },
    dateInput: {
        borderWidth: 1,
        borderRadius: BORDER_RADIUS.sm,
        paddingHorizontal: 10,
        height: 38,
        fontSize: FONT_SIZES.sm,
    },
    searchFilterRow: {
        flexDirection: 'row',
        padding: SPACING.sm,
        paddingHorizontal: SPACING.md,
        alignItems: 'center',
        gap: 10,
        borderBottomWidth: 1,
    },
    searchContainer: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 12,
        height: 40,
        borderRadius: BORDER_RADIUS.md,
    },
    searchInput: {
        flex: 1,
        marginLeft: 8,
        fontSize: FONT_SIZES.sm,
        height: '100%',
    },
    filterButton: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 12,
        height: 40,
        borderRadius: BORDER_RADIUS.md,
        gap: 6,
    },
    filterButtonText: {
        color: COLORS.white,
        fontSize: FONT_SIZES.xs,
        fontWeight: 'bold',
    },
    filterModalContent: {
        width: '80%',
        maxWidth: 300,
        borderRadius: BORDER_RADIUS.lg,
        padding: SPACING.md,
        elevation: 5,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 3.84,
    },
    filterModalTitle: {
        fontSize: FONT_SIZES.md,
        fontWeight: 'bold',
        marginBottom: SPACING.sm,
    },
    filterOption: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 12,
        paddingHorizontal: 10,
        borderRadius: BORDER_RADIUS.sm,
    },
    filterOptionText: {
        fontSize: FONT_SIZES.sm,
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.22)',
        justifyContent: 'center',
        padding: SPACING.md,
    },
    detailsModalContent: {
        maxHeight: '88%',
        width: '100%',
        maxWidth: 620,
        alignSelf: 'center',
        borderRadius: BORDER_RADIUS.lg,
        padding: SPACING.md,
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
    detailRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: SPACING.sm,
    },
    detailLabel: {
        fontSize: FONT_SIZES.sm,
    },
    detailValue: {
        fontSize: FONT_SIZES.md,
        fontWeight: 'bold',
    },
    modalFooter: {
        marginTop: SPACING.md,
        paddingBottom: SPACING.lg,
    },
    receiptBox: {
        padding: SPACING.md,
        borderWidth: 1,
        borderRadius: BORDER_RADIUS.md,
        backgroundColor: '#fff', // Receipt look
    },
    receiptHeader: {
        alignItems: 'center',
        marginBottom: SPACING.sm,
    },
    shopNameSmall: {
        fontSize: FONT_SIZES.md,
        fontWeight: 'bold',
        textTransform: 'uppercase',
    },
    receiptDate: {
        fontSize: 10,
    },
    infoRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 2,
    },
    infoLabel: {
        fontSize: 11,
    },
    infoValue: {
        fontSize: 11,
        fontWeight: '600',
    },
    tableHeader: {
        flexDirection: 'row',
        paddingBottom: 4,
        borderBottomWidth: 1,
        borderBottomColor: '#eee',
    },
    tableHead: {
        fontSize: 10,
        fontWeight: 'bold',
    },
    tableRow: {
        flexDirection: 'row',
        paddingVertical: 6,
        borderBottomWidth: 0.5,
        borderBottomColor: '#f9f9f9',
    },
    itemText: {
        fontSize: 12,
    },
    detailCard: {
        marginTop: SPACING.sm,
        borderWidth: 1,
        borderRadius: BORDER_RADIUS.md,
        padding: SPACING.sm,
    },
    detailCardHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: SPACING.sm,
    },
    detailCardTitle: {
        fontSize: FONT_SIZES.sm,
        fontWeight: '700',
    },
    detailCardSubtitle: {
        fontSize: FONT_SIZES.xs,
        marginTop: 2,
    },
    detailCardAmount: {
        fontSize: FONT_SIZES.sm,
        fontWeight: '700',
        marginLeft: SPACING.sm,
    },
    detailGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'space-between',
    },
    detailChip: {
        width: '48.5%',
        borderWidth: 1,
        borderRadius: BORDER_RADIUS.sm,
        paddingHorizontal: SPACING.sm,
        paddingVertical: SPACING.xs,
        marginBottom: SPACING.xs,
    },
    detailChipLabel: {
        fontSize: 10,
        fontWeight: '600',
        marginBottom: 2,
    },
    detailChipValue: {
        fontSize: FONT_SIZES.xs,
        fontWeight: '700',
    },
    deductionTitle: {
        fontSize: 10,
        fontWeight: 'bold',
        textTransform: 'uppercase',
        marginBottom: 4,
    },
    totalRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        paddingVertical: 2,
    },
    totalLabel: {
        fontSize: 12,
    },
    totalValue: {
        fontSize: 12,
        fontWeight: '600',
    },
    grandTotalRow: {
        marginTop: SPACING.sm,
        paddingTop: SPACING.sm,
        borderTopWidth: 2,
        borderTopColor: '#333',
    },
    grandTotalLabel: {
        fontSize: FONT_SIZES.md,
        fontWeight: 'bold',
    },
    grandTotalValue: {
        fontSize: FONT_SIZES.lg,
        fontWeight: '800',
    },
    reloadBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        padding: SPACING.md,
        borderRadius: BORDER_RADIUS.md,
        borderWidth: 1.5,
        height: 50, // Match PrimaryButton
    },
    reloadText: {
        marginLeft: SPACING.sm,
        fontSize: FONT_SIZES.md,
        fontWeight: 'bold',
    },
    modalSubtitle: {
        fontSize: 10,
    }
});
