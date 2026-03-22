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
import { ActivationProvider } from '../src/store/ActivationContext';
import { TutorialProvider } from '../src/store/TutorialContext';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import React, { useState, useEffect, useRef } from 'react';
import CustomSplashScreen from '../src/components/CustomSplashScreen';
import { FloatingVideoPopup } from '../src/components/FloatingVideoPopup';
import { registerForPushNotificationsAsync } from '../src/services/notificationService';

// Safely require expo-notifications
let Notifications: any;
try {
    Notifications = require('expo-notifications');
} catch (e) {
    console.warn('Notifications not available in this environment');
}

export default function RootLayout() {
    const [showSplash, setShowSplash] = useState(true);
    const notificationListener = useRef<any>(undefined);
    const responseListener = useRef<any>(undefined);

    useEffect(() => {
        if (Notifications) {
            registerForPushNotificationsAsync();

            notificationListener.current = Notifications.addNotificationReceivedListener((notification: any) => {
                console.log('Notification Received:', notification);
            });

            responseListener.current = Notifications.addNotificationResponseReceivedListener((response: any) => {
                console.log('Notification Tapped:', response);
            });
        }

        return () => {
            if (notificationListener.current && notificationListener.current.remove) {
                notificationListener.current.remove();
            }
            if (responseListener.current && responseListener.current.remove) {
                responseListener.current.remove();
            }
        };
    }, []);

    return (
        <SafeAreaProvider>
            <GeneralSettingsProvider>
                <ActivationProvider>
                    <TutorialProvider>
                        <AuthProvider>
                            <EstimationProvider>
                                {showSplash ? (
                                    <CustomSplashScreen onFinish={() => setShowSplash(false)} />
                                ) : (
                                    <>
                                        <Stack screenOptions={{ headerShown: false }} />
                                        <FloatingVideoPopup />
                                    </>
                                )}
                            </EstimationProvider>
                        </AuthProvider>
                    </TutorialProvider>
                </ActivationProvider>
            </GeneralSettingsProvider>
        </SafeAreaProvider>
    );
}
