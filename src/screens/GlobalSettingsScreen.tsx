import React, { useState, useEffect } from 'react';
import { View as RNView, Text as RNText, StyleSheet, ScrollView as RNScrollView, Alert, TouchableWithoutFeedback as RNRTouchableWithoutFeedback, Keyboard, Platform, ActivityIndicator as RNActivityIndicator, KeyboardAvoidingView as KeyboardAvoidingViewRN, FlatList as RNFlatList, TextInput as RNTextInput } from 'react-native';
import ScreenContainer from '../components/ScreenContainer';
import HeaderBar from '../components/HeaderBar';
import InputField from '../components/InputField';
import PrimaryButton from '../components/PrimaryButton';
import { COLORS, SPACING, FONT_SIZES, BORDER_RADIUS } from '../constants/theme';
import { getSetting, setSetting } from '../services/dbService';
import { useGeneralSettings } from '../store/GeneralSettingsContext';
import CategoryManagementModal from '../modals/CategoryManagementModal';

const View = RNView as any;
const Text = RNText as any;
const ScrollView = RNScrollView as any;
const TouchableWithoutFeedback = RNRTouchableWithoutFeedback as any;
const TextInput = RNTextInput as any;
const ActivityIndicator = RNActivityIndicator as any;
const KeyboardAvoidingView = KeyboardAvoidingViewRN as any;
const FlatList = RNFlatList as any;

export default function GlobalSettingsScreen() {
    const { t } = useGeneralSettings();
    const [gstPercentage, setGstPercentage] = useState('3');
    const [shopName, setShopName] = useState('');
    const [shopAddress, setShopAddress] = useState('');
    const [isCategoryModalVisible, setIsCategoryModalVisible] = useState(false);

    useEffect(() => {
        const loadSettings = async () => {
            const gst = await getSetting('gst_percentage');
            if (gst) setGstPercentage(gst);

            const name = await getSetting('shop_name');
            if (name) setShopName(name);

            const address = await getSetting('shop_address');
            if (address) setShopAddress(address);
        };
        loadSettings();
    }, []);

    const handleSave = async () => {
        try {
            await setSetting('gst_percentage', gstPercentage);
            await setSetting('shop_name', shopName);
            await setSetting('shop_address', shopAddress);
            Alert.alert(t('success'), t('settings_saved'));
        } catch (error) {
            Alert.alert(t('error'), t('settings_save_failed'));
        }
    };

    return (
        <ScreenContainer>
            <HeaderBar title={t('app_settings')} showBack />
            <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
                <ScrollView style={styles.container}>
                    <View style={styles.section}>
                        <Text style={styles.sectionTitle}>{t('business_info')}</Text>
                        <InputField
                            label={t('shop_name')}
                            value={shopName}
                            onChangeText={setShopName}
                            placeholder={t('enter_shop_name')}
                        />
                        <InputField
                            label={t('shop_address')}
                            value={shopAddress}
                            onChangeText={setShopAddress}
                            placeholder={t('enter_shop_address')}
                            multiline
                        />
                    </View>

                    <View style={styles.section}>
                        <Text style={styles.sectionTitle}>{t('tax_settings')}</Text>
                        <InputField
                            label={t('default_gst')}
                            value={gstPercentage}
                            onChangeText={setGstPercentage}
                            keyboardType="numeric"
                            placeholder="3"
                        />
                    </View>

                    <View style={styles.section}>
                        <Text style={styles.sectionTitle}>{t('product_management')}</Text>
                        <PrimaryButton
                            title={t('manage_purchase_categories')}
                            variant="outline"
                            onPress={() => setIsCategoryModalVisible(true)}
                            style={{ marginTop: SPACING.sm }}
                        />
                    </View>

                    <PrimaryButton
                        title={t('save_settings')}
                        onPress={handleSave}
                        style={styles.saveButton}
                    />
                </ScrollView>
            </TouchableWithoutFeedback>

            <CategoryManagementModal
                visible={isCategoryModalVisible}
                onClose={() => setIsCategoryModalVisible(false)}
            />
        </ScreenContainer>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        padding: SPACING.md,
    },
    section: {
        backgroundColor: COLORS.white,
        padding: SPACING.md,
        borderRadius: BORDER_RADIUS.md,
        elevation: 2,
        marginBottom: SPACING.lg,
    },
    sectionTitle: {
        fontSize: FONT_SIZES.md,
        fontWeight: 'bold',
        color: COLORS.primary,
        marginBottom: SPACING.md,
    },
    infoCard: {
        backgroundColor: COLORS.primary + '10',
        padding: SPACING.md,
        borderRadius: BORDER_RADIUS.md,
        borderWidth: 1,
        borderColor: COLORS.primary + '30',
    },
    infoText: {
        color: COLORS.primary,
        fontSize: FONT_SIZES.sm,
        textAlign: 'center',
        lineHeight: 20,
    },
    saveButton: {
        marginTop: SPACING.lg,
        marginBottom: SPACING.xl,
    },
});
