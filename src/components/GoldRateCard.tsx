import React from 'react';
import { View as RNView, Text as RNText, StyleSheet, TouchableOpacity as RNRTouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SPACING, FONT_SIZES, BORDER_RADIUS } from '../constants/theme';
import { GoldRate } from '../types';
import { format } from 'date-fns';
import { useGeneralSettings } from '../store/GeneralSettingsContext';
import { LIGHT_COLORS, DARK_COLORS } from '../constants/theme';

const View = RNView as any;
const Text = RNText as any;
const Icon = Ionicons as any;
const TouchableOpacity = RNRTouchableOpacity as any;

interface GoldRateCardProps {
    rate: GoldRate;
    onEdit?: () => void;
}

export default function GoldRateCard({ rate, onEdit }: GoldRateCardProps) {
    const { theme } = useGeneralSettings();
    const colors = theme === 'light' ? LIGHT_COLORS : DARK_COLORS;

    const MetalItem = ({ label, value, color }: { label: string; value: number; color: string }) => (
        <View style={styles.metalItem}>
            <Text style={styles.metalItemLabel}>{label}</Text>
            <Text style={[styles.metalItemValue, { color }]}>₹{value.toLocaleString()}</Text>
        </View>
    );

    return (
        <View style={[styles.card, { backgroundColor: theme === 'light' ? 'rgba(255, 255, 255, 0.9)' : 'rgba(30, 30, 30, 0.8)' }]}>
            <View style={styles.cardHeader}>
                <View style={styles.titleInfo}>
                    <View style={styles.liveIndicator}>
                        <View style={styles.dot} />
                        <Text style={styles.liveText}>LIVE RATES</Text>
                    </View>
                    <Text style={[styles.dateText, { color: colors.textLight }]}>{format(new Date(rate.date), 'MMMM dd, yyyy')}</Text>
                </View>
                {onEdit && (
                    <TouchableOpacity onPress={onEdit} style={[styles.editBtn, { backgroundColor: colors.primary + '15' }]}>
                        <Icon name="pencil" size={16} color={colors.primary} />
                    </TouchableOpacity>
                )}
            </View>

            <View style={styles.divider} />

            <View style={styles.mainContent}>
                {/* Gold Section */}
                <View style={styles.sectionContainer}>
                    <View style={styles.sectionHeader}>
                        <View style={[styles.iconBox, { backgroundColor: '#FFD70015' }]}>
                            <Icon name="medal-outline" size={18} color="#FFD700" />
                        </View>
                        <Text style={[styles.sectionTitle, { color: colors.text }]}>Gold Rates (per gram)</Text>
                    </View>
                    <View style={styles.ratesRow}>
                        <MetalItem label="24K (Fine)" value={rate.rate24k} color={colors.primary} />
                        <View style={styles.verticalDivider} />
                        <MetalItem label="22K (Jewel)" value={rate.rate22k} color={colors.primary} />
                        <View style={styles.verticalDivider} />
                        <MetalItem label="18K (Standard)" value={rate.rate18k} color={colors.primary} />
                    </View>
                </View>

                {/* Silver Section */}
                <View style={[styles.sectionContainer, { marginTop: SPACING.md }]}>
                    <View style={styles.sectionHeader}>
                        <View style={[styles.iconBox, { backgroundColor: '#C0C0C015' }]}>
                            <Icon name="leaf-outline" size={18} color="#C0C0C0" />
                        </View>
                        <Text style={[styles.sectionTitle, { color: colors.text }]}>Silver Rates (per gram)</Text>
                    </View>
                    <View style={styles.ratesRow}>
                        <MetalItem label="Pure Silver" value={rate.silver} color="#C0C0C0" />
                    </View>
                </View>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    card: {
        borderRadius: BORDER_RADIUS.lg,
        padding: SPACING.md,
        marginBottom: SPACING.lg,
        borderWidth: 1,
        borderColor: 'rgba(212, 175, 55, 0.2)',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.1,
        shadowRadius: 20,
        elevation: 10,
    },
    cardHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: SPACING.sm,
    },
    titleInfo: {
        flex: 1,
    },
    liveIndicator: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 2,
    },
    dot: {
        width: 6,
        height: 6,
        borderRadius: 3,
        backgroundColor: '#4BB543',
        marginRight: 6,
        shadowColor: '#4BB543',
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.8,
        shadowRadius: 4,
    },
    liveText: {
        fontSize: 10,
        fontWeight: '900',
        color: '#4BB543',
        letterSpacing: 1,
    },
    dateText: {
        fontSize: 12,
        fontWeight: '500',
    },
    editBtn: {
        width: 36,
        height: 36,
        borderRadius: 18,
        justifyContent: 'center',
        alignItems: 'center',
    },
    divider: {
        height: 1,
        backgroundColor: 'rgba(212, 175, 55, 0.1)',
        marginVertical: SPACING.sm,
    },
    mainContent: {
        paddingTop: SPACING.xs,
    },
    sectionContainer: {
        width: '100%',
    },
    sectionHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: SPACING.sm,
    },
    iconBox: {
        width: 32,
        height: 32,
        borderRadius: 10,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 10,
    },
    sectionTitle: {
        fontSize: 13,
        fontWeight: '700',
        letterSpacing: 0.3,
    },
    ratesRow: {
        flexDirection: 'row',
        backgroundColor: 'rgba(0,0,0,0.03)',
        borderRadius: BORDER_RADIUS.md,
        padding: SPACING.sm,
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    metalItem: {
        flex: 1,
        alignItems: 'center',
    },
    metalItemLabel: {
        fontSize: 10,
        color: '#777',
        fontWeight: '600',
        marginBottom: 2,
    },
    metalItemValue: {
        fontSize: 15,
        fontWeight: '900',
    },
    verticalDivider: {
        width: 1,
        height: 20,
        backgroundColor: 'rgba(0,0,0,0.05)',
    },
});
