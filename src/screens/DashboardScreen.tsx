import React from 'react';
import { View as RNView, Text as RNText, StyleSheet, ScrollView as RNScrollView, TouchableOpacity, Platform, Image as RNImage, Dimensions } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth } from '../store/AuthContext';
import { useEstimation } from '../store/EstimationContext';
import { useGeneralSettings } from '../store/GeneralSettingsContext';
import { COLORS, SPACING, FONT_SIZES, BORDER_RADIUS, LIGHT_COLORS, DARK_COLORS } from '../constants/theme';
import ScreenContainer from '../components/ScreenContainer';
import GoldRateCard from '../components/GoldRateCard';
import RateUpdateModal from '../components/RateUpdateModal';
import SafeLinearGradient from '../components/SafeLinearGradient';
import StatusSnackbar from '../components/StatusSnackbar';
import { format } from 'date-fns';

const { width } = Dimensions.get('window');

// Fix for React 19 type mismatch
const View = RNView as any;
const Text = RNText as any;
const ScrollView = RNScrollView as any;
const Image = RNImage as any;
const Icon = Ionicons as any;

export default function DashboardScreen() {
    const router = useRouter();
    const { logout } = useAuth();
    const { state, updateGoldRate } = useEstimation();
    const {
        theme, language, t, printerType, isPrinterConnected, shopDetails, deviceName,
        connectionStatus, retryAttempt, countdown, featureFlags, setLanguage, toggleTheme
    } = useGeneralSettings();
    const [isRateModalVisible, setIsRateModalVisible] = React.useState(false);

    const activeColors = theme === 'light' ? LIGHT_COLORS : DARK_COLORS;

    const getGreeting = () => {
        const hour = new Date().getHours();
        if (hour < 12) return t('good_morning');
        if (hour < 17) return t('good_afternoon');
        return t('good_evening');
    };

    const MetaMetric = ({ label, value, icon, colors }: any) => (
        <View style={[styles.metricCard, { backgroundColor: activeColors.cardBg }]}>
            <SafeLinearGradient
                colors={[colors[0] + '20', colors[1] + '10']}
                style={styles.metricIconWrap}
            >
                <Icon name={icon} size={22} color={colors[0]} />
            </SafeLinearGradient>
            <View>
                <Text style={[styles.metricValue, { color: activeColors.text }]}>{value}</Text>
                <Text style={[styles.metricLabel, { color: activeColors.textLight }]}>{label}</Text>
            </View>
        </View>
    );

    const MenuButton = ({ title, subtitle, icon, route, colors, compact = false }: any) => (
        <TouchableOpacity
            style={compact ? styles.menuButtonWrapperCompact : styles.menuButtonWrapper}
            onPress={() => router.push(route)}
            activeOpacity={0.88}
        >
            <SafeLinearGradient
                colors={colors}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={compact ? styles.menuButtonCompact : styles.menuButton}
            >
                <View style={compact ? styles.menuIconCircleCompact : styles.menuIconCircle}>
                    <Icon name={icon} size={compact ? 20 : 26} color="#FFF" />
                </View>
                <View style={compact ? styles.menuTextWrapCompact : { flex: 1 }}>
                    <Text style={compact ? styles.menuButtonTextCompact : styles.menuButtonText}>{title}</Text>
                    {!compact && !!subtitle && <Text style={styles.menuButtonSubtext}>{subtitle}</Text>}
                </View>
                {!compact && <Icon name="arrow-forward" size={18} color="rgba(255,255,255,0.92)" />}
            </SafeLinearGradient>
        </TouchableOpacity>
    );

    // Helper to get printer status color
    const getPrinterStatusInfo = () => {
        if (printerType === 'system') return { color: activeColors.success, label: t('system_ready') };
        if (isPrinterConnected) return { color: activeColors.success, label: t('connected') };
        if (connectionStatus === 'connecting') return { color: '#FF9500', label: t('connecting') };
        return { color: activeColors.error, label: t('disconnected') };
    };

    const printerStatus = getPrinterStatusInfo();
    const primaryActions = [
        { title: t('scan_tag'), subtitle: 'Scan and fetch product details', icon: 'qr-code', route: '/(tabs)/scan', colors: ['#B8860B', '#E1B84C'] },
        { title: t('manual_entry'), subtitle: 'Create estimate from scratch', icon: 'create', route: '/(tabs)/manual?mode=MANUAL', colors: ['#0E7490', '#38BDF8'] },
        { title: t('purchase'), subtitle: 'Add old gold purchase values', icon: 'cart', route: '/(tabs)/manual?mode=PURCHASE', colors: ['#0F766E', '#34D399'] },
    ];
    const secondaryActions = [
        { title: t('multi_tag_scan'), icon: 'layers', route: '/(tabs)/multi-scan', colors: ['#C2410C', '#FB923C'] },
        ...(featureFlags.isChitEnabled ? [{ title: t('chit'), icon: 'receipt', route: '/(tabs)/manual?mode=CHIT', colors: ['#7C3AED', '#A78BFA'] }] : []),
        ...(featureFlags.isAdvanceEnabled ? [{ title: t('advance'), icon: 'wallet', route: '/(tabs)/manual?mode=ADVANCE', colors: ['#BE123C', '#FB7185'] }] : []),
        ...(featureFlags.isRepairEnabled
            ? [{ title: t('repairs'), icon: 'construct', route: '/(tabs)/repairs', colors: ['#9F1239', '#F43F5E'] }]
            : [{ title: t('update_rates'), icon: 'trending-up', route: '/(tabs)/rates', colors: ['#7C2D12', '#F97316'] }]),
    ];

    return (
        <ScreenContainer backgroundColor={activeColors.background}>
            {/* Premium Header */}
            <SafeLinearGradient
                colors={theme === 'light' ? ['#FFFFFF', '#F8F9FA'] : ['#1C1C1E', '#121212']}
                style={styles.header}
            >
                <View style={styles.headerContent}>
                    <View style={styles.shopInfo}>
                        <View style={[styles.logoWrap, { borderColor: activeColors.primary }]}>
                            {shopDetails.appLogo || shopDetails.appIcon ? (
                                <Image source={{ uri: shopDetails.appLogo || shopDetails.appIcon }} style={styles.logo} />
                            ) : (
                                <Icon name="business" size={24} color={activeColors.primary} />
                            )}
                        </View>
                        <View>
                            <Text style={[styles.welcomeText, { color: activeColors.textLight }]}>{getGreeting()}</Text>
                            <Text style={[styles.shopName, { color: activeColors.text }]} numberOfLines={1}>{shopDetails.name}</Text>
                        </View>
                    </View>
                    <View style={styles.headerActions}>
                        <TouchableOpacity
                            onPress={() => router.push('/settings/printers')}
                            style={[styles.printerBadge, { backgroundColor: printerStatus.color + '15' }]}
                        >
                            <View style={[styles.statusDot, { backgroundColor: printerStatus.color }]} />
                            <Icon name="print-outline" size={18} color={printerStatus.color} />
                        </TouchableOpacity>
                        <TouchableOpacity
                            onPress={() => setLanguage(language === 'en' ? 'ta' : 'en')}
                            style={[styles.profileButton, { backgroundColor: activeColors.cardBg, borderColor: activeColors.border }]}
                        >
                            <Icon
                                name="language-outline"
                                size={20}
                                color={activeColors.primary}
                            />
                        </TouchableOpacity>
                        <TouchableOpacity
                            onPress={toggleTheme}
                            style={[styles.profileButton, { backgroundColor: activeColors.cardBg, borderColor: activeColors.border }]}
                        >
                            <Icon
                                name={theme === 'light' ? 'moon-outline' : 'sunny-outline'}
                                size={20}
                                color={activeColors.primary}
                            />
                        </TouchableOpacity>
                    </View>
                </View>
            </SafeLinearGradient>

            {/* Connection Status Banner */}
            {connectionStatus !== 'idle' && connectionStatus !== 'connected' && !isPrinterConnected && (
                <View style={[
                    styles.statusBanner,
                    { backgroundColor: connectionStatus === 'failed' ? activeColors.error : '#FF9500' }
                ]}>
                    <Icon
                        name={connectionStatus === 'failed' ? "alert-circle" : "sync"}
                        size={18}
                        color="#FFF"
                        style={connectionStatus === 'connecting' ? styles.rotatingIcon : null}
                    />
                    <View style={styles.statusTextContainer}>
                        <Text style={styles.statusBannerText}>
                            {connectionStatus === 'connecting'
                                ? t('printer_connection_attempt', { attempt: retryAttempt.toString(), total: '3' })
                                : t('printer_not_connected_check')
                            }
                        </Text>
                        {connectionStatus === 'connecting' && countdown > 0 && (
                            <Text style={styles.countdownText}>
                                {t('retrying_in', { seconds: countdown.toString() })}
                            </Text>
                        )}
                    </View>
                    {connectionStatus === 'failed' && (
                        <TouchableOpacity
                            onPress={() => router.push('/settings/printers')}
                            style={styles.retryAction}
                        >
                            <Text style={styles.retryActionText}>{t('manual_connect')}</Text>
                        </TouchableOpacity>
                    )}
                </View>
            )}

            <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
                {/* Gold Rate Card Overhaul */}
                <View style={{ marginBottom: SPACING.lg }}>
                    <GoldRateCard
                        rate={state.goldRate}
                        onEdit={() => setIsRateModalVisible(true)}
                    />
                </View>

                {/* Quick Info Cards */}
                <View style={styles.metricsRow}>
                    <MetaMetric
                        label={t('estimates')}
                        value={state.history.length}
                        icon="document-text"
                        colors={['#4A90E2', '#357ABD']}
                    />
                    <MetaMetric
                        label={t('total_weight')}
                        value={`${state.totals.totalWeight.toFixed(2)}g`}
                        icon="speedometer"
                        colors={['#50E3C2', '#3CB371']}
                    />
                </View>

                {/* Main Action Grid */}
                <View style={styles.sectionHeader}>
                    <Text style={[styles.sectionTitle, { color: activeColors.text }]}>{t('quick_actions')}</Text>
                </View>

                <View style={styles.primaryActionStack}>
                    {primaryActions.map((action) => (
                        <MenuButton key={action.title} {...action} />
                    ))}
                </View>

                <View style={styles.grid}>
                    {secondaryActions.map((action) => (
                        <MenuButton key={action.title} {...action} compact />
                    ))}
                </View>

                {/* Recent Activity List */}
                <View style={styles.recentSection}>
                    <View style={styles.sectionHeader}>
                        <Text style={[styles.sectionTitle, { color: activeColors.text }]}>{t('recent_activity')}</Text>
                        <TouchableOpacity onPress={() => router.push('/(tabs)/summary')}>
                            <Text style={styles.viewAll}>{t('view_all')}</Text>
                        </TouchableOpacity>
                    </View>

                    {state.history && state.history.length > 0 ? (
                        state.history.slice(0, 5).map((estimate) => (
                            <TouchableOpacity
                                key={estimate.id}
                                style={[styles.recentCard, { backgroundColor: activeColors.cardBg, borderColor: activeColors.border }]}
                                onPress={() => router.push({ pathname: '/(tabs)/summary', params: { id: estimate.id } })}
                            >
                                <View style={styles.recentCardLeft}>
                                    <View style={[styles.recentIconWrap, { backgroundColor: activeColors.primary + '15' }]}>
                                        <Icon name="document-text" size={20} color={activeColors.primary} />
                                    </View>
                                    <View>
                                        <Text style={[styles.recentName, { color: activeColors.text }]}>
                                            {estimate.customerName || `Est #${estimate.estimationNumber}`}
                                        </Text>
                                        <Text style={[styles.recentDate, { color: activeColors.textLight }]}>
                                            {format(new Date(estimate.date), 'dd MMM, HH:mm')} • {estimate.totalWeight.toFixed(2)}g
                                        </Text>
                                    </View>
                                </View>
                                <View style={styles.recentCardRight}>
                                    <Text style={[styles.recentAmount, { color: activeColors.primary }]}>
                                        ₹{Math.round(estimate.grandTotal).toLocaleString()}
                                    </Text>
                                    <Icon name="chevron-forward" size={16} color={activeColors.textLight} />
                                </View>
                            </TouchableOpacity>
                        ))
                    ) : (
                        <View style={styles.emptyWrap}>
                            <Icon name="file-tray-outline" size={48} color={activeColors.textLight + '40'} />
                            <Text style={[styles.emptyText, { color: activeColors.textLight }]}>{t('no_recent_activity')}</Text>
                        </View>
                    )}
                </View>
            </ScrollView>

            <RateUpdateModal
                visible={isRateModalVisible}
                currentRate={state.goldRate}
                onClose={() => setIsRateModalVisible(false)}
                onUpdate={updateGoldRate}
            />

        </ScreenContainer>
    );
}

