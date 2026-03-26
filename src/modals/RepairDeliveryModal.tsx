import React, { useState, useEffect } from 'react';
import {
    View, Text, StyleSheet, Modal, TouchableOpacity,
    TextInput, ScrollView, Image, ActivityIndicator,
    KeyboardAvoidingView, Platform
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useGeneralSettings } from '../store/GeneralSettingsContext';
import { updateRepairStatus, DBRepair, getSetting } from '../services/dbService';
import { printRepairDelivery } from '../services/printService';
import { useAuth } from '../store/AuthContext';
import { COLORS, SPACING, FONT_SIZES, BORDER_RADIUS, LIGHT_COLORS, DARK_COLORS } from '../constants/theme';

interface RepairDeliveryModalProps {
    visible: boolean;
    repair: DBRepair | null;
    onClose: () => void;
    onSuccess: () => void;
}

export default function RepairDeliveryModal({ visible, repair, onClose, onSuccess }: RepairDeliveryModalProps) {
    const { theme, t, receiptConfig } = useGeneralSettings();
    const { validateSubscription } = useAuth();
    const [extraAmount, setExtraAmount] = useState('');
    const [gstType, setGstType] = useState<'none' | 'amount' | 'percentage'>('none');
    const [gstValue, setGstValue] = useState('');
    const [showConfirm, setShowConfirm] = useState(false);
    const [loading, setLoading] = useState(false);
    const [isPrinted, setIsPrinted] = useState(false);

    useEffect(() => {
        if (visible) {
            setLoading(false);
            setIsPrinted(false);
            setExtraAmount('');
            setGstType('none');
            setGstValue('');
        }
    }, [visible]);

    const activeColors = theme === 'light' ? LIGHT_COLORS : DARK_COLORS;

    if (!repair) return null;

    const handleClose = () => {
        setLoading(false);
        onClose();
    };

    const images = JSON.parse(repair.images || '[]');
    const extraNum = parseFloat(extraAmount) || 0;
    const baseTotal = repair.balance + extraNum;
    const parsedGstValue = parseFloat(gstValue) || 0;

    const hasExistingGst = !!(repair.gstAmount && repair.gstAmount > 0);
    let finalGstAmount = 0;

    if (hasExistingGst) {
        finalGstAmount = repair.gstAmount!;
    } else {
        if (gstType === 'amount') {
            finalGstAmount = parsedGstValue;
        } else if (gstType === 'percentage') {
            finalGstAmount = ((repair.amount || 0) * parsedGstValue) / 100;
        }
    }

    const totalAmount = hasExistingGst ? baseTotal : baseTotal + finalGstAmount;

    const handleDeliver = async () => {
        if (!validateSubscription()) {
            setShowConfirm(false);
            return;
        }
        setLoading(true);
        try {
            await updateRepairStatus(
                repair.id,
                'DELIVERED',
                extraNum,
                new Date().toISOString(),
                hasExistingGst ? repair.gstAmount : finalGstAmount,
                hasExistingGst ? repair.gstType : gstType
            );

            const shopName = await getSetting('shop_name');
            const shopAddress = await getSetting('shop_address');
            const shopPhone = await getSetting('shop_phone');

            const shopDetails = {
                name: shopName,
                address1: shopAddress,
                mobile: shopPhone
            };

            // Optimistic UI: Update state and close modal instantly
            setIsPrinted(true);
            setLoading(false);
            
            // Close modal instantly via parent state update
            onSuccess();
            setShowConfirm(false);
            setIsPrinted(false);

            // Trigger print in background with small delay to ensure UI thread is free for animations
            setTimeout(() => {
                printRepairDelivery(repair, extraNum, hasExistingGst ? (repair.gstAmount || 0) : finalGstAmount, shopDetails, undefined, receiptConfig)
                    .catch(err => console.error('Background print failed:', err));
            }, 100);

        } catch (error) {
            console.error('Delivery failed:', error);
            setLoading(false);
        }
    };

    return (
        <>
            <Modal
                visible={visible}
                transparent
                animationType="slide"
                onRequestClose={handleClose}
                statusBarTranslucent
            >
                <View style={styles.modalOverlay}>
                    <KeyboardAvoidingView
                        behavior={Platform.OS === 'ios' ? 'padding' : 'position'}
                        style={styles.kavContainer}
                        contentContainerStyle={{ alignItems: 'center', justifyContent: 'center' }}
                    >
                        <View style={[styles.modalContent, { backgroundColor: activeColors.background }]}>
                            {/* Header */}
                            <View style={styles.header}>
                                <Text style={[styles.headerTitle, { color: activeColors.text }]}>{t('repair_delivery')}</Text>
                                <TouchableOpacity onPress={handleClose}>
                                    <Ionicons name="close" size={24} color={activeColors.text} />
                                </TouchableOpacity>
                            </View>

                            <ScrollView
                                contentContainerStyle={styles.scrollContent}
                                keyboardShouldPersistTaps="handled"
                                showsVerticalScrollIndicator={false}
                            >
                                {/* Info Card */}
                                <View style={[styles.infoCard, { backgroundColor: activeColors.cardBg, borderColor: activeColors.border }]}>
                                    <View style={styles.infoRow}>
                                        <Text style={[styles.infoLabel, { color: activeColors.textLight }]}>{t('repair_no')}</Text>
                                        <Text style={[styles.infoValue, { color: activeColors.text }]}>{repair.id}</Text>
                                    </View>
                                    <View style={styles.infoRow}>
                                        <Text style={[styles.infoLabel, { color: activeColors.textLight }]}>{t('item_name')}</Text>
                                        <Text style={[styles.infoValue, { color: activeColors.text }]}>{repair.itemName}</Text>
                                    </View>
                                    <View style={styles.infoRow}>
                                        <Text style={[styles.infoLabel, { color: activeColors.textLight }]}>{repair.type === 'COMPANY' ? (t('company_name') || 'Company') : (t('customer') || 'Customer')}</Text>
                                        <Text style={[styles.infoValue, { color: activeColors.text }]} numberOfLines={1}>
                                            {repair.customerName}{repair.customerMobile ? ` (${repair.customerMobile})` : ''}
                                        </Text>
                                    </View>
                                </View>

                                {/* Images */}
                                {images.length > 0 && (
                                    <View style={styles.imageSection}>
                                        <Text style={[styles.sectionTitle, { color: activeColors.text }]}>{t('item_images')}</Text>
                                        <ScrollView horizontal showsHorizontalScrollIndicator={false} keyboardShouldPersistTaps="handled">
                                            {images.map((uri: string, index: number) => (
                                                <Image key={index} source={{ uri }} style={styles.itemImage} />
                                            ))}
                                        </ScrollView>
                                    </View>
                                )}

                                {/* Pricing Card */}
                                <View style={[styles.pricingCard, { backgroundColor: activeColors.cardBg, borderColor: activeColors.border }]}>
                                    {/* Repair Price */}
                                    <View style={styles.priceRow}>
                                        <Text style={[styles.priceLabel, { color: activeColors.textLight }]}>{t('repair_price') || 'Repair Price'}</Text>
                                        <Text style={[styles.priceValue, { color: activeColors.text }]}>₹{(repair as any).amount?.toLocaleString() ?? '—'}</Text>
                                    </View>

                                    {/* Advance Paid */}
                                    <View style={styles.priceRow}>
                                        <Text style={[styles.priceLabel, { color: activeColors.textLight }]}>{t('advance_paid') || 'Advance Paid'}</Text>
                                        <Text style={[styles.priceValue, { color: '#2e7d32' }]}>₹{repair.advance.toLocaleString()}</Text>
                                    </View>

                                    {/* Balance */}
                                    <View style={styles.priceRow}>
                                        <Text style={[styles.priceLabel, { color: activeColors.textLight }]}>{t('balance') || 'Balance'}</Text>
                                        <Text style={[styles.priceValue, { color: activeColors.text }]}>₹{repair.balance.toLocaleString()}</Text>
                                    </View>

                                    <View style={styles.thinDivider} />

                                    {/* Extra Amount */}
                                    <View style={styles.inputRow}>
                                        <Text style={[styles.priceLabel, { color: activeColors.textLight }]}>{t('extra_amount') || 'Extra Amount'}</Text>
                                        <TextInput
                                            style={[styles.smallInput, { color: activeColors.text, borderColor: activeColors.border, backgroundColor: activeColors.cardBg }]}
                                            value={extraAmount}
                                            onChangeText={setExtraAmount}
                                            keyboardType="numeric"
                                            placeholder="0"
                                            placeholderTextColor={activeColors.textLight}
                                            returnKeyType="done"
                                        />
                                    </View>

                                    {/* GST Section */}
                                    {hasExistingGst ? (
                                        <View style={{ marginTop: 14 }}>
                                            <Text style={[styles.priceLabel, { color: activeColors.textLight, marginBottom: 8 }]}>{t('gst_applied') || 'GST Applied'}</Text>
                                            <View style={styles.priceRow}>
                                                <Text style={[styles.priceLabel, { color: activeColors.textLight }]}>
                                                    Amount {repair.gstType === 'percentage' ? `(${repair.amount && repair.amount > 0 ? ((repair.gstAmount! / repair.amount) * 100).toFixed(1).replace('.0', '') : ''}%)` : '(Fixed)'}
                                                </Text>
                                                <Text style={[styles.priceValue, { color: activeColors.text }]}>₹{Math.round(repair.gstAmount!).toLocaleString()}</Text>
                                            </View>
                                        </View>
                                    ) : (
                                        <View style={{ marginTop: 14 }}>
                                            <Text style={[styles.priceLabel, { color: activeColors.textLight, marginBottom: 8 }]}>{t('add_gst') || 'Add GST'}</Text>
                                            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                                                <View style={styles.gstToggleContainer}>
                                                    <TouchableOpacity
                                                        style={[styles.gstToggle, gstType === 'none' && styles.gstToggleActive]}
                                                        onPress={() => { setGstType('none'); setGstValue(''); }}
                                                    >
                                                        <Text style={[styles.gstToggleText, gstType === 'none' && styles.gstToggleTextActive]}>None</Text>
                                                    </TouchableOpacity>
                                                    <TouchableOpacity
                                                        style={[styles.gstToggle, gstType === 'percentage' && styles.gstToggleActive]}
                                                        onPress={() => setGstType('percentage')}
                                                    >
                                                        <Text style={[styles.gstToggleText, gstType === 'percentage' && styles.gstToggleTextActive]}>%</Text>
                                                    </TouchableOpacity>
                                                    <TouchableOpacity
                                                        style={[styles.gstToggle, gstType === 'amount' && styles.gstToggleActive]}
                                                        onPress={() => setGstType('amount')}
                                                    >
                                                        <Text style={[styles.gstToggleText, gstType === 'amount' && styles.gstToggleTextActive]}>₹</Text>
                                                    </TouchableOpacity>
                                                </View>

                                                {gstType !== 'none' && (
                                                    <TextInput
                                                        style={[styles.smallInput, { color: activeColors.text, borderColor: activeColors.border, backgroundColor: activeColors.cardBg }]}
                                                        value={gstValue}
                                                        onChangeText={setGstValue}
                                                        keyboardType="numeric"
                                                        placeholder={gstType === 'percentage' ? '3' : '0'}
                                                        placeholderTextColor={activeColors.textLight}
                                                        returnKeyType="done"
                                                    />
                                                )}
                                            </View>
                                            {finalGstAmount > 0 && (
                                                <View style={[styles.priceRow, { marginTop: 10 }]}>
                                                    <Text style={[styles.priceLabel, { color: activeColors.textLight }]}>
                                                        GST {gstType === 'percentage' ? `(${parsedGstValue}%)` : '(Fixed)'}
                                                    </Text>
                                                    <Text style={[styles.priceValue, { color: activeColors.text }]}>₹{Math.round(finalGstAmount).toLocaleString()}</Text>
                                                </View>
                                            )}
                                        </View>
                                    )}

                                    <View style={styles.divider} />

                                    {/* Total */}
                                    <View style={styles.totalRow}>
                                        <Text style={[styles.totalLabel, { color: activeColors.text }]}>{t('total_due_paid') || 'Total Due Paid'}</Text>
                                        <Text style={[styles.totalValue, { color: COLORS.primary }]}>₹{Math.round(totalAmount).toLocaleString()}</Text>
                                    </View>
                                </View>

                                {/* Deliver Button */}
                                <TouchableOpacity
                                    style={[styles.deliverBtn, { backgroundColor: COLORS.success }]}
                                    onPress={() => setShowConfirm(true)}
                                    disabled={loading}
                                >
                                    {loading ? (
                                        <ActivityIndicator color="#FFF" />
                                    ) : (
                                        <>
                                            <Ionicons name="print-outline" size={24} color="#FFF" />
                                            <Text style={styles.deliverBtnText}>{t('review_print_receipt') || 'Review & Print Receipt'}</Text>
                                        </>
                                    )}
                                </TouchableOpacity>
                            </ScrollView>
                        </View>
                    </KeyboardAvoidingView>
                </View>
            </Modal>

            {/* Custom Confirmation Modal */}
            <Modal
                visible={showConfirm}
                transparent
                animationType="fade"
                onRequestClose={() => setShowConfirm(false)}
                statusBarTranslucent
            >
                <View style={styles.confirmModalOverlay}>
                    <View style={[styles.confirmModalContent, { backgroundColor: activeColors.cardBg, borderColor: activeColors.border }]}>
                        <View style={styles.confirmHeader}>
                            <Ionicons name="information-circle" size={28} color={COLORS.primary} />
                            <Text style={[styles.confirmTitle, { color: activeColors.text }]}>{t('confirm_delivery') || 'Confirm Delivery'}</Text>
                        </View>

                        <View style={styles.confirmBody}>
                            <View style={styles.confirmRow}>
                                <Text style={[styles.confirmLabel, { color: activeColors.textLight }]}>{t('repair_price') || 'Repair Price'}</Text>
                                <Text style={[styles.confirmValue, { color: activeColors.text }]}>₹{(repair as any).amount?.toLocaleString() ?? 0}</Text>
                            </View>
                            <View style={styles.confirmRow}>
                                <Text style={[styles.confirmLabel, { color: activeColors.textLight }]}>{t('advance_paid') || 'Advance Paid'}</Text>
                                <Text style={[styles.confirmValue, { color: '#2e7d32' }]}>- ₹{repair.advance.toLocaleString()}</Text>
                            </View>
                            <View style={styles.confirmRow}>
                                <Text style={[styles.confirmLabel, { color: activeColors.textLight }]}>{t('balance') || 'Balance'}</Text>
                                <Text style={[styles.confirmValue, { color: activeColors.text }]}>₹{repair.balance.toLocaleString()}</Text>
                            </View>
                            {extraNum > 0 && (
                                <View style={styles.confirmRow}>
                                    <Text style={[styles.confirmLabel, { color: activeColors.textLight }]}>{t('extra_amount') || 'Extra Amount'}</Text>
                                    <Text style={[styles.confirmValue, { color: activeColors.text }]}>+ ₹{extraNum.toLocaleString()}</Text>
                                </View>
                            )}
                            {!hasExistingGst && finalGstAmount > 0 && (
                                <View style={styles.confirmRow}>
                                    <Text style={[styles.confirmLabel, { color: activeColors.textLight }]}>{t('new_gst') || 'New GST'}</Text>
                                    <Text style={[styles.confirmValue, { color: activeColors.text }]}>+ ₹{Math.round(finalGstAmount).toLocaleString()}</Text>
                                </View>
                            )}

                            <View style={styles.confirmDivider} />

                            <View style={styles.confirmRow}>
                                <Text style={[styles.confirmTotalLabel, { color: activeColors.text }]}>{t('total_due_paid') || 'Total Due Paid'}</Text>
                                <Text style={[styles.confirmTotalValue, { color: COLORS.primary }]}>₹{Math.round(totalAmount).toLocaleString()}</Text>
                            </View>
                        </View>


                        <View style={styles.confirmActions}>
                            <TouchableOpacity
                                style={[styles.confirmCancelBtn, { borderColor: activeColors.border }]}
                                onPress={() => setShowConfirm(false)}
                                disabled={loading}
                            >
                                <Text style={[styles.confirmCancelText, { color: activeColors.textLight }]}>{t('cancel') || 'Cancel'}</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[styles.confirmSubmitBtn, { backgroundColor: isPrinted ? COLORS.success : COLORS.primary, flexDirection: 'row' }]}
                                onPress={handleDeliver}
                                disabled={loading || isPrinted}
                            >
                                {loading ? (
                                    <ActivityIndicator color="#FFF" />
                                ) : isPrinted ? (
                                    <>
                                        <Ionicons name="checkmark-circle" size={20} color="#FFF" style={{ marginRight: 6 }} />
                                        <Text style={styles.confirmSubmitText}>{t('printed_success') || 'Printed!'}</Text>
                                    </>
                                ) : (
                                    <Text style={styles.confirmSubmitText}>{t('confirm_print') || 'Confirm & Print'}</Text>
                                )}
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>
        </>
    );
}

