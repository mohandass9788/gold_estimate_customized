import React, { useState, useEffect } from 'react';
import { View as RNView, Text as RNText, TextInput as RNTextInput, TouchableOpacity as RNTouchableOpacity, StyleSheet, KeyboardAvoidingView as RNKeyboardAvoidingView, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '../store/AuthContext';
import { COLORS, SPACING, FONT_SIZES, BORDER_RADIUS } from '../constants/theme';
import { Ionicons } from '@expo/vector-icons';

// Fix for React 19 type mismatch
const View = RNView as any;
const Text = RNText as any;
const TextInput = RNTextInput as any;
const TouchableOpacity = RNTouchableOpacity as any;
const KeyboardAvoidingView = RNKeyboardAvoidingView as any;
const Icon = Ionicons as any;

export default function LoginScreen() {
    const { login, biometricLogin, isBiometricSupported, isAuthenticated } = useAuth();
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const router = useRouter();

    useEffect(() => {
        if (isAuthenticated) {
            router.replace('/(tabs)/');
        }
    }, [isAuthenticated, router]);

    const handleLogin = async () => {
        if (!username || !password) {
            setError('Please enter both username and password.');
            return;
        }

        const success = await login(username, password);
        if (success) {
            // Navigation handled by useEffect
        } else {
            setError('Invalid credentials. Default is admin/admin');
        }
    };

    useEffect(() => {
        // Attempt biometric login automatically on mount if supported
        if (isBiometricSupported) {
            // biometricLogin(); // Optional: Auto-prompt
        }
    }, [isBiometricSupported]);

    return (
        <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={styles.container}
        >
            <View style={styles.card}>
                <View style={styles.header}>
                    <Icon name="diamond-outline" size={60} color={COLORS.primary} />
                    <Text style={styles.title}>Gold Estimation</Text>
                    <Text style={styles.subtitle}>Jewellery Management System</Text>
                </View>

                {error ? <Text style={styles.errorText}>{error}</Text> : null}

                <View style={styles.inputContainer}>
                    <Text style={styles.label}>Username</Text>
                    <TextInput
                        style={styles.input}
                        value={username}
                        onChangeText={setUsername}
                        placeholder="Enter username"
                        autoCapitalize="none"
                    />
                </View>

                <View style={styles.inputContainer}>
                    <Text style={styles.label}>Password</Text>
                    <TextInput
                        style={styles.input}
                        value={password}
                        onChangeText={setPassword}
                        placeholder="Enter password"
                        secureTextEntry
                    />
                </View>

                <TouchableOpacity style={styles.loginButton} onPress={() => handleLogin()}>
                    <Text style={styles.loginButtonText}>Login</Text>
                </TouchableOpacity>

                {isBiometricSupported && (
                    <TouchableOpacity style={styles.biometricButton} onPress={() => biometricLogin()}>
                        <Icon name="finger-print" size={32} color={COLORS.primary} />
                        <Text style={styles.biometricText}>Use Biometrics</Text>
                    </TouchableOpacity>
                )}
            </View>
        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: COLORS.background,
        justifyContent: 'center',
        padding: SPACING.lg,
    },
    card: {
        backgroundColor: COLORS.cardBg,
        borderRadius: BORDER_RADIUS.xl,
        padding: SPACING.xl,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 10,
        elevation: 5,
    },
    header: {
        alignItems: 'center',
        marginBottom: SPACING.xl,
    },
    title: {
        fontSize: FONT_SIZES.xxl,
        fontWeight: 'bold',
        color: COLORS.primary,
        marginTop: SPACING.sm,
    },
    subtitle: {
        fontSize: FONT_SIZES.sm,
        color: COLORS.textLight,
    },
    inputContainer: {
        marginBottom: SPACING.md,
    },
    label: {
        fontSize: FONT_SIZES.sm,
        color: COLORS.text,
        marginBottom: SPACING.xs,
        fontWeight: '600',
    },
    input: {
        backgroundColor: COLORS.background,
        borderRadius: BORDER_RADIUS.md,
        padding: SPACING.md,
        fontSize: FONT_SIZES.md,
        borderWidth: 1,
        borderColor: COLORS.border,
    },
    errorText: {
        color: COLORS.error,
        marginBottom: SPACING.md,
        textAlign: 'center',
    },
    loginButton: {
        backgroundColor: COLORS.primary,
        borderRadius: BORDER_RADIUS.md,
        padding: SPACING.md,
        alignItems: 'center',
        marginTop: SPACING.md,
    },
    loginButtonText: {
        color: COLORS.white,
        fontSize: FONT_SIZES.lg,
        fontWeight: 'bold',
    },
    biometricButton: {
        marginTop: SPACING.lg,
        alignItems: 'center',
        flexDirection: 'row',
        justifyContent: 'center',
        gap: SPACING.xs,
    },
    biometricText: {
        color: COLORS.primary,
        fontSize: FONT_SIZES.md,
        fontWeight: '600',
    },
});
