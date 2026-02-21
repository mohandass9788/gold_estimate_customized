import React, { useState } from 'react';
import { View as RNView, Text as RNText, StyleSheet, ScrollView as RNScrollView, Alert, TouchableOpacity as RNRTouchableOpacity } from 'react-native';
import ScreenContainer from '../components/ScreenContainer';
import HeaderBar from '../components/HeaderBar';
import InputField from '../components/InputField';
import PrimaryButton from '../components/PrimaryButton';
import { useEstimation } from '../store/EstimationContext';
import { COLORS, SPACING, FONT_SIZES, BORDER_RADIUS } from '../constants/theme';

// Fix for React 19 type mismatch
const View = RNView as any;
const Text = RNText as any;
const ScrollView = RNScrollView as any;
const TouchableOpacity = RNRTouchableOpacity as any;

export default function RateUpdateScreen() {
    const { state, updateGoldRate } = useEstimation();
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
        Alert.alert('Success', 'Rates updated successfully');
    };

    const RateInput = ({ label, value, keyName }: { label: string; value: string; keyName: keyof typeof rates }) => (
        <View style={{ marginBottom: 15 }}>
            <Text style={{ fontSize: FONT_SIZES.sm, color: COLORS.textLight, marginBottom: 5 }}>{label}</Text>
            <InputField
                value={value}
                onChangeText={(text) => {
                    setRates(prev => {
                        const newRates = { ...prev, [keyName]: text };

                        if (keyName === 'rate22k') {
                            const val = parseFloat(text);
                            if (!isNaN(val) && val > 0) {
                                // 22k is 91.6%
                                // Base (24k) = 22k / 0.916
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
                style={{ fontSize: FONT_SIZES.lg, fontWeight: 'bold' }}
            />
        </View>
    );

    return (
        <ScreenContainer>
            <HeaderBar title="Update Rates" />
            <ScrollView style={styles.content} contentContainerStyle={styles.scrollContent}>
                <View style={styles.card}>
                    <Text style={styles.sectionTitle}>Input Rates</Text>
                    <RateInput label="Gold 22K (91.6%)" value={rates.rate22k} keyName="rate22k" />
                    <RateInput label="Silver Rate" value={rates.silver} keyName="silver" />
                </View>

                <View style={styles.card}>
                    <Text style={styles.sectionTitle}>Calculated Rates (Read-Only)</Text>

                    <View style={styles.rateRow}>
                        <Text style={styles.rateLabel}>24K (99.9%)</Text>
                        <Text style={styles.rateValue}>₹ {rates.rate24k}</Text>
                    </View>
                    <View style={styles.rateRow}>
                        <Text style={styles.rateLabel}>20K (83.3%)</Text>
                        <Text style={styles.rateValue}>₹ {rates.rate20k}</Text>
                    </View>
                    <View style={styles.rateRow}>
                        <Text style={styles.rateLabel}>18K (75%)</Text>
                        <Text style={styles.rateValue}>₹ {rates.rate18k}</Text>
                    </View>
                </View>

                <PrimaryButton title="Save Rates" onPress={handleSave} style={styles.saveButton} />

                <Text style={styles.lastUpdated}>
                    Last updated: {new Date(state.goldRate.date).toLocaleString()}
                </Text>
            </ScrollView>
        </ScreenContainer>
    );
}

const styles = StyleSheet.create({
    content: {
        flex: 1,
    },
    scrollContent: {
        padding: SPACING.md,
        paddingBottom: 100,
    },
    card: {
        backgroundColor: COLORS.white,
        padding: SPACING.md,
        borderRadius: BORDER_RADIUS.md,
        marginBottom: SPACING.lg,
        elevation: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
    },
    sectionTitle: {
        fontSize: FONT_SIZES.lg,
        fontWeight: 'bold',
        color: COLORS.primary,
        marginBottom: SPACING.md,
    },
    saveButton: {
        marginTop: SPACING.md,
    },
    lastUpdated: {
        textAlign: 'center',
        marginTop: SPACING.lg,
        color: COLORS.textLight,
        fontSize: FONT_SIZES.xs,
    },
    rateRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 8,
        borderBottomWidth: 1,
        borderBottomColor: COLORS.background,
        paddingBottom: 4,
    },
    rateLabel: {
        fontSize: FONT_SIZES.md,
        color: COLORS.textLight,
    },
    rateValue: {
        fontSize: FONT_SIZES.md,
        fontWeight: 'bold',
        color: COLORS.primary,
    }
});
