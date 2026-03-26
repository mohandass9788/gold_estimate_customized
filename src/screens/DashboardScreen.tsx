import React from 'react';
import { View as RNView, Text as RNText, StyleSheet, ScrollView as RNScrollView, TouchableOpacity, Platform, Image as RNImage, Dimensions, RefreshControl, Animated } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth } from '../store/AuthContext';
import { useEstimation } from '../store/EstimationContext';
import { useGeneralSettings } from '../store/GeneralSettingsContext';
import { COLORS, SPACING, FONT_SIZES, BORDER_RADIUS, LIGHT_COLORS, DARK_COLORS, SHADOWS } from '../constants/theme';
import ScreenContainer from '../components/ScreenContainer';
import GoldRateCard from '../components/GoldRateCard';
import RateUpdateModal from '../components/RateUpdateModal';
import SafeLinearGradient from '../components/SafeLinearGradient';
import StatusSnackbar from '../components/StatusSnackbar';
import { format, addDays, isAfter, startOfDay, subDays } from 'date-fns';
import { useFocusEffect } from 'expo-router';
import { BlurView } from 'expo-blur';

const { width } = Dimensions.get('window');

// Fix for React 19 type mismatch
const View = RNView as any;
const Text = RNText as any;
const ScrollView = RNScrollView as any;
const Image = RNImage as any;
const Icon = Ionicons as any;

