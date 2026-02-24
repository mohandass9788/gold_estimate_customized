import React from 'react';
import { View as RNView, Text as RNText, StyleSheet, TouchableOpacity as RNRTouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SPACING, FONT_SIZES, BORDER_RADIUS } from '../constants/theme';
import { GoldRate } from '../types';
import { format } from 'date-fns';
import { useGeneralSettings } from '../store/GeneralSettingsContext';
import { LIGHT_COLORS, DARK_COLORS } from '../constants/theme';
import SafeLinearGradient from './SafeLinearGradient';

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

    return (
        <SafeLinearGradient
            colors={theme === 'light' ? ['#FFF', '#F8F9FA'] : ['#1C1C1E', '#000']}
            style={[styles.card, { borderColor: colors.border }]}
        >
            <View style={styles.headerRow}>
                <View style={styles.liveBadge}>
                    <View style={styles.dot} />
                    <Text style={styles.liveText}>LIVE</Text>
                </View>
                <Text style={[styles.dateText, { color: colors.textLight }]}>
                    {format(new Date(rate.date), 'MMM dd')}
                </Text>
                {onEdit && (
                    <TouchableOpacity onPress={onEdit} style={styles.compactEditBtn}>
                        <Icon name="pencil" size={14} color={colors.primary} />
                    </TouchableOpacity>
                )}
            </View>

            <View style={styles.ratesRow}>
                {/* Gold Rate */}
                <View style={styles.rateItem}>
                    <View style={[styles.miniIcon, { backgroundColor: '#FFD70020' }]}>
                        <Icon name="medal" size={14} color="#FFD700" />
                    </View>
                    <View>
                        <Text style={styles.miniLabel}>Gold 22K</Text>
                        <Text style={[styles.compactValue, { color: colors.primary }]}>₹{rate.rate22k.toLocaleString()}</Text>
                    </View>
                </View>

                <View style={styles.smallDivider} />

                {/* Silver Rate */}
                <View style={styles.rateItem}>
                    <View style={[styles.miniIcon, { backgroundColor: '#C0C0C030' }]}>
                        <Icon name="leaf" size={14} color="#C0C0C0" />
                    </View>
                    <View>
                        <Text style={styles.miniLabel}>Silver 99K</Text>
                        <Text style={[styles.compactValue, { color: colors.text }]}>₹{rate.silver.toLocaleString()}</Text>
                    </View>
                </View>
            </View>
        </SafeLinearGradient>
    );
}

const styles = StyleSheet.create({
    card: {
        borderRadius: 20,
        paddingHorizontal: 16,
        paddingVertical: 12,
        marginBottom: 16,
        borderWidth: 1,
        elevation: 4,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
    },
    headerRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 10,
    },
    liveBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#4BB54315',
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: 10,
        marginRight: 8,
    },
    dot: {
        width: 6,
        height: 6,
        borderRadius: 3,
        backgroundColor: '#4BB543',
        marginRight: 4,
    },
    liveText: {
        fontSize: 10,
        fontWeight: '900',
        color: '#4BB543',
        letterSpacing: 0.5,
    },
    dateText: {
        fontSize: 11,
        fontWeight: '600',
        flex: 1,
    },
    compactEditBtn: {
        padding: 4,
    },
    ratesRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    rateItem: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
    },
    miniIcon: {
        width: 28,
        height: 28,
        borderRadius: 14,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 8,
    },
    miniLabel: {
        fontSize: 10,
        fontWeight: '600',
        color: '#888',
        marginBottom: -2,
    },
    compactValue: {
        fontSize: 18,
        fontWeight: '900',
        letterSpacing: -0.5,
    },
    smallDivider: {
        width: 1,
        height: 24,
        backgroundColor: 'rgba(0,0,0,0.06)',
        marginHorizontal: 12,
    },
});
