import React from 'react';
import { Modal, View as RNView, Text as RNText, StyleSheet, TouchableOpacity as RNRTouchableOpacity, ScrollView as RNScrollView } from 'react-native';
import { COLORS, SPACING, FONT_SIZES, BORDER_RADIUS, LIGHT_COLORS, DARK_COLORS } from '../constants/theme';
import { Ionicons } from '@expo/vector-icons';
import { useGeneralSettings } from '../store/GeneralSettingsContext';
import { printEstimationReceipt } from '../services/printService';

// Fix for React 19 type mismatch
const View = RNView as any;
const Text = RNText as any;
const Icon = Ionicons as any;
const TouchableOpacity = RNRTouchableOpacity as any;
const ScrollView = RNScrollView as any;

interface ItemDetailModalProps {
    visible: boolean;
    onClose: () => void;
    item: any;
    type: 'estimation' | 'purchase' | 'chit' | 'advance';
}

export default function ItemDetailModal({ visible, onClose, item, type }: ItemDetailModalProps) {
    const { theme, t, shopDetails, currentEmployeeName, receiptConfig } = useGeneralSettings();
    const activeColors = theme === 'light' ? LIGHT_COLORS : DARK_COLORS;

    if (!item) return null;

    const renderHeader = () => {
        let title = '';
        switch (type) {
            case 'estimation': title = item.name; break;
            case 'purchase': title = `${t('purchase')}: ${item.category}`; break;
            case 'chit': title = `${t('chit')}: ${item.chitId}`; break;
            case 'advance': title = `${t('advance')}: ${item.advanceId}`; break;
        }

        return (
            <View style={styles.header}>
                <Text style={[styles.title, { color: activeColors.text }]}>{title.toUpperCase()}</Text>
                <TouchableOpacity onPress={onClose} style={styles.closeButton}>
                    <Icon name="close" size={24} color={activeColors.text} />
                </TouchableOpacity>
            </View>
        );
    };

    const DetailRow = ({ label, value, isBold = false }: { label: string; value: string; isBold?: boolean }) => (
        <View style={styles.detailRow}>
            <Text style={[styles.detailLabel, { color: activeColors.textLight }]}>{label}</Text>
            <Text style={[styles.detailValue, { color: activeColors.text, fontWeight: isBold ? 'bold' : 'normal' }]}>{value}</Text>
        </View>
    );

    const renderContent = () => {
        switch (type) {
            case 'estimation':
                return (
                    <>
                        <DetailRow label={t('metal') || "Metal"} value={item.metal} />
                        <DetailRow label={t('purity') || "Purity"} value={`${item.purity}K`} />
                        <DetailRow label={t('rate') || "Rate"} value={`₹${item.rate.toLocaleString()}`} />
                        <View style={styles.divider} />
                        <DetailRow label={t('gross_weight') || "Gross Weight"} value={`${(item.grossWeight || 0).toFixed(3)}g`} />
                        <DetailRow label={t('stone_weight') || "Stone Weight"} value={`${(item.stoneWeight || 0).toFixed(3)}g`} />
                        <DetailRow label={t('net_weight') || "Net Weight"} value={`${(item.netWeight || 0).toFixed(3)}g`} isBold />
                        <View style={styles.divider} />
                        <DetailRow label={t('gold_value') || "Gold Value"} value={`₹${Math.round(item.goldValue).toLocaleString()}`} />
                        <DetailRow label={`${t('wastage')} (${item.wastage}${item.wastageType === 'percentage' ? '%' : 'g'})`} value={`₹${Math.round(item.wastageValue).toLocaleString()}`} />
                        <DetailRow label={`${t('making_charge')} (${item.makingCharge}${item.makingChargeType === 'percentage' ? '%' : (item.makingChargeType === 'perGram' ? '/g' : ' Fix')})`} value={`₹${Math.round(item.makingChargeValue).toLocaleString()}`} />
                        <View style={styles.divider} />
                        <DetailRow label={t('total') || "Total"} value={`₹${Math.round(item.totalValue).toLocaleString()}`} isBold />
                    </>
                );
            case 'purchase':
                const lessLabel = item.lessWeightType === 'percentage' ? `${t('less_percentage') || "Less %"}` : `${t('less_weight_gm') || "Less (g)"}`;
                return (
                    <>
                        <DetailRow label={t('item_category') || "Category"} value={item.category} />
                        <DetailRow label={t('purity') || "Purity"} value={item.purity} />
                        <DetailRow label={t('rate') || "Rate"} value={`₹${item.rate.toLocaleString()}`} />
                        <View style={styles.divider} />
                        <DetailRow label={t('gross_weight') || "Gross Weight"} value={`${(item.grossWeight || 0).toFixed(3)}g`} />
                        <DetailRow label={lessLabel} value={`${item.lessWeight || 0}${item.lessWeightType === 'percentage' ? '%' : 'g'}`} />
                        <DetailRow label={t('less_value') || "Less Value (g)"} value={`${(item.grossWeight - item.netWeight || 0).toFixed(3)}g`} />
                        <DetailRow label={t('net_weight') || "Net Weight"} value={`${(item.netWeight || 0).toFixed(3)}g`} isBold />
                        <View style={styles.divider} />
                        <DetailRow label={t('total_amount') || "Amount"} value={`₹${Math.round(item.amount).toLocaleString()}`} isBold />
                    </>
                );
            case 'chit':
                return (
                    <>
                        <DetailRow label={t('chit_id') || "Chit ID"} value={item.chitId} />
                        <DetailRow label={t('chit_name') || "Customer Name"} value={item.customerName} />
                        <DetailRow label={t('date') || "Date"} value={new Date().toLocaleDateString()} />
                        <View style={styles.divider} />
                        <DetailRow label={t('amount_paid') || "Amount"} value={`₹${Math.round(item.amount).toLocaleString()}`} isBold />
                    </>
                );
            case 'advance':
                return (
                    <>
                        <DetailRow label={t('advance_id') || "Advance ID"} value={item.advanceId} />
                        <DetailRow label={t('customer_name') || "Customer Name"} value={item.customerName} />
                        <DetailRow label={t('date') || "Date"} value={new Date().toLocaleDateString()} />
                        <View style={styles.divider} />
                        <DetailRow label={t('amount_paid') || "Amount"} value={`₹${Math.round(item.amount).toLocaleString()}`} isBold />
                    </>
                );
            default:
                return null;
        }
    };

    const handlePrint = async () => {
        try {
            const items = type === 'estimation' ? [item] : [];
            const purchaseItems = type === 'purchase' ? [item] : [];
            const chitItems = type === 'chit' ? [item] : [];
            const advanceItems = type === 'advance' ? [item] : [];

            await printEstimationReceipt(
                items,
                purchaseItems,
                chitItems,
                advanceItems,
                shopDetails,
                item.customerName || (type === 'estimation' ? item.customerName : undefined),
                currentEmployeeName,
                receiptConfig
            );
        } catch (error: any) {
            console.error('Print failed', error);
        }
    };

    return (
        <Modal
            visible={visible}
            animationType="slide"
            transparent={true}
            onRequestClose={onClose}
        >
            <View style={styles.overlay}>
                <View style={[styles.container, { backgroundColor: activeColors.cardBg }]}>
                    {renderHeader()}
                    <ScrollView contentContainerStyle={styles.content}>
                        {renderContent()}
                    </ScrollView>
                    <View style={styles.modalFooter}>
                        <TouchableOpacity
                            style={[styles.printButton, { borderColor: activeColors.primary }]}
                            onPress={handlePrint}
                        >
                            <Icon name="print-outline" size={20} color={activeColors.primary} />
                            <Text style={[styles.printButtonText, { color: activeColors.primary }]}>{t('print') || "Print"}</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={[styles.doneButton, { backgroundColor: activeColors.primary }]}
                            onPress={onClose}
                        >
                            <Text style={styles.doneButtonText}>{t('done') || "Done"}</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: SPACING.lg,
    },
    container: {
        width: '100%',
        maxHeight: '80%',
        borderRadius: BORDER_RADIUS.lg,
        overflow: 'hidden',
        elevation: 5,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: SPACING.md,
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(0,0,0,0.1)',
    },
    title: {
        fontSize: FONT_SIZES.md,
        fontWeight: 'bold',
    },
    closeButton: {
        padding: SPACING.xs,
    },
    content: {
        padding: SPACING.md,
    },
    detailRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: SPACING.sm,
    },
    detailLabel: {
        fontSize: FONT_SIZES.sm,
    },
    detailValue: {
        fontSize: FONT_SIZES.sm,
    },
    divider: {
        height: 1,
        backgroundColor: 'rgba(0,0,0,0.05)',
        marginVertical: SPACING.sm,
    },
    modalFooter: {
        flexDirection: 'row',
        padding: SPACING.md,
        gap: SPACING.md,
    },
    printButton: {
        flex: 1,
        padding: SPACING.md,
        borderRadius: BORDER_RADIUS.md,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
        flexDirection: 'row',
        gap: 8,
    },
    printButtonText: {
        fontWeight: 'bold',
        fontSize: FONT_SIZES.md,
    },
    doneButton: {
        flex: 1,
        padding: SPACING.md,
        borderRadius: BORDER_RADIUS.md,
        alignItems: 'center',
        justifyContent: 'center',
    },
    doneButtonText: {
        color: '#FFF',
        fontWeight: 'bold',
        fontSize: FONT_SIZES.md,
    },
});
