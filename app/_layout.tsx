import { Stack } from 'expo-router';
import { NativeModules } from 'react-native';

// Silence NativeEventEmitter warnings from react-native-thermal-receipt-printer
const patchPrinterModules = () => {
    const modules = ['RNBLEPrinter', 'RNUSBPrinter', 'RNNetPrinter'];
    modules.forEach(name => {
        const m = NativeModules[name];
        if (m) {
            if (!m.addListener) m.addListener = () => { };
            if (!m.removeListeners) m.removeListeners = () => { };
        }
    });
};
patchPrinterModules();
import { AuthProvider } from '../src/store/AuthContext';
import { EstimationProvider } from '../src/store/EstimationContext';
import { GeneralSettingsProvider } from '../src/store/GeneralSettingsContext';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import React, { useState } from 'react';
import CustomSplashScreen from '../src/components/CustomSplashScreen';

export default function RootLayout() {
    const [showSplash, setShowSplash] = useState(true);

    return (
        <SafeAreaProvider>
            <GeneralSettingsProvider>
                <AuthProvider>
                    <EstimationProvider>
                        {showSplash ? (
                            <CustomSplashScreen onFinish={() => setShowSplash(false)} />
                        ) : (
                            <Stack screenOptions={{ headerShown: false }} />
                        )}
                    </EstimationProvider>
                </AuthProvider>
            </GeneralSettingsProvider>
        </SafeAreaProvider>
    );
}
