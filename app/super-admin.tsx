import React, { useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import ScreenContainer from '../src/components/ScreenContainer';
import HeaderBar from '../src/components/HeaderBar';
import { COLORS, SPACING, FONT_SIZES, BORDER_RADIUS, LIGHT_COLORS, DARK_COLORS } from '../src/constants/theme';
import { useAuth } from '../src/store/AuthContext';
import { useGeneralSettings } from '../src/store/GeneralSettingsContext';

const Icon = Ionicons as any;

export default function SuperAdminScreen() {
    const router = useRouter();
    const { isSuperAdmin } = useAuth();
    const { theme, t, featureFlags, updateFeatureFlags } = useGeneralSettings();
    const activeColors = theme === 'light' ? LIGHT_COLORS : DARK_COLORS;

    useEffect(() => {
        if (!isSuperAdmin) {
            router.replace('/(tabs)/');
        }
    }, [isSuperAdmin, router]);

    const handleToggle = (key: keyof typeof featureFlags) => {
        updateFeatureFlags({ [key]: !featureFlags[key] });
    };

    const FeatureToggle = ({ label, value, onToggle, icon }: any) => (
        <View style={[styles.card, { backgroundColor: activeColors.cardBg, borderColor: activeColors.border }]}>
            <View style={styles.cardLeft}>
                <Icon name={icon} size={24} color={activeColors.primary} />
                <Text style={[styles.cardLabel, { color: activeColors.text }]}>{label}</Text>
            </View>
            <Text style={[styles.cardAction, { color: activeColors.primary }]} onPress={onToggle}>
                {value ? 'On' : 'Off'}
            </Text>
        </View>
    );

    return (
        <ScreenContainer backgroundColor={activeColors.background}>
            <HeaderBar title={t('super_admin')} showBack />
            <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 40 }}>
                <View style={styles.section}>
                    <Text style={[styles.sectionTitle, { color: activeColors.primary }]}>{t('feature_management')}</Text>
                    <FeatureToggle label={t('enable_purchase')} value={featureFlags.isPurchaseEnabled} onToggle={() => handleToggle('isPurchaseEnabled')} icon="cart-outline" />
                    <FeatureToggle label={t('enable_chit')} value={featureFlags.isChitEnabled} onToggle={() => handleToggle('isChitEnabled')} icon="wallet-outline" />
                    <FeatureToggle label={t('enable_advance')} value={featureFlags.isAdvanceEnabled} onToggle={() => handleToggle('isAdvanceEnabled')} icon="cash-outline" />
                    <FeatureToggle label={t('enable_repair')} value={featureFlags.isRepairEnabled} onToggle={() => handleToggle('isRepairEnabled')} icon="construct-outline" />
                </View>

                <View style={styles.section}>
                    <Text style={[styles.sectionTitle, { color: activeColors.primary }]}>{t('manage_users')}</Text>
                    <View style={[styles.card, { backgroundColor: activeColors.cardBg, borderColor: activeColors.border, opacity: 0.85 }]}>
                        <View style={styles.cardLeft}>
                            <Icon name="cloud-outline" size={24} color={activeColors.primary} />
                            <Text style={[styles.cardLabel, { color: activeColors.text }]}>User management is server-based and no longer uses the local database.</Text>
                        </View>
                    </View>
                </View>
            </ScrollView>
        </ScreenContainer>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        padding: SPACING.md,
    },
    section: {
        marginBottom: SPACING.xl,
    },
    sectionTitle: {
        fontSize: FONT_SIZES.sm,
        fontWeight: 'bold',
        marginBottom: SPACING.md,
        textTransform: 'uppercase',
        letterSpacing: 1,
        marginLeft: SPACING.xs,
    },
    card: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: SPACING.md,
        borderRadius: BORDER_RADIUS.md,
        borderWidth: 1,
        marginBottom: SPACING.sm,
        elevation: 2,
    },
    cardLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
        paddingRight: SPACING.md,
    },
    cardLabel: {
        fontSize: FONT_SIZES.md,
        marginLeft: SPACING.md,
        fontWeight: '500',
        flexShrink: 1,
    },
    cardAction: {
        fontSize: FONT_SIZES.sm,
        fontWeight: '700',
    },
});
