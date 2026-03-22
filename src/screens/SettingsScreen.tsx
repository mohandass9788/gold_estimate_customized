import { View as RNView, Text as RNText, StyleSheet, TouchableOpacity as RNRTouchableOpacity, ScrollView as RNScrollView, TextInput as RNTextInput, Modal as RNModal, Linking, Image as RNImage, Alert, Platform } from 'react-native';

import { useRouter } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import { Ionicons } from '@expo/vector-icons';
import ScreenContainer from '../components/ScreenContainer';
import HeaderBar from '../components/HeaderBar';
import InputField from '../components/InputField';
import PrimaryButton from '../components/PrimaryButton';
import { COLORS, SPACING, FONT_SIZES, BORDER_RADIUS, LIGHT_COLORS, DARK_COLORS } from '../constants/theme';
import { useAuth } from '../store/AuthContext';
import { useGeneralSettings } from '../store/GeneralSettingsContext';
import CustomAlertModal from '../components/CustomAlertModal';
import React, { useState } from 'react';
import CategoryManagementModal from '../modals/CategoryManagementModal';

import { setSetting, getSetting } from '../services/dbService';
import { BASE_URL } from '../constants/config';

// Fix for React 19 type mismatch
// Fix for React 19 type mismatch
const View = RNView as any;
const Text = RNText as any;
const ScrollView = RNScrollView as any;
const TouchableOpacity = RNRTouchableOpacity as any;
const Icon = Ionicons as any;
const TextInput = RNTextInput as any;
const Modal = RNModal as any;
const Image = RNImage as any;

