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

    return (
        <View style={[styles.card, { backgroundColor: theme === 'light' ? 'rgba(255, 255, 255, 0.95)' : 'rgba(30, 30, 30, 0.9)' }]}>
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

            <View style={styles.mainContent}>
                <View style={styles.ratesContainer}>
                    {/* Gold 22K Section */}
                    <View style={styles.rateBox}>
                        <View style={[styles.iconCircle, { backgroundColor: '#FFD70015' }]}>
                            <Icon name="medal" size={18} color="#FFD700" />
                        </View>
                        <Text style={styles.rateLabel}>Gold 22K</Text>
                        <Text style={[styles.rateValue, { color: colors.primary }]}>₹{rate.rate22k.toLocaleString()}</Text>
                        <Text style={styles.unitText}>per gram</Text>
                    </View>

                    <View style={styles.verticalDivider} />

                    {/* Silver Section */}
                    <View style={styles.rateBox}>
                        <View style={[styles.iconCircle, { backgroundColor: '#C0C0C020' }]}>
                            <Icon name="leaf" size={18} color="#C0C0C0" />
                        </View>
                        <Text style={styles.rateLabel}>Silver 99K</Text>
                        <Text style={[styles.rateValue, { color: colors.text }]}>₹{rate.silver.toLocaleString()}</Text>
                        <Text style={styles.unitText}>per gram</Text>
                    </View>
                </View>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    card: {
        borderRadius: 24,
        padding: SPACING.md,
        marginBottom: SPACING.lg,
        borderWidth: 1,
        borderColor: 'rgba(212, 175, 55, 0.3)',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.12,
        shadowRadius: 16,
        elevation: 8,
    },
    cardHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: SPACING.md,
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
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: '#4BB543',
        marginRight: 6,
        shadowColor: '#4BB543',
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.8,
        shadowRadius: 4,
    },
    liveText: {
        fontSize: 11,
        fontWeight: '900',
        color: '#4BB543',
        letterSpacing: 1.2,
    },
    dateText: {
        fontSize: 12,
        fontWeight: '500',
        opacity: 0.8,
    },
    editBtn: {
        width: 38,
        height: 38,
        borderRadius: 19,
        justifyContent: 'center',
        alignItems: 'center',
    },
    mainContent: {
        paddingVertical: SPACING.xs,
    },
    ratesContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-around',
    },
    rateBox: {
        flex: 1,
        alignItems: 'center',
        paddingVertical: SPACING.xs,
    },
    iconCircle: {
        width: 36,
        height: 36,
        borderRadius: 18,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 8,
    },
    rateLabel: {
        fontSize: 12,
        fontWeight: '600',
        color: '#888',
        marginBottom: 4,
    },
    rateValue: {
        fontSize: 22,
        fontWeight: '900',
        letterSpacing: -0.5,
    },
    unitText: {
        fontSize: 10,
        color: '#999',
        fontWeight: '500',
        marginTop: 2,
    },
    verticalDivider: {
        width: 1,
        height: '70%',
        backgroundColor: 'rgba(0,0,0,0.06)',
        marginHorizontal: SPACING.sm,
    },
});
