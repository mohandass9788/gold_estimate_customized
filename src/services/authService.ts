import * as SecureStore from 'expo-secure-store';
import * as Application from 'expo-application';
import * as Device from 'expo-device';
import apiClient from './apiClient';
import { getSetting } from './dbService';

const AUTH_TOKEN_KEY = 'auth_token';
const AUTH_USER_KEY = 'auth_user';

export interface LoginPayload {
    phone: string;
    password: string;
    push_token?: string; // [NEW] Optional push token for unified login
}

export interface RegisterPayload {
    phone: string;
    password: string;
    name: string;
    shop_name: string;
}

export interface AuthUser {
    id?: string;
    username?: string;
    name?: string;
    email?: string;
    phone?: string;
    shop_name?: string;
    role?: string;
    status?: string | 'active' | 'inactive';
    is_active?: boolean;
    is_trial?: boolean;
    subscription_valid_upto?: string;
    isSubscriptionValid?: boolean;
    // Feature flags can be flat or nested
    feature_chit?: boolean;
    feature_purchase?: boolean;
    feature_estimation?: boolean;
    feature_advance_chit?: boolean;
    feature_repair?: boolean;
    features?: {
        chit?: boolean;
        purchase?: boolean;
        estimation?: boolean;
        advance_chit?: boolean;
        repair?: boolean;
    };
    [key: string]: any;
}

const getStoredDeviceName = async (): Promise<string> => {
    const storedName = await getSetting('device_name');
    if (storedName) return storedName;

    const fallback = Device.deviceName?.trim();
    return fallback || 'Mobile Device';
};

const getStoredDeviceId = async (): Promise<string> => {
    const storedId = await getSetting('custom_device_id');
    if (storedId) return storedId;

    if ((Application as any).androidId) return (Application as any).androidId;

    try {
        const iosId = await Application.getIosIdForVendorAsync();
        if (iosId) return iosId;
    } catch {
        // Ignore and use final fallback below.
    }

    return Device.osInternalBuildId || `${Device.brand || 'device'}-${Device.modelName || 'unknown'}`;
};

const maskSensitivePayload = (payload: Record<string, any>) => ({
    ...payload,
    password: payload.password ? '***' : payload.password,
});

const extractToken = (data: any): string | null => {
    if (!data) return null;

    return data.token
        || data.jwt
        || data.accessToken
        || data.access_token
        || data?.data?.token
        || data?.data?.jwt
        || data?.data?.accessToken
        || data?.data?.access_token
        || null;
};

const extractMessage = (error: any, fallback: string): string => {
    return error?.response?.data?.message
        || error?.response?.data?.error
        || error?.message
        || fallback;
};

export const saveAuthToken = async (token: string) => {
    await SecureStore.setItemAsync(AUTH_TOKEN_KEY, token);
};

export const getAuthToken = async (): Promise<string | null> => {
    return SecureStore.getItemAsync(AUTH_TOKEN_KEY);
};

export const getStoredAuthUser = async (): Promise<AuthUser | null> => {
    const raw = await SecureStore.getItemAsync(AUTH_USER_KEY);
    if (!raw) return null;

    try {
        const parsed = JSON.parse(raw);
        return parsed?.user || parsed?.data?.user || parsed?.data || parsed;
    } catch {
        return null;
    }
};

export const clearAuthStorage = async () => {
    await Promise.all([
        SecureStore.deleteItemAsync(AUTH_TOKEN_KEY),
        SecureStore.deleteItemAsync(AUTH_USER_KEY),
    ]);
};

export const fetchProfile = async (): Promise<AuthUser | null> => {
    try {
        console.log('[auth] GET /api/auth/profile');
        const response = await apiClient.get('/api/auth/profile');
        console.log('[auth] profile response:', response.status, response.data);
        const profile = response.data?.user || response.data?.data?.user || response.data?.data || response.data;
        
        if (profile) {
            await SecureStore.setItemAsync(AUTH_USER_KEY, JSON.stringify(profile));
        }
        return profile;
    } catch (error: any) {
        console.log('[auth] profile request failed:', {
            message: error?.message,
            status: error?.response?.status,
            data: error?.response?.data,
        });
        return getStoredAuthUser();
    }
};

