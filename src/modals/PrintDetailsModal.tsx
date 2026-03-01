import React, { useState, useEffect } from 'react';
import {
    Modal as RNModal,
    View as RNView,
    Text as RNText,
    StyleSheet,
    TouchableOpacity as RNRTouchableOpacity,
    KeyboardAvoidingView as RNKeyboardAvoidingView,
    Platform,
    ScrollView as RNScrollView,
    Alert as RNAlert
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SPACING, FONT_SIZES, BORDER_RADIUS, LIGHT_COLORS, DARK_COLORS } from '../constants/theme';
import InputField from '../components/InputField';
import DropdownField from '../components/DropdownField';
import PrimaryButton from '../components/PrimaryButton';
import { useGeneralSettings } from '../store/GeneralSettingsContext';
import { getEmployees, DBEmployee, getCustomerByMobile } from '../services/dbService';

const View = RNView as any;
const Text = RNText as any;
const ScrollView = RNScrollView as any;
const Alert = RNAlert as any;
const Icon = Ionicons as any;
const TouchableOpacity = RNRTouchableOpacity as any;
const Modal = RNModal as any;
const KeyboardAvoidingView = RNKeyboardAvoidingView as any;

interface PrintDetailsModalProps {
    visible: boolean;
    onClose: () => void;
    onSubmit: (details: {
        customerName: string;
        mobile: string;
        place: string;
        employeeName: string;
    }) => void;
    initialData?: {
        customerName: string;
        mobile: string;
        place: string;
        employeeName: string;
    } | null;
}

