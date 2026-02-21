import React, { useState, useEffect } from 'react';
import {
    View as RNView,
    Text as RNText,
    StyleSheet,
    Modal as RNModal,
    TouchableOpacity as RNRTouchableOpacity,
    FlatList as RNFlatList,
    Alert,
    TextInput as RNTextInput,
    KeyboardAvoidingView as RNKeyboardAvoidingView,
    Platform,
    ActivityIndicator as RNActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SPACING, FONT_SIZES, BORDER_RADIUS, LIGHT_COLORS, DARK_COLORS } from '../constants/theme';
import { useGeneralSettings } from '../store/GeneralSettingsContext';
import PrimaryButton from '../components/PrimaryButton';
import {
    getPurchaseCategories,
    getPurchaseSubCategories,
    addPurchaseCategory,
    deletePurchaseCategory,
    addPurchaseSubCategory,
    deletePurchaseSubCategory,
    DBPurchaseCategory,
    DBPurchaseSubCategory
} from '../services/dbService';

// Fix for React 19 type mismatch
const View = RNView as any;
const Text = RNText as any;
const TouchableOpacity = RNRTouchableOpacity as any;
const Icon = Ionicons as any;
const Modal = RNModal as any;
const TextInput = RNTextInput as any;
const ActivityIndicator = RNActivityIndicator as any;
const KeyboardAvoidingView = RNKeyboardAvoidingView as any;
const FlatList = RNFlatList as any;

interface CategoryManagementModalProps {
    visible: boolean;
    onClose: () => void;
}

