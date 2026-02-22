import React, { useState, useEffect } from 'react';
import { View as RNView, Text as RNText, StyleSheet, ScrollView as RNScrollView, TouchableOpacity as RNRTouchableOpacity, Alert, Modal as RNModal, KeyboardAvoidingView as RNKeyboardAvoidingView, Platform, TouchableWithoutFeedback as RNRTouchableWithoutFeedback, Keyboard } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import ScreenContainer from '../../components/ScreenContainer';
import HeaderBar from '../../components/HeaderBar';
import InputField from '../../components/InputField';
import DropdownField from '../../components/DropdownField';
import PrimaryButton from '../../components/PrimaryButton';
import { COLORS, SPACING, FONT_SIZES, BORDER_RADIUS, LIGHT_COLORS, DARK_COLORS } from '../../constants/theme';
import { useGeneralSettings } from '../../store/GeneralSettingsContext';
import { getMetalTypes, addMetalType, updateMetalType, deleteMetalType, DBMetalType } from '../../services/dbService';

const View = RNView as any;
const Text = RNText as any;
const ScrollView = RNScrollView as any;
const TouchableOpacity = RNRTouchableOpacity as any;
const Icon = Ionicons as any;
const Modal = RNModal as any;
const KeyboardAvoidingView = RNKeyboardAvoidingView as any;
const TouchableWithoutFeedback = RNRTouchableWithoutFeedback as any;

export default function ManageGoldScreen() {
    const router = useRouter();
    const { theme, t } = useGeneralSettings();
    const activeColors = theme === 'light' ? LIGHT_COLORS : DARK_COLORS;

    const [metalTypes, setMetalTypes] = useState<DBMetalType[]>([]);
    const [isModalVisible, setIsModalVisible] = useState(false);
    const [editingMetal, setEditingMetal] = useState<DBMetalType | null>(null);

    // Form State
    const [name, setName] = useState('');
    const [purity, setPurity] = useState('');
    const [metal, setMetal] = useState<'GOLD' | 'SILVER'>('GOLD');

    useEffect(() => {
        loadMetalTypes();
    }, []);

    const loadMetalTypes = async () => {
        const types = await getMetalTypes();
        setMetalTypes(types);
    };

    const handleSave = async () => {
        if (!name || !purity) {
            Alert.alert('Error', 'Please fill all fields');
            return;
        }

        const purityVal = parseFloat(purity);
        if (isNaN(purityVal)) {
            Alert.alert('Error', 'Invalid purity value');
            return;
        }

        try {
            if (editingMetal) {
                await updateMetalType({
                    ...editingMetal,
                    name,
                    purity: purityVal,
                    metal
                });
            } else {
                await addMetalType(name, purityVal, metal);
            }
            setIsModalVisible(false);
            resetForm();
            loadMetalTypes();
        } catch (error) {
            Alert.alert('Error', 'Failed to save metal type. Name might be duplicate.');
        }
    };

    const handleDelete = (id: number) => {
        Alert.alert(
            'Confirm Delete',
            'Are you sure you want to delete this metal type?',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Delete',
                    style: 'destructive',
                    onPress: async () => {
                        await deleteMetalType(id);
                        loadMetalTypes();
                    }
                }
            ]
        );
    };

    const resetForm = () => {
        setName('');
        setPurity('');
        setMetal('GOLD');
        setEditingMetal(null);
    };

    const openEditModal = (item: DBMetalType) => {
        setEditingMetal(item);
        setName(item.name);
        setPurity(item.purity.toString());
        setMetal(item.metal);
        setIsModalVisible(true);
    };

    return (
        <ScreenContainer backgroundColor={activeColors.background}>
            <HeaderBar title="Manage Gold & Silver" showBack />

            <View style={styles.content}>
                <View style={styles.header}>
                    <Text style={[styles.title, { color: activeColors.text }]}>Metal Types</Text>
                    <TouchableOpacity
                        style={[styles.addButton, { backgroundColor: activeColors.primary }]}
                        onPress={() => {
                            resetForm();
                            setIsModalVisible(true);
                        }}
                    >
                        <Icon name="add" size={24} color={COLORS.white} />
                        <Text style={styles.addButtonText}>Add New</Text>
                    </TouchableOpacity>
                </View>

                <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 100 }}>
                    {metalTypes.map((item) => (
                        <View key={item.id} style={[styles.card, { backgroundColor: activeColors.cardBg, borderColor: activeColors.border }]}>
                            <View style={styles.cardInfo}>
                                <View style={styles.typeBadgeContainer}>
                                    <View style={[styles.typeBadge, { backgroundColor: item.metal === 'GOLD' ? '#FFD70020' : '#C0C0C020' }]}>
                                        <Text style={[styles.typeBadgeText, { color: item.metal === 'GOLD' ? '#B8860B' : '#708090' }]}>
                                            {item.metal}
                                        </Text>
                                    </View>
                                </View>
                                <Text style={[styles.cardName, { color: activeColors.text }]}>{item.name}</Text>
                                <Text style={[styles.cardPurity, { color: activeColors.textLight }]}>
                                    Purity: {item.purity}{item.metal === 'GOLD' ? 'K' : '%'}
                                </Text>
                            </View>
                            <View style={styles.cardActions}>
                                <TouchableOpacity onPress={() => openEditModal(item)} style={styles.actionBtn}>
                                    <Icon name="pencil-outline" size={20} color={activeColors.primary} />
                                </TouchableOpacity>
                                <TouchableOpacity onPress={() => handleDelete(item.id)} style={styles.actionBtn}>
                                    <Icon name="trash-outline" size={20} color={activeColors.error} />
                                </TouchableOpacity>
                            </View>
                        </View>
                    ))}
                    {metalTypes.length === 0 && (
                        <View style={styles.emptyContainer}>
                            <Text style={[styles.emptyText, { color: activeColors.textLight }]}>No custom metal types added.</Text>
                        </View>
                    )}
                </ScrollView>
            </View>

            <Modal
                visible={isModalVisible}
                animationType="fade"
                transparent={true}
                onRequestClose={() => setIsModalVisible(false)}
            >
                <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
                    <View style={styles.modalOverlay}>
                        <KeyboardAvoidingView
                            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                            style={styles.keyboardView}
                        >
                            <TouchableWithoutFeedback onPress={(e: any) => e.stopPropagation?.()}>
                                <View style={[styles.modalContent, { backgroundColor: activeColors.cardBg }]}>
                                    <View style={styles.modalHeader}>
                                        <Text style={[styles.modalTitle, { color: activeColors.text }]}>
                                            {editingMetal ? 'Edit Metal Type' : 'Add Metal Type'}
                                        </Text>
                                        <TouchableOpacity onPress={() => setIsModalVisible(false)}>
                                            <Icon name="close" size={24} color={activeColors.text} />
                                        </TouchableOpacity>
                                    </View>

                                    <ScrollView showsVerticalScrollIndicator={false}>
                                        <DropdownField
                                            label="Metal Category"
                                            value={metal}
                                            onSelect={(val) => setMetal(val as any)}
                                            options={[
                                                { label: 'Gold', value: 'GOLD' },
                                                { label: 'Silver', value: 'SILVER' },
                                            ]}
                                        />
                                        <InputField
                                            label="Name (e.g. 22K KDM)"
                                            value={name}
                                            onChangeText={setName}
                                            placeholder="Enter display name"
                                        />
                                        <InputField
                                            label={metal === 'GOLD' ? "Purity (Karat)" : "Purity (%)"}
                                            value={purity}
                                            onChangeText={setPurity}
                                            placeholder={metal === 'GOLD' ? "e.g. 22" : "e.g. 92.5"}
                                            keyboardType="numeric"
                                        />

                                        <PrimaryButton
                                            title={editingMetal ? t('save') : "Add Type"}
                                            onPress={handleSave}
                                            style={{ marginTop: SPACING.lg }}
                                        />
                                    </ScrollView>
                                </View>
                            </TouchableWithoutFeedback>
                        </KeyboardAvoidingView>
                    </View>
                </TouchableWithoutFeedback>
            </Modal>
        </ScreenContainer>
    );
}

