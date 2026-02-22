import React, { useState } from 'react';
import { View as RNView, Text as RNText, StyleSheet, ScrollView as RNScrollView, Alert, TouchableOpacity as RNRTouchableOpacity, KeyboardAvoidingView, Platform, TouchableWithoutFeedback, Keyboard, Modal as RNModal } from 'react-native';
import ScreenContainer from '../components/ScreenContainer';
import HeaderBar from '../components/HeaderBar';
import InputField from '../components/InputField';
import PrimaryButton from '../components/PrimaryButton';
import { useEstimation } from '../store/EstimationContext';
import { useGeneralSettings } from '../store/GeneralSettingsContext';
import { COLORS, SPACING, FONT_SIZES, BORDER_RADIUS, LIGHT_COLORS, DARK_COLORS } from '../constants/theme';
import { Ionicons } from '@expo/vector-icons';

// Fix for React 19 type mismatch
const View = RNView as any;
const Text = RNText as any;
const ScrollView = RNScrollView as any;
const TouchableOpacity = RNRTouchableOpacity as any;
const Modal = RNModal as any;
const Icon = Ionicons as any;

export default function RateUpdateScreen() {
    const { state, updateGoldRate } = useEstimation();
    const { theme, t } = useGeneralSettings();
    const activeColors = theme === 'light' ? LIGHT_COLORS : DARK_COLORS;

    const [rates, setRates] = useState({
        rate18k: state.goldRate.rate18k.toString(),
        rate20k: state.goldRate.rate20k.toString(),
        rate22k: state.goldRate.rate22k.toString(),
        rate24k: state.goldRate.rate24k.toString(),
        silver: state.goldRate.silver.toString(),
    });

    const [showModal, setShowModal] = useState(false);

    const handleSave = () => {
        const newGoldRate = {
            rate18k: parseFloat(rates.rate18k) || 0,
            rate20k: parseFloat(rates.rate20k) || 0,
            rate22k: parseFloat(rates.rate22k) || 0,
            rate24k: parseFloat(rates.rate24k) || 0,
            silver: parseFloat(rates.silver) || 0,
            date: new Date().toISOString(),
        };

        updateGoldRate(newGoldRate);
        setShowModal(false);
        Alert.alert(t('success'), t('rates_updated_success') || 'Rates updated successfully');
    };

    const RateInput = ({ label, value, keyName, icon, iconColor }: { label: string; value: string; keyName: keyof typeof rates; icon: string; iconColor: string }) => (
        <View style={{ marginBottom: 15 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
                <Icon name={icon} size={14} color={iconColor} style={{ marginRight: 6 }} />
                <Text style={{ fontSize: FONT_SIZES.sm, color: activeColors.textLight, fontWeight: 'bold' }}>{label}</Text>
            </View>
            <InputField
                value={value}
                onChangeText={(text) => {
                    setRates(prev => {
                        const newRates = { ...prev, [keyName]: text };

                        if (keyName === 'rate22k') {
                            const val = parseFloat(text);
                            if (!isNaN(val) && val > 0) {
                                const baseRate = val / 0.916;
                                newRates.rate24k = Math.round(baseRate).toString();
                                newRates.rate20k = Math.round(baseRate * 0.833).toString();
                                newRates.rate18k = Math.round(baseRate * 0.75).toString();
                            } else {
                                newRates.rate24k = '';
                                newRates.rate20k = '';
                                newRates.rate18k = '';
                            }
                        }
                        return newRates;
                    });
                }}
                keyboardType="numeric"
                placeholder="0.00"
                textStyle={{ fontSize: FONT_SIZES.lg, fontWeight: '900', color: activeColors.text }}
            />
        </View>
    );

    return (
        <ScreenContainer backgroundColor={activeColors.background}>
            <HeaderBar title={t('manage_gold_silver')} showBack />

            <ScrollView
                style={styles.content}
                contentContainerStyle={styles.scrollContent}
            >
                <View style={[styles.mainCard, { backgroundColor: activeColors.cardBg }]}>
                    <View style={styles.cardHeader}>
                        <Icon name="trending-up" size={24} color={COLORS.primary} />
                        <Text style={[styles.mainCardTitle, { color: activeColors.text }]}>{t('current_rates') || 'Current Market Rates'}</Text>
                    </View>

                    <View style={styles.ratesDisplayGrid}>
                        <View style={styles.displayItem}>
                            <View style={styles.displayInfo}>
                                <Icon name="flash" size={16} color={COLORS.gold} />
                                <Text style={styles.displayLabel}>24K Gold</Text>
                            </View>
                            <Text style={[styles.displayValue, { color: COLORS.gold }]}>₹ {rates.rate24k}</Text>
                        </View>
                        <View style={styles.displayItem}>
                            <View style={styles.displayInfo}>
                                <Icon name="flash-outline" size={16} color={activeColors.text} />
                                <Text style={styles.displayLabel}>22K Gold</Text>
                            </View>
                            <Text style={[styles.displayValue, { color: activeColors.text }]}>₹ {rates.rate22k}</Text>
                        </View>
                        <View style={styles.displayItem}>
                            <View style={styles.displayInfo}>
                                <Icon name="leaf" size={16} color="#94a3b8" />
                                <Text style={styles.displayLabel}>Silver (1g)</Text>
                            </View>
                            <Text style={[styles.displayValue, { color: '#94a3b8' }]}>₹ {rates.silver}</Text>
                        </View>
                    </View>

                    <TouchableOpacity
                        style={[styles.updateTriggerButton, { backgroundColor: COLORS.primary }]}
                        onPress={() => setShowModal(true)}
                    >
                        <Icon name="create-outline" size={20} color={COLORS.white} />
                        <Text style={styles.updateTriggerText}>{t('update_rates')}</Text>
                    </TouchableOpacity>

                    <Text style={[styles.lastUpdated, { color: activeColors.textLight }]}>
                        {t('last_updated')}: {new Date(state.goldRate.date).toLocaleString()}
                    </Text>
                </View>

                {/* Info Text */}
                <View style={styles.infoBox}>
                    <Icon name="information-circle-outline" size={18} color={activeColors.textLight} />
                    <Text style={[styles.infoText, { color: activeColors.textLight }]}>
                        Purity rates (24K, 20K, 18K) are automatically calculated based on the 22K (91.6%) rate.
                    </Text>
                </View>
            </ScrollView>

            {/* Update Rates Modal */}
            <Modal
                visible={showModal}
                transparent
                animationType="slide"
                onRequestClose={() => setShowModal(false)}
            >
                <KeyboardAvoidingView
                    behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                    style={styles.modalOverlay}
                >
                    <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
                        <View style={[styles.modalContent, { backgroundColor: activeColors.cardBg }]}>
                            <View style={styles.modalHeader}>
                                <Text style={[styles.modalTitle, { color: activeColors.text }]}>{t('update_rates')}</Text>
                                <TouchableOpacity onPress={() => setShowModal(false)} style={styles.closeButton}>
                                    <Icon name="close" size={24} color={activeColors.text} />
                                </TouchableOpacity>
                            </View>

                            <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>
                                <View style={styles.inputSection}>
                                    <View style={styles.cardHeader}>
                                        <Icon name="flash" size={18} color={COLORS.gold} />
                                        <Text style={[styles.sectionTitle, { color: activeColors.text }]}>{t('gold_rates')}</Text>
                                    </View>

                                    <RateInput label="Gold 22K (91.6%)" value={rates.rate22k} keyName="rate22k" icon="flash-outline" iconColor={COLORS.gold} />

                                    <View style={[styles.calculatedBox, { backgroundColor: activeColors.background }]}>
                                        <Text style={[styles.subTitle, { color: activeColors.textLight }]}>{t('calculated_suggested')}</Text>

                                        <View style={styles.rateRow}>
                                            <Text style={[styles.rateLabel, { color: activeColors.textLight }]}>24K (99.9%)</Text>
                                            <View style={styles.rateHighlight}>
                                                <Text style={[styles.rateValue, { color: activeColors.primary }]}>₹ {rates.rate24k}</Text>
                                            </View>
                                        </View>
                                        <View style={styles.rateRow}>
                                            <Text style={[styles.rateLabel, { color: activeColors.textLight }]}>20K (83.3%)</Text>
                                            <Text style={[styles.rateValue, { color: activeColors.text }]}>₹ {rates.rate20k}</Text>
                                        </View>
                                        <View style={styles.rateRow}>
                                            <Text style={[styles.rateLabel, { color: activeColors.textLight }]}>18K (75.0%)</Text>
                                            <Text style={[styles.rateValue, { color: activeColors.text }]}>₹ {rates.rate18k}</Text>
                                        </View>
                                    </View>
                                </View>

                                <View style={[styles.inputSection, { marginTop: 20 }]}>
                                    <View style={styles.cardHeader}>
                                        <Icon name="leaf" size={18} color="#94a3b8" />
                                        <Text style={[styles.sectionTitle, { color: activeColors.text }]}>{t('silver_rates')}</Text>
                                    </View>
                                    <RateInput label="Common Silver (1g)" value={rates.silver} keyName="silver" icon="leaf-outline" iconColor="#94a3b8" />
                                </View>
                            </ScrollView>

                            <View style={styles.modalFooter}>
                                <PrimaryButton title={t('save_rates')} onPress={handleSave} style={styles.saveButton} />
                            </View>
                        </View>
                    </TouchableWithoutFeedback>
                </KeyboardAvoidingView>
            </Modal>
        </ScreenContainer>
    );
}

const styles = StyleSheet.create({
    content: {
        flex: 1,
    },
    scrollContent: {
        padding: SPACING.md,
        paddingBottom: 120,
    },
    card: {
        padding: SPACING.md,
        borderRadius: BORDER_RADIUS.lg,
        marginBottom: SPACING.lg,
        elevation: 3,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        borderWidth: 1,
        borderColor: 'rgba(0,0,0,0.05)',
    },
    cardHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: SPACING.lg,
        gap: 8,
    },
    sectionTitle: {
        fontSize: FONT_SIZES.md,
        fontWeight: 'bold',
        textTransform: 'uppercase',
        letterSpacing: 1,
    },
    calculatedBox: {
        marginTop: SPACING.sm,
        padding: SPACING.md,
        borderRadius: BORDER_RADIUS.md,
    },
    subTitle: {
        fontSize: 10,
        fontWeight: 'bold',
        textTransform: 'uppercase',
        marginBottom: SPACING.md,
        letterSpacing: 0.5,
    },
    saveButton: {
        marginTop: SPACING.md,
    },
    lastUpdated: {
        textAlign: 'center',
        marginTop: SPACING.lg,
        fontSize: 10,
        opacity: 0.7,
    },
    rateRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 10,
        paddingBottom: 4,
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(0,0,0,0.03)',
    },
    rateLabel: {
        fontSize: FONT_SIZES.sm,
    },
    rateHighlight: {
        backgroundColor: 'rgba(212, 175, 55, 0.1)',
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: 4,
    },
    rateValue: {
        fontSize: FONT_SIZES.md,
        fontWeight: '900',
    },
    mainCard: {
        padding: SPACING.lg,
        borderRadius: BORDER_RADIUS.lg,
        elevation: 4,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
        borderWidth: 1,
        borderColor: 'rgba(0,0,0,0.05)',
    },
    mainCardTitle: {
        fontSize: FONT_SIZES.md,
        fontWeight: 'bold',
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },
    ratesDisplayGrid: {
        flexDirection: 'column',
        marginTop: SPACING.md,
        marginBottom: SPACING.lg,
    },
    displayItem: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: SPACING.sm,
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(0,0,0,0.05)',
    },
    displayInfo: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    displayLabel: {
        fontSize: 10,
        fontWeight: 'bold',
        color: COLORS.textLight,
        textTransform: 'uppercase',
        marginBottom: 8,
    },
    displayValue: {
        fontSize: FONT_SIZES.lg,
        fontWeight: '900',
    },
    updateTriggerButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: SPACING.md,
        borderRadius: BORDER_RADIUS.md,
        gap: 8,
        shadowColor: COLORS.primary,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 4,
        elevation: 4,
    },
    updateTriggerText: {
        color: COLORS.white,
        fontWeight: 'bold',
        fontSize: FONT_SIZES.md,
    },
    infoBox: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(0,0,0,0.02)',
        padding: SPACING.md,
        borderRadius: BORDER_RADIUS.md,
        marginTop: SPACING.xl,
        gap: 10,
    },
    infoText: {
        fontSize: 11,
        flex: 1,
        lineHeight: 16,
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'flex-end',
    },
    modalContent: {
        borderTopLeftRadius: BORDER_RADIUS.xl,
        borderTopRightRadius: BORDER_RADIUS.xl,
        padding: SPACING.lg,
        maxHeight: '90%',
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: SPACING.lg,
    },
    modalTitle: {
        fontSize: FONT_SIZES.lg,
        fontWeight: 'bold',
    },
    closeButton: {
        padding: 4,
    },
    modalBody: {
        marginBottom: SPACING.lg,
    },
    inputSection: {
        padding: SPACING.md,
        borderRadius: BORDER_RADIUS.lg,
        borderWidth: 1,
        borderColor: 'rgba(0,0,0,0.05)',
        backgroundColor: 'rgba(0,0,0,0.01)',
    },
    modalFooter: {
        paddingBottom: Platform.OS === 'ios' ? 40 : 20,
    }
});
