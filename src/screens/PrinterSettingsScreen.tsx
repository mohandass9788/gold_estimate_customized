import React, { useState, useEffect } from 'react';
import { View as RNView, Text as RNText, StyleSheet, ScrollView as RNScrollView, TouchableOpacity as RNRTouchableOpacity, Alert, ActivityIndicator as RNActivityIndicator, Platform, PermissionsAndroid, NativeModules, Switch } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
// import * as IntentLauncher from 'expo-intent-launcher'; // Moved to dynamic require for safety

import ScreenContainer from '../components/ScreenContainer';
import HeaderBar from '../components/HeaderBar';
import { COLORS, SPACING, FONT_SIZES, BORDER_RADIUS, LIGHT_COLORS, DARK_COLORS } from '../constants/theme';
import PrimaryButton from '../components/PrimaryButton';
import { useGeneralSettings } from '../store/GeneralSettingsContext';
import { sendTestPrint } from '../services/printService';

// Fix for React 19 type mismatch
const View = RNView as any;
const Text = RNText as any;
const ScrollView = RNScrollView as any;
const TouchableOpacity = RNRTouchableOpacity as any;
const ActivityIndicator = RNActivityIndicator as any;
const Icon = Ionicons as any;

export default function PrinterSettingsScreen() {
    const {
        theme, t, printerType, setPrinterType, connectedPrinter, setConnectedPrinter,
        isPrinterConnected, setIsPrinterConnected, isBluetoothEnabled, setIsBluetoothEnabled,
        requestPrint, receiptConfig, updateReceiptConfig
    } = useGeneralSettings();

    // Silence NativeEventEmitter warnings
    useEffect(() => {
        const modules = [NativeModules.RNBLEPrinter, NativeModules.RNUSBPrinter, NativeModules.RNNetPrinter];
        modules.forEach(m => {
            if (m) {
                if (!(m as any).addListener) (m as any).addListener = () => { };
                if (!(m as any).removeListeners) (m as any).removeListeners = () => { };
            }
        });
    }, []);

    const [isPrinting, setIsPrinting] = useState(false);
    const [isScanning, setIsScanning] = useState(false);
    const [connectingDeviceId, setConnectingDeviceId] = useState<string | null>(null);
    const [devices, setDevices] = useState<any[]>([]);
    const [lastError, setLastError] = useState<string | null>(null);

    const activeColors = theme === 'light' ? LIGHT_COLORS : DARK_COLORS;

    useEffect(() => {
        if (printerType === 'thermal') {
            handleScanDevices();
        }
    }, [printerType]);

    const requestBluetoothPermissions = async () => {
        if (Platform.OS === 'android' && Platform.Version >= 31) {
            const result = await PermissionsAndroid.requestMultiple([
                PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN,
                PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT,
                PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
            ]);
            return result[PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN] === 'granted' &&
                result[PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT] === 'granted';
        }
        return true;
    };

    const handleScanDevices = async () => {
        setIsScanning(true);
        setLastError(null);
        try {
            const hasPermission = await requestBluetoothPermissions();
            if (!hasPermission) {
                setLastError('Bluetooth permissions are required.');
                Alert.alert('Permission Denied', 'Bluetooth permissions are required to scan for printers.');
                return;
            }

            if (!NativeModules.RNBLEPrinter) {
                setLastError('Thermal printer module missing.');
                Alert.alert(
                    'Native Module Missing',
                    'The Bluetooth printer module is not available. If you are using Expo Go, please use a development build.'
                );
                return;
            }

            const { BLEPrinter } = require('react-native-thermal-receipt-printer');
            await BLEPrinter.init();
            setIsBluetoothEnabled(true);
            const results = await BLEPrinter.getDeviceList();
            setDevices(results || []);
        } catch (e: any) {
            console.error('Scan Error', e);
            const errorMsg = e.message?.toLowerCase() || '';
            if (errorMsg.includes('bluetooth') || errorMsg.includes('enabled') || errorMsg.includes('on')) {
                setIsBluetoothEnabled(false);
                setLastError('Bluetooth is OFF');
            } else {
                setLastError('Scan Failed');
                Alert.alert('Scan Error', 'Failed to search for Bluetooth devices. Ensure Bluetooth is ON.');
            }
        } finally {
            setIsScanning(false);
        }
    };

    const handleSelectDevice = async (device: any) => {
        const devId = device.inner_mac_address || device.device_id || device.id;
        setConnectingDeviceId(devId);
        try {
            const { BLEPrinter } = require('react-native-thermal-receipt-printer');
            await BLEPrinter.init();

            // Attempt actual connection to verify
            const success = await BLEPrinter.connectPrinter(devId);

            if (success || Platform.OS === 'android') { // On Android, connect might not return boolean or might be async success
                const printerData = {
                    id: devId,
                    name: device.device_name || device.name || 'Unknown Printer',
                    address: devId,
                    type: 'bluetooth'
                };
                setConnectedPrinter(printerData);
                setIsPrinterConnected(true);
                Alert.alert('Printer Connected', `${printerData.name} is ready for use.`);
            } else {
                throw new Error('Connection failed');
            }
        } catch (e) {
            console.error('Connection Error', e);
            setIsPrinterConnected(false);
            Alert.alert('Connection Error', 'Failed to connect to this printer. Ensure it is turned ON and pairable.');
        } finally {
            setConnectingDeviceId(null);
        }
    };

    const openBluetoothSettings = () => {
        if (Platform.OS === 'android') {
            try {
                const Intent = require('expo-intent-launcher');
                Intent.startActivityAsync(Intent.ActivityAction.BLUETOOTH_SETTINGS);
            } catch (err) {
                Alert.alert('Error', 'Could not open Bluetooth settings. Please enable it manually.');
            }
        } else {
            Alert.alert('Please enable Bluetooth in your system settings.');
        }
    };

    const handleTestPrint = async () => {
        requestPrint(async (empName) => {
            setIsPrinting(true);
            try {
                await sendTestPrint(empName, receiptConfig);
                setIsPrinterConnected(true);
            } catch (e) {
                setIsPrinterConnected(false);
                Alert.alert('Print Error', 'Failed to send print job. Ensure printer is ON and within range.');
            } finally {
                setIsPrinting(false);
            }
        });
    };

    return (
        <ScreenContainer backgroundColor={activeColors.background}>
            <HeaderBar
                title={t('printers_settings') || 'Printer Settings'}
                showBack
            />
            <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent}>

                {/* Printer Type Toggle */}
                <View style={styles.toggleContainer}>
                    <TouchableOpacity
                        style={[
                            styles.toggleButton,
                            { backgroundColor: printerType === 'system' ? activeColors.primary : activeColors.cardBg, borderColor: activeColors.border }
                        ]}
                        onPress={() => setPrinterType('system')}
                    >
                        <Text style={[styles.toggleButtonText, { color: printerType === 'system' ? '#FFF' : activeColors.text }]}>{t('system_printer')}</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={[
                            styles.toggleButton,
                            { backgroundColor: printerType === 'thermal' ? activeColors.primary : activeColors.cardBg, borderColor: activeColors.border }
                        ]}
                        onPress={() => setPrinterType('thermal')}
                    >
                        <Text style={[styles.toggleButtonText, { color: printerType === 'thermal' ? '#FFF' : activeColors.text }]}>{t('thermal_printer')}</Text>
                    </TouchableOpacity>
                </View>

                {printerType === 'system' ? (
                    <View style={[styles.infoCard, { backgroundColor: activeColors.primary + '10', borderColor: activeColors.primary + '20' }]}>
                        <Icon name="print-outline" size={32} color={activeColors.primary} />
                        <View style={styles.infoTextContainer}>
                            <Text style={[styles.infoTitle, { color: activeColors.text }]}>{t('system_printing_active')}</Text>
                            <Text style={[styles.infoText, { color: activeColors.textLight }]}>
                                {t('system_printing_desc')}
                            </Text>
                        </View>
                    </View>
                ) : (
                    <View style={[styles.infoCard, { backgroundColor: COLORS.success + '10', borderColor: COLORS.success + '20' }]}>
                        <Icon name="bluetooth-outline" size={32} color={COLORS.success} />
                        <View style={styles.infoTextContainer}>
                            <Text style={[styles.infoTitle, { color: activeColors.text }]}>{t('thermal_printing_active')}</Text>
                            <Text style={[styles.infoText, { color: activeColors.textLight }]}>
                                {t('thermal_printing_desc')}
                            </Text>
                        </View>
                    </View>
                )}

                {printerType === 'thermal' && (
                    <View style={styles.section}>
                        {/* Bluetooth Status Bar */}
                        <View style={[styles.statusBar, { backgroundColor: isBluetoothEnabled ? activeColors.success + '10' : activeColors.error + '10' }]}>
                            <View style={styles.row}>
                                <Icon
                                    name={isBluetoothEnabled ? "bluetooth" : "bluetooth-outline"}
                                    size={20}
                                    color={isBluetoothEnabled ? activeColors.success : activeColors.error}
                                />
                                <Text style={[styles.statusText, { color: isBluetoothEnabled ? activeColors.success : activeColors.error }]}>
                                    {isBluetoothEnabled ? t('bluetooth_on') : t('bluetooth_off')}
                                </Text>
                            </View>
                            {!isBluetoothEnabled && (
                                <TouchableOpacity style={styles.inlineButton} onPress={openBluetoothSettings}>
                                    <Text style={styles.inlineButtonText}>{t('enable')}</Text>
                                </TouchableOpacity>
                            )}
                        </View>

                        <View style={styles.sectionHeaderRow}>
                            <Text style={[styles.sectionHeader, { color: activeColors.textLight }]}>{t('available_bluetooth_devices') || 'Available Bluetooth Devices'}</Text>
                            <TouchableOpacity onPress={handleScanDevices} disabled={isScanning} style={styles.refreshButton}>
                                {isScanning ? <ActivityIndicator size="small" color={activeColors.primary} /> : <Icon name="refresh" size={20} color={activeColors.primary} />}
                            </TouchableOpacity>
                        </View>

                        {devices.length > 0 ? (
                            <View style={styles.deviceList}>
                                {devices.map((device, index) => {
                                    const devId = device.inner_mac_address || device.device_id;
                                    const isSelected = connectedPrinter?.address === devId;
                                    const isConnecting = connectingDeviceId === devId;

                                    return (
                                        <TouchableOpacity
                                            key={index}
                                            style={[
                                                styles.deviceItem,
                                                {
                                                    backgroundColor: activeColors.cardBg,
                                                    borderColor: isSelected ? activeColors.primary : activeColors.border,
                                                    borderWidth: isSelected ? 2 : 1
                                                }
                                            ]}
                                            onPress={() => handleSelectDevice(device)}
                                            disabled={isConnecting}
                                        >
                                            <View style={styles.deviceInfo}>
                                                <Text style={[styles.deviceName, { color: activeColors.text }]}>{device.device_name || 'Unknown Printer'}</Text>
                                                <Text style={[styles.deviceAddress, { color: activeColors.textLight }]}>{devId}</Text>
                                            </View>
                                            {isConnecting ? (
                                                <ActivityIndicator size="small" color={activeColors.primary} />
                                            ) : isSelected ? (
                                                <View style={styles.connectedBadge}>
                                                    <Icon name="checkmark-circle" size={20} color={activeColors.primary} />
                                                    <Text style={[styles.connectedText, { color: activeColors.primary }]}>{t('connected_status')}</Text>
                                                </View>
                                            ) : (
                                                <Icon name="chevron-forward" size={20} color={activeColors.border} />
                                            )}
                                        </TouchableOpacity>
                                    );
                                })}
                            </View>
                        ) : (
                            <View style={[styles.emptyState, { backgroundColor: activeColors.cardBg, borderColor: activeColors.border }]}>
                                <Text style={[styles.emptyText, { color: activeColors.textLight }]}>
                                    {isScanning ? t('scanning') : (lastError || t('no_printers_found'))}
                                </Text>
                                {!isScanning && (
                                    <TouchableOpacity style={styles.retryButton} onPress={handleScanDevices}>
                                        <Text style={styles.retryButtonText}>{t('retry')}</Text>
                                    </TouchableOpacity>
                                )}
                            </View>
                        )}
                    </View>
                )}

                <View style={styles.section}>
                    <Text style={[styles.sectionHeader, { color: activeColors.textLight }]}>{t('test_connection')}</Text>
                    <View style={styles.actionContainer}>
                        <PrimaryButton
                            title={isPrinting ? t('printing_progress') : t('send_test_print')}
                            onPress={handleTestPrint}
                            disabled={isPrinting || (printerType === 'thermal' && !connectedPrinter)}
                            isLoading={isPrinting}
                        />
                    </View>
                </View>

                {/* Receipt Configuration Section */}
                <View style={styles.section}>
                    <View style={styles.sectionHeaderRow}>
                        <Text style={[styles.sectionHeader, { color: activeColors.textLight }]}>{t('receipt_configuration') || 'Receipt Configuration'}</Text>
                        <Icon name="settings-outline" size={18} color={activeColors.textLight} />
                    </View>

                    <View style={[styles.configCard, { backgroundColor: activeColors.cardBg, borderColor: activeColors.border }]}>
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
                </View>

                <View style={styles.helpSection}>
                    <Text style={[styles.helpTitle, { color: activeColors.text }]}>{t('need_help')}</Text>
                    <Text style={[styles.helpText, { color: activeColors.textLight }]}>
                        {printerType === 'system'
                            ? t('system_help_text')
                            : t('thermal_help_text')}
                    </Text>
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
    toggleContainer: {
        flexDirection: 'row',
        marginBottom: SPACING.xl,
        borderWidth: 1,
        borderColor: 'transparent',
        borderRadius: BORDER_RADIUS.lg,
        overflow: 'hidden',
    },
    toggleButton: {
        flex: 1,
        paddingVertical: SPACING.md,
        alignItems: 'center',
        borderWidth: 1,
    },
    toggleButtonText: {
        fontSize: FONT_SIZES.sm,
        fontWeight: 'bold',
    },
    infoCard: {
        flexDirection: 'row',
        padding: SPACING.lg,
        borderRadius: BORDER_RADIUS.lg,
        marginBottom: SPACING.xl,
        borderWidth: 1,
        alignItems: 'flex-start',
    },
    infoTextContainer: {
        flex: 1,
        marginLeft: SPACING.md,
    },
    infoTitle: {
        fontSize: FONT_SIZES.md,
        fontWeight: 'bold',
        marginBottom: SPACING.xs,
    },
    infoText: {
        fontSize: FONT_SIZES.sm,
        lineHeight: 20,
    },
    section: {
        marginBottom: SPACING.xl,
    },
    sectionHeaderRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: SPACING.sm,
    },
    sectionHeader: {
        fontSize: FONT_SIZES.sm,
        fontWeight: 'bold',
        textTransform: 'uppercase',
    },
    deviceList: {
        marginTop: SPACING.sm,
    },
    deviceItem: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: SPACING.md,
        borderRadius: BORDER_RADIUS.md,
        borderWidth: 1,
        marginBottom: SPACING.sm,
    },
    deviceInfo: {
        flex: 1,
    },
    deviceName: {
        fontSize: FONT_SIZES.md,
        fontWeight: 'bold',
    },
    deviceAddress: {
        fontSize: FONT_SIZES.xs,
    },
    emptyState: {
        padding: SPACING.xl,
        borderRadius: BORDER_RADIUS.md,
        borderWidth: 1,
        alignItems: 'center',
        borderStyle: 'dashed',
    },
    emptyText: {
        fontSize: FONT_SIZES.sm,
    },
    actionContainer: {
        marginTop: SPACING.sm,
    },
    statusBar: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: SPACING.md,
        borderRadius: BORDER_RADIUS.md,
        marginBottom: SPACING.lg,
    },
    statusText: {
        fontSize: FONT_SIZES.sm,
        fontWeight: '600',
        marginLeft: SPACING.sm,
    },
    inlineButton: {
        backgroundColor: COLORS.primary,
        paddingHorizontal: SPACING.md,
        paddingVertical: 6,
        borderRadius: BORDER_RADIUS.sm,
    },
    inlineButtonText: {
        color: COLORS.white,
        fontSize: FONT_SIZES.xs,
        fontWeight: 'bold',
    },
    refreshButton: {
        padding: 4,
    },
    connectedBadge: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    connectedText: {
        fontSize: FONT_SIZES.xs,
        fontWeight: 'bold',
        marginLeft: 4,
    },
    retryButton: {
        marginTop: SPACING.md,
        paddingHorizontal: SPACING.xl,
        paddingVertical: SPACING.sm,
        backgroundColor: COLORS.primary + '20',
        borderRadius: BORDER_RADIUS.md,
    },
    retryButtonText: {
        color: COLORS.primary,
        fontWeight: 'bold',
        fontSize: FONT_SIZES.sm,
    },
    helpSection: {
        marginTop: SPACING.xl,
        padding: SPACING.lg,
        backgroundColor: COLORS.primary + '05',
        borderRadius: BORDER_RADIUS.md,
    },
    helpTitle: {
        fontSize: FONT_SIZES.md,
        fontWeight: 'bold',
        marginBottom: SPACING.sm,
    },
    helpText: {
        fontSize: FONT_SIZES.sm,
        lineHeight: 22,
    },
    row: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    configCard: {
        borderRadius: BORDER_RADIUS.lg,
        borderWidth: 1,
        marginTop: SPACING.sm,
        padding: SPACING.md,
    },
    configItem: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: SPACING.sm,
    },
    configTextLabel: {
        flex: 1,
        paddingRight: SPACING.md,
    },
    configLabel: {
        fontSize: FONT_SIZES.md,
        fontWeight: '600',
    },
    configDesc: {
        fontSize: FONT_SIZES.xs,
        marginTop: 2,
    },
    divider: {
        height: 1,
        backgroundColor: COLORS.border,
        opacity: 0.1,
        marginVertical: 4,
    },
    subConfigRow: {
        flexDirection: 'row',
        paddingLeft: SPACING.md,
        paddingBottom: SPACING.sm,
        marginTop: -4,
    },
    subConfigOption: {
        paddingVertical: 6,
        paddingHorizontal: 10,
        borderRadius: 12,
        marginRight: 8,
        borderWidth: 1,
        borderColor: COLORS.border + '30',
    },
    subConfigText: {
        fontSize: 10,
        fontWeight: 'bold',
    }
});
