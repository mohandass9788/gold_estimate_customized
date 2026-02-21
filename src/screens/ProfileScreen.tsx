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

    const { adminPin, updateAdminPin } = useGeneralSettings();
    const [newAdminPin, setNewAdminPin] = useState('');
    const [isPinLoading, setIsPinLoading] = useState(false);

    useEffect(() => {
        if (adminPin) {
            setNewAdminPin(adminPin);
        }
    }, [adminPin]);

    const handleUpdatePin = async () => {
        if (!newAdminPin || newAdminPin.length < 4) {
            Alert.alert('Error', 'PIN must be at least 4 digits');
            return;
        }

        setIsPinLoading(true);
        try {
            await updateAdminPin(newAdminPin);
            Alert.alert('Success', 'Admin PIN updated successfully');
        } catch (e) {
            Alert.alert('Error', 'Failed to update PIN');
        } finally {
            setIsPinLoading(false);
        }
    };

    const handleUpdate = async () => {
        if (!newUsername.trim()) {
            Alert.alert('Error', 'Username cannot be empty');
            return;
        }

        if (newPassword || confirmPassword) {
            if (newPassword !== confirmPassword) {
                Alert.alert('Error', 'Passwords do not match');
                return;
            }
            if (newPassword.length < 4) {
                Alert.alert('Error', 'Password must be at least 4 characters');
                return;
            }
        }

        setIsLoading(true);
        try {
            await updateUserCredentials(currentUsername, newPassword || undefined, newUsername !== currentUsername ? newUsername : undefined);
            Alert.alert('Success', 'Profile updated successfully. Please login again.', [
                {
                    text: 'OK',
                    onPress: () => {
                        logout();
                        // Expo router should handle redirect to login on logout
                    }
                }
            ]);
        } catch (e) {
            Alert.alert('Error', 'Failed to update profile');
            console.error(e);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <ScreenContainer>
            <HeaderBar title="Profile Settings" showBack />
            <ScrollView style={styles.content} contentContainerStyle={styles.scrollContent}>

                <View style={styles.card}>
                    <Text style={styles.sectionTitle}>Account Information</Text>

                    <InputField
                        label="Username"
                        value={newUsername}
                        onChangeText={setNewUsername}
                        placeholder="Enter Username"
                    />

                    <Text style={styles.helperText}>Leave password fields empty to keep current password.</Text>

                    <InputField
                        label="New Password"
                        value={newPassword}
                        onChangeText={setNewPassword}
                        placeholder="Enter New Password"
                        secureTextEntry
                    />

                    <InputField
                        label="Confirm Password"
                        value={confirmPassword}
                        onChangeText={setConfirmPassword}
                        placeholder="Confirm New Password"
                        secureTextEntry
                    />

                    <PrimaryButton
                        title={isLoading ? "Updating..." : "Update Profile"}
                        onPress={handleUpdate}
                        style={styles.button}
                    />
                </View>

                <View style={[styles.card, { marginTop: SPACING.lg }]}>
                    <Text style={styles.sectionTitle}>Security Settings</Text>

                    <Text style={styles.helperText}>Change the Admin PIN (Default: 1234)</Text>

                    <InputField
                        label="New Admin PIN"
                        value={newAdminPin}
                        onChangeText={setNewAdminPin}
                        placeholder="Enter New PIN"
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