export default function SettingsScreen() {
    const router = useRouter();
    const { logout, isSuperAdmin, currentUser } = useAuth();
    const { theme, toggleTheme, language, setLanguage, t, shopDetails, updateShopDetails, deviceName, updateDeviceName, deviceId, updateDeviceId, serverApiUrl, updateServerApiUrl, receiptConfig, updateReceiptConfig } = useGeneralSettings();
    const { isBiometricSupported, isBiometricEnabled, setIsBiometricEnabled } = useAuth();
    const [showEditIdModal, setShowEditIdModal] = useState(false);
    const [showEditServerUrlModal, setShowEditServerUrlModal] = useState(false);
    const [tempDeviceId, setTempDeviceId] = useState('');
    const [tempServerUrl, setTempServerUrl] = useState('');
    const [alertVisible, setAlertVisible] = useState(false);
    const [alertConfig, setAlertConfig] = useState({ title: '', message: '', type: 'info' as any });
    const [isCategoryModalVisible, setIsCategoryModalVisible] = useState(false);



    const activeColors = theme === 'light' ? LIGHT_COLORS : DARK_COLORS;

    const SettingItem = ({ icon, label, onPress, color, rightElement }: any) => (
        <TouchableOpacity style={[styles.item, { borderBottomColor: activeColors.border }]} onPress={onPress}>
            <View style={styles.itemLeft}>
                <Icon name={icon} size={22} color={color || activeColors.primary} />
                <Text style={[styles.itemLabel, { color: activeColors.text }]}>{label}</Text>
            </View>
            <View style={styles.itemRight}>
                {rightElement ? rightElement : <Icon name="chevron-forward" size={20} color={activeColors.textLight} />}
            </View>
        </TouchableOpacity>
    );

    const handleWhatsApp = () => {
        Linking.openURL('whatsapp://send?phone=+919585141535');
    };

    const handleEmail = () => {
        Linking.openURL('mailto:nexooai@gmail.com').catch(() => {
            setAlertConfig({
                title: t('error'),
                message: t('could_not_open_mail'),
                type: 'error'
            });
            setAlertVisible(true);
        });
    };

    const handleCall = () => {
        Linking.openURL('tel:+919585141535');
    };

    const handleOpenPolicy = (type: 'privacy' | 'terms') => {
        router.push({
            pathname: '/settings/legal',
            params: { type }
        } as any);
    };

    return (
        <ScreenContainer backgroundColor={activeColors.background}>
            <HeaderBar title={t('settings')} />
            <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
                <View style={styles.profileSummary}>
                    <View style={[styles.profileAvatar, { backgroundColor: activeColors.primary + '20', overflow: 'hidden' }]}>
                        {shopDetails.appLogo || shopDetails.appIcon ? (
                            <Image source={{ uri: shopDetails.appLogo || shopDetails.appIcon }} style={{ width: '100%', height: '100%' }} />
                        ) : (
                            <Icon name="person" size={40} color={activeColors.primary} />
                        )}
                    </View>
                    <View>
                        <Text style={[styles.shopNameDisplay, { color: activeColors.text }]}>{shopDetails.name || t('admin')}</Text>
                        <Text style={[styles.profileSub, { color: activeColors.textLight }]}>{deviceName ? `${t('id_label') || 'ID:'} ${deviceName}` : t('account_settings')}</Text>
                        <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 4 }}>
                            <Text style={[styles.profileSub, { color: activeColors.textLight, opacity: 0.8, marginRight: 8 }]}>{t('device_id')}: {deviceId || '...'}</Text>
                        </View>
                    </View>
                </View>

                <View style={[styles.section, { backgroundColor: activeColors.cardBg }]}>
                    <Text style={[styles.sectionTitle, { color: activeColors.text }]}>{t('account')}</Text>
                    <SettingItem
                        icon="person-outline"
                        label={t('profile_security')}
                        onPress={() => (router as any).push('/settings/profile')}
                        color="#4A90E2"
                    />
                    <SettingItem
                        icon="calendar-outline"
                        label={t('subscription_status') || 'Subscription Status'}
                        onPress={() => (router as any).push('/settings/subscription')}
                        color="#4E342E"
                        rightElement={
                            <View style={[styles.statusBadge, { backgroundColor: (currentUser?.isSubscriptionValid ? COLORS.success : COLORS.error) + '15' }]}>
                                <Text style={{ color: currentUser?.isSubscriptionValid ? COLORS.success : COLORS.error, fontWeight: 'bold', fontSize: 10 }}>
                                    {currentUser?.isSubscriptionValid ? (t('active') || 'ACTIVE') : (t('expired') || 'EXPIRED')}
                                </Text>
                            </View>
                        }
                    />
                </View>

                <View style={[styles.section, { backgroundColor: activeColors.cardBg }]}>
                    <Text style={[styles.sectionTitle, { color: activeColors.text }]}>{t('business_branding')}</Text>
                    <SettingItem
                        icon="business-outline"
                        label={t('shop_business_settings') || 'Shop & Business Settings'}
                        onPress={() => (router as any).push('/settings/shop-info')}
                        color="#7ED321"
                    />
                </View>

                <View style={[styles.section, { backgroundColor: activeColors.cardBg }]}>
                    <Text style={[styles.sectionTitle, { color: activeColors.text }]}>{t('data_management') || 'Data Management'}</Text>
                    <SettingItem
                        icon="people-circle-outline"
                        label={t('customers') || 'Customer Database'}
                        onPress={() => (router as any).push('/customers')}
                        color="#9013FE"
                    />
                    <SettingItem
                        icon="people-outline"
                        label={t('manage_employees') || 'Manage Employees'}
                        onPress={() => (router as any).push('/settings/employees')}
                        color="#50E3C2"
                    />
                    <SettingItem
                        icon="list-outline"
                        label={t('manage_products')}
                        onPress={() => (router as any).push('/settings/products')}
                        color="#F8E71C"
                    />
                    <SettingItem
                        icon="color-palette-outline"
                        label={t('manage_gold_silver')}
                        onPress={() => (router as any).push('/settings/manage-gold')}
                        color="#D0021B"
                    />
                    <SettingItem
                        icon="folder-open-outline"
                        label={t('manage_purchase_categories') || 'Manage Purchase Categories'}
                        onPress={() => setIsCategoryModalVisible(true)}
                        color="#BD10E0"
                    />
                </View>

                <View style={[styles.section, { backgroundColor: activeColors.cardBg }]}>
                    <Text style={[styles.sectionTitle, { color: activeColors.text }]}>{t('printer_configuration') || 'Printer Configuration'}</Text>
                    <SettingItem
                        icon="bluetooth-outline"
                        label={t('printer_connection')}
                        onPress={() => (router as any).push('/settings/printer-connection')}
                        color="#4A4A4A"
                    />
                    <SettingItem
                        icon="receipt-outline"
                        label={t('print_receipt_configuration')}
                        onPress={() => (router as any).push('/settings/receipt-config')}
                        color="#417505"
                    />
                </View>

                <View style={[styles.section, { backgroundColor: activeColors.cardBg }]}>
                    <Text style={[styles.sectionTitle, { color: activeColors.text }]}>{t('app_configuration')}</Text>
                    <SettingItem
                        icon={theme === 'light' ? "sunny-outline" : "moon-outline"}
                        label={t('theme')}
                        onPress={toggleTheme}
                        color={theme === 'light' ? "#FFB900" : "#5C5C5C"}
                        rightElement={
                            <View style={[styles.toggleBadge, { backgroundColor: activeColors.primary + '15' }]}>
                                <Text style={{ color: activeColors.primary, fontWeight: 'bold', fontSize: 12 }}>
                                    {theme === 'light' ? t('light') : t('dark')}
                                </Text>
                            </View>
                        }
                    />
                    <SettingItem
                        icon="language-outline"
                        label={t('language')}
                        rightElement={
                            <View style={styles.languageContainer}>
                                <TouchableOpacity onPress={() => setLanguage('en')} style={[styles.langBtn, language === 'en' && { backgroundColor: activeColors.primary }]}>
                                    <Text style={[styles.langText, language === 'en' && { color: COLORS.white }]}>EN</Text>
                                </TouchableOpacity>
                                <TouchableOpacity onPress={() => setLanguage('ta')} style={[styles.langBtn, language === 'ta' && { backgroundColor: activeColors.primary }]}>
                                    <Text style={[styles.langText, language === 'ta' && { color: COLORS.white }]}>தமிழ்</Text>
                                </TouchableOpacity>
                            </View>
                        }
                    />
                    {isBiometricSupported && (
                        <SettingItem
                            icon="finger-print-outline"
                            label={t('enable_biometric_login') || 'Enable Biometric Login'}
                            onPress={() => setIsBiometricEnabled(!isBiometricEnabled)}
                            color="#00BCD4"
                            rightElement={
                                <View style={[styles.toggleBadge, { backgroundColor: (isBiometricEnabled ? COLORS.success : activeColors.textLight) + '15' }]}>
                                    <Text style={{ color: isBiometricEnabled ? COLORS.success : activeColors.textLight, fontWeight: 'bold', fontSize: 12 }}>
                                        {isBiometricEnabled ? t('active') || 'ON' : t('inactive') || 'OFF'}
                                    </Text>
                                </View>
                            }
                        />
                    )}
                </View>

                {isSuperAdmin && (
                    <View style={[styles.section, { backgroundColor: activeColors.cardBg }]}>
                        <Text style={[styles.sectionTitle, { color: activeColors.text }]}>{t('super_admin')}</Text>
                        <SettingItem
                            icon="shield-checkmark-outline"
                            label={t('sys_admin_menu')}
                            onPress={() => (router as any).push('/super-admin')}
                            color={activeColors.primary}
                        />
                    </View>
                )}

                <View style={[styles.section, { backgroundColor: activeColors.cardBg }]}>
                    <Text style={[styles.sectionTitle, { color: activeColors.text }]}>{t('system_api_settings') || 'System & API Settings'}</Text>
                    <SettingItem
                        icon="cloud-upload-outline"
                        label={t('backup_restore') || 'Backup & Restore'}
                        onPress={() => (router as any).push('/settings/backup-restore')}
                    />
                    <SettingItem
                        icon="server-outline"
                        label={t('local_server_settings') || 'Local Server Settings'}
                        onPress={() => (router as any).push('/settings/local-server')}
                    />
                </View>

                <View style={[styles.section, { backgroundColor: activeColors.cardBg }]}>
                    <Text style={[styles.sectionTitle, { color: activeColors.text }]}>{t('support')}</Text>
                    <SettingItem
                        icon="help-circle-outline"
                        label={t('help_support')}
                        onPress={() => (router as any).push('/help')}
                        color="#E91E63"
                    />
                </View>

                <View style={[styles.section, { backgroundColor: activeColors.cardBg }]}>
                    <Text style={[styles.sectionTitle, { color: activeColors.text }]}>{t('policies') || 'Policies'}</Text>
                    <SettingItem
                        icon="shield-outline"
                        label={t('privacy_policy') || 'Privacy Policy'}
                        onPress={() => handleOpenPolicy('privacy')}
                        color="#607D8B"
                    />
                    <SettingItem
                        icon="document-text-outline"
                        label={t('terms_conditions') || 'Terms & Conditions'}
                        onPress={() => handleOpenPolicy('terms')}
                        color="#795548"
                    />
                </View>

                <TouchableOpacity
                    style={[styles.logoutBtn, { backgroundColor: activeColors.error + '10', borderColor: activeColors.error }]}
                    onPress={() => {
                        Alert.alert(
                            t('logout_confirm_title') || 'Logout',
                            t('logout_confirm_msg') || 'Are you sure you want to logout?',
                            [
                                { text: t('cancel'), style: 'cancel' },
                                { text: t('confirm'), onPress: logout, style: 'destructive' }
                            ]
                        );
                    }}
                >
                    <Icon name="log-out-outline" size={22} color={activeColors.error} />
                    <Text style={[styles.logoutText, { color: activeColors.error }]}>{t('logout')}</Text>
                </TouchableOpacity>

                <Text style={[styles.version, { color: activeColors.textLight }]}>{t('version')} 1.0.0</Text>
            </ScrollView>


            <Modal
                visible={showEditIdModal}
                transparent={true}
                animationType="fade"
                onRequestClose={() => setShowEditIdModal(false)}
            >
                <View style={styles.modalOverlayCen}>
                    <View style={[styles.modalCard, { backgroundColor: activeColors.cardBg }]}>
                        <View style={styles.modalHeader}>
                            <Text style={[styles.modalTitle, { color: activeColors.text }]}>{t('edit_device_id') || 'Edit Device ID'}</Text>
                            <TouchableOpacity onPress={() => setShowEditIdModal(false)}>
                                <Icon name="close" size={24} color={activeColors.text} />
                            </TouchableOpacity>
                        </View>
                        <Text style={[styles.modalSubtitle, { color: activeColors.textLight }]}>
                            {t('edit_device_id_desc') || 'Manually set a custom Device ID for tracking.'}
                        </Text>
                        <TextInput
                            style={[
                                styles.textInput,
                                {
                                    backgroundColor: activeColors.background,
                                    borderColor: activeColors.border,
                                    color: activeColors.text,
                                }
                            ]}
                            value={tempDeviceId}
                            onChangeText={setTempDeviceId}
                            placeholder={t('enter_device_id') || 'Enter Device ID'}
                            placeholderTextColor={activeColors.textLight}
                        />
                        <View style={styles.modalActions}>
                            <PrimaryButton
                                title={t('cancel')}
                                onPress={() => setShowEditIdModal(false)}
                                style={{ ...styles.modalBtn, backgroundColor: activeColors.border } as any}
                            />
                            <PrimaryButton
                                title={t('save')}
                                onPress={() => {
                                    updateDeviceId(tempDeviceId || '');
                                    setShowEditIdModal(false);
                                }}
                                style={styles.modalBtn as any}
                            />
                        </View>
                    </View>
                </View>
            </Modal>
            <Modal
                visible={showEditServerUrlModal}
                transparent={true}
                animationType="fade"
                onRequestClose={() => setShowEditServerUrlModal(false)}
            >
                <View style={styles.modalOverlayCen}>
                    <View style={[styles.modalCard, { backgroundColor: activeColors.cardBg }]}>
                        <View style={styles.modalHeader}>
                            <Text style={[styles.modalTitle, { color: activeColors.text }]}>{t('server_api_url')}</Text>
                            <TouchableOpacity onPress={() => setShowEditServerUrlModal(false)}>
                                <Icon name="close" size={24} color={activeColors.text} />
                            </TouchableOpacity>
                        </View>
                        <Text style={[styles.modalSubtitle, { color: activeColors.textLight }]}>
                            {t('server_api_desc')}
                        </Text>

                        <View style={styles.urlPreviewContainer}>
                            <Text style={[styles.urlPreviewLabel, { color: activeColors.textLight }]}>{t('current_server_url') || 'Current Server URL:'}</Text>
                            <View style={[styles.urlCard, { backgroundColor: activeColors.background, borderColor: activeColors.border }]}>
                                <Text style={[styles.urlText, { color: activeColors.primary }]} numberOfLines={1}>{serverApiUrl}</Text>
                            </View>
                        </View>

                        <Text style={[styles.inputLabel, { color: activeColors.text }]}>{t('new_server_url') || 'Update Server URL:'}</Text>
                        <TextInput
                            style={[
                                styles.textInput,
                                {
                                    backgroundColor: activeColors.background,
                                    borderColor: activeColors.border,
                                    color: activeColors.text,
                                }
                            ]}
                            value={tempServerUrl}
                            onChangeText={setTempServerUrl}
                            placeholder={t('enter_server_api_url')}
                            placeholderTextColor={activeColors.textLight}
                            autoCapitalize="none"
                            keyboardType="url"
                        />
                        <View style={styles.modalActions}>
                            <PrimaryButton
                                title={t('cancel')}
                                onPress={() => setShowEditServerUrlModal(false)}
                                style={{ ...styles.modalBtn, backgroundColor: activeColors.border } as any}
                            />
                            <PrimaryButton
                                title={t('save')}
                                onPress={() => {
                                    updateServerApiUrl(tempServerUrl);
                                    setShowEditServerUrlModal(false);
                                }}
                                style={styles.modalBtn as any}
                            />
                        </View>
                    </View>
                </View>
            </Modal>

            <CustomAlertModal
                visible={alertVisible}
                title={alertConfig.title}
                message={alertConfig.message}
                type={alertConfig.type}
                theme={theme as 'light' | 'dark'}
                onClose={() => setAlertVisible(false)}
                t={t}
            />
            <CategoryManagementModal
                visible={isCategoryModalVisible}
                onClose={() => setIsCategoryModalVisible(false)}
            />
        </ScreenContainer>
    );
}