const styles = StyleSheet.create({
    content: {
        flex: 1,
        padding: SPACING.md,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: SPACING.lg,
    },
    title: {
        fontSize: FONT_SIZES.lg,
        fontWeight: 'bold',
    },
    addButton: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: SPACING.md,
        paddingVertical: SPACING.sm,
        borderRadius: BORDER_RADIUS.md,
    },
    addButtonText: {
        color: COLORS.white,
        fontWeight: 'bold',
        marginLeft: SPACING.xs,
    },
    card: {
        flexDirection: 'row',
        padding: SPACING.md,
        borderRadius: BORDER_RADIUS.md,
        marginBottom: SPACING.sm,
        borderWidth: 1,
        alignItems: 'center',
    },
    cardInfo: {
        flex: 1,
    },
    cardName: {
        fontSize: FONT_SIZES.md,
        fontWeight: 'bold',
    },
    cardPurity: {
        fontSize: FONT_SIZES.sm,
        marginTop: 2,
    },
    typeBadgeContainer: {
        marginBottom: 4,
    },
    typeBadge: {
        alignSelf: 'flex-start',
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: 10,
    },
    typeBadgeText: {
        fontSize: 10,
        fontWeight: 'bold',
    },
    cardActions: {
        flexDirection: 'row',
    },
    actionBtn: {
        padding: SPACING.sm,
        marginLeft: SPACING.xs,
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: SPACING.lg,
    },
    keyboardView: {
        width: '100%',
        alignItems: 'center',
    },
    modalContent: {
        width: '100%',
        borderRadius: BORDER_RADIUS.lg,
        padding: SPACING.lg,
        maxHeight: 'auto',
        shadowColor: "#000",
        shadowOffset: {
            width: 0,
            height: 2,
        },
        shadowOpacity: 0.25,
        shadowRadius: 3.84,
        elevation: 5,
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: SPACING.xl,
    },
    modalTitle: {
        fontSize: FONT_SIZES.lg,
        fontWeight: 'bold',
    },
    emptyContainer: {
        padding: 40,
        alignItems: 'center',
    },
    emptyText: {
        fontStyle: 'italic',
    }
});