const styles = StyleSheet.create({
    header: {
        paddingTop: Platform.OS === 'ios' ? 60 : 10,
        paddingBottom: 10,
        paddingHorizontal: SPACING.lg,
        borderBottomLeftRadius: 30,
        borderBottomRightRadius: 30,
    },
    headerContent: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    shopInfo: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
    },
    logoWrap: {
        width: 44,
        height: 44,
        borderRadius: 22,
        borderWidth: 1.5,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: SPACING.md,
        backgroundColor: '#FFF1',
        overflow: 'hidden',
    },
    logo: {
        width: '100%',
        height: '100%',
    },
    welcomeText: {
        fontSize: FONT_SIZES.xs,
        fontWeight: '500',
        marginBottom: 2,
    },
    shopName: {
        fontSize: FONT_SIZES.lg,
        fontWeight: 'bold',
        letterSpacing: -0.5,
    },
    headerActions: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    printerBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderRadius: 20,
        marginRight: SPACING.sm,
    },
    profileButton: {
        width: 36,
        height: 36,
        borderRadius: 18,
        borderWidth: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    statusDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
        marginRight: 6,
    },
    statusBanner: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 12,
        marginHorizontal: SPACING.md,
        marginTop: SPACING.sm,
        borderRadius: BORDER_RADIUS.md,
        elevation: 6,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 4,
    },
    statusTextContainer: {
        flex: 1,
        marginLeft: 10,
    },
    statusBannerText: {
        color: '#FFF',
        fontSize: 13,
        fontWeight: 'bold',
    },
    countdownText: {
        color: 'rgba(255,255,255,0.8)',
        fontSize: 11,
        fontWeight: '500',
    },
    retryAction: {
        backgroundColor: 'rgba(255,255,255,0.2)',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 12,
    },
    retryActionText: {
        color: '#FFF',
        fontSize: 10,
        fontWeight: '900',
    },
    scrollContent: {
        padding: SPACING.md,
        paddingBottom: 100,
    },
    metricsRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: SPACING.lg,
    },
    metricCard: {
        width: '48%',
        padding: SPACING.md,
        borderRadius: BORDER_RADIUS.lg,
        flexDirection: 'row',
        alignItems: 'center',
        elevation: 4,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
    },
    metricIconWrap: {
        width: 42,
        height: 42,
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: SPACING.sm,
    },
    metricValue: {
        fontSize: FONT_SIZES.md,
        fontWeight: 'bold',
    },
    metricLabel: {
        fontSize: 10,
        fontWeight: '500',
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },
    sectionHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: SPACING.md,
        paddingHorizontal: 4,
    },
    sectionTitle: {
        fontSize: FONT_SIZES.xl,
        fontWeight: 'bold',
        letterSpacing: -0.5,
    },
    viewAll: {
        color: COLORS.primary,
        fontSize: FONT_SIZES.sm,
        fontWeight: '600',
    },
    primaryActionStack: {
        marginBottom: SPACING.sm,
    },
    grid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'space-between',
        marginBottom: SPACING.xl,
    },
    menuButtonWrapper: {
        width: '100%',
        marginBottom: SPACING.md,
    },
    menuButtonWrapperCompact: {
        width: '48.5%',
        marginBottom: SPACING.md,
    },
    menuButton: {
        minHeight: 90,
        borderRadius: 26,
        paddingHorizontal: SPACING.lg,
        paddingVertical: SPACING.lg,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        elevation: 8,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.16,
        shadowRadius: 16,
    },
    menuButtonCompact: {
        minHeight: 76,
        borderRadius: 22,
        paddingHorizontal: SPACING.md,
        paddingVertical: SPACING.md,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'flex-start',
        elevation: 6,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.12,
        shadowRadius: 14,
    },
    menuIconCircle: {
        width: 52,
        height: 52,
        borderRadius: 18,
        backgroundColor: 'rgba(255, 255, 255, 0.25)',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: SPACING.md,
    },
    menuIconCircleCompact: {
        width: 40,
        height: 40,
        borderRadius: 14,
        backgroundColor: 'rgba(255, 255, 255, 0.22)',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: SPACING.sm,
    },
    menuTextWrapCompact: {
        flex: 1,
        justifyContent: 'center',
        minHeight: 40,
    },
    menuButtonText: {
        color: '#FFFFFF',
        fontSize: FONT_SIZES.lg,
        fontWeight: '800',
        marginBottom: 2,
    },
    menuButtonTextCompact: {
        color: '#FFFFFF',
        fontSize: FONT_SIZES.sm,
        fontWeight: '800',
        lineHeight: 18,
    },
    menuButtonSubtext: {
        color: 'rgba(255,255,255,0.84)',
        fontSize: FONT_SIZES.sm,
        fontWeight: '500',
        paddingRight: SPACING.sm,
    },
    recentSection: {
        marginTop: SPACING.sm,
    },
    recentCard: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: SPACING.md,
        borderRadius: BORDER_RADIUS.lg,
        marginBottom: SPACING.sm,
        borderWidth: 1,
    },
    recentCardLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
    },
    recentIconWrap: {
        width: 40,
        height: 40,
        borderRadius: 20,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: SPACING.md,
    },
    recentName: {
        fontSize: FONT_SIZES.md,
        fontWeight: '600',
        marginBottom: 2,
    },
    recentDate: {
        fontSize: FONT_SIZES.xs,
    },
    recentCardRight: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    recentAmount: {
        fontSize: FONT_SIZES.md,
        fontWeight: 'bold',
        marginRight: 8,
    },
    emptyWrap: {
        padding: SPACING.xl,
        alignItems: 'center',
        justifyContent: 'center',
        opacity: 0.6,
    },
    emptyText: {
        marginTop: SPACING.md,
        fontSize: FONT_SIZES.sm,
        fontWeight: '500',
    },
    rotatingIcon: {},
});
