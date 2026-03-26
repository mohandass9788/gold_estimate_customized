import React, { useState, useEffect } from 'react';
import { View as RNView, Text as RNText, TextInput as RNTextInput, TouchableOpacity as RNTouchableOpacity, StyleSheet, KeyboardAvoidingView as RNKeyboardAvoidingView, Platform, Image as RNImage, ActivityIndicator as RNActivityIndicator, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '../src/store/AuthContext';
import { useGeneralSettings } from '../src/store/GeneralSettingsContext';
import SafeLinearGradient from '../src/components/SafeLinearGradient';
import { COLORS, SPACING, FONT_SIZES, BORDER_RADIUS, LIGHT_COLORS, DARK_COLORS } from '../src/constants/theme';
import { Ionicons } from '@expo/vector-icons';

// Fix for React 19 type mismatch
const View = RNView as any;
const Text = RNText as any;
const TextInput = RNTextInput as any;
const TouchableOpacity = RNTouchableOpacity as any;
const KeyboardAvoidingView = RNKeyboardAvoidingView as any;
const Icon = Ionicons as any;
const Image = RNImage as any;
const ActivityIndicator = RNActivityIndicator as any;

export default function MpinScreen() {
    const { verifyMpin, biometricLogin, isBiometricSupported, isBiometricEnabled, setIsBiometricEnabled, logout, isAuthenticated, isMpinRequired } = useAuth();
    const { t, theme, shopDetails } = useGeneralSettings();
    const router = useRouter();
    const activeColors = theme === 'light' ? LIGHT_COLORS : DARK_COLORS;

    const [pin, setPin] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        // If not authenticated at all, go to login
        if (!isAuthenticated) {
            router.replace('/login');
            return;
        }
        // If authenticated and mpin not required anymore, go to home
        if (!isMpinRequired) {
            router.replace('/(tabs)/');
        }
    }, [isAuthenticated, isMpinRequired]);

    const handleVerify = async (pinInput?: string) => {
        const pinToVerify = pinInput || pin;
        if (pinToVerify.length !== 4) return;

        setLoading(true);
        setError('');
        const success = await verifyMpin(pinToVerify);
        if (success) {
            // Check if we should suggest enabling biometrics
            if (isBiometricSupported && !isBiometricEnabled) {
                Alert.alert(
                    t('use_biometrics') || 'Use Biometrics',
                    t('biometric_setup_prompt') || 'Would you like to enable biometric login for faster access?',
                    [
                        {
                            text: t('no') || 'No',
                            onPress: () => router.replace('/(tabs)/'),
                            style: 'cancel'
                        },
                        {
                            text: t('yes') || 'Yes',
                            onPress: async () => {
                                await setIsBiometricEnabled(true);
                                router.replace('/(tabs)/');
                            }
                        }
                    ]
                );
            } else {
                router.replace('/(tabs)/');
            }
        } else {
            setError(t('incorrect_pin') || 'Incorrect PIN');
            setPin('');
        }
        setLoading(false);
    };

    const handleBiometric = async () => {
        await biometricLogin();
    };

    const handleLogout = async () => {
        await logout();
    };

    return (
        <SafeLinearGradient colors={COLORS.goldGradient} style={{ flex: 1 }}>
            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                style={styles.container}
            >
                <View style={[styles.card, { backgroundColor: activeColors.cardBg }]}>
                    <View style={styles.header}>
                        {shopDetails.appLogo || shopDetails.appIcon ? (
                            <Image source={{ uri: shopDetails.appLogo || shopDetails.appIcon }} style={styles.logo} />
                        ) : (
                            <Image source={require('../assets/icon.png')} style={styles.logo} />
                        )}
                        <Text style={[styles.title, { color: activeColors.primary }]}>{t('app_name') || 'Gold Estimation'}</Text>
                        <Text style={[styles.subtitle, { color: activeColors.textLight }]}>{t('pin_login_subtitle') || 'Enter your mPIN to login'}</Text>
                    </View>

                    {error ? (
                        <View style={styles.errorBanner}>
                            <Icon name="alert-circle" size={20} color={COLORS.error} />
                            <Text style={styles.errorText}>{error}</Text>
                        </View>
                    ) : null}

                    <View style={styles.pinContainer}>
                        {[...Array(4)].map((_, i) => (
                            <View
                                key={i}
                                style={[
                                    styles.pinBox,
                                    {
                                        borderColor: error ? COLORS.error : pin.length > i ? activeColors.primary : activeColors.border,
                                        backgroundColor: activeColors.background
                                    }
                                ]}
                            >
                                <Text style={[styles.pinDot, { color: activeColors.text }]}>
                                    {pin.length > i ? '●' : ''}
                                </Text>
                            </View>
                        ))}
                        <TextInput
                            style={styles.hiddenInput}
                            value={pin}
                            onChangeText={(val: string) => {
                                const cleanVal = val.replace(/[^0-9]/g, '');
                                if (cleanVal.length <= 4) {
                                    setPin(cleanVal);
                                    if (error) setError('');
                                    if (cleanVal.length === 4) {
                                        handleVerify(cleanVal);
                                    }
                                }
                            }}
                            keyboardType="numeric"
                            maxLength={4}
                            autoFocus={false}
                        />
                    </View>

                    <TouchableOpacity
                        style={[
                            styles.loginButton,
                            {
                                backgroundColor: pin.length === 4 ? activeColors.primary : activeColors.border,
                                opacity: loading ? 0.7 : 1
                            }
                        ]}
                        onPress={() => handleVerify()}
                        disabled={loading || pin.length < 4}
                    >
                        {loading ? (
                            <ActivityIndicator color="#fff" />
                        ) : (
                            <Text style={styles.loginButtonText}>{t('unlock_btn') || 'Unlock'}</Text>
                        )}
                    </TouchableOpacity>

                    {isBiometricSupported && isBiometricEnabled && (
                        <TouchableOpacity style={styles.biometricButton} onPress={handleBiometric}>
                            <Icon name="finger-print" size={36} color={activeColors.primary} />
                            <Text style={[styles.biometricText, { color: activeColors.primary }]}>{t('use_biometrics') || 'Use Biometrics'}</Text>
                        </TouchableOpacity>
                    )}

                    <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
                        <Text style={[styles.logoutText, { color: activeColors.textLight }]}>{t('logout_and_switch') || 'Logout & Switch User'}</Text>
                    </TouchableOpacity>
                </View>
            </KeyboardAvoidingView>
        </SafeLinearGradient>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        justifyContent: 'center',
        padding: SPACING.lg,
    },
    card: {
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
        marginBottom: SPACING.md,
    },
    title: {
        fontSize: FONT_SIZES.xxl,
        fontWeight: 'bold',
        marginTop: SPACING.xs,
    },
    subtitle: {
        fontSize: FONT_SIZES.sm,
        marginTop: 4,
    },
    pinContainer: {
        flexDirection: 'row',
        justifyContent: 'center',
        gap: SPACING.md,
        marginBottom: SPACING.xl,
    },
    pinBox: {
        width: 50,
        height: 60,
        borderRadius: BORDER_RADIUS.md,
        borderWidth: 2,
        justifyContent: 'center',
        alignItems: 'center',
        elevation: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
    },
    pinDot: {
        fontSize: 24,
        fontWeight: 'bold',
    },
    hiddenInput: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        opacity: 0,
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
        borderRadius: BORDER_RADIUS.md,
        padding: SPACING.md,
        alignItems: 'center',
    },
    loginButtonText: {
        color: '#fff',
        fontSize: FONT_SIZES.lg,
        fontWeight: 'bold',
    },
    biometricButton: {
        marginTop: SPACING.xxl,
        alignItems: 'center',
        gap: SPACING.xs,
    },
    biometricText: {
        fontSize: FONT_SIZES.md,
        fontWeight: '600',
    },
    logoutButton: {
        marginTop: SPACING.xl,
        alignItems: 'center',
    },
    logoutText: {
        fontSize: FONT_SIZES.sm,
        textDecorationLine: 'underline',
    },
});
