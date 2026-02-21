import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { setSetting, getSetting } from '../services/dbService';
import { Platform, NativeModules } from 'react-native';
import enTranslations from '../locales/en.json';
import taTranslations from '../locales/ta.json';

type ThemeMode = 'light' | 'dark';
type Language = 'en' | 'ta';

interface ConnectedPrinter {
    id: string;
    name: string;
    address?: string; // MAC address for Bluetooth
    type?: string;
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
    isBluetoothEnabled: boolean;
    setIsBluetoothEnabled: (status: boolean) => void;
    shopDetails: {
        name: string;
        address: string;
        phone: string;
        gstNumber: string;
        email: string;
        footerMessage: string;
    };
    updateShopDetails: (details: Partial<{
        name: string;
        address: string;
        phone: string;
        gstNumber: string;
        email: string;
        footerMessage: string;
    }>) => void;
    t: (key: string, params?: Record<string, string>) => string;
    adminPin: string;
    updateAdminPin: (newPin: string) => void;
    deviceName: string;
    updateDeviceName: (name: string) => void;
    currentEmployeeName: string;
    setCurrentEmployeeName: (name: string) => void;
    showEmployeeModal: boolean;
    setShowEmployeeModal: (show: boolean) => void;
    handleEmployeeConfirm: (name: string) => Promise<void>;
    requestPrint: (callback: (employeeName: string) => Promise<void>) => void;
}

const GeneralSettingsContext = createContext<GeneralSettingsContextType | undefined>(undefined);

const translations: Record<Language, Record<string, string>> = {
    en: enTranslations as any,
    ta: taTranslations as any
};

