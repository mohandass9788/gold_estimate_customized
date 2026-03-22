import React, { useState, useEffect } from 'react';
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
import CustomAlertModal from '../components/CustomAlertModal';
import AIChatBox from '../components/AIChatBox';
import { BASE_URL } from '../constants/config';

const { width } = Dimensions.get('window');

// Fix for React 19 type mismatch
const Icon = Ionicons as any;

export default function ActivationScreen() {
    const router = useRouter();
    const [code, setCode] = useState('');
    const [loading, setLoading] = useState(false);
    const { activate } = useActivation();
    const { theme, t, shopDetails, serverApiUrl } = useGeneralSettings();

    const activeColors = theme === 'light' ? LIGHT_COLORS : DARK_COLORS;

    const [contactData, setContactData] = useState<any>(null);
    const [demoData, setDemoData] = useState<any>(null);

    const [showDemoModal, setShowDemoModal] = useState(false);
    const [alertVisible, setAlertVisible] = useState(false);
    const [alertConfig, setAlertConfig] = useState({ title: '', message: '', type: 'info' as any, onConfirm: () => {} });

    useEffect(() => {
        const fetchConfig = async () => {
            try {
                let baseUrl = serverApiUrl || BASE_URL;
                const url = `${baseUrl.replace(/\/$/, '')}/api/public/config`;
                console.log('Fetching public config from:', url);

                const response = await fetch(url);
                if (!response.ok) {
                    const errorText = await response.text();
                    console.log(`Failed to fetch config. Status: ${response.status}. Body: ${errorText.substring(0, 200)}`);
                    return;
                }

                const data = await response.json();
                if (data.contact) setContactData(data.contact);
                if (data.demo) setDemoData(data.demo);
            } catch (e) {
                console.log('Error in fetchConfig:', e);
            }
        };
        fetchConfig();
    }, [serverApiUrl]);

    const handleActivate = async () => {
        if (!code.trim()) {
            setAlertConfig({
                title: t('error'),
                message: t('code_required'),
                type: 'error',
                onConfirm: () => {}
            });
            setAlertVisible(true);
            return;
        }

        setLoading(true);
        try {
            const success = await activate(code.trim());
            if (success) {
                setAlertConfig({
                    title: t('success'),
                    message: t('activation_success'),
                    type: 'success',
                    onConfirm: () => {
                        (router as any).replace('/');
                    }
                });
                setAlertVisible(true);
            } else {
                setAlertConfig({
                    title: t('error'),
                    message: t('invalid_activation_code'),
                    type: 'error',
                    onConfirm: () => {}
                });
                setAlertVisible(true);
            }
        } catch (error) {
            console.error('Activation error:', error);
            setAlertConfig({
                title: t('error'),
                message: t('something_went_wrong'),
                type: 'error',
                onConfirm: () => {}
            });
            setAlertVisible(true);
        } finally {
            setLoading(false);
        }
    };

    const handleDemoStart = () => {
        setShowDemoModal(true);
    };

    const [isAIChatOpen, setIsAIChatOpen] = useState(false);

    const confirmDemoStart = async () => {
        setShowDemoModal(false);
        setLoading(true);
        const success = await activate('DEMO');
        setLoading(false);
        if (success) {
            (router as any).replace('/register');
        }
    };

    const openLink = async (url: string) => {
        try {
            // For phone and email, we try to open directly first
            // canOpenURL is often unreliable on newer Android/iOS for these schemes
            if (url.startsWith('tel:') || url.startsWith('mailto:') || url.startsWith('https://wa.me')) {
                await Linking.openURL(url);
                return;
            }

            const supported = await Linking.canOpenURL(url);
            if (supported) {
                await Linking.openURL(url);
            } else {
                setAlertConfig({
                    title: t('error'),
                    message: t('could_not_open_link'),
                    type: 'error',
                    onConfirm: () => {}
                });
                setAlertVisible(true);
            }
        } catch (error) {
            console.error('Error opening link:', error);
            setAlertConfig({
                title: t('error'),
                message: t('could_not_open_link'),
                type: 'error',
                onConfirm: () => {}
            });
            setAlertVisible(true);
        }
    };

    const contactMethods = contactData ? [
        { icon: 'call', value: contactData.phone || '+91 9788339566', url: `tel:${contactData.phone?.replace(/\s+/g, '') || '+919788339566'}`, color: '#007AFF' },
        { icon: 'logo-whatsapp', value: 'WhatsApp Support', url: contactData.whatsapp || `https://wa.me/919788339566`, color: '#25D366' },
        { icon: 'mail', value: contactData.email || 'nexooai@gmail.com', url: `mailto:${contactData.email || 'nexooai@gmail.com'}`, color: '#EA4335' },
    ] : [
        { icon: 'call', value: '+91 9788339566', url: `tel:+919788339566`, color: '#007AFF' },
        { icon: 'logo-whatsapp', value: '+91 9788339566 (WhatsApp)', url: `https://wa.me/919788339566`, color: '#25D366' },
        { icon: 'mail', value: 'nexooai@gmail.com', url: `mailto:nexooai@gmail.com`, color: '#EA4335' },
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
                <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
                    <View style={styles.header}>
                        {shopDetails.appLogo ? (
                            <Image source={{ uri: shopDetails.appLogo }} style={styles.logo} />
                        ) : (
                            <Image source={require('../../assets/icon.png')} style={styles.logo} />
                        )}
                        <Text style={[styles.appName, { color: activeColors.text }]}>{t('app_name')}</Text>
                        <Text style={[styles.appSubtitle, { color: activeColors.textLight }]}>{t('app_subtitle')}</Text>
                    </View>

                    <View style={[styles.formCard, { backgroundColor: activeColors.cardBg }]}>
                        <Text style={[styles.welcomeText, { color: activeColors.text }]}>
                            {t('activation_welcome')}
                        </Text>

                        <TouchableOpacity
                            style={[styles.activateButton, { backgroundColor: activeColors.primary, marginTop: SPACING.lg }]}
                            onPress={handleDemoStart}
                            disabled={loading}
                        >
                            <Text style={[styles.activateButtonText, { color: activeColors.cardBg }]}>
                                {t('start_trial')}
                            </Text>
                        </TouchableOpacity>

                        <View style={{ marginTop: SPACING.xl, alignItems: 'center' }}>
                            <Text style={{ color: activeColors.textLight, fontSize: FONT_SIZES.sm, marginBottom: SPACING.md }}>
                                {t('already_customer')}
                            </Text>
                            <TouchableOpacity
                                style={{
                                    backgroundColor: activeColors.cardBg,
                                    borderColor: activeColors.primary,
                                    borderWidth: 1.5,
                                    paddingVertical: 10,
                                    paddingHorizontal: 28,
                                    borderRadius: BORDER_RADIUS.xl,
                                    shadowColor: '#e31212ff', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 3, elevation: 2
                                }}
                                onPress={async () => {
                                    setLoading(true);
                                    const success = await activate('DEMO');
                                    setLoading(false);
                                    if (success) {
                                        (router as any).replace('/login');
                                    }
                                }}
                            >
                                <Text style={{ color: activeColors.primary, fontSize: FONT_SIZES.sm, fontWeight: 'bold' }}>
                                    {t('login_to_account')}
                                </Text>
                            </TouchableOpacity>
                        </View>
                    </View>

                    <View style={styles.floatingSupportBar}>
                        <Text style={[styles.supportTitle, { color: activeColors.text, marginRight: SPACING.md }]}>
                            {t('contact_support')}
                        </Text>
                        <View style={styles.supportIconsRow}>
                            {contactMethods.map((method, index) => (
                                <TouchableOpacity
                                    key={index}
                                    style={[styles.supportIconCircle, { backgroundColor: activeColors.background }]}
                                    onPress={() => openLink(method.url)}
                                >
                                    <Icon name={method.icon} size={22} color={method.color} />
                                </TouchableOpacity>
                            ))}
                        </View>
                    </View>
                    {/* <View style={{ marginTop: SPACING.xl, alignItems: 'center' }}>
                    <TouchableOpacity onPress={() => Linking.openURL('https://mnvgroups.in/')}>
                        <Text style={{ color: activeColors.textLight, fontSize: FONT_SIZES.sm }}>
                            Powered by https://mnvgroups.in/
                        </Text>
                    </TouchableOpacity>
                </View> */}
                </ScrollView>
                <AIChatBox isExternalOpen={isAIChatOpen} onExternalClose={() => setIsAIChatOpen(false)} />
            </SafeLinearGradient>

            <CustomAlertModal
                visible={showDemoModal}
                title={t('start_trial')}
                message={demoData?.message || t('demo_trial_experience')}
                type="info"
                theme={theme as 'light' | 'dark'}
                showCloseIcon={true}
                onClose={() => setShowDemoModal(false)}
                buttons={[
                    {
                        text: t('ask_me_call'),
                        onPress: () => {
                            setShowDemoModal(false);
                            setIsAIChatOpen(true);
                        },
                        style: "cancel"
                    },
                    {
                        text: t('start_demo'),
                        onPress: confirmDemoStart,
                        style: "default"
                    }
                ]}
                t={t}
            />

            <CustomAlertModal
                visible={alertVisible}
                title={alertConfig.title}
                message={alertConfig.message}
                type={alertConfig.type}
                theme={theme as 'light' | 'dark'}
                onClose={() => {
                    setAlertVisible(false);
                }}
                buttons={alertConfig.type === 'success' ? [
                    { text: t('done') || 'Done', onPress: alertConfig.onConfirm }
                ] : []}
                t={t}
            />
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
        paddingTop: 45,
    },
    header: {
        alignItems: 'center',
        marginTop: SPACING.xxl,
        marginBottom: SPACING.md,
    },
    logo: {
        width: 140,
        height: 140,
        borderRadius: BORDER_RADIUS.md,
        marginBottom: SPACING.sm,
    },
    appName: {
        fontSize: FONT_SIZES.xxl,
        fontWeight: 'bold',
        textAlign: 'center',
    },
    appSubtitle: {
        fontSize: FONT_SIZES.sm,
        textAlign: 'center',
        opacity: 0.8,
    },
    formCard: {
        padding: SPACING.xl,
        borderRadius: BORDER_RADIUS.xl,
        width: '100%',
        marginTop: SPACING.xxl,
        shadowColor: '#e11515ff',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.12,
        shadowRadius: 20,
        elevation: 8,
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.3)',
    },
    welcomeText: {
        fontSize: FONT_SIZES.lg,
        fontWeight: 'bold',
        textAlign: 'center',
        marginBottom: SPACING.sm,
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
    floatingSupportBar: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: 'rgba(255, 255, 255, 0.9)',
        borderRadius: 100,
        paddingVertical: SPACING.sm,
        paddingHorizontal: SPACING.xl,
        marginTop: SPACING.lg,
        marginBottom: SPACING.xl,
        shadowColor: '#da2525ff',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.15,
        shadowRadius: 12,
        elevation: 6,
    },
    supportTitle: {
        fontSize: FONT_SIZES.sm,
        fontWeight: 'bold',
        opacity: 0.9,
    },
    supportIconsRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: SPACING.md,
    },
    supportIconCircle: {
        width: 40,
        height: 40,
        borderRadius: 20,
        justifyContent: 'center',
        alignItems: 'center',
        elevation: 2,
        shadowColor: '#db1313ff',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 3,
    },
});
