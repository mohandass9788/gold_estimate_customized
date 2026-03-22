import axios from 'axios';
import * as SecureStore from 'expo-secure-store';
import { getSetting } from './dbService';

import { BASE_URL } from '../constants/config';
const AUTH_TOKEN_KEY = 'auth_token';

const apiClient = axios.create({
    baseURL: BASE_URL,
    timeout: 10000,
    headers: {
        'Content-Type': 'application/json',
    },
});

// Interceptor for adding auth token (if needed in future)
apiClient.interceptors.request.use(
    async (config) => {
        const [serverApiUrl, localServerUrl, useLocalServer, token] = await Promise.all([
            getSetting('server_api_url'),
            getSetting('local_server_url'),
            getSetting('use_local_server_scanning'),
            SecureStore.getItemAsync(AUTH_TOKEN_KEY),
        ]);

        if (serverApiUrl) {
            config.baseURL = serverApiUrl;
        } else {
            config.baseURL = BASE_URL;
        }

        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }

        return config;
    },
    (error) => {
        return Promise.reject(error);
    }
);

// Registry for global 401/403 handling
let onUnauthorized: ((error: any) => void) | null = null;

export const setUnauthorizedHandler = (handler: (error: any) => void) => {
    onUnauthorized = handler;
};

// Response interceptor for global error handling
apiClient.interceptors.response.use(
    (response) => response,
    (error) => {
        if (error?.response?.status === 401 || error?.response?.status === 403) {
            if (onUnauthorized) {
                onUnauthorized(error);
            }
        }
        return Promise.reject(error);
    }
);

export default apiClient;
