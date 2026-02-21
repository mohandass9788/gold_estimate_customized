import React from 'react';
import { View as RNView, Text as RNText, TextInput as RNTextInput, StyleSheet, KeyboardTypeOptions, ViewStyle } from 'react-native';
import { COLORS, SPACING, FONT_SIZES, BORDER_RADIUS, LIGHT_COLORS, DARK_COLORS } from '../constants/theme';
import { useGeneralSettings } from '../store/GeneralSettingsContext';

interface InputFieldProps {
    label?: string;
    value: string;
    onChangeText?: (text: string) => void;
    placeholder?: string;
    keyboardType?: KeyboardTypeOptions;
    secureTextEntry?: boolean;
    style?: ViewStyle;
    textStyle?: any;
    error?: string;
    rightAction?: React.ReactNode;
    multiline?: boolean;
    numberOfLines?: number;
    maxLength?: number;
    editable?: boolean;
    helperText?: string;
}

// Fix for React 19 type mismatch
const View = RNView as any;
const Text = RNText as any;
const TextInput = RNTextInput as any;

export default function InputField({
    label,
    value,
    onChangeText,
    placeholder,
    keyboardType = 'default',
    secureTextEntry = false,
    style,
    textStyle,
    error,
    rightAction,
    multiline = false,
    numberOfLines = 1,
    maxLength,
    editable = true,
    helperText,
}: InputFieldProps) {
    const { theme } = useGeneralSettings();
    const activeColors = theme === 'light' ? LIGHT_COLORS : DARK_COLORS;

    return (
        <View style={[styles.container, style]}>
            {label && <Text style={[styles.label, { color: activeColors.text }]}>{label}</Text>}
            <View style={[
                styles.inputWrapper,
                { backgroundColor: activeColors.cardBg, borderColor: activeColors.border },
                error ? { borderColor: activeColors.error, backgroundColor: activeColors.error + '10' } : null,
                multiline && { height: 100, alignItems: 'flex-start' }
            ]}>
                <TextInput
                    style={[styles.input, { color: activeColors.text }, textStyle, multiline && { height: 90, textAlignVertical: 'top', paddingTop: SPACING.sm }, !editable && { opacity: 0.7 }]}
                    value={value}
                    onChangeText={onChangeText}
                    placeholder={placeholder}
                    placeholderTextColor={activeColors.textLight}
                    keyboardType={keyboardType}
                    secureTextEntry={secureTextEntry}
                    multiline={multiline}
                    numberOfLines={numberOfLines}
                    maxLength={maxLength}
                    editable={editable}
                />
                {rightAction && <View style={styles.rightAction}>{rightAction}</View>}
            </View>
            {error && <Text style={[styles.errorText, { color: activeColors.error }]}>{error}</Text>}
            {helperText && !error && <Text style={[styles.helperText, { color: activeColors.textLight }]}>{helperText}</Text>}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        marginBottom: SPACING.sm,
    },
    label: {
        fontSize: FONT_SIZES.sm,
        marginBottom: 2,
        fontWeight: '600',
        minHeight: 18,
    },
    inputWrapper: {
        flexDirection: 'row',
        alignItems: 'center',
        borderWidth: 1.5,
        borderRadius: BORDER_RADIUS.md,
    },
    input: {
        flex: 1,
        height: 48,
        paddingHorizontal: SPACING.md,
        fontSize: FONT_SIZES.md,
    },
    rightAction: {
        paddingRight: SPACING.sm,
    },
    errorText: {
        fontSize: FONT_SIZES.xs,
        marginTop: 2,
    },
    helperText: {
        fontSize: 10,
        marginTop: 2,
        fontStyle: 'italic',
    },
});
