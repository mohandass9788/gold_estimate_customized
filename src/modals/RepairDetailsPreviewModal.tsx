import React from 'react';
import { Modal, StyleSheet, View as RNView, Text as RNText, ScrollView as RNScrollView, TouchableOpacity as RNTouchableOpacity, Dimensions, Image } from 'react-native';
import { SPACING, COLORS, FONT_SIZES, BORDER_RADIUS, LIGHT_COLORS, DARK_COLORS } from '../constants/theme';
import { useGeneralSettings } from '../store/GeneralSettingsContext';
import PrimaryButton from '../components/PrimaryButton';
import { Ionicons } from '@expo/vector-icons';
import { DBRepair } from '../services/dbService';
import { format } from 'date-fns';

const View = RNView as any;
const Text = RNText as any;
const ScrollView = RNScrollView as any;
const TouchableOpacity = RNTouchableOpacity as any;

interface RepairDetailsPreviewModalProps {
    visible: boolean;
    onClose: () => void;
    onPrint: () => void;
    repairData: DBRepair | null;
    qrData?: string;
}

export default function RepairDetailsPreviewModal({
    visible,
    onClose,
    onPrint,
    repairData,
    qrData
}: RepairDetailsPreviewModalProps) {
    const { theme, t } = useGeneralSettings();
    const activeColors = theme === 'light' ? LIGHT_COLORS : DARK_COLORS;

    if (!repairData) return null;

    let parsedImages: string[] = [];
    try {
        if (repairData.images) {
            parsedImages = JSON.parse(repairData.images);
        }
    } catch (e) {
        console.error("Failed to parse repair images for preview:", e);
    }

    const DetailRow = ({ label, value }: { label: string, value: string | number }) => (
        <View style={styles.detailRow}>
            <Text style={[styles.detailLabel, { color: activeColors.textLight }]}>{label}</Text>
            <Text style={[styles.detailValue, { color: activeColors.text }]}>{value}</Text>
        </View>
    );

    return (
        <Modal
            visible={visible}
            animationType="slide"
            transparent={true}
            onRequestClose={onClose}
        >
            <View style={styles.modalOverlay}>
                <View style={[styles.modalContent, { backgroundColor: activeColors.background }]}>
                    <View style={styles.header}>
                        <Text style={[styles.headerTitle, { color: activeColors.text }]}>{t('confirmation_preview') || 'Confirmation Preview'}</Text>
                        <TouchableOpacity onPress={onClose} style={styles.closeButton}>
                            <Ionicons name="close" size={24} color={activeColors.text} />
                        </TouchableOpacity>
                    </View>

                    <ScrollView style={styles.previewScroll} contentContainerStyle={styles.scrollContent}>
                        <View style={[styles.premiumCard, { backgroundColor: activeColors.cardBg, borderColor: activeColors.border }]}>
                            <View style={styles.premiumHeader}>
                                <Text style={[styles.premiumHeaderTitle, { color: activeColors.primary }]}>{t('repair_details') || 'Repair Details'}</Text>
                                <View style={styles.premiumBadge}>
                                    <Text style={styles.premiumBadgeText}>#{repairData.id}</Text>
                                </View>
                            </View>


                            <DetailRow label={t('repair_no') || 'Repair No'} value={repairData.id} />
                            <DetailRow label={t('date') || 'Date'} value={format(new Date(repairData.date), 'dd/MM/yyyy')} />
                            {repairData.customerName && <DetailRow label={repairData.type === 'COMPANY' ? (t('company_name') || 'Company') : (t('customer') || 'Customer')} value={repairData.customerName} />}
                            {repairData.customerMobile && <DetailRow label={repairData.type === 'COMPANY' ? (t('company_phone') || 'Mobile') : (t('phone_number') || 'Mobile')} value={repairData.customerMobile} />}
                            <DetailRow label={t('due_date') || 'Due Date'} value={format(new Date(repairData.dueDate), 'dd/MM/yyyy')} />

                            <View style={[styles.divider, { borderBottomColor: activeColors.border + '40' }]} />

                            <Text style={[styles.premiumHeaderTitle, { color: activeColors.primary, marginTop: SPACING.md, marginBottom: SPACING.sm }]}>{t('item_specifics') || 'Item Specifics'}</Text>
                            <DetailRow label={t('item_name') || 'Item Name'} value={repairData.itemName} />
                            {repairData.natureOfRepair && <DetailRow label={t('nature_of_repair') || 'Desc'} value={repairData.natureOfRepair} />}
                            <DetailRow label={t('pcs') || 'Pcs'} value={repairData.pcs} />
                            <DetailRow label={t('gross_weight') || 'Gross Weight'} value={`${repairData.grossWeight} g`} />
                            {repairData.grossWeight > repairData.netWeight && (
                                <DetailRow label={t('net_weight') || 'Net Weight'} value={`${repairData.netWeight} g`} />
                            )}
                        </View>


                        {parsedImages.length > 0 && (
                            <View style={[styles.premiumCard, { backgroundColor: activeColors.cardBg, borderColor: activeColors.border }]}>
                                <Text style={[styles.premiumHeaderTitle, { color: activeColors.primary, marginBottom: 12 }]}>{t('item_images') || 'Item Images'}</Text>
                                <View style={styles.imageGrid}>

                                    {parsedImages.map((uri, index) => (
                                        <Image key={index} source={{ uri }} style={styles.thumbnail} />
                                    ))}
                                </View>
                            </View>
                        )}

                        {qrData && (
                            <View style={{ alignItems: 'center', marginVertical: 20 }}>
                                <Ionicons name="qr-code-outline" size={48} color={activeColors.primary} />
                                <Text style={{ color: activeColors.textLight, marginTop: 5, fontSize: 12 }}>{t('qr_anchor_prepared') || 'QR Tracking Anchor Prepared'}</Text>
                            </View>
                        )}
                    </ScrollView>

                    <View style={styles.footer}>
                        <PrimaryButton
                            title={t('cancel') || 'Cancel'}
                            variant="outline"
                            onPress={onClose}
                            style={styles.actionButton}
                        />
                        <PrimaryButton
                            title={t('confirm_print') || 'Confirm & Print'}
                            onPress={onPrint}
                            style={styles.actionButton}
                        />
                    </View>
                </View>
            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    modalContent: {
        width: '90%',
        height: '85%',
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
    headerTitle: {
        fontSize: FONT_SIZES.lg,
        fontWeight: 'bold',
    },
    closeButton: {
        padding: 4,
    },
    previewScroll: {
        flex: 1,
    },
    scrollContent: {
        padding: SPACING.md,
        paddingBottom: SPACING.xl,
    },
    actionButton: {
        flex: 1,
    },
    premiumCard: {
        borderRadius: BORDER_RADIUS.xl,
        borderWidth: 1,
        padding: SPACING.xl,
        marginBottom: SPACING.md,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
    },
    premiumHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: SPACING.md,
    },
    premiumHeaderTitle: {
        fontSize: FONT_SIZES.md,
        fontWeight: '900',
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },
    premiumBadge: {
        backgroundColor: COLORS.primary + '15',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 6,
    },
    premiumBadgeText: {
        fontSize: 10,
        fontWeight: 'bold',
        color: COLORS.primary,
    },
    detailRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        paddingVertical: 6,
    },
    detailLabel: {
        fontSize: FONT_SIZES.sm,
        textTransform: 'uppercase',
        letterSpacing: 0.5,
        opacity: 0.8,
    },
    detailValue: {
        fontSize: FONT_SIZES.sm,
        fontWeight: 'bold',
        textAlign: 'right',
        flex: 1,
        marginLeft: 10,
    },
    divider: {
        borderBottomWidth: 1,
        marginVertical: SPACING.md,
    },
    imageGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: SPACING.sm,
    },
    thumbnail: {
        width: 80,
        height: 80,
        borderRadius: BORDER_RADIUS.sm,
        backgroundColor: '#eee',
    },
    footer: {
        flexDirection: 'row',
        padding: SPACING.md,
        gap: SPACING.md,
        borderTopWidth: 1,
        borderTopColor: 'rgba(0,0,0,0.1)',
    },
});


