import React, { useState, useEffect } from 'react';
import {
    View, Text, StyleSheet, ScrollView, TouchableOpacity,
    TextInput, Alert, Image, ActivityIndicator
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useGeneralSettings } from '../store/GeneralSettingsContext';
import { saveRepair, getNextRepairId, getRepairById, DBRepair, getProducts, getSubProducts, DBProduct, DBSubProduct } from '../services/dbService';
import { printRepair, getRepairReceiptThermalPayload } from '../services/printService';
import ScreenContainer from '../components/ScreenContainer';
import DropdownField from '../components/DropdownField';
import { COLORS, SPACING, FONT_SIZES, BORDER_RADIUS, LIGHT_COLORS, DARK_COLORS } from '../constants/theme';
import SafeLinearGradient from '../components/SafeLinearGradient';
import { addDays, format } from 'date-fns';
import PrintPreviewModal from '../modals/PrintPreviewModal';

export default function RepairEntryScreen() {
    const router = useRouter();
    const { theme, t, shopDetails, receiptConfig, updateReceiptConfig } = useGeneralSettings();
    const [loading, setLoading] = useState(false);
    const [repairNo, setRepairNo] = useState('');

    // Form State
    const [type, setType] = useState<'CUSTOMER' | 'COMPANY'>('CUSTOMER');
    const [itemName, setItemName] = useState('');
    const [subProductName, setSubProductName] = useState('');
    const [products, setProducts] = useState<DBProduct[]>([]);
    const [subProducts, setSubProducts] = useState<DBSubProduct[]>([]);
    const [selectedProductId, setSelectedProductId] = useState<string>('');
    const [pcs, setPcs] = useState('1');
    const [grossWeight, setGrossWeight] = useState('');
    const [netWeight, setNetWeight] = useState('');
    const [natureOfRepair, setNatureOfRepair] = useState('');
    const [dueDays, setDueDays] = useState('7');
    const [dueDate, setDueDate] = useState(addDays(new Date(), 7));
    const [empId, setEmpId] = useState('');
    const [amount, setAmount] = useState('');
    const [advance, setAdvance] = useState('');
    const [images, setImages] = useState<string[]>([]);
    const [customerName, setCustomerName] = useState('');
    const [customerMobile, setCustomerMobile] = useState('');
    const [gstType, setGstType] = useState<'none' | 'amount' | 'percentage'>('none');
    const [gstValue, setGstValue] = useState('');

    // Print Preview State
    const [showPreview, setShowPreview] = useState(false);
    const [previewPayload, setPreviewPayload] = useState('');
    const [savedRepairData, setSavedRepairData] = useState<DBRepair | null>(null);
    const [originalData, setOriginalData] = useState<DBRepair | null>(null);

    const activeColors = theme === 'light' ? LIGHT_COLORS : DARK_COLORS;

    const repairIdParam = useLocalSearchParams().id as string;

    useEffect(() => {
        if (repairIdParam) {
            loadRepairData(repairIdParam);
        } else {
            generateRepairId();
        }
        loadProducts();
    }, [repairIdParam]);

    const loadRepairData = async (id: string) => {
        setLoading(true);
        try {
            const repair = await getRepairById(id);
            if (repair) {
                setRepairNo(repair.id);
                setType(repair.type);
                setItemName(repair.itemName);
                setSubProductName(repair.subProductName || '');
                setPcs(String(repair.pcs));
                setGrossWeight(String(repair.grossWeight));
                setNetWeight(String(repair.netWeight));
                setNatureOfRepair(repair.natureOfRepair || '');
                setDueDays(String(repair.dueDays));
                setDueDate(new Date(repair.dueDate));
                setEmpId(repair.empId || '');
                setAmount(String(repair.amount));
                setAdvance(String(repair.advance));
                setCustomerName(repair.customerName || '');
                setCustomerMobile(repair.customerMobile || '');
                setImages(JSON.parse(repair.images || '[]'));
                setGstType((repair.gstType as 'none' | 'amount' | 'percentage') || 'none');
                setGstValue(repair.gstType === 'none' ? '' : String(repair.gstAmount));

                setOriginalData(repair);
            }
        } catch (error) {
            console.error('Failed to load repair:', error);
        } finally {
            setLoading(false);
        }
    };

    const loadProducts = async () => {
        try {
            const prods = await getProducts();
            setProducts(prods);
        } catch (error) {
            console.error('Error loading products:', error);
        }
    };

    useEffect(() => {
        if (products.length > 0 && originalData && !selectedProductId) {
            const prod = products.find(p => p.name === originalData.itemName);
            if (prod) setSelectedProductId(String(prod.id));
        }
    }, [products, originalData]);

    useEffect(() => {
        if (selectedProductId) {
            const loadSubs = async () => {
                try {
                    const subs = await getSubProducts(parseInt(selectedProductId));
                    setSubProducts(subs);
                } catch (error) {
                    console.error('Error loading sub-products:', error);
                }
            };
            loadSubs();
        } else {
            setSubProducts([]);
        }
    }, [selectedProductId]);

    useEffect(() => {
        const days = parseInt(dueDays) || 0;
        setDueDate(addDays(new Date(), days));
    }, [dueDays]);

    const generateRepairId = async () => {
        const id = await getNextRepairId();
        setRepairNo(id);
    };

    const handlePickImage = async (useCamera: boolean) => {
        const permissionResult = useCamera
            ? await ImagePicker.requestCameraPermissionsAsync()
            : await ImagePicker.requestMediaLibraryPermissionsAsync();

        if (permissionResult.granted === false) {
            Alert.alert(t('permission_denied'), t('camera_permission_needed'));
            return;
        }

        const result = useCamera
            ? await ImagePicker.launchCameraAsync({
                allowsEditing: true,
                aspect: [4, 3],
                quality: 0.5, // Auto-compression as requested
            })
            : await ImagePicker.launchImageLibraryAsync({
                allowsEditing: true,
                aspect: [4, 3],
                quality: 0.5,
            });

        if (!result.canceled && result.assets && result.assets.length > 0) {
            setImages([...images, result.assets[0].uri]);
        }
    };

    const handleSave = async () => {
        if (!itemName || !customerName) {
            Alert.alert(t('error'), t('field_required'));
            return;
        }

        setLoading(true);
        try {
            const amt = parseFloat(amount) || 0;
            const adv = parseFloat(advance) || 0;

            const parsedGstValue = parseFloat(gstValue) || 0;
            let gstAmount = 0;
            if (gstType === 'amount') gstAmount = parsedGstValue;
            else if (gstType === 'percentage') gstAmount = (amt * parsedGstValue) / 100;

            const totalWithGst = amt + gstAmount;
            const bal = totalWithGst - adv;

            const repairData: DBRepair = {
                id: repairNo,
                date: originalData ? originalData.date : new Date().toISOString(),
                type,
                dueDays: parseInt(dueDays) || 0,
                dueDate: dueDate.toISOString(),
                itemName,
                subProductName,
                pcs: parseInt(pcs) || 1,
                grossWeight: parseFloat(grossWeight) || 0,
                netWeight: parseFloat(netWeight) || 0,
                natureOfRepair,
                empId,
                images: JSON.stringify(images),
                amount: amt,
                advance: adv,
                balance: bal,
                status: originalData ? originalData.status : 'PENDING',
                customerName,
                customerMobile,
                extraAmount: originalData ? originalData.extraAmount : 0,
                deliveryDate: originalData ? (originalData.deliveryDate as string | undefined) : undefined
            };

            await saveRepair(repairData);
            setSavedRepairData(repairData);

            // Generate thermal payload for preview
            const payload = await getRepairReceiptThermalPayload(repairData, shopDetails, empId, receiptConfig, t);
            setPreviewPayload(payload);
            setShowPreview(true);

        } catch (error) {
            console.error('Save failed:', error);
            Alert.alert(t('error'), t('save_failed'));
        } finally {
            setLoading(false);
        }
    };

    const handleWidthChange = async (width: '58mm' | '80mm' | '112mm') => {
        try {
            await updateReceiptConfig({ paperWidth: width });
            if (savedRepairData) {
                const payload = await getRepairReceiptThermalPayload(
                    savedRepairData as any,
                    shopDetails,
                    empId,
                    { ...receiptConfig, paperWidth: width },
                    t
                );
                setPreviewPayload(payload);
            }
        } catch (error) {
            console.error('Failed to change width:', error);
        }
    };

    const removeImage = (index: number) => {
        const newImages = [...images];
        newImages.splice(index, 1);
        setImages(newImages);
    };

    const Label = ({ children }: { children: string }) => (
        <Text style={[styles.label, { color: activeColors.textLight }]}>{children}</Text>
    );

    return (
        <ScreenContainer backgroundColor={activeColors.background}>
            <SafeLinearGradient
                colors={theme === 'light' ? ['#FFFFFF', '#F8F9FA'] : ['#1C1C1E', '#121212']}
                style={styles.header}
            >
                <View style={styles.headerTop}>
                    <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                        <Ionicons name="arrow-back" size={24} color={activeColors.text} />
                    </TouchableOpacity>
                    <Text style={[styles.headerTitle, { color: activeColors.text }]}>{t('repair_entry')}</Text>
                    <View style={{ width: 40 }} />
                </View>
            </SafeLinearGradient>

            <ScrollView contentContainerStyle={styles.scrollContent}>
                <View style={[styles.section, { backgroundColor: activeColors.cardBg, borderColor: activeColors.border }]}>
                    <View style={styles.row}>
                        <View style={{ flex: 1, marginRight: SPACING.sm }}>
                            <Label>{t('repair_no')}</Label>
                            <TextInput
                                style={[styles.input, { color: activeColors.text, opacity: 0.7 }]}
                                value={repairNo}
                                editable={false}
                            />
                        </View>
                        <View style={{ flex: 1 }}>
                            <Label>{t('repair_type')}</Label>
                            <View style={styles.typeToggle}>
                                <TouchableOpacity
                                    style={[styles.typeBtn, type === 'CUSTOMER' && styles.typeBtnActive]}
                                    onPress={() => setType('CUSTOMER')}
                                >
                                    <Text style={[styles.typeBtnText, type === 'CUSTOMER' && styles.typeBtnTextActive]}>{t('customer')}</Text>
                                </TouchableOpacity>
                                <TouchableOpacity
                                    style={[styles.typeBtn, type === 'COMPANY' && styles.typeBtnActive]}
                                    onPress={() => setType('COMPANY')}
                                >
                                    <Text style={[styles.typeBtnText, type === 'COMPANY' && styles.typeBtnTextActive]}>{t('company')}</Text>
                                </TouchableOpacity>
                            </View>
                        </View>
                    </View>

                    <View style={styles.row}>
                        <View style={{ flex: 1, marginRight: SPACING.sm }}>
                            <Label>{t('due_days')}</Label>
                            <TextInput
                                style={[styles.input, { color: activeColors.text }]}
                                value={dueDays}
                                onChangeText={setDueDays}
                                keyboardType="numeric"
                            />
                        </View>
                        <View style={{ flex: 1 }}>
                            <Label>{t('due_date')}</Label>
                            <TextInput
                                style={[styles.input, { color: activeColors.text, opacity: 0.7 }]}
                                value={format(dueDate, 'dd/MM/yyyy')}
                                editable={false}
                            />
                        </View>
                    </View>
                </View>

                <View style={[styles.section, { backgroundColor: activeColors.cardBg, borderColor: activeColors.border }]}>
                    <Label>{t('customer_name')}</Label>
                    <TextInput
                        style={[styles.input, { color: activeColors.text }]}
                        value={customerName}
                        onChangeText={setCustomerName}
                        placeholder={t('enter_name')}
                        placeholderTextColor={activeColors.textLight}
                    />

                    <Label>{t('phone_number')}</Label>
                    <TextInput
                        style={[styles.input, { color: activeColors.text }]}
                        value={customerMobile}
                        onChangeText={setCustomerMobile}
                        placeholder={t('enter_mobile')}
                        placeholderTextColor={activeColors.textLight}
                        keyboardType="phone-pad"
                    />
                </View>

                <View style={[styles.section, { backgroundColor: activeColors.cardBg, borderColor: activeColors.border }]}>
                    <DropdownField
                        label={t('item_name')}
                        value={selectedProductId}
                        options={products.map(p => ({ label: p.name, value: p.id.toString() }))}
                        onSelect={(val) => {
                            setSelectedProductId(val);
                            const prod = products.find(p => p.id.toString() === val);
                            if (prod) setItemName(prod.name);
                        }}
                        placeholder={t('select_item')}
                    />

                    <View style={styles.row}>
                        <View style={{ flex: 2, marginRight: SPACING.sm }}>
                            <DropdownField
                                label={t('sub_product_name')}
                                value={subProductName}
                                options={subProducts.map(s => ({ label: s.name, value: s.name }))}
                                onSelect={setSubProductName}
                                placeholder={t('select_sub_product')}
                            />
                        </View>
                        {/* <View style={{ flex: 1 }}>
                            <Label>{t('pcs')}</Label>
                            <TextInput
                                style={[styles.input, { color: activeColors.text }]}
                                value={pcs}
                                onChangeText={setPcs}
                                keyboardType="numeric"
                            />
                        </View> */}
                    </View>

                    <View style={styles.row}>
                        <View style={{ flex: 1, marginRight: SPACING.sm }}>
                            <Label>{t('pcs')}</Label>
                            <TextInput
                                style={[styles.input, { color: activeColors.text }]}
                                value={pcs}
                                onChangeText={setPcs}
                                keyboardType="numeric"
                            />
                        </View>
                        <View style={{ flex: 1, marginRight: SPACING.sm }}>
                            <Label>{t('gross_weight')}</Label>
                            <TextInput
                                style={[styles.input, { color: activeColors.text }]}
                                value={grossWeight}
                                onChangeText={setGrossWeight}
                                keyboardType="numeric"
                                placeholder="0.000"
                            />
                        </View>
                        <View style={{ flex: 1 }}>
                            <Label>{t('net_weight')}</Label>
                            <TextInput
                                style={[styles.input, { color: activeColors.text }]}
                                value={netWeight}
                                onChangeText={setNetWeight}
                                keyboardType="numeric"
                                placeholder="0.000"
                            />
                        </View>
                    </View>

                    <Label>{t('nature_of_repair')}</Label>
                    <TextInput
                        style={[styles.input, { color: activeColors.text, height: 60 }]}
                        value={natureOfRepair}
                        onChangeText={setNatureOfRepair}
                        multiline
                        placeholder={t('describe_repair')}
                        placeholderTextColor={activeColors.textLight}
                    />

                    <Label>{t('employee_name')}</Label>
                    <TextInput
                        style={[styles.input, { color: activeColors.text }]}
                        value={empId}
                        onChangeText={setEmpId}
                        placeholder={t('operator_name')}
                        placeholderTextColor={activeColors.textLight}
                    />
                </View>

                <View style={[styles.section, { backgroundColor: activeColors.cardBg, borderColor: activeColors.border }]}>
                    <Label>{t('images')}</Label>
                    <View style={styles.imageGrid}>
                        {images.map((uri, index) => (
                            <View key={index} style={styles.imageContainer}>
                                <Image source={{ uri }} style={styles.capturedImage} />
                                <TouchableOpacity
                                    style={styles.removeImageBtn}
                                    onPress={() => removeImage(index)}
                                >
                                    <Ionicons name="close-circle" size={20} color={COLORS.error} />
                                </TouchableOpacity>
                            </View>
                        ))}
                        {images.length < 3 && (
                            <View style={styles.imagePickerRow}>
                                <TouchableOpacity
                                    style={[styles.imagePickBtn, { backgroundColor: activeColors.background }]}
                                    onPress={() => handlePickImage(true)}
                                >
                                    <Ionicons name="camera" size={24} color={COLORS.primary} />
                                    <Text style={[styles.imagePickText, { color: COLORS.primary }]}>{t('capture_photo')}</Text>
                                </TouchableOpacity>
                                <TouchableOpacity
                                    style={[styles.imagePickBtn, { backgroundColor: activeColors.background }]}
                                    onPress={() => handlePickImage(false)}
                                >
                                    <Ionicons name="images" size={24} color={COLORS.secondary} />
                                    <Text style={[styles.imagePickText, { color: COLORS.secondary }]}>{t('select_photo')}</Text>
                                </TouchableOpacity>
                            </View>
                        )}
                    </View>
                </View>

                <View style={[styles.section, { backgroundColor: activeColors.cardBg, borderColor: activeColors.border }]}>
                    <View style={styles.row}>
                        <View style={{ flex: 1, marginRight: SPACING.sm }}>
                            <Label>{t('amount_label')}</Label>
                            <TextInput
                                style={[styles.input, { color: activeColors.text }]}
                                value={amount}
                                onChangeText={setAmount}
                                keyboardType="numeric"
                                placeholder="0"
                            />
                        </View>
                        <View style={{ flex: 1 }}>
                            <Label>{t('advance_label')}</Label>
                            <TextInput
                                style={[styles.input, { color: activeColors.text }]}
                                value={advance}
                                onChangeText={setAdvance}
                                keyboardType="numeric"
                                placeholder="0"
                            />
                        </View>
                    </View>

                    {/* GST Section */}
                    <View style={{ marginTop: 14 }}>
                        <Text style={[styles.label, { color: activeColors.textLight, marginBottom: 8 }]}>{t('add_gst') || 'Add GST'}</Text>
                        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                            <View style={styles.gstToggleContainer}>
                                <TouchableOpacity
                                    style={[styles.gstToggle, gstType === 'none' && styles.gstToggleActive]}
                                    onPress={() => { setGstType('none'); setGstValue(''); }}
                                >
                                    <Text style={[styles.gstToggleText, gstType === 'none' && styles.gstToggleTextActive]}>None</Text>
                                </TouchableOpacity>
                                <TouchableOpacity
                                    style={[styles.gstToggle, gstType === 'percentage' && styles.gstToggleActive]}
                                    onPress={() => setGstType('percentage')}
                                >
                                    <Text style={[styles.gstToggleText, gstType === 'percentage' && styles.gstToggleTextActive]}>%</Text>
                                </TouchableOpacity>
                                <TouchableOpacity
                                    style={[styles.gstToggle, gstType === 'amount' && styles.gstToggleActive]}
                                    onPress={() => setGstType('amount')}
                                >
                                    <Text style={[styles.gstToggleText, gstType === 'amount' && styles.gstToggleTextActive]}>₹</Text>
                                </TouchableOpacity>
                            </View>

                            {gstType !== 'none' && (
                                <TextInput
                                    style={[styles.input, { width: 100, marginBottom: 0, color: activeColors.text, borderColor: activeColors.border, borderWidth: 1 }]}
                                    value={gstValue}
                                    onChangeText={setGstValue}
                                    keyboardType="numeric"
                                    placeholder={gstType === 'percentage' ? '3' : '0'}
                                    placeholderTextColor={activeColors.textLight}
                                    returnKeyType="done"
                                />
                            )}
                        </View>
                        {(() => {
                            const pAmt = parseFloat(amount) || 0;
                            const pGst = parseFloat(gstValue) || 0;
                            let gVal = 0;
                            if (gstType === 'amount') gVal = pGst;
                            if (gstType === 'percentage') gVal = (pAmt * pGst) / 100;
                            if (gVal > 0) {
                                return (
                                    <View style={{ flexDirection: 'row', justifyContent: 'flex-end', marginTop: 10 }}>
                                        <Text style={{ fontSize: 13, color: activeColors.textLight, marginRight: 8 }}>GST Amount:</Text>
                                        <Text style={{ fontSize: 13, fontWeight: 'bold', color: activeColors.text }}>₹{Math.round(gVal).toLocaleString()}</Text>
                                    </View>
                                )
                            }
                            return null;
                        })()}
                    </View>

                    <View style={styles.divider} />

                    <View style={styles.balanceRow}>
                        <Text style={[styles.balanceLabel, { color: activeColors.textLight }]}>{t('total_due') || 'Total Due'}:</Text>
                        <Text style={[styles.balanceValue, { color: COLORS.primary }]}>
                            ₹{(() => {
                                const amt = parseFloat(amount) || 0;
                                const adv = parseFloat(advance) || 0;
                                const pGst = parseFloat(gstValue) || 0;
                                let gVal = 0;
                                if (gstType === 'amount') gVal = pGst;
                                if (gstType === 'percentage') gVal = (amt * pGst) / 100;
                                return Math.round(amt + gVal - adv).toLocaleString();
                            })()}
                        </Text>
                    </View>
                </View>

                <TouchableOpacity
                    style={[styles.saveBtn, { backgroundColor: COLORS.primary }]}
                    onPress={handleSave}
                    disabled={loading}
                >
                    {loading ? (
                        <ActivityIndicator color="#FFF" />
                    ) : (
                        <>
                            <Ionicons name="print-outline" size={20} color="#FFF" />
                            <Text style={styles.saveBtnText}>{t('save_and_print')}</Text>
                        </>
                    )}
                </TouchableOpacity>

                <TouchableOpacity
                    style={[styles.clearBtn, { borderColor: activeColors.border }]}
                    onPress={() => router.back()}
                >
                    <Text style={[styles.clearBtnText, { color: activeColors.textLight }]}>{t('cancel')}</Text>
                </TouchableOpacity>

                <PrintPreviewModal
                    visible={showPreview}
                    onClose={() => {
                        setShowPreview(false);
                        router.replace('/(tabs)/repairs');
                    }}
                    onPrint={async () => {
                        if (savedRepairData) {
                            try {
                                await printRepair(savedRepairData, shopDetails, empId, receiptConfig, t);
                                setShowPreview(false);
                                router.replace('/(tabs)/repairs');
                            } catch (printError: any) {
                                Alert.alert(t('error'), printError.message || t('print_failed'));
                            }
                        }
                    }}
                    thermalPayload={previewPayload}
                    qrData={savedRepairData?.id}
                    onWidthChange={handleWidthChange}
                />

            </ScrollView>
        </ScreenContainer>
    );
}

