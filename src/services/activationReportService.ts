import * as Device from 'expo-device';
import * as Application from 'expo-application';
import * as Constants from 'expo-constants';
import { Platform } from 'react-native';
import apiClient from './apiClient';

export interface DeviceDetails {
    deviceName: string;
    brand: string;
    modelName: string;
    osName: string;
    osVersion: string;
    applicationId: string;
    appVersion: string;
    buildNumber: string;
    deviceId: string;
}

export const getDeviceDetails = async (customDeviceName: string = ''): Promise<DeviceDetails> => {
    return {
        deviceName: customDeviceName || 'Unknown Device',
        brand: (Device as any).brand || '',
        modelName: (Device as any).modelName || '',
        osName: (Device as any).osName || Platform.OS,
        osVersion: (Device as any).osVersion || Platform.Version.toString(),
        applicationId: Application.applicationId || '',
        appVersion: Application.nativeApplicationVersion || '',
        buildNumber: Application.nativeBuildVersion || '',
        deviceId: customDeviceName // Using the unified ID as requested earlier
    };
};

export const reportActivation = async (customDeviceName: string): Promise<boolean> => {
    try {
        const details = await getDeviceDetails(customDeviceName);

        // Reporting via API as "auto trigger"
        // If they want email, we could try to send a body to an API that sends the mail
        const response = await apiClient.post('/report/activation', {
            ...details,
            reportedAt: new Date().toISOString(),
            targetEmail: 'nexooai@gmail.com'
        });

        return response.status === 200 || response.status === 201;
    } catch (error) {
        console.error('Activation reporting error:', error);
        // We don't want to block the user if reporting fails, but we log it
        return false;
    }
};
