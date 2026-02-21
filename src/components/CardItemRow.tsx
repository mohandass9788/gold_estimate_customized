import React from 'react';
import { View as RNView, Text as RNText, StyleSheet, TouchableOpacity as RNRTouchableOpacity } from 'react-native';
import { COLORS, SPACING, FONT_SIZES, BORDER_RADIUS, LIGHT_COLORS, DARK_COLORS } from '../constants/theme';
import { EstimationItem } from '../types';
import { Ionicons } from '@expo/vector-icons';
import { useGeneralSettings } from '../store/GeneralSettingsContext';

// Fix for React 19 type mismatch
const View = RNView as any;
const Text = RNText as any;
const Icon = Ionicons as any;
const TouchableOpacity = RNRTouchableOpacity as any;

interface CardItemRowProps {
    item: EstimationItem;
    onRemove: () => void;
    onEdit?: () => void;
    onView?: () => void;
    selected?: boolean;
    onToggleSelection?: () => void;
}

export default function CardItemRow({ item, onRemove, onEdit, onView, selected, onToggleSelection }: CardItemRowProps) {
    const { theme, t } = useGeneralSettings();
    const activeColors = theme === 'light' ? LIGHT_COLORS : DARK_COLORS;

    return (
        <View style={[styles.card, { backgroundColor: activeColors.cardBg, borderColor: selected ? activeColors.primary : activeColors.border }]}>
            <View style={styles.row}>
                {onToggleSelection && (
                    <TouchableOpacity onPress={onToggleSelection} style={styles.checkboxContainer}>
                        <Icon name={selected ? "checkbox" : "square-outline"} size={22} color={selected ? activeColors.primary : activeColors.textLight} />
                    </TouchableOpacity>
                )}
                <View style={styles.infoContainer}>
                    <View style={styles.nameRow}>
                        <Text style={[styles.name, { color: activeColors.text }]}>{item.name}</Text>
                        {item.customerName && (
                            <Text style={[styles.customerName, { color: activeColors.primary }]}> ({item.customerName})</Text>
                        )}
                    </View>
                    <Text style={[styles.tag, { color: activeColors.textLight }]}>{item.tagNumber || t('manual_entry')}</Text>
                </View>
                <View style={styles.actionRow}>
                    {onEdit && (
                        <TouchableOpacity onPress={onEdit} style={styles.iconButton}>
                            <Icon name="pencil-outline" size={20} color={activeColors.primary} />
                        </TouchableOpacity>
                    )}
                    {onView && (
                        <TouchableOpacity onPress={onView} style={styles.iconButton}>
                            <Icon name="eye-outline" size={20} color={activeColors.primary} />
                        </TouchableOpacity>
                    )}
                    <TouchableOpacity onPress={() => onRemove()} style={styles.iconButton}>
                        <Icon name="trash-outline" size={20} color={activeColors.error} />
                    </TouchableOpacity>
                </View>
            </View>

            <View style={[styles.detailsRow, { backgroundColor: activeColors.background }]}>
                <DetailItem label={t('metal')} value={item.metal || t('gold')} colors={activeColors} />
                <DetailItem label={t('purity')} value={item.metal === 'SILVER' ? item.purity.toString() : `${item.purity}K`} colors={activeColors} />
                <DetailItem label={t('gross_weight').split(' ')[0]} value={`${(item.grossWeight || 0).toFixed(3)}g`} colors={activeColors} />
                <DetailItem label="VA %" value={`${item.wastage || 0}%`} colors={activeColors} />
                <DetailItem label="MC" value={`₹${(item.makingChargeValue || 0).toFixed(0)}`} colors={activeColors} />
            </View>

            <View style={styles.footer}>
                <Text style={[styles.totalLabel, { color: activeColors.text }]}>{t('total')}:</Text>
                <Text style={[styles.totalValue, { color: activeColors.primary }]}>₹ {item.totalValue.toLocaleString()}</Text>
            </View>
        </View>
    );
}

const DetailItem = ({ label, value, colors }: { label: string; value: string; colors: any }) => (
    <View style={styles.detailItem}>
        <Text style={[styles.detailLabel, { color: colors.textLight }]}>{label}</Text>
        <Text style={[styles.detailValue, { color: colors.text }]}>{value}</Text>
    </View>
);

const styles = StyleSheet.create({
    card: {
        borderRadius: BORDER_RADIUS.md,
        padding: SPACING.md,
        marginBottom: SPACING.sm,
        borderWidth: 1,
    },
    row: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: SPACING.sm,
    },
    infoContainer: {
        flex: 1,
    },
    checkboxContainer: {
        marginRight: SPACING.sm,
        justifyContent: 'center',
    },
    nameRow: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    name: {
        fontSize: FONT_SIZES.md,
        fontWeight: 'bold',
    },
    customerName: {
        fontSize: FONT_SIZES.xs,
        fontWeight: 'bold',
    },
    tag: {
        fontSize: FONT_SIZES.xs,
    },
    actionRow: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    iconButton: {
        padding: SPACING.xs,
        marginLeft: SPACING.xs,
    },
    detailsRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: SPACING.sm,
        padding: SPACING.sm,
        borderRadius: BORDER_RADIUS.sm,
    },
    detailItem: {
        alignItems: 'center',
    },
    detailLabel: {
        fontSize: 10,
    },
    detailValue: {
        fontSize: 11,
        fontWeight: '600',
    },
    footer: {
        flexDirection: 'row',
        justifyContent: 'flex-end',
        alignItems: 'center',
        gap: SPACING.sm,
    },
    totalLabel: {
        fontSize: FONT_SIZES.sm,
    },
    totalValue: {
        fontSize: FONT_SIZES.lg,
        fontWeight: 'bold',
    },
});
