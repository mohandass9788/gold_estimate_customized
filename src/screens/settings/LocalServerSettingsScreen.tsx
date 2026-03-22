import React, { useState } from 'react';
import { View as RNView, Text as RNText, StyleSheet, ScrollView as RNScrollView, Switch, TextInput as RNTextInput, Platform, Alert } from 'react-native';
import { useGeneralSettings } from '../../store/GeneralSettingsContext';
import { useAuth } from '../../store/AuthContext';
import { COLORS, SPACING, FONT_SIZES, BORDER_RADIUS, LIGHT_COLORS, DARK_COLORS } from '../../constants/theme';
import ScreenContainer from '../../components/ScreenContainer';
import HeaderBar from '../../components/HeaderBar';
import PrimaryButton from '../../components/PrimaryButton';
import axios from 'axios';

const View = RNView as any;
const Text = RNText as any;
const ScrollView = RNScrollView as any;
const TextInput = RNTextInput as any;

export default function LocalServerSettingsScreen() {
    const { 
        theme, t, localServerUrl, updateLocalServerUrl, 
        localQrEndpoint, updateLocalQrEndpoint,
        localSaveEndpoint, updateLocalSaveEndpoint,
        useLocalServerForScanning, setUseLocalServerForScanning 
    } = useGeneralSettings();
    const { currentUser } = useAuth();
    
    const activeColors = theme === 'light' ? LIGHT_COLORS : DARK_COLORS;
    const [isTesting, setIsTesting] = useState(false);
    const [testTag, setTestTag] = useState('TAG001');
    const [isTestQrModalVisible, setIsTestQrModalVisible] = useState(false);
    const [isTestSaveModalVisible, setIsTestSaveModalVisible] = useState(false);

    const handleTestQr = async () => {
        if (!localServerUrl) {
            Alert.alert(t('error') || 'Error', t('base_url_required') || 'Please enter a Base URL first');
            return;
        }
        
        if (Platform.OS === 'ios') {
            Alert.prompt(
                t('test_qr_endpoint') || 'Test QR Endpoint',
                t('enter_tag_to_test') || 'Enter a Tag Number to test fetching details:',
                [
                    { text: t('cancel') || 'Cancel', style: 'cancel' },
                    {
                        text: t('test') || 'Test',
                        onPress: (tag?: string) => executeQrTest(tag || testTag)
                    }
                ],
                'plain-text',
                testTag
            );
        } else {
            // For Android, show a simple Alert to confirm using the current testTag value or just use a custom modal
            // But for simplicity, I'll just use a direct test or I'll implement a custom input here soon.
            // Actually, I'll just add the Test Tag Number input to the screen.
            executeQrTest(testTag);
        }
    };

    const executeQrTest = async (tag: string) => {
        setIsTesting(true);
        const baseUrl = localServerUrl.replace(/\/+$/, '');
        const endpoint = localQrEndpoint.replace(/^\/+/, '');
        const url = `${baseUrl}/${endpoint}/${tag}`;
        
        console.log('--- LOCAL SERVER SCAN TEST (GET) ---');
        console.log('URL:', url);
        
        try {
            const res = await axios.get(url, { timeout: 10000 });
            console.log('Response Status:', res.status);
            console.log('Response Data:', res.data);
            
            Alert.alert(
                t('test_successful') || 'Test Successful',
                `Status: ${res.status}\n\nData:\n${JSON.stringify(res.data, null, 2)}`
            );
        } catch (e: any) {
            console.error('Test Failed:', e);
            const errorDetail = e.response ? `Status: ${e.response.status}\nData: ${JSON.stringify(e.response.data)}` : e.message;
            Alert.alert(t('test_failed') || 'Test Failed', errorDetail);
        } finally {
            setIsTesting(false);
        }
    };

    const handleTestSave = async () => {
        if (!localServerUrl) {
            Alert.alert(t('error') || 'Error', t('base_url_required') || 'Please enter a Base URL first');
            return;
        }

        const samplePayload = {
            id: 'EST-' + Date.now(),
            customer: {
                name: 'Test Customer',
                phone: '9876543210',
                address: '123 Test Street'
            },
            employee: {
                id: currentUser?.id || 'EMP001',
                name: currentUser?.username || 'Admin'
            },
            items: [
                {
                    tag: 'TAG001',
                    name: 'Gold Ring',
                    weight: 4.5,
                    purity: '22K',
                    rate: 6000,
                    total: 27000,
                    making_charges: 500,
                    wastage: 0.2
                },
                {
                    tag: 'TAG002',
                    name: 'Gold Chain',
                    weight: 12.0,
                    purity: '22K',
                    rate: 6000,
                    total: 72000,
                    making_charges: 1200,
                    wastage: 0.5
                }
            ],
            purchase_items: [
                {
                    name: 'Old Gold',
                    weight: 2.0,
                    purity: '18K',
                    amount: 10000
                }
            ],
            totals: {
                subtotal: 99000,
                purchase_deduction: 10000,
                tax: 2670,
                grandTotal: 91670,
                discount: 500
            },
            date: new Date().toISOString(),
            status: 'completed',
            isTest: true,
            syncStatus: 'pending',
            shopId: 'SHOP001'
        };

        Alert.alert(
            t('confirm_test_save') || 'Confirm Test Save',
            `${t('save_test_preview') || 'The following data will be sent to the local server:'}\n\n${JSON.stringify(samplePayload, null, 2)}`,
            [
                { text: t('cancel') || 'Cancel', style: 'cancel' },
                { 
                    text: t('send_test') || 'Send Test', 
                    onPress: () => executeSaveTest(samplePayload)
                }
            ]
        );
    };

    const executeSaveTest = async (payload: any) => {
        setIsTesting(true);
        const url = localServerUrl.replace(/\/+$/, '') + '/' + localSaveEndpoint.replace(/^\/+/, '');
        
        console.log('--- LOCAL SERVER SAVE TEST ---');
        console.log('URL:', url);
        console.log('Payload:', payload);

        try {
            const res = await axios.post(url, payload, { timeout: 10000 });
            console.log('Response Status:', res.status);
            console.log('Response Data:', res.data);
            
            Alert.alert(
                t('test_successful') || 'Test Successful', 
                `Status: ${res.status}\n\nLocal save endpoint responded successfully.`
            );
        } catch (e: any) {
            console.error('Test Failed:', e);
            const errorDetail = e.response ? `Status: ${e.response.status}\nData: ${JSON.stringify(e.response.data)}` : e.message;
            Alert.alert(t('test_failed') || 'Test Failed', errorDetail);
        } finally {
            setIsTesting(false);
        }
    };

    return (
        <ScreenContainer backgroundColor={activeColors.background}>
            <HeaderBar title={t('local_server_settings') || 'Local Server Config'} showBack />
            
            <ScrollView style={styles.content} contentContainerStyle={styles.scrollContent}>
                <View style={[styles.card, { backgroundColor: activeColors.cardBg }]}>
                    <View style={styles.row}>
                        <View style={{ flex: 1 }}>
                            <Text style={[styles.cardTitle, { color: activeColors.text }]}>{t('use_local_server') || 'Use Local Server'}</Text>
                            <Text style={[styles.cardSub, { color: activeColors.textLight }]}>{t('local_server_desc') || 'When enabled, the app will scan tags and save estimations using your local server.'}</Text>
                        </View>
                        <Switch
                            value={useLocalServerForScanning}
                            onValueChange={setUseLocalServerForScanning}
                            trackColor={{ false: '#767577', true: COLORS.primary + '80' }}
                            thumbColor={useLocalServerForScanning ? COLORS.primary : '#f4f3f4'}
                        />
                    </View>
                </View>

                <View style={[styles.card, { backgroundColor: activeColors.cardBg, marginTop: SPACING.lg }]}>
                    <Text style={[styles.sectionTitle, { color: activeColors.primary }]}>{t('server_connection') || 'Connection Details'}</Text>
                    
                    <Text style={[styles.label, { color: activeColors.text }]}>{t('base_url') || 'Base URL (e.g., http://192.168.1.50:5000)'}</Text>
                    <TextInput
                        style={[styles.input, { backgroundColor: activeColors.background, color: activeColors.text, borderColor: activeColors.border }]}
                        value={localServerUrl}
                        onChangeText={updateLocalServerUrl}
                        placeholder="http://192.168.x.x:5000"
                        autoCapitalize="none"
                        keyboardType="url"
                    />

                    <View style={styles.endpointRow}>
                        <View style={{ flex: 1, marginRight: SPACING.md }}>
                            <Text style={[styles.label, { color: activeColors.text }]}>{t('qr_endpoint') || 'QR Scan Endpoint'}</Text>
                            <TextInput
                                style={[styles.input, { backgroundColor: activeColors.background, color: activeColors.text, borderColor: activeColors.border }]}
                                value={localQrEndpoint}
                                onChangeText={updateLocalQrEndpoint}
                                placeholder="/api/product/scan-tag"
                                autoCapitalize="none"
                            />
                            <Text style={[styles.label, { color: activeColors.text, marginTop: SPACING.sm }]}>{t('test_tag_number') || 'Test Tag Number'}</Text>
                            <TextInput
                                style={[styles.input, { backgroundColor: activeColors.background, color: activeColors.text, borderColor: activeColors.border, height: 40, paddingVertical: 5 }]}
                                value={testTag}
                                onChangeText={setTestTag}
                                placeholder="TAG001"
                                autoCapitalize="none"
                            />
                        </View>
                        <PrimaryButton
                            title={t('test') || 'Test'}
                            onPress={handleTestQr}
                            style={styles.testBtn as any}
                            isLoading={isTesting}
                        />
                    </View>

                    <View style={styles.endpointRow}>
                        <View style={{ flex: 1, marginRight: SPACING.md }}>
                            <Text style={[styles.label, { color: activeColors.text }]}>{t('save_endpoint') || 'Save Estimation Endpoint'}</Text>
                            <TextInput
                                style={[styles.input, { backgroundColor: activeColors.background, color: activeColors.text, borderColor: activeColors.border }]}
                                value={localSaveEndpoint}
                                onChangeText={updateLocalSaveEndpoint}
                                placeholder="/api/estimation/save"
                                autoCapitalize="none"
                            />
                        </View>
                        <PrimaryButton
                            title={t('test') || 'Test'}
                            onPress={handleTestSave}
                            style={styles.testBtn as any}
                            isLoading={isTesting}
                        />
                    </View>
                </View>

                <View style={styles.infoBox}>
                    <Text style={[styles.infoText, { color: activeColors.textLight }]}>
                        {t('local_server_info') || 'Ensure your mobile device and local server are on the same Wi-Fi network. Use the IP address of your computer instead of localhost.'}
                    </Text>
                </View>
            </ScrollView>
        </ScreenContainer>
    );
}

