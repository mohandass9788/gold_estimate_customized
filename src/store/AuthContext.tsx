import React, { createContext, useState, useEffect, useContext } from 'react';
import * as LocalAuthentication from 'expo-local-authentication';
import * as SecureStore from 'expo-secure-store';
import { Alert } from 'react-native';
import { validateUser } from '../services/dbService';

interface AuthContextType {
    isAuthenticated: boolean;
    login: (username?: string, password?: string) => Promise<boolean>;
    logout: () => void;
    biometricLogin: () => Promise<void>;
    isBiometricSupported: boolean;
    isSuperAdmin: boolean;
    completeLogin: () => void;
    validateCredentialsOnly: (username?: string, password?: string) => Promise<boolean>;
    hasMPin: boolean;
    setHasMPin: (value: boolean) => void;
}

const AuthContext = createContext<AuthContextType>({} as AuthContextType);

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [isBiometricSupported, setIsBiometricSupported] = useState(false);
    const [isSuperAdmin, setIsSuperAdmin] = useState(false);
    const [hasMPin, setHasMPin] = useState(false);

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
            } catch {
                console.log('Biometric/SecureStore check failed');
            }
        })();
    }, []);

    // Validates credentials without setting isAuthenticated
    const validateCredentialsOnly = async (username?: string, password?: string): Promise<boolean> => {
        try {
            if (!username || !password) return false;

            // Validate against Super Admin Logic
            const today = new Date();
            const yyyy = today.getFullYear();
            const mm = String(today.getMonth() + 1).padStart(2, '0');
            const dd = String(today.getDate()).padStart(2, '0');
            const dynamicPassword = `${yyyy}${mm}${dd}`;

            if (username === 'sys_admin' && password === dynamicPassword) {
                setIsSuperAdmin(true);
                return true;
            }

            // Validate against DB
            const isValid = await validateUser(username, password);
            if (isValid) {
                setIsSuperAdmin(false);
                return true;
            }
            return false;
        } catch (e) {
            console.error('Validation error:', e);
            return false;
        }
    };

    // Original login method keeps its existing signature for backward compatibility,
    // but ideally we rely on validateCredentialsOnly -> completeLogin now
    const login = async (username?: string, password?: string): Promise<boolean> => {
        const isValid = await validateCredentialsOnly(username, password);
        if (isValid) {
            setIsAuthenticated(true);
            return true;
        }
        return false;
    };

    const completeLogin = () => {
        setIsAuthenticated(true);
    };

    const biometricLogin = async () => {
        if (!isBiometricSupported) {
            Alert.alert('Not Supported', 'Biometric authentication is not available or enrolled on this device.');
            return;
        }

        try {
            const result = await LocalAuthentication.authenticateAsync({
                promptMessage: 'Authenticate to access Estimation',
                fallbackLabel: 'Use Passcode',
            });

            if (result.success) {
                completeLogin();
            }
        } catch {
            console.error('Authentication error');
            Alert.alert('Error', 'An error occurred during authentication.');
        }
    };

    const logout = async () => {
        setIsAuthenticated(false);
        // We do NOT clear mPIN here on regular logout (so they can log back in with PIN).
        // If they want to "Switch User", that logic clears the PIN from SecureStore explicitly in LoginScreen.
    };

    return (
        <AuthContext.Provider
            value={{
                isAuthenticated,
                login,
                logout,
                biometricLogin,
                isBiometricSupported,
                isSuperAdmin,
                completeLogin,
                validateCredentialsOnly,
                hasMPin,
                setHasMPin
            }}
        >
            {children}
        </AuthContext.Provider>
    );
};
