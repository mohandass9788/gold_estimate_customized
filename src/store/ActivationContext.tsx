import React, { createContext, useContext, useState, useEffect } from 'react';
import { getActivationStatus, saveActivationStatus, validateActivationKey } from '../services/activationService';

interface ActivationContextType {
    isActivated: boolean;
    isCheckingActivation: boolean;
    activate: (key: string) => Promise<boolean>;
}

const ActivationContext = createContext<ActivationContextType | undefined>(undefined);

export const ActivationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [isActivated, setIsActivated] = useState<boolean>(false);
    const [isCheckingActivation, setIsCheckingActivation] = useState<boolean>(true);

    useEffect(() => {
        const checkStatus = async () => {
            try {
                const status = await getActivationStatus();
                setIsActivated(status);
            } catch (error) {
                console.error('Error checking activation status:', error);
            } finally {
                setIsCheckingActivation(false);
            }
        };
        checkStatus();
    }, []);

    const activate = async (key: string): Promise<boolean> => {
        if (validateActivationKey(key)) {
            await saveActivationStatus();
            setIsActivated(true);

            // Auto trigger activation report with device details
            try {
                // We need deviceName from GeneralSettingsContext, but we don't have it here directly
                // For now, we use a placeholder or get it from SecureStore if available
                // Actually, ActivationProvider is probably outside GeneralSettingsProvider
                const { getSetting } = await import('../services/dbService');
                const deviceName = await getSetting('deviceName') || 'Unknown Device';
                const { reportActivation } = await import('../services/activationReportService');
                await reportActivation(deviceName);
            } catch (e) {
                console.error('Failed to report activation:', e);
            }

            return true;
        }
        return false;
    };

    return (
        <ActivationContext.Provider value={{ isActivated, isCheckingActivation, activate }}>
            {children}
        </ActivationContext.Provider>
    );
};

export const useActivation = () => {
    const context = useContext(ActivationContext);
    if (context === undefined) {
        throw new Error('useActivation must be used within an ActivationProvider');
    }
    return context;
};
