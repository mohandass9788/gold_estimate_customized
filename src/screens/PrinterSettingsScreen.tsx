import React, { useState, useEffect } from 'react';
import { View as RNView, Text as RNText, StyleSheet, ScrollView as RNScrollView, TouchableOpacity as RNRTouchableOpacity, Alert, ActivityIndicator as RNActivityIndicator, Platform, PermissionsAndroid, NativeModules } from 'react-native';
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
        isPrinterConnected, setIsPrinterConnected, isBluetoothEnabled, setIsBluetoothEnabled
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
        setIsPrinting(true);
        try {
            await sendTestPrint();
            setIsPrinterConnected(true);
        } catch (e) {
            setIsPrinterConnected(false);
            Alert.alert('Print Error', 'Failed to send print job. Ensure printer is ON and within range.');
        } finally {
            setIsPrinting(false);
        }
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
                        <Text style={[styles.toggleButtonText, { color: printerType === 'system' ? '#FFF' : activeColors.text }]}>SYSTEM</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={[
                            styles.toggleButton,
                            { backgroundColor: printerType === 'thermal' ? activeColors.primary : activeColors.cardBg, borderColor: activeColors.border }
                        ]}
                        onPress={() => setPrinterType('thermal')}
                    >
                        <Text style={[styles.toggleButtonText, { color: printerType === 'thermal' ? '#FFF' : activeColors.text }]}>THERMAL</Text>
                    </TouchableOpacity>
                </View>

                {printerType === 'system' ? (
                    <View style={[styles.infoCard, { backgroundColor: activeColors.primary + '10', borderColor: activeColors.primary + '20' }]}>
                        <Icon name="print-outline" size={32} color={activeColors.primary} />
                        <View style={styles.infoTextContainer}>
                            <Text style={[styles.infoTitle, { color: activeColors.text }]}>System Printing Active</Text>
                            <Text style={[styles.infoText, { color: activeColors.textLight }]}>
                                Uses the built-in system dialog for WiFi and Cloud printers. Best for laser/inkjet printers.
                            </Text>
                        </View>
                    </View>
                ) : (
                    <View style={[styles.infoCard, { backgroundColor: COLORS.success + '10', borderColor: COLORS.success + '20' }]}>
                        <Icon name="bluetooth-outline" size={32} color={COLORS.success} />
                        <View style={styles.infoTextContainer}>
                            <Text style={[styles.infoTitle, { color: activeColors.text }]}>Thermal Printing Active</Text>
                            <Text style={[styles.infoText, { color: activeColors.textLight }]}>
                                Prints directly to ESC/POS Bluetooth printers. Faster for receipts.
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
                    <Text style={[styles.sectionHeader, { color: activeColors.textLight }]}>Test Connection</Text>
                    <View style={styles.actionContainer}>
                        <PrimaryButton
                            title={isPrinting ? "Printing..." : "Send Test Print"}
                            onPress={handleTestPrint}
                            disabled={isPrinting || (printerType === 'thermal' && !connectedPrinter)}
                            isLoading={isPrinting}
                        />
                    </View>
                </View>

                <View style={styles.helpSection}>
                    <Text style={[styles.helpTitle, { color: activeColors.text }]}>Need Help?</Text>
                    <Text style={[styles.helpText, { color: activeColors.textLight }]}>
                        {printerType === 'system'
                            ? "Ensure your printer is on the same WiFi network and supports mobile printing protocols."
                            : "Ensure your Bluetooth printer is paired with your mobile device before scanning here."}
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
    }
});
