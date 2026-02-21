import React, { createContext, useState, useEffect, useContext } from 'react';
import * as LocalAuthentication from 'expo-local-authentication';
import { Alert } from 'react-native';
import { validateUser } from '../services/dbService';

interface AuthContextType {
    isAuthenticated: boolean;
    login: (username?: string, password?: string) => Promise<boolean>;
    logout: () => void;
    biometricLogin: () => Promise<void>;
    isBiometricSupported: boolean;
}

const AuthContext = createContext<AuthContextType>({} as AuthContextType);

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [isBiometricSupported, setIsBiometricSupported] = useState(false);


    // Check biometric hardware support on mount
    useEffect(() => {
        (async () => {
            try {
                const compatible = await LocalAuthentication.hasHardwareAsync();
                const enrolled = await LocalAuthentication.isEnrolledAsync();
                setIsBiometricSupported(compatible && enrolled);
            } catch {
                console.log('Biometric check failed');
            }
        })();
    }, []);

    const login = async (username?: string, password?: string): Promise<boolean> => {
        try {
            if (!username || !password) return false;

            // Validate against DB
            const isValid = await validateUser(username, password);
            if (isValid) {
                setIsAuthenticated(true);
                return true;
            }
            return false;
        } catch (e) {
            console.error('Login error:', e);
            return false;
        }
    };

    const biometricLogin = async () => {
        if (!isBiometricSupported) {
            Alert.alert('Not Supported', 'Biometric authentication is not available or enrolled on this device.');
            return;
        }

        try {
            const result = await LocalAuthentication.authenticateAsync({
                promptMessage: 'Authenticate to access Gold Estimation App',
                fallbackLabel: 'Use Passcode',
            });

            if (result.success) {
                setIsAuthenticated(true);
            } else {
                // Alert.alert('Authentication Failed', 'Could not authenticate.');
            }
        } catch {
            console.error('Authentication error');
            Alert.alert('Error', 'An error occurred during authentication.');
        }
    };

    const logout = () => {
        setIsAuthenticated(false);
    };

    return (
        <AuthContext.Provider
            value={{
                isAuthenticated,
                login,
                logout,
                biometricLogin,
                isBiometricSupported,
            }}
        >
            {children}
        </AuthContext.Provider>
    );
};
