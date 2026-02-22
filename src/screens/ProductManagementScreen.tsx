import React, { useState, useEffect } from 'react';
import {
    View as RNView,
    Text as RNText,
    StyleSheet,
    ScrollView as RNScrollView,
    TouchableOpacity as RNRTouchableOpacity,
    TextInput as RNTextInput,
    Alert,
    Modal as RNModal,
    KeyboardAvoidingView as RNKeyboardAvoidingView,
    Platform,
    TouchableWithoutFeedback as RNTouchableWithoutFeedback,
    Keyboard,
    Dimensions,
    ActivityIndicator,
    Share
} from 'react-native';
import * as XLSX from 'xlsx';
import * as FileSystem from 'expo-file-system/legacy';
import { Ionicons } from '@expo/vector-icons';
import * as Sharing from 'expo-sharing';
import ScreenContainer from '../components/ScreenContainer';
import HeaderBar from '../components/HeaderBar';
import PrimaryButton from '../components/PrimaryButton';
import InputField from '../components/InputField';
import DropdownField from '../components/DropdownField';
import { COLORS, SPACING, FONT_SIZES, BORDER_RADIUS } from '../constants/theme';
import { useGeneralSettings } from '../store/GeneralSettingsContext';
import {
    getProducts,
    getSubProducts,
    addProduct,
    deleteProduct,
    addSubProduct,
    deleteSubProduct,
    updateProduct,
    ensureProduct,
    ensureSubProduct,
    DBProduct,
    DBSubProduct
} from '../services/dbService';

const View = RNView as any;
const Text = RNText as any;
const ScrollView = RNScrollView as any;
const TouchableOpacity = RNRTouchableOpacity as any;
const TextInput = RNTextInput as any;
const Modal = RNModal as any;
const KeyboardAvoidingView = RNKeyboardAvoidingView as any;
const TouchableWithoutFeedback = RNTouchableWithoutFeedback as any;
const Icon = Ionicons as any;

const { width } = Dimensions.get('window');

