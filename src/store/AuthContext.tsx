import React, { createContext, useState, useEffect, useContext, useCallback, useMemo } from 'react';
import * as LocalAuthentication from 'expo-local-authentication';
import * as SecureStore from 'expo-secure-store';
import { AppState } from 'react-native';
import { clearAuthStorage, fetchProfile, getAuthToken, type AuthUser, loginUser, checkAuthStatus, logoutUser, verifySession } from '../services/authService';
import { registerForPushNotificationsAsync } from '../services/notificationService';
import { useGeneralSettings } from './GeneralSettingsContext';
import { setUnauthorizedHandler } from '../services/apiClient';
import { useRouter } from 'expo-router';
import { cloudBackup } from '../services/cloudBackupService';

interface AuthContextType {
    isAuthenticated: boolean;
    login: (phone?: string, password?: string) => Promise<boolean>;
    logout: () => Promise<void>;
    biometricLogin: () => Promise<void>;
    isBiometricSupported: boolean;
    isBiometricEnabled: boolean;
    setIsBiometricEnabled: (enabled: boolean) => Promise<void>;
    isSuperAdmin: boolean;
    completeLogin: () => void;
    validateCredentialsOnly: (phone?: string, password?: string) => Promise<boolean>;
    hasMPin: boolean;
    setHasMPin: (value: boolean) => void;
    currentUser: AuthUser | null;
    refreshProfile: () => Promise<void>;
    validateSubscription: () => boolean;
    isMpinRequired: boolean;
    setIsMpinRequired: (value: boolean) => void;
    verifyMpin: (pin: string) => Promise<boolean>;
}

const AuthContext = createContext<AuthContextType>({} as AuthContextType);

export const useAuth = () => useContext(AuthContext);

