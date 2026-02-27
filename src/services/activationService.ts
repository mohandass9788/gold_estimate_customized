import * as SecureStore from 'expo-secure-store';
import { format } from 'date-fns';

const ACTIVATION_KEY_STORAGE = 'app_activation_data';

export interface ActivationData {
    isActivated: boolean;
    activatedAt: string;
    trustToken: string;
}

/**
 * Validates the activation key.
 * Expected format: Name_DDMMYYYY (e.g., Ajith_24022026)
 * The date in the key must match the current system date.
 */
export const validateActivationKey = (key: string): boolean => {
    try {
        if (!key || !key.includes('_')) return false;

        const [name, remainder] = key.split('_');
        if (!name || !remainder || remainder.length !== 12) return false; // Exactly 4 dummy char + 8 date chars

        // Requirement: First letter Capital, rest small
        const isCapitalized = /^[A-Z][a-z0-9]*$/.test(name);
        if (!isCapitalized) return false;

        const datePart = remainder.slice(-8);
        const todayStr = format(new Date(), 'yyyyMMdd');

        // Check if the date at the end matches today's date (YYYYMMDD)
        return datePart === todayStr;
    } catch (e) {
        console.error('Error validating activation key:', e);
        return false;
    }
};

/**
 * Persists the activation status.
 */
export const saveActivationStatus = async (): Promise<void> => {
    try {
        const data: ActivationData = {
            isActivated: true,
            activatedAt: new Date().toISOString(),
            trustToken: Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15)
        };
        await SecureStore.setItemAsync(ACTIVATION_KEY_STORAGE, JSON.stringify(data));
    } catch (e) {
        console.error('Error saving activation status:', e);
    }
};

/**
 * Retrieves the activation status.
 */
export const getActivationStatus = async (): Promise<boolean> => {
    try {
        const dataStr = await SecureStore.getItemAsync(ACTIVATION_KEY_STORAGE);
        if (!dataStr) return false;

        const data: ActivationData = JSON.parse(dataStr);
        return data.isActivated === true;
    } catch (e) {
        console.error('Error getting activation status:', e);
        return false;
    }
};

/**
 * Resets activation (for testing purposes).
 */
export const resetActivation = async (): Promise<void> => {
    try {
        await SecureStore.deleteItemAsync(ACTIVATION_KEY_STORAGE);
    } catch (e) {
        console.error('Error resetting activation:', e);
    }
};
