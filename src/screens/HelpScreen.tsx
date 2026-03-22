import React, { useState, useEffect } from 'react';
import { View as RNView, Text as RNText, StyleSheet, TouchableOpacity as RNRTouchableOpacity, ScrollView as RNScrollView, Linking, Image as RNImage, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import ScreenContainer from '../components/ScreenContainer';
import HeaderBar from '../components/HeaderBar';
import { COLORS, SPACING, FONT_SIZES, BORDER_RADIUS, LIGHT_COLORS, DARK_COLORS } from '../constants/theme';
import { useGeneralSettings } from '../store/GeneralSettingsContext';
import { BASE_URL } from '../constants/config';

// Fix for React 19 type mismatch
const View = RNView as any;
const Text = RNText as any;
const ScrollView = RNScrollView as any;
const TouchableOpacity = RNRTouchableOpacity as any;
const Icon = Ionicons as any;
const Image = RNImage as any;

export default function HelpScreen() {
    const { theme, t, shopDetails, serverApiUrl } = useGeneralSettings();
    const activeColors = theme === 'light' ? LIGHT_COLORS : DARK_COLORS;

    const [contactData, setContactData] = useState<any>(null);

    useEffect(() => {
        const fetchConfig = async () => {
            try {
                let baseUrl = serverApiUrl || BASE_URL;
                const url = `${baseUrl.replace(/\/$/, '')}/api/public/config`;
                const response = await fetch(url);
                if (response.ok) {
                    const data = await response.json();
                    if (data.contact) setContactData(data.contact);
                }
            } catch (e) {
                console.log('Error fetching support config:', e);
            }
        };
        fetchConfig();
    }, [serverApiUrl]);

    const handleOpenLink = (url: string) => {
        Linking.openURL(url).catch(err => console.error("Couldn't load page", err));
    };

    const contactMethods = [
        {
            id: 'call',
            icon: 'call-outline',
            title: t('call_us') || 'Call Support',
            value: contactData?.phone || '+91 9788339566',
            url: `tel:${(contactData?.phone || '+919788339566').replace(/\s+/g, '')}`,
            color: '#007AFF'
        },
        {
            id: 'whatsapp',
            icon: 'logo-whatsapp',
            title: t('whatsapp_support') || 'WhatsApp Support',
            value: 'Message us on WhatsApp',
            url: contactData?.whatsapp || 'https://wa.me/919788339566',
            color: '#25D366'
        },
        {
            id: 'email',
            icon: 'mail-outline',
            title: t('email_us') || 'Email Support',
            value: contactData?.email || 'nexooai@gmail.com',
            url: `mailto:${contactData?.email || 'nexooai@gmail.com'}`,
            color: '#EA4335'
        }
    ];

    return (
        <ScreenContainer backgroundColor={activeColors.background}>
            <HeaderBar title={t('help_support')} showBack />
            <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent}>
                <View style={[styles.infoCard, { backgroundColor: activeColors.cardBg }]}>
                    <Icon name="help-circle" size={50} color={activeColors.primary} />
                    <Text style={[styles.title, { color: activeColors.text }]}>{t('how_can_we_help') || 'How can we help you?'}</Text>
                    <Text style={[styles.subtitle, { color: activeColors.textLight }]}>
                        {t('help_description') || 'If you are facing any issues with the application or have questions about your subscription, please reach out to our team.'}
                    </Text>
                </View>

                <View style={styles.section}>
                    <Text style={[styles.sectionTitle, { color: activeColors.primary }]}>{t('contact_options') || 'Contact Options'}</Text>
                    {contactMethods.map((method) => (
                        <TouchableOpacity
                            key={method.id}
                            style={[styles.contactCard, { backgroundColor: activeColors.cardBg, borderColor: activeColors.border }]}
                            onPress={() => handleOpenLink(method.url)}
                        >
                            <View style={[styles.iconBox, { backgroundColor: method.color + '15' }]}>
                                <Icon name={method.icon} size={24} color={method.color} />
                            </View>
                            <View style={styles.contactInfo}>
                                <Text style={[styles.contactTitle, { color: activeColors.text }]}>{method.title}</Text>
                                <Text style={[styles.contactValue, { color: activeColors.textLight }]}>{method.value}</Text>
                            </View>
                            <Icon name="chevron-forward" size={20} color={activeColors.border} />
                        </TouchableOpacity>
                    ))}
                </View>

                <View style={[styles.footer, { backgroundColor: activeColors.cardBg }]}>
                    <Text style={[styles.footerText, { color: activeColors.textLight }]}>
                        {t('app_version') || 'App Version'}: 1.0.0
                    </Text>
                    <Text style={[styles.footerText, { color: activeColors.textLight, marginTop: 4 }]}>
                        {t('powered_by') || 'Powered by NEXOO AI'}
                    </Text>
                </View>
            </ScrollView>
        </ScreenContainer>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    scrollContent: {
        padding: SPACING.lg,
    },
    infoCard: {
        alignItems: 'center',
        padding: SPACING.xl,
        borderRadius: BORDER_RADIUS.lg,
        marginBottom: SPACING.xl,
        elevation: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
    },
    title: {
        fontSize: FONT_SIZES.xl,
        fontWeight: 'bold',
        marginTop: SPACING.md,
        textAlign: 'center',
    },
    subtitle: {
        fontSize: FONT_SIZES.md,
        textAlign: 'center',
        marginTop: SPACING.sm,
        lineHeight: 22,
    },
    section: {
        marginBottom: SPACING.xl,
    },
    sectionTitle: {
        fontSize: FONT_SIZES.xs,
        fontWeight: 'bold',
        textTransform: 'uppercase',
        letterSpacing: 1.5,
        marginBottom: SPACING.md,
        marginLeft: SPACING.xs,
    },
    contactCard: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: SPACING.md,
        borderRadius: BORDER_RADIUS.md,
        marginBottom: SPACING.md,
        borderWidth: 1,
    },
    iconBox: {
        width: 48,
        height: 48,
        borderRadius: 24,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: SPACING.md,
    },
    contactInfo: {
        flex: 1,
    },
    contactTitle: {
        fontSize: FONT_SIZES.md,
        fontWeight: 'bold',
    },
    contactValue: {
        fontSize: FONT_SIZES.sm,
        marginTop: 2,
    },
    footer: {
        padding: SPACING.xl,
        borderRadius: BORDER_RADIUS.lg,
        alignItems: 'center',
        marginTop: SPACING.lg,
    },
    footerText: {
        fontSize: FONT_SIZES.xs,
    },
});
