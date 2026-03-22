import React, { useState, useEffect } from 'react';
import { View as RNView, Text as RNText, StyleSheet, ScrollView as RNScrollView, TouchableOpacity as RNRTouchableOpacity, ActivityIndicator as RNActivityIndicator, Platform, PermissionsAndroid, NativeModules } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

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

export default function PrinterConnectionScreen() {
    const {
        theme, t, printerType, setPrinterType, connectedPrinter, setConnectedPrinter,
        setIsPrinterConnected, isBluetoothEnabled, setIsBluetoothEnabled,
        showAlert, updateReceiptConfig, requestPrint, receiptConfig
    } = useGeneralSettings();

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
                showAlert('Permission Denied', 'Bluetooth permissions are required to scan for printers.', 'error');
                return;
            }

            if (!NativeModules.RNBLEPrinter) {
                setLastError('Thermal printer module missing.');
                showAlert(
                    'Native Module Missing',
                    'The Bluetooth printer module is not available. If you are using Expo Go, please use a development build.',
                    'error'
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
                showAlert('Scan Error', 'Failed to search for Bluetooth devices. Ensure Bluetooth is ON.', 'error');
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

            const success = await BLEPrinter.connectPrinter(devId);

            if (success || Platform.OS === 'android') {
                const printerData = {
                    id: devId,
                    name: device.device_name || device.name || 'Unknown Printer',
                    address: devId,
                    type: 'bluetooth'
                };
                setConnectedPrinter(printerData);
                setIsPrinterConnected(true);
                showAlert('Printer Connected', `${printerData.name} is ready for use.`, 'success');

                // Prompt user to select paper size
                showAlert(
                    t('select_paper_size') || 'Select Paper Size',
                    t('choose_paper_size_desc') || 'Please select the paper width for this printer:',
                    'info',
                    [
                        { text: '58mm', onPress: () => updateReceiptConfig({ paperWidth: '58mm' }) },
                        { text: '80mm', onPress: () => updateReceiptConfig({ paperWidth: '80mm' }) },
                        { text: '112mm', onPress: () => updateReceiptConfig({ paperWidth: '112mm' }) }
                    ]
                );
            } else {
                throw new Error('Connection failed');
            }
        } catch (e) {
            console.error('Connection Error', e);
            setIsPrinterConnected(false);
            showAlert('Connection Error', 'Failed to connect to this printer. Ensure it is turned ON and pairable.', 'error');
        } finally {
            setConnectingDeviceId(null);
        }
    };

    const handleTestPrint = async () => {
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

    const openBluetoothSettings = () => {
        if (Platform.OS === 'android') {
            try {
                const Intent = require('expo-intent-launcher');
                Intent.startActivityAsync(Intent.ActivityAction.BLUETOOTH_SETTINGS);
            } catch (err) {
                showAlert('Error', 'Could not open Bluetooth settings. Please enable it manually.', 'error');
            }
        } else {
            showAlert('Warning', 'Please enable Bluetooth in your system settings.', 'warning');
        }
    };

    return (
        <ScreenContainer backgroundColor={activeColors.background}>
            <HeaderBar
                title={t('printer_connection') || 'Printer Connection'}
                showBack
            />
            <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent}>
                <View style={styles.section}>
                    <View style={[styles.configCard, { backgroundColor: activeColors.cardBg, borderColor: activeColors.border, padding: SPACING.md }]}>
                        {/* Printer Type Toggle */}
                        <View style={styles.toggleContainer}>
                            <TouchableOpacity
                                style={[
                                    styles.toggleButton,
                                    { backgroundColor: printerType === 'thermal' ? activeColors.primary : activeColors.background, borderColor: activeColors.border }
                                ]}
                                onPress={() => setPrinterType('thermal')}
                            >
                                <Text style={[styles.toggleButtonText, { color: printerType === 'thermal' ? '#FFF' : activeColors.text }]}>{t('thermal_printer')}</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[
                                    styles.toggleButton,
                                    { backgroundColor: printerType === 'system' ? activeColors.primary : activeColors.background, borderColor: activeColors.border }
                                ]}
                                onPress={() => setPrinterType('system')}
                            >
                                <Text style={[styles.toggleButtonText, { color: printerType === 'system' ? '#FFF' : activeColors.text }]}>{t('system_printer')}</Text>
                            </TouchableOpacity>
                        </View>

                        {printerType === 'system' ? (
                            <View style={[styles.infoCard, { backgroundColor: activeColors.primary + '10', borderColor: activeColors.primary + '20', marginBottom: 0 }]}>
                                <Icon name="print-outline" size={32} color={activeColors.primary} />
                                <View style={styles.infoTextContainer}>
                                    <Text style={[styles.infoTitle, { color: activeColors.text }]}>{t('system_printing_active')}</Text>
                                    <Text style={[styles.infoText, { color: activeColors.textLight }]}>
                                        {t('system_printing_desc')}
                                    </Text>
                                </View>
                            </View>
                        ) : (
                            <View>
                                <View style={[styles.infoCard, { backgroundColor: COLORS.success + '10', borderColor: COLORS.success + '20' }]}>
                                    <Icon name="bluetooth-outline" size={32} color={COLORS.success} />
                                    <View style={styles.infoTextContainer}>
                                        <Text style={[styles.infoTitle, { color: activeColors.text }]}>{t('thermal_printing_active')}</Text>
                                    </View>
                                </View>

                                <View style={[styles.statusBar, { backgroundColor: isBluetoothEnabled ? COLORS.success + '10' : COLORS.error + '10' }]}>
                                    <View style={styles.row}>
                                        <Icon
                                            name={isBluetoothEnabled ? "bluetooth" : "bluetooth-outline"}
                                            size={20}
                                            color={isBluetoothEnabled ? COLORS.success : COLORS.error}
                                        />
                                        <Text style={[styles.statusText, { color: isBluetoothEnabled ? COLORS.success : COLORS.error }]}>
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
                                    <Text style={[styles.sectionHeader, { color: activeColors.textLight, fontSize: 10 }]}>{t('available_bluetooth_devices') || 'Available Bluetooth Devices'}</Text>
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
                                                            backgroundColor: activeColors.background,
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
                                    <View style={[styles.emptyState, { backgroundColor: activeColors.background, borderColor: activeColors.border }]}>
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
                    </View>
                </View>

                {/* Test Connection Button */}
                <View style={[styles.configCard, { backgroundColor: activeColors.cardBg, borderColor: activeColors.border, marginBottom: SPACING.xl }]}>
                    <View style={styles.configItem}>
                        <View style={styles.configTextLabel}>
                            <Text style={[styles.configLabel, { color: activeColors.text }]}>{t('test_connection')}</Text>
                            <Text style={[styles.configDesc, { color: activeColors.textLight }]}>{t('test_connection_desc') || 'Verify your printer settings by printing a test slip'}</Text>
                        </View>
                        <PrimaryButton
                            title={isPrinting ? t('printing_progress') : t('send_test_print')}
                            onPress={handleTestPrint}
                            disabled={isPrinting || (printerType === 'thermal' && !connectedPrinter)}
                            isLoading={isPrinting}
                            style={{ minWidth: 150 }}
                        />
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
    section: {
        marginBottom: SPACING.xl,
    },
    configCard: {
        borderRadius: BORDER_RADIUS.lg,
        borderWidth: 1,
        overflow: 'hidden',
    },
    toggleContainer: {
        flexDirection: 'row',
        marginBottom: SPACING.xl,
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
        marginBottom: 4,
    },
    infoText: {
        fontSize: FONT_SIZES.sm,
        lineHeight: 20,
    },
    statusBar: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: SPACING.md,
        borderRadius: BORDER_RADIUS.md,
        marginBottom: SPACING.lg,
    },
    row: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    statusText: {
        fontSize: FONT_SIZES.sm,
        fontWeight: 'bold',
        marginLeft: SPACING.sm,
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
    inlineButton: {
        paddingHorizontal: SPACING.md,
        paddingVertical: 6,
        backgroundColor: '#fff',
        borderRadius: BORDER_RADIUS.sm,
        elevation: 1,
    },
    inlineButtonText: {
        fontSize: FONT_SIZES.xs,
        fontWeight: 'bold',
        color: '#333',
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
    refreshButton: {
        padding: 4,
    },
    deviceList: {
        gap: SPACING.sm,
    },
    deviceItem: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: SPACING.md,
        borderRadius: BORDER_RADIUS.lg,
    },
    deviceInfo: {
        flex: 1,
    },
    deviceName: {
        fontSize: FONT_SIZES.md,
        fontWeight: 'bold',
        marginBottom: 2,
    },
    deviceAddress: {
        fontSize: 10,
        fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    },
    connectedBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: COLORS.primary + '15',
        paddingHorizontal: SPACING.sm,
        paddingVertical: 4,
        borderRadius: 999,
    },
    connectedText: {
        fontSize: 10,
        fontWeight: 'bold',
        marginLeft: 4,
    },
    emptyState: {
        padding: SPACING.xl,
        borderRadius: BORDER_RADIUS.lg,
        alignItems: 'center',
        borderWidth: 1,
        borderStyle: 'dashed',
    },
    emptyText: {
        fontSize: FONT_SIZES.sm,
        textAlign: 'center',
        marginBottom: SPACING.md,
    },
    retryButton: {
        backgroundColor: COLORS.primary,
        paddingHorizontal: SPACING.lg,
        paddingVertical: 8,
        borderRadius: 999,
    },
    retryButtonText: {
        color: '#FFF',
        fontSize: FONT_SIZES.xs,
        fontWeight: 'bold',
    },
    helpSection: {
        marginTop: SPACING.xl,
        padding: SPACING.lg,
        borderRadius: BORDER_RADIUS.lg,
        backgroundColor: 'transparent',
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
});
