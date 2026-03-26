import React, { useState, useEffect } from 'react';
import { View as RNView, Text as RNText, StyleSheet, ScrollView as RNScrollView, TouchableOpacity as RNRTouchableOpacity, ActivityIndicator as RNActivityIndicator, Platform, PermissionsAndroid, NativeModules, Modal } from 'react-native';
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
        setDevices([]);
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
                setPrinterType('thermal');
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
            setDevices([]); // Close modal
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
                    <View style={[styles.configCard, { backgroundColor: activeColors.cardBg, borderColor: activeColors.border, padding: SPACING.xl, alignItems: 'center' }]}>
                        <Icon 
                            name={connectedPrinter ? "print" : "print-outline"} 
                            size={80} 
                            color={connectedPrinter ? COLORS.success : activeColors.textLight} 
                            style={{ marginBottom: SPACING.lg }}
                        />
                        
                        <Text style={[styles.statusTitle, { color: activeColors.text }]}>
                            {connectedPrinter ? t('printer_connected') : t('printer_not_connected')}
                        </Text>

                        {connectedPrinter ? (
                            <View style={[styles.connectedBox, { backgroundColor: activeColors.background, borderColor: COLORS.success }]}>
                                <View style={styles.deviceInfo}>
                                    <Text style={[styles.deviceName, { color: activeColors.text }]}>{connectedPrinter.name}</Text>
                                    <Text style={[styles.deviceAddress, { color: activeColors.textLight }]}>{connectedPrinter.address}</Text>
                                </View>
                                <TouchableOpacity 
                                    onPress={() => {
                                        setConnectedPrinter(null);
                                        setIsPrinterConnected(false);
                                    }}
                                    style={styles.disconnectButton}
                                >
                                    <Icon name="close-circle" size={24} color={COLORS.error} />
                                </TouchableOpacity>
                            </View>
                        ) : (
                            <Text style={[styles.statusDesc, { color: activeColors.textLight }]}>
                                {t('printer_not_connected_msg')}
                            </Text>
                        )}

                        <TouchableOpacity
                            style={[styles.searchButton, { backgroundColor: activeColors.primary }]}
                            onPress={handleScanDevices}
                            disabled={isScanning}
                        >
                            {isScanning ? (
                                <ActivityIndicator color="#FFF" />
                            ) : (
                                <>
                                    <Icon name="search" size={20} color="#FFF" style={{ marginRight: 8 }} />
                                    <Text style={styles.searchButtonText}>{t('search') || 'Search Device'}</Text>
                                </>
                            )}
                        </TouchableOpacity>
                    </View>
                </View>

                {/* Test Connection Button */}
                {connectedPrinter && (
                    <View style={[styles.configCard, { backgroundColor: activeColors.cardBg, borderColor: activeColors.border, marginBottom: SPACING.xl }]}>
                        <View style={styles.configItem}>
                            <View style={styles.configTextLabel}>
                                <Text style={[styles.configLabel, { color: activeColors.text }]}>{t('test_connection')}</Text>
                                <Text style={[styles.configDesc, { color: activeColors.textLight }]}>{t('test_connection_desc')}</Text>
                            </View>
                            <PrimaryButton
                                title={isPrinting ? t('printing_progress') : t('send_test_print')}
                                onPress={handleTestPrint}
                                disabled={isPrinting}
                                isLoading={isPrinting}
                                style={{ minWidth: 150 }}
                            />
                        </View>
                    </View>
                )}

                <View style={styles.helpSection}>
                    <Text style={[styles.helpTitle, { color: activeColors.text }]}>{t('need_help')}</Text>
                    <Text style={[styles.helpText, { color: activeColors.textLight }]}>
                        {t('thermal_help_text')}
                    </Text>
                </View>
            </ScrollView>

            {/* Device Search Modal */}
            <Modal
                visible={isScanning || devices.length > 0}
                transparent={true}
                animationType="slide"
                onRequestClose={() => {
                    setIsScanning(false);
                    setDevices([]);
                }}
            >
                <View style={styles.modalOverlay}>
                    <View style={[styles.modalContent, { backgroundColor: activeColors.cardBg }]}>
                        <View style={styles.modalHeader}>
                            <Text style={[styles.modalTitle, { color: activeColors.text }]}>
                                {t('available_bluetooth_devices')}
                            </Text>
                            <TouchableOpacity 
                                onPress={() => {
                                    setIsScanning(false);
                                    setDevices([]);
                                }}
                            >
                                <Icon name="close" size={24} color={activeColors.text} />
                            </TouchableOpacity>
                        </View>

                        <ScrollView style={styles.deviceListModal}>
                            {isScanning && devices.length === 0 ? (
                                <View style={styles.loadingContainer}>
                                    <ActivityIndicator size="large" color={activeColors.primary} />
                                    <Text style={[styles.loadingText, { color: activeColors.textLight }]}>{t('scanning')}</Text>
                                </View>
                            ) : devices.length > 0 ? (
                                devices.map((device, index) => {
                                    const devId = device.inner_mac_address || device.device_id;
                                    const isConnecting = connectingDeviceId === devId;
                                    return (
                                        <TouchableOpacity
                                            key={index}
                                            style={[styles.deviceItemModal, { borderBottomColor: activeColors.border }]}
                                            onPress={() => handleSelectDevice(device)}
                                            disabled={isConnecting}
                                        >
                                            <View style={styles.deviceInfo}>
                                                <Text style={[styles.deviceNameModal, { color: activeColors.text }]}>{device.device_name || 'Unknown Printer'}</Text>
                                                <Text style={[styles.deviceAddressModal, { color: activeColors.textLight }]}>{devId}</Text>
                                            </View>
                                            {isConnecting ? (
                                                <ActivityIndicator size="small" color={activeColors.primary} />
                                            ) : (
                                                <Icon name="chevron-forward" size={20} color={activeColors.border} />
                                            )}
                                        </TouchableOpacity>
                                    );
                                })
                            ) : (
                                <View style={styles.emptyStateModal}>
                                    <Text style={[styles.emptyText, { color: activeColors.textLight }]}>{t('no_printers_found')}</Text>
                                    <TouchableOpacity style={styles.retryButton} onPress={handleScanDevices}>
                                        <Text style={styles.retryButtonText}>{t('retry')}</Text>
                                    </TouchableOpacity>
                                </View>
                            )}
                        </ScrollView>
                    </View>
                </View>
            </Modal>
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
    statusTitle: {
        fontSize: FONT_SIZES.xl,
        fontWeight: 'bold',
        marginBottom: SPACING.xs,
    },
    statusDesc: {
        fontSize: FONT_SIZES.sm,
        textAlign: 'center',
        marginBottom: SPACING.xl,
    },
    connectedBox: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: SPACING.md,
        borderRadius: BORDER_RADIUS.md,
        borderWidth: 1,
        width: '100%',
        marginBottom: SPACING.xl,
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
    disconnectButton: {
        padding: SPACING.xs,
    },
    searchButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 14,
        paddingHorizontal: 30,
        borderRadius: 30,
        width: '100%',
        elevation: 4,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 4,
    },
    searchButtonText: {
        color: '#FFF',
        fontSize: FONT_SIZES.md,
        fontWeight: 'bold',
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
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'flex-end',
    },
    modalContent: {
        borderTopLeftRadius: 30,
        borderTopRightRadius: 30,
        padding: SPACING.xl,
        maxHeight: '80%',
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: SPACING.xl,
    },
    modalTitle: {
        fontSize: FONT_SIZES.lg,
        fontWeight: 'bold',
    },
    deviceListModal: {
        marginBottom: SPACING.xl,
    },
    deviceItemModal: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: SPACING.md,
        borderBottomWidth: 1,
    },
    deviceNameModal: {
        fontSize: FONT_SIZES.md,
        fontWeight: '600',
    },
    deviceAddressModal: {
        fontSize: FONT_SIZES.xs,
        marginTop: 2,
    },
    loadingContainer: {
        padding: SPACING.xxl,
        alignItems: 'center',
    },
    loadingText: {
        marginTop: SPACING.md,
        fontSize: FONT_SIZES.sm,
    },
    emptyStateModal: {
        padding: SPACING.xxl,
        alignItems: 'center',
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
});
