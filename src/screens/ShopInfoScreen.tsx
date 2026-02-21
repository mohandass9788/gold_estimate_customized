import React, { useState, useEffect } from 'react';
import { View as RNView, Text as RNText, StyleSheet, ScrollView as RNScrollView, Alert, TouchableWithoutFeedback as RNRTouchableWithoutFeedback, Keyboard, Platform } from 'react-native';
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

export default function ShopInfoScreen() {
    const router = useRouter();
    const { theme, t, shopDetails, updateShopDetails, deviceName, updateDeviceName } = useGeneralSettings();
    const activeColors = theme === 'light' ? LIGHT_COLORS : DARK_COLORS;

    const [shopName, setShopName] = useState(shopDetails.name);
    const [shopAddress, setShopAddress] = useState(shopDetails.address);
    const [shopPhone, setShopPhone] = useState(shopDetails.phone);
    const [shopGst, setShopGst] = useState(shopDetails.gstNumber);
    const [footerMsg, setFooterMsg] = useState(shopDetails.footerMessage);
    const [localDeviceName, setLocalDeviceName] = useState(deviceName);

    const handleSave = () => {
        if (!shopName.trim()) {
            Alert.alert(t('error'), t('shop_name_required') || 'Shop Name is required');
            return;
        }

        updateShopDetails({
            name: shopName,
            address: shopAddress,
            phone: shopPhone,
            gstNumber: shopGst,
            footerMessage: footerMsg
        });
        updateDeviceName(localDeviceName);

        Alert.alert(t('success'), t('settings_saved'), [
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
                    </View>

                    <View style={[styles.section, { backgroundColor: activeColors.cardBg }]}>
                        <Text style={[styles.sectionTitle, { color: activeColors.primary }]}>{t('contact_tax') || 'Contact & Tax'}</Text>
                        <InputField
                            label={t('phone_number')}
                            placeholder="Enter Phone Number"
                            value={shopPhone}
                            onChangeText={setShopPhone}
                            keyboardType="phone-pad"
                        />
                        <InputField
                            label="GST Number"
                            placeholder="Enter GST Number"
                            value={shopGst}
                            onChangeText={setShopGst}
                        />
                    </View>

                    <View style={[styles.section, { backgroundColor: activeColors.cardBg }]}>
                        <Text style={[styles.sectionTitle, { color: activeColors.primary }]}>{t('receipt_settings') || 'Receipt Settings'}</Text>
                        <InputField
                            label="Footer Message"
                            placeholder="Thank You message"
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
});
