import React from 'react';
import { View as RNView, Text as RNText, StyleSheet, TouchableOpacity as RNRTouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SPACING, FONT_SIZES, BORDER_RADIUS } from '../constants/theme';
import { GoldRate } from '../types';
import { format } from 'date-fns';

const View = RNView as any;
const Text = RNText as any;
const Icon = Ionicons as any;
const TouchableOpacity = RNRTouchableOpacity as any;

interface GoldRateCardProps {
    rate: GoldRate;
    onEdit?: () => void;
}

export default function GoldRateCard({ rate, onEdit }: GoldRateCardProps) {
    const GoldRateItem = ({ label, value, color = COLORS.primary }: { label: string; value: number; color?: string }) => (
        <View style={styles.item}>
            <Text style={styles.label}>{label}</Text>
            <Text style={[styles.value, { color }]}>₹{value.toLocaleString()}</Text>
        </View>
    );

    const SilverRateItem = ({ label, value }: { label: string; value: number }) => (
        <View style={styles.silverItem}>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 2 }}>
                <Icon name="leaf-outline" size={12} color="#C0C0C0" style={{ marginRight: 4 }} />
                <Text style={styles.label}>{label}</Text>
            </View>
            <Text style={[styles.value, { color: '#C0C0C0' }]}>₹{value.toLocaleString()}</Text>
        </View>
    );

    return (
        <View style={styles.card}>
            <View style={styles.header}>
                <View style={styles.titleRow}>
                    <View style={styles.indicator} />
                    <Text style={styles.headerTitle}>Live Metal Rates (1g)</Text>
                </View>
                <View style={styles.headerRight}>
                    <Text style={styles.date}>{format(new Date(rate.date), 'dd MMM')}</Text>
                    {onEdit && (
                        <TouchableOpacity onPress={onEdit} style={styles.editButton}>
                            <Icon name="create-outline" size={18} color={COLORS.primary} />
                        </TouchableOpacity>
                    )}
                </View>
            </View>

            <View style={styles.content}>
                {/* Gold Row */}
                <View style={styles.metalRow}>
                    <View style={styles.metalHeader}>
                        <Icon name="flash-outline" size={14} color={COLORS.gold} />
                        <Text style={styles.metalLabel}>Gold</Text>
                    </View>
                    <View style={styles.ratesContainer}>
                        <GoldRateItem label="24K" value={rate.rate24k} />
                        <View style={styles.divider} />
                        <GoldRateItem label="22K" value={rate.rate22k} />
                        <View style={styles.divider} />
                        <GoldRateItem label="18K" value={rate.rate18k} />
                    </View>
                </View>

                {/* Silver Row */}
                <View style={[styles.metalRow, { marginTop: SPACING.sm, borderColor: 'rgba(192, 192, 192, 0.2)' }]}>
                    <View style={styles.metalHeader}>
                        <Icon name="leaf-outline" size={14} color="#C0C0C0" />
                        <Text style={[styles.metalLabel, { color: '#C0C0C0' }]}>Silver</Text>
                    </View>
                    <View style={styles.ratesContainer}>
                        <SilverRateItem label="Common" value={rate.silver} />
                    </View>
                </View>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    card: {
        backgroundColor: COLORS.secondary,
        borderRadius: BORDER_RADIUS.md,
        padding: SPACING.sm,
        marginBottom: SPACING.md,
        elevation: 4,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.15,
        shadowRadius: 4,
        borderWidth: 1,
        borderColor: 'rgba(255, 215, 0, 0.1)',
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: SPACING.xs,
        marginBottom: SPACING.xs,
    },
    titleRow: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    indicator: {
        width: 3,
        height: 12,
        backgroundColor: COLORS.primary,
        borderRadius: 2,
        marginRight: 6,
    },
    headerTitle: {
        color: COLORS.white,
        fontWeight: '700',
        fontSize: 10,
        letterSpacing: 0.5,
    },
    headerRight: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    date: {
        color: COLORS.textLight,
        fontSize: 10,
        marginRight: SPACING.sm,
    },
    editButton: {
        padding: 4,
        backgroundColor: 'rgba(255, 215, 0, 0.1)',
        borderRadius: 6,
    },
    content: {
        paddingTop: 4,
    },
    metalRow: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(255,255,255,0.05)',
        padding: SPACING.sm,
        borderRadius: BORDER_RADIUS.sm,
        borderWidth: 1,
        borderColor: 'rgba(255, 215, 0, 0.2)',
    },
    metalHeader: {
        width: 50,
        alignItems: 'center',
        borderRightWidth: 1,
        borderRightColor: 'rgba(255,255,255,0.1)',
        marginRight: SPACING.sm,
    },
    metalLabel: {
        color: COLORS.gold,
        fontSize: 10,
        fontWeight: 'bold',
        marginTop: 2,
    },
    ratesContainer: {
        flex: 1,
        flexDirection: 'row',
        justifyContent: 'space-around',
        alignItems: 'center',
    },
    item: {
        alignItems: 'center',
        flex: 1,
    },
    silverItem: {
        alignItems: 'center',
        flex: 1,
    },
    label: {
        color: COLORS.textLight,
        fontSize: 9,
        fontWeight: 'bold',
    },
    value: {
        fontSize: FONT_SIZES.sm,
        fontWeight: 'bold',
    },
    divider: {
        width: 1,
        height: 15,
        backgroundColor: 'rgba(255,255,255,0.1)',
    },
});