export default function DashboardScreen() {
    const router = useRouter();
    const { logout, refreshProfile } = useAuth();
    const { state, updateGoldRate } = useEstimation();
    const {
        theme, language, t, printerType, isPrinterConnected, shopDetails, deviceName,
        connectionStatus, retryAttempt, countdown, featureFlags, setLanguage, toggleTheme
    } = useGeneralSettings();
    const [isRateModalVisible, setIsRateModalVisible] = React.useState(false);
    const [refreshing, setRefreshing] = React.useState(false);

    // Animation values
    const fadeAnim = React.useRef(new Animated.Value(0)).current;
    const scaleAnim = React.useRef(new Animated.Value(0.95)).current;
    const scrollY = React.useRef(new Animated.Value(0)).current;

    // Calculate real stats from history
    const dashboardStats = React.useMemo(() => {
        const now = new Date();
        const todayStart = startOfDay(now);
        const lastWeekStart = startOfDay(subDays(now, 7));

        const todayItems = state.history.filter(item => {
            const itemDate = new Date(item.date);
            return !isNaN(itemDate.getTime()) && isAfter(itemDate, todayStart);
        });

        const weekItems = state.history.filter(item => {
            const itemDate = new Date(item.date);
            return !isNaN(itemDate.getTime()) && isAfter(itemDate, lastWeekStart);
        });

        const uniqueCustomers = new Set(
            state.history
                .map(item => item.customerName || item.customerMobile)
                .filter(Boolean)
        ).size;

        return {
            today: todayItems.length.toString(),
            week: weekItems.length.toString(),
            customers: uniqueCustomers > 0 ? uniqueCustomers.toString() : "0"
        };
    }, [state.history]);

    useFocusEffect(
        React.useCallback(() => {
            refreshProfile();
            Animated.parallel([
                Animated.timing(fadeAnim, {
                    toValue: 1,
                    duration: 600,
                    useNativeDriver: true,
                }),
                Animated.spring(scaleAnim, {
                    toValue: 1,
                    friction: 8,
                    useNativeDriver: true,
                }),
            ]).start();
        }, [refreshProfile, fadeAnim, scaleAnim])
    );

    const onRefresh = React.useCallback(async () => {
        setRefreshing(true);
        try {
            await refreshProfile();
        } finally {
            setRefreshing(false);
        }
    }, [refreshProfile]);

    const activeColors = theme === 'light' ? LIGHT_COLORS : DARK_COLORS;

    const getGreeting = () => {
        const hour = new Date().getHours();
        if (hour < 12) return t('good_morning');
        if (hour < 17) return t('good_afternoon');
        return t('good_evening');
    };

    const getGreetingEmoji = () => {
        const hour = new Date().getHours();
        if (hour < 12) return '🌅';
        if (hour < 17) return '☀️';
        return '🌙';
    };

    const MetaMetric = ({ label, value, icon, colors, trend }: any) => (
        <Animated.View
            style={[
                styles.metricCard,
                { backgroundColor: activeColors.cardBg, transform: [{ scale: scaleAnim }] }
            ]}
        >
            <SafeLinearGradient
                colors={[colors[0] + '20', colors[1] + '10']}
                style={styles.metricIconWrap}
            >
                <Icon name={icon} size={24} color={colors[0]} />
            </SafeLinearGradient>
            <View style={styles.metricContent}>
                <Text style={[styles.metricValue, { color: activeColors.text }]}>{value}</Text>
                <Text style={[styles.metricLabel, { color: activeColors.textLight }]}>{label}</Text>
                {trend && (
                    <View style={styles.trendBadge}>
                        <Icon name="trending-up" size={12} color="#4CAF50" />
                        <Text style={styles.trendText}>+12%</Text>
                    </View>
                )}
            </View>
        </Animated.View>
    );

    const MenuButton = ({ title, subtitle, icon, route, colors, compact = false, badge }: any) => (
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
                {badge && (
                    <View style={styles.badgeContainer}>
                        <Text style={styles.badgeText}>NEW</Text>
                    </View>
                )}
                <View style={compact ? styles.menuIconCircleCompact : styles.menuIconCircle}>
                    <Icon name={icon} size={compact ? 22 : 28} color="#FFF" />
                </View>
                <View style={compact ? styles.menuTextWrapCompact : { flex: 1 }}>
                    <Text style={compact ? styles.menuButtonTextCompact : styles.menuButtonText}>{title}</Text>
                    {!compact && !!subtitle && (
                        <Text style={styles.menuButtonSubtext} numberOfLines={1}>
                            {subtitle}
                        </Text>
                    )}
                </View>
                {!compact && (
                    <View style={styles.arrowCircle}>
                        <Icon name="arrow-forward" size={18} color="rgba(255,255,255,0.95)" />
                    </View>
                )}
            </SafeLinearGradient>
        </TouchableOpacity>
    );

    const QuickStat = ({ icon, label, value, color }: any) => (
        <View style={[styles.quickStatCard, { backgroundColor: activeColors.cardBg }]}>
            <View style={[styles.quickStatIcon, { backgroundColor: color + '15' }]}>
                <Icon name={icon} size={20} color={color} />
            </View>
            <Text style={[styles.quickStatValue, { color: activeColors.text }]}>{value}</Text>
            <Text style={[styles.quickStatLabel, { color: activeColors.textLight }]}>{label}</Text>
        </View>
    );

    const getPrinterStatusInfo = () => {
        if (printerType === 'system') return { color: '#4CAF50', label: t('system_ready'), icon: 'print-outline' };
        if (isPrinterConnected) return { color: '#4CAF50', label: t('connected'), icon: 'print-outline' };
        if (connectionStatus === 'connecting') return { color: '#FF9800', label: t('connecting'), icon: 'sync-outline' };
        return { color: '#F44336', label: t('disconnected'), icon: 'alert-circle-outline' };
    };

    const printerStatus = getPrinterStatusInfo();

    const primaryActions = [
        ...(featureFlags.isEstimationEnabled ? [
            { title: t('scan_tag'), subtitle: 'Quick QR/Barcode scan', icon: 'qr-code', route: '/(tabs)/scan', colors: ['#6366F1', '#8B5CF6'], badge: true },
            { title: t('manual_entry'), subtitle: 'Create estimate manually', icon: 'create', route: '/(tabs)/manual?mode=MANUAL', colors: ['#06B6D4', '#3B82F6'] }
        ] : []),
        ...(featureFlags.isPurchaseEnabled ? [
            { title: t('purchase'), subtitle: 'Old gold purchase', icon: 'cart', route: '/(tabs)/manual?mode=PURCHASE', colors: ['#10B981', '#34D399'] }
        ] : [])
    ];

    const secondaryActions = [
        ...(featureFlags.isEstimationEnabled ? [{ title: t('multi_tag_scan'), icon: 'layers', route: '/(tabs)/multi-scan', colors: ['#F59E0B', '#F97316'] }] : []),
        ...(featureFlags.isChitEnabled ? [{ title: t('chit'), icon: 'receipt', route: '/(tabs)/manual?mode=CHIT', colors: ['#8B5CF6', '#A78BFA'] }] : []),
        ...(featureFlags.isAdvanceEnabled ? [{ title: t('advance'), icon: 'wallet', route: '/(tabs)/manual?mode=ADVANCE', colors: ['#EC4899', '#F472B6'] }] : []),
        ...(featureFlags.isRepairEnabled ? [{ title: t('repairs'), icon: 'construct', route: '/(tabs)/repairs', colors: ['#EF4444', '#F87171'] }] : []),
        { title: t('update_rates'), icon: 'trending-up', route: '/(tabs)/rates', colors: ['#F97316', '#FB923C'] },
    ];

    const headerScale = scrollY.interpolate({
        inputRange: [0, 100],
        outputRange: [1, 0.95],
        extrapolate: 'clamp',
    });

    return (
        <ScreenContainer backgroundColor={activeColors.background}>
            {/* Animated Header with Blur */}
            <Animated.View style={[styles.headerContainer, { transform: [{ scale: headerScale }] }]}>
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
                                    <Image source={require('../../assets/icon.png')} style={styles.logo} />
                                )}
                            </View>
                            <View>
                                <View style={styles.greetingRow}>
                                    <Text style={styles.greetingEmoji}>{getGreetingEmoji()}</Text>
                                    <Text style={[styles.welcomeText, { color: activeColors.textLight }]}>{getGreeting()}</Text>
                                </View>
                                <Text style={[styles.shopName, { color: activeColors.text }]} numberOfLines={1}>
                                    {shopDetails.name}
                                </Text>
                            </View>
                        </View>
                        <View style={styles.headerActions}>
                            <TouchableOpacity
                                onPress={() => router.push('/settings/printers')}
                                style={[styles.iconButton, { backgroundColor: printerStatus.color + '10' }]}
                            >
                                <Icon name={printerStatus.icon} size={20} color={printerStatus.color} />
                                <View style={[styles.statusDotSmall, { backgroundColor: printerStatus.color }]} />
                            </TouchableOpacity>
                            {/* <TouchableOpacity
                                onPress={() => setLanguage(language === 'en' ? 'ta' : 'en')}
                                style={[styles.iconButton, { backgroundColor: activeColors.cardBg, borderWidth: 1, borderColor: activeColors.border }]}
                            >
                                <Icon name="language-outline" size={20} color={activeColors.primary} />
                            </TouchableOpacity> */}
                            <TouchableOpacity
                                onPress={toggleTheme}
                                style={[styles.iconButton, { backgroundColor: activeColors.cardBg, borderWidth: 1, borderColor: activeColors.border }]}
                            >
                                <Icon name={theme === 'light' ? 'moon-outline' : 'sunny-outline'} size={20} color={activeColors.primary} />
                            </TouchableOpacity>
                            {/* <TouchableOpacity
                                onPress={() => router.push('/settings/profile')}
                                style={[styles.profileButton, { backgroundColor: activeColors.primary }]}
                            >
                                <Icon name="person-outline" size={20} color="#FFF" />
                            </TouchableOpacity> */}
                        </View>
                    </View>
                </SafeLinearGradient>
            </Animated.View>

            {/* Connection Status Banner */}
            {connectionStatus !== 'idle' && connectionStatus !== 'connected' && !isPrinterConnected && (
                <Animated.View
                    style={[
                        styles.statusBanner,
                        { backgroundColor: connectionStatus === 'failed' ? '#F44336' : '#FF9800' },
                        { transform: [{ scale: fadeAnim }] }
                    ]}
                >
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
                </Animated.View>
            )}

            <Animated.ScrollView
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
                onScroll={Animated.event(
                    [{ nativeEvent: { contentOffset: { y: scrollY } } }],
                    { useNativeDriver: true }
                )}
                scrollEventThrottle={16}
                refreshControl={
                    <RefreshControl
                        refreshing={refreshing}
                        onRefresh={onRefresh}
                        tintColor={activeColors.primary}
                        colors={[activeColors.primary]}
                    />
                }
            >
                {/* Gold Rate Card */}
                <Animated.View style={{ opacity: fadeAnim }}>
                    <GoldRateCard
                        rate={state.goldRate}
                        onEdit={() => setIsRateModalVisible(true)}
                    />
                </Animated.View>

                {/* Quick Stats Row */}
                <View style={styles.quickStatsRow}>
                    <QuickStat
                        icon="calendar-outline"
                        label="Today"
                        value={dashboardStats.today}
                        color={activeColors.primary}
                    />
                    <QuickStat
                        icon="trending-up"
                        label="This Week"
                        value={dashboardStats.week}
                        color="#10B981"
                    />
                    <QuickStat
                        icon="people-outline"
                        label="Customers"
                        value={dashboardStats.customers}
                        color="#8B5CF6"
                    />
                </View>

                {/* Metrics Row */}
                <View style={styles.metricsRow}>
                    <MetaMetric
                        label={t('estimates')}
                        value={state.history.length}
                        icon="document-text"
                        colors={['#6366F1', '#8B5CF6']}
                        trend
                    />
                    <MetaMetric
                        label={t('total_weight')}
                        value={`${state.totals.totalWeight.toFixed(2)}g`}
                        icon="speedometer"
                        colors={['#10B981', '#34D399']}
                    />
                </View>

                {/* Main Action Grid */}
                <View style={styles.sectionHeader}>
                    <View>
                        <Text style={[styles.sectionTitle, { color: activeColors.text }]}>{t('quick_actions')}</Text>
                        <Text style={[styles.sectionSubtitle, { color: activeColors.textLight }]}>Start your workflow</Text>
                    </View>
                    <View style={styles.sectionBadge}>
                        <Text style={styles.sectionBadgeText}>4 ACTIONS</Text>
                    </View>
                </View>

                <View style={styles.primaryActionStack}>
                    {primaryActions.map((action, index) => (
                        <MenuButton key={action.title} {...action} />
                    ))}
                </View>

                <View style={styles.divider} />

                <View style={styles.sectionHeader}>
                    <View>
                        <Text style={[styles.sectionTitle, { color: activeColors.text }]}>More Tools</Text>
                        <Text style={[styles.sectionSubtitle, { color: activeColors.textLight }]}>Additional features</Text>
                    </View>
                </View>

                <View style={styles.grid}>
                    {secondaryActions.map((action) => (
                        <MenuButton key={action.title} {...action} compact />
                    ))}
                </View>

                {/* Recent Activity Section */}
                <View style={styles.recentSection}>
                    <View style={styles.sectionHeader}>
                        <View>
                            <Text style={[styles.sectionTitle, { color: activeColors.text }]}>{t('recent_activity')}</Text>
                            <Text style={[styles.sectionSubtitle, { color: activeColors.textLight }]}>Last 5 transactions</Text>
                        </View>
                        <TouchableOpacity onPress={() => router.push('/(tabs)/summary')} style={styles.viewAllButton}>
                            <Text style={styles.viewAllText}>{t('view_all')}</Text>
                            <Icon name="arrow-forward" size={14} color={activeColors.primary} />
                        </TouchableOpacity>
                    </View>

                    {state.history && state.history.length > 0 ? (
                        state.history.slice(0, 5).map((estimate, index) => (
                            <Animated.View
                                key={estimate.id}
                                style={[
                                    styles.recentCard,
                                    {
                                        backgroundColor: activeColors.cardBg,
                                        borderColor: activeColors.border,
                                        transform: [{ translateX: fadeAnim }]
                                    }
                                ]}
                            >
                                <TouchableOpacity
                                    style={styles.recentCardContent}
                                    onPress={() => router.push({ pathname: '/(tabs)/summary', params: { id: estimate.id } })}
                                >
                                    <View style={styles.recentCardLeft}>
                                        <View style={[styles.recentIconWrap, { backgroundColor: activeColors.primary + '10' }]}>
                                            <Icon name="document-text" size={20} color={activeColors.primary} />
                                        </View>
                                        <View>
                                            <Text style={[styles.recentName, { color: activeColors.text }]}>
                                                {estimate.customerName || `Est #${estimate.estimationNumber}`}
                                            </Text>
                                            <View style={styles.recentMeta}>
                                                <Icon name="time-outline" size={12} color={activeColors.textLight} />
                                                <Text style={[styles.recentDate, { color: activeColors.textLight }]}>
                                                    {format(new Date(estimate.date), 'dd MMM, HH:mm')}
                                                </Text>
                                                <View style={styles.recentWeightBadge}>
                                                    <Text style={styles.recentWeightText}>{estimate.totalWeight.toFixed(2)}g</Text>
                                                </View>
                                            </View>
                                        </View>
                                    </View>
                                    <View style={styles.recentCardRight}>
                                        <Text style={[styles.recentAmount, { color: activeColors.primary }]}>
                                            ₹{Math.round(estimate.grandTotal).toLocaleString()}
                                        </Text>
                                        <Icon name="chevron-forward" size={16} color={activeColors.textLight} />
                                    </View>
                                </TouchableOpacity>
                            </Animated.View>
                        ))
                    ) : (
                        <View style={styles.emptyWrap}>
                            <View style={styles.emptyIconContainer}>
                                <Icon name="document-text-outline" size={48} color={activeColors.textLight + '30'} />
                            </View>
                            <Text style={[styles.emptyText, { color: activeColors.textLight }]}>{t('no_recent_activity')}</Text>
                            <Text style={[styles.emptySubtext, { color: activeColors.textLight + '80' }]}>Create your first estimate to get started</Text>
                        </View>
                    )}
                </View>
            </Animated.ScrollView>

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
    headerContainer: {
        zIndex: 10,
    },
    header: {
        paddingTop: Platform.OS === 'ios' ? 54 : 12,
        paddingBottom: 20,
        paddingHorizontal: SPACING.lg,
        borderBottomLeftRadius: BORDER_RADIUS.xl,
        borderBottomRightRadius: BORDER_RADIUS.xl,
        ...SHADOWS.light,
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
        width: 52,
        height: 52,
        borderRadius: 26,
        borderWidth: 2,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: SPACING.md,
        overflow: 'hidden',
        backgroundColor: '#FFF',
    },
    logoPlaceholder: {
        width: '100%',
        height: '100%',
        justifyContent: 'center',
        alignItems: 'center',
    },
    logo: {
        width: '100%',
        height: '100%',
    },
    greetingRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 4,
    },
    greetingEmoji: {
        fontSize: 14,
        marginRight: 6,
    },
    welcomeText: {
        fontSize: FONT_SIZES.xs,
        fontWeight: '500',
        letterSpacing: 0.3,
    },
    shopName: {
        fontSize: FONT_SIZES.xl,
        fontWeight: '800',
        letterSpacing: -0.5,
    },
    headerActions: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
    },
    iconButton: {
        width: 38,
        height: 38,
        borderRadius: 19,
        justifyContent: 'center',
        alignItems: 'center',
        position: 'relative',
    },
    profileButton: {
        width: 38,
        height: 38,
        borderRadius: 19,
        justifyContent: 'center',
        alignItems: 'center',
        ...SHADOWS.heavy,
    },
    statusDotSmall: {
        position: 'absolute',
        bottom: 2,
        right: 2,
        width: 10,
        height: 10,
        borderRadius: 5,
        borderWidth: 2,
        borderColor: '#FFF',
    },
    statusBanner: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 12,
        marginHorizontal: SPACING.md,
        marginTop: SPACING.md,
        borderRadius: BORDER_RADIUS.lg,
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
        fontWeight: '600',
    },
    countdownText: {
        color: 'rgba(255,255,255,0.8)',
        fontSize: 11,
        fontWeight: '500',
        marginTop: 2,
    },
    retryAction: {
        backgroundColor: 'rgba(255,255,255,0.2)',
        paddingHorizontal: 14,
        paddingVertical: 6,
        borderRadius: 16,
    },
    retryActionText: {
        color: '#FFF',
        fontSize: 11,
        fontWeight: '700',
    },
    scrollContent: {
        padding: SPACING.md,
        paddingTop: SPACING.md,
    },
    quickStatsRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: SPACING.lg,
        gap: 12,
    },
    quickStatCard: {
        flex: 1,
        padding: SPACING.sm,
        borderRadius: BORDER_RADIUS.lg,
        alignItems: 'center',
        ...SHADOWS.light,
    },
    quickStatIcon: {
        width: 40,
        height: 40,
        borderRadius: 20,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 8,
    },
    quickStatValue: {
        fontSize: FONT_SIZES.lg,
        fontWeight: 'bold',
        marginBottom: 2,
    },
    quickStatLabel: {
        fontSize: FONT_SIZES.xs,
        fontWeight: '500',
    },
    metricsRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: SPACING.lg,
        gap: 12,
    },
    metricCard: {
        flex: 1,
        padding: SPACING.md,
        borderRadius: BORDER_RADIUS.xl,
        flexDirection: 'row',
        alignItems: 'center',
        ...SHADOWS.medium,
    },
    metricIconWrap: {
        width: 52,
        height: 52,
        borderRadius: 16,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: SPACING.md,
    },
    metricContent: {
        flex: 1,
    },
    metricValue: {
        fontSize: FONT_SIZES.xl,
        fontWeight: '800',
        marginBottom: 2,
    },
    metricLabel: {
        fontSize: 11,
        fontWeight: '500',
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },
    trendBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 4,
        gap: 2,
    },
    trendText: {
        fontSize: 10,
        color: '#4CAF50',
        fontWeight: '600',
    },
    sectionHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-end',
        marginBottom: SPACING.lg,
        paddingHorizontal: 4,
    },
    sectionTitle: {
        fontSize: FONT_SIZES.xl,
        fontWeight: '800',
        letterSpacing: -0.5,
    },
    sectionSubtitle: {
        fontSize: FONT_SIZES.xs,
        marginTop: 2,
    },
    sectionBadge: {
        backgroundColor: '#6366F1',
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 12,
    },
    sectionBadgeText: {
        color: '#FFF',
        fontSize: 10,
        fontWeight: '700',
    },
    divider: {
        height: 1,
        backgroundColor: 'rgba(0,0,0,0.05)',
        marginVertical: SPACING.md,
    },
    primaryActionStack: {
        marginBottom: SPACING.md,
        gap: 12,
    },
    grid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'space-between',
        marginBottom: SPACING.xl,
        gap: 12,
    },
    menuButtonWrapper: {
        width: '100%',
    },
    menuButtonWrapperCompact: {
        width: '48%',
    },
    menuButton: {
        minHeight: 100,
        borderRadius: BORDER_RADIUS.xl,
        paddingHorizontal: SPACING.lg,
        paddingVertical: SPACING.lg,
        flexDirection: 'row',
        alignItems: 'center',
        position: 'relative',
        ...SHADOWS.heavy,
    },
    menuButtonCompact: {
        minHeight: 90,
        borderRadius: BORDER_RADIUS.lg,
        paddingHorizontal: SPACING.md,
        paddingVertical: SPACING.md,
        flexDirection: 'row',
        alignItems: 'center',
        ...SHADOWS.medium,
    },
    menuIconCircle: {
        width: 64,
        height: 64,
        borderRadius: 20,
        backgroundColor: 'rgba(255, 255, 255, 0.2)',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: SPACING.md,
    },
    menuIconCircleCompact: {
        width: 48,
        height: 48,
        borderRadius: 14,
        backgroundColor: 'rgba(255, 255, 255, 0.2)',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: SPACING.sm,
    },
    menuTextWrapCompact: {
        flex: 1,
    },
    menuButtonText: {
        color: '#FFFFFF',
        fontSize: FONT_SIZES.xl,
        fontWeight: '800',
        marginBottom: 4,
    },
    menuButtonTextCompact: {
        color: '#FFFFFF',
        fontSize: FONT_SIZES.md,
        fontWeight: '700',
    },
    menuButtonSubtext: {
        color: 'rgba(255,255,255,0.85)',
        fontSize: FONT_SIZES.sm,
        fontWeight: '500',
    },
    arrowCircle: {
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: 'rgba(255,255,255,0.2)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    badgeContainer: {
        position: 'absolute',
        top: 12,
        right: 12,
        backgroundColor: '#FF3B30',
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: 10,
        zIndex: 10,
    },
    badgeText: {
        color: '#FFF',
        fontSize: 9,
        fontWeight: '800',
    },
    recentSection: {
        marginTop: SPACING.sm,
    },
    viewAllButton: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    viewAllText: {
        color: '#6366F1',
        fontSize: FONT_SIZES.sm,
        fontWeight: '600',
    },
    recentCard: {
        borderRadius: BORDER_RADIUS.lg,
        marginBottom: SPACING.sm,
        borderWidth: 1,
        overflow: 'hidden',
    },
    recentCardContent: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: SPACING.md,
    },
    recentCardLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
    },
    recentIconWrap: {
        width: 48,
        height: 48,
        borderRadius: 24,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: SPACING.md,
    },
    recentName: {
        fontSize: FONT_SIZES.md,
        fontWeight: '600',
        marginBottom: 4,
    },
    recentMeta: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    recentDate: {
        fontSize: FONT_SIZES.xs,
    },
    recentWeightBadge: {
        backgroundColor: 'rgba(0,0,0,0.05)',
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 8,
    },
    recentWeightText: {
        fontSize: 10,
        fontWeight: '500',
    },
    recentCardRight: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    recentAmount: {
        fontSize: FONT_SIZES.md,
        fontWeight: 'bold',
    },
    emptyWrap: {
        padding: SPACING.xl,
        alignItems: 'center',
        justifyContent: 'center',
    },
    emptyIconContainer: {
        marginBottom: SPACING.md,
    },
    emptyText: {
        marginTop: SPACING.md,
        fontSize: FONT_SIZES.md,
        fontWeight: '600',
    },
    emptySubtext: {
        marginTop: SPACING.xs,
        fontSize: FONT_SIZES.sm,
    },
    rotatingIcon: {
        animation: 'spin 1s linear infinite',
    },
});