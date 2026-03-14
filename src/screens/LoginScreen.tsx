import React, { useState, useEffect } from 'react';
import { View as RNView, Text as RNText, TextInput as RNTextInput, TouchableOpacity as RNTouchableOpacity, StyleSheet, KeyboardAvoidingView as RNKeyboardAvoidingView, Platform, Image as RNImage, ActivityIndicator as RNActivityIndicator, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '../store/AuthContext';
import { useGeneralSettings } from '../store/GeneralSettingsContext';
import { COLORS, SPACING, FONT_SIZES, BORDER_RADIUS } from '../constants/theme';
import { Ionicons } from '@expo/vector-icons';
import * as SecureStore from 'expo-secure-store';

// Fix for React 19 type mismatch
const View = RNView as any;
const Text = RNText as any;
const TextInput = RNTextInput as any;
const TouchableOpacity = RNTouchableOpacity as any;
const KeyboardAvoidingView = RNKeyboardAvoidingView as any;
const Icon = Ionicons as any;
const Image = RNImage as any;
const ActivityIndicator = RNActivityIndicator as any;

type LoginViewMode = 'loading' | 'login' | 'pin_setup' | 'pin_login';

export default function LoginScreen() {
    const { biometricLogin, isBiometricSupported, isAuthenticated, validateCredentialsOnly, completeLogin, hasMPin, setHasMPin } = useAuth();
    const { t, theme, shopDetails } = useGeneralSettings();
    const router = useRouter();

    const [viewMode, setViewMode] = useState<LoginViewMode>('loading');
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState('');

    const [pin, setPin] = useState('');
    const [confirmPin, setConfirmPin] = useState('');

    useEffect(() => {
        if (isAuthenticated) {
            router.replace('/(tabs)/');
        }
    }, [isAuthenticated, router]);

    // Check initial state on mount
    useEffect(() => {
        const checkInitialState = async () => {
            const storedPin = await SecureStore.getItemAsync('user_mpin');
            if (storedPin) {
                setViewMode('pin_login');
                if (isBiometricSupported) {
                    // Optionally trigger biometric automatically here
                }
            } else {
                setViewMode('login');
            }
        };
        checkInitialState();
    }, [isBiometricSupported]);

    const handleLoginSubmit = async () => {
        if (!username || !password) {
            setError(t('login_error_empty') || 'Please enter username and password');
            return;
        }
        setError('');
        const isValid = await validateCredentialsOnly(username, password);
        if (isValid) {
            if (hasMPin) {
                // Should not normally happen if they switch user properly, but just in case
                completeLogin();
            } else {
                setViewMode('pin_setup');
                setPin('');
                setConfirmPin('');
            }
        } else {
            setError(t('login_error_invalid') || 'Invalid credentials');
        }
    };

    const handlePinSetupSubmit = async () => {
        if (pin.length !== 4) {
            setError(t('pin_must_be_4_digits') || 'PIN must be 4 digits');
            return;
        }
        if (pin !== confirmPin) {
            setError(t('pins_do_not_match') || 'PINs do not match');
            return;
        }

        setError('');
        try {
            await SecureStore.setItemAsync('user_mpin', pin);
            setHasMPin(true);
            completeLogin();
        } catch (e) {
            setError(t('failed_to_save_pin') || 'Failed to save PIN');
        }
    };

    const handlePinLoginSubmit = async () => {
        if (pin.length !== 4) {
            setError(t('enter_4_digit_pin') || 'Please enter 4-digit PIN');
            return;
        }
        setError('');
        try {
            const storedPin = await SecureStore.getItemAsync('user_mpin');
            if (storedPin === pin) {
                completeLogin();
            } else {
                setError(t('incorrect_pin') || 'Incorrect PIN');
                setPin('');
            }
        } catch (e) {
            setError(t('error_verifying_pin') || 'Error verifying PIN');
        }
    };

    const handleSwitchUser = async () => {
        Alert.alert(
            t('switch_user') || 'Switch User',
            t('switch_user_confirm') || 'This will clear your saved PIN. Are you sure?',
            [
                { text: t('cancel') || 'Cancel', style: 'cancel' },
                {
                    text: t('switch_user') || 'Switch User',
                    style: 'destructive',
                    onPress: async () => {
                        await SecureStore.deleteItemAsync('user_mpin');
                        setHasMPin(false);
                        setUsername('');
                        setPassword('');
                        setPin('');
                        setConfirmPin('');
                        setError('');
                        setViewMode('login');
                    }
                }
            ]
        );
    };

    if (viewMode === 'loading') {
        return (
            <View style={styles.container}>
                <ActivityIndicator size="large" color={COLORS.primary} />
            </View>
        );
    }

    return (
        <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={styles.container}
        >
            <View style={styles.card}>
                <View style={styles.header}>
                    {shopDetails.appLogo || shopDetails.appIcon ? (
                        <Image source={{ uri: shopDetails.appLogo || shopDetails.appIcon }} style={styles.logo} />
                    ) : (
                        <Icon name="diamond-outline" size={60} color={COLORS.primary} />
                    )}
                    <Text style={styles.title}>{t('app_name') || 'Gold Estimation'}</Text>
                    {viewMode === 'login' && <Text style={styles.subtitle}>{t('app_subtitle') || 'Login to continue'}</Text>}
                    {viewMode === 'pin_setup' && <Text style={styles.subtitle}>{t('pin_setup_subtitle') || 'Setup your 4-digit mPIN'}</Text>}
                    {viewMode === 'pin_login' && <Text style={styles.subtitle}>{t('pin_login_subtitle') || 'Enter your mPIN to login'}</Text>}
                </View>

                {error ? <Text style={styles.errorText}>{error}</Text> : null}

                {viewMode === 'login' && (
                    <>
                        <View style={styles.inputContainer}>
                            <Text style={styles.label}>{t('username_label') || 'Username'}</Text>
                            <TextInput
                                style={styles.input}
                                value={username}
                                onChangeText={setUsername}
                                placeholder={t('enter_username_placeholder') || 'Enter username'}
                                autoCapitalize="none"
                            />
                        </View>
                        <View style={styles.inputContainer}>
                            <Text style={styles.label}>{t('password_label') || 'Password'}</Text>
                            <View style={styles.passwordWrapper}>
                                <TextInput
                                    style={[styles.input, styles.passwordInput]}
                                    value={password}
                                    onChangeText={setPassword}
                                    placeholder={t('enter_password_placeholder') || 'Enter password'}
                                    secureTextEntry={!showPassword}
                                />
                                <TouchableOpacity
                                    style={styles.eyeIcon}
                                    onPress={() => setShowPassword(!showPassword)}
                                    activeOpacity={0.7}
                                >
                                    <Icon
                                        name={showPassword ? "eye-off-outline" : "eye-outline"}
                                        size={22}
                                        color={COLORS.textLight}
                                    />
                                </TouchableOpacity>
                            </View>
                        </View>
                        <TouchableOpacity style={styles.loginButton} onPress={handleLoginSubmit}>
                            <Text style={styles.loginButtonText}>{t('login_btn') || 'Login'}</Text>
                        </TouchableOpacity>
                    </>
                )}

                {viewMode === 'pin_setup' && (
                    <>
                        <View style={styles.inputContainer}>
                            <Text style={styles.label}>{t('create_pin') || 'Create 4-digit PIN'}</Text>
                            <TextInput
                                style={styles.input}
                                value={pin}
                                onChangeText={(val: string) => setPin(val.replace(/[^0-9]/g, ''))}
                                placeholder="****"
                                keyboardType="numeric"
                                secureTextEntry
                                maxLength={4}
                            />
                        </View>
                        <View style={styles.inputContainer}>
                            <Text style={styles.label}>{t('confirm_pin') || 'Confirm PIN'}</Text>
                            <TextInput
                                style={styles.input}
                                value={confirmPin}
                                onChangeText={(val: string) => setConfirmPin(val.replace(/[^0-9]/g, ''))}
                                placeholder="****"
                                keyboardType="numeric"
                                secureTextEntry
                                maxLength={4}
                            />
                        </View>
                        <TouchableOpacity style={styles.loginButton} onPress={handlePinSetupSubmit}>
                            <Text style={styles.loginButtonText}>{t('setup_pin_login') || 'Setup PIN & Login'}</Text>
                        </TouchableOpacity>
                    </>
                )}

                {viewMode === 'pin_login' && (
                    <>
                        <View style={styles.inputContainer}>
                            <Text style={styles.label}>{t('enter_pin') || 'Enter PIN'}</Text>
                            <TextInput
                                style={[styles.input, { textAlign: 'center', fontSize: 24, letterSpacing: 8 }]}
                                value={pin}
                                onChangeText={(val: string) => {
                                    const cleanVal = val.replace(/[^0-9]/g, '');
                                    setPin(cleanVal);
                                    if (cleanVal.length === 4) {
                                        // Auto-submit when 4 digits are entered
                                    }
                                }}
                                placeholder="****"
                                keyboardType="numeric"
                                secureTextEntry
                                maxLength={4}
                                autoFocus={true}
                            />
                        </View>
                        <TouchableOpacity style={styles.loginButton} onPress={handlePinLoginSubmit}>
                            <Text style={styles.loginButtonText}>{t('login_btn') || 'Login'}</Text>
                        </TouchableOpacity>

                        {isBiometricSupported && (
                            <TouchableOpacity style={styles.biometricButton} onPress={biometricLogin}>
                                <Icon name="finger-print" size={36} color={COLORS.primary} />
                                <Text style={styles.biometricText}>{t('use_biometrics') || 'Use Fingerprint'}</Text>
                            </TouchableOpacity>
                        )}

                        <TouchableOpacity style={styles.switchUserButton} onPress={handleSwitchUser}>
                            <Text style={styles.switchUserText}>{t('switch_user') || 'Switch User'}</Text>
                        </TouchableOpacity>
                    </>
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
    logo: {
        width: 100,
        height: 100,
        borderRadius: BORDER_RADIUS.md,
        resizeMode: 'contain',
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
        marginTop: 4,
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
        color: COLORS.text,
    },
    passwordWrapper: {
        position: 'relative',
        justifyContent: 'center',
    },
    passwordInput: {
        paddingRight: 50,
    },
    eyeIcon: {
        position: 'absolute',
        right: SPACING.md,
        height: '100%',
        justifyContent: 'center',
        paddingHorizontal: SPACING.xs,
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
        marginTop: SPACING.xl,
        alignItems: 'center',
        flexDirection: 'column',
        justifyContent: 'center',
        gap: SPACING.xs,
    },
    biometricText: {
        color: COLORS.primary,
        fontSize: FONT_SIZES.md,
        fontWeight: '600',
    },
    switchUserButton: {
        marginTop: SPACING.xl,
        alignItems: 'center',
        paddingVertical: SPACING.sm,
    },
    switchUserText: {
        color: COLORS.textLight,
        fontSize: FONT_SIZES.md,
        textDecorationLine: 'underline',
    }
});
