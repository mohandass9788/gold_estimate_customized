import React, { useEffect, useState } from 'react';
import { View as RNView, Text as RNText, StyleSheet, ScrollView as RNScrollView, RefreshControl, TouchableOpacity as RNTouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import ScreenContainer from '../../components/ScreenContainer';
import HeaderBar from '../../components/HeaderBar';
import { COLORS, SPACING, FONT_SIZES, BORDER_RADIUS, LIGHT_COLORS, DARK_COLORS } from '../../constants/theme';
import { useAuth } from '../../store/AuthContext';
import { useGeneralSettings } from '../../store/GeneralSettingsContext';
import { sendLocalTestNotification } from '../../services/notificationService';

const View = RNView as any;
const Text = RNText as any;
const ScrollView = RNScrollView as any;
const Icon = Ionicons as any;
const TouchableOpacity = RNTouchableOpacity as any;

export default function SubscriptionStatusScreen() {
    const { currentUser, refreshProfile } = useAuth();
    const { t, theme, featureFlags } = useGeneralSettings();
    const router = useRouter();
    const activeColors = theme === 'light' ? LIGHT_COLORS : DARK_COLORS;
    const [refreshing, setRefreshing] = useState(false);

    const handleTestNotification = async () => {
        await sendLocalTestNotification();
    };

    const onRefresh = async () => {
        setRefreshing(true);
        await refreshProfile();
        setRefreshing(false);
    };

    useEffect(() => {
        onRefresh();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const features = featureFlags || {};
    const featureList = [
        { key: 'isChitEnabled', label: t('chit') || 'Chit / Scheme', icon: 'receipt-outline' },
        { key: 'isPurchaseEnabled', label: t('purchase') || 'Purchase / Buyback', icon: 'cart-outline' },
        { key: 'isEstimationEnabled', label: t('estimation') || 'Estimation / Sales', icon: 'calculator-outline' },
        { key: 'isAdvanceEnabled', label: t('advance') || 'Advance Booking', icon: 'wallet-outline' },
        { key: 'isRepairEnabled', label: t('repairs') || 'Repairs & Service', icon: 'construct-outline' },
    ];

    const getStatusLabel = () => {
        const normalizedStatus = (currentUser?.status || '').toLowerCase();

        if (normalizedStatus.includes('trial')) {
            return t('active_trial') || 'Active Trial';
        }

        if (currentUser?.isSubscriptionValid) {
            return t('active') || 'Active';
        }

        return t('expired') || 'Expired';
    };

    const formatDate = (dateString?: string) => {
        if (!dateString) return '-';
        return new Date(dateString).toLocaleDateString(undefined, {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
    };

    return (
        <ScreenContainer backgroundColor={activeColors.background}>
            <HeaderBar title={t('subscription_status') || 'Subscription'} showBack />
            
            <ScrollView 
                style={styles.content} 
                contentContainerStyle={styles.scrollContent}
                refreshControl={
                    <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
                }
            >
                <View style={[styles.card, { backgroundColor: activeColors.cardBg }]}>
                    <View style={styles.statusHeader}>
                        <View style={[styles.statusIcon, { backgroundColor: (currentUser?.isSubscriptionValid ? COLORS.success : COLORS.error) + '15' }]}>
                            <Icon 
                                name={currentUser?.isSubscriptionValid ? "checkmark-circle" : "alert-circle"} 
                                size={40} 
                                color={currentUser?.isSubscriptionValid ? COLORS.success : COLORS.error} 
                            />
                        </View>
                        <View style={styles.statusTextWrap}>
                            <Text style={[styles.statusTitle, { color: activeColors.text }]}>
                                {getStatusLabel()}
                            </Text>
                            <Text style={[styles.statusSub, { color: activeColors.textLight }]}>
                                {currentUser?.isSubscriptionValid
                                    ? (t('subscription_active_desc') || 'Your subscription is active and all enabled features are available.')
                                    : (t('subscription_expired_desc') || 'Your subscription has expired. Renew your plan to continue using restricted features.')}
                            </Text>
                        </View>
                    </View>

                    <View style={styles.divider} />

                    <View style={styles.infoRow}>
                        <Text style={[styles.infoLabel, { color: activeColors.textLight }]}>{t('valid_until') || 'Valid Until'}</Text>
                        <Text style={[styles.infoValue, { color: activeColors.text }]}>
                            {formatDate(currentUser?.subscription_valid_upto)}
                        </Text>
                    </View>

                    <View style={styles.infoRow}>
                        <Text style={[styles.infoLabel, { color: activeColors.textLight }]}>{t('account_type') || 'Account Type'}</Text>
                        <Text style={[styles.infoValue, { color: activeColors.text }]}>
                            {currentUser?.is_trial ? (t('trial') || 'Trial') : (t('pro_plan') || 'Professional Plan')}
                        </Text>
                    </View>
                </View>

                <View style={styles.sectionHeader}>
                    <Text style={[styles.sectionTitle, { color: activeColors.primary }]}>{t('enabled_features') || 'Features Included'}</Text>
                </View>

                <View style={[styles.card, { backgroundColor: activeColors.cardBg, padding: 0 }]}>
                    {featureList.map((item, index) => {
                        const isEnabled = !!(features as any)[item.key];
                        return (
                            <View 
                                key={item.key} 
                                style={[
                                    styles.featureItem, 
                                    { borderBottomColor: activeColors.border },
                                    index === featureList.length - 1 && { borderBottomWidth: 0 }
                                ]}
                            >
                                <View style={styles.featureLeft}>
                                    <View style={[styles.featureIconWrap, { backgroundColor: (isEnabled ? COLORS.primary : COLORS.textLight) + '10' }]}>
                                        <Icon name={item.icon} size={20} color={isEnabled ? COLORS.primary : COLORS.textLight} />
                                    </View>
                                    <Text style={[styles.featureLabel, { color: isEnabled ? activeColors.text : activeColors.textLight }]}>
                                        {item.label}
                                    </Text>
                                </View>
                                <View style={styles.featureBadge}>
                                    <Icon 
                                        name={isEnabled ? "checkmark-circle" : "close-circle"} 
                                        size={22} 
                                        color={isEnabled ? COLORS.success : COLORS.error} 
                                    />
                                </View>
                            </View>
                        );
                    })}
                </View>

                <View style={styles.helpBox}>
                    <Text style={[styles.helpText, { color: activeColors.textLight }]}>
                        {t('subscription_help') || 'Contact support if you need to upgrade your plan or enable more features.'}
                    </Text>
                    
                    <TouchableOpacity 
                        style={[styles.testBtn, { borderColor: activeColors.primary, borderStyle: 'dashed' }]}
                        onPress={handleTestNotification}
                    >
                        <Icon name="notifications-outline" size={20} color={activeColors.primary} style={{ marginRight: 8 }} />
                        <Text style={[styles.testBtnText, { color: activeColors.primary }]}>{t('test_push_notification') || 'Test Push Notification'}</Text>
                    </TouchableOpacity>

                    <TouchableOpacity 
                        style={[styles.subscribeBtn, { backgroundColor: activeColors.primary }]}
                        onPress={() => router.push('/help')}
                    >
                        <Text style={styles.subscribeBtnText}>{t('need_to_subscribe') || 'Need to Subscribe?'}</Text>
                    </TouchableOpacity>
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
        padding: SPACING.lg,
        borderRadius: BORDER_RADIUS.lg,
        elevation: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
    },
    statusHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: SPACING.lg,
    },
    statusIcon: {
        width: 64,
        height: 64,
        borderRadius: 32,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: SPACING.lg,
    },
    statusTextWrap: {
        flex: 1,
    },
    statusTitle: {
        fontSize: FONT_SIZES.xl,
        fontWeight: 'bold',
        marginBottom: 4,
    },
    statusSub: {
        fontSize: FONT_SIZES.xs,
    },
    divider: {
        height: 1,
        backgroundColor: 'rgba(0,0,0,0.05)',
        marginBottom: SPACING.lg,
    },
    infoRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: SPACING.md,
    },
    infoLabel: {
        fontSize: FONT_SIZES.sm,
    },
    infoValue: {
        fontSize: FONT_SIZES.sm,
        fontWeight: 'bold',
    },
    sectionHeader: {
        marginTop: SPACING.xl,
        marginBottom: SPACING.md,
        paddingHorizontal: SPACING.sm,
    },
    sectionTitle: {
        fontSize: FONT_SIZES.sm,
        fontWeight: 'bold',
        textTransform: 'uppercase',
        letterSpacing: 1,
    },
    featureItem: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: SPACING.lg,
        borderBottomWidth: 1,
    },
    featureLeft: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    featureIconWrap: {
        width: 36,
        height: 36,
        borderRadius: 10,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: SPACING.md,
    },
    featureLabel: {
        fontSize: FONT_SIZES.md,
        fontWeight: '500',
    },
    featureBadge: {
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 6,
    },
    featureBadgeText: {
        fontSize: 10,
        fontWeight: 'bold',
    },
    helpBox: {
        marginTop: SPACING.xl,
        padding: SPACING.md,
        opacity: 0.8,
        marginBottom: SPACING.xl,
    },
    helpText: {
        fontSize: FONT_SIZES.xs,
        textAlign: 'center',
        lineHeight: 20,
        marginBottom: SPACING.lg,
    },
    subscribeBtn: {
        paddingVertical: SPACING.md,
        paddingHorizontal: SPACING.xl,
        borderRadius: BORDER_RADIUS.md,
        alignItems: 'center',
        justifyContent: 'center',
        elevation: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
    },
    subscribeBtnText: {
        color: '#FFF',
        fontSize: FONT_SIZES.md,
        fontWeight: 'bold',
    },
    testBtn: {
        flexDirection: 'row',
        paddingVertical: SPACING.md,
        paddingHorizontal: SPACING.xl,
        borderRadius: BORDER_RADIUS.md,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1.5,
        marginBottom: SPACING.md,
    },
    testBtnText: {
        fontSize: FONT_SIZES.sm,
        fontWeight: '600',
    }
});