const hasSuperAdminAccess = (profile: AuthUser | null, phone?: string) => {
    const role = String(profile?.role || profile?.user_type || profile?.account_type || '').toLowerCase();
    return role === 'super_admin' || role === 'admin' || phone === 'sys_admin';
};

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [isBiometricSupported, setIsBiometricSupported] = useState(false);
    const [isBiometricEnabled, setIsBiometricEnabled] = useState(false);
    const [isSuperAdmin, setIsSuperAdmin] = useState(false);
    const [hasMPin, setHasMPin] = useState(false);
    const [currentUser, setCurrentUser] = useState<AuthUser | null>(null);
    const [isMpinRequired, setIsMpinRequired] = useState(false);
    const router = useRouter();

    const { updateFeatureFlags, showAlert, t } = useGeneralSettings();

    // Helper to merge subscription and user data into currentUser and persist
    const updateUserWithStatus = useCallback((res: any) => {
        const user = res?.user || res?.data?.user || (res?.phone ? res : null);
        const subscriptionUpdate = {
            isSubscriptionValid: res?.isSubscriptionValid,
            is_trial: res?.is_trial,
            status: res?.status,
            subscription_valid_upto: res?.subscription_valid_upto,
        };
        
        setCurrentUser(prev => {
            const updated = { ...prev, ...subscriptionUpdate, ...(user || {}) };
            SecureStore.setItemAsync('auth_user', JSON.stringify(updated)).catch(() => {});
            return updated as any;
        });

        const features = res?.features || res?.user?.features || res?.data?.features || res;
        if (features) {
            updateFeatureFlags({
                isChitEnabled: !!(features.chit || features.feature_chit),
                isPurchaseEnabled: !!(features.purchase || features.feature_purchase),
                isEstimationEnabled: !!(features.estimation || features.feature_estimation),
                isAdvanceEnabled: !!(features.advance_chit || features.feature_advance_chit),
                isRepairEnabled: !!(features.repair || features.feature_repair),
            });
        }
    }, [updateFeatureFlags]);

    const logout = useCallback(async () => {
        try {
            await logoutUser();
        } catch (e) {
            console.log('Logout API call failed, proceeding with local cleanup');
        }
        await SecureStore.deleteItemAsync('user_mpin');
        cloudBackup.logout();
        setIsAuthenticated(false);
        setHasMPin(false);
        setCurrentUser(null);
        setIsSuperAdmin(false);
        router.replace('/login');
    }, [router]);

    // Check biometric hardware support and existing mPIN on mount
    useEffect(() => {
        (async () => {
            try {
                const compatible = await LocalAuthentication.hasHardwareAsync();
                const enrolled = await LocalAuthentication.isEnrolledAsync();
                setIsBiometricSupported(compatible && enrolled);

                const storedPin = await SecureStore.getItemAsync('user_mpin');
                if (storedPin) {
                    setHasMPin(true);
                }

                const biometricEnabled = await SecureStore.getItemAsync('isBiometricEnabled');
                setIsBiometricEnabled(biometricEnabled === 'true');

                const token = await getAuthToken();
                if (token) {
                    const isValid = await verifySession();
                    if (!isValid) {
                        await logout();
                        return;
                    }
                    const profile = await fetchProfile();
                    setCurrentUser(profile);
                    setIsSuperAdmin(hasSuperAdminAccess(profile, profile?.username));
                    setIsAuthenticated(true);
                    
                    // If user has mPIN, set requirement to true on launch
                    if (storedPin) {
                        setIsMpinRequired(true);
                    }
                    
                    // Also refresh status on mount if token exists
                    checkAuthStatus().then(updateUserWithStatus).catch(() => {});
                }
            } catch {
                console.log('Biometric/SecureStore check failed');
            }
        })();
    }, [logout, updateUserWithStatus]);

    // Sync status and features on foreground
    useEffect(() => {
        const subscription = AppState.addEventListener('change', nextAppState => {
            if (nextAppState === 'active' && isAuthenticated) {
                checkAuthStatus().then(res => {
                    updateUserWithStatus(res);
                }).catch(e => {
                    const isExpired = e.message?.includes('expired');
                    const title = isExpired ? t('session_expired_title') : 'Access Denied';
                    if (e?.message?.includes('Account deactivated') || isExpired) {
                        showAlert(title, e.message, 'error', [{ text: t('ok'), onPress: logout }]);
                    }
                });
            }
        });
        return () => subscription.remove();
    }, [isAuthenticated, updateUserWithStatus, showAlert, t, logout]);

    const validateCredentialsOnly = useCallback(async (phone?: string, password?: string): Promise<boolean> => {
        try {
            if (!phone || !password) return false;
            
            // Fetch push token before login for unified integration
            const pushToken = await registerForPushNotificationsAsync();

            const loginRes = await loginUser({ phone, password, push_token: pushToken });
            if (!loginRes) return false;

            const profile = await fetchProfile();
            setCurrentUser(profile);
            setIsSuperAdmin(hasSuperAdminAccess(profile, profile?.username));

            try {
                const statusRes = await checkAuthStatus();
                updateUserWithStatus(statusRes);
            } catch (e) { /* ignore on init */ }

            return true;
        } catch (e: any) {
            if (e?.message?.includes('deactivated')) {
                showAlert('Access Denied', 'Account deactivated. Please contact admin.', 'error');
            }
            return false;
        }
    }, [updateUserWithStatus, showAlert]);

    const login = useCallback(async (phone?: string, password?: string): Promise<boolean> => {
        const isValid = await validateCredentialsOnly(phone, password);
        if (isValid) {
            setIsMpinRequired(false);
            setIsAuthenticated(true);
            return true;
        }
        return false;
    }, [validateCredentialsOnly]);

    const handleSetBiometricEnabled = async (enabled: boolean) => {
        await SecureStore.setItemAsync('isBiometricEnabled', enabled ? 'true' : 'false');
        setIsBiometricEnabled(enabled);
    };

    const completeLogin = useCallback(() => {
        setIsMpinRequired(false);
        setIsAuthenticated(true);
    }, []);

    const biometricLogin = useCallback(async () => {
        if (!isBiometricSupported) {
            showAlert('Not Supported', 'Biometric authentication is not available or enrolled on this device.', 'warning');
            return;
        }

        const mpin = await SecureStore.getItemAsync('user_mpin');
        if (!mpin) {
            showAlert('mPIN Not Set', 'Please login with password first to enable biometric access.', 'info');
            return;
        }

        try {
            const result = await LocalAuthentication.authenticateAsync({
                promptMessage: 'Authenticate to Login',
                fallbackLabel: 'Use Passcode',
            });

            if (result.success) {
                fetchProfile().then(profile => {
                    setCurrentUser(profile);
                    setIsSuperAdmin(hasSuperAdminAccess(profile, profile?.username));
                }).catch(() => { });

                setIsMpinRequired(false);
                setIsAuthenticated(true);
            }
        } catch (error) {
            showAlert('Error', 'An error occurred during authentication.', 'error');
        }
    }, [isBiometricSupported, showAlert]);

    const verifyMpin = useCallback(async (pin: string): Promise<boolean> => {
        const storedPin = await SecureStore.getItemAsync('user_mpin');
        if (storedPin === pin) {
            setIsMpinRequired(false);
            return true;
        }
        return false;
    }, []);

    const refreshProfile = useCallback(async () => {
        try {
            const res = await checkAuthStatus();
            updateUserWithStatus(res);
        } catch (e: any) {
            const isExpired = e.message?.includes('expired');
            const title = isExpired ? t('session_expired_title') : 'Access Denied';
            if (e.message?.includes('Account deactivated') || isExpired) {
                showAlert(title, e.message, 'error', [{ text: t('ok'), onPress: logout }]);
            }
        }
    }, [updateUserWithStatus, showAlert, logout, t]);

    useEffect(() => {
        setUnauthorizedHandler((error) => {
            const message = error?.response?.data?.message || error?.response?.data?.error || error?.message || 'Access Denied';
            const isExpired = message.toLowerCase().includes('expired') || message.toLowerCase().includes('logged_out');
            const title = isExpired ? t('session_expired_title') : 'Access Denied';
            
            if (isAuthenticated) {
                showAlert(title, message, 'error', [{ text: t('ok'), onPress: logout }]);
            }
        });
        return () => setUnauthorizedHandler(() => {});
    }, [isAuthenticated, logout, showAlert, t]);

    const validateSubscription = useCallback(() => {
        if (!currentUser) return false;
        if (isSuperAdmin) return true;
        if (currentUser.isSubscriptionValid) return true;

        const title = t('subscription_required') || 'Subscription Required';
        const message = currentUser.is_trial 
            ? t('subscription_demo_expired_msg') || 'Your demo/trial period has ended. Please subscribe to continue using the printing service.'
            : t('subscription_expired_print_msg') || 'Your subscription has expired or is not active. Please subscribe to continue printing receipts.';

        showAlert(title, message, 'warning', [
            { text: t('cancel') || 'Cancel', style: 'cancel' },
            { 
                text: t('upgrade_now') || 'Upgrade Now', 
                onPress: () => router.push('/help' as any)
            }
        ]);

        return false;
    }, [currentUser, isSuperAdmin, t, showAlert, router]);

    const contextValue = useMemo(() => ({
        isAuthenticated,
        login,
        logout,
        biometricLogin,
        isBiometricSupported,
        isBiometricEnabled,
        setIsBiometricEnabled: handleSetBiometricEnabled,
        isSuperAdmin,
        completeLogin,
        validateCredentialsOnly,
        hasMPin,
        setHasMPin,
        currentUser,
        refreshProfile,
        validateSubscription,
        isMpinRequired,
        setIsMpinRequired,
        verifyMpin,
    }), [
        isAuthenticated, login, logout, biometricLogin, isBiometricSupported, isBiometricEnabled,
        isSuperAdmin, completeLogin, validateCredentialsOnly, hasMPin, currentUser, refreshProfile, validateSubscription,
        isMpinRequired, verifyMpin
    ]);

    return (
        <AuthContext.Provider value={contextValue}>
            {children}
        </AuthContext.Provider>
    );
};
