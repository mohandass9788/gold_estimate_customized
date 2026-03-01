import React, { useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TextInput,
    TouchableOpacity,
    Image,
    KeyboardAvoidingView,
    Platform,
    ScrollView,
    Linking,
    Alert,
    Dimensions
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useActivation } from '../store/ActivationContext';
import { useGeneralSettings } from '../store/GeneralSettingsContext';
import { COLORS, SPACING, FONT_SIZES, BORDER_RADIUS, LIGHT_COLORS, DARK_COLORS } from '../constants/theme';
import SafeLinearGradient from '../components/SafeLinearGradient';

const { width } = Dimensions.get('window');

// Fix for React 19 type mismatch
const Icon = Ionicons as any;

export default function ActivationScreen() {
    const router = useRouter();
    const [code, setCode] = useState('');
    const [loading, setLoading] = useState(false);
    const { activate } = useActivation();
    const { theme, t, shopDetails } = useGeneralSettings();

    const activeColors = theme === 'light' ? LIGHT_COLORS : DARK_COLORS;

    const handleActivate = async () => {
        if (!code.trim()) {
            Alert.alert(t('error'), t('code_required'));
            return;
        }

        setLoading(true);
        try {
            const success = await activate(code.trim());
            if (success) {
                Alert.alert(t('success'), t('activation_success'), [
                    {
                        text: t('done'),
                        onPress: () => {
                            // router.replace('/') will re-trigger the Index logic
                            (router as any).replace('/');
                        }
                    }
                ]);
            } else {
                Alert.alert(t('error'), t('invalid_activation_code'));
            }
        } catch (error) {
            console.error('Activation error:', error);
            Alert.alert(t('error'), t('something_went_wrong'));
        } finally {
            setLoading(false);
        }
    };

    const openLink = (url: string) => {
        Alert.alert(t('error'), t('could_not_open_link'));
    };

    const contactMethods = [
        { icon: 'call', label: t('call'), url: `tel:+919788339566`, color: '#007AFF' },
        { icon: 'logo-whatsapp', label: t('whatsapp'), url: `whatsapp://send?phone=+919788339566`, color: '#25D366' },
        { icon: 'mail', label: t('email'), url: `mailto:nexooai@gmail.com`, color: '#EA4335' },
        { icon: 'logo-facebook', label: 'Facebook', url: `fb://profile/mohandass.shanthi`, color: '#1877F2' },
    ];

    return (
        <KeyboardAvoidingView
            style={{ flex: 1 }}
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
            <SafeLinearGradient
                colors={activeColors.goldGradient}
                style={styles.container}
            >
                <ScrollView contentContainerStyle={styles.scrollContent}>
                    <View style={[styles.header, { backgroundColor: activeColors.glassBg }]}>
                        {shopDetails.appLogo ? (
                            <Image source={{ uri: shopDetails.appLogo }} style={styles.logo} />
                        ) : (
                            <Icon name="diamond-outline" size={64} color={activeColors.primary} />
                        )}
                        <Text style={[styles.appName, { color: activeColors.text }]}>{t('app_name')}</Text>
                        <Text style={[styles.appSubtitle, { color: activeColors.textLight }]}>{t('app_subtitle')}</Text>
                    </View>

                    <View style={[styles.formCard, { backgroundColor: activeColors.cardBg }]}>
                        <Text style={[styles.welcomeText, { color: activeColors.text }]}>
                            {t('activation_welcome')}
                        </Text>

                        <View style={[styles.inputContainer, { backgroundColor: activeColors.background, borderColor: activeColors.border }]}>
                            <Icon name="key-outline" size={20} color={activeColors.primary} style={styles.inputIcon} />
                            <TextInput
                                style={[styles.input, { color: activeColors.text }]}
                                placeholder={t('activation_code_placeholder')}
                                placeholderTextColor={activeColors.textLight}
                                value={code}
                                onChangeText={setCode}
                                autoCapitalize="none"
                                autoCorrect={false}
                            />
                        </View>

                        <TouchableOpacity
                            style={[styles.activateButton, { backgroundColor: activeColors.primary }]}
                            onPress={handleActivate}
                            disabled={loading}
                        >
                            <Text style={styles.activateButtonText}>
                                {loading ? t('processing') : t('activate_btn')}
                            </Text>
                        </TouchableOpacity>
                    </View>

                    <View style={styles.supportSection}>
                        <Text style={[styles.supportTitle, { color: activeColors.text }]}>{t('contact_support')}</Text>
                        <Text style={[styles.supportDesc, { color: activeColors.textLight }]}>
                            {t('contact_support_desc')}
                        </Text>

                        <View style={styles.contactGrid}>
                            {contactMethods.map((method, index) => (
                                <TouchableOpacity
                                    key={index}
                                    style={[styles.contactItem, { backgroundColor: activeColors.cardBg }]}
                                    onPress={() => openLink(method.url)}
                                >
                                    <Icon name={method.icon} size={28} color={method.color} />
                                    <Text style={[styles.contactLabel, { color: activeColors.text }]}>{method.label}</Text>
                                </TouchableOpacity>
                            ))}
                        </View>
                    </View>
                </ScrollView>
            </SafeLinearGradient>
        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    scrollContent: {
        flexGrow: 1,
        padding: SPACING.lg,
        paddingTop: 60,
    },
    header: {
        alignItems: 'center',
        padding: SPACING.xl,
        borderRadius: BORDER_RADIUS.lg,
        marginBottom: SPACING.xl,
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.3)',
    },
    logo: {
        width: 100,
        height: 100,
        borderRadius: 50,
        marginBottom: SPACING.md,
    },
    appName: {
        fontSize: FONT_SIZES.xxl,
        fontWeight: 'bold',
        textAlign: 'center',
    },
    appSubtitle: {
        fontSize: FONT_SIZES.sm,
        marginTop: SPACING.xs,
    },
    formCard: {
        padding: SPACING.xl,
        borderRadius: BORDER_RADIUS.lg,
        elevation: 4,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 4,
    },
    welcomeText: {
        fontSize: FONT_SIZES.md,
        textAlign: 'center',
        marginBottom: SPACING.xl,
        lineHeight: 24,
    },
    inputContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        borderWidth: 1,
        borderRadius: BORDER_RADIUS.md,
        paddingHorizontal: SPACING.md,
        marginBottom: SPACING.lg,
        height: 50,
    },
    inputIcon: {
        marginRight: SPACING.sm,
    },
    input: {
        flex: 1,
        fontSize: FONT_SIZES.md,
    },
    activateButton: {
        height: 50,
        borderRadius: BORDER_RADIUS.md,
        justifyContent: 'center',
        alignItems: 'center',
        elevation: 2,
    },
    activateButtonText: {
        color: '#FFFFFF',
        fontSize: FONT_SIZES.lg,
        fontWeight: 'bold',
    },
    supportSection: {
        marginTop: SPACING.xl,
        alignItems: 'center',
    },
    supportTitle: {
        fontSize: FONT_SIZES.xl,
        fontWeight: 'bold',
        marginBottom: SPACING.sm,
    },
    supportDesc: {
        fontSize: FONT_SIZES.sm,
        textAlign: 'center',
        marginBottom: SPACING.xl,
        paddingHorizontal: SPACING.md,
    },
    contactGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'space-between',
        width: '100%',
    },
    contactItem: {
        width: (width - SPACING.lg * 2 - SPACING.md * 3) / 2, // 2 items per row
        padding: SPACING.md,
        borderRadius: BORDER_RADIUS.md,
        alignItems: 'center',
        marginBottom: SPACING.md,
        elevation: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1, shadowRadius: 2,
    },
    contactLabel: {
        fontSize: FONT_SIZES.xs,
        marginTop: SPACING.xs,
        fontWeight: '600',
    },
});
