import React, { useState } from 'react';
import {
    Modal as RNModal,
    View as RNView,
    Text as RNText,
    StyleSheet,
    TouchableOpacity as RNRTouchableOpacity,
    TouchableWithoutFeedback as RNTouchableWithoutFeedback,
    Keyboard,
    KeyboardAvoidingView as RNKeyboardAvoidingView,
    Platform,
    ScrollView as RNScrollView,
    Alert as RNAlert
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SPACING, FONT_SIZES, BORDER_RADIUS } from '../constants/theme';
import InputField from './InputField';
import PrimaryButton from './PrimaryButton';
import { GoldRate } from '../types';
import { useGeneralSettings } from '../store/GeneralSettingsContext';

const View = RNView as any;
const Text = RNText as any;
const ScrollView = RNScrollView as any;
const Alert = RNAlert as any;
const Icon = Ionicons as any;
const TouchableOpacity = RNRTouchableOpacity as any;
const Modal = RNModal as any;
const KeyboardAvoidingView = RNKeyboardAvoidingView as any;
const TouchableWithoutFeedback = RNTouchableWithoutFeedback as any;

interface RateUpdateModalProps {
    visible: boolean;
    currentRate: GoldRate;
    onClose: () => void;
    onUpdate: (rate: GoldRate) => void;
}

export default function RateUpdateModal({ visible, currentRate, onClose, onUpdate }: RateUpdateModalProps) {
    const { t } = useGeneralSettings();
    const [rate22k, setRate22k] = useState(currentRate.rate22k.toString());
    const [silver, setSilver] = useState(currentRate.silver.toString());

    // Derived rates (state for display only in modal)
    const [rate24k, setRate24k] = useState(currentRate.rate24k.toString());
    const [rate20k, setRate20k] = useState(currentRate.rate20k.toString());
    const [rate18k, setRate18k] = useState(currentRate.rate18k.toString());

    const handleUpdate = () => {
        const r22k = parseFloat(rate22k) || 0;
        const r24k = parseFloat(rate24k) || 0;
        const r20k = parseFloat(rate20k) || 0;
        const r18k = parseFloat(rate18k) || 0;

        onUpdate({
            ...currentRate,
            rate24k: r24k,
            rate22k: r22k,
            rate20k: r20k,
            rate18k: r18k,
            silver: parseFloat(silver) || 0,
            date: new Date().toISOString()
        });
        onClose();
    };

    const updateCalculatedRates = (val22k: string) => {
        const val = parseFloat(val22k);
        if (!isNaN(val) && val > 0) {
            // Calculate 24K from 22K: 24k = 22k / 0.916
            const pure = Math.round(val / 0.916);
            setRate24k(pure.toString());
            setRate20k(Math.round(pure * 0.833).toString());
            setRate18k(Math.round(pure * 0.75).toString());
        } else {
            setRate24k('');
            setRate20k('');
            setRate18k('');
        }
    };

    return (
        <Modal
            visible={visible}
            transparent
            animationType="fade"
            onRequestClose={onClose}
        >
            <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
                <View style={styles.overlay}>
                    <KeyboardAvoidingView
                        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                        style={styles.modalContainer}
                    >
                        <View style={styles.content}>
                            <View style={styles.header}>
                                <Text style={styles.title}>{t('update_daily_rates')}</Text>
                                <TouchableOpacity onPress={onClose}>
                                    <Icon name="close" size={24} color={COLORS.text} />
                                </TouchableOpacity>
                            </View>

                            <View style={styles.body}>
                                <View style={styles.row}>
                                    <InputField
                                        label={`${t('gold')} 22K`}
                                        value={rate22k}
                                        onChangeText={(text) => {
                                            setRate22k(text);
                                            updateCalculatedRates(text);
                                        }}
                                        keyboardType="numeric"
                                        style={{ flex: 1, marginRight: SPACING.md }}
                                    />
                                    <InputField
                                        label={t('silver')}
                                        value={silver}
                                        onChangeText={setSilver}
                                        keyboardType="numeric"
                                        style={{ flex: 1 }}
                                    />
                                </View>

                                {(rate24k !== '' || rate18k !== '') && (
                                    <View style={styles.rateCard}>
                                        <Text style={styles.rateCardTitle}>{t('calc_rates_ref')}</Text>
                                        <View style={styles.rateRow}>
                                            <Text style={styles.rateLabel}>{t('gold_24k_pure')}</Text>
                                            <Text style={styles.rateValue}>₹ {rate24k}</Text>
                                        </View>
                                        <View style={styles.rateRow}>
                                            <Text style={styles.rateLabel}>20K (83.3%):</Text>
                                            <Text style={styles.rateValue}>₹ {rate20k}</Text>
                                        </View>
                                        <View style={styles.rateRow}>
                                            <Text style={styles.rateLabel}>18K (75%):</Text>
                                            <Text style={styles.rateValue}>₹ {rate18k}</Text>
                                        </View>
                                    </View>
                                )}
                            </View>

                            <View style={styles.footer}>
                                <PrimaryButton title={t('update_rates')} onPress={handleUpdate} />
                            </View>
                        </View>
                    </KeyboardAvoidingView>
                </View>
            </TouchableWithoutFeedback>
        </Modal>
    );
}

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'center',
        padding: SPACING.lg,
    },
    modalContainer: {
        width: '100%',
    },
    content: {
        backgroundColor: COLORS.white,
        borderRadius: BORDER_RADIUS.lg,
        overflow: 'hidden',
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: SPACING.md,
        borderBottomWidth: 1,
        borderBottomColor: COLORS.background,
    },
    title: {
        fontSize: FONT_SIZES.md,
        fontWeight: 'bold',
        color: COLORS.primary,
    },
    body: {
        padding: SPACING.md,
    },
    row: {
        flexDirection: 'row',
        marginBottom: SPACING.sm,
    },
    footer: {
        padding: SPACING.md,
        borderTopWidth: 1,
        borderTopColor: COLORS.background,
    },
    rateCard: {
        backgroundColor: COLORS.background,
        padding: SPACING.md,
        borderRadius: BORDER_RADIUS.md,
        marginTop: SPACING.md,
    },
    rateCardTitle: {
        fontSize: FONT_SIZES.md,
        fontWeight: 'bold',
        color: COLORS.text,
        marginBottom: SPACING.sm,
    },
    rateRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 4,
    },
    rateLabel: {
        fontSize: FONT_SIZES.sm,
        color: COLORS.textLight,
    },
    rateValue: {
        fontSize: FONT_SIZES.sm,
        fontWeight: 'bold',
        color: COLORS.primary,
    },
});
