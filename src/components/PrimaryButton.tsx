import React from 'react';
import { TouchableOpacity, Text, StyleSheet, ActivityIndicator, ViewStyle, TextStyle } from 'react-native';
import { COLORS, SPACING, FONT_SIZES, BORDER_RADIUS } from '../constants/theme';

interface PrimaryButtonProps {
    title: string;
    onPress: () => void;
    isLoading?: boolean;
    disabled?: boolean;
    style?: ViewStyle;
    textStyle?: TextStyle;
    variant?: 'primary' | 'secondary' | 'outline' | 'danger';
}

export default function PrimaryButton({
    title,
    onPress,
    isLoading = false,
    disabled = false,
    style,
    textStyle,
    variant = 'primary',
}: PrimaryButtonProps) {
    const getBackgroundColor = () => {
        if (disabled) return COLORS.textLight;
        switch (variant) {
            case 'secondary': return COLORS.secondary;
            case 'outline': return 'transparent';
            case 'danger': return COLORS.error;
            default: return COLORS.primary;
        }
    };

    const getTextColor = () => {
        if (variant === 'outline') return COLORS.primary;
        return COLORS.white;
    };

    const borderStyle = variant === 'outline' ? { borderWidth: 1, borderColor: COLORS.primary } : {};

    return (
        <TouchableOpacity
            style={[
                styles.button,
                { backgroundColor: getBackgroundColor() },
                borderStyle,
                style,
            ]}
            onPress={onPress}
            disabled={disabled || isLoading}
            activeOpacity={0.8}
        >
            {isLoading ? (
                <ActivityIndicator color={getTextColor()} />
            ) : (
                <Text style={[styles.text, { color: getTextColor() }, textStyle]}>{title}</Text>
            )}
        </TouchableOpacity>
    );
}

const styles = StyleSheet.create({
    button: {
        height: 44,
        borderRadius: BORDER_RADIUS.md,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: SPACING.lg,
    },
    text: {
        fontSize: FONT_SIZES.sm,
        fontWeight: 'bold',
    },
});
