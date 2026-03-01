import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, TextInput, Alert, Modal } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useGeneralSettings } from '../store/GeneralSettingsContext';
import { getRepairs, getRepairById, DBRepair, deleteRepair } from '../services/dbService';
import ScreenContainer from '../components/ScreenContainer';
import { Camera, CameraView } from 'expo-camera';
import { COLORS, SPACING, FONT_SIZES, BORDER_RADIUS, LIGHT_COLORS, DARK_COLORS } from '../constants/theme';
import SafeLinearGradient from '../components/SafeLinearGradient';
import { format } from 'date-fns';
import RepairDeliveryModal from '../modals/RepairDeliveryModal';
import PrintPreviewModal from '../modals/PrintPreviewModal';
import { printRepair, getRepairReceiptThermalPayload } from '../services/printService';

export default function RepairListScreen() {
    const router = useRouter();
    const { theme, t, shopDetails, receiptConfig, updateReceiptConfig } = useGeneralSettings();
    const [repairs, setRepairs] = useState<DBRepair[]>([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState<'ALL' | 'PENDING' | 'DELIVERED'>('ALL');
    const [loading, setLoading] = useState(true);
    const [selectedRepair, setSelectedRepair] = useState<DBRepair | null>(null);
    const [isDeliveryModalVisible, setIsDeliveryModalVisible] = useState(false);
    const [isScannerVisible, setIsScannerVisible] = useState(false);
    const [hasPermission, setHasPermission] = useState<boolean | null>(null);
    const [scanned, setScanned] = useState(false);
    const [isPreviewVisible, setIsPreviewVisible] = useState(false);
    const [previewData, setPreviewData] = useState<DBRepair | null>(null);
    const [previewPayload, setPreviewPayload] = useState('');

    const activeColors = theme === 'light' ? LIGHT_COLORS : DARK_COLORS;

    useEffect(() => {
        loadRepairs();
    }, [statusFilter]);

    const loadRepairs = async () => {
        setLoading(true);
        try {
            const status = statusFilter === 'ALL' ? undefined : statusFilter;
            const data = await getRepairs(100, status);
            setRepairs(data);
        } catch (error) {
            console.error('Failed to load repairs:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleStartScan = async () => {
        const { status } = await Camera.requestCameraPermissionsAsync();
        setHasPermission(status === 'granted');
        if (status === 'granted') {
            setScanned(false);
            setIsScannerVisible(true);
        } else {
            Alert.alert(t('error'), t('camera_permission_needed'));
        }
    };

    const handleBarCodeScanned = async ({ data }: { data: string }) => {
        setScanned(true);
        setIsScannerVisible(false);

        try {
            const repair = await getRepairById(data);
            if (repair) {
                if (repair.status === 'PENDING') {
                    setSelectedRepair(repair);
                    setIsDeliveryModalVisible(true);
                } else {
                    Alert.alert(t('info'), t('repair_already_delivered'));
                }
            } else {
                Alert.alert(t('error'), t('invalid_repair_qr'));
            }
        } catch (error) {
            console.error('Scan lookup failed:', error);
            Alert.alert(t('error'), t('scan_error'));
        }
    };

    const filteredRepairs = repairs.filter(r =>
        r.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (r.customerName && r.customerName.toLowerCase().includes(searchQuery.toLowerCase()))
    );

    const getDaysIndicator = (dueDate: string, status: string) => {
        if (status === 'DELIVERED') return '';
        const due = new Date(dueDate);
        due.setHours(0, 0, 0, 0);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const diffDays = Math.round((due.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

        if (diffDays > 0) return `(- ${diffDays} Days)`;
        if (diffDays < 0) return `(+ ${Math.abs(diffDays)} Days)`;
        return `(0 Days)`;
    };

    const renderRepairItem = ({ item }: { item: DBRepair }) => (
        <TouchableOpacity
            style={[styles.card, { backgroundColor: activeColors.cardBg, borderColor: activeColors.border }]}
            onPress={() => handleView(item)}
        >
            <View style={styles.cardHeader}>
                <View style={[styles.statusBadge, { backgroundColor: item.status === 'DELIVERED' ? COLORS.success + '20' : COLORS.warning + '20' }]}>
                    <Text style={[styles.statusText, { color: item.status === 'DELIVERED' ? COLORS.success : COLORS.warning }]}>
                        {t(item.status.toLowerCase())}
                    </Text>
                </View>
                <View style={styles.actionButtons}>
                    <TouchableOpacity style={styles.iconBtn} onPress={() => handleEdit(item)}>
                        <Ionicons name="create-outline" size={20} color={activeColors.primary} />
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.iconBtn} onPress={() => handleView(item)}>
                        <Ionicons name="eye-outline" size={20} color={COLORS.secondary} />
                    </TouchableOpacity>
                    <TouchableOpacity style={[styles.iconBtn, { marginRight: 0 }]} onPress={() => handleDelete(item)}>
                        <Ionicons name="trash-outline" size={20} color={COLORS.error} />
                    </TouchableOpacity>
                </View>
            </View>

            <View style={styles.cardBody}>
                <View>
                    <Text style={[styles.repairId, { color: activeColors.text }]}>{item.id}</Text>
                    <Text style={[styles.itemName, { color: activeColors.text }]}>{item.itemName}</Text>
                    <Text style={[styles.customerName, { color: activeColors.textLight }]}>
                        {item.customerName || t('unknown_customer')}
                    </Text>
                </View>
                <View style={styles.amountWrap}>
                    <Text style={[styles.amountLabel, { color: activeColors.textLight }]}>{t('balance')}</Text>
                    <Text style={[styles.amountValue, { color: COLORS.primary }]}>₹{item.balance.toLocaleString()}</Text>
                    <Text style={[styles.dateText, { color: activeColors.textLight, marginTop: 4 }]}>
                        {format(new Date(item.date), 'dd MMM yyyy')}
                    </Text>
                </View>
            </View>

            <View style={styles.cardFooter}>
                <View style={styles.infoRow}>
                    <Ionicons name="calendar-outline" size={14} color={activeColors.textLight} />
                    <Text style={[styles.infoText, { color: activeColors.textLight }]}>
                        {t('due_date')}: {format(new Date(item.dueDate), 'dd MMM')} <Text style={{ fontWeight: 'bold', color: item.status === 'PENDING' ? (new Date(item.dueDate) < new Date() ? COLORS.error : activeColors.textLight) : activeColors.textLight }}>{getDaysIndicator(item.dueDate, item.status)}</Text>
                    </Text>
                </View>
                {item.status === 'PENDING' && (
                    <TouchableOpacity
                        style={[styles.deliverSmallBtn, { backgroundColor: COLORS.success }]}
                        onPress={() => {
                            setSelectedRepair(item);
                            setIsDeliveryModalVisible(true);
                        }}
                    >
                        <Text style={styles.deliverSmallBtnText}>{t('repair_delivery')}</Text>
                    </TouchableOpacity>
                )}
            </View>
        </TouchableOpacity>
    );

    const handleView = async (item: DBRepair) => {
        try {
            const payload = await getRepairReceiptThermalPayload(item as any, shopDetails, undefined, receiptConfig, t);
            setPreviewPayload(payload);
            setPreviewData(item);
            setIsPreviewVisible(true);
        } catch (error) {
            console.error('Failed to generate preview:', error);
            Alert.alert(t('error'), t('preview_error'));
        }
    };

    const handleWidthChange = async (width: '58mm' | '80mm' | '112mm') => {
        try {
            await updateReceiptConfig({ paperWidth: width });
            if (previewData) {
                const updatedConfig = { ...receiptConfig, paperWidth: width };
                const payload = await getRepairReceiptThermalPayload(
                    previewData as any,
                    shopDetails,
                    undefined,
                    updatedConfig,
                    t
                );
                setPreviewPayload(payload);
            }
        } catch (error) {
            console.error('Failed to change width:', error);
        }
    };

    const handleEdit = (item: DBRepair) => {
        router.push({ pathname: '/(tabs)/repairs/new', params: { id: item.id } });
    };

    const handleDelete = (item: DBRepair) => {
        Alert.alert(
            t('confirm_delete'),
            t('confirm_delete_repair'),
            [
                { text: t('cancel'), style: 'cancel' },
                {
                    text: t('delete'),
                    style: 'destructive',
                    onPress: async () => {
                        await deleteRepair(item.id);
                        loadRepairs();
                    }
                }
            ]
        );
    };

    return (
        <ScreenContainer backgroundColor={activeColors.background}>
            <SafeLinearGradient
                colors={theme === 'light' ? ['#FFFFFF', '#F8F9FA'] : ['#1C1C1E', '#121212']}
                style={styles.header}
            >
                <View style={styles.headerTop}>
                    <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                        <Ionicons name="arrow-back" size={24} color={activeColors.text} />
                    </TouchableOpacity>
                    <Text style={[styles.headerTitle, { color: activeColors.text }]}>{t('repair_list')}</Text>
                    <View style={styles.headerRight}>
                        <TouchableOpacity
                            style={[styles.scanButton, { backgroundColor: COLORS.secondary }]}
                            onPress={handleStartScan}
                        >
                            <Ionicons name="qr-code-outline" size={24} color="#FFF" />
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={[styles.addButton, { backgroundColor: COLORS.primary }]}
                            onPress={() => router.push('/(tabs)/repairs/new')}
                        >
                            <Ionicons name="add" size={24} color="#FFF" />
                        </TouchableOpacity>
                    </View>
                </View>

                <View style={[styles.searchBar, { backgroundColor: activeColors.cardBg, borderColor: activeColors.border }]}>
                    <Ionicons name="search" size={20} color={activeColors.textLight} />
                    <TextInput
                        style={[styles.searchInput, { color: activeColors.text }]}
                        placeholder={t('search_repair')}
                        placeholderTextColor={activeColors.textLight}
                        value={searchQuery}
                        onChangeText={setSearchQuery}
                    />
                </View>

                <View style={styles.filterRow}>
                    {(['ALL', 'PENDING', 'DELIVERED'] as const).map((status) => (
                        <TouchableOpacity
                            key={status}
                            style={[
                                styles.filterItem,
                                statusFilter === status && { backgroundColor: COLORS.primary }
                            ]}
                            onPress={() => setStatusFilter(status)}
                        >
                            <Text style={[
                                styles.filterText,
                                { color: statusFilter === status ? '#FFF' : activeColors.textLight }
                            ]}>
                                {t(status.toLowerCase() === 'all' ? 'all_repairs' : status.toLowerCase())}
                            </Text>
                        </TouchableOpacity>
                    ))}
                </View>
            </SafeLinearGradient>

            <FlatList
                data={filteredRepairs}
                renderItem={renderRepairItem}
                keyExtractor={item => item.id}
                contentContainerStyle={styles.listContent}
                refreshing={loading}
                onRefresh={loadRepairs}
                ListEmptyComponent={
                    <View style={styles.emptyWrap}>
                        <Ionicons name="construct-outline" size={64} color={activeColors.textLight + '40'} />
                        <Text style={[styles.emptyText, { color: activeColors.textLight }]}>{t('no_repairs_found')}</Text>
                    </View>
                }
            />

            <RepairDeliveryModal
                visible={isDeliveryModalVisible}
                repair={selectedRepair}
                onClose={() => setIsDeliveryModalVisible(false)}
                onSuccess={() => {
                    setIsDeliveryModalVisible(false);
                    loadRepairs();
                }}
            />

            <PrintPreviewModal
                visible={isPreviewVisible}
                onClose={() => setIsPreviewVisible(false)}
                onPrint={() => {
                    if (previewData) {
                        printRepair(previewData as any);
                    }
                }}
                thermalPayload={previewPayload}
                qrData={previewData?.id}
                title={t('repair_receipt')}
                onWidthChange={handleWidthChange}
            />

            <Modal
                visible={isScannerVisible}
                animationType="slide"
                onRequestClose={() => setIsScannerVisible(false)}
            >
                <View style={styles.scannerContainer}>
                    <CameraView
                        onBarcodeScanned={scanned ? undefined : handleBarCodeScanned}
                        barcodeScannerSettings={{
                            barcodeTypes: ["qr"],
                        }}
                        style={StyleSheet.absoluteFillObject}
                    />
                    <View style={styles.scannerOverlay}>
                        <Text style={styles.scanText}>{t('scan_repair_qr')}</Text>
                        <View style={styles.scanFrame} />
                        <TouchableOpacity
                            style={styles.closeScanBtn}
                            onPress={() => setIsScannerVisible(false)}
                        >
                            <Text style={styles.closeScanText}>{t('cancel')}</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>
        </ScreenContainer>
    );
}

const styles = StyleSheet.create({
    header: {
        paddingTop: 40,
        paddingBottom: 10,
        paddingHorizontal: SPACING.md,
        borderBottomLeftRadius: 20,
        borderBottomRightRadius: 20,
        elevation: 4,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
    },
    headerTop: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: SPACING.sm,
    },
    headerRight: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    backButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        justifyContent: 'center',
        alignItems: 'center',
    },
    headerTitle: {
        fontSize: FONT_SIZES.xl,
        fontWeight: 'bold',
    },
    addButton: {
        width: 44,
        height: 44,
        borderRadius: 22,
        justifyContent: 'center',
        alignItems: 'center',
        elevation: 4,
        marginLeft: SPACING.sm,
    },
    scanButton: {
        width: 44,
        height: 44,
        borderRadius: 22,
        justifyContent: 'center',
        alignItems: 'center',
        elevation: 4,
    },
    searchBar: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: SPACING.md,
        height: 40,
        borderRadius: BORDER_RADIUS.md,
        borderWidth: 1,
        marginBottom: SPACING.sm,
    },
    searchInput: {
        flex: 1,
        marginLeft: SPACING.sm,
        fontSize: FONT_SIZES.md,
    },
    filterRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
    },
    filterItem: {
        paddingHorizontal: SPACING.md,
        paddingVertical: 6,
        borderRadius: 20,
        minWidth: 80,
        alignItems: 'center',
    },
    filterText: {
        fontSize: 12,
        fontWeight: '600',
    },
    listContent: {
        padding: SPACING.md,
        paddingBottom: 100,
    },
    card: {
        borderRadius: BORDER_RADIUS.lg,
        padding: SPACING.md,
        marginBottom: SPACING.md,
        borderWidth: 1,
        elevation: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 2,
    },
    cardHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: SPACING.sm,
    },
    statusBadge: {
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 12,
    },
    statusText: {
        fontSize: 10,
        fontWeight: 'bold',
        textTransform: 'uppercase',
    },
    dateText: {
        fontSize: 11,
    },
    cardBody: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: SPACING.sm,
    },
    repairId: {
        fontSize: 12,
        fontWeight: 'bold',
        opacity: 0.7,
        marginBottom: 2,
    },
    itemName: {
        fontSize: FONT_SIZES.lg,
        fontWeight: 'bold',
    },
    customerName: {
        fontSize: FONT_SIZES.sm,
        marginTop: 2,
    },
    amountWrap: {
        alignItems: 'flex-end',
    },
    amountLabel: {
        fontSize: 10,
        textTransform: 'uppercase',
        marginBottom: 2,
    },
    amountValue: {
        fontSize: FONT_SIZES.lg,
        fontWeight: '800',
    },
    cardFooter: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingTop: SPACING.sm,
        borderTopWidth: 1,
        borderTopColor: 'rgba(0,0,0,0.05)',
    },
    infoRow: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    infoText: {
        fontSize: 11,
        marginLeft: 4,
    },
    emptyWrap: {
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: 100,
        opacity: 0.5,
    },
    emptyText: {
        marginTop: SPACING.md,
        fontSize: FONT_SIZES.md,
        fontWeight: '500',
    },
    scannerContainer: {
        flex: 1,
        backgroundColor: '#000',
    },
    scannerOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    scanText: {
        color: '#FFF',
        fontSize: FONT_SIZES.lg,
        fontWeight: 'bold',
        marginBottom: 30,
    },
    scanFrame: {
        width: 250,
        height: 250,
        borderWidth: 2,
        borderColor: COLORS.primary,
        borderRadius: 20,
        backgroundColor: 'transparent',
    },
    closeScanBtn: {
        marginTop: 50,
        paddingHorizontal: 30,
        paddingVertical: 12,
        borderRadius: 25,
        backgroundColor: 'rgba(255,255,255,0.2)',
    },
    closeScanText: {
        color: '#FFF',
        fontSize: FONT_SIZES.md,
        fontWeight: 'bold',
    },
    actionButtons: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    iconBtn: {
        padding: 6,
        marginRight: 8,
        backgroundColor: 'rgba(0,0,0,0.03)',
        borderRadius: 8,
    },
    deliverSmallBtn: {
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 12,
        elevation: 2,
    },
    deliverSmallBtnText: {
        color: '#FFF',
        fontSize: 10,
        fontWeight: 'bold',
    },
});
