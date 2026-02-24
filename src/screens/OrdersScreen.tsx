import React, { useState, useCallback } from 'react';
import { View as RNView, Text as RNText, StyleSheet, FlatList as RNFlatList, TouchableOpacity as RNRTouchableOpacity, Alert, ActivityIndicator as RNActivityIndicator, Platform, Modal as RNModal, ScrollView as RNScrollView } from 'react-native';
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
import { getFilteredOrders, getOrderDetails, deleteOrder, DBOrder, DBOrderItem } from '../services/dbService';
import { printEstimationReceipt } from '../services/printService';
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

export default function OrdersScreen() {
    const router = useRouter();
    const { theme, t, shopDetails, requestPrint, currentEmployeeName } = useGeneralSettings();
    const { clearEstimation, loadEstimationIntoContext } = useEstimation();
    const activeColors = theme === 'light' ? LIGHT_COLORS : DARK_COLORS;

    const [orders, setOrders] = useState<DBOrder[]>([]);
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
    const [isLoading, setIsLoading] = useState(false);
    const [isPrinting, setIsPrinting] = useState(false);
    const [isSharing, setIsSharing] = useState(false);
    const [dateFilter, setDateFilter] = useState<'today' | 'yesterday' | '7days' | '30days' | 'custom'>('today');
    const [customStart, setCustomStart] = useState(new Date().toISOString().split('T')[0]);
    const [customEnd, setCustomEnd] = useState(new Date().toISOString().split('T')[0]);
    const [selectedOrder, setSelectedOrder] = useState<DBOrder | null>(null);
    const [selectedOrderItems, setSelectedOrderItems] = useState<DBOrderItem[]>([]);
    const [showOrderDetails, setShowOrderDetails] = useState(false);

    const loadOrders = useCallback(async () => {
        setIsLoading(true);
        try {
            let start = '';
            let end = new Date().toISOString();
            const now = new Date();

            if (dateFilter === 'today') {
                start = new Date(now.setHours(0, 0, 0, 0)).toISOString();
                end = new Date(now.setHours(23, 59, 59, 999)).toISOString();
            } else if (dateFilter === 'yesterday') {
                const yest = new Date(Date.now() - 86400000);
                start = new Date(yest.setHours(0, 0, 0, 0)).toISOString();
                end = new Date(yest.setHours(23, 59, 59, 999)).toISOString();
            } else if (dateFilter === '7days') {
                start = new Date(Date.now() - 7 * 86400000).toISOString();
            } else if (dateFilter === '30days') {
                start = new Date(Date.now() - 30 * 86400000).toISOString();
            } else if (dateFilter === 'custom') {
                start = new Date(customStart + 'T00:00:00.000Z').toISOString();
                end = new Date(customEnd + 'T23:59:59.999Z').toISOString();
            }

            const data = await getFilteredOrders(start, end, 100);
            setOrders(data);
        } catch (error) {
            console.error('Failed to load orders', error);
        } finally {
            setIsLoading(false);
        }
    }, [dateFilter, customStart, customEnd]);

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

    const handleViewDetails = async (order: DBOrder) => {
        try {
            const { items } = await getOrderDetails(order.orderId);
            setSelectedOrder(order);
            setSelectedOrderItems(items);
            setShowOrderDetails(true);
        } catch (error) {
            Alert.alert('Error', 'Failed to load order details');
        }
    };

    const handlePrint = async (orderId: string) => {
        requestPrint(async (empName) => {
            setIsPrinting(true);
            try {
                const { order, items } = await getOrderDetails(orderId);
                const products = items.filter(i => i.type === 'PRODUCT').map(i => JSON.parse(i.itemData));
                const purchases = items.filter(i => i.type === 'PURCHASE').map(i => JSON.parse(i.itemData));
                const chits = items.filter(i => i.type === 'CHIT').map(i => JSON.parse(i.itemData));
                const advances = items.filter(i => i.type === 'ADVANCE').map(i => JSON.parse(i.itemData));

                await printEstimationReceipt(products, purchases, chits, advances, shopDetails, order.customerName, empName, undefined, undefined, t);
            } catch (error: any) {
                Alert.alert('Print Error', error.message || 'Failed to print');
            } finally {
                setIsPrinting(false);
            }
        });
    };

    const handleReload = async (orderId: string) => {
        Alert.alert(
            'Reload Order',
            'This will clear your current estimation and load this order for editing. Proceed?',
            [
                { text: t('cancel'), style: 'cancel' },
                {
                    text: 'Reload',
                    onPress: async () => {
                        try {
                            const { order, items } = await getOrderDetails(orderId);

                            // Map order products back to EstimationItem format if needed
                            // Actually, loadEstimationIntoContext expects a DBEstimation.
                            // We can construct a mock DBEstimation from order details or fetch from estimations table.
                            // Let's fetch the original estimation if possible, or construct it.

                            const { getFilteredEstimations } = require('../services/dbService');
                            const ests = await getFilteredEstimations();
                            const originalEst = ests.find((e: any) => e.estimationNumber === order.estimationNumber);

                            if (originalEst) {
                                loadEstimationIntoContext(originalEst, order.orderId);
                            } else {
                                // Fallback: construct from order if original estimation not found
                                const mockEst: any = {
                                    id: order.orderId, // Use orderId as ID if original missing
                                    customerName: order.customerName,
                                    customerMobile: order.customerMobile,
                                    date: order.date,
                                    items: JSON.stringify(items.filter(i => i.type === 'PRODUCT').map(i => JSON.parse(i.itemData))),
                                    purchaseItems: JSON.stringify(items.filter(i => i.type === 'PURCHASE').map(i => JSON.parse(i.itemData))),
                                    chitItems: JSON.stringify(items.filter(i => i.type === 'CHIT').map(i => JSON.parse(i.itemData))),
                                    advanceItems: JSON.stringify(items.filter(i => i.type === 'ADVANCE').map(i => JSON.parse(i.itemData))),
                                    totalWeight: 0, // Calculations will handle this
                                    grandTotal: order.netPayable,
                                    estimationNumber: order.estimationNumber
                                };
                                loadEstimationIntoContext(mockEst as any, order.orderId);
                            }
                            router.push('/estimation');
                        } catch (error) {
                            console.error('Reload Error:', error);
                            Alert.alert('Error', 'Failed to reload order');
                        }
                    }
                }
            ]
        );
    };

    const handleDelete = (orderId: string) => {
        Alert.alert(
            'Delete Order',
            'Are you sure you want to delete this order from history?',
            [
                { text: t('cancel'), style: 'cancel' },
                {
                    text: 'Delete',
                    style: 'destructive',
                    onPress: async () => {
                        await deleteOrder(orderId);
                        loadOrders();
                    }
                }
            ]
        );
    };

    const renderItem = ({ item }: { item: DBOrder }) => (
        <TouchableOpacity
            style={[
                styles.card,
                { backgroundColor: activeColors.cardBg, borderColor: activeColors.border },
                selectedIds.has(item.orderId) && { borderColor: activeColors.primary, borderWidth: 1.5 }
            ]}
            onPress={() => {
                if (selectedIds.size > 0) {
                    toggleSelection(item.orderId);
                } else {
                    handleViewDetails(item);
                }
            }}
            onLongPress={() => toggleSelection(item.orderId)}
            activeOpacity={0.7}
        >
            <View style={styles.cardHeader}>
                <View>
                    <Text style={[styles.customerName, { color: activeColors.text }]}>
                        {item.customerName && item.customerName !== 'Walk-in' ? item.customerName : (t('estimation_number') || 'Estimation #') + item.estimationNumber}
                    </Text>
                    <Text style={[styles.dateText, { color: activeColors.textLight }]}>
                        {format(new Date(item.date), 'hh:mm a')} • {item.orderId}
                    </Text>
                </View>
                <View style={styles.headerActions}>
                    <TouchableOpacity onPress={() => handlePrint(item.orderId)} style={styles.actionIcon} disabled={isPrinting}>
                        <Icon name="print-outline" size={20} color={activeColors.primary} />
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => handleReload(item.orderId)} style={styles.actionIcon}>
                        <Icon name="create-outline" size={20} color={COLORS.success} />
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => handleDelete(item.orderId)} style={styles.actionIcon}>
                        <Icon name="trash-outline" size={20} color={activeColors.error} />
                    </TouchableOpacity>
                </View>
            </View>

            <View style={[styles.divider, { backgroundColor: activeColors.border }]} />

            <View style={styles.cardFooter}>
                <Text style={[styles.employeeName, { color: activeColors.textLight }]}>
                    By: {item.employeeName}
                </Text>
                <Text style={[styles.totalAmount, { color: activeColors.success }]}>
                    ₹ {item.netPayable.toLocaleString()}
                </Text>
            </View>
        </TouchableOpacity>
    );

    const OrderDetailsModal = () => {
        if (!selectedOrder) return null;

        const products = selectedOrderItems.filter(i => i.type === 'PRODUCT').map(i => JSON.parse(i.itemData));
        const deductions = selectedOrderItems.filter(i => i.type !== 'PRODUCT');

        return (
            <Modal visible={showOrderDetails} transparent animationType="slide" onRequestClose={() => setShowOrderDetails(false)}>
                <View style={styles.modalOverlay}>
                    <View style={[styles.detailsModalContent, { backgroundColor: activeColors.cardBg }]}>
                        <View style={styles.modalHeader}>
                            <View>
                                <Text style={[styles.modalTitle, { color: activeColors.primary }]}>{t('order_details') || 'Order Details'}</Text>
                                <Text style={[styles.modalSubtitle, { color: activeColors.textLight }]}>{selectedOrder.orderId}</Text>
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
                                    <Text style={[styles.infoValue, { color: activeColors.text }]}>{selectedOrder.customerName && selectedOrder.customerName !== 'Walk-in' ? selectedOrder.customerName : (t('estimation_number') || 'Estimation #') + selectedOrder.estimationNumber}</Text>
                                </View>
                                <View style={styles.infoRow}>
                                    <Text style={[styles.infoLabel, { color: activeColors.textLight }]}>{t('operator_label')}</Text>
                                    <Text style={[styles.infoValue, { color: activeColors.text }]}>{selectedOrder.employeeName}</Text>
                                </View>

                                <View style={[styles.divider, { backgroundColor: activeColors.border, marginVertical: SPACING.md }]} />

                                {/* Items Table */}
                                <View style={styles.tableHeader}>
                                    <Text style={[styles.tableHead, { flex: 2, color: activeColors.textLight }]}>{t('item_header')}</Text>
                                    <Text style={[styles.tableHead, { flex: 1, textAlign: 'right', color: activeColors.textLight }]}>{t('weight_header')}</Text>
                                    <Text style={[styles.tableHead, { flex: 1, textAlign: 'right', color: activeColors.textLight }]}>{t('total_header')}</Text>
                                </View>

                                {products.map((product, idx) => (
                                    <View key={`prod-${idx}`} style={styles.tableRow}>
                                        <Text style={[styles.itemText, { flex: 2, color: activeColors.text }]}>{product.name}</Text>
                                        <Text style={[styles.itemText, { flex: 1, textAlign: 'right', color: activeColors.text }]}>{product.grossWeight.toFixed(3)}g</Text>
                                        <Text style={[styles.itemText, { flex: 1, textAlign: 'right', color: activeColors.text }]}>₹{Math.round(product.totalValue).toLocaleString()}</Text>
                                    </View>
                                ))}

                                {deductions.length > 0 && (
                                    <>
                                        <View style={[styles.divider, { backgroundColor: activeColors.border, marginVertical: SPACING.md, borderStyle: 'dashed', borderWidth: 0.5 }]} />
                                        <Text style={[styles.deductionTitle, { color: activeColors.error }]}>{t('deductions_title')}</Text>
                                        {deductions.map((item, idx) => {
                                            const data = JSON.parse(item.itemData);
                                            let label = '';
                                            if (item.type === 'PURCHASE') label = `Old Gold (${data.category})`;
                                            else if (item.type === 'CHIT') label = `Chit (${data.chitId})`;
                                            else if (item.type === 'ADVANCE') label = `Advance (${data.advanceId})`;

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
                                    <Text style={[styles.totalValue, { color: activeColors.text }]}>₹{Math.round(selectedOrder.grossTotal).toLocaleString()}</Text>
                                </View>
                                <View style={[styles.totalRow, styles.grandTotalRow]}>
                                    <Text style={[styles.grandTotalLabel, { color: activeColors.primary }]}>{t('net_payable_label')}</Text>
                                    <Text style={[styles.grandTotalValue, { color: activeColors.primary }]}>₹{Math.round(selectedOrder.netPayable).toLocaleString()}</Text>
                                </View>
                            </View>
                        </ScrollView>

                        <View style={styles.modalFooter}>
                            <View style={{ flexDirection: 'row', gap: SPACING.sm }}>
                                <View style={{ flex: 1 }}>
                                    <PrimaryButton
                                        title="Print"
                                        onPress={() => { setShowOrderDetails(false); handlePrint(selectedOrder.orderId); }}
                                    />
                                </View>
                                <View style={{ flex: 1 }}>
                                    <TouchableOpacity
                                        style={[styles.reloadBtn, { borderColor: COLORS.success }]}
                                        onPress={() => { setShowOrderDetails(false); handleReload(selectedOrder.orderId); }}
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
            <HeaderBar title={t('orders_history')} />

            <View style={styles.filterScrollWrapper}>
                <RNFlatList
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    data={[
                        { id: 'today', label: t('today') },
                        { id: 'yesterday', label: t('yesterday') },
                        { id: '7days', label: t('last_7_days') },
                        { id: '30days', label: t('last_month') },
                        { id: 'custom', label: t('custom_range') },
                    ]}
                    renderItem={({ item }: any) => (
                        <TouchableOpacity
                            style={[
                                styles.filterBadge,
                                { backgroundColor: dateFilter === item.id ? activeColors.primary : activeColors.cardBg, borderColor: activeColors.border }
                            ]}
                            onPress={() => setDateFilter(item.id)}
                        >
                            <Text style={[styles.filterText, { color: dateFilter === item.id ? COLORS.white : activeColors.text }]}>
                                {item.label}
                            </Text>
                        </TouchableOpacity>
                    )}
                    keyExtractor={(item: any) => item.id}
                    contentContainerStyle={styles.filterList}
                />
            </View>

            {isLoading ? (
                <View style={styles.center}>
                    <ActivityIndicator size="large" color={activeColors.primary} />
                </View>
            ) : orders.length === 0 ? (
                <View style={styles.center}>
                    <Icon name="receipt-outline" size={48} color={activeColors.border} />
                    <Text style={{ color: activeColors.textLight, marginTop: 8 }}>{t('no_history_found')}</Text>
                </View>
            ) : (
                <FlatList
                    data={orders}
                    keyExtractor={(item: DBOrder) => item.orderId}
                    contentContainerStyle={{ paddingBottom: 100, paddingTop: SPACING.md }}
                    renderItem={renderItem}
                />
            )}

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
    filterScrollWrapper: {
        paddingVertical: SPACING.sm,
        borderBottomWidth: 1,
        borderBottomColor: COLORS.border,
    },
    filterList: {
        paddingHorizontal: SPACING.md,
    },
    filterBadge: {
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 20,
        marginRight: 8,
        borderWidth: 1,
    },
    filterText: {
        fontSize: FONT_SIZES.xs,
        fontWeight: 'bold',
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'flex-end',
    },
    detailsModalContent: {
        maxHeight: '80%',
        borderTopLeftRadius: BORDER_RADIUS.lg,
        borderTopRightRadius: BORDER_RADIUS.lg,
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
