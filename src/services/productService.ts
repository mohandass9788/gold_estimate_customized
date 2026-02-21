import apiClient from './apiClient';
import axios from 'axios';
import { Product } from '../types';

export const getProductByTag = async (tagNumber: string): Promise<Product> => {
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
        const response = await apiClient.get<Product>(`/product/tag/${tagNumber}`);
        return response.data;
    } catch (error) {
        console.error('Error fetching product:', error);
        throw error;
    }
};

export const fetchTagDetailsFromApi = async (itemtag: string, employeename: string = 'ajithkumar'): Promise<Product> => {
    try {
        const response = await axios.post<any>('https://school.agnisofterp.com/maha/agni/tag/details', {
            itemtag,
            employeename
        }, {
            timeout: 15000,
            headers: {
                'Content-Type': 'application/json',
            }
        });

        const data = response.data;
        console.log("API Response Data:", data);

        // Map API response to Product type
        // API returns keys like ITEMTAG, PRODUCTNAME, GRSWEIGHT, etc.

        const makingChargeAmount = parseFloat(data.MAXMCAMOUNT || '0');
        const makingChargeGram = parseFloat(data.MAXMCGR || '0');

        let makingCharge = 0;
        let makingChargeType: 'fixed' | 'perGram' | 'percentage' = 'fixed';

        if (makingChargeAmount > 0) {
            makingCharge = makingChargeAmount;
            makingChargeType = 'fixed';
        } else if (makingChargeGram > 0) {
            makingCharge = makingChargeGram;
            makingChargeType = 'perGram'; // Mapped from 'weight' type in API to 'perGram' in types
        }

        return {
            tagNumber: data.ITEMTAG || data.TAGNO || itemtag,
            name: data.PRODUCTNAME || 'Unknown Product',
            pcs: parseInt(data.NOOFPIECES || '1'),
            grossWeight: parseFloat(data.GRSWEIGHT || '0'),
            stoneWeight: parseFloat(data.LESSWT || '0'), // Assuming LESSWT is stone/less weight
            netWeight: parseFloat(data.NETWEIGHT || '0'),
            purity: 22, // Defaulting to 22K as API doesn't seem to provide it explicitly in the sample
            makingCharge: makingCharge,
            makingChargeType: makingChargeType,
            wastage: parseFloat(data.MAXWASTAGEPER || '0'),
            wastageType: 'percentage', // API has MAXWASTAGEPER, implying percentage
            category: data.SUBPRODUCTNAME || data.PRODUCTNAME || 'General',
            rate: parseFloat(data.RATE || '0'),
            metal: (data.METNAME && data.METNAME.toUpperCase() === 'SILVER') ? 'SILVER' : 'GOLD',
        };
    } catch (error: any) {
        console.error('Error fetching tag details from new API:', error);
        if (error.response) {
            // The request was made and the server responded with a status code
            console.error('Response status:', error.response.status);
            console.error('Response data:', error.response.data);
        } else if (error.request) {
            // The request was made but no response was received
            console.error('No response received:', error.request);
        } else {
            // Something happened in setting up the request that triggered an Error
            console.error('Request setup error:', error.message);
        }
        throw error;
    }
};

export const uploadMultiTags = async (tags: string[]): Promise<Product[]> => {
    try {
        const response = await apiClient.post<Product[]>('/product/multi-tag', { tags });
        return response.data;
    } catch (error) {
        console.error('Error fetching multi-tags:', error);
        throw error;
    }
};
