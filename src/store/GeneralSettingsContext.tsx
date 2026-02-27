import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { setSetting, getSetting } from '../services/dbService';
import { initAutoConnect, PrinterData } from '../services/printService';
import { Platform, NativeModules } from 'react-native';
import * as Application from 'expo-application';
import enTranslations from '../locales/en.json';
import taTranslations from '../locales/ta.json';
import { AlertButton } from '../components/CustomAlertModal';

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
    requestPrint: (callback: (details: PrintDetails) => Promise<void>, bypassDetails?: boolean, initialData?: PrintDetails) => void;
    receiptConfig: ReceiptConfig;
    updateReceiptConfig: (config: Partial<ReceiptConfig>) => void;
    printDetailsModalInitialData: PrintDetails | null;
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
        appLogo: '',
        appIcon: '',
        splashImage: '',
    });

    const [connectedPrinter, setConnectedPrinter] = useState<ConnectedPrinter | null>(null);
    const [printerType, setPrinterTypeState] = useState<PrinterType>('system');

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

    const showAlert = (title: string, message: string, type: 'success' | 'error' | 'warning' | 'info' = 'info', buttons: AlertButton[] = []) => {
        setAlertConfig({ visible: true, title, message, type, buttons });
    };

    const hideAlert = () => {
        setAlertConfig(prev => ({ ...prev, visible: false }));
    };

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
    const printCallbackRef = useRef<((details: PrintDetails) => Promise<void>) | null>(null);

    const requestPrint = (callback: (details: PrintDetails) => Promise<void>, bypassDetails = false, initialData?: PrintDetails) => {
        printCallbackRef.current = callback;
        if (bypassDetails) {
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
    };

    const handlePrintConfirm = async (details: PrintDetails) => {
        setCurrentEmployeeName(details.employeeName);
        setShowPrintDetailsModal(false);
        setPrintDetailsModalInitialData(null);
        if (printCallbackRef.current) {
            await printCallbackRef.current(details);
            printCallbackRef.current = null;
        }
    };

    useEffect(() => {
        const fetchDeviceId = async () => {
            try {
                if (Platform.OS === 'android') {
                    setDeviceId((Application as any).androidId || '');
                } else if (Platform.OS === 'ios') {
                    const id = await Application.getIosIdForVendorAsync();
                    setDeviceId(id || '');
                }
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
                    getSetting('splash_image')
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
                if (savedDeviceName) setDeviceNameState(savedDeviceName);
            } catch (e) { }
        };

        const performAutoConnect = async () => {
            const savedPrinter = await getSetting('connected_printer');
            const savedPrinterType = await getSetting('printer_type');

            if (savedPrinterType === 'thermal' && savedPrinter) {
                const printer = JSON.parse(savedPrinter);
                if (printer && printer.address) {
                    setConnectionStatus('connecting');
                    const backoff = [10, 20, 30, 40];

                    for (let i = 0; i < 5; i++) {
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

                        if (i < 4) {
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
        });
    }, []);

    const updateShopDetails = async (details: Partial<typeof shopDetails>) => {
        setShopDetails(prev => ({ ...prev, ...details }));
        if (details.name) await setSetting('shop_name', details.name);
        if (details.address) await setSetting('shop_address', details.address);
        if (details.phone) await setSetting('shop_phone', details.phone);
        if (details.gstNumber) await setSetting('shop_gst', details.gstNumber);
        if (details.email) await setSetting('shop_email', details.email);
        if (details.footerMessage) await setSetting('shop_footer', details.footerMessage);
        if (details.appLogo !== undefined) await setSetting('app_logo', details.appLogo);
        if (details.appIcon !== undefined) await setSetting('app_icon', details.appIcon);
        if (details.splashImage !== undefined) await setSetting('splash_image', details.splashImage);
    };

    const updateAdminPin = async (newPin: string) => {
        setAdminPin(newPin);
        await setSetting('admin_pin', newPin);
    };

    const toggleTheme = () => {
        const newTheme = theme === 'light' ? 'dark' : 'light';
        setTheme(newTheme);
        setSetting('app_theme', newTheme);
    };

    const setLanguage = (lang: Language) => {
        setLanguageState(lang);
        setSetting('app_language', lang);
    };

    const setPrinterType = (type: PrinterType) => {
        setPrinterTypeState(type);
        setSetting('printer_type', type);
        if (type === 'system') {
            setIsPrinterConnected(false);
            setConnectionStatus('idle');
        }
    };

    const updateDeviceName = async (name: string) => {
        setDeviceNameState(name);
        await setSetting('device_name', name);
    };

    const updateReceiptConfig = async (config: Partial<ReceiptConfig>) => {
        const newConfig = { ...receiptConfig, ...config };
        setReceiptConfig(newConfig);
        await setSetting('receipt_config', JSON.stringify(newConfig));
    };

    const t = (key: string, params?: Record<string, string>) => {
        let translation = translations[language][key] || key;
        if (params) {
            Object.keys(params).forEach(param => {
                translation = translation.replace(`{${param}}`, params[param]);
            });
        }
        return translation;
    };

    return (
        <GeneralSettingsContext.Provider value={{
            theme,
            language,
            toggleTheme,
            setLanguage,
            connectedPrinter,
            setPrinterType,
            printerType,
            setConnectedPrinter: async (printer: ConnectedPrinter | null) => {
                setConnectedPrinter(printer);
                if (!printer) {
                    setIsPrinterConnected(false);
                    setConnectionStatus('idle');
                }
                await setSetting('connected_printer', printer ? JSON.stringify(printer) : '');
            },
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
            deviceId,
            alertConfig,
            showAlert,
            hideAlert,
            printDetailsModalInitialData
        }}>
            {children}
        </GeneralSettingsContext.Provider>
    );
};

export const useGeneralSettings = () => {
    const context = useContext(GeneralSettingsContext);
    if (context === undefined) throw new Error('useGeneralSettings must be used within a GeneralSettingsProvider');
    return context;
};
