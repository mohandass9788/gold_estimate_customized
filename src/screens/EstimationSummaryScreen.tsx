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
import { printEstimationReceipt } from '../services/printService';

// Fix for React 19 type mismatch
const View = RNView as any;
const Text = RNText as any;
const ScrollView = RNScrollView as any;
const TouchableOpacity = RNRTouchableOpacity as any;

export default function EstimationSummaryScreen() {
    const router = useRouter();
    const { state, removeItem, clearEstimation, setCustomer } = useEstimation();
    const { theme, t, shopDetails, requestPrint, currentEmployeeName } = useGeneralSettings();
    const activeColors = theme === 'light' ? LIGHT_COLORS : DARK_COLORS;

    const [showCustomerModal, setShowCustomerModal] = React.useState(false);
    const [isPrinting, setIsPrinting] = React.useState(false);

    const handlePrint = async () => {
        requestPrint(async (empName) => {
            setIsPrinting(true);
            try {
                await printEstimationReceipt(
                    state.items,
                    state.purchaseItems,
                    state.chitItems,
                    state.advanceItems,
                    shopDetails,
                    state.customer?.name,
                    empName
                );
            } catch (error: any) {
                Alert.alert(t('error'), error.message || t('print_failed') || 'Failed to print');
            } finally {
                setIsPrinting(false);
            }
        });
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

    const handleView = (item: any) => {
        Alert.alert(
            t('item_details'),
            `Name: ${item.name}\nTag: ${item.tagNumber || 'Manual'}\nMetal: ${item.metal}\nPurity: ${item.purity}K\nWeight: ${item.netWeight.toFixed(3)}g\nWastage: ${item.wastage}%\nMaking Charge: ₹${item.makingChargeValue.toFixed(2)}\nGST: ₹${item.gstValue.toFixed(2)}\nTotal: ₹${item.totalValue.toLocaleString()}`
        );
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

            <ScrollView contentContainerStyle={[styles.content, { paddingBottom: 150 }]}>
                {state.items.length === 0 ? (
                    <View style={styles.emptyContainer}>
                        <Text style={[styles.emptyText, { color: activeColors.textLight }]}>{t('no_items')}</Text>
                        <PrimaryButton title={t('add_item') || "Add Items"} onPress={() => router.back()} style={styles.emptyButton} />
                    </View>
                ) : (
                    <>
                        <View style={styles.listContainer}>
                            {state.items.map((item) => (
                                <CardItemRow
                                    key={item.id}
                                    item={item}
                                    onRemove={() => removeItem(item.id)}
                                    onView={() => handleView(item)}
                                />
                            ))}
                        </View>

                        <View style={styles.footerContainer}>
                            {state.customer ? (
                                <View style={[styles.customerCard, { backgroundColor: activeColors.cardBg }]}>
                                    <Text style={[styles.customerTitle, { color: activeColors.text }]}>{t('customer_name')}: {state.customer.name}</Text>
                                    <Text style={{ color: activeColors.textLight }}>{state.customer.mobile}</Text>
                                    <TouchableOpacity onPress={() => setShowCustomerModal(true)}>
                                        <Text style={[styles.editLink, { color: activeColors.primary }]}>Edit</Text>
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
                                <PrimaryButton
                                    title={t('print') + " / " + t('share')}
                                    onPress={handlePrint}
                                    style={styles.actionButton}
                                />
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
    }
});