export const updateProfile = async (payload: { name?: string; shop_name?: string }): Promise<AuthUser> => {
    try {
        console.log('[auth] PUT /api/auth/profile payload:', payload);
        const response = await apiClient.put('/api/auth/profile', payload);
        const updatedUser = response.data?.user || response.data?.data?.user || response.data?.data || response.data;
        await SecureStore.setItemAsync(AUTH_USER_KEY, JSON.stringify(updatedUser));
        return updatedUser;
    } catch (error: any) {
        throw new Error(extractMessage(error, 'Failed to update profile'));
    }
};

export const verifySession = async (): Promise<boolean> => {
    try {
        console.log('[auth] GET /api/auth/verify-session');
        const response = await apiClient.get('/api/auth/verify-session');
        return response.status === 200;
    } catch {
        return false;
    }
};

export const logoutUser = async () => {
    try {
        console.log('[auth] POST /api/auth/logout');
        await apiClient.post('/api/auth/logout');
    } catch (error) {
        console.log('[auth] logout request failed (optional cleanup):', error);
    } finally {
        await clearAuthStorage();
    }
};

export const loginUser = async ({ phone, password, push_token }: LoginPayload) => {
    try {
        const [deviceId, deviceName] = await Promise.all([
            getStoredDeviceId(),
            getStoredDeviceName(),
        ]);

        const payload = {
            phone,
            password,
            device_id: deviceId,
            device_name: deviceName,
            push_token, // [NEW] Pass the push token directly
        };

        console.log('[auth] POST /api/auth/login payload:', maskSensitivePayload(payload));

        const response = await apiClient.post('/api/auth/login', payload);
        console.log('[auth] login response:', response.status, response.data);

        const token = extractToken(response.data);
        if (!token) {
            throw new Error('Login succeeded but no token was returned by the server.');
        }

        if (response.data?.user?.features) {
            // Can optionally store features or we let the context handle it
        }

        await Promise.all([
            saveAuthToken(token),
            SecureStore.setItemAsync(AUTH_USER_KEY, JSON.stringify(response.data)),
        ]);

        return response.data;
    } catch (error: any) {
        console.log('[auth] login request failed:', {
            message: error?.message,
            status: error?.response?.status,
            data: error?.response?.data,
        });
        throw new Error(extractMessage(error, 'Login failed'));
    }
};

export const registerUser = async (payload: RegisterPayload) => {
    try {
        console.log('[auth] POST /api/auth/register payload:', maskSensitivePayload(payload));
        const response = await apiClient.post('/api/auth/register', payload);
        console.log('[auth] register response:', response.status, response.data);
        return response.data;
    } catch (error: any) {
        console.log('[auth] register request failed:', {
            message: error?.message,
            status: error?.response?.status,
            data: error?.response?.data,
        });
        throw new Error(extractMessage(error, 'Registration failed'));
    }
};

export const checkAuthStatus = async () => {
    try {
        console.log('[auth] GET /api/auth/status');
        const response = await apiClient.get('/api/auth/status');
        console.log('[auth] status response:', response.status, response.data);
        return response.data;
    } catch (error: any) {
        console.log('[auth] status request failed:', {
            message: error?.message,
            status: error?.response?.status,
            data: error?.response?.data,
        });
        if (error?.response?.status === 403 || error?.response?.status === 401) {
             throw new Error(extractMessage(error, 'Account deactivated or unauthorized'));
        }
        throw new Error(extractMessage(error, 'Status check failed'));
    }
};

export const requestCall = async (payload: { name: string; phone: string; source: string }) => {
    try {
        console.log('[auth] POST /api/public/request-call payload:', payload);
        const response = await apiClient.post('/api/public/request-call', payload);
        return response.data;
    } catch (error: any) {
        throw new Error(extractMessage(error, 'Failed to submit call request'));
    }
};

/**
 * Syncs the latest Expo push token with the backend.
 * Path: /api/sync/device-token
 */
export const updateDeviceToken = async (pushToken: string) => {
    try {
        console.log('[auth] POST /api/sync/device-token token:', pushToken);
        const response = await apiClient.post('/api/sync/device-token', { pushToken });
        return response.data;
    } catch (error: any) {
        console.warn('[auth] Failed to sync device token:', error?.message);
        throw error;
    }
};

