import React from 'react';
import { View as RNView, StyleSheet, KeyboardAvoidingView, Platform } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LIGHT_COLORS, DARK_COLORS } from '../constants/theme';
import { useGeneralSettings } from '../store/GeneralSettingsContext';
import PrintDetailsModal from '../modals/PrintDetailsModal';
import StatusSnackbar from './StatusSnackbar';
import { useEstimation } from '../store/EstimationContext';
import RateUpdateModal from './RateUpdateModal';
import { useRouter } from 'expo-router';
import { isSameDay } from 'date-fns';
import CustomAlertModal from './CustomAlertModal';

const View = RNView as any;

interface ScreenContainerProps {
    children: React.ReactNode;
    backgroundColor?: string;
    keyboardAvoiding?: boolean;
}

export default function ScreenContainer({ children, backgroundColor, keyboardAvoiding = true }: ScreenContainerProps) {
    const {
        theme, showPrintDetailsModal, setShowPrintDetailsModal, handlePrintConfirm,
        isPrinterConnected, printerType, t, alertConfig, hideAlert,
        connectionStatus, printDetailsModalInitialData
    } = useGeneralSettings();
    const { state, updateGoldRate } = useEstimation();
    const router = useRouter();
    const activeColors = theme === 'light' ? LIGHT_COLORS : DARK_COLORS;

    const [rateSnackbarVisible, setRateSnackbarVisible] = React.useState(false);
    const [printerSnackbarVisible, setPrinterSnackbarVisible] = React.useState(false);
    const [printerMessage, setPrinterMessage] = React.useState('');
    const [isRateModalVisible, setIsRateModalVisible] = React.useState(false);

    // Gold Rate Staleness & Zero Check
    React.useEffect(() => {
        const checkRates = () => {
            const now = new Date();
            const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;

            let rateDateStr = '';
            if (state.goldRate.date) {
                const rDate = new Date(state.goldRate.date);
                rateDateStr = `${rDate.getFullYear()}-${String(rDate.getMonth() + 1).padStart(2, '0')}-${String(rDate.getDate()).padStart(2, '0')}`;
            }

            const isStale = rateDateStr !== todayStr;
            const isZero = state.goldRate.rate22k === 0 || state.goldRate.rate24k === 0;

            if (isStale || isZero) {
                setRateSnackbarVisible(true);
            } else {
                setRateSnackbarVisible(false);
            }
        };

        checkRates();
        const interval = setInterval(checkRates, 10000); // Check every 10 seconds
        return () => clearInterval(interval);
    }, [state.goldRate]);

    // Printer Connection Monitor & Persistent Status
    const prevConnectedRef = React.useRef(isPrinterConnected);
    React.useEffect(() => {
        if (printerType === 'thermal') {
            // Priority 1: Persistent Error if disconnected and NOT connecting
            if (!isPrinterConnected && connectionStatus !== 'connecting') {
                setPrinterMessage(t('printer_not_connected_check'));
                setPrinterSnackbarVisible(true);
            }
            // Priority 2: Success message if just connected
            else if (isPrinterConnected && !prevConnectedRef.current) {
                setPrinterMessage(t('printer_connected'));
                setPrinterSnackbarVisible(true);
                // Auto-dismiss success message
                setTimeout(() => setPrinterSnackbarVisible(false), 3000);
            }
            // Hide if connecting or system
            else if (connectionStatus === 'connecting') {
                setPrinterSnackbarVisible(false);
            }
        } else {
            setPrinterSnackbarVisible(false);
        }
        prevConnectedRef.current = isPrinterConnected;
    }, [isPrinterConnected, printerType, connectionStatus]);

    const finalBackgroundColor = backgroundColor || activeColors.background;

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: finalBackgroundColor }]} edges={['top', 'left', 'right']}>
            <StatusBar style={theme === 'light' ? 'dark' : 'light'} backgroundColor={finalBackgroundColor} />
            <KeyboardAvoidingView
                style={styles.keyboardContainer}
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 25}
                enabled={keyboardAvoiding}
            >
                <View style={styles.content}>{children}</View>

                {/* Gold Rate Snackbar (Sticky until update) */}
                <StatusSnackbar
                    visible={rateSnackbarVisible}
                    type="warning"
                    message={t('rate_not_set')}
                    actionLabel={t('update_now')}
                    onAction={() => setIsRateModalVisible(true)}
                    onClose={() => setRateSnackbarVisible(false)}
                    position="bottom"
                />

                {/* Printer Status Snackbar */}
                <StatusSnackbar
                    visible={printerSnackbarVisible}
                    type={isPrinterConnected ? 'success' : 'error'}
                    message={printerMessage}
                    actionLabel={printerMessage === t('printer_not_connected_check') ? t('retry') : undefined}
                    onAction={() => {
                        if (printerMessage === t('printer_not_connected_check')) {
                            router.push('/settings/printers');
                        }
                    }}
                    onClose={() => setPrinterSnackbarVisible(false)}
                    position="top"
                    duration={printerMessage === t('printer_not_connected_check') ? 0 : 5000}
                />

                <PrintDetailsModal
                    visible={showPrintDetailsModal}
                    onClose={() => setShowPrintDetailsModal(false)}
                    onSubmit={handlePrintConfirm}
                    initialData={printDetailsModalInitialData}
                />

                <RateUpdateModal
                    visible={isRateModalVisible}
                    currentRate={state.goldRate}
                    onClose={() => setIsRateModalVisible(false)}
                    onUpdate={updateGoldRate}
                />

                <CustomAlertModal
                    visible={alertConfig.visible}
                    title={alertConfig.title}
                    message={alertConfig.message}
                    type={alertConfig.type}
                    buttons={alertConfig.buttons}
                    onClose={hideAlert}
                    theme={theme}
                />
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    keyboardContainer: {
        flex: 1,
    },
    content: {
        flex: 1,
    },
});