export default function ProductManagementScreen() {
    const { t } = useGeneralSettings();
    const [products, setProducts] = useState<DBProduct[]>([]);
    const [selectedProduct, setSelectedProduct] = useState<DBProduct | null>(null);
    const [subProducts, setSubProducts] = useState<DBSubProduct[]>([]);

    // Form States
    const [showAddModal, setShowAddModal] = useState(false);
    const [showEditModal, setShowEditModal] = useState(false);
    const [modalMode, setModalMode] = useState<'PRODUCT' | 'SUB_PRODUCT'>('PRODUCT');

    const [newProductName, setNewProductName] = useState('');
    const [newSubProductName, setNewSubProductName] = useState('');

    // Default Settings for Product
    const [newProductMetal, setNewProductMetal] = useState<'GOLD' | 'SILVER'>('GOLD');
    const [defaultPurity, setDefaultPurity] = useState('22');
    const [defaultWastage, setDefaultWastage] = useState('0');
    const [defaultWastageType, setDefaultWastageType] = useState('percentage');
    const [defaultMakingCharge, setDefaultMakingCharge] = useState('0');
    const [defaultMakingChargeType, setDefaultMakingChargeType] = useState('perGram');
    const [hsnCode, setHsnCode] = useState('');
    const [isImporting, setIsImporting] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [showSearch, setShowSearch] = useState(true);

    useEffect(() => {
        loadProducts();
    }, []);

    const loadProducts = async () => {
        const prods = await getProducts();
        setProducts(prods);
        if (selectedProduct) {
            const updated = prods.find(p => p.id === selectedProduct.id);
            if (updated) setSelectedProduct(updated);
        }
    };

    const loadSubProducts = async (productId: number) => {
        const subs = await getSubProducts(productId);
        setSubProducts(subs);
    };

    const handleAddProduct = async () => {
        if (!newProductName.trim()) {
            Alert.alert(t('error'), t('product_name_required') || 'Product name is required');
            return;
        }
        try {
            await addProduct(
                newProductName.trim(),
                parseInt(defaultPurity),
                parseFloat(defaultWastage) || 0,
                defaultWastageType,
                parseFloat(defaultMakingCharge) || 0,
                defaultMakingChargeType,
                newProductMetal,
                hsnCode.trim()
            );
            resetForms();
            setShowAddModal(false);
            loadProducts();
            Alert.alert(t('success'), t('product_added_successfully') || 'Product added successfully');
        } catch (error) {
            console.error('Add product error:', error);
            Alert.alert(t('error'), t('product_add_failed') || 'Product already exists or could not be added');
        }
    };

    const handleUpdateProduct = async () => {
        if (!selectedProduct) return;
        try {
            await updateProduct({
                ...selectedProduct,
                defaultPurity: parseInt(defaultPurity),
                defaultWastage: parseFloat(defaultWastage) || 0,
                defaultWastageType: defaultWastageType,
                defaultMakingCharge: parseFloat(defaultMakingCharge) || 0,
                defaultMakingChargeType: defaultMakingChargeType,
                hsnCode: hsnCode.trim()
            });
            loadProducts();
            Alert.alert(t('success'), t('product_defaults_updated') || 'Product defaults updated');
        } catch (error) {
            Alert.alert(t('error'), t('product_update_failed') || 'Could not update product defaults');
        }
    };

    const handleAddSubProduct = async () => {
        if (!selectedProduct || !newSubProductName.trim()) return;
        try {
            await addSubProduct(selectedProduct.id, newSubProductName.trim());
            setNewSubProductName('');
            setShowAddModal(false);
            loadSubProducts(selectedProduct.id);
        } catch (error) {
            console.error('Add sub-product error:', error);
            Alert.alert(t('error'), t('sub_product_add_failed') || 'Sub-product already exists or could not be added');
        }
    };

    const resetForms = () => {
        setNewProductName('');
        setNewSubProductName('');
        setDefaultPurity('22');
        setDefaultWastage('0');
        setDefaultWastageType('percentage');
        setDefaultMakingCharge('0');
        setDefaultMakingChargeType('perGram');
        setNewProductMetal('GOLD');
        setHsnCode('');
    };

    const handleDataManagement = () => {
        Alert.alert(
            t('manage_data') || 'Manage Data',
            t('select_action') || 'Select an action:',
            [
                { text: t('download_sample'), onPress: handleDownloadSample },
                { text: t('import_excel'), onPress: () => handleImportExcel(true) },
                { text: t('cancel'), style: 'cancel' }
            ]
        );
    };

    const handleImportExcel = async (isManualCall = true) => {
        try {
            // Safer dynamic import for DocumentPicker
            let DocumentPicker;
            try {
                // Try requiring the module
                const DP = require('expo-document-picker');
                if (!DP) throw new Error('require returned undefined');

                // Support both namespace and default exports
                DocumentPicker = DP.default || DP;

                if (!DocumentPicker || typeof DocumentPicker.getDocumentAsync !== 'function') {
                    throw new Error('Module loaded but getDocumentAsync is not a function');
                }
            } catch (e) {
                console.error('DocumentPicker load failed:', e);
                // Only alert if this was a manual user action
                if (isManualCall) {
                    Alert.alert(
                        t('error') || 'Error',
                        'The Document Picker module is not available. Please ensure you are using a development build with the expo-document-picker module included.'
                    );
                }
                return;
            }

            const result = await DocumentPicker.getDocumentAsync({
                type: ['application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'application/vnd.ms-excel', 'text/csv'],
                copyToCacheDirectory: true
            });

            if (result.canceled) return;

            setIsImporting(true);
            // Support both result.assets[0].uri (new) and result.uri (old)
            const fileUri = result.assets ? (result.assets[0] ? result.assets[0].uri : null) : (result as any).uri;
            if (!fileUri) throw new Error('No file URI found');

            const fileBase64 = await FileSystem.readAsStringAsync(fileUri, {
                encoding: 'base64'
            });

            const workbook = XLSX.read(fileBase64, { type: 'base64' });
            const sheetName = workbook.SheetNames[0];
            const worksheet = workbook.Sheets[sheetName];
            const data = XLSX.utils.sheet_to_json(worksheet) as any[];

            if (data.length === 0) {
                Alert.alert(t('error'), 'File is empty');
                setIsImporting(false);
                return;
            }

            // Simple import logic: Expecting columns Name, Metal (GOLD/SILVER), Purity, Wastage, WastageType, MC, MCType, HSN, SubProducts (comma separated)
            let importedCount = 0;
            let skippedCount = 0;
            let subProductsAdded = 0;

            for (const row of data) {
                const name = row.Name || row.name || row.ProductName;
                if (!name) continue;

                const metal = (row.Metal || row.metal || 'GOLD').toUpperCase();
                const hsn = row.HSN || row.hsn || '';
                const purity = parseInt(row.Purity || row.purity || (metal === 'SILVER' ? '100' : '22'));
                const wastage = parseFloat(row.Wastage || row.wastage || '0');
                const wastageType = row.WastageType || row.wastage_type || 'percentage';
                const mc = parseFloat(row.MC || row.mc || '0');
                const mcType = row.MCType || row.mc_type || 'perGram';

                const { id: productId, created } = await ensureProduct(
                    name.trim(),
                    purity,
                    wastage,
                    wastageType,
                    mc,
                    mcType,
                    metal,
                    hsn
                );

                if (created) importedCount++;
                else skippedCount++;

                const subs = row.SubProducts || row.sub_products || '';
                if (subs) {
                    const subList = subs.split(',').map((s: string) => s.trim());
                    for (const subName of subList) {
                        if (subName) {
                            const { created: subCreated } = await ensureSubProduct(productId, subName);
                            if (subCreated) subProductsAdded++;
                        }
                    }
                }
            }

            loadProducts();

            let message = t('import_summary') || 'Import Summary:';
            message += `\n\n• ${t('new_products') || 'New Products'}: ${importedCount}`;
            if (skippedCount > 0) message += `\n• ${t('existing_products') || 'Existing (Skipped)'}: ${skippedCount}`;
            message += `\n• ${t('sub_products_added') || 'Sub-products Added'}: ${subProductsAdded}`;

            Alert.alert(t('success'), message);
        } catch (error) {
            console.error('Import error:', error);
            Alert.alert(t('error'), 'Failed to import products. Ensure file format is correct.');
        } finally {
            setIsImporting(false);
        }
    };

    const handleDownloadSample = async () => {
        try {
            const sampleData = [
                {
                    'Name': 'Example Bangle',
                    'Metal': 'GOLD',
                    'Purity': 22,
                    'Wastage': 3.5,
                    'WastageType': 'percentage',
                    'MC': 250,
                    'MCType': 'perGram',
                    'HSN': '711319',
                    'SubProducts': 'Plain, Casting, Fancy'
                },
                {
                    'Name': 'Silver Chain',
                    'Metal': 'SILVER',
                    'Purity': 100,
                    'Wastage': 10,
                    'WastageType': 'percentage',
                    'MC': 500,
                    'MCType': 'fixed',
                    'HSN': '711311',
                    'SubProducts': 'Figaro, Curb, Rope'
                }
            ];

            const ws = XLSX.utils.json_to_sheet(sampleData);
            const wb = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(wb, ws, "Template");

            const wbout = XLSX.write(wb, { type: 'base64', bookType: "xlsx" });
            const cacheDir = (FileSystem as any).cacheDirectory;
            const uri = `${cacheDir}${cacheDir?.endsWith('/') ? '' : '/'}ProductImportTemplate.xlsx`;

            await FileSystem.writeAsStringAsync(uri, wbout, { encoding: 'base64' });

            // Check if sharing is available
            if (await Sharing.isAvailableAsync()) {
                await Sharing.shareAsync(uri, {
                    mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
                    dialogTitle: t('download_sample') || 'Download Product Import Template',
                    UTI: 'com.microsoft.excel.xlsx'
                });
            } else {
                Alert.alert(t('error'), 'Sharing is not available on this device');
            }
            setIsImporting(false);
        } catch (error) {
            console.error('Download sample error:', error);
            Alert.alert(t('error'), 'Failed to generate sample template');
        }
    };

    const handleDeleteProduct = (id: number) => {
        Alert.alert(t('confirm_delete') || 'Confirm Delete', t('delete_product_confirm') || 'Deleting a product will delete all its sub-products. Proceed?', [
            { text: t('cancel'), style: 'cancel' },
            {
                text: t('remove'), style: 'destructive', onPress: async () => {
                    await deleteProduct(id);
                    if (selectedProduct?.id === id) {
                        setSelectedProduct(null);
                        setSubProducts([]);
                    }
                    loadProducts();
                }
            }
        ]);
    };

    const openAddProduct = () => {
        setModalMode('PRODUCT');
        resetForms();
        setShowAddModal(true);
    };

    const openAddSubProduct = () => {
        if (!selectedProduct) return;
        setModalMode('SUB_PRODUCT');
        setNewSubProductName('');
        setHsnCode(selectedProduct.hsnCode || '');
        setShowAddModal(true);
    };

    const filteredProducts = products.filter(p =>
        p.name.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const goldProducts = filteredProducts.filter(p => p.metal === 'GOLD');
    const silverProducts = filteredProducts.filter(p => p.metal === 'SILVER');

    const renderProductCard = (item: DBProduct) => {
        const isSilver = item.metal === 'SILVER';

        return (
            <TouchableOpacity
                key={item.id}
                style={[
                    styles.productGridCard,
                    isSilver ? styles.silverCard : styles.goldCard
                ]}
                onPress={() => {
                    setSelectedProduct(item);
                    loadSubProducts(item.id);
                    setDefaultPurity(item.defaultPurity?.toString() || (isSilver ? '100' : '22'));
                    setDefaultWastage(item.defaultWastage?.toString() || '0');
                    setDefaultWastageType(item.defaultWastageType || 'percentage');
                    setDefaultMakingCharge(item.defaultMakingCharge?.toString() || '0');
                    setDefaultMakingChargeType(item.defaultMakingChargeType || 'perGram');
                    setHsnCode(item.hsnCode || '');
                    setShowEditModal(true);
                }}
                onLongPress={() => handleDeleteProduct(item.id)}
            >
                <View style={styles.cardTop}>
                    <Icon
                        name={isSilver ? "ellipse-outline" : "diamond-outline"}
                        size={24}
                        color={isSilver ? '#94a3b8' : '#f59e0b'}
                    />
                    <View style={styles.subCountBadge}>
                        <Text style={styles.subCountText}>{item.subProductCount || 0}</Text>
                    </View>
                </View>

                <Text style={styles.productCardName} numberOfLines={1}>
                    {item.name}
                </Text>

                <View style={styles.cardFooter}>
                    <Text style={styles.metalTag}>{item.metal}</Text>
                    {item.hsnCode && (
                        <Text style={styles.hsnTag}>#{item.hsnCode}</Text>
                    )}
                </View>
            </TouchableOpacity>
        );
    };

    return (
        <ScreenContainer>
            <HeaderBar title={t('manage_products_title')} showBack />

            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                style={{ flex: 1 }}
            >
                <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
                    <View style={styles.container}>
                        <View style={styles.topActions}>
                            <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
                                <Text style={styles.sectionTitle}>{t('product_categories')}</Text>
                                <TouchableOpacity
                                    style={[styles.headerAddButton, { marginLeft: SPACING.sm, backgroundColor: COLORS.primary, height: 32, paddingHorizontal: SPACING.sm }]}
                                    onPress={openAddProduct}
                                >
                                    <Icon name="add" size={18} color={COLORS.white} />
                                    <Text style={[styles.headerAddButtonText, { color: COLORS.white, fontSize: 12 }]}>{t('add_new')}</Text>
                                </TouchableOpacity>
                            </View>
                            <View style={styles.topActionsRight}>
                                <TouchableOpacity
                                    style={[styles.actionIconButton, { marginRight: SPACING.xs }]}
                                    onPress={handleDataManagement}
                                >
                                    <Icon name="cloud-upload-outline" size={22} color={COLORS.primary} />
                                </TouchableOpacity>
                                <TouchableOpacity
                                    style={[styles.actionIconButton, showSearch && styles.activeActionButton]}
                                    onPress={() => {
                                        setShowSearch(!showSearch);
                                        if (showSearch) setSearchQuery('');
                                    }}
                                >
                                    <Icon name="search" size={20} color={showSearch ? COLORS.primary : COLORS.textLight} />
                                </TouchableOpacity>
                            </View>
                        </View>

                        {showSearch && (
                            <View style={styles.searchContainer}>
                                <TextInput
                                    style={styles.searchInput}
                                    placeholder={t('search_placeholder')}
                                    value={searchQuery}
                                    onChangeText={setSearchQuery}
                                    autoFocus
                                />
                                <TouchableOpacity onPress={() => { setShowSearch(false); setSearchQuery(''); }}>
                                    <Icon name="close-circle" size={20} color={COLORS.textLight} />
                                </TouchableOpacity>
                            </View>
                        )}

                        <ScrollView
                            style={styles.mainScroll}
                            showsVerticalScrollIndicator={false}
                            contentContainerStyle={{ paddingBottom: 120 }}
                        >
                            <View style={styles.gridContainer}>
                                {filteredProducts.map(renderProductCard)}

                                {/* Add New Placeholder Card */}
                                <TouchableOpacity
                                    style={[styles.productGridCard, styles.dottedCard]}
                                    onPress={openAddProduct}
                                >
                                    <View style={styles.centeredContent}>
                                        <Icon name="add-circle-outline" size={32} color={COLORS.primary} />
                                        <Text style={styles.addCardText}>{t('add_new')}</Text>
                                    </View>
                                </TouchableOpacity>
                            </View>

                            {products.length === 0 && (
                                <View style={styles.emptyProducts}>
                                    <Icon name="cube-outline" size={48} color={COLORS.border} />
                                    <Text style={styles.emptyProductsText}>No categories added yet.</Text>
                                </View>
                            )}
                        </ScrollView>
                    </View>
                </TouchableWithoutFeedback>
            </KeyboardAvoidingView>

            {/* Edit Category Modal */}
            <Modal
                visible={showEditModal}
                transparent
                animationType="fade"
                onRequestClose={() => setShowEditModal(false)}
            >
                <KeyboardAvoidingView
                    behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                    style={styles.modalOverlay}
                >
                    <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
                        <View style={[styles.modalContent, { maxHeight: '85%' }]}>
                            <View style={styles.modalHeader}>
                                <View>
                                    <Text style={styles.modalTitle}>{selectedProduct?.name}</Text>
                                    <View style={[styles.metalBadge, selectedProduct?.metal === 'SILVER' ? styles.silverBadge : styles.goldBadge]}>
                                        <Text style={styles.metalBadgeText}>{selectedProduct?.metal}</Text>
                                    </View>
                                </View>
                                <TouchableOpacity onPress={() => setShowEditModal(false)} style={styles.closeButton}>
                                    <Icon name="close" size={24} color={COLORS.text} />
                                </TouchableOpacity>
                            </View>

                            <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>
                                {/* Default Settings */}
                                <View style={styles.modalSection}>
                                    <View style={styles.modalSectionHeader}>
                                        <Text style={styles.modalSectionTitle}>{t('default_settings')}</Text>
                                        <TouchableOpacity onPress={() => {
                                            handleUpdateProduct().then(() => setShowEditModal(false));
                                        }}>
                                            <Text style={styles.saveLink}>{t('save')}</Text>
                                        </TouchableOpacity>
                                    </View>

                                    <View style={styles.settingRow}>
                                        <DropdownField
                                            label={t('purity')}
                                            value={defaultPurity}
                                            options={selectedProduct?.metal === 'GOLD' ? [
                                                { label: '24K', value: '24' },
                                                { label: '22K', value: '22' },
                                                { label: '20K', value: '20' },
                                                { label: '18K', value: '18' },
                                            ] : [
                                                { label: 'Pure Silver', value: '100' },
                                                { label: '92.5 Sterling', value: '92.5' },
                                            ]}
                                            onSelect={setDefaultPurity}
                                            style={{ flex: 1 }}
                                        />
                                    </View>

                                    <View style={styles.settingRow}>
                                        <InputField
                                            label={t('wastage')}
                                            value={defaultWastage}
                                            onChangeText={setDefaultWastage}
                                            keyboardType="numeric"
                                            style={{ flex: 1, marginRight: SPACING.md }}
                                        />
                                        <DropdownField
                                            label={t('type')}
                                            value={defaultWastageType}
                                            options={[
                                                { label: t('percentage') || 'Percent %', value: 'percentage' },
                                                { label: t('weight') || 'Weight (g)', value: 'weight' },
                                            ]}
                                            onSelect={setDefaultWastageType}
                                            style={{ flex: 1 }}
                                        />
                                    </View>

                                    <View style={styles.settingRow}>
                                        <InputField
                                            label={t('making_charge')}
                                            value={defaultMakingCharge}
                                            onChangeText={setDefaultMakingCharge}
                                            keyboardType="numeric"
                                            style={{ flex: 1, marginRight: SPACING.md }}
                                        />
                                        <DropdownField
                                            label={t('type')}
                                            value={defaultMakingChargeType}
                                            options={[
                                                { label: t('per_gram'), value: 'perGram' },
                                                { label: t('fixed'), value: 'fixed' },
                                                { label: t('percentage'), value: 'percentage' },
                                            ]}
                                            onSelect={setDefaultMakingChargeType}
                                            style={{ flex: 1 }}
                                        />
                                    </View>

                                    <InputField
                                        label={t('hsn_code')}
                                        value={hsnCode}
                                        onChangeText={setHsnCode}
                                        placeholder="Optional"
                                    />
                                </View>

                                {/* Sub-products Management */}
                                <View style={styles.modalSection}>
                                    <View style={styles.modalSectionHeader}>
                                        <Text style={styles.modalSectionTitle}>{t('sub_products')}</Text>
                                        <TouchableOpacity
                                            style={styles.miniAddButton}
                                            onPress={() => {
                                                setNewSubProductName('');
                                                setModalMode('SUB_PRODUCT');
                                                setShowAddModal(true);
                                            }}
                                        >
                                            <Icon name="add" size={16} color={COLORS.white} />
                                            <Text style={styles.miniAddText}>{t('add')}</Text>
                                        </TouchableOpacity>
                                    </View>

                                    {subProducts.length === 0 ? (
                                        <View style={styles.emptyState}>
                                            <Text style={styles.emptyStateText}>{t('no_sub_categories')}</Text>
                                        </View>
                                    ) : (
                                        subProducts.map((sub) => (
                                            <View key={sub.id} style={styles.subProductRow}>
                                                <Text style={styles.subProductText}>{sub.name}</Text>
                                                <TouchableOpacity onPress={() => {
                                                    Alert.alert(t('remove'), t('delete_sub_confirm'), [
                                                        { text: t('no') },
                                                        {
                                                            text: t('yes'), onPress: () => deleteSubProduct(sub.id).then(() => {
                                                                if (selectedProduct) loadSubProducts(selectedProduct.id);
                                                                loadProducts();
                                                            })
                                                        }
                                                    ])
                                                }}>
                                                    <Icon name="trash-outline" size={18} color={COLORS.error} />
                                                </TouchableOpacity>
                                            </View>
                                        ))
                                    )}
                                </View>
                            </ScrollView>

                            <View style={styles.modalFooter}>
                                <TouchableOpacity
                                    style={styles.deleteButton}
                                    onPress={() => {
                                        if (selectedProduct) {
                                            handleDeleteProduct(selectedProduct.id);
                                            setShowEditModal(false);
                                        }
                                    }}
                                >
                                    <Icon name="trash-outline" size={18} color={COLORS.error} />
                                    <Text style={styles.deleteButtonText}>{t('delete_category') || 'Delete Category'}</Text>
                                </TouchableOpacity>
                            </View>
                        </View>
                    </TouchableWithoutFeedback>
                </KeyboardAvoidingView>
            </Modal>
            <Modal
                visible={showAddModal}
                transparent
                animationType="fade"
                onRequestClose={() => setShowAddModal(false)}
            >
                <KeyboardAvoidingView
                    behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                    style={styles.modalOverlay}
                >
                    <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
                        <View style={styles.modalContent}>
                            <View style={styles.modalHeader}>
                                <Text style={styles.modalTitle}>
                                    {modalMode === 'PRODUCT' ? t('add_new_product') : t('add_sub_product_for', { name: selectedProduct?.name || '' })}
                                </Text>
                                <TouchableOpacity onPress={() => setShowAddModal(false)} style={styles.closeButton}>
                                    <Icon name="close" size={24} color={COLORS.text} />
                                </TouchableOpacity>
                            </View>

                            <ScrollView style={styles.modalBody}>
                                {modalMode === 'PRODUCT' ? (
                                    <>
                                        <InputField
                                            label={t('product_name_placeholder')}
                                            value={newProductName}
                                            onChangeText={setNewProductName}
                                        />
                                        <DropdownField
                                            label={t('metal') || 'Metal Type'}
                                            value={newProductMetal}
                                            options={[
                                                { label: t('gold') || 'Gold', value: 'GOLD' },
                                                { label: t('silver') || 'Silver', value: 'SILVER' },
                                            ]}
                                            onSelect={(val) => {
                                                setNewProductMetal(val as 'GOLD' | 'SILVER');
                                                if (val === 'SILVER') setDefaultPurity('100');
                                                else setDefaultPurity('22');
                                            }}
                                        />
                                        <Text style={styles.modalSectionTitle}>{t('set_initial_defaults')}</Text>
                                        <DropdownField
                                            label={t('purity')}
                                            value={defaultPurity}
                                            options={newProductMetal === 'GOLD' ? [
                                                { label: '24K', value: '24' },
                                                { label: '22K', value: '22' },
                                                { label: '20K', value: '20' },
                                                { label: '18K', value: '18' },
                                            ] : [
                                                { label: 'Pure Silver', value: '100' },
                                                { label: '92.5 Sterling', value: '92.5' },
                                            ]}
                                            onSelect={setDefaultPurity}
                                        />
                                        <View style={styles.settingRow}>
                                            <InputField
                                                label={t('wastage')}
                                                value={defaultWastage}
                                                onChangeText={setDefaultWastage}
                                                keyboardType="numeric"
                                                style={{ flex: 1, marginRight: SPACING.sm }}
                                            />
                                            <DropdownField
                                                label={t('type')}
                                                value={defaultWastageType}
                                                options={[
                                                    { label: '%', value: 'percentage' },
                                                    { label: '(g)', value: 'weight' },
                                                ]}
                                                onSelect={setDefaultWastageType}
                                                style={{ flex: 1 }}
                                            />
                                        </View>
                                        <InputField
                                            label={t('hsn_code')}
                                            value={hsnCode}
                                            onChangeText={setHsnCode}
                                            placeholder="Optional"
                                        />
                                    </>
                                ) : (
                                    <InputField
                                        label={t('sub_product_name_placeholder')}
                                        value={newSubProductName}
                                        onChangeText={setNewSubProductName}
                                    />
                                )}
                            </ScrollView>

                            <View style={styles.modalFooter}>
                                <PrimaryButton
                                    title={modalMode === 'PRODUCT' ? t('save_product') : t('add_sub_product')}
                                    onPress={modalMode === 'PRODUCT' ? handleAddProduct : handleAddSubProduct}
                                />
                            </View>
                        </View>
                    </TouchableWithoutFeedback>
                </KeyboardAvoidingView>
            </Modal>
        </ScreenContainer>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    topActions: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: SPACING.md,
        paddingTop: SPACING.md,
        paddingBottom: SPACING.xs,
    },
    topActionsRight: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    sectionTitle: {
        fontSize: FONT_SIZES.sm,
        fontWeight: 'bold',
        color: COLORS.textLight,
        textTransform: 'uppercase',
    },
    headerAddButton: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: COLORS.background,
        paddingVertical: SPACING.xs,
        paddingHorizontal: SPACING.sm,
        borderRadius: BORDER_RADIUS.sm,
        borderWidth: 1,
        borderColor: COLORS.primary,
    },
    headerAddButtonText: {
        fontSize: FONT_SIZES.xs,
        color: COLORS.primary,
        fontWeight: 'bold',
        marginLeft: 4,
    },
    mainScroll: {
        flex: 1,
        paddingHorizontal: SPACING.md,
    },
    groupHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: SPACING.md,
        marginBottom: SPACING.sm,
    },
    groupTitle: {
        fontSize: FONT_SIZES.sm,
        fontWeight: 'bold',
        color: COLORS.text,
        marginLeft: 6,
    },
    gridContainer: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'space-between',
        paddingBottom: 120,
    },
    productGridCard: {
        width: (width - SPACING.md * 3) / 2,
        backgroundColor: COLORS.white,
        borderRadius: BORDER_RADIUS.lg,
        padding: SPACING.md,
        marginBottom: SPACING.md,
        elevation: 3,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        borderWidth: 1,
        borderColor: 'rgba(0,0,0,0.05)',
    },
    goldCard: {
        borderTopWidth: 4,
        borderTopColor: '#f59e0b',
    },
    silverCard: {
        borderTopWidth: 4,
        borderTopColor: '#94a3b8',
    },
    cardTop: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: SPACING.md,
    },
    subCountBadge: {
        backgroundColor: COLORS.background,
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: 10,
        borderWidth: 1,
        borderColor: COLORS.border,
    },
    subCountText: {
        fontSize: 10,
        fontWeight: 'bold',
        color: COLORS.primary,
    },
    productCardName: {
        fontSize: FONT_SIZES.md,
        fontWeight: 'bold',
        color: COLORS.text,
        marginBottom: SPACING.sm,
    },
    cardFooter: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginTop: SPACING.xs,
    },
    metalTag: {
        fontSize: 10,
        fontWeight: 'bold',
        color: COLORS.textLight,
        backgroundColor: COLORS.background,
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 4,
    },
    hsnTag: {
        fontSize: 10,
        color: COLORS.primary,
        fontWeight: 'bold',
    },
    miniProductCard: {
        paddingHorizontal: SPACING.md,
        paddingVertical: 8,
        borderRadius: 20,
        backgroundColor: COLORS.white,
        marginRight: SPACING.sm,
        borderWidth: 1,
        borderColor: COLORS.border,
        justifyContent: 'center',
        alignItems: 'center',
        minWidth: 80,
    },
    goldMiniCard: {
        borderBottomWidth: 3,
        borderBottomColor: '#f59e0b',
    },
    silverMiniCard: {
        borderBottomWidth: 3,
        borderBottomColor: '#94a3b8',
    },
    selectedMiniCard: {
        backgroundColor: COLORS.primary,
        borderColor: COLORS.primary,
    },
    miniCardText: {
        fontSize: FONT_SIZES.xs,
        fontWeight: 'bold',
        color: COLORS.text,
    },
    selectedMiniCardText: {
        color: COLORS.white,
    },
    selectedIndicator: {
        height: 2,
        width: 10,
        backgroundColor: COLORS.white,
        marginTop: 2,
    },
    horizontalScrollWrapper: {
        paddingVertical: SPACING.sm,
        borderBottomWidth: 1,
        borderBottomColor: COLORS.border,
        backgroundColor: COLORS.background,
    },
    horizontalScroll: {
        paddingLeft: SPACING.md,
    },
    horizontalScrollContent: {
        paddingRight: SPACING.md,
    },
    actionIconButton: {
        padding: 6,
        marginRight: SPACING.sm,
    },
    activeActionButton: {
        backgroundColor: COLORS.background,
        borderRadius: 8,
    },
    searchContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: SPACING.md,
        paddingVertical: SPACING.xs,
        backgroundColor: COLORS.white,
        marginHorizontal: SPACING.md,
        borderRadius: 8,
        marginBottom: SPACING.xs,
        borderWidth: 1,
        borderColor: COLORS.border,
    },
    searchInput: {
        flex: 1,
        fontSize: FONT_SIZES.sm,
        color: COLORS.text,
        paddingVertical: 4,
    },
    detailsContainer: {
        flex: 1,
        backgroundColor: COLORS.background,
        paddingHorizontal: SPACING.md,
    },
    emptyProducts: {
        marginTop: 100,
        alignItems: 'center',
    },
    emptyProductsText: {
        marginTop: SPACING.sm,
        color: COLORS.textLight,
        fontSize: FONT_SIZES.md,
    },
    richCard: {
        backgroundColor: COLORS.white,
        borderRadius: BORDER_RADIUS.lg,
        padding: SPACING.md,
        marginVertical: SPACING.md,
        elevation: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 2,
    },
    cardHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: SPACING.md,
        borderBottomWidth: 1,
        borderBottomColor: COLORS.background,
        paddingBottom: SPACING.sm,
    },
    cardTitle: {
        fontSize: FONT_SIZES.md,
        fontWeight: 'bold',
        color: COLORS.primary,
    },
    saveLink: {
        color: COLORS.success,
        fontWeight: 'bold',
        fontSize: FONT_SIZES.sm,
    },
    settingRow: {
        flexDirection: 'row',
        marginBottom: SPACING.xs,
    },
    miniAddButton: {
        backgroundColor: COLORS.primary,
        flexDirection: 'row',
        paddingHorizontal: SPACING.sm,
        paddingVertical: SPACING.xs,
        borderRadius: BORDER_RADIUS.sm,
        alignItems: 'center',
    },
    miniAddText: {
        color: COLORS.white,
        fontSize: FONT_SIZES.xs,
        fontWeight: 'bold',
        marginLeft: 2,
    },
    subProductRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: SPACING.sm,
        borderBottomWidth: 1,
        borderBottomColor: COLORS.background,
    },
    subProductText: {
        fontSize: FONT_SIZES.md,
        color: COLORS.text,
    },
    emptyState: {
        padding: SPACING.xl,
        alignItems: 'center',
    },
    emptyStateText: {
        marginTop: SPACING.sm,
        color: COLORS.textLight,
        fontSize: FONT_SIZES.sm,
    },
    welcomeState: {
        display: 'none',
    },
    welcomeText: {
        display: 'none',
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: SPACING.lg,
    },
    modalContent: {
        width: '100%',
        backgroundColor: COLORS.white,
        borderRadius: BORDER_RADIUS.lg,
        maxHeight: '80%',
        elevation: 10,
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: SPACING.md,
        borderBottomWidth: 1,
        borderBottomColor: COLORS.background,
    },
    modalTitle: {
        fontSize: FONT_SIZES.md,
        fontWeight: 'bold',
        color: COLORS.primary,
    },
    modalBody: {
        padding: SPACING.md,
    },
    modalSection: {
        marginBottom: SPACING.lg,
        backgroundColor: COLORS.background,
        padding: SPACING.md,
        borderRadius: BORDER_RADIUS.md,
    },
    modalSectionHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: SPACING.md,
    },
    modalSectionTitle: {
        fontSize: FONT_SIZES.sm,
        fontWeight: 'bold',
        color: COLORS.textLight,
        textTransform: 'uppercase',
    },
    metalBadge: {
        alignSelf: 'flex-start',
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: 4,
        marginTop: 4,
    },
    goldBadge: {
        backgroundColor: '#fef3c7',
    },
    silverBadge: {
        backgroundColor: '#f1f5f9',
    },
    metalBadgeText: {
        fontSize: 10,
        fontWeight: 'bold',
        color: COLORS.textLight,
    },
    deleteButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: SPACING.md,
        borderTopWidth: 1,
        borderTopColor: COLORS.background,
    },
    deleteButtonText: {
        color: COLORS.error,
        fontWeight: 'bold',
        marginLeft: SPACING.xs,
        fontSize: FONT_SIZES.sm,
    },
    modalFooter: {
        padding: SPACING.md,
    },
    dottedCard: {
        borderStyle: 'dashed',
        borderWidth: 2,
        borderColor: COLORS.primary,
        backgroundColor: COLORS.background,
        justifyContent: 'center',
        alignItems: 'center',
        minHeight: 120,
    },
    centeredContent: {
        alignItems: 'center',
        justifyContent: 'center',
    },
    addCardText: {
        marginTop: 8,
        color: COLORS.primary,
        fontWeight: 'bold',
        fontSize: FONT_SIZES.sm,
    },
    closeButton: {
        padding: 4,
    },
    modalSaveBtn: {
        paddingVertical: 4,
        paddingHorizontal: 8,
    }
});
