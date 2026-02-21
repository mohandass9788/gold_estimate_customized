import React, { useState, useCallback } from 'react';
import { View as RNView, Text as RNText, StyleSheet, FlatList as RNFlatList, TouchableOpacity as RNRTouchableOpacity, Alert, ActivityIndicator as RNActivityIndicator, Platform, Modal as RNModal } from 'react-native';
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

export default function OrdersScreen() {
    const router = useRouter();
    const { theme, t, shopDetails } = useGeneralSettings();
    const { clearEstimation, addTagItem, addPurchaseItem, addChitItem, addAdvanceItem } = useEstimation();
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
        setIsPrinting(true);
        try {
            const { order, items } = await getOrderDetails(orderId);
            const products = items.filter(i => i.type === 'PRODUCT').map(i => JSON.parse(i.itemData));
            const purchases = items.filter(i => i.type === 'PURCHASE').map(i => JSON.parse(i.itemData));
            const chits = items.filter(i => i.type === 'CHIT').map(i => JSON.parse(i.itemData));
            const advances = items.filter(i => i.type === 'ADVANCE').map(i => JSON.parse(i.itemData));

            await printEstimationReceipt(products, purchases, chits, advances, shopDetails, order.customerName, order.employeeName);
        } catch (error: any) {
            Alert.alert('Print Error', error.message || 'Failed to print');
        } finally {
            setIsPrinting(false);
        }
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
                            const { items } = await getOrderDetails(orderId);
                            clearEstimation();
                            for (const item of items) {
                                const data = JSON.parse(item.itemData);
                                if (item.type === 'PRODUCT') addTagItem(data);
                                else if (item.type === 'PURCHASE') addPurchaseItem(data);
                                else if (item.type === 'CHIT') addChitItem(data);
                                else if (item.type === 'ADVANCE') addAdvanceItem(data);
                            }
                            router.push('/estimation');
                        } catch (error) {
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
                        {item.customerName || 'Walk-in'}
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

        return (
            <Modal visible={showOrderDetails} transparent animationType="slide" onRequestClose={() => setShowOrderDetails(false)}>
                <View style={styles.modalOverlay}>
                    <View style={[styles.detailsModalContent, { backgroundColor: activeColors.cardBg }]}>
                        <View style={styles.modalHeader}>
                            <Text style={[styles.modalTitle, { color: activeColors.primary }]}>Order Details</Text>
                            <TouchableOpacity onPress={() => setShowOrderDetails(false)}>
                                <Icon name="close" size={24} color={activeColors.text} />
                            </TouchableOpacity>
                        </View>
                        <RNFlatList
                            style={{ flex: 1 }}
                            data={[
                                { type: 'header', label: 'Order ID', value: selectedOrder.orderId },
                                { type: 'header', label: 'Customer', value: selectedOrder.customerName || 'Walk-in' },
                                { type: 'header', label: 'Operator', value: selectedOrder.employeeName },
                                { type: 'header', label: 'Date', value: format(new Date(selectedOrder.date), 'dd MMM yyyy, hh:mm a') },
                                { type: 'divider' },
                                ...selectedOrderItems.map(item => {
                                    const data = JSON.parse(item.itemData);
                                    let label = '';
                                    let value = '';
                                    let color = activeColors.text;

                                    if (item.type === 'PRODUCT') {
                                        label = data.name;
                                        value = `₹ ${data.totalValue.toLocaleString()}`;
                                    } else if (item.type === 'PURCHASE') {
                                        label = `Purchase: ${data.category}`;
                                        value = `- ₹ ${data.amount.toLocaleString()}`;
                                        color = activeColors.error;
                                    } else if (item.type === 'CHIT') {
                                        label = `Chit: ${data.chitId}`;
                                        value = `- ₹ ${data.amount.toLocaleString()}`;
                                        color = COLORS.primary;
                                    } else if (item.type === 'ADVANCE') {
                                        label = `Advance: ${data.advanceId}`;
                                        value = `- ₹ ${data.amount.toLocaleString()}`;
                                        color = COLORS.primary;
                                    }

                                    return { type: 'item', label, value, color };
                                }),
                                { type: 'divider' },
                                { type: 'header', label: 'Total Payable', value: `₹ ${selectedOrder.netPayable.toLocaleString()}`, bold: true }
                            ]}
                            keyExtractor={(_, index) => index.toString()}
                            renderItem={({ item: detailItem }: { item: any }) => {
                                if (detailItem.type === 'divider') return <View style={[styles.divider, { backgroundColor: activeColors.border }]} />;
                                return (
                                    <View style={styles.detailRow}>
                                        <Text style={[styles.detailLabel, { color: activeColors.textLight }]}>{detailItem.label}</Text>
                                        <Text style={[styles.detailValue, { color: detailItem.color || activeColors.text, fontWeight: detailItem.bold ? 'bold' : 'normal' }]}>{detailItem.value}</Text>
                                    </View>
                                );
                            }}
                        />
                        <View style={styles.modalFooter}>
                            <PrimaryButton title="Re-Print Receipt" onPress={() => { setShowOrderDetails(false); handlePrint(selectedOrder.orderId); }} />
                        </View>
                    </View>
                </View>
            </Modal>
        );
    };

    return (
        <ScreenContainer backgroundColor={activeColors.background}>
            <HeaderBar title="Orders History" />

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
                    <Text style={{ color: activeColors.textLight, marginTop: 8 }}>No history found</Text>
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
    }
});
