import React, { useState, useEffect } from 'react';
import { View as RNView, Text as RNText, StyleSheet, TouchableOpacity as RNRTouchableOpacity, ScrollView as RNScrollView, ActivityIndicator, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as FS from 'expo-file-system';
const FileSystem = FS as any;
import ScreenContainer from '../components/ScreenContainer';
import HeaderBar from '../components/HeaderBar';
import PrimaryButton from '../components/PrimaryButton';
import { COLORS, SPACING, FONT_SIZES, BORDER_RADIUS, LIGHT_COLORS, DARK_COLORS } from '../constants/theme';
import { useGeneralSettings } from '../store/GeneralSettingsContext';
import { backupDatabaseLocal, restoreDatabaseLocal } from '../services/localBackupService';
import { pushSyncData, pullSyncData, getSyncBackupPreview } from '../services/syncService';
import { useSubscriptionRestricted } from '../hooks/useSubscriptionRestricted';

// Fix for React 19 type mismatch
const View = RNView as any;
const Text = RNText as any;
const ScrollView = RNScrollView as any;
const TouchableOpacity = RNRTouchableOpacity as any;
const Icon = Ionicons as any;

export default function BackupRestoreScreen() {
    const router = useRouter();
    const { verifyAccess } = useSubscriptionRestricted();
    const { theme, t, deviceName, showAlert } = useGeneralSettings();
    const activeColors = theme === 'light' ? LIGHT_COLORS : DARK_COLORS;

    const [loading, setLoading] = useState(false);
    const [lastSync, setLastSync] = useState<string | null>(null);
    const [showPreview, setShowPreview] = useState(false);
    const [previewData, setPreviewData] = useState<any>(null);

    const handleLocalBackup = async () => {
        verifyAccess(async () => {
            setLoading(true);
            try {
                await backupDatabaseLocal(deviceName, t, showAlert);
            } finally {
                setLoading(false);
            }
        });
    };

    const handleLocalRestore = async () => {
        verifyAccess(async () => {
            setLoading(true);
            try {
                await restoreDatabaseLocal(t, showAlert);
            } finally {
                setLoading(false);
            }
        });
    };

    const handleServerBackupPreCheck = async () => {
        verifyAccess(async () => {
            setLoading(true);
            try {
                const results = await getSyncBackupPreview();
                setPreviewData(results);
                setShowPreview(true);
            } catch (error: any) {
                showAlert(t('error'), error.message || t('server_backup_failed'), 'error');
            } finally {
                setLoading(false);
            }
        });
    };

    const handleConfirmServerBackup = async () => {
        setShowPreview(false);
        setLoading(true);
        try {
            await pushSyncData();
            setLastSync(new Date().toLocaleString());
            showAlert(t('success'), t('server_backup_success') || 'Data successfully pushed to server', 'success');
        } catch (error: any) {
            showAlert(t('error'), error.message || t('server_backup_failed'), 'error');
        } finally {
            setLoading(false);
        }
    };

    const handleServerRestore = async () => {
        verifyAccess(async () => {
            setLoading(true);
            try {
                await pullSyncData();
                setLastSync(new Date().toLocaleString());
                showAlert(t('success'), t('server_restore_success') || 'Data successfully restored from server', 'success');
            } catch (error: any) {
                showAlert(t('error'), error.message || t('server_restore_failed'), 'error');
            } finally {
                setLoading(false);
            }
        });
    };

    const ActionCard = ({ title, icon, color, description, onAction, subTitle }: any) => (
        <TouchableOpacity 
            style={[styles.smallCard, { backgroundColor: activeColors.cardBg, borderColor: activeColors.border }]} 
            onPress={onAction}
            activeOpacity={0.7}
        >
            <View style={[styles.iconCircle, { backgroundColor: color + '15' }]}>
                <Icon name={icon} size={24} color={color} />
            </View>
            <View style={styles.cardContent}>
                <Text style={[styles.cardTitle, { color: activeColors.text }]}>{title}</Text>
                <Text style={[styles.cardDesc, { color: activeColors.textLight }]} numberOfLines={2}>{description}</Text>
            </View>
            <Icon name="chevron-forward" size={18} color={activeColors.border} />
        </TouchableOpacity>
    );

    return (
        <ScreenContainer backgroundColor={activeColors.background}>
            <HeaderBar title={t('backup_restore') || 'Backup & Restore'} showBack />
            <ScrollView contentContainerStyle={styles.container}>
                
                <View style={styles.headerSection}>
                    <Icon name="cloud-done-outline" size={48} color={activeColors.primary} />
                    <Text style={[styles.mainTitle, { color: activeColors.text }]}>{t('data_security') || 'Data Security'}</Text>
                    <Text style={[styles.mainDesc, { color: activeColors.textLight }]}>
                        {t('backup_restore_intro') || 'Keep your business data safe with local backups or secure server synchronization.'}
                    </Text>
                </View>

                <View style={styles.sectionHeader}>
                    <Text style={[styles.sectionTitle, { color: activeColors.text }]}>{t('server_sync') || 'Server Synchronization'}</Text>
                    {lastSync && <Text style={[styles.lastSync, { color: activeColors.textLight }]}>{t('last_sync') || 'Last'}: {lastSync}</Text>}
                </View>
                
                <ActionCard 
                    title={t('backup_to_server') || 'Backup to Server'}
                    icon="cloud-upload"
                    color={activeColors.primary}
                    description={t('backup_to_server_desc') || 'Push your local data to the central server.'}
                    onAction={handleServerBackupPreCheck}
                />

                <ActionCard 
                    title={t('restore_from_server') || 'Restore from Server'}
                    icon="cloud-download"
                    color="#2D9CDB"
                    description={t('restore_from_server_desc') || 'Download and merge your data from the central server.'}
                    onAction={handleServerRestore}
                />

                <View style={[styles.sectionHeader, { marginTop: SPACING.lg }]}>
                    <Text style={[styles.sectionTitle, { color: activeColors.text }]}>{t('local_management') || 'Local Management'}</Text>
                </View>

                <ActionCard 
                    title={t('local_backup') || 'Local Backup'}
                    icon="save-outline"
                    color="#27AE60"
                    description={t('local_backup_desc') || 'Save a copy of your database to your device storage.'}
                    onAction={handleLocalBackup}
                />

                <ActionCard 
                    title={t('local_restore') || 'Local Restore'}
                    icon="folder-open-outline"
                    color="#F2994A"
                    description={t('local_restore_desc') || 'Restore data from a previously saved .db file.'}
                    onAction={handleLocalRestore}
                />

                <View style={[styles.warningBox, { backgroundColor: activeColors.error + '10', borderColor: activeColors.error + '30' }]}>
                    <Icon name="warning-outline" size={20} color={activeColors.error} />
                    <View style={{ flex: 1, marginLeft: SPACING.md }}>
                        <Text style={[styles.warningHeader, { color: activeColors.error }]}>{t('be_careful') || 'Important Note'}</Text>
                        <Text style={[styles.warningText, { color: activeColors.textLight }]}>
                            {t('backup_restore_warning') || 'Restoring data will overwrite your current local records. Ensure you have a backup before proceeding.'}
                        </Text>
                    </View>
                </View>

            </ScrollView>

            {showPreview && previewData && (
                <View style={styles.overlay}>
                    <View style={[styles.previewModal, { backgroundColor: activeColors.cardBg, borderColor: activeColors.border }]}>
                        <View style={styles.previewHeader}>
                            <Icon name="list-circle-outline" size={32} color={activeColors.primary} />
                            <Text style={[styles.previewTitle, { color: activeColors.text }]}>{t('sync_preview_title')}</Text>
                        </View>
                        
                        <Text style={[styles.previewDesc, { color: activeColors.textLight }]}>{t('sync_preview_desc')}</Text>
                        
                        <View style={styles.countsGrid}>
                            <View style={styles.countRow}>
                                <Text style={[styles.countLabel, { color: activeColors.text }]}>{t('customers_label')}</Text>
                                <Text style={[styles.countValue, { color: activeColors.primary }]}>{previewData.customers}</Text>
                            </View>
                            <View style={styles.countRow}>
                                <Text style={[styles.countLabel, { color: activeColors.text }]}>{t('estimations_label')}</Text>
                                <Text style={[styles.countValue, { color: activeColors.primary }]}>{previewData.estimations}</Text>
                            </View>
                            <View style={styles.countRow}>
                                <Text style={[styles.countLabel, { color: activeColors.text }]}>{t('purchases_label')}</Text>
                                <Text style={[styles.countValue, { color: activeColors.primary }]}>{previewData.purchases}</Text>
                            </View>
                            <View style={styles.countRow}>
                                <Text style={[styles.countLabel, { color: activeColors.text }]}>{t('repairs_label')}</Text>
                                <Text style={[styles.countValue, { color: activeColors.primary }]}>{previewData.repairs}</Text>
                            </View>
                            <View style={styles.countRow}>
                                <Text style={[styles.countLabel, { color: activeColors.text }]}>{t('employees_label')}</Text>
                                <Text style={[styles.countValue, { color: activeColors.primary }]}>{previewData.employees}</Text>
                            </View>
                        </View>

                        <View style={styles.previewActions}>
                            <TouchableOpacity 
                                style={[styles.previewBtn, { backgroundColor: activeColors.border }]} 
                                onPress={() => setShowPreview(false)}
                            >
                                <Text style={[styles.btnText, { color: activeColors.text }]}>{t('cancel')}</Text>
                            </TouchableOpacity>
                            <TouchableOpacity 
                                style={[styles.previewBtn, { backgroundColor: activeColors.primary }]} 
                                onPress={handleConfirmServerBackup}
                            >
                                <Text style={[styles.btnText, { color: COLORS.white }]}>{t('confirm_backup')}</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            )}

            {loading && (
                <View style={styles.overlay}>
                    <ActivityIndicator size="large" color={activeColors.primary} />
                    <Text style={[styles.loadingText, { color: COLORS.white }]}>{t('processing')}...</Text>
                </View>
            )}
        </ScreenContainer>
    );
}

const styles = StyleSheet.create({
    container: {
        padding: SPACING.lg,
    },
    headerSection: {
        alignItems: 'center',
        marginBottom: SPACING.xl,
    },
    mainTitle: {
        fontSize: FONT_SIZES.xl,
        fontWeight: 'bold',
        marginTop: SPACING.sm,
    },
    mainDesc: {
        fontSize: FONT_SIZES.sm,
        textAlign: 'center',
        marginTop: SPACING.xs,
        paddingHorizontal: SPACING.md,
    },
    sectionHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: SPACING.sm,
        paddingHorizontal: SPACING.xs,
    },
    sectionTitle: {
        fontSize: FONT_SIZES.xs,
        fontWeight: 'bold',
        textTransform: 'uppercase',
        letterSpacing: 1.5,
    },
    lastSync: {
        fontSize: 10,
    },
    smallCard: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: SPACING.md,
        borderRadius: BORDER_RADIUS.md,
        marginBottom: SPACING.md,
        borderWidth: 1,
        elevation: 1,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 2,
    },
    iconCircle: {
        width: 44,
        height: 44,
        borderRadius: 22,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: SPACING.md,
    },
    cardContent: {
        flex: 1,
    },
    cardTitle: {
        fontSize: FONT_SIZES.md,
        fontWeight: 'bold',
    },
    cardDesc: {
        fontSize: FONT_SIZES.xs,
        marginTop: 2,
    },
    warningBox: {
        flexDirection: 'row',
        padding: SPACING.md,
        borderRadius: BORDER_RADIUS.md,
        marginTop: SPACING.lg,
        borderWidth: 1,
        borderStyle: 'dashed',
    },
    warningHeader: {
        fontSize: FONT_SIZES.sm,
        fontWeight: 'bold',
        marginBottom: 2,
    },
    warningText: {
        fontSize: FONT_SIZES.xs,
        lineHeight: 16,
    },
    overlay: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(0,0,0,0.6)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    loadingText: {
        marginTop: SPACING.md,
        fontWeight: 'bold',
    },
    previewModal: {
        width: '85%',
        padding: SPACING.lg,
        borderRadius: BORDER_RADIUS.lg,
        borderWidth: 1,
        elevation: 10,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 5 },
        shadowOpacity: 0.3,
        shadowRadius: 10,
    },
    previewHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: SPACING.md,
    },
    previewTitle: {
        fontSize: FONT_SIZES.lg,
        fontWeight: 'bold',
        marginLeft: SPACING.sm,
    },
    previewDesc: {
        fontSize: FONT_SIZES.sm,
        lineHeight: 20,
        marginBottom: SPACING.lg,
    },
    countsGrid: {
        backgroundColor: 'rgba(0,0,0,0.03)',
        borderRadius: BORDER_RADIUS.md,
        padding: SPACING.md,
        marginBottom: SPACING.xl,
    },
    countRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        paddingVertical: SPACING.xs,
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(0,0,0,0.05)',
    },
    countLabel: {
        fontSize: FONT_SIZES.sm,
    },
    countValue: {
        fontSize: FONT_SIZES.sm,
        fontWeight: 'bold',
    },
    previewActions: {
        flexDirection: 'row',
        justifyContent: 'space-between',
    },
    previewBtn: {
        flex: 0.48,
        height: 48,
        borderRadius: BORDER_RADIUS.md,
        justifyContent: 'center',
        alignItems: 'center',
    },
    btnText: {
        fontWeight: 'bold',
        fontSize: FONT_SIZES.sm,
    }
});