const styles = StyleSheet.create({
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.55)',
        justifyContent: 'center',
        paddingVertical: 40,
        paddingHorizontal: 15,
    },
    kavContainer: {
        width: '100%',
        justifyContent: 'center',
    },
    modalContent: {
        width: '100%',
        maxHeight: '100%',
        borderRadius: BORDER_RADIUS.lg,
        paddingHorizontal: SPACING.md,
        paddingTop: SPACING.md,
        paddingBottom: 8,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: SPACING.sm,
    },
    headerTitle: {
        fontSize: FONT_SIZES.xl,
        fontWeight: 'bold',
    },
    scrollContent: {
        paddingBottom: 28,
    },
    infoCard: {
        borderRadius: BORDER_RADIUS.md,
        padding: SPACING.md,
        borderWidth: 1,
        marginBottom: SPACING.md,
    },
    infoRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 6,
    },
    infoLabel: {
        fontSize: 13,
        flex: 1,
    },
    infoValue: {
        fontSize: 13,
        fontWeight: 'bold',
        flex: 2,
        textAlign: 'right',
    },
    imageSection: {
        marginBottom: SPACING.md,
    },
    sectionTitle: {
        fontSize: 13,
        fontWeight: 'bold',
        marginBottom: 8,
    },
    itemImage: {
        width: 100,
        height: 80,
        borderRadius: 8,
        marginRight: 8,
    },
    pricingCard: {
        borderRadius: BORDER_RADIUS.lg,
        padding: SPACING.md,
        borderWidth: 1,
        marginBottom: SPACING.lg,
    },
    priceRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 10,
    },
    inputRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginTop: 4,
    },
    priceLabel: {
        fontSize: 15,
    },
    priceValue: {
        fontSize: 15,
        fontWeight: 'bold',
    },
    smallInput: {
        width: 100,
        borderWidth: 1,
        borderRadius: 8,
        paddingHorizontal: 10,
        paddingVertical: 7,
        fontSize: 15,
        textAlign: 'right',
    },
    thinDivider: {
        height: 1,
        backgroundColor: 'rgba(0,0,0,0.08)',
        marginVertical: 10,
    },
    divider: {
        height: 1,
        backgroundColor: 'rgba(0,0,0,0.12)',
        marginVertical: 14,
    },
    totalRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    totalLabel: {
        fontSize: 17,
        fontWeight: 'bold',
    },
    totalValue: {
        fontSize: 24,
        fontWeight: '900',
    },
    gstToggleContainer: {
        flexDirection: 'row',
        backgroundColor: 'rgba(0,0,0,0.06)',
        borderRadius: 8,
        padding: 2,
    },
    gstToggle: {
        paddingHorizontal: 14,
        paddingVertical: 6,
        borderRadius: 6,
    },
    gstToggleActive: {
        backgroundColor: COLORS.primary,
    },
    gstToggleText: {
        fontSize: 13,
        fontWeight: 'bold',
        color: '#777',
    },
    gstToggleTextActive: {
        color: '#FFF',
    },
    deliverBtn: {
        flexDirection: 'row',
        height: 56,
        borderRadius: BORDER_RADIUS.lg,
        justifyContent: 'center',
        alignItems: 'center',
        elevation: 3,
    },
    deliverBtnText: {
        color: '#FFF',
        fontSize: 17,
        fontWeight: 'bold',
        marginLeft: 10,
    },
    confirmModalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.65)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
    confirmModalContent: {
        width: '95%',
        borderRadius: BORDER_RADIUS.lg,
        padding: SPACING.lg,
        borderWidth: 1,
        elevation: 10,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 5,
    },
    confirmHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: SPACING.md,
    },
    confirmTitle: {
        fontSize: FONT_SIZES.xl,
        fontWeight: 'bold',
        marginLeft: 8,
    },
    confirmBody: {
        marginBottom: SPACING.lg,
    },
    confirmRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginTop: 8,
    },
    confirmLabel: {
        fontSize: FONT_SIZES.md,
    },
    confirmValue: {
        fontSize: FONT_SIZES.md,
        fontWeight: 'bold',
    },
    confirmDivider: {
        height: 1,
        backgroundColor: 'rgba(0,0,0,0.1)',
        marginVertical: 12,
    },
    confirmTotalLabel: {
        fontSize: 18,
        fontWeight: 'bold',
    },
    confirmTotalValue: {
        fontSize: 22,
        fontWeight: '900',
    },
    confirmActions: {
        flexDirection: 'row',
        justifyContent: 'space-between',
    },
    confirmCancelBtn: {
        flex: 1,
        height: 50,
        borderRadius: BORDER_RADIUS.md,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
        marginRight: 10,
    },
    confirmCancelText: {
        fontSize: FONT_SIZES.md,
        fontWeight: '600',
    },
    confirmSubmitBtn: {
        flex: 1.5,
        height: 50,
        borderRadius: BORDER_RADIUS.md,
        justifyContent: 'center',
        alignItems: 'center',
    },
    confirmSubmitText: {
        color: '#FFF',
        fontSize: FONT_SIZES.md,
        fontWeight: 'bold',
    },
});
