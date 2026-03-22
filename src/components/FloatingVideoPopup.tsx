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
    ActivityIndicator
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as WebBrowser from 'expo-web-browser';
import { useTutorial } from '../store/TutorialContext';
import { useGeneralSettings } from '../store/GeneralSettingsContext';
import { COLORS, SPACING, BORDER_RADIUS, FONT_SIZES, LIGHT_COLORS, DARK_COLORS } from '../constants/theme';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const POPUP_WIDTH = 160;
const POPUP_HEIGHT = 220; // Portrait as requested

export const FloatingVideoPopup: React.FC = () => {
    const { tutorialData, isPopupVisible, setPopupVisible } = useTutorial();
    const { theme, t } = useGeneralSettings();
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
            onMoveShouldSetPanResponder: () => true,
            onPanResponderGrant: () => {
                setIsDragging(true);
                pan.setOffset({
                    x: (pan.x as any)._value,
                    y: (pan.y as any)._value
                });
                pan.setValue({ x: 0, y: 0 });
            },
            onPanResponderMove: Animated.event(
                [null, { dx: pan.x, dy: pan.y }],
                { useNativeDriver: false }
            ),
            onPanResponderRelease: (e, gestureState) => {
                setIsDragging(false);
                pan.flattenOffset();
                
                // Keep within bounds
                let targetX = (pan.x as any)._value;
                let targetY = (pan.y as any)._value;

                if (targetX < PADDING) targetX = PADDING;
                if (targetX > MAX_X) targetX = MAX_X;
                if (targetY < PADDING) targetY = PADDING;
                if (targetY > MAX_Y) targetY = MAX_Y;

                Animated.spring(pan, {
                    toValue: { x: targetX, y: targetY },
                    useNativeDriver: false,
                    friction: 5
                }).start();
            }
        })
    ).current;

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

            {/* Video Content Placeholder */}
            <TouchableOpacity 
                activeOpacity={0.8}
                onPress={handlePlayVideo}
                style={styles.content}
            >
                <View style={[styles.thumbnailPlaceholder, { backgroundColor: activeColors.background }]}>
                    <Ionicons name="play-circle" size={48} color={activeColors.primary} />
                    <Text style={[styles.playText, { color: activeColors.textLight }]}>
                        {t('watch_now') || 'Watch Now'}
                    </Text>
                </View>
                
                <View style={styles.infoArea}>
                    <Text numberOfLines={2} style={[styles.title, { color: activeColors.text }]}>
                        {tutorialData.title || t('tutorial_video') || 'Tutorial Video'}
                    </Text>
                </View>
            </TouchableOpacity>
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
        width: 30,
        height: 4,
        borderRadius: 2,
        backgroundColor: '#ccc',
        opacity: 0.5,
    },
    closeButton: {
        padding: 4,
    },
    content: {
        flex: 1,
    },
    thumbnailPlaceholder: {
        height: POPUP_HEIGHT - 80,
        justifyContent: 'center',
        alignItems: 'center',
    },
    playText: {
        fontSize: FONT_SIZES.xs,
        marginTop: SPACING.xs,
        fontWeight: 'bold',
    },
    infoArea: {
        padding: SPACING.sm,
        justifyContent: 'center',
        alignItems: 'center',
        height: 50,
    },
    title: {
        fontSize: FONT_SIZES.sm,
        fontWeight: 'bold',
        textAlign: 'center',
    }
});
