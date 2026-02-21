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
import { COLORS, SPACING, FONT_SIZES, BORDER_RADIUS, LIGHT_COLORS, DARK_COLORS } from '../constants/theme';
import InputField from '../components/InputField';
import PrimaryButton from '../components/PrimaryButton';
import { Customer } from '../types';
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

interface CustomerDetailsModalProps {
    visible: boolean;
    onClose: () => void;
    onSubmit: (customer: Customer) => void;
    initialData?: Customer | null;
}

export default function CustomerDetailsModal({ visible, onClose, onSubmit, initialData }: CustomerDetailsModalProps) {
    const { theme, t } = useGeneralSettings();
    const activeColors = theme === 'light' ? LIGHT_COLORS : DARK_COLORS;

    const [name, setName] = useState(initialData?.name || '');
    const [mobile, setMobile] = useState(initialData?.mobile || '');
    const [email, setEmail] = useState(initialData?.email || '');
    const [address, setAddress] = useState(initialData?.address || '');

    const handleSubmit = () => {
        if (!name || !mobile) {
            Alert.alert(t('error') || 'Error', t('field_required'));
            return;
        }
        onSubmit({ name, mobile, email, address });
        onClose();
    };

    return (
        <Modal visible={visible} animationType="slide" transparent>
            <View style={styles.overlay}>
                <View style={[styles.modalContainer, { backgroundColor: activeColors.cardBg }]}>
                    <Text style={[styles.title, { color: activeColors.primary }]}>{t('customer_info')}</Text>

                    <ScrollView>
                        <InputField
                            label={t('customer_name') + " *"}
                            value={name}
                            onChangeText={setName}
                            placeholder={t('enter_name') || "Enter Name"}
                        />
                        <InputField
                            label={t('phone_number') + " *"}
                            value={mobile}
                            onChangeText={setMobile}
                            placeholder={t('enter_mobile') || "Enter Mobile"}
                            keyboardType="phone-pad"
                        />
                        <InputField
                            label={t('email') + " (" + (t('optional') || 'Optional') + ")"}
                            value={email}
                            onChangeText={setEmail}
                            placeholder={t('enter_email') || "Enter Email"}
                            keyboardType="email-address"
                        />
                        <InputField
                            label={(t('address') || "Address") + " (" + (t('optional') || 'Optional') + ")"}
                            value={address}
                            onChangeText={setAddress}
                            placeholder={t('enter_address') || "Enter Address"}
                        />
                    </ScrollView>

                    <View style={styles.buttonRow}>
                        <TouchableOpacity onPress={onClose} style={styles.cancelButton}>
                            <Text style={[styles.cancelText, { color: activeColors.textLight }]}>{t('cancel') || 'Cancel'}</Text>
                        </TouchableOpacity>
                        <PrimaryButton title={t('save') || "Save"} onPress={handleSubmit} style={styles.saveButton} />
                    </View>
                </View>
            </View>
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
        borderRadius: BORDER_RADIUS.lg,
        padding: SPACING.lg,
        maxHeight: '80%',
    },
    title: {
        fontSize: FONT_SIZES.xl,
        fontWeight: 'bold',
        marginBottom: SPACING.lg,
        textAlign: 'center',
    },
    buttonRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginTop: SPACING.lg,
    },
    cancelButton: {
        padding: SPACING.md,
    },
    cancelText: {
        fontSize: FONT_SIZES.md,
    },
    saveButton: {
        minWidth: 120,
    }
});
