import React from 'react';
import { View as RNView, Text as RNText, StyleSheet } from 'react-native';
import InputField from './InputField';
import { COLORS, SPACING, FONT_SIZES, LIGHT_COLORS, DARK_COLORS } from '../constants/theme';
import { useGeneralSettings } from '../store/GeneralSettingsContext';

// Fix for React 19 type mismatch
const View = RNView as any;
const Text = RNText as any;

interface WeightInputProps {
    grossWeight: string;
    stoneWeight: string;
    netWeight: string;
    onGrossChange: (text: string) => void;
    onStoneChange: (text: string) => void;
    error?: string;
}

export default function WeightInput({
    grossWeight,
    stoneWeight,
    netWeight,
    onGrossChange,
    onStoneChange,
    error,
}: WeightInputProps) {
    const { theme, t } = useGeneralSettings();
    const activeColors = theme === 'light' ? LIGHT_COLORS : DARK_COLORS;

    return (
        <View style={styles.container}>
            <View style={styles.row}>
                <InputField
                    label={t('gross_weight')}
                    value={grossWeight}
                    onChangeText={onGrossChange}
                    keyboardType="numeric"
                    style={{ flex: 1, marginRight: SPACING.xs }}
                    error={error}
                />
                <InputField
                    label={t('stone_weight') || 'Stone Wt (g)'}
                    value={stoneWeight}
                    onChangeText={onStoneChange}
                    keyboardType="numeric"
                    style={{ flex: 1 }}
                />
            </View>
            <View style={[styles.netWeightContainer, { backgroundColor: activeColors.background, borderColor: activeColors.border }]}>
                <Text style={[styles.netWeightLabel, { color: activeColors.textLight }]}>{t('net_weight')}:</Text>
                <Text style={[styles.netWeightValue, { color: activeColors.primary }]}>{netWeight} g</Text>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        marginBottom: SPACING.md,
    },
    row: {
        flexDirection: 'row',
    },
    netWeightContainer: {
        padding: SPACING.md,
        borderRadius: 8,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginTop: -SPACING.sm, // Bring closer to inputs
        borderWidth: 1,
        borderStyle: 'dashed',
    },
    netWeightLabel: {
        fontSize: FONT_SIZES.md,
        fontWeight: '500',
    },
    netWeightValue: {
        fontSize: FONT_SIZES.lg,
        fontWeight: 'bold',
    },
});