const styles = StyleSheet.create({
    content: {
        flex: 1,
        padding: SPACING.md,
    },
    profileSummary: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: SPACING.xl,
        paddingHorizontal: SPACING.sm,
        marginBottom: SPACING.md,
    },
    profileAvatar: {
        width: 70,
        height: 70,
        borderRadius: 35,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: SPACING.lg,
    },
    shopNameDisplay: {
        fontSize: FONT_SIZES.xl,
        fontWeight: 'bold',
    },
    profileSub: {
        fontSize: FONT_SIZES.sm,
        marginTop: 2,
    },
    section: {
        borderRadius: BORDER_RADIUS.lg,
        padding: SPACING.sm,
        marginBottom: SPACING.lg,
        elevation: 3,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
    },
    sectionTitle: {
        fontSize: FONT_SIZES.xs,
        fontWeight: 'bold',
        marginLeft: SPACING.md,
        marginBottom: SPACING.xs,
        marginTop: SPACING.sm,
        textTransform: 'uppercase',
        letterSpacing: 1.5,
    },
    item: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: SPACING.md,
    },
    itemLeft: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    itemRight: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    itemLabel: {
        fontSize: FONT_SIZES.md,
        marginLeft: SPACING.md,
        fontWeight: '500',
    },
    toggleBadge: {
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 12,
    },
    statusBadge: {
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 12,
    },
    languageContainer: {
        flexDirection: 'row',
        backgroundColor: '#F0F0F0',
        borderRadius: 20,
        padding: 3,
    },
    langBtn: {
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 18,
    },
    langBtnActive: {
        backgroundColor: '#FFFFFF',
    },
    langText: {
        fontSize: 12,
        fontWeight: 'bold',
        color: '#666',
    },
    langTextActive: {
        color: '#D4AF37',
    },
    logoutBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        padding: SPACING.md,
        borderRadius: BORDER_RADIUS.md,
        borderWidth: 1,
        marginTop: SPACING.md,
        marginBottom: SPACING.xl,
    },
    logoutText: {
        marginLeft: SPACING.sm,
        fontSize: FONT_SIZES.md,
        fontWeight: 'bold',
    },
    version: {
        textAlign: 'center',
        marginTop: SPACING.lg,
        fontSize: FONT_SIZES.xs,
        marginBottom: 80,
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.6)',
        justifyContent: 'flex-end',
    },
    modalContent: {
        borderTopLeftRadius: 30,
        borderTopRightRadius: 30,
        padding: SPACING.lg,
        paddingBottom: SPACING.xl * 2,
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: SPACING.lg,
    },
    modalTitle: {
        fontSize: FONT_SIZES.xl,
        fontWeight: 'bold',
    },
    modalSubtitle: {
        fontSize: FONT_SIZES.sm,
        marginBottom: SPACING.lg,
    },
    contactItem: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: SPACING.md,
        borderWidth: 1,
        borderRadius: BORDER_RADIUS.md,
        marginBottom: SPACING.md,
    },
    contactLeft: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    contactInfo: {
        marginLeft: SPACING.md,
    },
    contactLabel: {
        fontSize: FONT_SIZES.xs,
    },
    contactValue: {
        fontSize: FONT_SIZES.md,
        fontWeight: 'bold',
    },
    modalOverlayCen: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.6)',
        justifyContent: 'center',
        padding: SPACING.lg,
    },
    modalCard: {
        borderRadius: BORDER_RADIUS.lg,
        padding: SPACING.lg,
        elevation: 5,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 3.84,
    },
    textInput: {
        borderWidth: 1,
        borderRadius: BORDER_RADIUS.md,
        padding: SPACING.md,
        fontSize: FONT_SIZES.md,
        marginBottom: SPACING.lg,
    },
    modalActions: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginTop: SPACING.sm,
    },
    modalBtn: {
        flex: 1,
        marginHorizontal: SPACING.xs,
    },
    urlPreviewContainer: {
        marginBottom: SPACING.lg,
    },
    urlPreviewLabel: {
        fontSize: FONT_SIZES.xs,
        marginBottom: SPACING.xs,
        fontWeight: 'bold',
    },
    urlCard: {
        padding: SPACING.md,
        borderRadius: BORDER_RADIUS.md,
        borderWidth: 1,
    },
    urlText: {
        fontSize: FONT_SIZES.sm,
        fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    },
    inputLabel: {
        fontSize: FONT_SIZES.sm,
        fontWeight: 'bold',
        marginBottom: SPACING.xs,
    }
});
