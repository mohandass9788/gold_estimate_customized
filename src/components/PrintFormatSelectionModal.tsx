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

interface PrintFormatSelectionModalProps {
    visible: boolean;
    onClose: () => void;
    onSelectMerged: () => void;
    onSelectSeparate: () => void;
    theme: 'light' | 'dark';
    t?: (key: string) => string;
}

const { width } = Dimensions.get('window');

export default function PrintFormatSelectionModal({
    visible,
    onClose,
    onSelectMerged,
    onSelectSeparate,
    theme,
    t
}: PrintFormatSelectionModalProps) {
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
                    <TouchableOpacity 
                        style={styles.closeButtonAbsolute} 
                        onPress={onClose}
                        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                    >
                        <Ionicons name="close" size={28} color={subTextColor} />
                    </TouchableOpacity>

                    <View style={styles.header}>
                        <Ionicons name="print" size={50} color={COLORS.primary} />
                        <Text style={[styles.title, { color: textColor }]}>
                            {t ? t('print') : 'Print'}
                        </Text>
                        <Text style={[styles.subtitle, { color: subTextColor }]}>
                            Choose print format:
                        </Text>
                    </View>

                    <View style={styles.body}>
                        <TouchableOpacity
                            style={styles.largeButton}
                            onPress={() => {
                                onClose();
                                setTimeout(() => onSelectMerged(), 100);
                            }}
                        >
                            <View style={styles.buttonIconContainer}>
                                <Ionicons name="document-text" size={32} color={COLORS.primary} />
                            </View>
                            <View style={styles.buttonTextContainer}>
                                <Text style={styles.buttonTitle}>
                                    {t ? t('merged_receipt') : 'Single Receipt (Merged)'}
                                </Text>
                            </View>
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={styles.largeButton}
                            onPress={() => {
                                onClose();
                                setTimeout(() => onSelectSeparate(), 100);
                            }}
                        >
                            <View style={[styles.buttonIconContainer, { backgroundColor: COLORS.warning + '20' }]}>
                                <Ionicons name="documents" size={32} color={COLORS.warning} />
                            </View>
                            <View style={styles.buttonTextContainer}>
                                <Text style={[styles.buttonTitle, { color: COLORS.warning }]}>
                                    {t ? t('separate_receipts') : 'Separate Receipts'}
                                </Text>
                            </View>
                        </TouchableOpacity>
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
        width: Math.min(width * 0.9, 450),
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
        marginBottom: SPACING.xl,
    },
    title: {
        fontSize: FONT_SIZES.xl,
        fontWeight: 'bold',
        marginTop: SPACING.sm,
        textAlign: 'center',
    },
    subtitle: {
        fontSize: FONT_SIZES.md,
        marginTop: SPACING.xs,
        textAlign: 'center',
    },
    body: {
        width: '100%',
        gap: SPACING.md,
    },
    largeButton: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: COLORS.primary + '10',
        padding: SPACING.lg,
        borderRadius: BORDER_RADIUS.lg,
        borderWidth: 1,
        borderColor: COLORS.primary + '30',
    },
    buttonIconContainer: {
        width: 60,
        height: 60,
        borderRadius: BORDER_RADIUS.md,
        backgroundColor: COLORS.primary + '20',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: SPACING.md,
    },
    buttonTextContainer: {
        flex: 1,
        justifyContent: 'center',
    },
    buttonTitle: {
        fontSize: FONT_SIZES.lg,
        fontWeight: 'bold',
        color: COLORS.primary,
    },
    closeButtonAbsolute: {
        position: 'absolute',
        top: 15,
        right: 15,
        zIndex: 10,
    },
});
