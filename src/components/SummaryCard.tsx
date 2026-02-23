import React from 'react';
import { View as RNView, Text as RNText, StyleSheet, TouchableOpacity as RNRTouchableOpacity, LayoutAnimation, Platform } from 'react-native';
import { COLORS, SPACING, FONT_SIZES, LIGHT_COLORS, DARK_COLORS, BORDER_RADIUS } from '../constants/theme';
import { EstimationTotals } from '../types';
import { useEstimation } from '../store/EstimationContext';
import { useGeneralSettings } from '../store/GeneralSettingsContext';
import { Ionicons } from '@expo/vector-icons';

// Enable LayoutAnimation for Android
// Fix for React 19 type mismatch
const View = RNView as any;
const Text = RNText as any;
const TouchableOpacity = RNRTouchableOpacity as any;
const Icon = Ionicons as any;

interface SummaryCardProps {
    totals: EstimationTotals;
    style?: any;
}

export default function SummaryCard({ totals, style }: SummaryCardProps) {
    const { state } = useEstimation();
    const { theme, t } = useGeneralSettings();
    const [expanded, setExpanded] = React.useState(false);
    const activeColors = theme === 'light' ? LIGHT_COLORS : DARK_COLORS;

    const toggleExpand = () => {
        LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
        setExpanded(!expanded);
    };

    const colors = theme === 'light' ? LIGHT_COLORS : DARK_COLORS;

    const metalLabel = React.useMemo(() => {
        const metals = new Set(state.items.map(item => item.metal));
        if (metals.size === 1) {
            return Array.from(metals)[0] === 'GOLD' ? `${t('gold')} Value` : `${t('silver')} Value`;
        }
        return `${t('metal')} Value`;
    }, [state.items, t]);

    const SummaryRow = ({ label, value, isDeduction = false }: { label: string; value: string; isDeduction?: boolean }) => (
        <View style={styles.row}>
            <Text style={[styles.label, { color: activeColors.textLight }]}>{label}</Text>
            <Text style={[styles.value, { color: isDeduction ? activeColors.error : activeColors.success }]}>{value}</Text>
        </View>
    );

    return (
        <View style={[styles.card, { backgroundColor: theme === 'light' ? '#FFF' : '#1A1A1A', borderTopColor: colors.primary + '30' }, style]}>
            <TouchableOpacity style={styles.expandToggle} onPress={toggleExpand}>
                <View style={[styles.indicator, { backgroundColor: colors.border }]} />
                <Icon name={expanded ? "chevron-down" : "chevron-up"} size={22} color={colors.primary} />
            </TouchableOpacity>

            {expanded && (
                <View style={styles.detailsContainer}>
                    <SummaryRow label={t('total_items')} value={state.items.length.toString()} />
                    <SummaryRow label={t('total_weight')} value={`${(totals?.totalWeight || 0).toFixed(3)} g`} />
                    <SummaryRow label={metalLabel} value={`₹ ${Math.round(totals?.totalGoldValue || 0).toLocaleString()}`} />
                    <SummaryRow label={`${t('wastage')} Value`} value={`₹ ${Math.round(totals?.totalWastage || 0).toLocaleString()}`} />
                    <SummaryRow label={`${t('making_charge')} Value`} value={`₹ ${Math.round(totals?.totalMakingCharge || 0).toLocaleString()}`} />
                    <SummaryRow label={`${t('gst')} (3%)`} value={`₹ ${Math.round(totals?.totalGST || 0).toLocaleString()}`} />
                    {totals?.totalPurchase > 0 && <SummaryRow label={t('purchase_deduction') || 'Old Gold Deduction'} value={`- ₹ ${Math.round(totals.totalPurchase).toLocaleString()}`} isDeduction />}
                    {totals?.totalChit > 0 && <SummaryRow label={t('chit_deduction')} value={`- ₹ ${Math.round(totals.totalChit).toLocaleString()}`} isDeduction />}
                    {totals?.totalAdvance > 0 && <SummaryRow label={t('advance_deduction')} value={`- ₹ ${Math.round(totals.totalAdvance).toLocaleString()}`} isDeduction />}
                    <View style={[styles.divider, { backgroundColor: colors.border }]} />
                </View>
            )}

            <View style={styles.grandTotalContainer}>
                <View style={styles.grandTotalRow}>
                    <View style={styles.grandTotalLeft}>
                        <Text style={[styles.rateCardTitle, { color: colors.textLight }]}>{t('calc_rates_ref')}</Text>
                        <Text style={[styles.grandTotalLabel, { color: colors.text }]}>{t('net_payable')}</Text>
                        {!expanded && (
                            <View style={[styles.badge, { backgroundColor: colors.primary + '15' }]}>
                                <Text style={[styles.badgeText, { color: colors.primary }]}>
                                    {state.items.length} {t('items')}
                                </Text>
                            </View>
                        )}
                    </View>
                    <View style={styles.priceRow}>
                        <Text style={[styles.currencySymbol, { color: colors.success }]}>{t('currency_symbol') || '₹'}</Text>
                        <Text style={[styles.grandTotalValue, { color: colors.success }]}>
                            {Math.round(totals?.grandTotal || 0).toLocaleString()}
                        </Text>
                    </View>
                </View>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    card: {
        paddingHorizontal: SPACING.md,
        paddingTop: SPACING.xs,
        paddingBottom: SPACING.sm,
        borderTopWidth: 1,
        elevation: 20,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -4 },
        shadowOpacity: 0.15,
        shadowRadius: 8,
        borderTopLeftRadius: BORDER_RADIUS.lg,
        borderTopRightRadius: BORDER_RADIUS.lg,
    },
    expandToggle: {
        alignItems: 'center',
        paddingVertical: 2,
        marginBottom: 2,
    },
    indicator: {
        width: 40,
        height: 4,
        borderRadius: 2,
        marginBottom: 2,
    },
    detailsContainer: {
        marginBottom: SPACING.xs,
    },
    row: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 4,
    },
    label: {
        fontSize: FONT_SIZES.xs,
    },
    value: {
        fontSize: FONT_SIZES.xs,
        fontWeight: 'bold',
    },
    divider: {
        height: 1,
        marginVertical: SPACING.xs,
    },
    grandTotalContainer: {
        paddingBottom: 2,
    },
    grandTotalRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    grandTotalLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    badge: {
        paddingHorizontal: 6,
        paddingVertical: 1,
        borderRadius: 10,
    },
    badgeText: {
        fontSize: 9,
        fontWeight: 'bold',
    },
    priceRow: {
        flexDirection: 'row',
        alignItems: 'baseline',
    },
    currencySymbol: {
        fontSize: FONT_SIZES.md,
        fontWeight: 'bold',
        marginRight: 2,
    },
    grandTotalLabel: {
        fontSize: FONT_SIZES.sm,
        fontWeight: '700',
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },
    grandTotalValue: {
        fontSize: FONT_SIZES.xl,
        fontWeight: '900',
        letterSpacing: -0.5,
    },
});

