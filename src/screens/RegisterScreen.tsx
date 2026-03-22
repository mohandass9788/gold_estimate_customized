import React, { useState } from 'react';
import {
    View as RNView,
    Text as RNText,
    TextInput as RNTextInput,
    TouchableOpacity as RNTouchableOpacity,
    StyleSheet,
    KeyboardAvoidingView as RNKeyboardAvoidingView,
    Platform,
    ScrollView as RNScrollView,
    Alert,
    ActivityIndicator as RNActivityIndicator,
    Linking,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { BORDER_RADIUS, COLORS, FONT_SIZES, SPACING } from '../constants/theme';
import { registerUser } from '../services/authService';
import SafeLinearGradient from '../components/SafeLinearGradient';
import CustomAlertModal from '../components/CustomAlertModal';
import { useGeneralSettings } from '../store/GeneralSettingsContext';

const View = RNView as any;
const Text = RNText as any;
const TextInput = RNTextInput as any;
const TouchableOpacity = RNTouchableOpacity as any;
const KeyboardAvoidingView = RNKeyboardAvoidingView as any;
const ScrollView = RNScrollView as any;
const Icon = Ionicons as any;
const ActivityIndicator = RNActivityIndicator as any;

export default function RegisterScreen() {
    const router = useRouter();
    const [shopName, setShopName] = useState('');
    const [name, setName] = useState('');
    const [phone, setPhone] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [error, setError] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const { theme, t } = useGeneralSettings();
    const [alertVisible, setAlertVisible] = useState(false);
    const [alertConfig, setAlertConfig] = useState({ title: '', message: '', type: 'info' as any });

    const handleRegister = async () => {
        if (!shopName.trim() || !name.trim() || !phone.trim() || !password) {
            setError('Shop name, owner name, phone, and password are required.');
            return;
        }

        if (password !== confirmPassword) {
            setError('Passwords do not match.');
            return;
        }

        try {
            setIsSubmitting(true);
            setError('');

            await registerUser({
                shop_name: shopName.trim(),
                name: name.trim(),
                phone: phone.trim(),
                password,
            });

            setAlertConfig({
                title: 'Registration Successful',
                message: 'Your account has been created. Please log in to continue.',
                type: 'success'
            });
            setAlertVisible(true);
        } catch (e: any) {
            setError(e?.message || 'Registration failed');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <SafeLinearGradient colors={COLORS.goldGradient} style={{ flex: 1 }}>
            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                style={styles.container}
            >
                <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
                    <View style={styles.card}>
                        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
                            <Icon name="arrow-back" size={22} color={COLORS.text} />
                        </TouchableOpacity>

                        <View style={styles.header}>
                            <Icon name="person-add-outline" size={56} color={COLORS.primary} />
                            <Text style={styles.title}>Create Account</Text>
                            <Text style={styles.subtitle}>Register your shop owner account</Text>
                        </View>

                        {error ? (
                            <View style={styles.errorBanner}>
                                <Icon name="alert-circle" size={20} color={COLORS.error} />
                                <Text style={styles.errorText}>{error}</Text>
                            </View>
                        ) : null}

                        <View style={styles.inputContainer}>
                            <Text style={styles.label}>Shop Name</Text>
                            <TextInput
                                style={styles.input}
                                value={shopName}
                                onChangeText={setShopName}
                                placeholder="Enter shop name"
                            />
                        </View>

                        <View style={styles.inputContainer}>
                            <Text style={styles.label}>Owner Name</Text>
                            <TextInput
                                style={styles.input}
                                value={name}
                                onChangeText={setName}
                                placeholder="Enter owner name"
                            />
                        </View>

                        <View style={styles.inputContainer}>
                            <Text style={styles.label}>Phone</Text>
                            <TextInput
                                style={styles.input}
                                value={phone}
                                onChangeText={setPhone}
                                placeholder="Enter phone number"
                                keyboardType="phone-pad"
                                maxLength={10}
                            />
                        </View>

                        <View style={styles.inputContainer}>
                            <Text style={styles.label}>Password</Text>
                            <TextInput
                                style={styles.input}
                                value={password}
                                onChangeText={setPassword}
                                placeholder="Create password"
                                secureTextEntry
                            />
                        </View>

                        <View style={styles.inputContainer}>
                            <Text style={styles.label}>Confirm Password</Text>
                            <TextInput
                                style={styles.input}
                                value={confirmPassword}
                                onChangeText={setConfirmPassword}
                                placeholder="Re-enter password"
                                secureTextEntry
                            />
                        </View>

                        <TouchableOpacity style={styles.registerButton} onPress={handleRegister} disabled={isSubmitting}>
                            {isSubmitting ? (
                                <ActivityIndicator size="small" color={COLORS.white} />
                            ) : (
                                <Text style={styles.registerButtonText}>Register</Text>
                            )}
                        </TouchableOpacity>

                        <TouchableOpacity style={styles.loginLink} onPress={() => router.replace('/login')}>
                            <Text style={styles.loginLinkText}>Already have an account? Login</Text>
                        </TouchableOpacity>
                    </View>

                    {/* <View style={{ marginTop: SPACING.xl, alignItems: 'center' }}>
                        <TouchableOpacity onPress={() => Linking.openURL('https://mnvgroups.in/')}>
                            <Text style={{ color: COLORS.textLight, fontSize: FONT_SIZES.sm }}>
                                Powered by https://mnvgroups.in/
                            </Text>
                        </TouchableOpacity>
                    </View> */}
                </ScrollView>
            <CustomAlertModal
                visible={alertVisible}
                title={alertConfig.title}
                message={alertConfig.message}
                type={alertConfig.type}
                theme={theme as 'light' | 'dark'}
                onClose={() => {
                    setAlertVisible(false);
                    if (alertConfig.type === 'success') {
                        router.replace('/login');
                    }
                }}
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
    },
    scrollContent: {
        flexGrow: 1,
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
    backButton: {
        alignSelf: 'flex-start',
        marginBottom: SPACING.md,
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
    registerButton: {
        backgroundColor: COLORS.primary,
        borderRadius: BORDER_RADIUS.md,
        padding: SPACING.md,
        alignItems: 'center',
        marginTop: SPACING.md,
        minHeight: 52,
        justifyContent: 'center',
    },
    registerButtonText: {
        color: COLORS.white,
        fontSize: FONT_SIZES.lg,
        fontWeight: 'bold',
    },
    loginLink: {
        alignItems: 'center',
        marginTop: SPACING.lg,
    },
    loginLinkText: {
        color: COLORS.primary,
        fontSize: FONT_SIZES.md,
        fontWeight: '600',
    },
});
