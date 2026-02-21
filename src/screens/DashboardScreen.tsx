import React from 'react';
import { View as RNView, Text as RNText, StyleSheet, ScrollView as RNScrollView, TouchableOpacity, Platform, Image as RNImage } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../store/AuthContext';
import { useEstimation } from '../store/EstimationContext';
import { useGeneralSettings } from '../store/GeneralSettingsContext';
import { COLORS, SPACING, FONT_SIZES, BORDER_RADIUS, LIGHT_COLORS, DARK_COLORS } from '../constants/theme';
import { getSetting } from '../services/dbService';
import ScreenContainer from '../components/ScreenContainer';
import HeaderBar from '../components/HeaderBar';
import GoldRateCard from '../components/GoldRateCard';
import SummaryCard from '../components/SummaryCard';
import RateUpdateModal from '../components/RateUpdateModal';
import { format } from 'date-fns';


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
    const { theme, t, connectedPrinter, printerType, isPrinterConnected, shopDetails, deviceName } = useGeneralSettings();
    const [isRateModalVisible, setIsRateModalVisible] = React.useState(false);

    const [shopName, setShopName] = React.useState('Gold Estimation App');
    const [isBluetoothOn, setIsBluetoothOn] = React.useState(true);

    const activeColors = theme === 'light' ? LIGHT_COLORS : DARK_COLORS;

    React.useEffect(() => {
        init();
    }, []);


    const init = async () => {
        // Init logic if needed
    };

    const getGreeting = () => {
        const hour = new Date().getHours();
        if (hour < 12) return t('good_morning');
        if (hour < 17) return t('good_afternoon');
        return t('good_evening');
    };

    const handleLogout = () => {
        logout();
        router.replace('/login');
    };

    const MetaMetric = ({ label, value, icon, color }: any) => (
        <View style={[styles.metricCard, { backgroundColor: activeColors.cardBg }]}>
            <View style={[styles.metricIcon, { backgroundColor: color + '20' }]}>
                <Icon name={icon} size={20} color={color} />
            </View>
            <View>
                <Text style={[styles.metricValue, { color: activeColors.text }]}>{value}</Text>
                <Text style={[styles.metricLabel, { color: activeColors.textLight }]}>{label}</Text>
            </View>
        </View>
    );

    const MenuButton = ({ title, icon, route, color }: any) => (
        <TouchableOpacity
            style={[styles.menuButton, { backgroundColor: color }]}
            onPress={() => router.push(route)}
            activeOpacity={0.9}
        >
            <Icon name={icon} size={32} color={COLORS.white} />
            <Text style={styles.menuButtonText}>{title}</Text>
        </TouchableOpacity>
    );

    const recentItems = state.items.slice(-3).reverse();

    return (
        <ScreenContainer backgroundColor={activeColors.background}>
            {/* Custom Attractive Header */}
            <View style={{
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
                paddingHorizontal: SPACING.md,
                paddingVertical: SPACING.md,
                backgroundColor: activeColors.cardBg,
                elevation: 4,
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.1,
                shadowRadius: 4,
                borderBottomLeftRadius: 20,
                borderBottomRightRadius: 20,
                marginBottom: SPACING.md
            }}>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <Image
                        source={require('../../assets/logo.png')}
                        style={{ width: 50, height: 50, borderRadius: 25, marginRight: 10, borderWidth: 2, borderColor: COLORS.gold }}
                    />
                    <View>
                        <Text style={{ fontSize: FONT_SIZES.xs, color: activeColors.textLight }}>{getGreeting()}</Text>
                        <Text style={{ fontSize: FONT_SIZES.lg, fontWeight: 'bold', color: activeColors.text, fontFamily: 'serif' }}>
                            {shopDetails.name}
                        </Text>
                        <Text style={{ fontSize: 10, color: activeColors.textLight, opacity: 0.7 }}>
                            ID: {deviceName}
                        </Text>
                    </View>
                </View>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <TouchableOpacity
                        onPress={() => router.push('/settings/printers')}
                        style={{
                            flexDirection: 'row',
                            alignItems: 'center',
                            backgroundColor: (printerType === 'thermal' && !isPrinterConnected) ? activeColors.error + '15' : activeColors.success + '15',
                            paddingHorizontal: 10,
                            paddingVertical: 6,
                            borderRadius: 20,
                            marginRight: -4
                        }}>
                        <View style={{
                            width: 6,
                            height: 6,
                            borderRadius: 3,
                            backgroundColor: (printerType === 'thermal' && !isPrinterConnected) ? activeColors.error : activeColors.success,
                            marginRight: 6
                        }} />
                        <Icon name="print-outline" size={16} color={(printerType === 'thermal' && !isPrinterConnected) ? activeColors.error : activeColors.success} />
                    </TouchableOpacity>
                </View>
            </View>
            {!state.goldRate || state.goldRate.rate22k === 0 ? (
                <TouchableOpacity
                    style={[styles.alertBanner, { backgroundColor: activeColors.error }]}
                    onPress={() => setIsRateModalVisible(true)}
                >
                    <Icon name="warning" size={20} color={COLORS.white} />
                    <Text style={styles.alertText}>{t('rate_not_set') || 'Gold Rate not set! Tap to update.'}</Text>
                </TouchableOpacity>
            ) : null}

            {(printerType === 'thermal' && !isPrinterConnected) ? (
                <TouchableOpacity
                    style={[styles.alertBanner, { backgroundColor: activeColors.error }]}
                    onPress={() => router.push('/settings/printers')}
                >
                    <Icon name="print" size={20} color={COLORS.white} />
                    <Text style={styles.alertText}>{t('printer_not_connected') || 'Thermal Printer not connected! Tap to setup.'}</Text>
                </TouchableOpacity>
            ) : null}

            <ScrollView contentContainerStyle={styles.scrollContent}>
                <GoldRateCard
                    rate={state.goldRate}
                    onEdit={() => setIsRateModalVisible(true)}
                />

                <RateUpdateModal
                    visible={isRateModalVisible}
                    currentRate={state.goldRate}
                    onClose={() => setIsRateModalVisible(false)}
                    onUpdate={updateGoldRate}
                />

                <View style={styles.metricsRow}>
                    <MetaMetric
                        label={t('estimates')}
                        value={state.items.length}
                        icon="document-text-outline"
                        color="#4A90E2"
                    />
                    <MetaMetric
                        label={t('total_weight')}
                        value={`${state.totals.totalWeight.toFixed(2)}g`}
                        icon="speedometer-outline"
                        color="#50E3C2"
                    />
                </View>

                <View style={styles.grid}>
                    <MenuButton
                        title={t('scan_tag')}
                        icon="qr-code-outline"
                        route="/(tabs)/manual?mode=TAG"
                        color="#4A90E2"
                    />
                    <MenuButton
                        title={t('manual_entry')}
                        icon="create-outline"
                        route="/(tabs)/manual?mode=MANUAL"
                        color="#50E3C2"
                    />
                    <MenuButton
                        title={t('multi_tag_scan')}
                        icon="layers-outline"
                        route="/(tabs)/multi-scan"
                        color="#F5A623"
                    />
                    <MenuButton
                        title={t('chit')}
                        icon="receipt-outline"
                        route="/(tabs)/manual?mode=CHIT"
                        color="#673AB7"
                    />
                    <MenuButton
                        title={t('advance')}
                        icon="wallet-outline"
                        route="/(tabs)/manual?mode=ADVANCE"
                        color="#FF5722"
                    />
                    <MenuButton
                        title={t('purchase')}
                        icon="cart-outline"
                        route="/(tabs)/manual?mode=PURCHASE"
                        color="#E040FB"
                    />
                </View>

                <View style={styles.recentSection}>
                    <View style={styles.sectionHeader}>
                        <Text style={[styles.sectionTitle, { color: activeColors.text }]}>{t('recent_activity')}</Text>
                        <TouchableOpacity onPress={() => router.push('/(tabs)/summary')}>
                            <Text style={styles.viewAll}>{t('view_all')}</Text>
                        </TouchableOpacity>
                    </View>

                    {state.history.length > 0 ? (
                        state.history.map((estimate) => (
                            <View key={estimate.id} style={[styles.recentCard, { backgroundColor: activeColors.cardBg }]}>
                                <View style={styles.recentInfo}>
                                    <Text style={[styles.recentName, { color: activeColors.text }]}>{estimate.customerName}</Text>
                                    <Text style={[styles.recentSub, { color: activeColors.textLight }]}>
                                        {estimate.date ? format(new Date(estimate.date), 'dd MMM, HH:mm') : 'N/A'} • {estimate.totalWeight.toFixed(2)}g
                                    </Text>
                                </View>
                                <Text style={styles.recentPrice}>₹ {estimate.grandTotal.toLocaleString()}</Text>
                            </View>
                        ))
                    ) : (
                        <View style={styles.emptyRecent}>
                            <Text style={[styles.emptyText, { color: activeColors.textLight }]}>{t('no_recent_activity')}</Text>
                        </View>
                    )}
                </View>
            </ScrollView>
        </ScreenContainer>
    );
}

