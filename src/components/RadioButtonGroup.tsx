import React from 'react';
import { View as RNView, Text as RNText, StyleSheet, TouchableOpacity as RNRTouchableOpacity } from 'react-native';
import { COLORS, SPACING, FONT_SIZES, BORDER_RADIUS, LIGHT_COLORS, DARK_COLORS } from '../constants/theme';
import { useGeneralSettings } from '../store/GeneralSettingsContext';

// Fix for React 19 type mismatch
const View = RNView as any;
const Text = RNText as any;
const TouchableOpacity = RNRTouchableOpacity as any;

interface RadioButtonGroupProps {
    label?: string;
    options: { label: string; value: string }[];
    selectedValue: string;
    onSelect: (value: string) => void;
    style?: any;
    error?: string;
}

export default function RadioButtonGroup({ label, options, selectedValue, onSelect, style, error }: RadioButtonGroupProps) {
    const { theme } = useGeneralSettings();
    const activeColors = theme === 'light' ? LIGHT_COLORS : DARK_COLORS;

    return (
        <View style={[styles.container, style]}>
            {label && <Text style={[styles.label, { color: activeColors.textLight }]}>{label}</Text>}
            <View style={[styles.group, { borderColor: activeColors.border }]}>
                {options.map((option, index) => {
                    const isSelected = option.value === selectedValue;
                    return (
                        <TouchableOpacity
                            key={option.value}
                            activeOpacity={0.7}
                            onPress={() => onSelect(option.value)}
                            style={[
                                styles.option,
                                isSelected && { backgroundColor: activeColors.primary },
                                index !== options.length - 1 && { borderRightWidth: 1, borderRightColor: activeColors.border },
                                index === 0 && { borderTopLeftRadius: BORDER_RADIUS.sm, borderBottomLeftRadius: BORDER_RADIUS.sm },
                                index === options.length - 1 && { borderTopRightRadius: BORDER_RADIUS.sm, borderBottomRightRadius: BORDER_RADIUS.sm }
                            ]}
                        >
                            <Text style={[
                                styles.optionText,
                                { color: isSelected ? '#FFFFFF' : activeColors.textLight },
                                isSelected && { fontWeight: 'bold' }
                            ]}>
                                {option.label}
                            </Text>
                        </TouchableOpacity>
                    );
                })}
            </View>
            {error && <Text style={styles.errorText}>{error}</Text>}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        marginBottom: SPACING.md,
    },
    label: {
        fontSize: FONT_SIZES.sm,
        marginBottom: SPACING.xs,
        fontWeight: '600',
    },
    group: {
        flexDirection: 'row',
        borderWidth: 1,
        borderRadius: BORDER_RADIUS.sm,
        overflow: 'hidden',
    },
    option: {
        flex: 1,
        paddingVertical: SPACING.sm,
        alignItems: 'center',
        justifyContent: 'center',
    },
    optionText: {
        fontSize: FONT_SIZES.sm,
    },
    errorText: {
        color: '#FF3B30',
        fontSize: 10,
        marginTop: 2,
    },
});
