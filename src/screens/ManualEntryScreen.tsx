import React, { useState } from 'react';
import { StyleSheet, ScrollView as RNScrollView, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import ScreenContainer from '../components/ScreenContainer';
import HeaderBar from '../components/HeaderBar';
import InputField from '../components/InputField';
import DropdownField from '../components/DropdownField';
import PrimaryButton from '../components/PrimaryButton';
import { useEstimation } from '../store/EstimationContext';
import { calculateItemTotal } from '../utils/calculations';
import { SPACING } from '../constants/theme';
import { useGeneralSettings } from '../store/GeneralSettingsContext';
import { EstimationItem, MakingChargeType, WastageType } from '../types';

// Fix for React 19 type mismatch
const ScrollView = RNScrollView as any;

export default function ManualEntryScreen() {
    const router = useRouter();
    const { addManualItem, state } = useEstimation();
    const { t, showAlert } = useGeneralSettings();

    const [name, setName] = useState('');
    const [weight, setWeight] = useState('');
    const [purity, setPurity] = useState('22');
    const [mc, setMc] = useState('');
    const [makingChargeType, setMakingChargeType] = useState<MakingChargeType>('perGram');
    const [wastage, setWastage] = useState('');
    const [wastageType, setWastageType] = useState<WastageType>('percentage');

    const [errors, setErrors] = useState<any>({});

    const validate = () => {
        let valid = true;
        let newErrors: any = {};

        if (!name) { newErrors.name = 'Product name is required'; valid = false; }
        if (!weight || isNaN(Number(weight))) { newErrors.weight = 'Valid weight is required'; valid = false; }
        if (!mc || isNaN(Number(mc))) { newErrors.mc = 'Valid MC is required'; valid = false; }
        if (!wastage || isNaN(Number(wastage))) { newErrors.wastage = 'Valid Wastage is required'; valid = false; }

        setErrors(newErrors);
        return valid;
    };

    const handleAdd = () => {
        if (!validate()) return;

        const weightNum = parseFloat(weight);
        const mcNum = parseFloat(mc);
        const wastageNum = parseFloat(wastage);
        const rate = state.goldRate.rate22k; // Default to 22k for manual

        const calculations = calculateItemTotal(weightNum, rate, mcNum, makingChargeType, wastageNum, wastageType);

        const newItem: EstimationItem = {
            id: Date.now().toString(),
            name,
            pcs: 1,
            metal: 'GOLD' as 'GOLD' | 'SILVER',
            grossWeight: weightNum,
            stoneWeight: 0,
            netWeight: weightNum,
            purity: parseInt(purity),
            makingCharge: mcNum,
            makingChargeType,
            wastage: wastageNum,
            wastageType,
            isManual: true,
            rate,
            goldValue: calculations.goldValue,
            makingChargeValue: calculations.makingChargeValue,
            wastageValue: calculations.wastageValue,
            gstValue: calculations.gstValue,
            totalValue: calculations.total,
        };

        addManualItem(newItem);
        showAlert('Success', 'Item added to estimation', 'success', [
            { text: 'Add More', onPress: resetForm },
            { text: 'View Summary', onPress: () => router.push('/summary') }
        ]);
    };

    const resetForm = () => {
        setName('');
        setWeight('');
        setMc('');
        setWastage('');
        setErrors({});
    };

    return (
        <ScreenContainer>
            <HeaderBar title="Manual Entry" showBack />
            <ScrollView contentContainerStyle={styles.content}>
                <InputField
                    label="Product Name"
                    value={name}
                    onChangeText={setName}
                    placeholder="e.g., Gold Bangle"
                    error={errors.name}
                />
                <InputField
                    label="Weight (g)"
                    value={weight}
                    onChangeText={setWeight}
                    keyboardType="numeric"
                    placeholder="0.000"
                    error={errors.weight}
                />
                <InputField
                    label="Purity (K)"
                    value={purity}
                    onChangeText={setPurity}
                    keyboardType="numeric"
                    placeholder="22"
                />
                <DropdownField
                    label="Making Charge Type"
                    value={makingChargeType}
                    options={[
                        { label: 'Per Gram', value: 'perGram' },
                        { label: 'Fixed', value: 'fixed' },
                    ]}
                    onSelect={(val) => setMakingChargeType(val as MakingChargeType)}
                />
                <InputField
                    label="Wastage"
                    value={wastage}
                    onChangeText={setWastage}
                    keyboardType="numeric"
                    placeholder="0.00"
                    error={errors.wastage}
                />
                <DropdownField
                    label="Wastage Type"
                    value={wastageType}
                    options={[
                        { label: 'Percentage (%)', value: 'percentage' },
                        { label: 'Weight (g)', value: 'weight' },
                    ]}
                    onSelect={(val) => setWastageType(val as WastageType)}
                />

                <PrimaryButton
                    title="Add to Estimation"
                    onPress={handleAdd}
                    style={styles.addButton}
                />
            </ScrollView>
        </ScreenContainer>
    );
}

const styles = StyleSheet.create({
    content: {
        padding: SPACING.lg,
    },
    addButton: {
        marginTop: SPACING.xl,
    },
});
