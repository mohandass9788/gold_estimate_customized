import React, { useState, useEffect } from 'react';
import { View as RNView, Text as RNText, TextInput as RNTextInput, TouchableOpacity as RNTouchableOpacity, StyleSheet, KeyboardAvoidingView as RNKeyboardAvoidingView, Platform, Image as RNImage, ActivityIndicator as RNActivityIndicator, Alert, Linking } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '../store/AuthContext';
import { useGeneralSettings } from '../store/GeneralSettingsContext';
import SafeLinearGradient from '../components/SafeLinearGradient';
import CustomAlertModal from '../components/CustomAlertModal';
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
    const [alertVisible, setAlertVisible] = useState(false);
    const [alertConfig, setAlertConfig] = useState<{
        title: string;
        message: string;
        type: 'success' | 'error' | 'warning' | 'info';
        onConfirm?: () => void;
        buttons?: any[];
    }>({ title: '', message: '', type: 'info' });

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
            setError(t('login_error_empty') || 'Please enter Mobile no and password');
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
        setAlertConfig({
            title: t('switch_user') || 'Switch User',
            message: t('switch_user_confirm') || 'This will clear your saved PIN. Are you sure?',
            type: 'warning',
            onConfirm: async () => {
                await SecureStore.deleteItemAsync('user_mpin');
                setHasMPin(false);
                setUsername('');
                setPassword('');
                setPin('');
                setConfirmPin('');
                setError('');
                setViewMode('login');
            }
        });
        setAlertVisible(true);
    };

    const handleForgotPassword = () => {
        setAlertConfig({
            title: t('forgot_password') || 'Forgot Password?',
            message: t('forgot_password_desc') || 'If you forgot your password, please contact the administrator to reset it.',
            type: 'info',
            buttons: [
                {
                    text: t('call_us') || 'Call Now',
                    onPress: () => Linking.openURL('tel:+919788339566'),
                    style: 'default'
                },
                {
                    text: t('whatsapp') || 'WhatsApp',
                    onPress: () => Linking.openURL('https://wa.me/919788339566'),
                    style: 'default'
                },
                {
                    text: t('ok') || 'OK',
                    style: 'cancel'
                }
            ]
        });
        setAlertVisible(true);
    };

    if (viewMode === 'loading') {
        return (
            <View style={styles.container}>
                <ActivityIndicator size="large" color={COLORS.primary} />
            </View>
        );
    }

    return (
        <SafeLinearGradient colors={COLORS.goldGradient} style={{ flex: 1 }}>
            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                style={styles.container}
            >
                <View style={styles.card}>
                    <View style={styles.header}>
                        {shopDetails.appLogo || shopDetails.appIcon ? (
                            <Image source={{ uri: shopDetails.appLogo || shopDetails.appIcon }} style={styles.logo} />
                        ) : (
                            <Image source={require('../../assets/icon.png')} style={styles.logo} />
                            // <Icon name="diamond-outline" size={60} color={COLORS.primary} />
                        )}
                        <Text style={styles.title}>{t('app_name') || 'Gold Estimation'}</Text>
                        {viewMode === 'login' && <Text style={styles.subtitle}>{t('app_subtitle') || 'Login to continue'}</Text>}
                        {viewMode === 'pin_setup' && <Text style={styles.subtitle}>{t('pin_setup_subtitle') || 'Setup your 4-digit mPIN'}</Text>}
                        {viewMode === 'pin_login' && <Text style={styles.subtitle}>{t('pin_login_subtitle') || 'Enter your mPIN to login'}</Text>}
                    </View>

                    {error ? (
                        <View style={styles.errorBanner}>
                            <Icon name="alert-circle" size={20} color={COLORS.error} />
                            <Text style={styles.errorText}>{error}</Text>
                        </View>
                    ) : null}

                    {viewMode === 'login' && (
                        <>
                            <View style={styles.inputContainer}>
                                <Text style={styles.label}>{t('username_label') || 'Mobile No'}</Text>
                                <TextInput
                                    style={styles.input}
                                    value={username}
                                    onChangeText={setUsername}
                                    placeholder={t('enter_username_placeholder') || 'Enter Mobile No'}
                                    keyboardType="phone-pad"
                                    maxLength={10}
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

                            <TouchableOpacity
                                style={styles.forgotPasswordLink}
                                onPress={handleForgotPassword}
                            >
                                <Text style={styles.forgotPasswordLinkText}>{t('forgot_password') || 'Forgot Password?'}</Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                                style={styles.registerLink}
                                onPress={() => router.push('/register')}
                            >
                                <Text style={styles.registerLinkText}>
                                    {t('no_account_yet') || "Don't have an account?"} <Text style={styles.registerLinkTextBold}>{t('create_account_link') || "Create Account"}</Text>
                                </Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                                style={[styles.registerLink, { marginTop: SPACING.md }]}
                                onPress={() => router.push('/activation')}
                            >
                                <Text style={[styles.registerLinkText, { color: COLORS.primary }]}>
                                    {t('go_to_activation') || "Go to Activation Page"}
                                </Text>
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

                            <TouchableOpacity
                                style={styles.registerLink}
                                onPress={() => router.push('/register')}
                            >
                                <Text style={styles.registerLinkText}>
                                    {t('no_account_yet') || "Don't have an account?"} <Text style={styles.registerLinkTextBold}>{t('create_account_link') || "Create Account"}</Text>
                                </Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                                style={[styles.registerLink, { marginTop: SPACING.md }]}
                                onPress={() => router.push('/activation')}
                            >
                                <Text style={[styles.registerLinkText, { color: COLORS.primary }]}>
                                    {t('go_to_activation') || "Go to Activation Page"}
                                </Text>
                            </TouchableOpacity>
                        </>
                    )}
                </View>
                <CustomAlertModal
                    visible={alertVisible}
                    title={alertConfig.title}
                    message={alertConfig.message}
                    type={alertConfig.type}
                    theme={theme as 'light' | 'dark'}
                    showCloseIcon={alertConfig.type === 'warning' || alertConfig.type === 'info'}
                    onClose={() => setAlertVisible(false)}
                    buttons={alertConfig.buttons ? alertConfig.buttons : (alertConfig.type === 'warning' ? [
                        { text: t('cancel') || 'Cancel', onPress: () => setAlertVisible(false), style: 'cancel' },
                        { text: t('confirm') || 'Confirm', onPress: alertConfig.onConfirm, style: 'destructive' }
                    ] : [])}
                    t={t}
                />
            </KeyboardAvoidingView>
        </SafeLinearGradient>
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
    errorBanner: {
        backgroundColor: '#FEF2F2',
        borderColor: COLORS.error,
        borderWidth: 1,
        borderRadius: BORDER_RADIUS.md,
        padding: SPACING.md,
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: SPACING.lg,
    },
    errorText: {
        color: COLORS.error,
        fontSize: FONT_SIZES.sm,
        marginLeft: SPACING.sm,
        flex: 1,
        fontWeight: '600',
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
    },
    registerLink: {
        marginTop: SPACING.xl,
        alignItems: 'center',
        paddingVertical: SPACING.sm,
    },
    registerLinkText: {
        color: COLORS.textLight,
        fontSize: FONT_SIZES.md,
    },
    registerLinkTextBold: {
        color: COLORS.primary,
        fontWeight: 'bold',
        textDecorationLine: 'underline',
    },
    forgotPasswordLink: {
        marginTop: SPACING.md,
        alignItems: 'center',
        paddingVertical: SPACING.xs,
    },
    forgotPasswordLinkText: {
        color: COLORS.primary,
        fontSize: FONT_SIZES.sm,
        fontWeight: '600',
        textDecorationLine: 'underline',
    }
});
