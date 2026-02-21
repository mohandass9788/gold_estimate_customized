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

    const metalLabel = React.useMemo(() => {
        const metals = new Set(state.items.map(item => item.metal));
        if (metals.size === 1) {
            return Array.from(metals)[0] === 'GOLD' ? `${t('gold')} Value` : `${t('silver')} Value`;
        }
        return `${t('metal')} Value`;
    }, [state.items, t]);

    const SummaryRow = ({ label, value }: { label: string; value: string }) => (
        <View style={styles.row}>
            <Text style={[styles.label, { color: activeColors.textLight }]}>{label}</Text>
            <Text style={[styles.value, { color: activeColors.text }]}>{value}</Text>
        </View>
    );

    return (
        <View style={[styles.card, { backgroundColor: activeColors.cardBg, borderTopColor: activeColors.border }, style]}>
            <TouchableOpacity style={styles.expandToggle} onPress={toggleExpand}>
                <View style={[styles.indicator, { backgroundColor: activeColors.border }]} />
                <Icon name={expanded ? "chevron-down" : "chevron-up"} size={20} color={activeColors.textLight} />
            </TouchableOpacity>

            {expanded && (
                <View style={styles.detailsContainer}>
                    <SummaryRow label={t('total_items')} value={state.items.length.toString()} />
                    <SummaryRow label={t('total_weight')} value={`${(totals?.totalWeight || 0).toFixed(3)} g`} />
                    <SummaryRow label={metalLabel} value={`₹ ${(totals?.totalGoldValue || 0).toLocaleString()}`} />
                    <SummaryRow label={`${t('wastage')} Value`} value={`₹ ${(totals?.totalWastage || 0).toLocaleString()}`} />
                    <SummaryRow label={`${t('making_charge')} Value`} value={`₹ ${(totals?.totalMakingCharge || 0).toLocaleString()}`} />
                    <SummaryRow label={`${t('gst')} (3%)`} value={`₹ ${(totals?.totalGST || 0).toLocaleString()}`} />
                    {totals?.totalPurchase > 0 && <SummaryRow label={t('purchase_deduction') || 'Old Gold Deduction'} value={`- ₹ ${totals.totalPurchase.toLocaleString()}`} />}
                    {totals?.totalChit > 0 && <SummaryRow label={t('chit_deduction')} value={`- ₹ ${totals.totalChit.toLocaleString()}`} />}
                    {totals?.totalAdvance > 0 && <SummaryRow label={t('advance_deduction')} value={`- ₹ ${totals.totalAdvance.toLocaleString()}`} />}
                    <View style={[styles.divider, { backgroundColor: activeColors.border }]} />
                </View>
            )}

            <View style={styles.grandTotalRow}>
                <View>
                    <Text style={[styles.grandTotalLabel, { color: activeColors.text }]}>{t('net_payable')}</Text>
                    {!expanded && (
                        <Text style={[styles.summaryShort, { color: activeColors.textLight }]}>
                            {state.items.length} {t('items')} | {(totals?.totalWeight || 0).toFixed(3)} g
                        </Text>
                    )}
                </View>
                <Text style={[styles.grandTotalValue, { color: activeColors.success }]}>₹ {(totals?.grandTotal || 0).toLocaleString()}</Text>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    card: {
        padding: SPACING.md,
        paddingTop: SPACING.xs,
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
        paddingVertical: SPACING.xs,
        marginBottom: SPACING.xs,
    },
    indicator: {
        width: 40,
        height: 4,
        borderRadius: 2,
        marginBottom: 4,
    },
    detailsContainer: {
        marginBottom: SPACING.xs,
    },
    row: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: SPACING.xs,
    },
    label: {
        fontSize: FONT_SIZES.sm,
    },
    value: {
        fontSize: FONT_SIZES.sm,
        fontWeight: '600',
    },
    divider: {
        height: 1,
        marginVertical: SPACING.sm,
    },
    grandTotalRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingBottom: SPACING.xs,
    },
    grandTotalLabel: {
        fontSize: FONT_SIZES.md,
        fontWeight: 'bold',
    },
    summaryShort: {
        fontSize: 10,
    },
    grandTotalValue: {
        fontSize: FONT_SIZES.xl,
        fontWeight: 'bold',
    },
});
