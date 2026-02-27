import React, { useState, useEffect } from 'react';
import { View as RNView, Text as RNText, StyleSheet, ScrollView as RNScrollView, Alert, TouchableOpacity as RNRTouchableOpacity } from 'react-native';
import ScreenContainer from '../components/ScreenContainer';
import HeaderBar from '../components/HeaderBar';
import InputField from '../components/InputField';
import PrimaryButton from '../components/PrimaryButton';
import { COLORS, SPACING, FONT_SIZES, BORDER_RADIUS } from '../constants/theme';
import { getCurrentUser, updateUserCredentials } from '../services/dbService';
import { useAuth } from '../store/AuthContext';
import { useGeneralSettings } from '../store/GeneralSettingsContext';
import { useRouter } from 'expo-router';

// Fix for React 19 type mismatch
const View = RNView as any;
const Text = RNText as any;
const ScrollView = RNScrollView as any;

export default function ProfileScreen() {
    const router = useRouter();
    const { logout } = useAuth();
    const [currentUsername, setCurrentUsername] = useState('');
    const [newUsername, setNewUsername] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    useEffect(() => {
        loadUser();
    }, []);

    const loadUser = async () => {
        try {
            const user = await getCurrentUser();
            if (user) {
                setCurrentUsername(user.username);
                setNewUsername(user.username);
            }
        } catch (e) {
            console.error('Failed to load user', e);
        }
    };

    const { t, theme, showAlert, adminPin, updateAdminPin } = useGeneralSettings();
    const [newAdminPin, setNewAdminPin] = useState('');
    const [isPinLoading, setIsPinLoading] = useState(false);

    useEffect(() => {
        if (adminPin) {
            setNewAdminPin(adminPin);
        }
    }, [adminPin]);

    const handleUpdatePin = async () => {
        if (!newAdminPin || newAdminPin.length < 4) {
            showAlert('Error', 'PIN must be at least 4 digits', 'error');
            return;
        }

        setIsPinLoading(true);
        try {
            await updateAdminPin(newAdminPin);
            showAlert('Success', 'Admin PIN updated successfully', 'success');
        } catch (e) {
            showAlert('Error', 'Failed to update PIN', 'error');
        } finally {
            setIsPinLoading(false);
        }
    };

    const handleUpdate = async () => {
        if (!newUsername.trim()) {
            showAlert('Error', 'Username cannot be empty', 'error');
            return;
        }

        if (newPassword || confirmPassword) {
            if (newPassword !== confirmPassword) {
                showAlert('Error', 'Passwords do not match', 'error');
                return;
            }
            if (newPassword.length < 4) {
                showAlert('Error', 'Password must be at least 4 characters', 'error');
                return;
            }
        }

        setIsLoading(true);
        try {
            await updateUserCredentials(currentUsername, newPassword || undefined, newUsername !== currentUsername ? newUsername : undefined);
            showAlert('Success', 'Profile updated successfully. Please login again.', 'success', [
                {
                    text: 'OK',
                    onPress: () => {
                        logout();
                        // Expo router should handle redirect to login on logout
                    }
                }
            ]);
        } catch (e) {
            showAlert('Error', 'Failed to update profile', 'error');
            console.error(e);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <ScreenContainer>
            <HeaderBar title={t('profile_settings')} showBack />
            <ScrollView style={styles.content} contentContainerStyle={styles.scrollContent}>

                <View style={styles.card}>
                    <Text style={styles.sectionTitle}>{t('account_info')}</Text>

                    <InputField
                        label={t('username_label')}
                        value={newUsername}
                        onChangeText={setNewUsername}
                        placeholder={t('enter_name')}
                    />

                    <Text style={styles.helperText}>{t('password_helper_text')}</Text>

                    <InputField
                        label={t('new_password') || 'New Password'}
                        value={newPassword}
                        onChangeText={setNewPassword}
                        placeholder={t('enter_new_password')}
                        secureTextEntry
                    />

                    <InputField
                        label={t('confirm_password') || 'Confirm Password'}
                        value={confirmPassword}
                        onChangeText={setConfirmPassword}
                        placeholder={t('confirm_new_password')}
                        secureTextEntry
                    />

                    <PrimaryButton
                        title={isLoading ? "Updating..." : "Update Profile"}
                        onPress={handleUpdate}
                        style={styles.button}
                    />
                </View>

                <View style={[styles.card, { marginTop: SPACING.lg }]}>
                    <Text style={styles.sectionTitle}>{t('security_settings')}</Text>

                    <Text style={styles.helperText}>{t('admin_pin_helper')}</Text>

                    <InputField
                        label={t('new_admin_pin')}
                        value={newAdminPin}
                        onChangeText={setNewAdminPin}
                        placeholder={t('enter_new_pin')}
                        keyboardType="numeric"
                        maxLength={6}
                        secureTextEntry
                    />

                    <PrimaryButton
                        title={isPinLoading ? "Updating PIN..." : "Update PIN"}
                        onPress={handleUpdatePin}
                        style={styles.button}
                    />
                </View>

            </ScrollView>
        </ScreenContainer>
    );
}

const styles = StyleSheet.create({
    content: {
        flex: 1,
    },
    scrollContent: {
        padding: SPACING.md,
    },
    card: {
        backgroundColor: COLORS.white,
        padding: SPACING.md,
        borderRadius: BORDER_RADIUS.md,
        elevation: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
    },
    sectionTitle: {
        fontSize: FONT_SIZES.lg,
        fontWeight: 'bold',
        color: COLORS.primary,
        marginBottom: SPACING.md,
    },
    helperText: {
        fontSize: FONT_SIZES.xs,
        color: COLORS.textLight,
        marginBottom: SPACING.md,
        marginTop: -SPACING.sm,
    },
    button: {
        marginTop: SPACING.lg,
    }
});
