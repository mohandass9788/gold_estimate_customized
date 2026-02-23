import React from 'react';
import { View as RNView, StyleSheet, ScrollView as RNScrollView, Text as RNText, Alert, TouchableOpacity as RNRTouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import ScreenContainer from '../components/ScreenContainer';
import HeaderBar from '../components/HeaderBar';
import CardItemRow from '../components/CardItemRow';
import SummaryCard from '../components/SummaryCard';
import PrimaryButton from '../components/PrimaryButton';
import { useEstimation } from '../store/EstimationContext';
import { useGeneralSettings } from '../store/GeneralSettingsContext';
import { SPACING, COLORS, FONT_SIZES, BORDER_RADIUS, LIGHT_COLORS, DARK_COLORS } from '../constants/theme';
import CustomerDetailsModal from '../modals/CustomerDetailsModal';
import PrintPreviewModal from '../modals/PrintPreviewModal';
import ItemDetailModal from '../modals/ItemDetailModal';
import { printEstimationReceipt, getEstimationReceiptThermalPayload } from '../services/printService';
import { Ionicons } from '@expo/vector-icons';

// Fix for React 19 type mismatch
const View = RNView as any;
const Text = RNText as any;
const ScrollView = RNScrollView as any;
const TouchableOpacity = RNRTouchableOpacity as any;
const Icon = Ionicons as any;

export default function EstimationSummaryScreen() {
    const router = useRouter();
    const { state, removeItem, clearEstimation, setCustomer } = useEstimation();
    const { theme, t, shopDetails, requestPrint, currentEmployeeName, receiptConfig, updateReceiptConfig } = useGeneralSettings();
    const activeColors = theme === 'light' ? LIGHT_COLORS : DARK_COLORS;

    const [showCustomerModal, setShowCustomerModal] = React.useState(false);
    const [showPreviewModal, setShowPreviewModal] = React.useState(false);
    const [showItemModal, setShowItemModal] = React.useState(false);
    const [selectedItem, setSelectedItem] = React.useState<any>(null);
    const [selectedItemType, setSelectedItemType] = React.useState<'estimation' | 'purchase' | 'chit' | 'advance'>('estimation');
    const [previewPayload, setPreviewPayload] = React.useState('');
    const [isPrinting, setIsPrinting] = React.useState(false);
    const [empNameForPrint, setEmpNameForPrint] = React.useState('');

    // Selection State
    const [selectedItemIds, setSelectedItemIds] = React.useState<string[]>([]);
    const [selectedPurchaseIds, setSelectedPurchaseIds] = React.useState<string[]>([]);
    const [selectedChitIds, setSelectedChitIds] = React.useState<string[]>([]);
    const [selectedAdvanceIds, setSelectedAdvanceIds] = React.useState<string[]>([]);

    // Initialize selection - select all by default
    React.useEffect(() => {
        setSelectedItemIds(state.items.map(i => i.id));
        setSelectedPurchaseIds(state.purchaseItems.map(i => i.id));
        setSelectedChitIds(state.chitItems.map(i => i.id));
        setSelectedAdvanceIds(state.advanceItems.map(i => i.id));
    }, []);

    const toggleItem = (id: string, type: 'item' | 'purchase' | 'chit' | 'advance') => {
        switch (type) {
            case 'item':
                setSelectedItemIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
                break;
            case 'purchase':
                setSelectedPurchaseIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
                break;
            case 'chit':
                setSelectedChitIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
                break;
            case 'advance':
                setSelectedAdvanceIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
                break;
        }
    };

    const selectedCount = selectedItemIds.length + selectedPurchaseIds.length + selectedChitIds.length + selectedAdvanceIds.length;

    const handlePrintRequest = async (isSeparate: boolean = false) => {
        const selectedItems = state.items.filter(i => selectedItemIds.includes(i.id));
        const selectedPurchases = state.purchaseItems.filter(i => selectedPurchaseIds.includes(i.id));
        const selectedChits = state.chitItems.filter(i => selectedChitIds.includes(i.id));
        const selectedAdvances = state.advanceItems.filter(i => selectedAdvanceIds.includes(i.id));

        if (selectedCount === 0) {
            Alert.alert(t('error'), t('select_at_least_one') || 'Please select at least one item to print');
            return;
        }

        requestPrint(async (empName) => {
            setEmpNameForPrint(empName);
            try {
                if (isSeparate) {
                    Alert.alert(t('printing'), t('printing_separately') || 'Printing items separately...');

                    // Direct thermal print for each individual item
                    for (const item of selectedItems) {
                        await printEstimationReceipt([item], [], [], [], shopDetails, state.customer?.name, empName, receiptConfig);
                    }
                    for (const item of selectedPurchases) {
                        await printEstimationReceipt([], [item], [], [], shopDetails, state.customer?.name, empName, receiptConfig);
                    }
                    for (const item of selectedChits) {
                        await printEstimationReceipt([], [], [item], [], shopDetails, state.customer?.name, empName, receiptConfig);
                    }
                    for (const item of selectedAdvances) {
                        await printEstimationReceipt([], [], [], [item], shopDetails, state.customer?.name, empName, receiptConfig);
                    }
                    return;
                }

                if (selectedCount === 1) {
                    // Direct print if single item
                    await printEstimationReceipt(
                        selectedItems,
                        selectedPurchases,
                        selectedChits,
                        selectedAdvances,
                        shopDetails,
                        state.customer?.name,
                        empName,
                        receiptConfig
                    );
                    return;
                }

                // Show preview for merged print
                const payload = await getEstimationReceiptThermalPayload(
                    selectedItems,
                    selectedPurchases,
                    selectedChits,
                    selectedAdvances,
                    shopDetails,
                    state.customer?.name,
                    empName,
                    receiptConfig
                );
                setPreviewPayload(payload);
                setShowPreviewModal(true);
            } catch (error: any) {
                Alert.alert(t('error'), error.message || t('print_failed') || 'Failed to print');
            }
        });
    };

    const handleWidthChange = async (width: '58mm' | '80mm' | '112mm') => {
        const newConfig = { ...receiptConfig, paperWidth: width };
        updateReceiptConfig(newConfig);
        try {
            const selectedItems = state.items.filter(i => selectedItemIds.includes(i.id));
            const selectedPurchases = state.purchaseItems.filter(i => selectedPurchaseIds.includes(i.id));
            const selectedChits = state.chitItems.filter(i => selectedChitIds.includes(i.id));
            const selectedAdvances = state.advanceItems.filter(i => selectedAdvanceIds.includes(i.id));

            const payload = await getEstimationReceiptThermalPayload(
                selectedItems,
                selectedPurchases,
                selectedChits,
                selectedAdvances,
                shopDetails,
                state.customer?.name,
                empNameForPrint,
                newConfig
            );
            setPreviewPayload(payload);
        } catch (error: any) {
            console.error('Failed to update preview', error);
        }
    };

    const handleActualPrint = async () => {
        setShowPreviewModal(false);
        setIsPrinting(true);
        try {
            const selectedItems = state.items.filter(i => selectedItemIds.includes(i.id));
            const selectedPurchases = state.purchaseItems.filter(i => selectedPurchaseIds.includes(i.id));
            const selectedChits = state.chitItems.filter(i => selectedChitIds.includes(i.id));
            const selectedAdvances = state.advanceItems.filter(i => selectedAdvanceIds.includes(i.id));

            await printEstimationReceipt(
                selectedItems,
                selectedPurchases,
                selectedChits,
                selectedAdvances,
                shopDetails,
                state.customer?.name,
                empNameForPrint,
                receiptConfig
            );
        } catch (error: any) {
            Alert.alert(t('error'), error.message || t('print_failed') || 'Failed to print');
        } finally {
            setIsPrinting(false);
        }
    };

    const handleClear = () => {
        Alert.alert('Confirm', 'Are you sure you want to clear the estimation?', [
            { text: 'Cancel', style: 'cancel' },
            {
                text: 'Clear', style: 'destructive', onPress: () => {
                    clearEstimation();
                    router.back();
                }
            }
        ]);
    };

    const handleView = (item: any, type: 'estimation' | 'purchase' | 'chit' | 'advance' = 'estimation') => {
        setSelectedItem(item);
        setSelectedItemType(type);
        setShowItemModal(true);
    };

    return (
        <ScreenContainer backgroundColor={activeColors.background}>
            <HeaderBar
                title={t('summary')}
                showBack
                rightAction={
                    <Text onPress={handleClear} style={{ color: activeColors.error, fontWeight: 'bold' }}>{t('clear') || 'Clear'}</Text>
                }
            />

            <CustomerDetailsModal
                visible={showCustomerModal}
                onClose={() => setShowCustomerModal(false)}
                onSubmit={(customer) => {
                    setCustomer(customer);
                    setShowCustomerModal(false);
                }}
                initialData={state.customer}
            />

            <PrintPreviewModal
                visible={showPreviewModal}
                onClose={() => setShowPreviewModal(false)}
                onPrint={handleActualPrint}
                thermalPayload={previewPayload}
                onWidthChange={handleWidthChange}
            />

            <ItemDetailModal
                visible={showItemModal}
                onClose={() => {
                    setShowItemModal(false);
                    setSelectedItem(null);
                }}
                item={selectedItem}
                type={selectedItemType}
            />

            <ScrollView contentContainerStyle={[styles.content, { paddingBottom: 150 }]}>
                {state.items.length === 0 ? (
                    <View style={styles.emptyContainer}>
                        <Text style={[styles.emptyText, { color: activeColors.textLight }]}>{t('no_items')}</Text>
                        <PrimaryButton title={t('add_item') || "Add Items"} onPress={() => router.back()} style={styles.emptyButton} />
                    </View>
                ) : (
                    <>
                        <View style={styles.listContainer}>
                            <Text style={[styles.sectionTitle, { color: activeColors.textLight }]}>{t('items') || 'Items'}</Text>
                            {state.items.map((item) => (
                                <CardItemRow
                                    key={item.id}
                                    item={item}
                                    onRemove={() => removeItem(item.id)}
                                    onView={() => handleView(item, 'estimation')}
                                    selected={selectedItemIds.includes(item.id)}
                                    onToggleSelection={() => toggleItem(item.id, 'item')}
                                />
                            ))}

                            {state.purchaseItems.length > 0 && (
                                <>
                                    <Text style={[styles.sectionTitle, { color: activeColors.textLight, marginTop: SPACING.md }]}>{t('purchase') || 'Purchase'}</Text>
                                    {state.purchaseItems.map((item: any) => (
                                        <View key={item.id} style={[styles.simpleRow, { backgroundColor: activeColors.cardBg, borderColor: selectedPurchaseIds.includes(item.id) ? activeColors.primary : 'transparent', borderWidth: 1 }]}>
                                            <TouchableOpacity onPress={() => toggleItem(item.id, 'purchase')} style={styles.checkboxTouch}>
                                                <Icon name={selectedPurchaseIds.includes(item.id) ? "checkbox" : "square-outline"} size={22} color={selectedPurchaseIds.includes(item.id) ? activeColors.primary : activeColors.textLight} />
                                            </TouchableOpacity>
                                            <View style={{ flex: 1 }}>
                                                <Text style={[styles.rowTitle, { color: activeColors.text }]}>{item.category.toUpperCase()}</Text>
                                                <Text style={{ color: activeColors.textLight }}>{item.netWeight.toFixed(3)}g @ Rs.{item.rate.toLocaleString()}</Text>
                                            </View>
                                            <Text style={[styles.rowAmount, { color: activeColors.error }]}>- ₹{Math.round(item.amount).toLocaleString()}</Text>

                                            <View style={styles.rowActions}>
                                                <TouchableOpacity onPress={() => { setSelectedItem(item); setSelectedItemType('purchase'); setShowItemModal(true); }} style={styles.actionIconBtn}>
                                                    <Icon name="eye-outline" size={20} color={activeColors.primary} />
                                                </TouchableOpacity>
                                                <TouchableOpacity onPress={() => router.push({ pathname: '/purchase', params: { editId: item.id } as any })} style={styles.actionIconBtn}>
                                                    <Icon name="pencil-outline" size={18} color={activeColors.primary} />
                                                </TouchableOpacity>
                                                <TouchableOpacity onPress={() => removeItem(item.id, 'purchase')} style={styles.actionIconBtn}>
                                                    <Icon name="trash-outline" size={18} color={activeColors.error} />
                                                </TouchableOpacity>
                                            </View>
                                        </View>
                                    ))}
                                </>
                            )}

                            {state.chitItems.length > 0 && (
                                <>
                                    <Text style={[styles.sectionTitle, { color: activeColors.textLight, marginTop: SPACING.md }]}>{t('chit') || 'Chit'}</Text>
                                    {state.chitItems.map((item: any) => (
                                        <View key={item.id} style={[styles.simpleRow, { backgroundColor: activeColors.cardBg, borderColor: selectedChitIds.includes(item.id) ? activeColors.primary : 'transparent', borderWidth: 1 }]}>
                                            <TouchableOpacity onPress={() => toggleItem(item.id, 'chit')} style={styles.checkboxTouch}>
                                                <Icon name={selectedChitIds.includes(item.id) ? "checkbox" : "square-outline"} size={22} color={selectedChitIds.includes(item.id) ? activeColors.primary : activeColors.textLight} />
                                            </TouchableOpacity>
                                            <View style={{ flex: 1 }}>
                                                <Text style={[styles.rowTitle, { color: activeColors.text }]}>ID: {item.chitId}</Text>
                                                <Text style={{ color: activeColors.textLight }}>{item.customerName}</Text>
                                            </View>
                                            <Text style={[styles.rowAmount, { color: activeColors.error }]}>- ₹{Math.round(item.amount).toLocaleString()}</Text>

                                            <View style={styles.rowActions}>
                                                <TouchableOpacity onPress={() => { setSelectedItem(item); setSelectedItemType('chit'); setShowItemModal(true); }} style={styles.actionIconBtn}>
                                                    <Icon name="eye-outline" size={20} color={activeColors.primary} />
                                                </TouchableOpacity>
                                                <TouchableOpacity onPress={() => removeItem(item.id, 'chit')} style={styles.actionIconBtn}>
                                                    <Icon name="trash-outline" size={18} color={activeColors.error} />
                                                </TouchableOpacity>
                                            </View>
                                        </View>
                                    ))}
                                </>
                            )}

                            {state.advanceItems.length > 0 && (
                                <>
                                    <Text style={[styles.sectionTitle, { color: activeColors.textLight, marginTop: SPACING.md }]}>{t('advance') || 'Advance'}</Text>
                                    {state.advanceItems.map((item: any) => (
                                        <View key={item.id} style={[styles.simpleRow, { backgroundColor: activeColors.cardBg, borderColor: selectedAdvanceIds.includes(item.id) ? activeColors.primary : 'transparent', borderWidth: 1 }]}>
                                            <TouchableOpacity onPress={() => toggleItem(item.id, 'advance')} style={styles.checkboxTouch}>
                                                <Icon name={selectedAdvanceIds.includes(item.id) ? "checkbox" : "square-outline"} size={22} color={selectedAdvanceIds.includes(item.id) ? activeColors.primary : activeColors.textLight} />
                                            </TouchableOpacity>
                                            <View style={{ flex: 1 }}>
                                                <Text style={[styles.rowTitle, { color: activeColors.text }]}>ID: {item.advanceId}</Text>
                                                <Text style={{ color: activeColors.textLight }}>{item.customerName}</Text>
                                            </View>
                                            <Text style={[styles.rowAmount, { color: activeColors.error }]}>- ₹{Math.round(item.amount).toLocaleString()}</Text>

                                            <View style={styles.rowActions}>
                                                <TouchableOpacity onPress={() => { setSelectedItem(item); setSelectedItemType('advance'); setShowItemModal(true); }} style={styles.actionIconBtn}>
                                                    <Icon name="eye-outline" size={20} color={activeColors.primary} />
                                                </TouchableOpacity>
                                                <TouchableOpacity onPress={() => removeItem(item.id, 'advance')} style={styles.actionIconBtn}>
                                                    <Icon name="trash-outline" size={18} color={activeColors.error} />
                                                </TouchableOpacity>
                                            </View>
                                        </View>
                                    ))}
                                </>
                            )}
                        </View>

                        <View style={styles.footerContainer}>
                            {state.customer ? (
                                <View style={[styles.customerCard, { backgroundColor: activeColors.cardBg }]}>
                                    <Text style={[styles.customerTitle, { color: activeColors.text }]}>{t('customer_name')}: {state.customer.name}</Text>
                                    <Text style={{ color: activeColors.textLight }}>{state.customer.mobile}</Text>
                                    <TouchableOpacity onPress={() => setShowCustomerModal(true)}>
                                        <Text style={[styles.editLink, { color: activeColors.primary }]}>{t('edit_btn')}</Text>
                                    </TouchableOpacity>
                                </View>
                            ) : (
                                <PrimaryButton
                                    title={t('customer_info') || "Add Customer Details"}
                                    variant="outline"
                                    onPress={() => setShowCustomerModal(true)}
                                    style={{ marginBottom: SPACING.md }}
                                />
                            )}

                            <SummaryCard totals={state.totals} />

                            <View style={styles.actionButtons}>
                                {selectedCount > 1 ? (
                                    <>
                                        <PrimaryButton
                                            title={t('merge_print') || "Merge Print"}
                                            onPress={() => handlePrintRequest(false)}
                                            style={styles.actionButton}
                                        />
                                        <PrimaryButton
                                            title={t('separate_print') || "Separate Print"}
                                            variant="outline"
                                            onPress={() => handlePrintRequest(true)}
                                            style={styles.actionButton}
                                        />
                                    </>
                                ) : (
                                    <PrimaryButton
                                        title={t('print') || "Print Receipt"}
                                        onPress={() => handlePrintRequest(false)}
                                        isLoading={isPrinting}
                                        style={styles.actionButton}
                                        disabled={selectedCount === 0}
                                    />
                                )}
                                <PrimaryButton
                                    title="Convert to Bill"
                                    variant="secondary"
                                    onPress={() => Alert.alert('Coming Soon', 'Billing feature is under development.')}
                                    style={styles.actionButton}
                                />
                            </View>
                        </View>
                    </>
                )}
            </ScrollView>
        </ScreenContainer>
    );
}

const styles = StyleSheet.create({
    content: {
        padding: SPACING.md,
        flexGrow: 1,
    },
    listContainer: {
        marginBottom: SPACING.lg,
    },
    footerContainer: {
        marginTop: 'auto',
    },
    actionButtons: {
        marginTop: SPACING.lg,
        gap: SPACING.md,
    },
    actionButton: {
        width: '100%',
    },
    emptyContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    emptyText: {
        fontSize: FONT_SIZES.lg,
        marginBottom: SPACING.lg,
    },
    emptyButton: {
        width: 200,
    },
    customerCard: {
        padding: SPACING.md,
        borderRadius: BORDER_RADIUS.md,
        marginBottom: SPACING.md,
        elevation: 2,
    },
    customerTitle: {
        fontWeight: 'bold',
        fontSize: FONT_SIZES.md,
    },
    editLink: {
        marginTop: SPACING.xs,
    },
    sectionTitle: {
        fontSize: FONT_SIZES.sm,
        fontWeight: 'bold',
        textTransform: 'uppercase',
        marginBottom: SPACING.xs,
        letterSpacing: 1,
    },
    simpleRow: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: SPACING.md,
        borderRadius: BORDER_RADIUS.md,
        marginBottom: SPACING.xs,
        elevation: 1,
    },
    rowTitle: {
        fontWeight: 'bold',
        fontSize: FONT_SIZES.md,
    },
    rowAmount: {
        fontWeight: 'bold',
        fontSize: FONT_SIZES.md,
        marginHorizontal: SPACING.md,
    },
    checkboxTouch: {
        padding: SPACING.xs,
        marginRight: SPACING.xs,
    },
    rowActions: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: SPACING.xs,
    },
    actionIconBtn: {
        padding: SPACING.xs,
    }
});
