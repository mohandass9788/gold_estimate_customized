import React, { useRef, useState, useEffect } from 'react';
import {
    View,
    StyleSheet,
    Animated,
    PanResponder,
    TouchableOpacity,
    Text,
    Dimensions,
    Platform,
    Linking,
    Image,
    ActivityIndicator,
    NativeModules
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
// Safely import WebView
let WebView: any;
try {
    WebView = require('react-native-webview').WebView;
} catch (e) {
    console.warn('WebView is not available');
}
import * as WebBrowser from 'expo-web-browser';
import { useTutorial } from '../store/TutorialContext';
import { useGeneralSettings } from '../store/GeneralSettingsContext';
import { COLORS, SPACING, BORDER_RADIUS, FONT_SIZES, LIGHT_COLORS, DARK_COLORS } from '../constants/theme';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const POPUP_WIDTH = 220;
const POPUP_HEIGHT = 300;

export const FloatingVideoPopup: React.FC = () => {
    const { tutorialData, isPopupVisible, setPopupVisible } = useTutorial();
    const { theme, t } = useGeneralSettings();
    const [shouldPlay, setShouldPlay] = useState(false);
    const activeColors = theme === 'light' ? LIGHT_COLORS : DARK_COLORS;

    // Boundary limits
    const PADDING = 20;
    const MAX_X = SCREEN_WIDTH - POPUP_WIDTH - PADDING;
    const MAX_Y = SCREEN_HEIGHT - POPUP_HEIGHT - PADDING - 100; // Leave space for bottom tabs/header

    const pan = useRef(new Animated.ValueXY({ x: MAX_X, y: 100 })).current;
    const [isDragging, setIsDragging] = useState(false);

    const panResponder = useRef(
        PanResponder.create({
            onStartShouldSetPanResponder: () => true,
            onMoveShouldSetPanResponder: (_, gestureState) => {
                return Math.abs(gestureState.dx) > 2 || Math.abs(gestureState.dy) > 2;
            },
            onPanResponderGrant: () => {
                setIsDragging(true);
                // Stop any ongoing animation to prevent jumping
                pan.stopAnimation();
                pan.extractOffset();
            },
            onPanResponderMove: Animated.event(
                [null, { dx: pan.x, dy: pan.y }],
                { useNativeDriver: false }
            ),
            onPanResponderRelease: (e, gestureState) => {
                setIsDragging(false);
                pan.flattenOffset();
                
                let targetX = (pan.x as any)._value;
                let targetY = (pan.y as any)._value;

                if (targetX < PADDING) targetX = PADDING;
                if (targetX > MAX_X) targetX = MAX_X;
                if (targetY < PADDING) targetY = PADDING;
                if (targetY > MAX_Y) targetY = MAX_Y;

                Animated.spring(pan, {
                    toValue: { x: targetX, y: targetY },
                    useNativeDriver: false,
                    friction: 8,
                    tension: 50
                }).start();
            }
        })
    ).current;

    const getYoutubeEmbedUrl = (url: string) => {
        if (!url) return '';
        let videoId = '';
        if (url.includes('shorts/')) {
            videoId = url.split('shorts/')[1]?.split('?')[0];
        } else if (url.includes('v=')) {
            videoId = url.split('v=')[1]?.split('&')[0];
        } else if (url.includes('youtu.be/')) {
            videoId = url.split('youtu.be/')[1]?.split('?')[0];
        }
        
        if (!videoId) return url;
        // autoplay=1, mute=1 (required for autoplay in most browsers), loop=1, playlist=[videoId] (required for loop)
        return `https://www.youtube.com/embed/${videoId}?autoplay=1&mute=1&loop=1&playlist=${videoId}&controls=0&modestbranding=1&rel=0`;
    };

    const embedUrl = getYoutubeEmbedUrl(tutorialData?.videoUrl || '');

    useEffect(() => {
        if (isPopupVisible && tutorialData?.isEnabled) {
            // Give it 2 seconds to load before "activating" the player logic
            // This can help with initial layout/rendering issues
            const timer = setTimeout(() => {
                setShouldPlay(true);
            }, 2000);
            return () => clearTimeout(timer);
        } else {
            setShouldPlay(false);
        }
    }, [isPopupVisible, tutorialData?.isEnabled]);

    const handlePlayVideo = async () => {
        if (tutorialData?.videoUrl) {
            try {
                await WebBrowser.openBrowserAsync(tutorialData.videoUrl);
            } catch (error) {
                Linking.openURL(tutorialData.videoUrl).catch(err => 
                    console.error("Couldn't open tutorial link", err)
                );
            }
        }
    };

    if (!isPopupVisible || !tutorialData?.isEnabled) return null;

    return (
        <Animated.View
            {...panResponder.panHandlers}
            style={[
                styles.container,
                {
                    transform: pan.getTranslateTransform(),
                    backgroundColor: activeColors.cardBg,
                    borderColor: activeColors.primary,
                },
                isDragging && styles.dragging
            ]}
        >
            {/* Header / Close button */}
            <View style={styles.header}>
                <View style={styles.dragHandle} />
                <TouchableOpacity 
                    onPress={() => setPopupVisible(false)}
                    style={styles.closeButton}
                >
                    <Ionicons name="close" size={18} color={activeColors.text} />
                </TouchableOpacity>
            </View>

            {/* Video Content - Inline WebView Player */}
            <View style={styles.content}>
                {embedUrl && WebView && shouldPlay ? (
                    <WebView
                        key={embedUrl}
                        style={styles.webView}
                        source={{ uri: embedUrl }}
                        allowsFullscreenVideo
                        allowsInlineMediaPlayback
                        mediaPlaybackRequiresUserAction={false}
                        scrollEnabled={false}
                        startInLoadingState={true}
                        javaScriptEnabled={true}
                        domStorageEnabled={true}
                        renderLoading={() => (
                            <View style={styles.loadingContainer}>
                                <ActivityIndicator color={activeColors.primary} size="large" />
                            </View>
                        )}
                    />
                ) : (
                    <TouchableOpacity 
                        activeOpacity={0.8}
                        onPress={handlePlayVideo}
                        style={[styles.thumbnailPlaceholder, { backgroundColor: activeColors.background }]}
                    >
                        <Ionicons name="play-circle" size={56} color={activeColors.primary} />
                        <Text style={[styles.playText, { color: activeColors.textLight }]}>
                            {!shouldPlay ? (t('loading') || 'Loading...') : (WebView ? (t('invalid_video') || 'Invalid Video') : (t('watch_now') || 'Watch Now (External)'))}
                        </Text>
                    </TouchableOpacity>
                )}
                
                <View style={[styles.infoArea, { backgroundColor: activeColors.cardBg }]}>
                    <Text numberOfLines={1} style={[styles.title, { color: activeColors.text }]}>
                        {tutorialData.title || t('tutorial_video') || 'Tutorial Video'}
                    </Text>
                </View>
            </View>
        </Animated.View>
    );
};

const styles = StyleSheet.create({
    container: {
        position: 'absolute',
        width: POPUP_WIDTH,
        height: POPUP_HEIGHT,
        borderRadius: BORDER_RADIUS.lg,
        borderWidth: 1.5,
        elevation: 10,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 5 },
        shadowOpacity: 0.3,
        shadowRadius: 5,
        overflow: 'hidden',
        zIndex: 9999,
    },
    dragging: {
        opacity: 0.8,
        transform: [{ scale: 1.05 }]
    },
    header: {
        height: 30,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: SPACING.sm,
    },
    dragHandle: {
        width: 40,
        height: 5,
        borderRadius: 3,
        backgroundColor: '#ccc',
        opacity: 0.8,
    },
    closeButton: {
        padding: 4,
    },
    content: {
        flex: 1,
    },
    thumbnailPlaceholder: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    webView: {
        flex: 1,
        backgroundColor: 'transparent',
    },
    loadingContainer: {
        ...StyleSheet.absoluteFillObject,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'rgba(0,0,0,0.1)',
    },
    playText: {
        fontSize: FONT_SIZES.sm,
        marginTop: SPACING.xs,
        fontWeight: 'bold',
    },
    infoArea: {
        padding: SPACING.sm,
        justifyContent: 'center',
        alignItems: 'center',
        height: 60,
    },
    title: {
        fontSize: FONT_SIZES.sm,
        fontWeight: 'bold',
        textAlign: 'center',
    }
});
