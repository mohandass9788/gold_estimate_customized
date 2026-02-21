import React, { useState, useEffect, useRef } from 'react';
import { View as RNView, Text as RNText, StyleSheet, Vibration, FlatList as RNFlatList, TouchableOpacity as RNRTouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import ScreenContainer from '../components/ScreenContainer';
import HeaderBar from '../components/HeaderBar';
import PrimaryButton from '../components/PrimaryButton';
import { useEstimation } from '../store/EstimationContext';
import { useGeneralSettings } from '../store/GeneralSettingsContext';
import { fetchTagDetailsFromApi } from '../services/productService';
import { calculateItemTotal } from '../utils/calculations';
import { COLORS, SPACING, FONT_SIZES, BORDER_RADIUS, LIGHT_COLORS, DARK_COLORS } from '../constants/theme';
import { EstimationItem, Product } from '../types';

// Fix for React 19 type mismatch
const View = RNView as any;
const Text = RNText as any;
const FlatList = RNFlatList as any;
const Icon = Ionicons as any;
const TouchableOpacity = RNRTouchableOpacity as any;

interface ScannedTag {
    id: string;
    status: 'scanned' | 'processing' | 'confirmed' | 'error';
    product?: Product;
}

export default function MultiTagScanScreen() {
    const router = useRouter();
    const { addMultipleTagItems, state } = useEstimation();
    const { theme, t } = useGeneralSettings();
    const activeColors = theme === 'light' ? LIGHT_COLORS : DARK_COLORS;

    const [permission, requestPermission] = useCameraPermissions();
    const [scannedTags, setScannedTags] = useState<ScannedTag[]>([]);
    const [isScanning, setIsScanning] = useState(true);
    const lastScannedTime = useRef<number>(0);

    useEffect(() => {
        if (permission && !permission.granted) {
            requestPermission();
        }
    }, [permission]);

    const handleBarCodeScanned = ({ data }: { data: string }) => {
        const now = Date.now();
        if (now - lastScannedTime.current < 2000) return; // 2 second debounce

        if (scannedTags.some(tag => tag.id === data)) return;

        lastScannedTime.current = now;
        Vibration.vibrate();
        setScannedTags(prev => [{ id: data, status: 'scanned' }, ...prev]);
    };

    const confirmTag = async (tagId: string) => {
        setScannedTags(prev => prev.map(t => t.id === tagId ? { ...t, status: 'processing' } : t));

        try {
            const product = await fetchTagDetailsFromApi(tagId);
            setScannedTags(prev => prev.map(t => t.id === tagId ? { ...t, status: 'confirmed', product } : t));
        } catch (error) {
            setScannedTags(prev => prev.map(t => t.id === tagId ? { ...t, status: 'error' } : t));
            Alert.alert('Error', `Failed to fetch details for tag: ${tagId}`);
        }
    };

    const removeTag = (tagId: string) => {
        setScannedTags(prev => prev.filter(t => t.id !== tagId));
    };

    const handleProceed = () => {
        const confirmedTags = scannedTags.filter(t => t.status === 'confirmed' && t.product);
        if (confirmedTags.length === 0) {
            Alert.alert('No Items', 'Please add/confirm at least one tag before proceeding.');
            return;
        }

        const itemsToAdd: EstimationItem[] = confirmedTags.map(ct => {
            const product = ct.product!;
            // Use current rate based on metal and purity from state
            let currentRate = product.metal === 'SILVER' ? state.goldRate.silver : 0;
            if (product.metal !== 'SILVER') {
                currentRate = product.purity === 24 ? state.goldRate.rate24k :
                    product.purity === 22 ? state.goldRate.rate22k :
                        product.purity === 20 ? state.goldRate.rate20k :
                            product.purity === 18 ? state.goldRate.rate18k : 0;
            }

            const calculations = calculateItemTotal(
                product.netWeight,
                currentRate,
                product.makingCharge,
                product.makingChargeType,
                product.wastage,
                product.wastageType
            );

            return {
                ...product,
                id: Date.now().toString() + Math.random().toString(36).substr(2, 5),
                isManual: false,
                rate: currentRate,
                goldValue: calculations.goldValue,
                makingChargeValue: calculations.makingChargeValue,
                wastageValue: calculations.wastageValue,
                gstValue: calculations.gstValue,
                totalValue: calculations.total,
                metal: product.metal || 'GOLD',
            };
        });

        addMultipleTagItems(itemsToAdd);
        Alert.alert(t('success'), t('items_added_to_estimation', { count: itemsToAdd.length.toString() }) || `${itemsToAdd.length} items added to estimation.`);
        router.push({ pathname: '/(tabs)/estimation', params: { mode: 'TAG' } });
    };

    const renderTagItem = ({ item }: { item: ScannedTag }) => (
        <View style={[styles.tagItem, { backgroundColor: activeColors.cardBg, borderColor: activeColors.border }]}>
            <View style={styles.tagInfo}>
                <Text style={[styles.tagId, { color: activeColors.text }]}>{item.id}</Text>
                {item.product && (
                    <Text style={[styles.productName, { color: activeColors.textLight }]} numberOfLines={1}>
                        {item.product.name} ({item.product.netWeight}g)
                    </Text>
                )}
            </View>

            <View style={styles.tagActions}>
                {item.status === 'scanned' || item.status === 'error' ? (
                    <TouchableOpacity
                        style={[styles.addButton, { backgroundColor: activeColors.primary }]}
                        onPress={() => confirmTag(item.id)}
                    >
                        <Text style={styles.buttonText}>ADD</Text>
                    </TouchableOpacity>
                ) : item.status === 'processing' ? (
                    <ActivityIndicator color={activeColors.primary} style={{ marginRight: 10 }} />
                ) : (
                    <View style={styles.confirmedIcon}>
                        <Icon name="checkmark-circle" size={28} color={activeColors.success} />
                    </View>
                )}

                <TouchableOpacity onPress={() => removeTag(item.id)} style={styles.removeButton}>
                    <Icon name="trash-outline" size={20} color={activeColors.error} />
                </TouchableOpacity>
            </View>
        </View>
    );

    if (!permission || !permission.granted) {
        return (
            <ScreenContainer backgroundColor={activeColors.background}>
                <HeaderBar title={t('multi_tag_scan')} showBack />
                <View style={[styles.permissionContainer, { backgroundColor: activeColors.background }]}>
                    <Text style={{ color: activeColors.text, marginBottom: 20 }}>{t('camera_permission_needed')}</Text>
                    <PrimaryButton title={t('grant_permission')} onPress={requestPermission} />
                </View>
            </ScreenContainer>
        );
    }

    return (
        <ScreenContainer backgroundColor={activeColors.background}>
            <HeaderBar
                title={t('multi_tag_scan')}
                showBack
                rightAction={
                    <View style={styles.counter}>
                        <Text style={[styles.counterText, { color: activeColors.primary }]}>
                            {scannedTags.filter(t => t.status === 'confirmed').length} / {scannedTags.length}
                        </Text>
                    </View>
                }
            />

            <View style={styles.container}>
                <View style={styles.cameraContainer}>
                    <CameraView
                        style={styles.camera}
                        facing="back"
                        onBarcodeScanned={isScanning ? handleBarCodeScanned : undefined}
                        barcodeScannerSettings={{
                            barcodeTypes: ["qr"],
                        }}
                    />
                    <View style={styles.scanOverlay} pointerEvents="none">
                        <View style={[styles.scanFrame, { borderColor: activeColors.primary }]} />
                        <View style={styles.instructionBox}>
                            <Text style={styles.instructionText}>{t('position_qr_code')}</Text>
                        </View>
                    </View>
                    <TouchableOpacity
                        style={styles.scanToggle}
                        onPress={() => setIsScanning(!isScanning)}
                    >
                        <Icon name={isScanning ? "pause-circle" : "play-circle"} size={40} color="white" />
                    </TouchableOpacity>
                </View>

                <View style={styles.listContainer}>
                    <View style={styles.listHeader}>
                        <Text style={[styles.listTitle, { color: activeColors.text }]}>{t('scanned_tags')}</Text>
                        <TouchableOpacity onPress={() => setScannedTags([])}>
                            <Text style={{ color: activeColors.error, fontSize: 12 }}>{t('clear_all')}</Text>
                        </TouchableOpacity>
                    </View>

                    <FlatList
                        data={scannedTags}
                        renderItem={renderTagItem}
                        keyExtractor={(item: { id: any; }) => item.id}
                        contentContainerStyle={styles.listContent}
                        ListEmptyComponent={
                            <View style={styles.emptyList}>
                                <Icon name="qr-code-outline" size={48} color={activeColors.border} />
                                <Text style={{ color: activeColors.textLight, marginTop: 10 }}>{t('no_tags_scanned')}</Text>
                            </View>
                        }
                    />
                </View>

                <View style={[styles.footer, { backgroundColor: activeColors.cardBg, borderTopColor: activeColors.border }]}>
                    <PrimaryButton
                        title={t('proceed_with_count', { count: scannedTags.filter(t => t.status === 'confirmed').length.toString() })}
                        onPress={handleProceed}
                        disabled={scannedTags.filter(t => t.status === 'confirmed').length === 0}
                    />
                </View>
            </View>
        </ScreenContainer>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    permissionContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
    cameraContainer: {
        height: '40%',
        overflow: 'hidden',
    },
    camera: {
        flex: 1,
    },
    scanOverlay: {
        ...StyleSheet.absoluteFillObject,
        justifyContent: 'center',
        alignItems: 'center',
    },
    scanFrame: {
        width: 180,
        height: 180,
        borderWidth: 2,
        borderRadius: BORDER_RADIUS.md,
        backgroundColor: 'rgba(0,0,0,0.1)',
    },
    instructionBox: {
        position: 'absolute',
        top: 20,
        backgroundColor: 'rgba(0,0,0,0.6)',
        paddingHorizontal: 15,
        paddingVertical: 5,
        borderRadius: 20,
    },
    instructionText: {
        color: 'white',
        fontSize: 12,
    },
    scanToggle: {
        position: 'absolute',
        bottom: 10,
        right: 10,
    },
    listContainer: {
        flex: 1,
        padding: SPACING.md,
    },
    listHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: SPACING.sm,
    },
    listTitle: {
        fontSize: FONT_SIZES.md,
        fontWeight: 'bold',
    },
    listContent: {
        paddingBottom: 20,
    },
    tagItem: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: SPACING.sm,
        paddingHorizontal: SPACING.md,
        borderRadius: BORDER_RADIUS.md,
        marginBottom: SPACING.sm,
        borderWidth: 1,
    },
    tagInfo: {
        flex: 1,
    },
    tagId: {
        fontWeight: 'bold',
        fontSize: FONT_SIZES.sm,
    },
    productName: {
        fontSize: 10,
        marginTop: 2,
    },
    tagActions: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    addButton: {
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 4,
        marginRight: 10,
    },
    buttonText: {
        color: 'white',
        fontSize: 10,
        fontWeight: 'bold',
    },
    confirmedIcon: {
        marginRight: 10,
    },
    removeButton: {
        padding: 4,
    },
    emptyList: {
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: 40,
        opacity: 0.5,
    },
    footer: {
        padding: SPACING.md,
        borderTopWidth: 1,
    },
    counter: {
        paddingHorizontal: 10,
    },
    counterText: {
        fontWeight: 'bold',
        fontSize: 14,
    }
});