const styles = StyleSheet.create({
    header: {
        paddingTop: 20,
        paddingBottom: 0,
        paddingHorizontal: SPACING.md,
        borderBottomLeftRadius: 25,
        borderBottomRightRadius: 25,
    },
    headerTop: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    backButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        justifyContent: 'center',
        alignItems: 'center',
    },
    headerTitle: {
        fontSize: FONT_SIZES.xl,
        fontWeight: 'bold',
    },
    scrollContent: {
        padding: SPACING.md,
        paddingBottom: 50,
    },
    section: {
        borderRadius: BORDER_RADIUS.lg,
        padding: SPACING.md,
        marginBottom: SPACING.md,
        borderWidth: 1,
    },
    label: {
        fontSize: 12,
        fontWeight: '600',
        marginBottom: 6,
        marginLeft: 2,
    },
    input: {
        backgroundColor: 'rgba(0,0,0,0.03)',
        borderRadius: BORDER_RADIUS.md,
        paddingHorizontal: SPACING.sm,
        paddingVertical: 10,
        fontSize: FONT_SIZES.md,
        marginBottom: SPACING.md,
    },
    row: {
        flexDirection: 'row',
        justifyContent: 'space-between',
    },
    typeToggle: {
        flexDirection: 'row',
        backgroundColor: 'rgba(0,0,0,0.05)',
        borderRadius: BORDER_RADIUS.md,
        padding: 4,
    },
    typeBtn: {
        flex: 1,
        paddingVertical: 6,
        alignItems: 'center',
        borderRadius: BORDER_RADIUS.sm,
    },
    typeBtnActive: {
        backgroundColor: '#FFF',
        elevation: 2,
    },
    typeBtnText: {
        fontSize: 12,
        fontWeight: 'bold',
        color: '#888',
    },
    typeBtnTextActive: {
        color: COLORS.primary,
    },
    imageGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
    },
    imageContainer: {
        width: 80,
        height: 80,
        marginRight: 10,
        marginBottom: 10,
        borderRadius: 8,
        overflow: 'hidden',
    },
    capturedImage: {
        width: '100%',
        height: '100%',
    },
    removeImageBtn: {
        position: 'absolute',
        top: 2,
        right: 2,
        backgroundColor: '#FFF',
        borderRadius: 10,
    },
    imagePickerRow: {
        flexDirection: 'row',
        width: '100%',
        justifyContent: 'space-between',
        marginTop: 5,
    },
    imagePickBtn: {
        flex: 1,
        height: 80,
        borderRadius: 8,
        borderWidth: 1,
        borderStyle: 'dashed',
        borderColor: COLORS.primary,
        justifyContent: 'center',
        alignItems: 'center',
        marginHorizontal: 5,
    },
    imagePickText: {
        fontSize: 10,
        fontWeight: 'bold',
        marginTop: 4,
    },
    balanceRow: {
        flexDirection: 'row',
        justifyContent: 'flex-end',
        alignItems: 'center',
        marginTop: SPACING.sm,
    },
    balanceLabel: {
        fontSize: FONT_SIZES.md,
        fontWeight: '600',
        marginRight: 10,
    },
    balanceValue: {
        fontSize: FONT_SIZES.lg,
        fontWeight: 'bold',
    },
    saveBtn: {
        flexDirection: 'row',
        height: 50,
        borderRadius: BORDER_RADIUS.lg,
        justifyContent: 'center',
        alignItems: 'center',
        marginTop: SPACING.md,
        elevation: 4,
    },
    saveBtnText: {
        color: '#FFF',
        fontSize: FONT_SIZES.lg,
        fontWeight: 'bold',
        marginLeft: 10,
    },
    clearBtn: {
        height: 50,
        borderRadius: BORDER_RADIUS.lg,
        borderWidth: 1,
        justifyContent: 'center',
        alignItems: 'center',
        marginTop: SPACING.sm,
    },
    clearBtnText: {
        fontSize: FONT_SIZES.md,
        fontWeight: '600',
    },
    divider: {
        height: 1,
        backgroundColor: 'rgba(0,0,0,0.1)',
        marginVertical: 15,
    },
    gstToggleContainer: {
        flexDirection: 'row',
        backgroundColor: 'rgba(0,0,0,0.06)',
        borderRadius: 8,
        padding: 2,
    },
    gstToggle: {
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 6,
    },
    gstToggleActive: {
        backgroundColor: COLORS.primary,
    },
    gstToggleText: {
        fontSize: 13,
        fontWeight: 'bold',
        color: '#777',
    },
    gstToggleTextActive: {
        color: '#FFF',
    },
});
