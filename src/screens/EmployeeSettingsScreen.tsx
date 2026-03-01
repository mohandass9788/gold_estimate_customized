import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    FlatList,
    TouchableOpacity,
    Modal,
    TextInput,
    Switch,
    Alert,
    KeyboardAvoidingView,
    Platform,
    ScrollView
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import ScreenContainer from '../components/ScreenContainer';
import HeaderBar from '../components/HeaderBar';
import PrimaryButton from '../components/PrimaryButton';
import { useGeneralSettings } from '../store/GeneralSettingsContext';
import { getEmployees, addEmployee, updateEmployee, deleteEmployee, DBEmployee } from '../services/dbService';
import { COLORS, SPACING, FONT_SIZES, BORDER_RADIUS, LIGHT_COLORS, DARK_COLORS } from '../constants/theme';

export default function EmployeeSettingsScreen() {
    const { theme, t, showAlert } = useGeneralSettings();
    const activeColors = theme === 'light' ? LIGHT_COLORS : DARK_COLORS;

    const [employees, setEmployees] = useState<DBEmployee[]>([]);
    const [loading, setLoading] = useState(true);

    const [isModalVisible, setIsModalVisible] = useState(false);
    const [editingEmployee, setEditingEmployee] = useState<DBEmployee | null>(null);

    // Form fields
    const [empId, setEmpId] = useState('');
    const [name, setName] = useState('');
    const [phone, setPhone] = useState('');
    const [role, setRole] = useState('');
    const [isActive, setIsActive] = useState(true);

    useEffect(() => {
        fetchEmployees();
    }, []);

    const fetchEmployees = async () => {
        setLoading(true);
        try {
            const data = await getEmployees();
            setEmployees(data);
        } catch (error) {
            console.error('Failed to fetch employees:', error);
            showAlert('Error', 'Failed to load employees', 'error');
        } finally {
            setLoading(false);
        }
    };

    const openAddModal = () => {
        setEditingEmployee(null);
        setEmpId('');
        setName('');
        setPhone('');
        setRole('');
        setIsActive(true);
        setIsModalVisible(true);
    };

    const openEditModal = (emp: DBEmployee) => {
        setEditingEmployee(emp);
        setEmpId(emp.empId);
        setName(emp.name);
        setPhone(emp.phone);
        setRole(emp.role);
        setIsActive(emp.isActive === 1);
        setIsModalVisible(true);
    };

    const handleSave = async () => {
        if (!empId.trim() || !name.trim()) {
            showAlert('Validation Error', 'Employee ID and Name are required.', 'warning');
            return;
        }

        const employeeData = {
            empId: empId.trim(),
            name: name.trim(),
            phone: phone.trim(),
            role: role.trim(),
            isActive: isActive ? 1 : 0
        };

        try {
            if (editingEmployee) {
                await updateEmployee(editingEmployee.id, employeeData);
                showAlert('Success', 'Employee updated successfully.', 'success');
            } else {
                await addEmployee(employeeData);
                showAlert('Success', 'Employee added successfully.', 'success');
            }
            setIsModalVisible(false);
            fetchEmployees();
        } catch (error: any) {
            console.error('Save failed:', error);
            if (error.message && error.message.includes('UNIQUE constraint failed')) {
                showAlert('Error', 'An employee with this ID already exists.', 'error');
            } else {
                showAlert('Error', 'Failed to save employee.', 'error');
            }
        }
    };

    const handleDelete = (id: number) => {
        Alert.alert(
            'Confirm Delete',
            'Are you sure you want to delete this employee? This action cannot be undone.',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Delete',
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            await deleteEmployee(id);
                            showAlert('Success', 'Employee deleted successfully.', 'success');
                            fetchEmployees();
                        } catch (error) {
                            console.error('Delete failed:', error);
                            showAlert('Error', 'Failed to delete employee.', 'error');
                        }
                    }
                }
            ]
        );
    };

    const renderEmployee = ({ item }: { item: DBEmployee }) => (
        <View style={[styles.card, { backgroundColor: activeColors.cardBg, borderColor: activeColors.border }]}>
            <View style={styles.cardHeader}>
                <View style={styles.cardTitleRow}>
                    <Text style={[styles.empName, { color: activeColors.text }]}>{item.name}</Text>
                    {!item.isActive && (
                        <View style={[styles.inactiveBadge, { backgroundColor: COLORS.error + '20' }]}>
                            <Text style={[styles.inactiveText, { color: COLORS.error }]}>Inactive</Text>
                        </View>
                    )}
                </View>
                <View style={styles.actionButtons}>
                    <TouchableOpacity onPress={() => openEditModal(item)} style={styles.iconBtn}>
                        <Ionicons name="pencil" size={20} color={COLORS.primary} />
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => handleDelete(item.id)} style={styles.iconBtn}>
                        <Ionicons name="trash" size={20} color={COLORS.error} />
                    </TouchableOpacity>
                </View>
            </View>

            <View style={styles.cardDetails}>
                <View style={styles.detailRow}>
                    <Ionicons name="id-card-outline" size={16} color={activeColors.textLight} style={styles.detailIcon} />
                    <Text style={[styles.detailText, { color: activeColors.textLight }]}>{item.empId}</Text>
                </View>
                {!!item.role && (
                    <View style={styles.detailRow}>
                        <Ionicons name="briefcase-outline" size={16} color={activeColors.textLight} style={styles.detailIcon} />
                        <Text style={[styles.detailText, { color: activeColors.textLight }]}>{item.role}</Text>
                    </View>
                )}
                {!!item.phone && (
                    <View style={styles.detailRow}>
                        <Ionicons name="call-outline" size={16} color={activeColors.textLight} style={styles.detailIcon} />
                        <Text style={[styles.detailText, { color: activeColors.textLight }]}>{item.phone}</Text>
                    </View>
                )}
            </View>
        </View>
    );

    return (
        <ScreenContainer backgroundColor={activeColors.background}>
            <HeaderBar title={t('manage_employees') || 'Manage Employees'} />

            <FlatList
                data={employees}
                keyExtractor={(item) => item.id.toString()}
                renderItem={renderEmployee}
                contentContainerStyle={styles.listContent}
                ListEmptyComponent={
                    !loading ? (
                        <View style={styles.emptyState}>
                            <Ionicons name="people-outline" size={60} color={activeColors.border} />
                            <Text style={[styles.emptyText, { color: activeColors.textLight }]}>
                                No employees found. Add your first employee.
                            </Text>
                        </View>
                    ) : null
                }
            />

            <TouchableOpacity
                style={[styles.fab, { backgroundColor: activeColors.primary }]}
                onPress={openAddModal}
            >
                <Ionicons name="add" size={28} color="#FFF" />
            </TouchableOpacity>

            <Modal
                visible={isModalVisible}
                transparent={true}
                animationType="slide"
                onRequestClose={() => setIsModalVisible(false)}
            >
                <View style={styles.modalOverlay}>
                    <KeyboardAvoidingView
                        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                        style={styles.keyboardView}
                    >
                        <View style={[styles.modalContent, { backgroundColor: activeColors.cardBg }]}>
                            <View style={styles.modalHeader}>
                                <Text style={[styles.modalTitle, { color: activeColors.text }]}>
                                    {editingEmployee ? 'Edit Employee' : 'Add Employee'}
                                </Text>
                                <TouchableOpacity onPress={() => setIsModalVisible(false)} style={styles.closeBtn}>
                                    <Ionicons name="close" size={24} color={activeColors.text} />
                                </TouchableOpacity>
                            </View>

                            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: SPACING.xl }}>
                                <View style={styles.formGroup}>
                                    <Text style={[styles.label, { color: activeColors.textLight }]}>Employee ID *</Text>
                                    <TextInput
                                        style={[styles.input, { backgroundColor: activeColors.background, color: activeColors.text, borderColor: activeColors.border }]}
                                        value={empId}
                                        onChangeText={setEmpId}
                                        placeholder="e.g. EMP-001"
                                        placeholderTextColor={activeColors.textLight}
                                        autoCapitalize="characters"
                                    />
                                </View>

                                <View style={styles.formGroup}>
                                    <Text style={[styles.label, { color: activeColors.textLight }]}>Full Name *</Text>
                                    <TextInput
                                        style={[styles.input, { backgroundColor: activeColors.background, color: activeColors.text, borderColor: activeColors.border }]}
                                        value={name}
                                        onChangeText={setName}
                                        placeholder="Employee Name"
                                        placeholderTextColor={activeColors.textLight}
                                    />
                                </View>

                                <View style={styles.formGroup}>
                                    <Text style={[styles.label, { color: activeColors.textLight }]}>Phone Number</Text>
                                    <TextInput
                                        style={[styles.input, { backgroundColor: activeColors.background, color: activeColors.text, borderColor: activeColors.border }]}
                                        value={phone}
                                        onChangeText={setPhone}
                                        placeholder="10-digit mobile number"
                                        placeholderTextColor={activeColors.textLight}
                                        keyboardType="phone-pad"
                                        maxLength={10}
                                    />
                                </View>

                                <View style={styles.formGroup}>
                                    <Text style={[styles.label, { color: activeColors.textLight }]}>Role / Designation</Text>
                                    <TextInput
                                        style={[styles.input, { backgroundColor: activeColors.background, color: activeColors.text, borderColor: activeColors.border }]}
                                        value={role}
                                        onChangeText={setRole}
                                        placeholder="e.g. Manager, Appraiser, Cashier"
                                        placeholderTextColor={activeColors.textLight}
                                    />
                                </View>

                                <View style={styles.switchRow}>
                                    <Text style={[styles.label, { color: activeColors.text, marginBottom: 0 }]}>Active Employee</Text>
                                    <Switch
                                        value={isActive}
                                        onValueChange={setIsActive}
                                        trackColor={{ false: '#767577', true: activeColors.primary + '80' }}
                                        thumbColor={isActive ? activeColors.primary : '#f4f3f4'}
                                    />
                                </View>

                                <PrimaryButton
                                    title="Save Employee"
                                    onPress={handleSave}
                                    style={styles.saveBtn as any}
                                />
                            </ScrollView>
                        </View>
                    </KeyboardAvoidingView>
                </View>
            </Modal>
        </ScreenContainer>
    );
}

