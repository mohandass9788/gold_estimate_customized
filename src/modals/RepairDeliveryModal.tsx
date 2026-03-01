import React, { useState } from 'react';
import {
    View, Text, StyleSheet, Modal, TouchableOpacity,
    TextInput, ScrollView, Image, ActivityIndicator,
    KeyboardAvoidingView, Platform, Alert
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useGeneralSettings } from '../store/GeneralSettingsContext';
import { updateRepairStatus, DBRepair, getSetting } from '../services/dbService';
import { printRepairDelivery } from '../services/printService';
import { COLORS, SPACING, FONT_SIZES, BORDER_RADIUS, LIGHT_COLORS, DARK_COLORS } from '../constants/theme';

interface RepairDeliveryModalProps {
    visible: boolean;
    repair: DBRepair | null;
    onClose: () => void;
    onSuccess: () => void;
}

export default function RepairDeliveryModal({ visible, repair, onClose, onSuccess }: RepairDeliveryModalProps) {
    const { theme, t, receiptConfig } = useGeneralSettings();
    const [extraAmount, setExtraAmount] = useState('');
    const [gstType, setGstType] = useState<'none' | 'amount' | 'percentage'>('none');
    const [gstValue, setGstValue] = useState('');
    const [loading, setLoading] = useState(false);

    const activeColors = theme === 'light' ? LIGHT_COLORS : DARK_COLORS;

    if (!repair) return null;

    const images = JSON.parse(repair.images || '[]');
    const extraNum = parseFloat(extraAmount) || 0;
    const baseTotal = repair.balance + extraNum;
    const parsedGstValue = parseFloat(gstValue) || 0;

    let gstAmount = 0;
    if (gstType === 'amount') {
        gstAmount = parsedGstValue;
    } else if (gstType === 'percentage') {
        gstAmount = (baseTotal * parsedGstValue) / 100;
    }

    const totalAmount = baseTotal + gstAmount;

    const handleDeliver = async () => {
        setLoading(true);
        try {
            await updateRepairStatus(
                repair.id,
                'DELIVERED',
                extraNum,
                new Date().toISOString(),
                gstAmount,
                gstType
            );

            const shopName = await getSetting('shop_name');
            const shopAddress = await getSetting('shop_address');
            const shopPhone = await getSetting('shop_phone');

            const shopDetails = {
                name: shopName,
                address1: shopAddress,
                mobile: shopPhone
            };

            await printRepairDelivery(repair, extraNum, gstAmount, shopDetails, undefined, receiptConfig);

            onSuccess();
        } catch (error) {
            console.error('Delivery failed:', error);
        } finally {
            setLoading(false);
        }
    };

    return (
        <Modal
            visible={visible}
            transparent
            animationType="slide"
            onRequestClose={onClose}
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
                            <TouchableOpacity onPress={onClose}>
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
                                    <Text style={[styles.infoLabel, { color: activeColors.textLight }]}>Customer</Text>
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
                                    <Text style={[styles.priceLabel, { color: activeColors.textLight }]}>Repair Price</Text>
                                    <Text style={[styles.priceValue, { color: activeColors.text }]}>₹{(repair as any).amount?.toLocaleString() ?? '—'}</Text>
                                </View>

                                {/* Advance Paid */}
                                <View style={styles.priceRow}>
                                    <Text style={[styles.priceLabel, { color: activeColors.textLight }]}>Advance Paid</Text>
                                    <Text style={[styles.priceValue, { color: '#2e7d32' }]}>₹{repair.advance.toLocaleString()}</Text>
                                </View>

                                {/* Balance */}
                                <View style={styles.priceRow}>
                                    <Text style={[styles.priceLabel, { color: activeColors.textLight }]}>Balance</Text>
                                    <Text style={[styles.priceValue, { color: activeColors.text }]}>₹{repair.balance.toLocaleString()}</Text>
                                </View>

                                <View style={styles.thinDivider} />

                                {/* Extra Amount */}
                                <View style={styles.inputRow}>
                                    <Text style={[styles.priceLabel, { color: activeColors.textLight }]}>Extra Amount</Text>
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
                                <View style={{ marginTop: 14 }}>
                                    <Text style={[styles.priceLabel, { color: activeColors.textLight, marginBottom: 8 }]}>Add GST</Text>
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
                                </View>

                                {/* Computed GST display */}
                                {gstAmount > 0 && (
                                    <View style={[styles.priceRow, { marginTop: 10 }]}>
                                        <Text style={[styles.priceLabel, { color: activeColors.textLight }]}>
                                            GST {gstType === 'percentage' ? `(${parsedGstValue}%)` : '(Fixed)'}
                                        </Text>
                                        <Text style={[styles.priceValue, { color: activeColors.text }]}>₹{Math.round(gstAmount).toLocaleString()}</Text>
                                    </View>
                                )}

                                <View style={styles.divider} />

                                {/* Total */}
                                <View style={styles.totalRow}>
                                    <Text style={[styles.totalLabel, { color: activeColors.text }]}>Total Due Paid</Text>
                                    <Text style={[styles.totalValue, { color: COLORS.primary }]}>₹{Math.round(totalAmount).toLocaleString()}</Text>
                                </View>
                            </View>

                            {/* Deliver Button */}
                            <TouchableOpacity
                                style={[styles.deliverBtn, { backgroundColor: COLORS.success }]}
                                onPress={() => {
                                    Alert.alert(
                                        'Confirm Delivery',
                                        `Repair Price: ₹${(repair as any).amount?.toLocaleString() ?? 0}\nAdvance Paid: ₹${repair.advance.toLocaleString()}\nBalance: ₹${repair.balance.toLocaleString()}${extraNum > 0 ? `\nExtra: ₹${extraNum.toLocaleString()}` : ''}${gstAmount > 0 ? `\nGST: ₹${Math.round(gstAmount).toLocaleString()}` : ''}\n\nTotal Due Paid: ₹${Math.round(totalAmount).toLocaleString()}`,
                                        [
                                            { text: 'Cancel', style: 'cancel' },
                                            { text: 'Confirm & Print', onPress: handleDeliver }
                                        ]
                                    );
                                }}
                                disabled={loading}
                            >
                                {loading ? (
                                    <ActivityIndicator color="#FFF" />
                                ) : (
                                    <>
                                        <Ionicons name="print-outline" size={24} color="#FFF" />
                                        <Text style={styles.deliverBtnText}>Review & Print Receipt</Text>
                                    </>
                                )}
                            </TouchableOpacity>
                        </ScrollView>
                    </View>
                </KeyboardAvoidingView>
            </View>
        </Modal>
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
});
