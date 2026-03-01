import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Switch, Alert, Modal, TextInput } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import ScreenContainer from '../src/components/ScreenContainer';
import HeaderBar from '../src/components/HeaderBar';
import PrimaryButton from '../src/components/PrimaryButton';
import { COLORS, SPACING, FONT_SIZES, BORDER_RADIUS, LIGHT_COLORS, DARK_COLORS } from '../src/constants/theme';
import { useAuth } from '../src/store/AuthContext';
import { useGeneralSettings } from '../src/store/GeneralSettingsContext';
import { getUsers, updateUserCredentials } from '../src/services/dbService';

const Icon = Ionicons as any;

export default function SuperAdminScreen() {
    const router = useRouter();
    const { isSuperAdmin } = useAuth();
    const { theme, t, featureFlags, updateFeatureFlags } = useGeneralSettings();
    const activeColors = theme === 'light' ? LIGHT_COLORS : DARK_COLORS;

    const [users, setUsers] = useState<{ username: string }[]>([]);
    const [selectedUser, setSelectedUser] = useState<string | null>(null);
    const [newUsername, setNewUsername] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [showUserModal, setShowUserModal] = useState(false);

    useEffect(() => {
        if (!isSuperAdmin) {
            router.replace('/(tabs)/');
            return;
        }
        loadUsers();
    }, [isSuperAdmin]);

    const loadUsers = async () => {
        try {
            const allUsers = await getUsers();
            setUsers(allUsers);
        } catch (e) {
            console.error('Failed to load users:', e);
        }
    };

    const handleToggle = (key: keyof typeof featureFlags) => {
        updateFeatureFlags({ [key]: !featureFlags[key] });
    };

    const handleEditUser = (user: { username: string }) => {
        setSelectedUser(user.username);
        setNewUsername(user.username);
        setNewPassword('');
        setShowUserModal(true);
    };

    const handleSaveUser = async () => {
        if (!newUsername) {
            Alert.alert('Error', 'Username cannot be empty');
            return;
        }

        try {
            await updateUserCredentials(selectedUser!, newPassword || undefined, newUsername);
            Alert.alert('Success', 'User updated successfully');
            setShowUserModal(false);
            loadUsers();
        } catch (e) {
            Alert.alert('Error', 'Failed to update user');
        }
    };

    const FeatureToggle = ({ label, value, onToggle, icon }: any) => (
        <View style={[styles.card, { backgroundColor: activeColors.cardBg, borderColor: activeColors.border }]}>
            <View style={styles.cardLeft}>
                <Icon name={icon} size={24} color={activeColors.primary} />
                <Text style={[styles.cardLabel, { color: activeColors.text }]}>{label}</Text>
            </View>
            <Switch
                value={value}
                onValueChange={onToggle}
                trackColor={{ false: '#767577', true: activeColors.primary + '80' }}
                thumbColor={value ? activeColors.primary : '#f4f3f4'}
            />
        </View>
    );

    return (
        <ScreenContainer backgroundColor={activeColors.background}>
            <HeaderBar title={t('super_admin')} showBack />
            <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 40 }}>

                <View style={styles.section}>
                    <Text style={[styles.sectionTitle, { color: activeColors.primary }]}>{t('feature_management')}</Text>
                    <FeatureToggle
                        label={t('enable_purchase')}
                        value={featureFlags.isPurchaseEnabled}
                        onToggle={() => handleToggle('isPurchaseEnabled')}
                        icon="cart-outline"
                    />
                    <FeatureToggle
                        label={t('enable_chit')}
                        value={featureFlags.isChitEnabled}
                        onToggle={() => handleToggle('isChitEnabled')}
                        icon="wallet-outline"
                    />
                    <FeatureToggle
                        label={t('enable_advance')}
                        value={featureFlags.isAdvanceEnabled}
                        onToggle={() => handleToggle('isAdvanceEnabled')}
                        icon="cash-outline"
                    />
                    <FeatureToggle
                        label={t('enable_repair')}
                        value={featureFlags.isRepairEnabled}
                        onToggle={() => handleToggle('isRepairEnabled')}
                        icon="construct-outline"
                    />
                </View>

                <View style={styles.section}>
                    <Text style={[styles.sectionTitle, { color: activeColors.primary }]}>{t('manage_users')}</Text>
                    {users.map((user, idx) => (
                        <TouchableOpacity
                            key={idx}
                            style={[styles.card, { backgroundColor: activeColors.cardBg, borderColor: activeColors.border }]}
                            onPress={() => handleEditUser(user)}
                        >
                            <View style={styles.cardLeft}>
                                <Icon name="person-circle-outline" size={24} color={activeColors.primary} />
                                <Text style={[styles.cardLabel, { color: activeColors.text }]}>{user.username}</Text>
                            </View>
                            <Icon name="create-outline" size={20} color={activeColors.textLight} />
                        </TouchableOpacity>
                    ))}
                </View>

                <View style={styles.section}>
                    <Text style={[styles.sectionTitle, { color: activeColors.primary }]}>{t('system_configuration')}</Text>
                    <View style={[styles.card, { backgroundColor: activeColors.cardBg, borderColor: activeColors.border, opacity: 0.6 }]}>
                        <View style={styles.cardLeft}>
                            <Icon name="server-outline" size={24} color={activeColors.primary} />
                            <Text style={[styles.cardLabel, { color: activeColors.text }]}>Database Version: 1.0.4</Text>
                        </View>
                    </View>
                </View>

            </ScrollView>

            <Modal visible={showUserModal} transparent animationType="fade">
                <View style={styles.modalOverlay}>
                    <View style={[styles.modalContent, { backgroundColor: activeColors.cardBg }]}>
                        <Text style={[styles.modalTitle, { color: activeColors.text }]}>{t('edit_credentials')}</Text>

                        <View style={styles.inputGroup}>
                            <Text style={[styles.label, { color: activeColors.textLight }]}>{t('username_label')}</Text>
                            <TextInput
                                style={[styles.input, { color: activeColors.text, borderColor: activeColors.border }]}
                                value={newUsername}
                                onChangeText={setNewUsername}
                                placeholder="Username"
                                placeholderTextColor={activeColors.textLight}
                            />
                        </View>

                        <View style={styles.inputGroup}>
                            <Text style={[styles.label, { color: activeColors.textLight }]}>{t('password_label')} ({t('optional')})</Text>
                            <TextInput
                                style={[styles.input, { color: activeColors.text, borderColor: activeColors.border }]}
                                value={newPassword}
                                onChangeText={setNewPassword}
                                placeholder="New Password"
                                placeholderTextColor={activeColors.textLight}
                                secureTextEntry
                            />
                        </View>

                        <View style={styles.modalButtons}>
                            <TouchableOpacity
                                style={[styles.modalBtn, { backgroundColor: activeColors.border }]}
                                onPress={() => setShowUserModal(false)}
                            >
                                <Text style={{ color: activeColors.text }}>{t('cancel')}</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[styles.modalBtn, { backgroundColor: activeColors.primary }]}
                                onPress={handleSaveUser}
                            >
                                <Text style={{ color: COLORS.white, fontWeight: 'bold' }}>{t('save')}</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>
        </ScreenContainer>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        padding: SPACING.md,
    },
    section: {
        marginBottom: SPACING.xl,
    },
    sectionTitle: {
        fontSize: FONT_SIZES.sm,
        fontWeight: 'bold',
        marginBottom: SPACING.md,
        textTransform: 'uppercase',
        letterSpacing: 1,
        marginLeft: SPACING.xs,
    },
    card: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: SPACING.md,
        borderRadius: BORDER_RADIUS.md,
        borderWidth: 1,
        marginBottom: SPACING.sm,
        elevation: 2,
    },
    cardLeft: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    cardLabel: {
        fontSize: FONT_SIZES.md,
        marginLeft: SPACING.md,
        fontWeight: '500',
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'center',
        padding: SPACING.xl,
    },
    modalContent: {
        borderRadius: BORDER_RADIUS.lg,
        padding: SPACING.xl,
        elevation: 5,
    },
    modalTitle: {
        fontSize: FONT_SIZES.lg,
        fontWeight: 'bold',
        marginBottom: SPACING.lg,
        textAlign: 'center',
    },
    inputGroup: {
        marginBottom: SPACING.md,
    },
    label: {
        fontSize: FONT_SIZES.xs,
        marginBottom: 4,
    },
    input: {
        borderWidth: 1,
        borderRadius: BORDER_RADIUS.md,
        padding: SPACING.md,
        fontSize: FONT_SIZES.md,
    },
    modalButtons: {
        flexDirection: 'row',
        marginTop: SPACING.lg,
        gap: SPACING.md,
    },
    modalBtn: {
        flex: 1,
        padding: SPACING.md,
        borderRadius: BORDER_RADIUS.md,
        alignItems: 'center',
    }
});
