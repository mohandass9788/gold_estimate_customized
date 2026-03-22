import React, { useState, useEffect, useMemo } from 'react';
import { View as RNView, Text as RNText, StyleSheet, ScrollView as RNScrollView, ActivityIndicator, TouchableOpacity as RNTouchableOpacity } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import ScreenContainer from '../components/ScreenContainer';
import HeaderBar from '../components/HeaderBar';
import { COLORS, SPACING, FONT_SIZES, BORDER_RADIUS, LIGHT_COLORS, DARK_COLORS } from '../constants/theme';
import { useGeneralSettings } from '../store/GeneralSettingsContext';
import { BASE_URL } from '../constants/config';

import RenderHTML from 'react-native-render-html';
import { useWindowDimensions } from 'react-native';
import axios from 'axios';

const View = RNView as any;
const Text = RNText as any;
const Icon = Ionicons as any;
const TouchableOpacity = RNTouchableOpacity as any;
const ScrollView = RNScrollView as any;

export default function LegalContentScreen() {
    const { type } = useLocalSearchParams<{ type: 'privacy' | 'terms' }>();
    const { theme, t } = useGeneralSettings();
    const router = useRouter();
    const activeColors = theme === 'light' ? LIGHT_COLORS : DARK_COLORS;

    const [content, setContent] = useState<string>('');
    const [loading, setLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);

    const title = type === 'privacy' 
        ? (t('privacy_policy') || 'Privacy Policy') 
        : (t('terms_conditions') || 'Terms & Conditions');

    const { width } = useWindowDimensions();

    useEffect(() => {
        const fetchContent = async () => {
            try {
                setLoading(true);
                const url = `${BASE_URL.replace(/\/$/, '')}/api/public/legal/${type}`;
                const response = await fetch(url);
                
                if (!response.ok) {
                    throw new Error('Failed to fetch content');
                }

                const data = await response.text();
                setContent(data);
                setError(null);
            } catch (err) {
                console.error('Error fetching legal content:', err);
                setError(t('error_loading') || 'Failed to load content. Please try again later.');
            } finally {
                setLoading(false);
            }
        };

        if (type) {
            fetchContent();
        }
    }, [type, t]);

    const tagsStyles = useMemo(() => ({
        body: {
            color: activeColors.text,
            fontSize: FONT_SIZES.md,
            lineHeight: 24,
        },
        h1: { color: activeColors.primary, marginTop: 20, marginBottom: 10 },
        h2: { color: activeColors.primary, marginTop: 15, marginBottom: 8 },
        p: { marginBottom: 12 },
    }), [activeColors]);

    const source = useMemo(() => ({
        html: content || '<p></p>'
    }), [content]);

    const baseStyle = useMemo(() => ({
        backgroundColor: activeColors.cardBg,
        padding: SPACING.md,
        borderRadius: BORDER_RADIUS.lg,
    }), [activeColors]);

    return (
        <ScreenContainer backgroundColor={activeColors.background}>
            <HeaderBar title={title} showBack />
            
            <View style={styles.container}>
                {loading && (
                    <View style={[styles.loadingOverlay, { backgroundColor: activeColors.background }]}>
                        <ActivityIndicator size="large" color={activeColors.primary} />
                        <Text style={[styles.loadingText, { color: activeColors.textLight }]}>
                            {t('loading_content') || 'Loading content...'}
                        </Text>
                    </View>
                )}
                
                {error ? (
                    <View style={styles.center}>
                        <Icon name="alert-circle-outline" size={48} color={COLORS.error} />
                        <Text style={[styles.errorText, { color: COLORS.error }]}>{error}</Text>
                        <TouchableOpacity 
                            style={[styles.retryBtn, { backgroundColor: activeColors.primary }]}
                            onPress={() => setError(null)} // Triggers re-fetch
                        >
                            <Text style={styles.retryText}>{t('retry') || 'Retry'}</Text>
                        </TouchableOpacity>
                    </View>
                ) : (
                    <ScrollView style={styles.webview} contentContainerStyle={styles.scrollContent}>
                        <RenderHTML
                            contentWidth={width - (SPACING.md * 2)}
                            source={source}
                            tagsStyles={tagsStyles}
                            baseStyle={baseStyle}
                        />
                    </ScrollView>
                )}
            </View>
        </ScreenContainer>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    loadingOverlay: {
        ...StyleSheet.absoluteFillObject,
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 1,
    },
    webview: {
        flex: 1,
    },
    scrollContent: {
        padding: SPACING.md,
    },
    center: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: SPACING.xl,
    },
    loadingText: {
        marginTop: SPACING.md,
        fontSize: FONT_SIZES.md,
    },
    errorText: {
        marginTop: SPACING.md,
        fontSize: FONT_SIZES.md,
        textAlign: 'center',
        marginBottom: SPACING.lg,
    },
    retryBtn: {
        paddingHorizontal: SPACING.xl,
        paddingVertical: SPACING.md,
        borderRadius: BORDER_RADIUS.md,
    },
    retryText: {
        color: '#FFF',
        fontWeight: 'bold',
    }
});
