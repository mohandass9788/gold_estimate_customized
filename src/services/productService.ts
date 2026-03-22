import apiClient from './apiClient';
import axios from 'axios';
import { Product } from '../types';

import { BASE_URL as DEFAULT_API_BASE_URL } from '../constants/config';

const joinApiUrl = (baseUrl: string, path: string) => {
    const normalizedBase = baseUrl.replace(/\/+$/, '');
    const normalizedPath = path.replace(/^\/+/, '');
    return `${normalizedBase}/${normalizedPath}`;
};

export const getProductByTag = async (tagNumber: string, baseUrl?: string): Promise<Product> => {
    // Mock response for development if API is not available
    if (tagNumber === 'TAG001') {
        return {
            tagNumber: 'TAG001',
            name: 'Gold Ring 22k',
            pcs: 1,
            grossWeight: 5.5,
            stoneWeight: 0,
            netWeight: 5.5,
            purity: 22,
            makingCharge: 12,
            makingChargeType: 'percentage',
            wastage: 10,
            wastageType: 'percentage',
            category: 'Ring',
            rate: 0,
        };
    }

    try {
        if (baseUrl) {
            const response = await axios.get<Product>(joinApiUrl(baseUrl, `/api/product/tag/${tagNumber}`));
            return response.data;
        }
        const response = await apiClient.get<Product>(`/api/product/tag/${tagNumber}`);
        return response.data;
    } catch (error) {
        console.error('Error fetching product:', error);
        throw error;
    }
};

export const fetchTagDetailsFromApi = async (
    itemtag: string,
    employeename: string = 'ajithkumar',
    baseUrl?: string,
    useLocalServerConfig?: boolean,
    localServerUrl?: string,
    localQrEndpoint?: string
): Promise<Product> => {
    try {
        let url = '';
        if (useLocalServerConfig && localServerUrl && localQrEndpoint) {
            url = joinApiUrl(localServerUrl, localQrEndpoint);
        } else {
            url = joinApiUrl(baseUrl || DEFAULT_API_BASE_URL, '/api/product/scan-tag');
        }

        console.log("API URL:", url);
        const requestConfig = {
            timeout: 15000,
            headers: {
                'Content-Type': 'application/json',
            }
        };

        const response = (useLocalServerConfig && localServerUrl && localQrEndpoint)
            ? await axios.get<any>(joinApiUrl(url, itemtag), requestConfig)
            : await axios.post<any>(url, { itemtag, employeename }, requestConfig);

        const data = response.data;
        console.log("API Response Data:", data);

        const makingChargeAmount = parseFloat(data.MAXMCAMOUNT || '0');
        const makingChargeGram = parseFloat(data.MAXMCGR || '0');

        let makingCharge = 0;
        let makingChargeType: 'fixed' | 'perGram' | 'percentage' = 'fixed';

        if (makingChargeAmount > 0) {
            makingCharge = makingChargeAmount;
            makingChargeType = 'fixed';
        } else if (makingChargeGram > 0) {
            makingCharge = makingChargeGram;
            makingChargeType = 'perGram';
        }

        return {
            tagNumber: data.ITEMTAG || itemtag || '',
            name: data.PRODUCTNAME || 'Unknown Product',
            subProductName: data.SUBPRODUCTNAME || '',
            pcs: parseInt(data.NOOFPIECES || '1'),
            grossWeight: parseFloat(data.GRSWEIGHT || '0'),
            stoneWeight: parseFloat(data.LESSWT || '0'), 
            netWeight: parseFloat(data.NETWEIGHT || '0'),
            purity: 22, 
            makingCharge: makingCharge,
            makingChargeType: makingChargeType,
            wastage: parseFloat(data.MAXWASTAGEPER || '0'),
            wastageType: 'percentage', 
            category: data.METNAME || 'Gold',
            rate: parseFloat(data.RATE || '0'),
            metal: (data.METNAME && data.METNAME.toUpperCase() === 'SILVER') ? 'SILVER' : 'GOLD',
        };
    } catch (error: any) {
        console.error('Error fetching tag details:', error);
        throw error;
    }
};

export const uploadMultiTags = async (tags: string[], baseUrl?: string): Promise<Product[]> => {
    try {
        if (baseUrl) {
            const response = await axios.post<Product[]>(joinApiUrl(baseUrl, '/api/product/multi-tag'), { tags });
            return response.data;
        }
        const response = await apiClient.post<Product[]>('/product/multi-tag', { tags });
        return response.data;
    } catch (error) {
        console.error('Error fetching multi-tags:', error);
        throw error;
    }
};
