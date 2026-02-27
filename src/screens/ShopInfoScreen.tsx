import React, { useState, useEffect } from 'react';
import { View as RNView, Text as RNText, StyleSheet, ScrollView as RNScrollView, Alert, TouchableWithoutFeedback as RNRTouchableWithoutFeedback, Keyboard, Platform, Image as RNImage, TouchableOpacity as RNRTouchableOpacity } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import ScreenContainer from '../components/ScreenContainer';
import HeaderBar from '../components/HeaderBar';
import InputField from '../components/InputField';
import PrimaryButton from '../components/PrimaryButton';
import { COLORS, SPACING, FONT_SIZES, BORDER_RADIUS, LIGHT_COLORS, DARK_COLORS } from '../constants/theme';
import { useGeneralSettings } from '../store/GeneralSettingsContext';
import { useRouter } from 'expo-router';

// Fix for React 19 type mismatch
const View = RNView as any;
const Text = RNText as any;
const ScrollView = RNScrollView as any;
const TouchableWithoutFeedback = RNRTouchableWithoutFeedback as any;
const Image = RNImage as any;
const TouchableOpacity = RNRTouchableOpacity as any;

export default function ShopInfoScreen() {
    const router = useRouter();
    const { theme, t, showAlert, shopDetails, updateShopDetails, deviceName, updateDeviceName } = useGeneralSettings();
    const activeColors = theme === 'light' ? LIGHT_COLORS : DARK_COLORS;

    const [shopName, setShopName] = useState(shopDetails.name);
    const [shopAddress, setShopAddress] = useState(shopDetails.address);
    const [shopPhone, setShopPhone] = useState(shopDetails.phone);
    const [shopGst, setShopGst] = useState(shopDetails.gstNumber);
    const [footerMsg, setFooterMsg] = useState(shopDetails.footerMessage);
    const [localDeviceName, setLocalDeviceName] = useState(deviceName);
    const [logoUri, setLogoUri] = useState(shopDetails.appLogo);
    const [iconUri, setIconUri] = useState(shopDetails.appIcon);
    const [splashUri, setSplashUri] = useState(shopDetails.splashImage);

    const pickImage = async (type: 'logo' | 'icon' | 'splash') => {
        let aspect: [number, number] = [1, 1];
        if (type === 'splash') aspect = [9, 16];

        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: 'images',
            allowsEditing: true,
            aspect,
            quality: 0.8,
        });

        if (!result.canceled) {
            if (type === 'logo') setLogoUri(result.assets[0].uri);
            else if (type === 'icon') setIconUri(result.assets[0].uri);
            else if (type === 'splash') setSplashUri(result.assets[0].uri);
        }
    };

    const handleSave = () => {
        if (!shopName.trim()) {
            showAlert(t('error'), t('shop_name_required') || 'Shop Name is required', 'error');
            return;
        }

        updateShopDetails({
            name: shopName,
            address: shopAddress,
            phone: shopPhone,
            gstNumber: shopGst,
            footerMessage: footerMsg,
            appLogo: logoUri,
            appIcon: iconUri,
            splashImage: splashUri
        });
        updateDeviceName(localDeviceName);

        showAlert(t('success'), t('settings_saved'), 'success', [
            { text: 'OK', onPress: () => router.back() }
        ]);
    };

    return (
        <ScreenContainer backgroundColor={activeColors.background}>
            <HeaderBar title={t('business_info')} showBack />
            <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
                <ScrollView
                    style={styles.container}
                    contentContainerStyle={styles.scrollContent}
                    keyboardShouldPersistTaps="handled"
                    showsVerticalScrollIndicator={false}
                >
                    <View style={[styles.section, { backgroundColor: activeColors.cardBg }]}>
                        <Text style={[styles.sectionTitle, { color: activeColors.primary }]}>{t('basic_branding') || 'Basic Branding'}</Text>
                        <InputField
                            label={t('shop_name')}
                            placeholder={t('enter_shop_name')}
                            value={shopName}
                            onChangeText={setShopName}
                        />
                        <InputField
                            label={t('shop_address')}
                            placeholder={t('enter_shop_address')}
                            value={shopAddress}
                            onChangeText={setShopAddress}
                            multiline
                        />

                        <View style={styles.logoSection}>
                            <Text style={[styles.fieldLabel, { color: activeColors.text }]}>{t('business_logo') || 'Business Logo'}</Text>
                            <TouchableOpacity onPress={() => pickImage('logo')} style={[styles.logoPicker, { borderColor: activeColors.border, backgroundColor: activeColors.background }]}>
                                {logoUri ? (
                                    <Image source={{ uri: logoUri }} style={styles.logoPreview} />
                                ) : (
                                    <View style={styles.logoPlaceholder}>
                                        <Text style={{ color: activeColors.textLight }}>{t('select_logo')}</Text>
                                    </View>
                                )}
                            </TouchableOpacity>
                            <Text style={styles.helperText}>{t('logo_helper_text')}</Text>
                        </View>

                        <View style={{ flexDirection: 'row', gap: SPACING.md, marginTop: SPACING.md }}>
                            <View style={{ flex: 1 }}>
                                <Text style={[styles.fieldLabel, { color: activeColors.text }]}>{t('app_icon') || 'App Icon'}</Text>
                                <TouchableOpacity onPress={() => pickImage('icon')} style={[styles.logoPicker, { width: '100%', borderColor: activeColors.border, backgroundColor: activeColors.background }]}>
                                    {iconUri ? (
                                        <Image source={{ uri: iconUri }} style={styles.logoPreview} />
                                    ) : (
                                        <View style={styles.logoPlaceholder}>
                                            <Text style={{ color: activeColors.textLight }}>{t('logo_size_hint')}</Text>
                                        </View>
                                    )}
                                </TouchableOpacity>
                            </View>

                            <View style={{ flex: 1 }}>
                                <Text style={[styles.fieldLabel, { color: activeColors.text }]}>{t('splash_image') || 'Splash Image'}</Text>
                                <TouchableOpacity onPress={() => pickImage('splash')} style={[styles.logoPicker, { width: '100%', borderColor: activeColors.border, backgroundColor: activeColors.background }]}>
                                    {splashUri ? (
                                        <Image source={{ uri: splashUri }} style={styles.logoPreview} />
                                    ) : (
                                        <View style={styles.logoPlaceholder}>
                                            <Text style={{ color: activeColors.textLight }}>{t('splash_size_hint')}</Text>
                                        </View>
                                    )}
                                </TouchableOpacity>
                            </View>
                        </View>
                    </View>

                    <View style={[styles.section, { backgroundColor: activeColors.cardBg }]}>
                        <Text style={[styles.sectionTitle, { color: activeColors.primary }]}>{t('contact_tax') || 'Contact & Tax'}</Text>
                        <InputField
                            label={t('phone_number')}
                            placeholder={t('enter_phone')}
                            value={shopPhone}
                            onChangeText={setShopPhone}
                            keyboardType="phone-pad"
                        />
                        <InputField
                            label={t('gst_number')}
                            placeholder={t('enter_gst')}
                            value={shopGst}
                            onChangeText={setShopGst}
                        />
                    </View>

                    <View style={[styles.section, { backgroundColor: activeColors.cardBg }]}>
                        <Text style={[styles.sectionTitle, { color: activeColors.primary }]}>{t('receipt_settings') || 'Receipt Settings'}</Text>
                        <InputField
                            label={t('footer_message')}
                            placeholder={t('thank_you_msg')}
                            value={footerMsg}
                            onChangeText={setFooterMsg}
                        />
                        <InputField
                            label={t('device_name') || 'Device Name / Hardware ID'}
                            placeholder={t('enter_device_name')}
                            value={localDeviceName}
                            onChangeText={setLocalDeviceName}
                            helperText="This persists across uninstalls and links to this hardware."
                        />
                    </View>

                    <PrimaryButton
                        title={t('save')}
                        onPress={handleSave}
                        style={styles.saveButton}
                    />
                </ScrollView>
            </TouchableWithoutFeedback>
        </ScreenContainer>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    scrollContent: {
        padding: SPACING.md,
        paddingBottom: SPACING.xl * 2,
    },
    section: {
        padding: SPACING.md,
        borderRadius: BORDER_RADIUS.md,
        elevation: 2,
        marginBottom: SPACING.lg,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
    },
    sectionTitle: {
        fontSize: FONT_SIZES.md,
        fontWeight: 'bold',
        marginBottom: SPACING.lg,
        textTransform: 'uppercase',
        letterSpacing: 1,
    },
    saveButton: {
        marginTop: SPACING.sm,
        marginBottom: SPACING.xl,
    },
    logoSection: {
        marginTop: SPACING.md,
    },
    fieldLabel: {
        fontSize: FONT_SIZES.sm,
        fontWeight: '600',
        marginBottom: SPACING.xs,
    },
    logoPicker: {
        width: 100,
        height: 100,
        borderRadius: BORDER_RADIUS.md,
        borderWidth: 1,
        borderStyle: 'dashed',
        justifyContent: 'center',
        alignItems: 'center',
        overflow: 'hidden',
    },
    logoPreview: {
        width: '100%',
        height: '100%',
    },
    logoPlaceholder: {
        justifyContent: 'center',
        alignItems: 'center',
    },
    helperText: {
        fontSize: 10,
        color: COLORS.textLight,
        marginTop: 4,
    }
});
