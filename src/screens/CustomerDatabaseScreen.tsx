import React, { useState, useEffect } from 'react';
import { View as RNView, Text as RNText, StyleSheet, FlatList as RNFlatList, TouchableOpacity as RNRTouchableOpacity, ActivityIndicator as RNActivityIndicator, TextInput as RNTextInput } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import ScreenContainer from '../components/ScreenContainer';
import HeaderBar from '../components/HeaderBar';
import { COLORS, SPACING, FONT_SIZES, BORDER_RADIUS, LIGHT_COLORS, DARK_COLORS } from '../constants/theme';
import { useGeneralSettings } from '../store/GeneralSettingsContext';
import { getCustomers, deleteCustomer, DBCustomer, saveCustomer, updateCustomer } from '../services/dbService';
import CustomerDetailsModal from '../modals/CustomerDetailsModal';
import { Customer } from '../types';
import { useSubscriptionRestricted } from '../hooks/useSubscriptionRestricted';

const View = RNView as any;
const Text = RNText as any;
const Icon = Ionicons as any;
const TouchableOpacity = RNRTouchableOpacity as any;
const ActivityIndicator = RNActivityIndicator as any;
const FlatList = RNFlatList as any;
const TextInput = RNTextInput as any;

export default function CustomerDatabaseScreen() {
    const { theme, t, showAlert } = useGeneralSettings();
    const activeColors = theme === 'light' ? LIGHT_COLORS : DARK_COLORS;

    const [customers, setCustomers] = useState<DBCustomer[]>([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [isLoading, setIsLoading] = useState(true);
    const [showAddModal, setShowAddModal] = useState(false);
    const [editingCustomer, setEditingCustomer] = useState<DBCustomer | null>(null);

    const { verifyAccess } = useSubscriptionRestricted();

    const loadCustomers = async () => {
        setIsLoading(true);
        try {
            const data = await getCustomers(searchQuery);
            setCustomers(data);
        } catch (error) {
            console.error('Failed to load customers:', error);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        loadCustomers();
    }, [searchQuery]);

    const handleDelete = (id: number, name: string) => {
        showAlert(
            t('confirm_delete') || 'Confirm Delete',
            t('delete_customer_msg', { name }) || `Are you sure you want to delete ${name}?`,
            'warning',
            [
                { text: t('cancel'), style: 'cancel' },
                {
                    text: t('delete'),
                    style: 'destructive',
                    onPress: async () => {
                        await deleteCustomer(id);
                        loadCustomers();
                    }
                }
            ]
        );
    };

    const handleProtectedDelete = (id: number, name: string) => {
        verifyAccess(() => handleDelete(id, name));
    };

    const handleAddCustomer = async (data: Customer) => {
        try {
            if (editingCustomer) {
                await updateCustomer(editingCustomer.id, data.name, data.mobile, data.address);
            } else {
                await saveCustomer(data.name, data.mobile, data.address);
            }
            setEditingCustomer(null);
            loadCustomers();
        } catch (error: any) {
            showAlert(t('error'), error.message || 'Failed to save customer', 'error');
        }
    };

    const renderItem = ({ item }: { item: DBCustomer }) => (
        <View style={[styles.customerCard, { backgroundColor: activeColors.cardBg, borderColor: activeColors.border }]}>
            <View style={styles.cardContent}>
                <View style={[styles.avatar, { backgroundColor: activeColors.primary + '20' }]}>
                    <Text style={[styles.avatarText, { color: activeColors.primary }]}>
                        {item.name.substring(0, 1).toUpperCase()}
                    </Text>
                </View>
                <View style={styles.infoContainer}>
                    <Text style={[styles.customerName, { color: activeColors.text }]}>{item.name}</Text>
                    <View style={styles.mobileRow}>
                        <Icon name="call-outline" size={14} color={activeColors.textLight} />
                        <Text style={[styles.customerMobile, { color: activeColors.textLight }]}> {item.mobile}</Text>
                    </View>
                    {item.address1 && (
                        <View style={styles.mobileRow}>
                            <Icon name="location-outline" size={14} color={activeColors.textLight} />
                            <Text style={[styles.customerMobile, { color: activeColors.textLight }]}> {item.address1}</Text>
                        </View>
                    )}
                </View>
            </View>
            <View style={styles.cardActions}>
                <TouchableOpacity
                    onPress={() => verifyAccess(() => { setEditingCustomer(item); setShowAddModal(true); })}
                    style={styles.actionIcon}
                >
                    <Icon name="pencil-outline" size={20} color={activeColors.primary} />
                </TouchableOpacity>
                <TouchableOpacity
                    onPress={() => handleProtectedDelete(item.id, item.name)}
                    style={styles.actionIcon}
                >
                    <Icon name="trash-outline" size={20} color={COLORS.error} />
                </TouchableOpacity>
            </View>
        </View>
    );

    return (
        <ScreenContainer>
            <HeaderBar
                title={t('customers') || "Customers"}
                showBack
            />

            <View style={styles.searchContainer}>
                <View style={[styles.searchBar, { backgroundColor: activeColors.cardBg, borderColor: activeColors.border }]}>
                    <Icon name="search-outline" size={20} color={activeColors.textLight} />
                    <TextInput
                        style={[styles.searchInput, { color: activeColors.text }]}
                        placeholder={t('search_customers') || "Search name or mobile..."}
                        placeholderTextColor={activeColors.textLight}
                        value={searchQuery}
                        onChangeText={setSearchQuery}
                    />
                    {searchQuery.length > 0 && (
                        <TouchableOpacity onPress={() => setSearchQuery('')}>
                            <Icon name="close-circle" size={18} color={activeColors.textLight} />
                        </TouchableOpacity>
                    )}
                </View>
            </View>

            {isLoading ? (
                <View style={styles.centerContainer}>
                    <ActivityIndicator size="large" color={activeColors.primary} />
                </View>
            ) : (
                <FlatList
                    data={customers}
                    renderItem={renderItem}
                    keyExtractor={(item: any) => item.id.toString()}
                    contentContainerStyle={styles.listContent}
                    ListEmptyComponent={
                        <View style={styles.emptyContainer}>
                            <Icon name="people-outline" size={64} color={activeColors.border} />
                            <Text style={[styles.emptyText, { color: activeColors.textLight }]}>
                                {searchQuery ? t('no_customers_found') : t('no_customers_yet')}
                            </Text>
                        </View>
                    }
                />
            )}

            <CustomerDetailsModal
                visible={showAddModal}
                onClose={() => {
                    setShowAddModal(false);
                    setEditingCustomer(null);
                }}
                onSubmit={handleAddCustomer}
                initialData={editingCustomer ? {
                    name: editingCustomer.name,
                    mobile: editingCustomer.mobile,
                    address: editingCustomer.address1
                } : null}
            />

            <TouchableOpacity
                style={[styles.fab, { backgroundColor: activeColors.primary }]}
                onPress={() => verifyAccess(() => { setEditingCustomer(null); setShowAddModal(true); })}
                activeOpacity={0.8}
            >
                <Icon name="person-add" size={28} color="#FFF" />
            </TouchableOpacity>
        </ScreenContainer>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    searchContainer: {
        padding: SPACING.md,
    },
    searchBar: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: SPACING.md,
        height: 50,
        borderRadius: BORDER_RADIUS.md,
        borderWidth: 1,
    },
    searchInput: {
        flex: 1,
        marginLeft: SPACING.sm,
        fontSize: FONT_SIZES.md,
    },
    listContent: {
        padding: SPACING.md,
        paddingBottom: 100,
    },
    customerCard: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: SPACING.md,
        borderRadius: BORDER_RADIUS.lg,
        marginBottom: SPACING.md,
        borderWidth: 1,
        elevation: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
    },
    cardContent: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
    },
    avatar: {
        width: 50,
        height: 50,
        borderRadius: 25,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: SPACING.md,
    },
    avatarText: {
        fontSize: FONT_SIZES.xl,
        fontWeight: 'bold',
    },
    infoContainer: {
        flex: 1,
    },
    customerName: {
        fontSize: FONT_SIZES.lg,
        fontWeight: 'bold',
        marginBottom: 2,
    },
    mobileRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 2,
    },
    customerMobile: {
        fontSize: FONT_SIZES.sm,
    },
    cardActions: {
        flexDirection: 'row',
    },
    actionIcon: {
        padding: SPACING.sm,
        marginLeft: SPACING.xs,
    },
    centerContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    emptyContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        marginTop: 100,
    },
    emptyText: {
        marginTop: SPACING.md,
        fontSize: FONT_SIZES.md,
    },
    fab: {
        position: 'absolute',
        right: SPACING.lg,
        bottom: SPACING.lg,
        width: 60,
        height: 60,
        borderRadius: 30,
        justifyContent: 'center',
        alignItems: 'center',
        elevation: 5,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 3.84,
    }
});
