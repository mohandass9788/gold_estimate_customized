import React, { useState, useRef, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, Modal, FlatList, KeyboardAvoidingView, Platform, ActivityIndicator, Animated } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SPACING, FONT_SIZES, BORDER_RADIUS, LIGHT_COLORS, DARK_COLORS } from '../constants/theme';
import { useGeneralSettings } from '../store/GeneralSettingsContext';
import { useRouter } from 'expo-router';
import { useActivation } from '../store/ActivationContext';
import apiClient from '../services/apiClient';
import { requestCall } from '../services/authService';

interface Message {
    id: string;
    text: string;
    sender: 'ai' | 'user';
}

interface AIChatBoxProps {
    isExternalOpen?: boolean;
    onExternalClose?: () => void;
}

export default function AIChatBox({ isExternalOpen, onExternalClose }: AIChatBoxProps) {
    const router = useRouter();
    const { theme, t } = useGeneralSettings();
    const { activate } = useActivation();
    const isDark = theme === 'dark';
    const activeColors = {
        bg: isDark ? DARK_COLORS.cardBg : LIGHT_COLORS.cardBg,
        text: isDark ? DARK_COLORS.text : LIGHT_COLORS.text,
        textLight: isDark ? DARK_COLORS.textLight : LIGHT_COLORS.textLight,
        aiBubble: isDark ? '#2C2C2E' : '#E9E9EB',
        userBubble: isDark ? DARK_COLORS.primary : LIGHT_COLORS.primary,
        userText: '#FFFFFF',
    };

    const [isOpen, setIsOpen] = useState(false);
    const [messages, setMessages] = useState<Message[]>([
        { id: '1', text: t('chatbot_welcome') || 'Welcome to Gold Estimation! 👋', sender: 'ai' },
        { id: '2', text: t('chatbot_ask_name') || 'Could I please have your name?', sender: 'ai' }
    ]);
    const [inputText, setInputText] = useState('');
    const [step, setStep] = useState<'name' | 'phone' | 'done'>('name');
    const [userData, setUserData] = useState({ name: '', phone: '' });
    const [isTyping, setIsTyping] = useState(false);

    const flatListRef = useRef<FlatList>(null);
    const fabScale = useRef(new Animated.Value(1)).current;

    const animateFab = (toValue: number) => {
        Animated.spring(fabScale, {
            toValue,
            useNativeDriver: true,
            friction: 4,
        }).start();
    };

    useEffect(() => {
        if (isExternalOpen !== undefined) {
            setIsOpen(isExternalOpen);
        }
    }, [isExternalOpen]);

    useEffect(() => {
        if (isOpen) {
            // Scroll to bottom when opened
            setTimeout(() => {
                flatListRef.current?.scrollToEnd({ animated: true });
            }, 100);
        }
    }, [isOpen]);

    const handleClose = () => {
        setIsOpen(false);
        if (onExternalClose) onExternalClose();
    };

    const handleSend = () => {
        if (!inputText.trim()) return;

        const userMsg: Message = { id: Date.now().toString(), text: inputText.trim(), sender: 'user' };
        setMessages(prev => [...prev, userMsg]);
        setInputText('');
        setIsTyping(true);

        setTimeout(() => {
            if (step === 'name') {
                setUserData(prev => ({ ...prev, name: userMsg.text }));
                setMessages(prev => [...prev, { 
                    id: Date.now().toString(), 
                    text: t('chatbot_thanks_name', { name: userMsg.text }) || `Thanks, ${userMsg.text}! What's your mobile number so our team can reach you?`, 
                    sender: 'ai' 
                }]);
                setStep('phone');
                setIsTyping(false);
            } else if (step === 'phone') {
                setUserData(prev => ({ ...prev, phone: userMsg.text }));
                // Trigger API call mock
                submitLead(userData.name || '', userMsg.text);
            }
        }, 1000);
    };

    const submitLead = async (name: string, phone: string) => {
        try {
            await requestCall({
                name,
                phone,
                source: 'app_activation_chat'
            });
        } catch (error) {
            console.error('Failed to submit lead:', error);
            // We still proceed to demo even if API fails to not block user
        }

        setMessages(prev => [...prev, {
            id: Date.now().toString(),
            text: t('chatbot_submission_success', { phone }) || `Perfect! Your call request has been submitted. Our team will reach you shortly on ${phone}.\n\nStarting your 1-day demo now...`,
            sender: 'ai'
        }]);
        setStep('done');
        setIsTyping(false);

        // Auto-start demo after 2 seconds
        setTimeout(async () => {
            handleClose();
            const success = await activate('DEMO');
            if (success) {
                (router as any).replace('/register');
            }
        }, 2500);
    };

    const renderMessage = ({ item }: { item: Message }) => {
        const isAI = item.sender === 'ai';
        return (
            <View style={[styles.messageWrapper, isAI ? styles.messageWrapperAI : styles.messageWrapperUser]}>
                {isAI && (
                    <View style={[styles.avatar, { backgroundColor: COLORS.primary + '20' }]}>
                        <Ionicons name="hardware-chip-outline" size={16} color={COLORS.primary} />
                    </View>
                )}
                <View style={[
                    styles.messageBubble,
                    isAI ? [styles.aiBubble, { backgroundColor: activeColors.aiBubble }] : [styles.userBubble, { backgroundColor: activeColors.userBubble }]
                ]}>
                    <Text style={[styles.messageText, { color: isAI ? activeColors.text : activeColors.userText }]}>
                        {item.text}
                    </Text>
                </View>
            </View>
        );
    };

    return (
        <View style={styles.container}>
            <Animated.View style={{ transform: [{ scale: fabScale }] }}>
                <TouchableOpacity
                    style={[styles.fabButton, { backgroundColor: COLORS.primary, shadowColor: isDark ? '#000' : '#888' }]}
                    onPress={() => {
                        animateFab(0.8);
                        setTimeout(() => {
                            animateFab(1);
                            setIsOpen(true);
                        }, 100);
                    }}
                    activeOpacity={0.8}
                >
                    <Ionicons name="chatbubbles-outline" size={28} color="#FFF" />
                </TouchableOpacity>
            </Animated.View>

            <Modal visible={isOpen} animationType="slide" transparent statusBarTranslucent>
                <KeyboardAvoidingView
                    behavior={Platform.OS === 'ios' ? 'padding' : 'padding'}
                    style={styles.modalKeyboardAvoiding}
                >
                    <TouchableOpacity
                        style={styles.modalContainer}
                        activeOpacity={1}
                        onPress={handleClose}
                    >
                        <View
                            style={[styles.modalContent, { backgroundColor: activeColors.bg }]}
                            onStartShouldSetResponder={() => true}
                        >
                            {/* Header */}
                            <View style={[styles.modalHeader, { borderBottomColor: isDark ? '#333' : '#EEE' }]}>
                                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                                    <View style={[styles.avatar, { backgroundColor: COLORS.primary + '20', marginRight: SPACING.sm }]}>
                                        <Ionicons name="hardware-chip" size={20} color={COLORS.primary} />
                                    </View>
                                    <Text style={{ fontSize: FONT_SIZES.md, fontWeight: 'bold', color: activeColors.text }}>{t('chatbot_name') || 'Nexoo AI Assistant'}</Text>
                                </View>
                                <TouchableOpacity onPress={handleClose} style={{ padding: SPACING.xs }}>
                                    <Ionicons name="close" size={24} color={activeColors.textLight} />
                                </TouchableOpacity>
                            </View>

                            {/* Chat Area */}
                            <FlatList
                                ref={flatListRef}
                                data={messages}
                                keyExtractor={(item) => item.id}
                                renderItem={renderMessage}
                                contentContainerStyle={styles.chatList}
                                onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
                            />

                            {isTyping && (
                                <View style={[styles.messageWrapper, styles.messageWrapperAI, { paddingHorizontal: SPACING.md, marginBottom: SPACING.md }]}>
                                    <View style={[styles.avatar, { backgroundColor: COLORS.primary + '20' }]}>
                                        <Ionicons name="hardware-chip-outline" size={16} color={COLORS.primary} />
                                    </View>
                                    <View style={[styles.messageBubble, styles.aiBubble, { backgroundColor: activeColors.aiBubble, paddingVertical: 12 }]}>
                                        <ActivityIndicator size="small" color={COLORS.primary} />
                                    </View>
                                </View>
                            )}

                            {/* Input Area */}
                            {step !== 'done' && (
                                <View style={[styles.inputArea, { borderTopColor: isDark ? '#333' : '#EEE', backgroundColor: activeColors.bg }]}>
                                    <TextInput
                                        style={[styles.textInput, { color: activeColors.text, backgroundColor: isDark ? '#1C1C1E' : '#F2F2F7' }]}
                                        placeholder={step === 'name' ? (t('chatbot_placeholder_name') || "Type your name...") : (t('chatbot_placeholder_phone') || "Type your mobile number...")}
                                        placeholderTextColor={activeColors.textLight}
                                        value={inputText}
                                        onChangeText={setInputText}
                                        keyboardType={step === 'phone' ? 'phone-pad' : 'default'}
                                        returnKeyType="send"
                                        onSubmitEditing={handleSend}
                                    />
                                    <TouchableOpacity
                                        style={[styles.sendButton, { opacity: inputText.trim() ? 1 : 0.5 }]}
                                        onPress={handleSend}
                                        disabled={!inputText.trim()}
                                    >
                                        <Ionicons name="send" size={18} color="#FFF" />
                                    </TouchableOpacity>
                                </View>
                            )}
                        </View>
                    </TouchableOpacity>
                </KeyboardAvoidingView>
            </Modal>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        position: 'absolute',
        bottom: 30,
        right: 25,
        zIndex: 1000,
    },
    fabButton: {
        width: 60,
        height: 60,
        borderRadius: 30,
        justifyContent: 'center',
        alignItems: 'center',
        elevation: 8,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 6,
    },
    avatar: {
        width: 32,
        height: 32,
        borderRadius: 16,
        justifyContent: 'center',
        alignItems: 'center',
    },
    modalKeyboardAvoiding: {
        flex: 1,
    },
    modalContainer: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'flex-end',
    },
    modalContent: {
        maxHeight: '85%',
        borderTopLeftRadius: BORDER_RADIUS.xl,
        borderTopRightRadius: BORDER_RADIUS.xl,
        overflow: 'hidden',
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: SPACING.md,
        borderBottomWidth: 1,
    },
    chatList: {
        padding: SPACING.md,
        paddingBottom: SPACING.xl,
    },
    messageWrapper: {
        flexDirection: 'row',
        marginBottom: SPACING.md,
        alignItems: 'flex-end',
    },
    messageWrapperAI: {
        justifyContent: 'flex-start',
        paddingRight: '20%',
    },
    messageWrapperUser: {
        justifyContent: 'flex-end',
        paddingLeft: '20%',
    },
    messageBubble: {
        paddingHorizontal: SPACING.md,
        paddingVertical: SPACING.sm,
        maxWidth: '100%',
    },
    aiBubble: {
        borderTopLeftRadius: BORDER_RADIUS.lg,
        borderTopRightRadius: BORDER_RADIUS.lg,
        borderBottomRightRadius: BORDER_RADIUS.lg,
        borderBottomLeftRadius: 4,
        marginLeft: SPACING.xs,
    },
    userBubble: {
        borderTopLeftRadius: BORDER_RADIUS.lg,
        borderTopRightRadius: BORDER_RADIUS.lg,
        borderBottomLeftRadius: BORDER_RADIUS.lg,
        borderBottomRightRadius: 4,
    },
    messageText: {
        fontSize: FONT_SIZES.md,
        lineHeight: 20,
    },
    inputArea: {
        flexDirection: 'row',
        padding: SPACING.sm,
        paddingBottom: Platform.OS === 'ios' ? 30 : SPACING.sm,
        borderTopWidth: 1,
        alignItems: 'center',
    },
    textInput: {
        flex: 1,
        minHeight: 40,
        maxHeight: 100,
        borderRadius: 20,
        paddingHorizontal: SPACING.md,
        paddingVertical: SPACING.xs,
        fontSize: FONT_SIZES.md,
        marginRight: SPACING.sm,
    },
    sendButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: COLORS.primary,
        justifyContent: 'center',
        alignItems: 'center',
    }
});
