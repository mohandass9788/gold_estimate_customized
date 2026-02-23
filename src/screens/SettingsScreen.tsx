import { View as RNView, Text as RNText, StyleSheet, TouchableOpacity as RNRTouchableOpacity, ScrollView as RNScrollView, TextInput as RNTextInput, Modal as RNModal, Linking } from 'react-native';

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

export default function SettingsScreen() {
    const router = useRouter();
    const { logout } = useAuth();
    const { theme, toggleTheme, language, setLanguage, t, shopDetails, updateShopDetails, deviceName, updateDeviceName, deviceId } = useGeneralSettings();
    const [showHelpModal, setShowHelpModal] = useState(false);



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
        Linking.openURL('whatsapp://send?phone=+919876543210');
    };

    const handleEmail = () => {
        Linking.openURL('mailto:support@goldestimation.com');
    };

    const handleCall = () => {
        Linking.openURL('tel:+919876543210');
    };

    return (
        <ScreenContainer backgroundColor={activeColors.background}>
            <HeaderBar title={t('settings')} />
            <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
                <View style={styles.profileSummary}>
                    <View style={[styles.profileAvatar, { backgroundColor: activeColors.primary + '20' }]}>
                        <Icon name="person" size={40} color={activeColors.primary} />
                    </View>
                    <View>
                        <Text style={[styles.shopNameDisplay, { color: activeColors.text }]}>{shopDetails.name || 'Admin'}</Text>
                        <Text style={[styles.profileSub, { color: activeColors.textLight }]}>{deviceName ? `ID: ${deviceName}` : t('account_settings')}</Text>
                        <Text style={[styles.profileSub, { color: activeColors.textLight, marginTop: 4, opacity: 0.8 }]}>{t('device_id')}: {deviceId || '...'}</Text>
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
                        label={t('business_info')}
                        onPress={() => (router as any).push('/settings/shop-info')}
                    />
                    <SettingItem
                        icon="image-outline"
                        label={t('shop_info')}
                        onPress={() => (router as any).push('/settings/general')}
                    />
                </View>

                <View style={[styles.section, { backgroundColor: activeColors.cardBg }]}>
                    <Text style={[styles.sectionTitle, { color: activeColors.primary }]}>{t('app_configuration')}</Text>
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
                                    <Text style={[styles.contactLabel, { color: activeColors.textLight }]}>{t('helpline')}</Text>
                                    <Text style={[styles.contactValue, { color: activeColors.text }]}>+91 98765 43210</Text>
                                </View>
                            </View>
                            <Icon name="chevron-forward" size={20} color={activeColors.textLight} />
                        </TouchableOpacity>

                        <TouchableOpacity style={[styles.contactItem, { borderColor: activeColors.border }]} onPress={handleWhatsApp}>
                            <View style={styles.contactLeft}>
                                <Icon name="logo-whatsapp" size={24} color={COLORS.success} />
                                <View style={styles.contactInfo}>
                                    <Text style={[styles.contactLabel, { color: activeColors.textLight }]}>{t('whatsapp')}</Text>
                                    <Text style={[styles.contactValue, { color: activeColors.text }]}>+91 98765 43210</Text>
                                </View>
                            </View>
                            <Icon name="chevron-forward" size={20} color={activeColors.textLight} />
                        </TouchableOpacity>

                        <TouchableOpacity style={[styles.contactItem, { borderColor: activeColors.border }]} onPress={handleEmail}>
                            <View style={styles.contactLeft}>
                                <Icon name="mail-outline" size={24} color={COLORS.error} />
                                <View style={styles.contactInfo}>
                                    <Text style={[styles.contactLabel, { color: activeColors.textLight }]}>{t('email')}</Text>
                                    <Text style={[styles.contactValue, { color: activeColors.text }]}>support@goldestimation.com</Text>
                                </View>
                            </View>
                            <Icon name="chevron-forward" size={20} color={activeColors.textLight} />
                        </TouchableOpacity>
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
    }
});
