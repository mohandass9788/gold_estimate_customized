import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SPACING, FONT_SIZES, LIGHT_COLORS, DARK_COLORS } from '../constants/theme';
import { useGeneralSettings } from '../store/GeneralSettingsContext';

// Fix for React 19 type mismatch with @expo/vector-icons
const Icon = Ionicons as any;

interface HeaderBarProps {
    title: string;
    showBack?: boolean;
    onBack?: () => void;
    rightAction?: React.ReactNode;
}

export default function HeaderBar({ title, showBack = false, onBack, rightAction }: HeaderBarProps) {
    const router = useRouter();
    const { theme, connectedPrinter, isPrinterConnected, printerType } = useGeneralSettings();

    const activeColors = theme === 'light' ? LIGHT_COLORS : DARK_COLORS;

    const handleBack = () => {
        if (onBack) {
            onBack();
        } else {
            router.back();
        }
    };

    return (
        <View style={[styles.container, { backgroundColor: activeColors.cardBg, borderBottomColor: activeColors.border }]}>
            <View style={styles.leftContainer}>
                {showBack && (
                    <TouchableOpacity onPress={handleBack} style={styles.backButton}>
                        <Icon name="arrow-back" size={24} color={activeColors.text} />
                    </TouchableOpacity>
                )}
                <Text style={[styles.title, { color: activeColors.text }]}>{title}</Text>
            </View>
            <View style={styles.rightContainer}>
                <TouchableOpacity
                    style={styles.printerIndicator}
                    onPress={() => (router as any).push('/settings/printers')}
                >
                    <Icon
                        name="print"
                        size={20}
                        color={(printerType === 'thermal' && !isPrinterConnected) ? activeColors.error : activeColors.success}
                    />
                    <View style={[
                        styles.statusDot,
                        { backgroundColor: (printerType === 'thermal' && !isPrinterConnected) ? activeColors.error : activeColors.success }
                    ]} />
                </TouchableOpacity>
                {rightAction}
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        height: 60,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: SPACING.md,
        elevation: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
    },
    leftContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
    },
    backButton: {
        marginRight: SPACING.sm,
        padding: SPACING.xs,
    },
    title: {
        fontSize: FONT_SIZES.lg,
        fontWeight: 'bold',
        flexShrink: 1,
    },
    rightContainer: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    printerIndicator: {
        flexDirection: 'row',
        alignItems: 'center',
        marginRight: SPACING.sm,
        padding: SPACING.xs,
    },
    statusDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
        position: 'absolute',
        top: 2,
        right: 2,
        borderWidth: 1,
        borderColor: 'white',
    }
});
