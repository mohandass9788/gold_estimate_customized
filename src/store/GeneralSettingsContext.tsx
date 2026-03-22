import React, { createContext, useContext, useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { setSetting, getSetting, getEmployees, DBEmployee, getCustomEndpoints, DBCustomEndpoint } from '../services/dbService';
import { initAutoConnect, PrinterData } from '../services/printService';
import { Platform, NativeModules } from 'react-native';
import * as Application from 'expo-application';
import * as Device from 'expo-device';
import enTranslations from '../locales/en.json';
import taTranslations from '../locales/ta.json';
import { AlertButton } from '../components/CustomAlertModal';
import CustomAlertModal from '../components/CustomAlertModal';
import { BASE_URL } from '../constants/config';


type ThemeMode = 'light' | 'dark';
type Language = 'en' | 'ta';

interface ConnectedPrinter {
    id: string;
    name: string;
    address?: string; // MAC address for Bluetooth
    type?: string;
}

export interface ReceiptConfig {
    showHeader: boolean;
    showFooter: boolean;
    showOperator: boolean;
    showCustomer: boolean;
    showCustomerName: boolean;
    showCustomerMobile: boolean;
    showCustomerAddress: boolean;
    showGST: boolean;
    showWastage: boolean;
    showMakingCharge: boolean;
    showDeviceName: boolean;
    wastageDisplayType: 'percentage' | 'grams';
    makingChargeDisplayType: 'percentage' | 'grams' | 'fixed';
    paperWidth: '58mm' | '80mm' | '112mm';
    mergePrint: boolean;
    qrEndpointUrl?: string;
}

export interface FeatureFlags {
    isChitEnabled: boolean;
    isAdvanceEnabled: boolean;
    isRepairEnabled: boolean;
    isPurchaseEnabled: boolean;
    isEstimationEnabled: boolean;
}

export interface PrintDetails {
    customerName: string;
    mobile: string;
    place: string;
    employeeName: string;
}

type PrinterType = 'system' | 'thermal';

interface GeneralSettingsContextType {
    theme: ThemeMode;
    language: Language;
    toggleTheme: () => void;
    setLanguage: (lang: Language) => void;
    connectedPrinter: ConnectedPrinter | null;
    setConnectedPrinter: (printer: ConnectedPrinter | null) => void;
    printerType: PrinterType;
    setPrinterType: (type: PrinterType) => void;
    isPrinterConnected: boolean;
    setIsPrinterConnected: (status: boolean) => void;
    connectionStatus: 'idle' | 'connecting' | 'failed' | 'connected';
    retryAttempt: number;
    countdown: number;
    isBluetoothEnabled: boolean;
    setIsBluetoothEnabled: (status: boolean) => void;
    deviceId: string;
    updateDeviceId: (id: string) => void;
    alertConfig: {
        visible: boolean;
        title: string;
        message: string;
        type: 'success' | 'error' | 'warning' | 'info';
        buttons: AlertButton[];
    };
    showAlert: (title: string, message: string, type?: 'success' | 'error' | 'warning' | 'info', buttons?: AlertButton[]) => void;
    hideAlert: () => void;
    shopDetails: {
        name: string;
        address: string;
        phone: string;
        gstNumber: string;
        email: string;
        footerMessage: string;
        gstPercentage: string;
        appLogo?: string;
        appIcon?: string;
        splashImage?: string;
    };
    updateShopDetails: (details: Partial<{
        name: string;
        address: string;
        phone: string;
        gstNumber: string;
        email: string;
        footerMessage: string;
        gstPercentage: string;
        appLogo?: string;
        appIcon?: string;
        splashImage?: string;
    }>) => void;
    t: (key: string, params?: Record<string, string>) => string;
    adminPin: string;
    updateAdminPin: (newPin: string) => void;
    deviceName: string;
    updateDeviceName: (name: string) => void;
    currentEmployeeName: string;
    setCurrentEmployeeName: (name: string) => void;
    showPrintDetailsModal: boolean;
    setShowPrintDetailsModal: (show: boolean) => void;
    handlePrintConfirm: (details: PrintDetails) => Promise<void>;
    requestPrint: (callback: (details: PrintDetails) => Promise<void>, bypassDetails?: boolean, initialData?: PrintDetails, cachedDetails?: PrintDetails) => void;
    receiptConfig: ReceiptConfig;
    updateReceiptConfig: (config: Partial<ReceiptConfig>) => void;
    featureFlags: FeatureFlags;
    updateFeatureFlags: (flags: Partial<FeatureFlags>) => void;
    printDetailsModalInitialData: PrintDetails | null;
    serverApiUrl: string;
    updateServerApiUrl: (url: string) => void;
    localServerUrl: string;
    updateLocalServerUrl: (url: string) => void;
    localQrEndpoint: string;
    updateLocalQrEndpoint: (path: string) => void;
    localSaveEndpoint: string;
    updateLocalSaveEndpoint: (path: string) => void;
    useLocalServerForScanning: boolean;
    setUseLocalServerForScanning: (value: boolean) => void;
    customEndpoints: DBCustomEndpoint[];
    refreshCustomEndpoints: () => Promise<void>;
    employees: DBEmployee[];
    refreshEmployees: () => Promise<void>;
    refreshAuthStatus: () => Promise<void>;
}

const GeneralSettingsContext = createContext<GeneralSettingsContextType | undefined>(undefined);

const translations: Record<Language, Record<string, string>> = {
    en: enTranslations as any,
    ta: taTranslations as any
};

export const GeneralSettingsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [theme, setTheme] = useState<ThemeMode>('light');
    const [language, setLanguageState] = useState<Language>('en');
    const [deviceId, setDeviceId] = useState<string>('');
    const [shopDetails, setShopDetails] = useState({
        name: 'GOLD ESTIMATION',
        address: '',
        phone: '',
        gstNumber: '',
        email: '',
        footerMessage: 'Thank You! Visit Again.',
        gstPercentage: '3',
        appLogo: '',
        appIcon: '',
        splashImage: '',
    });

    const [connectedPrinter, setConnectedPrinter] = useState<ConnectedPrinter | null>(null);
    const [printerType, setPrinterTypeState] = useState<PrinterType>('thermal');

    const [adminPin, setAdminPin] = useState('1234');

    const [isPrinterConnected, setIsPrinterConnected] = useState(false);
    const [connectionStatus, setConnectionStatus] = useState<'idle' | 'connecting' | 'failed' | 'connected'>('idle');
    const [retryAttempt, setRetryAttempt] = useState(0);
    const [countdown, setCountdown] = useState(0);
    const [isBluetoothEnabled, setIsBluetoothEnabled] = useState(true);
    const [deviceName, setDeviceNameState] = useState<string>('');
    const [currentEmployeeName, setCurrentEmployeeName] = useState<string>('');
    const [showPrintDetailsModal, setShowPrintDetailsModal] = useState(false);
    const [printDetailsModalInitialData, setPrintDetailsModalInitialData] = useState<PrintDetails | null>(null);
    const [alertConfig, setAlertConfig] = useState<{
        visible: boolean;
        title: string;
        message: string;
        type: 'success' | 'error' | 'warning' | 'info';
        buttons: AlertButton[];
    }>({
        visible: false,
        title: '',
        message: '',
        type: 'info',
        buttons: []
    });

    const [serverApiUrl, setServerApiUrlState] = useState<string>(BASE_URL);
    const [localServerUrl, setLocalServerUrlState] = useState<string>('');
    const [localQrEndpoint, setLocalQrEndpointState] = useState<string>('/api/product/scan-tag');
    const [localSaveEndpoint, setLocalSaveEndpointState] = useState<string>('/api/estimation/save');
    const [useLocalServerForScanning, setUseLocalServerForScanningState] = useState<boolean>(false);
    const [customEndpoints, setCustomEndpoints] = useState<DBCustomEndpoint[]>([]);
    const [employees, setEmployees] = useState<DBEmployee[]>([]);

    const refreshCustomEndpoints = useCallback(async () => {
        try {
            const endpoints = await getCustomEndpoints();
            setCustomEndpoints(endpoints);
        } catch (e) {
            console.error('Failed to refresh custom endpoints:', e);
        }
    }, []);

    const refreshEmployees = useCallback(async () => {
        try {
            const emps = await getEmployees(true);
            setEmployees(emps);
        } catch (e) {
            console.error('Failed to refresh employees:', e);
        }
    }, []);

    const showAlert = useCallback((title: string, message: string, type: 'success' | 'error' | 'warning' | 'info' = 'info', buttons: AlertButton[] = []) => {
        setAlertConfig({ visible: true, title, message, type, buttons });
    }, []);

    const hideAlert = useCallback(() => {
        setAlertConfig(prev => ({ ...prev, visible: false }));
    }, []);

    const [receiptConfig, setReceiptConfig] = useState<ReceiptConfig>({
        showHeader: true,
        showFooter: true,
        showOperator: true,
        showCustomer: true,
        showCustomerName: true,
        showCustomerMobile: true,
        showCustomerAddress: true,
        showGST: true,
        showWastage: true,
        showMakingCharge: true,
        showDeviceName: true,
        wastageDisplayType: 'percentage',
        makingChargeDisplayType: 'fixed',
        paperWidth: '58mm',
        mergePrint: true,
    });

    const [featureFlags, setFeatureFlags] = useState<FeatureFlags>({
        isChitEnabled: true,
        isAdvanceEnabled: true,
        isRepairEnabled: true,
        isPurchaseEnabled: true,
        isEstimationEnabled: true,
    });
    const printCallbackRef = useRef<((details: PrintDetails) => Promise<void>) | null>(null);

    const requestPrint = useCallback((callback: (details: PrintDetails) => Promise<void>, bypassDetails = false, initialData?: PrintDetails, cachedDetails?: PrintDetails) => {
        printCallbackRef.current = callback;
        if (cachedDetails) {
            callback(cachedDetails).then(() => {
                printCallbackRef.current = null;
            });
        } else if (bypassDetails) {
            callback({
                customerName: '',
                mobile: '',
                place: '',
                employeeName: currentEmployeeName || 'Admin'
            }).then(() => {
                printCallbackRef.current = null;
            });
        } else {
            setPrintDetailsModalInitialData(initialData || null);
            setShowPrintDetailsModal(true);
        }
    }, [currentEmployeeName]);

    const handlePrintConfirm = useCallback(async (details: PrintDetails) => {
        setCurrentEmployeeName(details.employeeName);
        setShowPrintDetailsModal(false);
        setPrintDetailsModalInitialData(null);
        if (printCallbackRef.current) {
            await printCallbackRef.current(details);
            printCallbackRef.current = null;
        }
    }, []);

    useEffect(() => {
        const fetchDeviceId = async () => {
            try {
                // Try fetching stored device ID first
                const storedId = await getSetting('custom_device_id');
                if (storedId) {
                    setDeviceId(storedId);
                    return;
                }

                let hardwareId = '';
                if (Platform.OS === 'android') {
                    hardwareId = (Application as any).androidId || '';
                } else if (Platform.OS === 'ios') {
                    hardwareId = await Application.getIosIdForVendorAsync() || '';
                }

                if (!hardwareId) {
                    hardwareId = Math.random().toString(36).substring(2, 10).toUpperCase();
                }

                setDeviceId(hardwareId);
            } catch (e) {
                console.error('Error fetching device ID:', e);
            }
        };
        fetchDeviceId();

        const loadSettings = async () => {
            try {
                const savedShopDetails = await Promise.all([
                    getSetting('shop_name'),
                    getSetting('shop_address'),
                    getSetting('shop_phone'),
                    getSetting('shop_gst'),
                    getSetting('shop_email'),
                    getSetting('shop_footer'),
                    getSetting('app_logo'),
                    getSetting('app_icon'),
                    getSetting('splash_image'),
                    getSetting('gst_percentage')
                ]);

                if (savedShopDetails[0]) setShopDetails(prev => ({ ...prev, name: savedShopDetails[0]! }));
                if (savedShopDetails[1]) setShopDetails(prev => ({ ...prev, address: savedShopDetails[1]! }));
                if (savedShopDetails[2]) setShopDetails(prev => ({ ...prev, phone: savedShopDetails[2]! }));
                if (savedShopDetails[3]) setShopDetails(prev => ({ ...prev, gstNumber: savedShopDetails[3]! }));
                if (savedShopDetails[4]) setShopDetails(prev => ({ ...prev, email: savedShopDetails[4]! }));
                if (savedShopDetails[5]) setShopDetails(prev => ({ ...prev, footerMessage: savedShopDetails[5]! }));
                if (savedShopDetails[6]) setShopDetails(prev => ({ ...prev, appLogo: savedShopDetails[6]! }));
                if (savedShopDetails[7]) setShopDetails(prev => ({ ...prev, appIcon: savedShopDetails[7]! }));
                if (savedShopDetails[8]) setShopDetails(prev => ({ ...prev, splashImage: savedShopDetails[8]! }));
                if (savedShopDetails[9]) setShopDetails(prev => ({ ...prev, gstPercentage: savedShopDetails[9]! }));

                const savedServerUrl = await getSetting('server_api_url');
                if (savedServerUrl) setServerApiUrlState(savedServerUrl);

                const savedLocalServerUrl = await getSetting('local_server_url');
                if (savedLocalServerUrl) setLocalServerUrlState(savedLocalServerUrl);

                const savedUseLocalServer = await getSetting('use_local_server_scanning');
                if (savedUseLocalServer) setUseLocalServerForScanningState(savedUseLocalServer === 'true');

                const savedLocalQr = await getSetting('local_qr_endpoint');
                if (savedLocalQr) setLocalQrEndpointState(savedLocalQr);

                const savedLocalSave = await getSetting('local_save_endpoint');
                if (savedLocalSave) setLocalSaveEndpointState(savedLocalSave);

                const savedPin = await getSetting('admin_pin');
                if (savedPin) setAdminPin(savedPin);

                const savedTheme = await getSetting('app_theme');
                if (savedTheme) setTheme(savedTheme as ThemeMode);

                const savedLang = await getSetting('app_language');
                if (savedLang) setLanguageState(savedLang as Language);

                const savedPrinter = await getSetting('connected_printer');
                if (savedPrinter) {
                    try { setConnectedPrinter(JSON.parse(savedPrinter)); } catch (e) { }
                }

                const savedPrinterType = await getSetting('printer_type');
                if (savedPrinterType) setPrinterTypeState(savedPrinterType as PrinterType);

                const savedReceiptConfig = await getSetting('receipt_config');
                if (savedReceiptConfig) {
                    try { setReceiptConfig(prev => ({ ...prev, ...JSON.parse(savedReceiptConfig) })); } catch (e) { }
                }

                const savedDeviceName = await getSetting('device_name');
                const savedDeviceId = await getSetting('custom_device_id');

                let effectiveName = savedDeviceName || savedDeviceId;

                if (!effectiveName) {
                    let defaultName = 'DEVICE';
                    try {
                        const brand = (Device.brand || '').toUpperCase();
                        const model = (Device.modelName || '').toUpperCase();

                        let uniquePart = '';
                        if (Platform.OS === 'android') {
                            uniquePart = (Application as any).androidId?.substring(0, 6).toUpperCase() || '';
                        } else if (Platform.OS === 'ios') {
                            const iosId = await Application.getIosIdForVendorAsync();
                            uniquePart = iosId?.substring(0, 6).toUpperCase() || '';
                        }

                        if (brand && model) {
                            defaultName = `${brand}-${model}`;
                        } else if (brand) {
                            defaultName = `${brand}-${uniquePart || 'DEVICE'}`;
                        } else if (uniquePart) {
                            defaultName = `DEV-${uniquePart}`;
                        } else {
                            defaultName = `DEV-${Math.floor(Math.random() * 1000000)}`;
                        }

                        // Sanitize name (remove spaces)
                        defaultName = defaultName.replace(/\s+/g, '-');
                    } catch (e) { }
                    effectiveName = defaultName;
                    await setSetting('device_name', defaultName);
                    await setSetting('custom_device_id', defaultName);
                }

                setDeviceNameState(effectiveName);
                setDeviceId(effectiveName);

                const savedFeatureFlags = await getSetting('feature_flags');
                if (savedFeatureFlags) {
                    try { setFeatureFlags(prev => ({ ...prev, ...JSON.parse(savedFeatureFlags) })); } catch (e) { }
                }
            } catch (e) { }
        };

        const performAutoConnect = async () => {
            const savedPrinter = await getSetting('connected_printer');
            const savedPrinterType = await getSetting('printer_type');

            if (savedPrinterType === 'thermal' && savedPrinter) {
                const printer = JSON.parse(savedPrinter);
                if (printer && printer.address) {
                    setConnectionStatus('connecting');
                    const backoff = [5, 10];

                    for (let i = 0; i < 3; i++) {
                        setRetryAttempt(i + 1);
                        console.log(`Auto-connect attempt ${i + 1} to ${printer.address}`);

                        const result = await initAutoConnect();
                        if (result) {
                            setConnectedPrinter(result as any);
                            setIsPrinterConnected(true);
                            setConnectionStatus('connected');
                            setRetryAttempt(0);
                            setCountdown(0);
                            return;
                        }

                        if (i < 2) {
                            let timeLeft = backoff[i];
                            setCountdown(timeLeft);

                            // Countdown interval
                            const timer = setInterval(() => {
                                timeLeft--;
                                setCountdown(Math.max(0, timeLeft));
                                if (timeLeft <= 0) clearInterval(timer);
                            }, 1000);

                            await new Promise(resolve => setTimeout(resolve, backoff[i] * 1000));
                            clearInterval(timer);
                        }
                    }
                    setConnectionStatus('failed');
                    setIsPrinterConnected(false);
                    setRetryAttempt(0);
                    setCountdown(0);
                }
            } else {
                setIsPrinterConnected(false);
            }
        };

        loadSettings().then(() => {
            performAutoConnect();
            refreshEmployees();
            refreshCustomEndpoints();
        });
    }, []);

    const updateShopDetails = useCallback(async (details: Partial<typeof shopDetails>) => {
        setShopDetails(prev => {
            const next = { ...prev, ...details };
            (async () => {
                if (details.name) await setSetting('shop_name', details.name);
                if (details.address) await setSetting('shop_address', details.address);
                if (details.phone) await setSetting('shop_phone', details.phone);
                if (details.gstNumber) await setSetting('shop_gst', details.gstNumber);
                if (details.email) await setSetting('shop_email', details.email);
                if (details.footerMessage) await setSetting('shop_footer', details.footerMessage);
                if (details.gstPercentage) await setSetting('gst_percentage', details.gstPercentage);
                if (details.appLogo !== undefined) await setSetting('app_logo', details.appLogo);
                if (details.appIcon !== undefined) await setSetting('app_icon', details.appIcon);
                if (details.splashImage !== undefined) await setSetting('splash_image', details.splashImage);
            })();
            return next;
        });
    }, []);

    const updateAdminPin = useCallback(async (newPin: string) => {
        setAdminPin(newPin);
        await setSetting('admin_pin', newPin);
    }, []);

    const toggleTheme = useCallback(() => {
        setTheme(prev => {
            const next = prev === 'light' ? 'dark' : 'light';
            setSetting('app_theme', next);
            return next;
        });
    }, []);

    const setLanguage = useCallback((lang: Language) => {
        setLanguageState(lang);
        setSetting('app_language', lang);
    }, []);

    const setPrinterType = useCallback((type: PrinterType) => {
        setPrinterTypeState(type);
        setSetting('printer_type', type);
        if (type === 'system') {
            setIsPrinterConnected(false);
            setConnectionStatus('idle');
        }
    }, []);

    const updateDeviceName = useCallback(async (name: string) => {
        setDeviceNameState(name);
        setDeviceId(name);
        await setSetting('device_name', name);
        await setSetting('custom_device_id', name);
    }, []);

    const updateDeviceId = useCallback(async (id: string) => {
        setDeviceId(id);
        setDeviceNameState(id);
        await setSetting('custom_device_id', id);
        await setSetting('device_name', id);
    }, []);

    const updateConnectedPrinter = useCallback(async (printer: ConnectedPrinter | null) => {
        setConnectedPrinter(printer);
        if (printer) {
            setIsPrinterConnected(true);
            setConnectionStatus('connected');
        } else {
            setIsPrinterConnected(false);
            setConnectionStatus('idle');
        }
        await setSetting('connected_printer', printer ? JSON.stringify(printer) : '');
    }, []);

    const updateServerApiUrl = useCallback(async (url: string) => {
        setServerApiUrlState(url);
        await setSetting('server_api_url', url);
    }, []);

    const updateLocalServerUrl = useCallback(async (url: string) => {
        setLocalServerUrlState(url);
        await setSetting('local_server_url', url);
    }, []);

    const updateLocalSaveEndpoint = useCallback(async (path: string) => {
        setLocalSaveEndpointState(path);
        await setSetting('local_save_endpoint', path);
    }, []);

    const updateLocalQrEndpoint = useCallback(async (path: string) => {
        setLocalQrEndpointState(path);
        await setSetting('local_qr_endpoint', path);
    }, []);

    const setUseLocalServerForScanning = useCallback(async (value: boolean) => {
        setUseLocalServerForScanningState(value);
        await setSetting('use_local_server_scanning', String(value));
    }, []);

    const updateReceiptConfig = useCallback(async (config: Partial<ReceiptConfig>) => {
        setReceiptConfig(prev => {
            const next = { ...prev, ...config };
            setSetting('receipt_config', JSON.stringify(next));
            return next;
        });
    }, []);

    const updateFeatureFlags = useCallback(async (flags: Partial<FeatureFlags>) => {
        setFeatureFlags(prev => {
            const next = { ...prev, ...flags };
            setSetting('feature_flags', JSON.stringify(next));
            return next;
        });
    }, []);

    const t = useCallback((key: string, params?: Record<string, string>) => {
        let translation = translations[language][key] || key;
        if (params) {
            Object.keys(params).forEach(param => {
                translation = translation.replace(`{${param}}`, params[param]);
            });
        }
        return translation;
    }, [language]);

    const refreshAuthStatus = useCallback(async () => {
        try {
            const { checkAuthStatus } = await import('../services/authService');
            const res = await checkAuthStatus();
            const features = res?.features || res?.user?.features || res?.data?.features || res;
            if (features) {
                const newFlags = {
                    isChitEnabled: !!(features.chit || features.feature_chit),
                    isPurchaseEnabled: !!(features.purchase || features.feature_purchase),
                    isEstimationEnabled: !!(features.estimation || features.feature_estimation),
                    isAdvanceEnabled: !!(features.advance_chit || features.feature_advance_chit),
                    isRepairEnabled: !!(features.repair || features.feature_repair),
                };
                updateFeatureFlags(newFlags);
            }
        } catch (e) {
            console.error('Auth status refresh failed:', e);
        }
    }, [updateFeatureFlags]);

    const contextValue = useMemo(() => ({
        theme,
        language,
        toggleTheme,
        setLanguage,
        connectedPrinter,
        setPrinterType,
        printerType,
        setConnectedPrinter: updateConnectedPrinter,
        shopDetails,
        updateShopDetails,
        t,
        adminPin,
        updateAdminPin,
        isPrinterConnected,
        setIsPrinterConnected,
        connectionStatus,
        retryAttempt,
        countdown,
        isBluetoothEnabled,
        setIsBluetoothEnabled,
        deviceName,
        updateDeviceName,
        currentEmployeeName,
        setCurrentEmployeeName,
        showPrintDetailsModal,
        setShowPrintDetailsModal,
        handlePrintConfirm,
        requestPrint,
        receiptConfig,
        updateReceiptConfig,
        featureFlags,
        updateFeatureFlags,
        deviceId,
        updateDeviceId,
        alertConfig,
        showAlert,
        hideAlert,
        printDetailsModalInitialData,
        serverApiUrl,
        updateServerApiUrl,
        localServerUrl,
        updateLocalServerUrl,
        localQrEndpoint,
        updateLocalQrEndpoint,
        localSaveEndpoint,
        updateLocalSaveEndpoint,
        useLocalServerForScanning,
        setUseLocalServerForScanning,
        customEndpoints,
        refreshCustomEndpoints,
        employees,
        refreshEmployees,
        refreshAuthStatus
    }), [
        theme, language, toggleTheme, setLanguage, connectedPrinter, setPrinterType, printerType,
        updateConnectedPrinter, shopDetails, updateShopDetails, t, adminPin, updateAdminPin,
        isPrinterConnected, setIsPrinterConnected, connectionStatus, retryAttempt, countdown,
        isBluetoothEnabled, setIsBluetoothEnabled, deviceName, updateDeviceName,
        currentEmployeeName, setCurrentEmployeeName, showPrintDetailsModal, setShowPrintDetailsModal,
        handlePrintConfirm, requestPrint, receiptConfig, updateReceiptConfig, featureFlags,
        updateFeatureFlags, deviceId, updateDeviceId, alertConfig, showAlert, hideAlert,
        printDetailsModalInitialData, serverApiUrl, updateServerApiUrl, localServerUrl,
        updateLocalServerUrl, localQrEndpoint, updateLocalQrEndpoint, localSaveEndpoint,
        updateLocalSaveEndpoint, useLocalServerForScanning, setUseLocalServerForScanning,
        customEndpoints, refreshCustomEndpoints, employees, refreshEmployees, refreshAuthStatus
    ]);

    return (
        <GeneralSettingsContext.Provider value={contextValue}>
            {children}
            <CustomAlertModal
                visible={alertConfig.visible}
                title={alertConfig.title}
                message={alertConfig.message}
                type={alertConfig.type}
                theme={theme}
                onClose={hideAlert}
                buttons={alertConfig.buttons}
                t={t}
            />
        </GeneralSettingsContext.Provider>
    );
};

export const useGeneralSettings = () => {
    const context = useContext(GeneralSettingsContext);
    if (context === undefined) throw new Error('useGeneralSettings must be used within a GeneralSettingsProvider');
    return context;
};