export default function CategoryManagementModal({ visible, onClose }: CategoryManagementModalProps) {
    const { theme, t } = useGeneralSettings();
    const activeColors = theme === 'light' ? LIGHT_COLORS : DARK_COLORS;

    const [categories, setCategories] = useState<DBPurchaseCategory[]>([]);
    const [selectedCategory, setSelectedCategory] = useState<DBPurchaseCategory | null>(null);
    const [subCategories, setSubCategories] = useState<DBPurchaseSubCategory[]>([]);
    const [newCategoryName, setNewCategoryName] = useState('');
    const [newSubCategoryName, setNewSubCategoryName] = useState('');
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (visible) {
            loadCategories();
        }
    }, [visible]);

    useEffect(() => {
        if (selectedCategory) {
            loadSubCategories(selectedCategory.id);
        } else {
            setSubCategories([]);
        }
    }, [selectedCategory]);

    const loadCategories = async () => {
        setLoading(true);
        try {
            const cats = await getPurchaseCategories();
            setCategories(cats);
            if (cats.length > 0 && !selectedCategory) {
                setSelectedCategory(cats[0]);
            }
        } catch (error) {
            console.error('Error loading categories:', error);
        } finally {
            setLoading(false);
        }
    };

    const loadSubCategories = async (catId: number) => {
        try {
            const subs = await getPurchaseSubCategories(catId);
            setSubCategories(subs);
        } catch (error) {
            console.error('Error loading sub-categories:', error);
        }
    };

    const handleAddCategory = async () => {
        if (!newCategoryName.trim()) return;
        try {
            await addPurchaseCategory(newCategoryName.trim());
            setNewCategoryName('');
            loadCategories();
        } catch (error) {
            Alert.alert(t('error'), t('add_failed') || 'Failed to add category. It might already exist.');
        }
    };

    const handleDeleteCategory = (cat: DBPurchaseCategory) => {
        Alert.alert(
            t('confirm_delete'),
            t('confirm_delete_msg', { name: cat.name }) || `Are you sure you want to delete "${cat.name}" and all its sub-categories?`,
            [
                { text: t('cancel'), style: 'cancel' },
                {
                    text: t('delete'),
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            await deletePurchaseCategory(cat.id);
                            if (selectedCategory?.id === cat.id) {
                                setSelectedCategory(null);
                            }
                            loadCategories();
                        } catch (error) {
                            Alert.alert(t('error'), t('delete_failed') || 'Failed to delete category.');
                        }
                    }
                }
            ]
        );
    };

    const handleAddSubCategory = async () => {
        if (!selectedCategory || !newSubCategoryName.trim()) return;
        try {
            await addPurchaseSubCategory(selectedCategory.id, newSubCategoryName.trim());
            setNewSubCategoryName('');
            loadSubCategories(selectedCategory.id);
        } catch (error) {
            Alert.alert(t('error'), t('add_failed') || 'Failed to add sub-category.');
        }
    };

    const handleDeleteSubCategory = async (subId: number) => {
        try {
            await deletePurchaseSubCategory(subId);
            if (selectedCategory) {
                loadSubCategories(selectedCategory.id);
            }
        } catch (error) {
            Alert.alert(t('error'), t('delete_failed') || 'Failed to delete sub-category.');
        }
    };

    return (
        <Modal visible={visible} animationType="slide" transparent>
            <View style={styles.modalOverlay}>
                <KeyboardAvoidingView
                    behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                    style={[styles.modalContent, { backgroundColor: activeColors.cardBg }]}
                >
                    <View style={styles.header}>
                        <Text style={[styles.title, { color: activeColors.text }]}>{t('manage_purchase_categories')}</Text>
                        <TouchableOpacity onPress={onClose}>
                            <Icon name="close" size={24} color={activeColors.text} />
                        </TouchableOpacity>
                    </View>

                    <View style={styles.body}>
                        {/* Categories Section */}
                        <View style={styles.section}>
                            <Text style={[styles.sectionTitle, { color: activeColors.textLight }]}>{t('categories')}</Text>
                            <View style={styles.inputRow}>
                                <TextInput
                                    style={[styles.input, { color: activeColors.text, borderColor: activeColors.border }]}
                                    placeholder={t('new_category')}
                                    placeholderTextColor={activeColors.textLight}
                                    value={newCategoryName}
                                    onChangeText={setNewCategoryName}
                                />
                                <TouchableOpacity style={[styles.addButton, { backgroundColor: COLORS.primary }]} onPress={handleAddCategory}>
                                    <Icon name="add" size={24} color={COLORS.white} />
                                </TouchableOpacity>
                            </View>

                            <FlatList
                                data={categories}
                                horizontal
                                showsHorizontalScrollIndicator={false}
                                keyExtractor={(item: any) => item.id.toString()}
                                style={styles.catList}
                                renderItem={({ item }: any) => (
                                    <View style={styles.catItemContainer}>
                                        <TouchableOpacity
                                            style={[
                                                styles.catItem,
                                                { borderColor: activeColors.border },
                                                selectedCategory?.id === item.id && { backgroundColor: COLORS.primary, borderColor: COLORS.primary }
                                            ]}
                                            onPress={() => setSelectedCategory(item)}
                                        >
                                            <Text style={[
                                                styles.catText,
                                                { color: activeColors.text },
                                                selectedCategory?.id === item.id && { color: COLORS.white }
                                            ]}>
                                                {item.name}
                                            </Text>
                                        </TouchableOpacity>
                                        <TouchableOpacity
                                            style={styles.deleteIconSmall}
                                            onPress={() => handleDeleteCategory(item)}
                                        >
                                            <Icon name="close-circle" size={16} color={activeColors.error} />
                                        </TouchableOpacity>
                                    </View>
                                )}
                            />
                        </View>

                        {/* Sub-Categories Section */}
                        {selectedCategory && (
                            <View style={styles.section}>
                                <Text style={[styles.sectionTitle, { color: activeColors.textLight }]}>
                                    {t('sub_categories_for')} {selectedCategory.name}
                                </Text>
                                <View style={styles.inputRow}>
                                    <TextInput
                                        style={[styles.input, { color: activeColors.text, borderColor: activeColors.border }]}
                                        placeholder={t('new_sub_category')}
                                        placeholderTextColor={activeColors.textLight}
                                        value={newSubCategoryName}
                                        onChangeText={setNewSubCategoryName}
                                    />
                                    <TouchableOpacity style={[styles.addButton, { backgroundColor: COLORS.success }]} onPress={handleAddSubCategory}>
                                        <Icon name="add" size={24} color={COLORS.white} />
                                    </TouchableOpacity>
                                </View>

                                {loading ? (
                                    <ActivityIndicator size="large" color={COLORS.primary} />
                                ) : (
                                    <FlatList
                                        data={subCategories}
                                        keyExtractor={(item: any) => item.id.toString()}
                                        renderItem={({ item }: { item: DBPurchaseSubCategory }) => (
                                            <View style={[styles.subCatItem, { borderBottomColor: activeColors.border }]}>
                                                <Text style={[styles.subCatText, { color: activeColors.text }]}>{item.name}</Text>
                                                <TouchableOpacity onPress={() => handleDeleteSubCategory(item.id)}>
                                                    <Icon name="trash-outline" size={20} color={activeColors.error} />
                                                </TouchableOpacity>
                                            </View>
                                        )}
                                        ListEmptyComponent={
                                            <Text style={[styles.emptyText, { color: activeColors.textLight }]}>{t('no_sub_categories')}</Text>
                                        }
                                    />
                                )}
                            </View>
                        )}
                    </View>

                    <PrimaryButton title={t('done')} onPress={onClose} style={styles.doneButton} />
                </KeyboardAvoidingView>
            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'flex-end',
    },
    modalContent: {
        borderTopLeftRadius: BORDER_RADIUS.lg,
        borderTopRightRadius: BORDER_RADIUS.lg,
        padding: SPACING.lg,
        height: '80%',
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
    body: {
        flex: 1,
    },
    section: {
        marginBottom: SPACING.xl,
    },
    sectionTitle: {
        fontSize: FONT_SIZES.sm,
        fontWeight: 'bold',
        marginBottom: SPACING.sm,
        textTransform: 'uppercase',
    },
    inputRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: SPACING.md,
    },
    input: {
        flex: 1,
        height: 45,
        borderWidth: 1,
        borderRadius: BORDER_RADIUS.md,
        paddingHorizontal: SPACING.md,
        marginRight: SPACING.sm,
    },
    addButton: {
        width: 45,
        height: 45,
        borderRadius: BORDER_RADIUS.md,
        justifyContent: 'center',
        alignItems: 'center',
    },
    catList: {
        paddingVertical: SPACING.xs,
    },
    catItemContainer: {
        marginRight: SPACING.md,
        paddingTop: 8,
    },
    catItem: {
        paddingHorizontal: SPACING.md,
        paddingVertical: SPACING.sm,
        borderRadius: 999,
        borderWidth: 1,
    },
    catText: {
        fontSize: FONT_SIZES.sm,
        fontWeight: '600',
    },
    deleteIconSmall: {
        position: 'absolute',
        top: 0,
        right: -4,
        zIndex: 1,
    },
    subCatItem: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: SPACING.md,
        borderBottomWidth: 1,
    },
    subCatText: {
        fontSize: FONT_SIZES.md,
    },
    emptyText: {
        textAlign: 'center',
        marginTop: SPACING.lg,
        fontStyle: 'italic',
    },
    doneButton: {
        marginTop: SPACING.md,
    },
});
