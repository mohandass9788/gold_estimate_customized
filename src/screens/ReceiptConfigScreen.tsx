import React, { useState } from 'react';
import { View as RNView, Text as RNText, StyleSheet, ScrollView as RNScrollView, TouchableOpacity as RNRTouchableOpacity, Switch, TextInput } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import ScreenContainer from '../components/ScreenContainer';
import HeaderBar from '../components/HeaderBar';
import { COLORS, SPACING, FONT_SIZES, BORDER_RADIUS, LIGHT_COLORS, DARK_COLORS } from '../constants/theme';
import PrimaryButton from '../components/PrimaryButton';
import { useGeneralSettings } from '../store/GeneralSettingsContext';
import { useAuth } from '../store/AuthContext';
import { sendTestPrint } from '../services/printService';

// Fix for React 19 type mismatch
const View = RNView as any;
const Text = RNText as any;
const ScrollView = RNScrollView as any;
const TouchableOpacity = RNRTouchableOpacity as any;
const Icon = Ionicons as any;


export default function ReceiptConfigScreen() {
    const {
        theme, t, printerType, connectedPrinter, setIsPrinterConnected,
        requestPrint, receiptConfig, updateReceiptConfig, showAlert
    } = useGeneralSettings();

    const { validateSubscription } = useAuth();

    const [isPrinting, setIsPrinting] = useState(false);
    const activeColors = theme === 'light' ? LIGHT_COLORS : DARK_COLORS;

    const handleTestPrint = async () => {
        if (!validateSubscription()) return;
        
        requestPrint(async (details) => {
            setIsPrinting(true);
            try {
                await sendTestPrint(details.employeeName, receiptConfig);
                setIsPrinterConnected(true);
            } catch (e) {
                setIsPrinterConnected(false);
                showAlert('Print Error', 'Failed to send print job. Ensure printer is ON and within range.', 'error');
            } finally {
                setIsPrinting(false);
            }
        }, true);
    };

    return (
        <ScreenContainer backgroundColor={activeColors.background}>
            <HeaderBar
                title={t('print_receipt_configuration') || 'Print Receipt Configuration'}
                showBack
            />
            <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent}>
                
                <View style={[styles.configCard, { backgroundColor: activeColors.cardBg, borderColor: activeColors.border }]}>
                    <View style={[styles.sectionHeaderRow, { padding: SPACING.md, paddingBottom: 0 }]}>
                        <Text style={[styles.sectionHeader, { color: activeColors.textLight, fontSize: 10 }]}>{t('paper_configuration') || 'Paper Configuration'}</Text>
                        <Icon name="print-outline" size={18} color={activeColors.textLight} />
                    </View>

                    <View style={styles.configItem}>
                        <View style={styles.configTextLabel}>
                            <Text style={[styles.configLabel, { color: activeColors.text }]}>{t('paper_width') || 'Paper Width'}</Text>
                            <Text style={[styles.configDesc, { color: activeColors.textLight }]}>{t('paper_width_desc') || 'Choose your printer paper size'}</Text>
                        </View>
                    </View>
                    <View style={styles.subConfigRow}>
                        <TouchableOpacity
                            style={[styles.subConfigOption, receiptConfig.paperWidth === '58mm' && { backgroundColor: activeColors.primary + '20' }]}
                            onPress={() => updateReceiptConfig({ paperWidth: '58mm' })}
                        >
                            <Text style={[styles.subConfigText, { color: receiptConfig.paperWidth === '58mm' ? activeColors.primary : activeColors.textLight }]}>58MM</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={[styles.subConfigOption, receiptConfig.paperWidth === '80mm' && { backgroundColor: activeColors.primary + '20' }]}
                            onPress={() => updateReceiptConfig({ paperWidth: '80mm' })}
                        >
                            <Text style={[styles.subConfigText, { color: receiptConfig.paperWidth === '80mm' ? activeColors.primary : activeColors.textLight }]}>80MM</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={[styles.subConfigOption, receiptConfig.paperWidth === '112mm' && { backgroundColor: activeColors.primary + '20' }]}
                            onPress={() => updateReceiptConfig({ paperWidth: '112mm' })}
                        >
                            <Text style={[styles.subConfigText, { color: receiptConfig.paperWidth === '112mm' ? activeColors.primary : activeColors.textLight }]}>112MM</Text>
                        </TouchableOpacity>
                    </View>

                    <View style={styles.divider} />

                    <View style={[styles.sectionHeaderRow, { padding: SPACING.md, paddingBottom: 0 }]}>
                        <Text style={[styles.sectionHeader, { color: activeColors.textLight, fontSize: 10 }]}>{t('receipt_configuration') || 'Receipt Configuration'}</Text>
                        <Icon name="settings-outline" size={18} color={activeColors.textLight} />
                    </View>

                    <View style={styles.configItem}>
                        <View style={styles.configTextLabel}>
                            <Text style={[styles.configLabel, { color: activeColors.text }]}>{t('show_header') || 'Show Header'}</Text>
                            <Text style={[styles.configDesc, { color: activeColors.textLight }]}>{t('show_header_desc')}</Text>
                        </View>
                        <Switch
                            value={receiptConfig.showHeader}
                            onValueChange={(val) => updateReceiptConfig({ showHeader: val })}
                            trackColor={{ false: '#767577', true: activeColors.primary + '80' }}
                            thumbColor={receiptConfig.showHeader ? activeColors.primary : '#f4f3f4'}
                        />
                    </View>

                    <View style={styles.divider} />

                    <View style={styles.configItem}>
                        <View style={styles.configTextLabel}>
                            <Text style={[styles.configLabel, { color: activeColors.text }]}>{t('show_footer') || 'Show Footer'}</Text>
                            <Text style={[styles.configDesc, { color: activeColors.textLight }]}>{t('show_footer_desc')}</Text>
                        </View>
                        <Switch
                            value={receiptConfig.showFooter}
                            onValueChange={(val) => updateReceiptConfig({ showFooter: val })}
                            trackColor={{ false: '#767577', true: activeColors.primary + '80' }}
                            thumbColor={receiptConfig.showFooter ? activeColors.primary : '#f4f3f4'}
                        />
                    </View>

                    <View style={styles.divider} />

                    <View style={styles.configItem}>
                        <View style={styles.configTextLabel}>
                            <Text style={[styles.configLabel, { color: activeColors.text }]}>{t('show_operator') || 'Show Operator'}</Text>
                            <Text style={[styles.configDesc, { color: activeColors.textLight }]}>{t('show_operator_desc')}</Text>
                        </View>
                        <Switch
                            value={receiptConfig.showOperator}
                            onValueChange={(val) => updateReceiptConfig({ showOperator: val })}
                            trackColor={{ false: '#767577', true: activeColors.primary + '80' }}
                            thumbColor={receiptConfig.showOperator ? activeColors.primary : '#f4f3f4'}
                        />
                    </View>

                    <View style={styles.divider} />

                    <View style={styles.configItem}>
                        <View style={styles.configTextLabel}>
                            <Text style={[styles.configLabel, { color: activeColors.text }]}>{t('show_customer') || 'Show Customer'}</Text>
                            <Text style={[styles.configDesc, { color: activeColors.textLight }]}>{t('show_customer_desc')}</Text>
                        </View>
                        <Switch
                            value={receiptConfig.showCustomer}
                            onValueChange={(val) => updateReceiptConfig({ showCustomer: val })}
                            trackColor={{ false: '#767577', true: activeColors.primary + '80' }}
                            thumbColor={receiptConfig.showCustomer ? activeColors.primary : '#f4f3f4'}
                        />
                    </View>

                    {receiptConfig.showCustomer && (
                        <View style={[styles.subConfigColumn, { borderLeftWidth: 2, borderLeftColor: activeColors.primary + '30', marginLeft: SPACING.md, paddingLeft: SPACING.sm }]}>
                            <View style={styles.configItemSmall}>
                                <Text style={[styles.configLabelSmall, { color: activeColors.text }]}>{t('show_customer_name')}</Text>
                                <Switch
                                    value={receiptConfig.showCustomerName}
                                    onValueChange={(val) => updateReceiptConfig({ showCustomerName: val })}
                                    trackColor={{ false: '#767577', true: activeColors.primary + '80' }}
                                    thumbColor={receiptConfig.showCustomerName ? activeColors.primary : '#f4f3f4'}
                                    style={{ transform: [{ scaleX: 0.8 }, { scaleY: 0.8 }] }}
                                />
                            </View>
                            <View style={styles.configItemSmall}>
                                <Text style={[styles.configLabelSmall, { color: activeColors.text }]}>{t('show_customer_mobile')}</Text>
                                <Switch
                                    value={receiptConfig.showCustomerMobile}
                                    onValueChange={(val) => updateReceiptConfig({ showCustomerMobile: val })}
                                    trackColor={{ false: '#767577', true: activeColors.primary + '80' }}
                                    thumbColor={receiptConfig.showCustomerMobile ? activeColors.primary : '#f4f3f4'}
                                    style={{ transform: [{ scaleX: 0.8 }, { scaleY: 0.8 }] }}
                                />
                            </View>
                            <View style={styles.configItemSmall}>
                                <Text style={[styles.configLabelSmall, { color: activeColors.text }]}>{t('show_customer_address')}</Text>
                                <Switch
                                    value={receiptConfig.showCustomerAddress}
                                    onValueChange={(val) => updateReceiptConfig({ showCustomerAddress: val })}
                                    trackColor={{ false: '#767577', true: activeColors.primary + '80' }}
                                    thumbColor={receiptConfig.showCustomerAddress ? activeColors.primary : '#f4f3f4'}
                                    style={{ transform: [{ scaleX: 0.8 }, { scaleY: 0.8 }] }}
                                />
                            </View>
                        </View>
                    )}

                    <View style={styles.divider} />

                    <View style={styles.configItem}>
                        <View style={styles.configTextLabel}>
                            <Text style={[styles.configLabel, { color: activeColors.text }]}>{t('show_gst') || 'Show GST (3%)'}</Text>
                            <Text style={[styles.configDesc, { color: activeColors.textLight }]}>{t('show_gst_desc')}</Text>
                        </View>
                        <Switch
                            value={receiptConfig.showGST}
                            onValueChange={(val) => updateReceiptConfig({ showGST: val })}
                            trackColor={{ false: '#767577', true: activeColors.primary + '80' }}
                            thumbColor={receiptConfig.showGST ? activeColors.primary : '#f4f3f4'}
                        />
                    </View>

                    <View style={styles.divider} />

                    <View style={styles.configItem}>
                        <View style={styles.configTextLabel}>
                            <Text style={[styles.configLabel, { color: activeColors.text }]}>{t('show_wastage') || 'Show VA (Wastage)'}</Text>
                            <Text style={[styles.configDesc, { color: activeColors.textLight }]}>{t('show_wastage_desc')}</Text>
                        </View>
                        <Switch
                            value={receiptConfig.showWastage}
                            onValueChange={(val) => updateReceiptConfig({ showWastage: val })}
                            trackColor={{ false: '#767577', true: activeColors.primary + '80' }}
                            thumbColor={receiptConfig.showWastage ? activeColors.primary : '#f4f3f4'}
                        />
                    </View>

                    {receiptConfig.showWastage && (
                        <View style={styles.subConfigRow}>
                            <TouchableOpacity
                                style={[styles.subConfigOption, receiptConfig.wastageDisplayType === 'percentage' && { backgroundColor: activeColors.primary + '20' }]}
                                onPress={() => updateReceiptConfig({ wastageDisplayType: 'percentage' })}
                            >
                                <Text style={[styles.subConfigText, { color: receiptConfig.wastageDisplayType === 'percentage' ? activeColors.primary : activeColors.textLight }]}>{t('percentage_label')}</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[styles.subConfigOption, receiptConfig.wastageDisplayType === 'grams' && { backgroundColor: activeColors.primary + '20' }]}
                                onPress={() => updateReceiptConfig({ wastageDisplayType: 'grams' })}
                            >
                                <Text style={[styles.subConfigText, { color: receiptConfig.wastageDisplayType === 'grams' ? activeColors.primary : activeColors.textLight }]}>{t('weight_gram_label')}</Text>
                            </TouchableOpacity>
                        </View>
                    )}

                    <View style={styles.divider} />

                    <View style={styles.configItem}>
                        <View style={styles.configTextLabel}>
                            <Text style={[styles.configLabel, { color: activeColors.text }]}>{t('show_making_charge') || 'Show Making Charges'}</Text>
                            <Text style={[styles.configDesc, { color: activeColors.textLight }]}>{t('show_making_charge_desc')}</Text>
                        </View>
                        <Switch
                            value={receiptConfig.showMakingCharge}
                            onValueChange={(val) => updateReceiptConfig({ showMakingCharge: val })}
                            trackColor={{ false: '#767577', true: activeColors.primary + '80' }}
                            thumbColor={receiptConfig.showMakingCharge ? activeColors.primary : '#f4f3f4'}
                        />
                    </View>

                    {receiptConfig.showMakingCharge && (
                        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.subConfigRow}>
                            <TouchableOpacity
                                style={[styles.subConfigOption, receiptConfig.makingChargeDisplayType === 'percentage' && { backgroundColor: activeColors.primary + '20' }]}
                                onPress={() => updateReceiptConfig({ makingChargeDisplayType: 'percentage' })}
                            >
                                <Text style={[styles.subConfigText, { color: receiptConfig.makingChargeDisplayType === 'percentage' ? activeColors.primary : activeColors.textLight }]}>{t('percentage_label')}</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[styles.subConfigOption, receiptConfig.makingChargeDisplayType === 'grams' && { backgroundColor: activeColors.primary + '20' }]}
                                onPress={() => updateReceiptConfig({ makingChargeDisplayType: 'grams' })}
                            >
                                <Text style={[styles.subConfigText, { color: receiptConfig.makingChargeDisplayType === 'grams' ? activeColors.primary : activeColors.textLight }]}>{t('per_gram_label')}</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[styles.subConfigOption, receiptConfig.makingChargeDisplayType === 'fixed' && { backgroundColor: activeColors.primary + '20' }]}
                                onPress={() => updateReceiptConfig({ makingChargeDisplayType: 'fixed' })}
                            >
                                <Text style={[styles.subConfigText, { color: receiptConfig.makingChargeDisplayType === 'fixed' ? activeColors.primary : activeColors.textLight }]}>{t('fixed_amount_label')}</Text>
                            </TouchableOpacity>
                        </ScrollView>
                    )}

                    <View style={styles.divider} />

                    <View style={styles.configItem}>
                        <View style={styles.configTextLabel}>
                            <Text style={[styles.configLabel, { color: activeColors.text }]}>{t('show_device_name') || 'Show Device Info'}</Text>
                            <Text style={[styles.configDesc, { color: activeColors.textLight }]}>{t('show_device_name_desc')}</Text>
                        </View>
                        <Switch
                            value={receiptConfig.showDeviceName}
                            onValueChange={(val) => updateReceiptConfig({ showDeviceName: val })}
                            trackColor={{ false: '#767577', true: activeColors.primary + '80' }}
                            thumbColor={receiptConfig.showDeviceName ? activeColors.primary : '#f4f3f4'}
                        />
                    </View>

                </View>
            </ScrollView>
        </ScreenContainer>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    scrollContent: {
        padding: SPACING.lg,
        paddingBottom: 40,
    },
    configCard: {
        borderRadius: BORDER_RADIUS.lg,
        borderWidth: 1,
        overflow: 'hidden',
    },
    configItem: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: SPACING.md,
    },
    configTextLabel: {
        flex: 1,
        paddingRight: SPACING.md,
    },
    configLabel: {
        fontSize: FONT_SIZES.md,
        fontWeight: '600',
        marginBottom: 2,
    },
    configDesc: {
        fontSize: 11,
        lineHeight: 16,
    },
    divider: {
        height: 1,
        backgroundColor: COLORS.border,
        opacity: 0.5,
    },
    sectionHeaderRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: SPACING.md,
    },
    sectionHeader: {
        fontSize: FONT_SIZES.xs,
        fontWeight: 'bold',
        textTransform: 'uppercase',
        letterSpacing: 1,
    },
    subConfigColumn: {
        paddingVertical: SPACING.sm,
    },
    configItemSmall: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 4,
        paddingRight: SPACING.md,
    },
    configLabelSmall: {
        fontSize: FONT_SIZES.sm,
    },
    subConfigRow: {
        flexDirection: 'row',
        padding: SPACING.md,
        paddingTop: 0,
        gap: SPACING.sm,
    },
    subConfigOption: {
        paddingHorizontal: SPACING.md,
        paddingVertical: 6,
        borderRadius: 999,
        borderWidth: 1,
        borderColor: COLORS.border,
    },
    subConfigText: {
        fontSize: 10,
        fontWeight: 'bold',
    },
    inputContainer: {
        padding: SPACING.md,
        paddingTop: 0,
    },
    textInput: {
        height: 48,
        borderWidth: 1,
        borderRadius: BORDER_RADIUS.md,
        paddingHorizontal: SPACING.md,
        fontSize: FONT_SIZES.md,
    },
});