export const GeneralSettingsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [theme, setTheme] = useState<ThemeMode>('light');
    const [language, setLanguageState] = useState<Language>('en');
    const [shopDetails, setShopDetails] = useState({
        name: 'GOLD ESTIMATION',
        address: '',
        phone: '',
        gstNumber: '',
        email: '',
        footerMessage: 'Thank You! Visit Again.',
    });

    const [connectedPrinter, setConnectedPrinter] = useState<ConnectedPrinter | null>(null);
    const [printerType, setPrinterTypeState] = useState<PrinterType>('system');

    const [adminPin, setAdminPin] = useState('1234');

    const [isPrinterConnected, setIsPrinterConnected] = useState(false);
    const [isBluetoothEnabled, setIsBluetoothEnabled] = useState(true);
    const [deviceName, setDeviceNameState] = useState<string>('');
    const [currentEmployeeName, setCurrentEmployeeName] = useState<string>('');
    const [showEmployeeModal, setShowEmployeeModal] = useState(false);
    const printCallbackRef = useRef<((employeeName: string) => Promise<void>) | null>(null);

    const requestPrint = (callback: (employeeName: string) => Promise<void>) => {
        printCallbackRef.current = callback;
        setShowEmployeeModal(true);
    };

    const handleEmployeeConfirm = async (name: string) => {
        setCurrentEmployeeName(name);
        setShowEmployeeModal(false);
        if (printCallbackRef.current) {
            await printCallbackRef.current(name);
            printCallbackRef.current = null;
        }
    };

    useEffect(() => {
        // Load settings from DB on mount
        const loadSettings = async () => {
            try {
                // Load shop details
                const savedShopDetails = await Promise.all([
                    getSetting('shop_name'),
                    getSetting('shop_address'),
                    getSetting('shop_phone'),
                    getSetting('shop_gst'),
                    getSetting('shop_email'),
                    getSetting('shop_footer')
                ]);

                if (savedShopDetails[0]) setShopDetails(prev => ({ ...prev, name: savedShopDetails[0]! }));
                if (savedShopDetails[1]) setShopDetails(prev => ({ ...prev, address: savedShopDetails[1]! }));
                if (savedShopDetails[2]) setShopDetails(prev => ({ ...prev, phone: savedShopDetails[2]! }));
                if (savedShopDetails[3]) setShopDetails(prev => ({ ...prev, gstNumber: savedShopDetails[3]! }));
                if (savedShopDetails[4]) setShopDetails(prev => ({ ...prev, email: savedShopDetails[4]! }));
                if (savedShopDetails[5]) setShopDetails(prev => ({ ...prev, footerMessage: savedShopDetails[5]! }));

                // Load Admin PIN
                const savedPin = await getSetting('admin_pin');
                if (savedPin) setAdminPin(savedPin);

                // Load Theme/Language if saved
                const savedTheme = await getSetting('app_theme');
                if (savedTheme) setTheme(savedTheme as ThemeMode);

                const savedLang = await getSetting('app_language');
                if (savedLang) setLanguageState(savedLang as Language);

                // Load Connected Printer
                const savedPrinter = await getSetting('connected_printer');
                if (savedPrinter) {
                    try {
                        setConnectedPrinter(JSON.parse(savedPrinter));
                    } catch (e) {
                        console.error("Failed to parse saved printer", e);
                    }
                }

                // Load Printer Type
                const savedPrinterType = await getSetting('printer_type');
                if (savedPrinterType) setPrinterTypeState(savedPrinterType as PrinterType);

                // Load Device Name
                const savedDeviceName = await getSetting('device_name');
                if (savedDeviceName && !savedDeviceName.startsWith('Device-')) {
                    setDeviceNameState(savedDeviceName);
                } else {
                    let hardwareId = '';
                    try {
                        // More robust check: only require if we suspect the native module is actually there
                        // or just catch the error more gracefully. 
                        // The 'ExpoApplication' module name is standard for this package.
                        const isModuleAvailable = NativeModules.ExpoApplication ||
                            (global as any).ExpoModules?.ExpoApplication;

                        if (isModuleAvailable) {
                            const Application = require('expo-application');
                            if (Application) {
                                if (Platform.OS === 'android' && Application.getAndroidId) {
                                    hardwareId = Application.getAndroidId();
                                } else if (Platform.OS === 'ios' && Application.getIosIdForVendorAsync) {
                                    hardwareId = await Application.getIosIdForVendorAsync() || '';
                                }
                            }
                        }
                    } catch (e: any) {
                        // Silent catch - we already have fallbacks below
                    }

                    if (hardwareId) {
                        setDeviceNameState(hardwareId);
                        await setSetting('device_name', hardwareId);
                    } else if (savedDeviceName) {
                        setDeviceNameState(savedDeviceName);
                    } else {
                        const randomId = Math.random().toString(36).substring(7).toUpperCase();
                        const defaultName = `Device-${randomId}`;
                        setDeviceNameState(defaultName);
                        await setSetting('device_name', defaultName);
                    }
                }

            } catch (e) {
                console.error("Failed to load settings", e);
            }
        }
        loadSettings();
    }, []);

    const updateShopDetails = async (details: Partial<typeof shopDetails>) => {
        setShopDetails(prev => ({ ...prev, ...details }));
        // Save individually to DB
        if (details.name) await setSetting('shop_name', details.name);
        if (details.address) await setSetting('shop_address', details.address);
        if (details.phone) await setSetting('shop_phone', details.phone);
        if (details.gstNumber) await setSetting('shop_gst', details.gstNumber);
        if (details.email) await setSetting('shop_email', details.email);
        if (details.footerMessage) await setSetting('shop_footer', details.footerMessage);
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
    };

    const updateDeviceName = async (name: string) => {
        setDeviceNameState(name);
        await setSetting('device_name', name);
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
                if (printer) {
                    await setSetting('connected_printer', JSON.stringify(printer));
                } else {
                    // We don't have a specific removeSetting but setSetting with empty or null might work 
                    // or we just set it to empty string/null string
                    await setSetting('connected_printer', '');
                }
            },
            shopDetails,
            updateShopDetails,
            t,
            adminPin,
            updateAdminPin,
            isPrinterConnected,
            setIsPrinterConnected,
            isBluetoothEnabled,
            setIsBluetoothEnabled,
            deviceName,
            updateDeviceName,
            currentEmployeeName,
            setCurrentEmployeeName,
            showEmployeeModal,
            setShowEmployeeModal,
            handleEmployeeConfirm,
            requestPrint
        }}>
            {children}
        </GeneralSettingsContext.Provider>
    );
};

export const useGeneralSettings = () => {
    const context = useContext(GeneralSettingsContext);
    if (context === undefined) {
        throw new Error('useGeneralSettings must be used within a GeneralSettingsProvider');
    }
    return context;
};
