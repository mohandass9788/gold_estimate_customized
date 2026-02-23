import React from 'react';
import { Modal, StyleSheet, View as RNView, Text as RNText, ScrollView as RNScrollView, TouchableOpacity as RNRTouchableOpacity, Dimensions } from 'react-native';
import { SPACING, COLORS, FONT_SIZES, BORDER_RADIUS, LIGHT_COLORS, DARK_COLORS } from '../constants/theme';
import { useGeneralSettings } from '../store/GeneralSettingsContext';
import PrimaryButton from '../components/PrimaryButton';
import { Ionicons } from '@expo/vector-icons';
import { getCharWidth, cleanThermalPayload } from '../services/printService';

const View = RNView as any;
const Text = RNText as any;
const ScrollView = RNScrollView as any;
const TouchableOpacity = RNRTouchableOpacity as any;

interface PrintPreviewModalProps {
    visible: boolean;
    onClose: () => void;
    onPrint: () => void;
    thermalPayload?: string;
    html?: string;
    title?: string;
    onWidthChange?: (width: '58mm' | '80mm' | '112mm') => void;
}

export default function PrintPreviewModal({
    visible,
    onClose,
    onPrint,
    thermalPayload,
    html,
    title = 'Print Preview',
    onWidthChange
}: PrintPreviewModalProps) {
    const { theme, t, receiptConfig, printerType } = useGeneralSettings();
    const activeColors = theme === 'light' ? LIGHT_COLORS : DARK_COLORS;

    const paperWidth = receiptConfig.paperWidth || '58mm';
    const charWidth = getCharWidth(paperWidth);
    const cleanText = thermalPayload ? cleanThermalPayload(thermalPayload) : '';

    // Calculate display width based on paper width
    // 58mm: 200px approx
    // 80mm: 300px approx
    // 112mm: 400px approx
    const getDisplayWidth = () => {
        if (paperWidth === '112mm') return 380;
        if (paperWidth === '80mm') return 300;
        return 220;
    };

    return (
        <Modal
            visible={visible}
            animationType="slide"
            transparent={true}
            onRequestClose={onClose}
        >
            <View style={styles.modalOverlay}>
                <View style={[styles.modalContent, { backgroundColor: activeColors.background }]}>
                    <View style={styles.header}>
                        <Text style={[styles.headerTitle, { color: activeColors.text }]}>{title}</Text>
                        <TouchableOpacity onPress={onClose} style={styles.closeButton}>
                            <Ionicons name="close" size={24} color={activeColors.text} />
                        </TouchableOpacity>
                    </View>

                    <View style={styles.infoContainer}>
                        {['58mm', '80mm', '112mm'].map((width: any) => (
                            <TouchableOpacity
                                key={width}
                                onPress={() => onWidthChange && onWidthChange(width)}
                                style={[
                                    styles.widthTab,
                                    paperWidth === width && { backgroundColor: activeColors.primary }
                                ]}
                            >
                                <Text style={[
                                    styles.widthTabText,
                                    { color: paperWidth === width ? '#fff' : activeColors.textLight }
                                ]}>
                                    {width}
                                </Text>
                            </TouchableOpacity>
                        ))}
                    </View>

                    <ScrollView style={styles.previewScroll} contentContainerStyle={styles.scrollContent}>
                        <View
                            style={[
                                styles.receiptContainer,
                                {
                                    width: getDisplayWidth(),
                                    backgroundColor: '#fff', // Always white for paper feel
                                }
                            ]}
                        >
                            {printerType === 'thermal' ? (
                                <Text style={styles.thermalText}>
                                    {cleanText}
                                </Text>
                            ) : (
                                <Text style={{ color: '#000', textAlign: 'center', padding: 20 }}>
                                    System Print Preview (HTML Layout) - Ready to print.
                                </Text>
                            )}
                        </View>
                    </ScrollView>

                    <View style={styles.footer}>
                        <PrimaryButton
                            title={t('cancel') || 'Cancel'}
                            variant="outline"
                            onPress={onClose}
                            style={styles.actionButton}
                        />
                        <PrimaryButton
                            title={t('print') || 'Print'}
                            onPress={onPrint}
                            style={styles.actionButton}
                        />
                    </View>
                </View>
            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    modalContent: {
        width: '90%',
        maxHeight: '80%',
        borderRadius: BORDER_RADIUS.lg,
        overflow: 'hidden',
        elevation: 5,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: SPACING.md,
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(0,0,0,0.1)',
    },
    headerTitle: {
        fontSize: FONT_SIZES.lg,
        fontWeight: 'bold',
    },
    closeButton: {
        padding: 4,
    },
    infoContainer: {
        flexDirection: 'row',
        padding: SPACING.sm,
        justifyContent: 'center',
        gap: SPACING.sm,
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(0,0,0,0.05)',
    },
    widthTab: {
        paddingVertical: 6,
        paddingHorizontal: 16,
        borderRadius: 20,
        borderWidth: 1,
        borderColor: 'rgba(0,0,0,0.1)',
    },
    widthTabText: {
        fontSize: FONT_SIZES.sm,
        fontWeight: 'bold',
    },
    previewScroll: {
        flex: 1,
        backgroundColor: '#f0f0f0',
    },
    scrollContent: {
        alignItems: 'center',
        paddingVertical: SPACING.xl,
    },
    receiptContainer: {
        padding: 10,
        elevation: 3,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        minHeight: 300,
    },
    thermalText: {
        fontFamily: 'monospace',
        fontSize: 10,
        color: '#000',
        lineHeight: 14,
    },
    footer: {
        flexDirection: 'row',
        padding: SPACING.md,
        gap: SPACING.md,
        borderTopWidth: 1,
        borderTopColor: 'rgba(0,0,0,0.1)',
    },
    actionButton: {
        flex: 1,
    }
});
