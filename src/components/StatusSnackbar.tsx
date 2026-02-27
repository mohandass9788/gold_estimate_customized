import React, { useEffect, useState, useRef } from 'react';
import {
    View,
    Text,
    StyleSheet,
    Animated,
    TouchableOpacity,
    Dimensions,
    Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SPACING, FONT_SIZES, BORDER_RADIUS, LIGHT_COLORS, DARK_COLORS } from '../constants/theme';
import { useGeneralSettings } from '../store/GeneralSettingsContext';

const { width } = Dimensions.get('window');

interface StatusSnackbarProps {
    visible: boolean;
    message: string;
    type?: 'warning' | 'info' | 'success' | 'error';
    onAction?: () => void;
    actionLabel?: string;
    onClose?: () => void;
    duration?: number;
    position?: 'top' | 'bottom';
}

export default function StatusSnackbar({
    visible,
    message,
    type = 'info',
    onAction,
    actionLabel,
    onClose,
    duration = 5000,
    position = 'bottom',
}: StatusSnackbarProps) {
    const { theme } = useGeneralSettings();
    const activeColors = theme === 'light' ? LIGHT_COLORS : DARK_COLORS;
    const fadeAnim = useRef(new Animated.Value(0)).current;
    const translateY = useRef(new Animated.Value(position === 'top' ? -100 : 100)).current;

    const [shouldRender, setShouldRender] = useState(visible);

    useEffect(() => {
        if (visible) {
            setShouldRender(true);
            Animated.parallel([
                Animated.timing(fadeAnim, {
                    toValue: 1,
                    duration: 300,
                    useNativeDriver: true,
                }),
                Animated.timing(translateY, {
                    toValue: 0,
                    duration: 300,
                    useNativeDriver: true,
                }),
            ]).start();
        } else {
            Animated.parallel([
                Animated.timing(fadeAnim, {
                    toValue: 0,
                    duration: 300,
                    useNativeDriver: true,
                }),
                Animated.timing(translateY, {
                    toValue: position === 'top' ? -100 : 100,
                    duration: 300,
                    useNativeDriver: true,
                }),
            ]).start(() => setShouldRender(false));
        }
    }, [visible, position]);

    if (!shouldRender) return null;

    const getIcon = () => {
        switch (type) {
            case 'warning': return 'warning-outline';
            case 'error': return 'alert-circle-outline';
            case 'success': return 'checkmark-circle-outline';
            default: return 'information-circle-outline';
        }
    };

    const getBgColor = () => {
        switch (type) {
            case 'warning': return '#FF9500';
            case 'error': return activeColors.error;
            case 'success': return activeColors.success;
            default: return activeColors.primary;
        }
    };

    return (
        <Animated.View
            style={[
                styles.container,
                position === 'top' ? styles.top : styles.bottom,
                {
                    opacity: fadeAnim,
                    transform: [{ translateY }],
                    backgroundColor: getBgColor(),
                }
            ]}
        >
            <View style={styles.content}>
                <Ionicons name={getIcon()} size={20} color="#FFF" style={styles.icon} />
                <Text style={styles.message}>{message}</Text>
            </View>

            <View style={styles.actions}>
                {onAction && actionLabel && (
                    <TouchableOpacity onPress={onAction} style={styles.actionButton}>
                        <Text style={styles.actionText}>{actionLabel}</Text>
                    </TouchableOpacity>
                )}
                <TouchableOpacity onPress={onClose} style={styles.closeButton}>
                    <Ionicons name="close" size={20} color="#FFF" />
                </TouchableOpacity>
            </View>
        </Animated.View>
    );
}

const styles = StyleSheet.create({
    container: {
        position: 'absolute',
        left: SPACING.md,
        right: SPACING.md,
        padding: SPACING.md,
        borderRadius: BORDER_RADIUS.md,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        elevation: 10,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 4.65,
        zIndex: 9999,
    },
    top: {
        top: Platform.OS === 'ios' ? 60 : 40,
    },
    bottom: {
        bottom: Platform.OS === 'ios' ? 100 : 80,
    },
    content: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
    },
    icon: {
        marginRight: SPACING.sm,
    },
    message: {
        color: '#FFF',
        fontSize: FONT_SIZES.sm,
        fontWeight: '600',
        flex: 1,
    },
    actions: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    actionButton: {
        backgroundColor: 'rgba(255,255,255,0.2)',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: BORDER_RADIUS.sm,
        marginRight: SPACING.sm,
    },
    actionText: {
        color: '#FFF',
        fontSize: 12,
        fontWeight: 'bold',
        textTransform: 'uppercase',
    },
    closeButton: {
        padding: 4,
    },
});
