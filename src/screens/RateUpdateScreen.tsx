import React, { useState } from 'react';
import { View as RNView, Text as RNText, StyleSheet, ScrollView as RNScrollView, Alert, TouchableOpacity as RNRTouchableOpacity, KeyboardAvoidingView, Platform, TouchableWithoutFeedback, Keyboard } from 'react-native';
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
                style={{ fontSize: FONT_SIZES.lg, fontWeight: '900', color: activeColors.text }}
            />
        </View>
    );

    return (
        <ScreenContainer backgroundColor={activeColors.background}>
            <HeaderBar title={t('manage_gold_silver')} showBack />
            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                style={{ flex: 1 }}
            >
                <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
                    <ScrollView
                        style={styles.content}
                        contentContainerStyle={styles.scrollContent}
                        keyboardShouldPersistTaps="handled"
                    >
                        {/* Gold Section */}
                        <View style={[styles.card, { backgroundColor: activeColors.cardBg }]}>
                            <View style={styles.cardHeader}>
                                <Icon name="flash" size={18} color={COLORS.gold} />
                                <Text style={[styles.sectionTitle, { color: activeColors.text }]}>{t('gold_rates') || 'Gold Rates (per Gram)'}</Text>
                            </View>

                            <RateInput label="Gold 22K (91.6%)" value={rates.rate22k} keyName="rate22k" icon="flash-outline" iconColor={COLORS.gold} />

                            <View style={[styles.calculatedBox, { backgroundColor: activeColors.background }]}>
                                <Text style={[styles.subTitle, { color: activeColors.textLight }]}>{t('calculated_suggested') || 'Calculated Purity Rates'}</Text>

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

                        {/* Silver Section */}
                        <View style={[styles.card, { backgroundColor: activeColors.cardBg, borderColor: '#C0C0C033' }]}>
                            <View style={styles.cardHeader}>
                                <Icon name="leaf" size={18} color="#C0C0C0" />
                                <Text style={[styles.sectionTitle, { color: activeColors.text }]}>{t('silver_rates') || 'Silver Rates'}</Text>
                            </View>
                            <RateInput label="Common Silver (1g)" value={rates.silver} keyName="silver" icon="leaf-outline" iconColor="#C0C0C0" />
                        </View>

                        <PrimaryButton title={t('save_rates') || 'Save Rates'} onPress={handleSave} style={styles.saveButton} />

                        <Text style={[styles.lastUpdated, { color: activeColors.textLight }]}>
                            {t('last_updated') || 'Last updated'}: {new Date(state.goldRate.date).toLocaleString()}
                        </Text>
                    </ScrollView>
                </TouchableWithoutFeedback>
            </KeyboardAvoidingView>
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
        shadowColor: COLORS.primary,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 6,
    },
    lastUpdated: {
        textAlign: 'center',
        marginTop: SPACING.xl,
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
    }
});