const styles = StyleSheet.create({
    content: {
        flex: 1,
    },
    scrollContent: {
        padding: SPACING.md,
    },
    card: {
        padding: SPACING.lg,
        borderRadius: BORDER_RADIUS.lg,
        elevation: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
    },
    row: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    cardTitle: {
        fontSize: FONT_SIZES.md,
        fontWeight: 'bold',
        marginBottom: 4,
    },
    cardSub: {
        fontSize: FONT_SIZES.xs,
        lineHeight: 18,
    },
    sectionTitle: {
        fontSize: FONT_SIZES.sm,
        fontWeight: 'bold',
        marginBottom: SPACING.md,
        textTransform: 'uppercase',
        letterSpacing: 1,
    },
    label: {
        fontSize: FONT_SIZES.xs,
        fontWeight: '600',
        marginBottom: 8,
        marginTop: SPACING.md,
    },
    input: {
        borderWidth: 1,
        borderRadius: BORDER_RADIUS.md,
        padding: SPACING.md,
        fontSize: FONT_SIZES.sm,
    },
    endpointRow: {
        flexDirection: 'row',
        alignItems: 'flex-end',
        marginTop: SPACING.sm,
    },
    testBtn: {
        height: 48,
        paddingHorizontal: SPACING.lg,
    },
    infoBox: {
        marginTop: SPACING.xl,
        padding: SPACING.md,
        opacity: 0.8,
    },
    infoText: {
        fontSize: FONT_SIZES.xs,
        textAlign: 'center',
        lineHeight: 20,
    }
});
