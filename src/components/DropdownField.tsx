import React, { useState } from 'react';
import { View as RNView, Text as RNText, TouchableOpacity, Modal as RNModal, FlatList as RNFlatList, StyleSheet, ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SPACING, FONT_SIZES, BORDER_RADIUS, LIGHT_COLORS, DARK_COLORS } from '../constants/theme';
import { useGeneralSettings } from '../store/GeneralSettingsContext';

// Fix for React 19 type mismatch
const Icon = Ionicons as any;
const View = RNView as any;
const Text = RNText as any;
const Modal = RNModal as any;
const FlatList = RNFlatList as any;

interface DropdownFieldProps {
    label?: string;
    value: string;
    options: { label: string; value: string }[];
    onSelect: (value: string) => void;
    placeholder?: string;
    error?: string;
    style?: ViewStyle;
}

export default function DropdownField({
    label,
    value,
    options,
    onSelect,
    placeholder = 'Select Option',
    error,
    style,
}: DropdownFieldProps) {
    const { theme } = useGeneralSettings();
    const activeColors = theme === 'light' ? LIGHT_COLORS : DARK_COLORS;
    const [visible, setVisible] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const selectedOption = options.find(opt => opt.value === value);

    const filteredOptions = searchQuery
        ? options.filter(opt => opt.label.toLowerCase().includes(searchQuery.toLowerCase()))
        : options;

    const handleSelect = (val: string) => {
        onSelect(val);
        setVisible(false);
        setSearchQuery('');
    };

    return (
        <View style={[styles.container, style]}>
            {label && <Text style={[styles.label, { color: activeColors.text }]}>{label}</Text>}
            <TouchableOpacity
                style={[
                    styles.dropdown,
                    { backgroundColor: activeColors.cardBg, borderColor: activeColors.border },
                    error ? { borderColor: activeColors.error, backgroundColor: activeColors.error + '10' } : null
                ]}
                onPress={() => setVisible(true)}
            >
                <Text style={[styles.valueText, { color: activeColors.text }, !value && { color: activeColors.textLight }]}>
                    {selectedOption ? selectedOption.label : placeholder}
                </Text>
                <Icon name="chevron-down" size={20} color={activeColors.textLight} />
            </TouchableOpacity>

            <Modal visible={visible} transparent animationType="fade">
                <TouchableOpacity
                    style={styles.modalOverlay}
                    activeOpacity={1}
                    onPress={() => {
                        setVisible(false);
                        setSearchQuery('');
                    }}
                >
                    <View style={[styles.modalContent, { backgroundColor: activeColors.cardBg }]}>
                        <View style={[styles.searchContainer, { borderBottomColor: activeColors.border }]}>
                            <Icon name="search-outline" size={20} color={activeColors.textLight} />
                            <RNView style={{ flex: 1, marginLeft: SPACING.sm }}>
                                <DropdownFieldSearchInput
                                    activeColors={activeColors}
                                    value={searchQuery}
                                    onChange={setSearchQuery}
                                />
                            </RNView>
                            {searchQuery.length > 0 && (
                                <TouchableOpacity onPress={() => setSearchQuery('')}>
                                    <Icon name="close-circle" size={20} color={activeColors.textLight} />
                                </TouchableOpacity>
                            )}
                        </View>
                        <FlatList
                            data={filteredOptions}
                            keyExtractor={(item: { value: any; }) => item.value}
                            renderItem={({ item }: { item: { label: string; value: string } }) => (
                                <TouchableOpacity
                                    style={[styles.option, { borderBottomColor: activeColors.border }]}
                                    onPress={() => handleSelect(item.value)}
                                >
                                    <Text style={[
                                        styles.optionText,
                                        { color: activeColors.text },
                                        item.value === value && { color: activeColors.primary, fontWeight: 'bold' }
                                    ]}>
                                        {item.label}
                                    </Text>
                                    {item.value === value && <Icon name="checkmark" size={20} color={activeColors.primary} />}
                                </TouchableOpacity>
                            )}
                            ListEmptyComponent={() => (
                                <View style={{ padding: SPACING.lg, alignItems: 'center' }}>
                                    <Text style={{ color: activeColors.textLight }}>No results found</Text>
                                </View>
                            )}
                        />
                    </View>
                </TouchableOpacity>
            </Modal>
            {error && <Text style={[styles.errorText, { color: activeColors.error }]}>{error}</Text>}
        </View>
    );
}

const DropdownFieldSearchInput = ({ activeColors, value, onChange }: any) => {
    // We use a raw TextInput here for search
    const { TextInput } = require('react-native');
    return (
        <TextInput
            placeholder="Search..."
            placeholderTextColor={activeColors.textLight}
            value={value}
            onChangeText={onChange}
            style={{ color: activeColors.text, fontSize: FONT_SIZES.md, padding: 0 }}
            autoFocus={true}
        />
    );
};

const styles = StyleSheet.create({
    container: {
        marginBottom: SPACING.sm,
    },
    label: {
        fontSize: FONT_SIZES.sm,
        marginBottom: 2,
        fontWeight: '600',
        minHeight: 18,
    },
    dropdown: {
        height: 48,
        borderWidth: 1.5,
        borderRadius: BORDER_RADIUS.md,
        paddingHorizontal: SPACING.md,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    valueText: {
        fontSize: FONT_SIZES.md,
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'center',
        padding: SPACING.xl,
    },
    modalContent: {
        borderRadius: BORDER_RADIUS.lg,
        maxHeight: '60%',
        padding: SPACING.sm,
    },
    option: {
        padding: SPACING.sm,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        borderBottomWidth: 1,
    },
    optionText: {
        fontSize: FONT_SIZES.md,
    },
    errorText: {
        fontSize: FONT_SIZES.xs,
        marginTop: 2,
    },
    searchContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: SPACING.sm,
        borderBottomWidth: 1,
        marginBottom: SPACING.xs,
    },
});
