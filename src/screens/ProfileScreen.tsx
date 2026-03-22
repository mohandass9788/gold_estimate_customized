import React, { useEffect, useState } from 'react';
import { View as RNView, Text as RNText, StyleSheet, ScrollView as RNScrollView } from 'react-native';
import ScreenContainer from '../components/ScreenContainer';
import HeaderBar from '../components/HeaderBar';
import InputField from '../components/InputField';
import PrimaryButton from '../components/PrimaryButton';
import { COLORS, SPACING, FONT_SIZES, BORDER_RADIUS, LIGHT_COLORS, DARK_COLORS } from '../constants/theme';
import { useAuth } from '../store/AuthContext';
import { useGeneralSettings } from '../store/GeneralSettingsContext';

const View = RNView as any;
const Text = RNText as any;
const ScrollView = RNScrollView as any;

export default function ProfileScreen() {
    const { currentUser, refreshProfile } = useAuth();
    const { t, showAlert, adminPin, updateAdminPin, theme } = useGeneralSettings();
    const activeColors = theme === 'light' ? LIGHT_COLORS : DARK_COLORS;
    const [newAdminPin, setNewAdminPin] = useState('');
    const [isPinLoading, setIsPinLoading] = useState(false);

    useEffect(() => {
        refreshProfile().catch((e) => console.error('Failed to refresh profile', e));
    }, [refreshProfile]);

    useEffect(() => {
        if (adminPin) {
            setNewAdminPin(adminPin);
        }
    }, [adminPin]);

    const handleUpdatePin = async () => {
        if (!newAdminPin || newAdminPin.length < 4) {
            showAlert('Error', 'PIN must be at least 4 digits', 'error');
            return;
        }

        setIsPinLoading(true);
        try {
            await updateAdminPin(newAdminPin);
            showAlert('Success', 'Admin PIN updated successfully', 'success');
        } catch {
            showAlert('Error', 'Failed to update PIN', 'error');
        } finally {
            setIsPinLoading(false);
        }
    };

    return (
        <ScreenContainer backgroundColor={activeColors.background}>
            <HeaderBar title={t('profile_settings')} showBack />
            <ScrollView style={styles.content} contentContainerStyle={styles.scrollContent}>
                <View style={[styles.card, { backgroundColor: activeColors.cardBg }]}>
                    <Text style={styles.sectionTitle}>{t('account_info')}</Text>

                    <View style={styles.infoRow}>
                        <Text style={[styles.infoLabel, { color: activeColors.textLight }]}>{t('username_label')}</Text>
                        <Text style={[styles.infoValue, { color: activeColors.text }]}>{currentUser?.username || currentUser?.name || '-'}</Text>
                    </View>

                    <View style={styles.infoRow}>
                        <Text style={[styles.infoLabel, { color: activeColors.textLight }]}>Email</Text>
                        <Text style={[styles.infoValue, { color: activeColors.text }]}>{currentUser?.email || '-'}</Text>
                    </View>

                    <View style={styles.infoRow}>
                        <Text style={[styles.infoLabel, { color: activeColors.textLight }]}>Phone</Text>
                        <Text style={[styles.infoValue, { color: activeColors.text }]}>{currentUser?.phone || '-'}</Text>
                    </View>

                    <Text style={[styles.helperText, { color: activeColors.textLight }]}>Account details are loaded from the server session.</Text>
                </View>

                <View style={[styles.card, { marginTop: SPACING.lg, backgroundColor: activeColors.cardBg }]}>
                    <Text style={[styles.sectionTitle, { color: activeColors.primary }]}>{t('security_settings')}</Text>
                    <Text style={[styles.helperText, { color: activeColors.textLight }]}>{t('admin_pin_helper')}</Text>

                    <InputField
                        label={t('new_admin_pin')}
                        value={newAdminPin}
                        onChangeText={setNewAdminPin}
                        placeholder={t('enter_new_pin')}
                        keyboardType="numeric"
                        maxLength={6}
                        secureTextEntry
                    />

                    <PrimaryButton
                        title={isPinLoading ? 'Updating PIN...' : 'Update PIN'}
                        onPress={handleUpdatePin}
                        style={styles.button}
                    />
                </View>
            </ScrollView>
        </ScreenContainer>
    );
}

const styles = StyleSheet.create({
    content: {
        flex: 1,
    },
    scrollContent: {
        padding: SPACING.md,
    },
    card: {
        backgroundColor: COLORS.white,
        padding: SPACING.md,
        borderRadius: BORDER_RADIUS.md,
        elevation: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
    },
    sectionTitle: {
        fontSize: FONT_SIZES.lg,
        fontWeight: 'bold',
        color: COLORS.primary,
        marginBottom: SPACING.md,
    },
    helperText: {
        fontSize: FONT_SIZES.xs,
        color: COLORS.textLight,
        marginBottom: SPACING.md,
    },
    infoRow: {
        marginBottom: SPACING.md,
    },
    infoLabel: {
        fontSize: FONT_SIZES.xs,
        color: COLORS.textLight,
        marginBottom: 4,
    },
    infoValue: {
        fontSize: FONT_SIZES.md,
        color: COLORS.text,
        fontWeight: '600',
    },
    button: {
        marginTop: SPACING.lg,
    },
    trialBadge: {
        marginTop: SPACING.md,
        padding: 8,
        borderRadius: BORDER_RADIUS.md,
        alignItems: 'center',
    },
    trialText: {
        fontSize: FONT_SIZES.sm,
        fontWeight: 'bold',
    }
});