const styles = StyleSheet.create({
    listContent: {
        padding: SPACING.md,
        paddingBottom: 100,
    },
    card: {
        borderRadius: BORDER_RADIUS.lg,
        padding: SPACING.md,
        marginBottom: SPACING.md,
        borderWidth: 1,
        elevation: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
    },
    cardHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: SPACING.sm,
    },
    cardTitleRow: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
    },
    empName: {
        fontSize: FONT_SIZES.lg,
        fontWeight: 'bold',
        marginRight: SPACING.sm,
    },
    inactiveBadge: {
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: 12,
    },
    inactiveText: {
        fontSize: 10,
        fontWeight: 'bold',
    },
    actionButtons: {
        flexDirection: 'row',
    },
    iconBtn: {
        padding: SPACING.xs,
        marginLeft: SPACING.xs,
    },
    cardDetails: {
        flexDirection: 'row',
        flexWrap: 'wrap',
    },
    detailRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginRight: SPACING.lg,
        marginTop: SPACING.xs,
    },
    detailIcon: {
        marginRight: 4,
    },
    detailText: {
        fontSize: FONT_SIZES.sm,
    },
    emptyState: {
        alignItems: 'center',
        justifyContent: 'center',
        padding: SPACING.xl,
        marginTop: 40,
    },
    emptyText: {
        marginTop: SPACING.md,
        fontSize: FONT_SIZES.md,
        textAlign: 'center',
    },
    fab: {
        position: 'absolute',
        bottom: SPACING.xl,
        right: SPACING.xl,
        width: 60,
        height: 60,
        borderRadius: 30,
        alignItems: 'center',
        justifyContent: 'center',
        elevation: 5,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.3,
        shadowRadius: 4,
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'flex-end',
    },
    keyboardView: {
        width: '100%',
    },
    modalContent: {
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        padding: SPACING.lg,
        paddingBottom: SPACING.xl,
        maxHeight: '80%', // Ensure it doesn't take full height so ScrollView activates
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: SPACING.lg,
    },
    modalTitle: {
        fontSize: FONT_SIZES.xl,
        fontWeight: 'bold',
    },
    closeBtn: {
        padding: SPACING.xs,
    },
    formGroup: {
        marginBottom: SPACING.md,
    },
    label: {
        fontSize: FONT_SIZES.sm,
        marginBottom: SPACING.xs,
        fontWeight: '500',
    },
    input: {
        borderWidth: 1,
        borderRadius: BORDER_RADIUS.md,
        padding: SPACING.md,
        fontSize: FONT_SIZES.md,
    },
    switchRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: SPACING.xl,
        paddingVertical: SPACING.xs,
    },
    saveBtn: {
        marginTop: SPACING.sm,
    }
});