export default function PrintDetailsModal({ visible, onClose, onSubmit, initialData }: PrintDetailsModalProps) {
    const { theme, t, currentEmployeeName } = useGeneralSettings();
    const activeColors = theme === 'light' ? LIGHT_COLORS : DARK_COLORS;

    const [customerName, setCustomerName] = useState(initialData?.customerName || '');
    const [mobile, setMobile] = useState(initialData?.mobile || '');
    const [place, setPlace] = useState(initialData?.place || '');
    const [employeeName, setEmployeeName] = useState(initialData?.employeeName || currentEmployeeName || '');
    const [errors, setErrors] = useState<Record<string, string>>({});

    const { showAlert: globalShowAlert } = useGeneralSettings();

    const [employees, setEmployees] = useState<DBEmployee[]>([]);

    useEffect(() => {
        const fetchEmps = async () => {
            const emps = await getEmployees(true);
            setEmployees(emps);
        };
        fetchEmps();
    }, []);

    useEffect(() => {
        if (visible) {
            if (initialData) {
                setCustomerName(initialData.customerName);
                setMobile(initialData.mobile);
                setPlace(initialData.place);
                setEmployeeName(initialData.employeeName);
            } else {
                setEmployeeName(currentEmployeeName || '');
            }
        }
    }, [visible, initialData, currentEmployeeName]);

    const handleMobileChange = async (text: string) => {
        setMobile(text);
        if (errors.mobile) setErrors(prev => ({ ...prev, mobile: '' }));

        // Auto-fill logic
        if (text.length === 10 && !customerName) {
            const customer = await getCustomerByMobile(text);
            if (customer) {
                setCustomerName(customer.name);
                if (customer.address1) setPlace(customer.address1);
            }
        }
    };

    const handleSubmit = () => {
        const newErrors: Record<string, string> = {};
        if (!customerName) newErrors.customerName = t('mandatory') || 'Mandatory';
        if (!mobile) newErrors.mobile = t('mandatory') || 'Mandatory';
        if (!employeeName) newErrors.employeeName = t('mandatory') || 'Mandatory';

        if (Object.keys(newErrors).length > 0) {
            setErrors(newErrors);
            globalShowAlert(t('error') || 'Error', t('please_fill_all_fields') || 'Please fill all required fields', 'error');
            return;
        }

        setErrors({});
        onSubmit({ customerName, mobile, place, employeeName });
    };

    return (
        <Modal visible={visible} animationType="slide" transparent statusBarTranslucent>
            <View style={styles.overlay}>
                <KeyboardAvoidingView
                    behavior={Platform.OS === 'ios' ? 'padding' : 'padding'}
                    style={styles.keyboardView}
                    keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 40}
                >
                    <View style={[styles.modalContainer, { backgroundColor: activeColors.cardBg }]}>
                        <View style={styles.header}>
                            <Text style={[styles.title, { color: activeColors.primary }]}>{t('print_details') || 'Print Details'}</Text>
                            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
                                <Icon name="close" size={24} color={activeColors.textLight} />
                            </TouchableOpacity>
                        </View>

                        <ScrollView
                            style={styles.formContainer}
                            contentContainerStyle={styles.scrollContent}
                            keyboardShouldPersistTaps="handled"
                            showsVerticalScrollIndicator={false}
                        >
                            <View style={styles.section}>
                                <Text style={[styles.sectionTitle, { color: activeColors.textLight }]}>{t('customer_info')}</Text>
                                <InputField
                                    label={t('customer_name')}
                                    required
                                    value={customerName}
                                    onChangeText={(text) => { setCustomerName(text); if (errors.customerName) setErrors(prev => ({ ...prev, customerName: '' })); }}
                                    placeholder={t('enter_name') || "Enter Name"}
                                    error={errors.customerName}
                                />
                                <InputField
                                    label={t('phone_number')}
                                    required
                                    value={mobile}
                                    onChangeText={handleMobileChange}
                                    placeholder={t('enter_mobile') || "Enter Mobile"}
                                    keyboardType="phone-pad"
                                    error={errors.mobile}
                                    maxLength={10}
                                />
                                <InputField
                                    label={t('address') || "Place"}
                                    value={place}
                                    onChangeText={setPlace}
                                    placeholder={t('enter_address') || "Enter Place"}
                                />
                            </View>

                            <View style={[styles.section, { borderTopWidth: 1, borderTopColor: activeColors.border + '20', paddingTop: SPACING.md }]}>
                                <Text style={[styles.sectionTitle, { color: activeColors.textLight }]}>{t('employee_identification')}</Text>
                                <DropdownField
                                    label={t('employee_name')}
                                    value={employeeName}
                                    onSelect={(val) => { setEmployeeName(val); if (errors.employeeName) setErrors(prev => ({ ...prev, employeeName: '' })); }}
                                    options={employees.map(e => ({ label: e.name, value: e.name }))}
                                />
                                {errors.employeeName && (
                                    <Text style={{ color: COLORS.error, fontSize: FONT_SIZES.xs, marginTop: -4 }}>{errors.employeeName}</Text>
                                )}
                            </View>
                        </ScrollView>

                        <View style={styles.buttonRow}>
                            <PrimaryButton
                                title={t('print') || "Print"}
                                onPress={handleSubmit}
                                style={styles.saveButton}
                            />
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
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'flex-end',
    },
    keyboardView: {
        width: '100%',
    },
    modalContainer: {
        borderTopLeftRadius: BORDER_RADIUS.xl,
        borderTopRightRadius: BORDER_RADIUS.xl,
        padding: SPACING.lg,
        maxHeight: '95%',
    },
    formContainer: {
        flexGrow: 0,
    },
    scrollContent: {
        paddingBottom: SPACING.md,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: SPACING.lg,
    },
    title: {
        fontSize: FONT_SIZES.xl,
        fontWeight: 'bold',
    },
    closeButton: {
        padding: SPACING.xs,
    },
    section: {
        marginBottom: SPACING.md,
    },
    sectionTitle: {
        fontSize: FONT_SIZES.xs,
        fontWeight: 'bold',
        textTransform: 'uppercase',
        letterSpacing: 1,
        marginBottom: SPACING.sm,
    },
    buttonRow: {
        marginTop: SPACING.lg,
        paddingBottom: Platform.OS === 'ios' ? SPACING.xl : SPACING.md,
    },
    saveButton: {
        width: '100%',
    }
});
