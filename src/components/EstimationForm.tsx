import React, { useState, useEffect } from 'react';
import { View as RNView, Text as RNText, StyleSheet, TouchableOpacity as RNRTouchableOpacity, Alert, ActivityIndicator as RNActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import InputField from './InputField';
import DropdownField from './DropdownField';
import RadioButtonGroup from './RadioButtonGroup';
import WeightInput from './WeightInput';
import PrimaryButton from './PrimaryButton';
import { calculateNetWeight, calculateItemTotal } from '../utils/calculations';
import { COLORS, SPACING, FONT_SIZES, BORDER_RADIUS, LIGHT_COLORS, DARK_COLORS } from '../constants/theme';
import { EstimationItem, WastageType, MakingChargeType } from '../types';
import { fetchTagDetailsFromApi } from '../services/productService';
import { getProducts, getSubProducts, DBProduct, DBSubProduct, getMetalTypes, DBMetalType } from '../services/dbService';
import { useEstimation } from '../store/EstimationContext';
import { useGeneralSettings } from '../store/GeneralSettingsContext';

// Fix for React 19 type mismatch
const View = RNView as any;
const Text = RNText as any;
const Icon = Ionicons as any;
const TouchableOpacity = RNRTouchableOpacity as any;
const ActivityIndicator = RNActivityIndicator as any;

interface EstimationFormProps {
    initialMode: 'TAG' | 'MANUAL';
    onAdd: (item: EstimationItem) => void;
    onClear: () => void;
    goldRate?: number; // Deprecated in favor of context rates, but kept for compat
    initialData?: EstimationItem | null;
    onScanPress?: () => void;
}

const PreviewRow = ({ label, value, highlight = false, colors }: { label: string; value: string; highlight?: boolean; colors: any }) => (
    <View style={styles.previewRow}>
        <Text style={[styles.previewLabel, { color: colors.textLight }]}>{label}</Text>
        <Text style={[styles.previewValue, { color: colors.text }, highlight && { color: colors.primary, fontSize: FONT_SIZES.md, fontWeight: 'bold' }]}>{value}</Text>
    </View>
);

export default function EstimationForm({ initialMode, onAdd, onClear, initialData, onScanPress }: EstimationFormProps) {
    const { state } = useEstimation();
    const { theme, t } = useGeneralSettings();
    const activeColors = theme === 'light' ? LIGHT_COLORS : DARK_COLORS;

    const [tagNo, setTagNo] = useState('');
    const [productName, setProductName] = useState('');
    const [subProductName, setSubProductName] = useState('');
    const [pcs, setPcs] = useState('1');
    const [grossWeight, setGrossWeight] = useState('');
    const [stoneWeight, setStoneWeight] = useState('0');
    const [wastage, setWastage] = useState('0');
    const [wastageType, setWastageType] = useState<WastageType>('percentage');
    const [makingCharge, setMakingCharge] = useState('0');
    const [makingChargeType, setMakingChargeType] = useState<MakingChargeType>('fixed');
    const [metal, setMetal] = useState<'GOLD' | 'SILVER'>('GOLD');
    const [purity, setPurity] = useState('22'); // 18, 20, 22, 24
    const [rate, setRate] = useState('');
    const [customerName, setCustomerName] = useState('');

    // Load initial data for editing
    useEffect(() => {
        if (initialData) {
            setTagNo(initialData.tagNumber || '');
            setProductName(initialData.name);
            setSubProductName(initialData.subProductName || '');
            setPcs(initialData.pcs.toString());
            setGrossWeight(initialData.grossWeight.toString());
            setStoneWeight(initialData.stoneWeight.toString());
            setWastage(initialData.wastage.toString());
            setWastageType(initialData.wastageType);
            setMakingCharge(initialData.makingCharge.toString());
            setMakingChargeType(initialData.makingChargeType);
            setMetal(initialData.metal || 'GOLD');
            setPurity(initialData.purity.toString());
            setRate(initialData.rate.toString());
            setCustomerName(initialData.customerName || '');
        }
    }, [initialData]);

    const [availableProducts, setAvailableProducts] = useState<DBProduct[]>([]);
    const [availableSubProducts, setAvailableSubProducts] = useState<DBSubProduct[]>([]);
    const [metalTypes, setMetalTypes] = useState<DBMetalType[]>([]);

    const getDefaultRate = () => {
        if (metal === 'SILVER') return state.goldRate.silver;

        // Find matching purity in gold rates
        const p = parseFloat(purity);
        if (p === 24) return state.goldRate.rate24k;
        if (p === 22) return state.goldRate.rate22k;
        if (p === 20) return state.goldRate.rate20k;
        if (p === 18) return state.goldRate.rate18k;

        // Default to 22K if not found
        return state.goldRate.rate22k;
    };

    // Update rate when metal or purity changes
    useEffect(() => {
        setRate(getDefaultRate().toString());
    }, [metal, purity, state.goldRate]);

    // Load products and metal types from DB
    useEffect(() => {
        const loadInitialData = async () => {
            const products = await getProducts();
            setAvailableProducts(products);

            const types = await getMetalTypes();
            setMetalTypes(types);

            // If we have a selected product but no sub-products, load them
            if (productName) {
                const selectedProd = products.find(p => p.name === productName);
                if (selectedProd) {
                    const subs = await getSubProducts(selectedProd.id);
                    setAvailableSubProducts(subs);
                }
            }
        };
        loadInitialData();
    }, []);

    // Load sub-products and defaults when product changes
    useEffect(() => {
        const loadProductDetails = async () => {
            if (!productName) {
                setAvailableSubProducts([]);
                return;
            }
            const selectedProd = availableProducts.find(p => p.name === productName);
            if (selectedProd) {
                // Load subs
                const subs = await getSubProducts(selectedProd.id);
                setAvailableSubProducts(subs);

                // Apply defaults
                if (selectedProd.defaultPurity) setPurity(selectedProd.defaultPurity.toString());
                if (selectedProd.defaultWastage !== undefined) setWastage(selectedProd.defaultWastage.toString());
                if (selectedProd.defaultWastageType) setWastageType(selectedProd.defaultWastageType as WastageType);
                if (selectedProd.defaultMakingCharge !== undefined) setMakingCharge(selectedProd.defaultMakingCharge.toString());
                if (selectedProd.defaultMakingChargeType) setMakingChargeType(selectedProd.defaultMakingChargeType as MakingChargeType);
                if (selectedProd.metal) setMetal(selectedProd.metal as any);
            }
        };
        loadProductDetails();
    }, [productName, availableProducts]);

    const rateNum = parseFloat(rate) || 0;
    const netWeight = calculateNetWeight(parseFloat(grossWeight) || 0, parseFloat(stoneWeight) || 0);

    const [isFetchingTag, setIsFetchingTag] = useState(false);

    const handleTagScan = async () => {
        if (!tagNo || isFetchingTag) return;
        setIsFetchingTag(true);
        try {
            const product = await fetchTagDetailsFromApi(tagNo, 'ajithkumar');
            setProductName(product.name);
            setSubProductName(product.subProductName || '');
            setGrossWeight(product.grossWeight.toString());
            setStoneWeight(product.stoneWeight.toString());
            setWastage(product.wastage.toString());
            setWastageType(product.wastageType);
            setMakingCharge(product.makingCharge.toString());
            setMakingChargeType(product.makingChargeType);
            setPurity(product.purity.toString());
        } catch (error) {
            Alert.alert(t('error'), t('product_not_found') || 'Product not found');
        } finally {
            setIsFetchingTag(false);
        }
    };

    const [errors, setErrors] = useState<Record<string, string>>({});

    const validateForm = () => {
        const newErrors: Record<string, string> = {};
        if (!productName) newErrors.productName = t('field_required');
        if (!grossWeight || parseFloat(grossWeight) <= 0) newErrors.grossWeight = t('field_required');
        if (!rate || parseFloat(rate) <= 0) newErrors.rate = t('field_required');

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const getGreeting = () => {
        const hour = new Date().getHours();
        if (hour < 12) return t('good_morning');
        if (hour < 17) return t('good_afternoon');
        return t('good_evening');
    };

    const handleAdd = () => {
        if (!validateForm()) {
            return;
        }

        const calcs = calculateItemTotal(
            netWeight,
            rateNum,
            parseFloat(makingCharge),
            makingChargeType,
            parseFloat(wastage),
            wastageType
        );

        const item: EstimationItem = {
            id: Date.now().toString(),
            name: productName,
            subProductName,
            pcs: parseInt(pcs),
            grossWeight: parseFloat(grossWeight),
            stoneWeight: parseFloat(stoneWeight),
            netWeight,
            purity: parseInt(purity),
            makingCharge: parseFloat(makingCharge),
            makingChargeType,
            wastage: parseFloat(wastage),
            wastageType,
            rate: rateNum,
            isManual: initialMode === 'MANUAL',
            goldValue: calcs.goldValue,
            makingChargeValue: calcs.makingChargeValue,
            wastageValue: calcs.wastageValue,
            gstValue: calcs.gstValue,
            totalValue: calcs.total,
            customerName,
            metal,
            tagNumber: initialMode === 'TAG' ? tagNo : undefined,
        };

        onAdd(item);
        clearForm();
    };

    const clearForm = () => {
        setTagNo('');
        setProductName('');
        setSubProductName('');
        setPcs('1');
        setGrossWeight('');
        setStoneWeight('0');
        setWastage('0');
        setMakingCharge('0');
        setCustomerName('');
        setErrors({});
        onClear();
    };

    const currentCalcs = calculateItemTotal(
        netWeight,
        rateNum,
        parseFloat(makingCharge) || 0,
        makingChargeType,
        parseFloat(wastage) || 0,
        wastageType
    );

    return (
        <View style={styles.container}>
            {initialMode === 'TAG' && (
                <View style={[styles.section, { backgroundColor: activeColors.cardBg }]}>
                    <InputField
                        label={t('tag_number')}
                        value={tagNo}
                        onChangeText={setTagNo}
                        placeholder={t('scan_or_enter_tag')}
                        rightAction={
                            <View style={{ flexDirection: 'row' }}>
                                <TouchableOpacity onPress={onScanPress} style={styles.scanIcon}>
                                    <Icon name="scan-outline" size={24} color={activeColors.primary} />
                                </TouchableOpacity>
                                <TouchableOpacity onPress={handleTagScan} style={styles.scanIcon} disabled={isFetchingTag}>
                                    {isFetchingTag ? (
                                        <ActivityIndicator size="small" color={activeColors.primary} />
                                    ) : (
                                        <Icon name="search" size={24} color={activeColors.primary} />
                                    )}
                                </TouchableOpacity>
                            </View>
                        }
                    />
                </View>
            )}

            <View style={[styles.section, { backgroundColor: activeColors.cardBg }]}>
                {/* Group 1: Type & Purity */}
                <View style={styles.formGroup}>
                    <Text style={[styles.groupTitle, { color: activeColors.primary }]}>{t('type_and_purity') || 'Type & Purity'}</Text>
                    <View style={styles.row}>
                        <DropdownField
                            label={t('metal')}
                            value={metal}
                            options={[
                                { label: t('gold'), value: 'GOLD' },
                                { label: t('silver'), value: 'SILVER' },
                            ]}
                            onSelect={val => {
                                setMetal(val as any);
                                // Set default purity for the category
                                const firstType = metalTypes.find(t => t.metal === val);
                                if (firstType) setPurity(firstType.purity.toString());
                            }}
                            style={{ flex: 1, marginRight: SPACING.sm }}
                        />
                        <DropdownField
                            label={metal === 'GOLD' ? t('purity') : 'Silver Type'}
                            value={purity}
                            options={metalTypes
                                .filter(t => t.metal === metal)
                                .map(t => ({ label: t.name, value: t.purity.toString() }))
                            }
                            onSelect={setPurity}
                            style={{ flex: 1 }}
                        />
                    </View>
                </View>

                {/* Group 2: Product Name & Sub-Product (Separate Rows) */}
                <View style={styles.formGroup}>
                    <Text style={[styles.groupTitle, { color: activeColors.primary }]}>{t('product_information') || 'Product Information'}</Text>
                    {initialMode === 'TAG' ? (
                        <InputField
                            label={t('product_name')}
                            value={productName}
                            editable={false}
                            style={{ marginBottom: SPACING.sm, opacity: 0.7 }}
                        />
                    ) : (
                        <DropdownField
                            label={t('product_name')}
                            value={productName}
                            options={availableProducts.map(p => ({ label: p.name, value: p.name }))}
                            onSelect={setProductName}
                            error={errors.productName}
                            style={{ marginBottom: SPACING.sm }}
                        />
                    )}
                    <DropdownField
                        label={t('sub_product_name')}
                        value={subProductName}
                        options={availableSubProducts.map(s => ({ label: s.name, value: s.name }))}
                        onSelect={setSubProductName}
                    />
                </View>

                {/* Group 3: Measurements */}
                <View style={styles.formGroup}>
                    <Text style={[styles.groupTitle, { color: activeColors.primary }]}>{t('measurements') || 'Measurements'}</Text>
                    <View style={styles.row}>
                        <InputField
                            label={t('pcs')}
                            value={pcs}
                            onChangeText={setPcs}
                            keyboardType="numeric"
                            style={{ flex: 0.4, marginRight: SPACING.sm }}
                        />
                        <View style={{ flex: 1 }}>
                            <WeightInput
                                grossWeight={grossWeight}
                                stoneWeight={stoneWeight}
                                netWeight={netWeight.toFixed(3)}
                                onGrossChange={setGrossWeight}
                                onStoneChange={setStoneWeight}
                                error={errors.grossWeight}
                            />
                        </View>
                    </View>
                </View>

                {/* Group 4: Pricing & Charges */}
                <View style={styles.formGroup}>
                    <Text style={[styles.groupTitle, { color: activeColors.primary }]}>{t('pricing_and_charges') || 'Pricing & Charges'}</Text>

                    <View style={[styles.row, { alignItems: 'flex-end', marginBottom: SPACING.sm }]}>
                        <InputField
                            label={t('wastage') + (wastageType === 'percentage' ? " (%)" : " (g)")}
                            value={wastage}
                            onChangeText={setWastage}
                            keyboardType="numeric"
                            style={{ flex: 1, marginRight: SPACING.sm }}
                        />
                        <RadioButtonGroup
                            label={t('type')}
                            selectedValue={wastageType === 'percentage' ? 'percentage' : 'weight'}
                            options={[
                                { label: '%', value: 'percentage' },
                                { label: 'gram', value: 'weight' },
                            ]}
                            onSelect={val => setWastageType(val as WastageType)}
                            style={{ flex: 1 }}
                        />
                    </View>

                    <View style={[styles.row, { alignItems: 'flex-end', marginBottom: SPACING.sm }]}>
                        <InputField
                            label={t('making_charge') + (makingChargeType === 'percentage' ? " (%)" : makingChargeType === 'perGram' ? " (/g)" : " (Fixed)")}
                            value={makingCharge}
                            onChangeText={setMakingCharge}
                            keyboardType="numeric"
                            style={{ flex: 1, marginRight: SPACING.sm }}
                        />
                        <RadioButtonGroup
                            label={t('type')}
                            selectedValue={makingChargeType === 'perGram' ? 'weight' : (makingChargeType === 'percentage' ? 'percentage' : 'fixed')}
                            options={[
                                { label: 'Fixed', value: 'fixed' },
                                { label: 'Weight /g', value: 'weight' },
                                // { label: '%', value: 'percentage' },
                            ]}
                            onSelect={val => {
                                if (val === 'weight') setMakingChargeType('perGram');
                                else if (val === 'percentage') setMakingChargeType('percentage');
                                else setMakingChargeType('fixed');
                            }}
                            style={{ flex: 1 }}
                        />
                    </View>

                    <InputField
                        label={`${metal === 'GOLD' ? t('gold') : t('silver')} ${t('rate')} (₹)`}
                        value={rate}
                        onChangeText={setRate}
                        keyboardType="numeric"
                        error={errors.rate}
                    />
                </View>

                {/* Group 5: Calculations */}
                <View style={[styles.calculationPreview, { backgroundColor: activeColors.background }]}>
                    <PreviewRow colors={activeColors} label={`${metal === 'GOLD' ? t('gold') : t('silver')} ${t('total')}`} value={`₹ ${parseFloat(currentCalcs.goldValue.toFixed(2)).toLocaleString()}`} />
                    <PreviewRow
                        colors={activeColors}
                        label={t('wastage') + (wastageType === 'percentage' ? ` (${wastage}%)` : ` (${wastage}g)`)}
                        value={`${(wastageType === 'percentage' ? (netWeight * (parseFloat(wastage) || 0) / 100) : (parseFloat(wastage) || 0)).toFixed(3)} g (₹${currentCalcs.wastageValue.toLocaleString()})`}
                    />
                    <PreviewRow
                        colors={activeColors}
                        label={t('making_charge') + (makingChargeType === 'percentage' ? ` (${makingCharge}%)` : makingChargeType === 'perGram' ? ` (${makingCharge}/g)` : '')}
                        value={`₹ ${parseFloat(currentCalcs.makingChargeValue.toFixed(2)).toLocaleString()}`}
                    />
                    <PreviewRow colors={activeColors} label={t('gst') + " (3%)"} value={`₹ ${parseFloat(currentCalcs.gstValue.toFixed(2)).toLocaleString()}`} />
                    <PreviewRow colors={activeColors} label={t('total')} value={`₹ ${parseFloat(currentCalcs.total.toFixed(2)).toLocaleString()}`} highlight />
                </View>

                <InputField label={t('customer_name')} value={customerName} onChangeText={setCustomerName} />
            </View>

            <View style={styles.actionRow}>
                <PrimaryButton title={t('add_to_list')} onPress={handleAdd} style={{ flex: 1, marginRight: SPACING.sm }} />
                <PrimaryButton title={t('clear')} onPress={clearForm} variant="outline" style={{ flex: 1 }} />
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    section: {
        padding: SPACING.sm,
        borderRadius: BORDER_RADIUS.md,
        marginBottom: SPACING.md,
        elevation: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
    },
    row: {
        flexDirection: 'row',
    },
    actionRow: {
        flexDirection: 'row',
        marginTop: SPACING.sm,
    },
    scanIcon: {
        padding: SPACING.xs,
    },
    calculationPreview: {
        padding: SPACING.sm,
        borderRadius: BORDER_RADIUS.md,
        marginTop: SPACING.xs,
        marginBottom: SPACING.sm,
    },
    previewRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 4,
    },
    previewLabel: {
        fontSize: FONT_SIZES.xs,
    },
    previewValue: {
        fontSize: FONT_SIZES.xs,
        fontWeight: '600',
    },
    formGroup: {
        marginBottom: SPACING.md,
        paddingBottom: SPACING.sm,
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(0,0,0,0.05)',
    },
    groupTitle: {
        fontSize: 10,
        fontWeight: 'bold',
        textTransform: 'uppercase',
        letterSpacing: 1,
        marginBottom: SPACING.sm,
        opacity: 0.8,
    },
});
