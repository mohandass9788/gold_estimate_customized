import { View as RNView, Text as RNText, StyleSheet, TouchableOpacity as RNRTouchableOpacity, ScrollView as RNScrollView, TextInput as RNTextInput, Modal as RNModal, Linking, Image as RNImage, Alert } from 'react-native';

import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import ScreenContainer from '../components/ScreenContainer';
import HeaderBar from '../components/HeaderBar';
import InputField from '../components/InputField';
import PrimaryButton from '../components/PrimaryButton';
import { COLORS, SPACING, FONT_SIZES, BORDER_RADIUS, LIGHT_COLORS, DARK_COLORS } from '../constants/theme';
import { useAuth } from '../store/AuthContext';
import { useGeneralSettings } from '../store/GeneralSettingsContext';
import React, { useState } from 'react';

import { setSetting, getSetting } from '../services/dbService';

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
    const { logout, isSuperAdmin } = useAuth();
    const { theme, toggleTheme, language, setLanguage, t, shopDetails, updateShopDetails, deviceName, updateDeviceName, deviceId, updateDeviceId, serverApiUrl, updateServerApiUrl, receiptConfig, updateReceiptConfig } = useGeneralSettings();
    const [showHelpModal, setShowHelpModal] = useState(false);
    const [showEditIdModal, setShowEditIdModal] = useState(false);
    const [showEditServerUrlModal, setShowEditServerUrlModal] = useState(false);
    const [showEditQrUrlModal, setShowEditQrUrlModal] = useState(false);
    const [tempDeviceId, setTempDeviceId] = useState('');
    const [tempServerUrl, setTempServerUrl] = useState('');
    const [tempQrUrl, setTempQrUrl] = useState('');



    const activeColors = theme === 'light' ? LIGHT_COLORS : DARK_COLORS;

    const SettingItem = ({ icon, label, onPress, color = activeColors.text, rightElement }: any) => (
        <TouchableOpacity style={[styles.item, { borderBottomColor: activeColors.border }]} onPress={onPress}>
            <View style={styles.itemLeft}>
                <Icon name={icon} size={22} color={color} />
                <Text style={[styles.itemLabel, { color }]}>{label}</Text>
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
            Alert.alert(t('error'), t('could_not_open_mail'));
        });
    };

    const handleCall = () => {
        Linking.openURL('tel:+919585141535');
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
                        <Text style={[styles.shopNameDisplay, { color: activeColors.text }]}>{shopDetails.name || 'Admin'}</Text>
                        <Text style={[styles.profileSub, { color: activeColors.textLight }]}>{deviceName ? `ID: ${deviceName}` : t('account_settings')}</Text>
                        <TouchableOpacity style={{ flexDirection: 'row', alignItems: 'center', marginTop: 4 }} onPress={() => { setTempDeviceId(deviceId); setShowEditIdModal(true); }}>
                            <Text style={[styles.profileSub, { color: activeColors.textLight, opacity: 0.8, marginRight: 8 }]}>{t('device_id')}: {deviceId || '...'}</Text>
                            <Icon name="pencil-outline" size={14} color={activeColors.primary} />
                        </TouchableOpacity>
                    </View>
                </View>

                <View style={[styles.section, { backgroundColor: activeColors.cardBg }]}>
                    <Text style={[styles.sectionTitle, { color: activeColors.primary }]}>{t('account')}</Text>
                    <SettingItem
                        icon="person-outline"
                        label={t('profile_security')}
                        onPress={() => (router as any).push('/settings/profile')}
                    />
                </View>

                <View style={[styles.section, { backgroundColor: activeColors.cardBg }]}>
                    <Text style={[styles.sectionTitle, { color: activeColors.primary }]}>{t('business_branding')}</Text>
                    <SettingItem
                        icon="business-outline"
                        label={t('shop_business_settings') || 'Shop & Business Settings'}
                        onPress={() => (router as any).push('/settings/shop-info')}
                    />
                </View>

                <View style={[styles.section, { backgroundColor: activeColors.cardBg }]}>
                    <Text style={[styles.sectionTitle, { color: activeColors.primary }]}>{t('app_configuration')}</Text>
                    <SettingItem
                        icon="people-outline"
                        label={t('manage_employees') || 'Manage Employees'}
                        onPress={() => (router as any).push('/settings/employees')}
                    />
                    <SettingItem
                        icon="list-outline"
                        label={t('manage_products')}
                        onPress={() => (router as any).push('/settings/products')}
                    />
                    <SettingItem
                        icon="color-palette-outline"
                        label={t('manage_gold_silver')}
                        onPress={() => (router as any).push('/settings/manage-gold')}
                    />
                    <SettingItem
                        icon="print-outline"
                        label={t('printers_settings')}
                        onPress={() => (router as any).push('/settings/printers')}
                    />
                    <SettingItem
                        icon={theme === 'light' ? "sunny-outline" : "moon-outline"}
                        label={t('theme')}
                        onPress={toggleTheme}
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
                                    <Text style={[styles.langText, language === 'ta' && { color: COLORS.white }]}>த</Text>
                                </TouchableOpacity>
                            </View>
                        }
                    />
                </View>

                <View style={[styles.section, { backgroundColor: activeColors.cardBg }]}>
                    <Text style={[styles.sectionTitle, { color: activeColors.primary }]}>{t('api_settings') || 'API Settings'}</Text>
                    <SettingItem
                        icon="server-outline"
                        label={t('server_api_url')}
                        onPress={() => {
                            setTempServerUrl(serverApiUrl);
                            setShowEditServerUrlModal(true);
                        }}
                    />
                    <SettingItem
                        icon="qr-code-outline"
                        label={t('qr_endpoint_url')}
                        onPress={() => {
                            setTempQrUrl(receiptConfig.qrEndpointUrl || '');
                            setShowEditQrUrlModal(true);
                        }}
                    />
                </View>

                {isSuperAdmin && (
                    <View style={[styles.section, { backgroundColor: activeColors.cardBg }]}>
                        <Text style={[styles.sectionTitle, { color: activeColors.primary }]}>{t('super_admin')}</Text>
                        <SettingItem
                            icon="shield-checkmark-outline"
                            label={t('sys_admin_menu')}
                            onPress={() => (router as any).push('/super-admin')}
                            color={activeColors.primary}
                        />
                    </View>
                )}

                <View style={[styles.section, { backgroundColor: activeColors.cardBg }]}>
                    <Text style={[styles.sectionTitle, { color: activeColors.primary }]}>{t('data_management') || 'Data Management'}</Text>
                    <SettingItem
                        icon="cloud-upload-outline"
                        label={t('backup_restore') || 'Backup & Restore'}
                        onPress={() => (router as any).push('/settings/backup-restore')}
                    />
                </View>

                <View style={[styles.section, { backgroundColor: activeColors.cardBg }]}>
                    <Text style={[styles.sectionTitle, { color: activeColors.primary }]}>{t('support')}</Text>
                    <SettingItem
                        icon="help-circle-outline"
                        label={t('help_support')}
                        onPress={() => setShowHelpModal(true)}
                    />
                </View>

                <TouchableOpacity
                    style={[styles.logoutBtn, { backgroundColor: activeColors.error + '10', borderColor: activeColors.error }]}
                    onPress={() => {
                        logout();
                        router.replace('/login');
                    }}
                >
                    <Icon name="log-out-outline" size={22} color={activeColors.error} />
                    <Text style={[styles.logoutText, { color: activeColors.error }]}>{t('logout')}</Text>
                </TouchableOpacity>

                <Text style={[styles.version, { color: activeColors.textLight }]}>{t('version')} 1.0.0</Text>
            </ScrollView>

            <Modal
                visible={showHelpModal}
                transparent={true}
                animationType="slide"
                onRequestClose={() => setShowHelpModal(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={[styles.modalContent, { backgroundColor: activeColors.cardBg }]}>
                        <View style={styles.modalHeader}>
                            <Text style={[styles.modalTitle, { color: activeColors.text }]}>{t('help_support')}</Text>
                            <TouchableOpacity onPress={() => setShowHelpModal(false)}>
                                <Icon name="close" size={24} color={activeColors.text} />
                            </TouchableOpacity>
                        </View>

                        <Text style={[styles.modalSubtitle, { color: activeColors.textLight }]}>{t('contact_us')}</Text>

                        <TouchableOpacity style={[styles.contactItem, { borderColor: activeColors.border }]} onPress={handleCall}>
                            <View style={styles.contactLeft}>
                                <Icon name="call-outline" size={24} color={activeColors.primary} />
                                <View style={styles.contactInfo}>
                                    <Text style={[styles.contactValue, { color: activeColors.text }]}>+91 95851 41535</Text>
                                </View>
                            </View>
                            <Icon name="chevron-forward" size={20} color={activeColors.textLight} />
                        </TouchableOpacity>

                        <TouchableOpacity style={[styles.contactItem, { borderColor: activeColors.border }]} onPress={handleWhatsApp}>
                            <View style={styles.contactLeft}>
                                <Icon name="logo-whatsapp" size={24} color={COLORS.success} />
                                <View style={styles.contactInfo}>
                                    <Text style={[styles.contactLabel, { color: activeColors.textLight }]}>{t('whatsapp')}</Text>
                                    <Text style={[styles.contactValue, { color: activeColors.text }]}>+91 95851 41535</Text>
                                </View>
                            </View>
                            <Icon name="chevron-forward" size={20} color={activeColors.textLight} />
                        </TouchableOpacity>

                        <TouchableOpacity style={[styles.contactItem, { borderColor: activeColors.border }]} onPress={handleEmail}>
                            <View style={styles.contactLeft}>
                                <Icon name="mail-outline" size={24} color={COLORS.error} />
                                <View style={styles.contactInfo}>
                                    <Text style={[styles.contactLabel, { color: activeColors.textLight }]}>{t('email')}</Text>
                                    <Text style={[styles.contactValue, { color: activeColors.text }]}>nexooai@gmail.com</Text>
                                </View>
                            </View>
                            <Icon name="chevron-forward" size={20} color={activeColors.textLight} />
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>

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
                            placeholder="Enter Device ID"
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

            <Modal
                visible={showEditQrUrlModal}
                transparent={true}
                animationType="fade"
                onRequestClose={() => setShowEditQrUrlModal(false)}
            >
                <View style={styles.modalOverlayCen}>
                    <View style={[styles.modalCard, { backgroundColor: activeColors.cardBg }]}>
                        <View style={styles.modalHeader}>
                            <Text style={[styles.modalTitle, { color: activeColors.text }]}>{t('qr_endpoint_url')}</Text>
                            <TouchableOpacity onPress={() => setShowEditQrUrlModal(false)}>
                                <Icon name="close" size={24} color={activeColors.text} />
                            </TouchableOpacity>
                        </View>
                        <Text style={[styles.modalSubtitle, { color: activeColors.textLight }]}>
                            {t('qr_endpoint_desc')}
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
                            value={tempQrUrl}
                            onChangeText={setTempQrUrl}
                            placeholder={t('enter_qr_endpoint_url')}
                            placeholderTextColor={activeColors.textLight}
                            autoCapitalize="none"
                            keyboardType="url"
                        />
                        <View style={styles.modalActions}>
                            <PrimaryButton
                                title={t('cancel')}
                                onPress={() => setShowEditQrUrlModal(false)}
                                style={{ ...styles.modalBtn, backgroundColor: activeColors.border } as any}
                            />
                            <PrimaryButton
                                title={t('save')}
                                onPress={() => {
                                    updateReceiptConfig({ qrEndpointUrl: tempQrUrl });
                                    setShowEditQrUrlModal(false);
                                }}
                                style={styles.modalBtn as any}
                            />
                        </View>
                    </View>
                </View>
            </Modal>
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
    }
});
