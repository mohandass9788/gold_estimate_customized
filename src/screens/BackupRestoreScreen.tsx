import React, { useState, useEffect } from 'react';
import { View as RNView, Text as RNText, StyleSheet, TouchableOpacity as RNRTouchableOpacity, ScrollView as RNScrollView, ActivityIndicator, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as FS from 'expo-file-system';
const FileSystem = FS as any;
const { documentDirectory, EncodingType, readAsStringAsync } = FileSystem;
import ScreenContainer from '../components/ScreenContainer';
import HeaderBar from '../components/HeaderBar';
import PrimaryButton from '../components/PrimaryButton';
import { COLORS, SPACING, FONT_SIZES, BORDER_RADIUS, LIGHT_COLORS, DARK_COLORS } from '../constants/theme';
import { useGeneralSettings } from '../store/GeneralSettingsContext';
import { cloudBackup } from '../services/cloudBackupService';

// Fix for React 19 type mismatch
const View = RNView as any;
const Text = RNText as any;
const ScrollView = RNScrollView as any;
const TouchableOpacity = RNRTouchableOpacity as any;
const Icon = Ionicons as any;

export default function BackupRestoreScreen() {
    const router = useRouter();
    const { theme, t } = useGeneralSettings();
    const activeColors = theme === 'light' ? LIGHT_COLORS : DARK_COLORS;

    const [loading, setLoading] = useState(false);
    const [googleConnected, setGoogleConnected] = useState(false);
    const [microsoftConnected, setMicrosoftConnected] = useState(false);
    const [lastBackup, setLastBackup] = useState<string | null>(null);

    const handleGoogleLogin = async () => {
        setLoading(true);
        try {
            const success = await cloudBackup.loginGoogle();
            setGoogleConnected(success);
            if (success) {
                Alert.alert(t('success'), t('google_drive_connected') || 'Connected to Google Drive');
            }
        } catch (error) {
            Alert.alert(t('error'), t('login_failed'));
        } finally {
            setLoading(false);
        }
    };

    const handleMicrosoftLogin = async () => {
        setLoading(true);
        try {
            const success = await cloudBackup.loginMicrosoft();
            setMicrosoftConnected(success);
            if (success) {
                Alert.alert(t('success'), t('onedrive_connected') || 'Connected to OneDrive');
            }
        } catch (error) {
            Alert.alert(t('error'), t('login_failed'));
        } finally {
            setLoading(false);
        }
    };

    const handleBackup = async (provider: 'google' | 'microsoft') => {
        setLoading(true);
        try {
            const dbUri = `${FileSystem.documentDirectory}SQLite/gold_estimation.db`;
            const success = provider === 'google'
                ? await cloudBackup.uploadToGoogle(dbUri)
                : await cloudBackup.uploadToOneDrive(dbUri);

            if (success) {
                const now = new Date().toLocaleString();
                setLastBackup(now);
                Alert.alert(t('success'), t('backup_completed') || 'Backup completed successfully');
            } else {
                Alert.alert(t('error'), t('backup_failed'));
            }
        } catch (error) {
            console.error('Backup Error:', error);
            Alert.alert(t('error'), t('backup_failed'));
        } finally {
            setLoading(false);
        }
    };

    const ProviderCard = ({ title, icon, color, isConnected, onLogin, onBackup }: any) => (
        <View style={[styles.card, { backgroundColor: activeColors.cardBg }]}>
            <View style={styles.cardHeader}>
                <View style={[styles.iconContainer, { backgroundColor: color + '20' }]}>
                    <Icon name={icon} size={30} color={color} />
                </View>
                <View style={styles.cardInfo}>
                    <Text style={[styles.cardTitle, { color: activeColors.text }]}>{title}</Text>
                    <Text style={[styles.cardStatus, { color: isConnected ? COLORS.success : activeColors.textLight }]}>
                        {isConnected ? (t('connected') || 'Connected') : (t('not_connected') || 'Not Connected')}
                    </Text>
                </View>
            </View>

            {!isConnected ? (
                <PrimaryButton
                    title={t('login') || 'Login'}
                    onPress={onLogin}
                    isLoading={loading}
                    style={{ marginTop: SPACING.md }}
                />
            ) : (
                <View style={styles.actionRow}>
                    <PrimaryButton
                        title={t('backup_now') || 'Backup Now'}
                        onPress={onBackup}
                        isLoading={loading}
                        style={{ flex: 1, marginRight: SPACING.sm }}
                    />
                </View>
            )}
        </View>
    );

    return (
        <ScreenContainer backgroundColor={activeColors.background}>
            <HeaderBar title={t('backup_restore') || 'Backup & Restore'} />
            <ScrollView contentContainerStyle={styles.container}>
                <View style={styles.infoSection}>
                    <Icon name="cloud-upload-outline" size={60} color={activeColors.primary} />
                    <Text style={[styles.infoTitle, { color: activeColors.text }]}>{t('cloud_backup') || 'Cloud Backup'}</Text>
                    <Text style={[styles.infoDesc, { color: activeColors.textLight }]}>
                        {t('backup_description') || 'Securely backup your database to Google Drive or OneDrive to prevent data loss.'}
                    </Text>
                    {lastBackup && (
                        <Text style={[styles.lastBackup, { color: activeColors.primary }]}>
                            {t('last_backup') || 'Last Backup'}: {lastBackup}
                        </Text>
                    )}
                </View>

                <ProviderCard
                    title="Google Drive"
                    icon="logo-google"
                    color="#4285F4"
                    isConnected={googleConnected}
                    onLogin={handleGoogleLogin}
                    onBackup={() => handleBackup('google')}
                />

                <ProviderCard
                    title="OneDrive"
                    icon="logo-windows"
                    color="#0067B8"
                    isConnected={microsoftConnected}
                    onLogin={handleMicrosoftLogin}
                    onBackup={() => handleBackup('microsoft')}
                />

                <View style={[styles.warningSection, { backgroundColor: activeColors.error + '10' }]}>
                    <Icon name="warning-outline" size={20} color={activeColors.error} />
                    <Text style={[styles.warningText, { color: activeColors.error }]}>
                        {t('backup_warning') || 'Make sure you have a stable internet connection before performing a backup.'}
                    </Text>
                </View>
            </ScrollView>

            {loading && (
                <View style={styles.overlay}>
                    <ActivityIndicator size="large" color={activeColors.primary} />
                    <Text style={[styles.loadingText, { color: COLORS.white }]}>{t('processing')}</Text>
                </View>
            )}
        </ScreenContainer>
    );
}

const styles = StyleSheet.create({
    container: {
        padding: SPACING.lg,
    },
    infoSection: {
        alignItems: 'center',
        marginBottom: SPACING.xl,
        paddingTop: SPACING.md,
    },
    infoTitle: {
        fontSize: FONT_SIZES.xl,
        fontWeight: 'bold',
        marginTop: SPACING.md,
    },
    infoDesc: {
        fontSize: FONT_SIZES.md,
        textAlign: 'center',
        marginTop: SPACING.sm,
        paddingHorizontal: SPACING.lg,
    },
    lastBackup: {
        fontSize: FONT_SIZES.sm,
        fontWeight: '600',
        marginTop: SPACING.md,
    },
    card: {
        borderRadius: BORDER_RADIUS.lg,
        padding: SPACING.lg,
        marginBottom: SPACING.lg,
        elevation: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
    },
    cardHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: SPACING.md,
    },
    iconContainer: {
        width: 60,
        height: 60,
        borderRadius: 30,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: SPACING.md,
    },
    cardInfo: {
        flex: 1,
    },
    cardTitle: {
        fontSize: FONT_SIZES.lg,
        fontWeight: 'bold',
    },
    cardStatus: {
        fontSize: FONT_SIZES.sm,
        marginTop: 2,
    },
    actionRow: {
        flexDirection: 'row',
        marginTop: SPACING.sm,
    },
    warningSection: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: SPACING.md,
        borderRadius: BORDER_RADIUS.md,
        marginTop: SPACING.md,
    },
    warningText: {
        flex: 1,
        fontSize: FONT_SIZES.xs,
        marginLeft: SPACING.sm,
    },
    overlay: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 1000,
    },
    loadingText: {
        marginTop: SPACING.md,
        fontSize: FONT_SIZES.md,
        fontWeight: '600',
    }
});