const styles = StyleSheet.create({

    dashboardHeader: {
        padding: SPACING.lg,
        paddingBottom: SPACING.md,
    },
    greeting: {
        fontSize: FONT_SIZES.lg,
        fontWeight: '600',
    },
    appName: {
        fontSize: FONT_SIZES.xxl,
        fontWeight: 'bold',
        marginTop: -4,
    },
    logoutButton: {
        padding: SPACING.sm,
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
        flex: 1,
        marginHorizontal: 4,
        padding: SPACING.md,
        borderRadius: BORDER_RADIUS.md,
        flexDirection: 'row',
        alignItems: 'center',
        elevation: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
    },
    metricIcon: {
        width: 36,
        height: 36,
        borderRadius: 18,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: SPACING.sm,
    },
    metricValue: {
        fontSize: FONT_SIZES.md,
        fontWeight: 'bold',
    },
    metricLabel: {
        fontSize: FONT_SIZES.xs,
    },
    grid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'space-between',
        marginBottom: SPACING.lg,
    },
    menuButton: {
        width: '31%',
        paddingVertical: SPACING.md,
        borderRadius: BORDER_RADIUS.md,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: SPACING.md,
        elevation: 4,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 4,
    },
    menuButtonText: {
        color: COLORS.white,
        fontSize: FONT_SIZES.xs,
        fontWeight: 'bold',
        marginTop: SPACING.xs,
        textAlign: 'center',
    },
    recentSection: {
        marginTop: SPACING.sm,
    },
    sectionHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: SPACING.md,
    },
    sectionTitle: {
        fontSize: FONT_SIZES.lg,
        fontWeight: 'bold',
    },
    viewAll: {
        color: COLORS.primary,
        fontSize: FONT_SIZES.sm,
        fontWeight: '600',
    },
    recentCard: {
        padding: SPACING.md,
        borderRadius: BORDER_RADIUS.md,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: SPACING.sm,
        borderLeftWidth: 4,
        borderLeftColor: COLORS.primary,
        elevation: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
    },
    recentInfo: {
        flex: 1,
    },
    recentName: {
        fontSize: FONT_SIZES.md,
        fontWeight: 'bold',
    },
    recentSub: {
        fontSize: FONT_SIZES.xs,
    },
    recentPrice: {
        fontSize: FONT_SIZES.md,
        fontWeight: 'bold',
        color: COLORS.primary,
    },
    emptyRecent: {
        padding: SPACING.xl,
        alignItems: 'center',
    },
    emptyText: {
        fontSize: FONT_SIZES.sm,
    },
    alertBanner: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        padding: SPACING.md,
        margin: SPACING.md,
        borderRadius: BORDER_RADIUS.md,
    },
    alertText: {
        color: COLORS.white,
        fontWeight: 'bold',
        marginLeft: SPACING.sm,
    }
});
