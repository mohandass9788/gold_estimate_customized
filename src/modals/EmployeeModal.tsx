import React, { useState } from 'react';
import { Modal, View, Text, StyleSheet, TextInput, TouchableOpacity, KeyboardAvoidingView, Platform } from 'react-native';
import { useGeneralSettings } from '../store/GeneralSettingsContext';
import { COLORS, SPACING, FONT_SIZES, BORDER_RADIUS, LIGHT_COLORS, DARK_COLORS } from '../constants/theme';
import PrimaryButton from '../components/PrimaryButton';

export default function EmployeeModal() {
    const { theme, t, showEmployeeModal, setShowEmployeeModal, handleEmployeeConfirm, currentEmployeeName } = useGeneralSettings();
    const [name, setName] = useState(currentEmployeeName);
    const [isConfirming, setIsConfirming] = useState(!!currentEmployeeName);
    const activeColors = theme === 'light' ? LIGHT_COLORS : DARK_COLORS;

    // Reset state when modal opens
    React.useEffect(() => {
        if (showEmployeeModal) {
            setName(currentEmployeeName);
            setIsConfirming(!!currentEmployeeName);
        }
    }, [showEmployeeModal, currentEmployeeName]);

    const handleConfirm = () => {
        if (isConfirming) {
            handleEmployeeConfirm(currentEmployeeName);
        } else {
            if (!name.trim()) return;
            handleEmployeeConfirm(name);
        }
    };

    return (
        <Modal
            visible={showEmployeeModal}
            transparent
            animationType="fade"
            onRequestClose={() => setShowEmployeeModal(false)}
        >
            <View style={styles.overlay}>
                <KeyboardAvoidingView
                    behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                    style={styles.keyboardView}
                >
                    <View style={[styles.container, { backgroundColor: activeColors.cardBg }]}>
                        <Text style={[styles.title, { color: activeColors.text }]}>
                            {isConfirming ? (t('verify_operator') || 'Verify Operator') : (t('operator_required') || 'Employee Identification')}
                        </Text>
                        <Text style={[styles.subtitle, { color: activeColors.textLight }]}>
                            {isConfirming
                                ? (t('operator_correct_msg', { name: currentEmployeeName }) || `Is this you: ${currentEmployeeName}?`)
                                : (t('enter_operator_msg') || 'Please enter your name/ID to proceed with printing.')}
                        </Text>

                        {!isConfirming && (
                            <TextInput
                                style={[styles.input, {
                                    color: activeColors.text,
                                    borderColor: activeColors.border,
                                    backgroundColor: activeColors.background
                                }]}
                                value={name}
                                onChangeText={setName}
                                placeholder="Employee Name / ID"
                                placeholderTextColor={activeColors.textLight}
                                autoFocus
                            />
                        )}

                        <View style={styles.footer}>
                            <TouchableOpacity
                                onPress={() => setShowEmployeeModal(false)}
                                style={styles.cancelButton}
                            >
                                <Text style={[styles.cancelText, { color: activeColors.textLight }]}>
                                    {t('cancel')}
                                </Text>
                            </TouchableOpacity>

                            {isConfirming ? (
                                <>
                                    <TouchableOpacity
                                        onPress={() => setIsConfirming(false)}
                                        style={[styles.cancelButton, { marginRight: SPACING.sm }]}
                                    >
                                        <Text style={[styles.cancelText, { color: activeColors.error }]}>
                                            {t('no') || 'No'}
                                        </Text>
                                    </TouchableOpacity>
                                    <PrimaryButton
                                        title={t('yes') || "Yes"}
                                        onPress={handleConfirm}
                                        style={styles.confirmButton}
                                    />
                                </>
                            ) : (
                                <PrimaryButton
                                    title={t('done') || "Confirm"}
                                    onPress={handleConfirm}
                                    disabled={!name.trim()}
                                    style={styles.confirmButton}
                                />
                            )}
                        </View>
                    </View>
                </KeyboardAvoidingView>
            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.6)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    keyboardView: {
        width: '100%',
        alignItems: 'center',
    },
    container: {
        width: '85%',
        padding: SPACING.lg,
        borderRadius: BORDER_RADIUS.lg,
        elevation: 5,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 3.84,
    },
    title: {
        fontSize: FONT_SIZES.lg,
        fontWeight: 'bold',
        marginBottom: SPACING.xs,
        textAlign: 'center',
    },
    subtitle: {
        fontSize: FONT_SIZES.sm,
        marginBottom: SPACING.lg,
        textAlign: 'center',
    },
    input: {
        height: 50,
        borderWidth: 1,
        borderRadius: BORDER_RADIUS.md,
        paddingHorizontal: SPACING.md,
        fontSize: FONT_SIZES.md,
        marginBottom: SPACING.xl,
    },
    footer: {
        flexDirection: 'row',
        justifyContent: 'flex-end',
        alignItems: 'center',
        gap: SPACING.md,
    },
    cancelButton: {
        paddingHorizontal: SPACING.md,
        paddingVertical: SPACING.sm,
    },
    cancelText: {
        fontWeight: '600',
    },
    confirmButton: {
        minWidth: 120,
    }
});
