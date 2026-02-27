import React from 'react';
import {
    Modal,
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    Animated,
    Dimensions
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SPACING, FONT_SIZES, BORDER_RADIUS } from '../constants/theme';

export interface AlertButton {
    text: string;
    onPress: () => void;
    style?: 'default' | 'cancel' | 'destructive';
}

interface CustomAlertModalProps {
    visible: boolean;
    title: string;
    message: string;
    type?: 'success' | 'error' | 'warning' | 'info';
    buttons?: AlertButton[];
    onClose: () => void;
    theme: 'light' | 'dark';
}

const { width } = Dimensions.get('window');

export default function CustomAlertModal({
    visible,
    title,
    message,
    type = 'info',
    buttons = [],
    onClose,
    theme
}: CustomAlertModalProps) {
    const [fadeAnim] = React.useState(new Animated.Value(0));
    const [scaleAnim] = React.useState(new Animated.Value(0.8));

    React.useEffect(() => {
        if (visible) {
            Animated.parallel([
                Animated.timing(fadeAnim, {
                    toValue: 1,
                    duration: 200,
                    useNativeDriver: true,
                }),
                Animated.spring(scaleAnim, {
                    toValue: 1,
                    friction: 8,
                    useNativeDriver: true,
                }),
            ]).start();
        } else {
            fadeAnim.setValue(0);
            scaleAnim.setValue(0.8);
        }
    }, [visible]);

    if (!visible) return null;

    const iconName = {
        success: 'checkmark-circle',
        error: 'alert-circle',
        warning: 'warning',
        info: 'information-circle'
    }[type] as any;

    const iconColor = {
        success: '#4CAF50',
        error: '#F44336',
        warning: '#FF9800',
        info: COLORS.primary
    }[type];

    const isDark = theme === 'dark';
    const bgColor = isDark ? '#1E1E1E' : '#FFFFFF';
    const textColor = isDark ? '#FFFFFF' : '#333333';
    const subTextColor = isDark ? '#BBBBBB' : '#666666';

    return (
        <Modal transparent visible={visible} animationType="none">
            <View style={styles.overlay}>
                <Animated.View
                    style={[
                        styles.container,
                        {
                            backgroundColor: bgColor,
                            opacity: fadeAnim,
                            transform: [{ scale: scaleAnim }]
                        }
                    ]}
                >
                    <View style={styles.header}>
                        <Ionicons name={iconName} size={50} color={iconColor} />
                        <Text style={[styles.title, { color: textColor }]}>{title}</Text>
                    </View>

                    <View style={styles.body}>
                        <Text style={[styles.message, { color: subTextColor }]}>{message}</Text>
                    </View>

                    <View style={styles.footer}>
                        {buttons.length > 0 ? (
                            buttons.map((btn, index) => (
                                <TouchableOpacity
                                    key={index}
                                    style={[
                                        styles.button,
                                        btn.style === 'destructive' && styles.destructiveButton,
                                        btn.style === 'cancel' && styles.cancelButton,
                                        index < buttons.length - 1 && styles.buttonMargin
                                    ]}
                                    onPress={() => {
                                        btn.onPress();
                                        onClose();
                                    }}
                                >
                                    <Text
                                        style={[
                                            styles.buttonText,
                                            btn.style === 'cancel' && { color: subTextColor },
                                            btn.style === 'destructive' && { color: '#FFF' }
                                        ]}
                                    >
                                        {btn.text}
                                    </Text>
                                </TouchableOpacity>
                            ))
                        ) : (
                            <TouchableOpacity style={styles.button} onPress={onClose}>
                                <Text style={styles.buttonText}>OK</Text>
                            </TouchableOpacity>
                        )}
                    </View>
                </Animated.View>
            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.6)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: SPACING.xl,
    },
    container: {
        width: Math.min(width * 0.85, 400),
        borderRadius: BORDER_RADIUS.xl,
        padding: SPACING.xl,
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.25,
        shadowRadius: 20,
        elevation: 10,
    },
    header: {
        alignItems: 'center',
        marginBottom: SPACING.md,
    },
    title: {
        fontSize: FONT_SIZES.lg,
        fontWeight: 'bold',
        marginTop: SPACING.sm,
        textAlign: 'center',
    },
    body: {
        marginBottom: SPACING.xl,
    },
    message: {
        fontSize: FONT_SIZES.md,
        textAlign: 'center',
        lineHeight: 22,
    },
    footer: {
        flexDirection: 'row',
        width: '100%',
        justifyContent: 'center',
    },
    button: {
        flex: 1,
        paddingVertical: SPACING.md,
        backgroundColor: COLORS.primary + '15',
        borderRadius: BORDER_RADIUS.md,
        alignItems: 'center',
    },
    buttonMargin: {
        marginRight: SPACING.sm,
    },
    destructiveButton: {
        backgroundColor: '#F44336',
    },
    cancelButton: {
        backgroundColor: 'transparent',
        borderWidth: 1,
        borderColor: '#DDD',
    },
    buttonText: {
        fontWeight: 'bold',
        fontSize: FONT_SIZES.md,
        color: COLORS.primary,
    },
});
