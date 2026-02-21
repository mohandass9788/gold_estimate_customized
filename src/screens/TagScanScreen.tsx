import React, { useState, useEffect } from 'react';
import { View as RNView, Text as RNText, StyleSheet, Alert } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { useRouter, useFocusEffect } from 'expo-router';
import { useCallback } from 'react';
import ScreenContainer from '../components/ScreenContainer';
import HeaderBar from '../components/HeaderBar';
import PrimaryButton from '../components/PrimaryButton';
import { useEstimation } from '../store/EstimationContext';
import { useGeneralSettings } from '../store/GeneralSettingsContext';
import { getProductByTag, fetchTagDetailsFromApi } from '../services/productService';
import { calculateItemTotal } from '../utils/calculations';
import { COLORS, FONT_SIZES, LIGHT_COLORS, DARK_COLORS } from '../constants/theme';
import { EstimationItem } from '../types';

// Fix for React 19 type mismatch
const View = RNView as any;
const Text = RNText as any;

export default function TagScanScreen() {
    const router = useRouter();
    const { addTagItem, state } = useEstimation();
    const { theme, t } = useGeneralSettings();
    const activeColors = theme === 'light' ? LIGHT_COLORS : DARK_COLORS;

    const [permission, requestPermission] = useCameraPermissions();
    const [scanned, setScanned] = useState(false);
    const [loading, setLoading] = useState(false);

    useFocusEffect(
        useCallback(() => {
            setScanned(false);
            setLoading(false);
        }, [])
    );

    useEffect(() => {
        if (permission && !permission.granted) {
            requestPermission();
        }
    }, [permission, requestPermission]);

    const handleBarCodeScanned = async ({ data }: { data: string }) => {
        if (scanned || loading) return;
        setScanned(true);
        setLoading(true);

        try {
            console.log("Scanning tag:", data);
            const product = await fetchTagDetailsFromApi(data, 'ajithkumar');
            console.log("Mapped Product:", product);

            // Navigate to UnifiedEstimationScreen with scanned data
            // Since we are in a tab navigator (likely), and we want to go 'back' or 'to' the estimation screen.
            // Dashboard sends us to '/(tabs)/scan'. 
            // UnifiedEstimationScreen seems to be the index of tabs or another tab?
            // If it's the index '/', we should navigate to it.

            // router.dismiss() failed because we might not be in a stack that supports dismissal in this context,
            // or we are the last screen in that stack?
            // Safe bet: Navigate explicitly to the target screen.

            router.navigate({ pathname: '/(tabs)/manual', params: { scannedData: JSON.stringify(product) } });

        } catch (error) {
            console.error("API Call Failed:", error);
            Alert.alert('Error', 'Product not found or invalid tag.', [
                { text: t('scan_again') || 'Scan Again', onPress: () => setScanned(false) }
            ]);
        } finally {
            setLoading(false);
        }
    };

    if (!permission) {
        return <View />;
    }

    if (!permission.granted) {
        return (
            <ScreenContainer backgroundColor={activeColors.background}>
                <HeaderBar title={t('scan_tag')} showBack />
                <View style={[styles.permissionContainer, { backgroundColor: activeColors.background }]}>
                    <Text style={[styles.permissionText, { color: activeColors.text }]}>{t('camera_permission_needed') || 'Camera permission is needed to scan tags.'}</Text>
                    <PrimaryButton title={t('grant_permission') || "Grant Permission"} onPress={requestPermission} />
                </View>
            </ScreenContainer>
        );
    }

    return (
        <ScreenContainer backgroundColor={activeColors.background}>
            <HeaderBar title={t('scan_tag')} showBack />
            <View style={styles.container}>
                <CameraView
                    style={styles.camera}
                    facing="back"
                    onBarcodeScanned={scanned ? undefined : handleBarCodeScanned}
                    barcodeScannerSettings={{
                        barcodeTypes: ["qr"],
                    }}
                />
                <View style={styles.overlay} pointerEvents="none">
                    <View style={[styles.scanFrame, { borderColor: activeColors.primary }]} />
                    <Text style={styles.instructionText}>{t('align_qr_code') || 'Align QR code within the frame'}</Text>
                </View>
            </View>
            {loading && (
                <View style={styles.loadingOverlay}>
                    <Text style={{ color: 'white' }}>{t('fetching_product') || 'Fetching Product...'}</Text>
                </View>
            )}
        </ScreenContainer>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: 'black',
    },
    permissionContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
    permissionText: {
        marginBottom: 20,
        textAlign: 'center',
        fontSize: FONT_SIZES.md,
    },
    camera: {
        flex: 1,
    },
    overlay: {
        ...StyleSheet.absoluteFillObject,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'rgba(0,0,0,0.3)', // Slightly lighter overlay
    },
    scanFrame: {
        width: 250,
        height: 250,
        borderWidth: 2,
        backgroundColor: 'transparent',
    },
    instructionText: {
        color: 'white',
        marginTop: 20,
        fontSize: FONT_SIZES.md,
    },
    loadingOverlay: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(0,0,0,0.7)',
        justifyContent: 'center',
        alignItems: 'center',
    },
});
