import React from 'react';
import { Modal, StyleSheet, View as RNView, Text as RNText, ScrollView as RNScrollView, TouchableOpacity as RNRTouchableOpacity, Dimensions, Image, Platform } from 'react-native';

import { SPACING, COLORS, FONT_SIZES, BORDER_RADIUS, LIGHT_COLORS, DARK_COLORS } from '../constants/theme';
import { useGeneralSettings } from '../store/GeneralSettingsContext';
import PrimaryButton from '../components/PrimaryButton';
import { Ionicons } from '@expo/vector-icons';
import { getCharWidth, cleanThermalPayload } from '../services/printService';

const View = RNView as any;
const Text = RNText as any;
const ScrollView = RNScrollView as any;
const TouchableOpacity = RNRTouchableOpacity as any;

interface PrintPreviewModalProps {
    visible: boolean;
    onClose: () => void;
    onPrint: () => void;
    thermalPayload?: string;
    html?: string;
    title?: string;
    qrData?: string;
    onWidthChange?: (width: '58mm' | '80mm' | '112mm') => void;
    data?: any; // Raw order/estimation data for premium display
}


export default function PrintPreviewModal({
    visible,
    onClose,
    onPrint,
    thermalPayload,
    html,
    title = 'Print Preview',
    qrData,
    onWidthChange,
    data
}: PrintPreviewModalProps) {
    const { theme, t, receiptConfig, printerType, shopDetails } = useGeneralSettings();
    const activeColors = theme === 'light' ? LIGHT_COLORS : DARK_COLORS;



    const paperWidth = receiptConfig.paperWidth || '58mm';
    const charWidth = getCharWidth(paperWidth);
    const cleanText = thermalPayload ? cleanThermalPayload(thermalPayload) : '';


    // Calculate display width based on paper width
    const getDisplayWidth = () => {
        if (paperWidth === '112mm') return 380;
        if (paperWidth === '80mm') return 300;
        return 220;
    };

    const qrContent = receiptConfig?.qrEndpointUrl && qrData
        ? `${receiptConfig.qrEndpointUrl}${encodeURIComponent(qrData)}`
        : encodeURIComponent(qrData || '');

    return (
        <Modal
            visible={visible}
            animationType="slide"
            transparent={true}
            onRequestClose={onClose}
        >
            <View style={styles.modalOverlay}>
                <View style={[styles.modalContent, { backgroundColor: activeColors.background }]}>
                    <View style={styles.header}>
                        <Text style={[styles.headerTitle, { color: activeColors.text }]}>{title}</Text>
                        <TouchableOpacity onPress={onClose} style={styles.closeButton}>
                            <Ionicons name="close" size={24} color={activeColors.text} />
                        </TouchableOpacity>
                    </View>




                    <ScrollView style={[styles.previewScroll, { backgroundColor: activeColors.background }]} contentContainerStyle={styles.scrollContent}>
                        {data ? (
                            <View style={[styles.premiumCard, { backgroundColor: activeColors.cardBg, borderColor: activeColors.border }]}>
                                {/* Header with Branding */}
                                <View style={styles.premiumHeader}>
                                    <View>
                                        <Text style={[styles.premiumShopName, { color: activeColors.primary }]}>{shopDetails?.name || 'GOLD ESTIMATE'}</Text>
                                        <Text style={[styles.premiumShopInfo, { color: activeColors.textLight }]}>{shopDetails?.address || ''}</Text>
                                    </View>
                                    <View style={styles.premiumBadge}>
                                        <Text style={styles.premiumBadgeText}>{t('estimation_details') || 'ESTIMATION DETAILS'}</Text>
                                    </View>
                                </View>

                                {/* Customer Info */}
                                <View style={[styles.premiumSection, { borderTopColor: activeColors.border + '40', paddingVertical: SPACING.sm }]}>
                                    <View style={styles.infoGrid}>
                                        <View style={{ flex: 1.5 }}>
                                            <Text style={[styles.infoLabel, { color: activeColors.textLight }]}>{t('customer') || 'Customer'}</Text>
                                            <Text style={[styles.infoValue, { color: activeColors.text, fontSize: FONT_SIZES.md }]}>
                                                {data.customer?.name || data.customerName || t('unknown_customer')}
                                            </Text>
                                            {(data.customer?.mobile || data.customerMobile) && (
                                                <Text style={[styles.premiumShopInfo, { color: activeColors.textLight, marginTop: 2 }]}>
                                                    Ph: {data.customer?.mobile || data.customerMobile}
                                                </Text>
                                            )}
                                            {(data.customer?.address || data.customerAddress) && (
                                                <Text style={[styles.premiumShopInfo, { color: activeColors.textLight, marginTop: 2 }]}>
                                                    {data.customer?.address || data.customerAddress}
                                                </Text>
                                            )}
                                        </View>
                                        <View style={{ flex: 1, alignItems: 'flex-end' }}>
                                            <Text style={[styles.infoLabel, { color: activeColors.textLight }]}>{t('date') || 'Date'}</Text>
                                            <Text style={[styles.infoValue, { color: activeColors.text }]}>{data.date ? new Date(data.date).toLocaleDateString() : new Date().toLocaleDateString()}</Text>
                                        </View>
                                    </View>
                                </View>

                                {/* Market Rates Section */}
                                <View style={[styles.premiumSection, { borderTopColor: activeColors.border + '20', paddingVertical: SPACING.sm, backgroundColor: activeColors.cardBg }]}>
                                    <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                                        <View style={{ flex: 1 }}>
                                            <Text style={[styles.infoLabel, { color: activeColors.textLight, fontSize: 10 }]}>Gold 22K (per/g)</Text>
                                            <Text style={[styles.infoValue, { color: activeColors.primary, fontSize: FONT_SIZES.md }]}>₹{data.goldRate?.rate22k || 'N/A'}</Text>
                                        </View>
                                        <View style={{ flex: 1, alignItems: 'center' }}>
                                            <Text style={[styles.infoLabel, { color: activeColors.textLight, fontSize: 10 }]}>Silver (per/g)</Text>
                                            <Text style={[styles.infoValue, { color: activeColors.primary, fontSize: FONT_SIZES.md }]}>₹{data.goldRate?.silver || 'N/A'}</Text>
                                        </View>
                                        <View style={{ flex: 1, alignItems: 'flex-end' }}>
                                            {data.estimationNumber && (
                                                <>
                                                    <Text style={[styles.infoLabel, { color: activeColors.textLight, fontSize: 10 }]}>Est No</Text>
                                                    <Text style={[styles.infoValue, { color: activeColors.text }]}>#{data.estimationNumber}</Text>
                                                </>
                                            )}
                                        </View>
                                    </View>
                                </View>

                                {/* Items Detailed Table */}
                                <View style={[styles.premiumSection, { borderTopColor: activeColors.border + '40' }]}>
                                    <Text style={[styles.premiumSectionTitle, { color: activeColors.textLight }]}>{t('items') || 'ITEMS'}</Text>
                                    {(() => {
                                        let items = [];
                                        try {
                                            items = typeof data.items === 'string' ? JSON.parse(data.items) : data.items || [];
                                        } catch (e) { }
                                        return items.map((item: any, idx: number) => (
                                            <View key={idx} style={[styles.detailedRow, { borderBottomColor: activeColors.border + '20' }]}>
                                                <View style={styles.rowMain}>
                                                    <View style={{ flex: 1 }}>
                                                        <Text style={[styles.premiumItemName, { color: activeColors.text }]}>{item.name}</Text>
                                                        {item.subProductName && <Text style={[styles.premiumItemSub, { color: activeColors.textLight }]}>{item.subProductName}</Text>}
                                                    </View>
                                                    <Text style={[styles.premiumItemPrice, { color: activeColors.text }]}>₹{Math.round(item.totalValue).toLocaleString()}</Text>
                                                </View>

                                                <View style={styles.detailGrid}>
                                                    <View style={styles.detailItem}>
                                                        <Text style={[styles.detailLabel, { color: activeColors.textLight }]}>{t('gross_wt') || 'G.WT'}</Text>
                                                        <Text style={[styles.detailValue, { color: activeColors.text }]}>{item.grossWeight?.toFixed(3)}g</Text>
                                                    </View>
                                                    <View style={styles.detailItem}>
                                                        <Text style={[styles.detailLabel, { color: activeColors.textLight }]}>{t('va') || 'VA'}</Text>
                                                        <Text style={[styles.detailValue, { color: activeColors.text }]}>{item.wastagePercentage}%</Text>
                                                    </View>
                                                    <View style={styles.detailItem}>
                                                        <Text style={[styles.detailLabel, { color: activeColors.textLight }]}>{t('net_wt') || 'N.WT'}</Text>
                                                        <Text style={[styles.detailValue, { color: activeColors.text }]}>{item.netWeight?.toFixed(3)}g</Text>
                                                    </View>
                                                    <View style={styles.detailItem}>
                                                        <Text style={[styles.detailLabel, { color: activeColors.textLight }]}>{t('mc') || 'MC'}</Text>
                                                        <Text style={[styles.detailValue, { color: activeColors.text }]}>₹{Math.round(item.makingChargeValue || 0).toLocaleString()}</Text>
                                                    </View>
                                                </View>
                                            </View>
                                        ));
                                    })()}
                                </View>

                                {/* Purchases Section */}
                                {(() => {
                                    let purchases = [];
                                    try {
                                        purchases = typeof data.purchaseItems === 'string' ? JSON.parse(data.purchaseItems) : data.purchaseItems || [];
                                    } catch (e) { }
                                    if (purchases.length === 0) return null;

                                    return (
                                        <View style={[styles.premiumSection, { borderTopColor: activeColors.error + '30' }]}>
                                            <Text style={[styles.premiumSectionTitle, { color: activeColors.error }]}>{t('purchases') || 'PURCHASES'}</Text>
                                            {purchases.map((item: any, idx: number) => (
                                                <View key={idx} style={[styles.detailedRow, { borderBottomColor: activeColors.border + '20' }]}>
                                                    <View style={styles.rowMain}>
                                                        <View style={{ flex: 1 }}>
                                                            <Text style={[styles.premiumItemName, { color: activeColors.text }]}>{item.category}</Text>
                                                            <Text style={[styles.premiumItemSub, { color: activeColors.textLight }]}>{item.metal} {item.purity}K</Text>
                                                        </View>
                                                        <Text style={[styles.premiumItemPrice, { color: activeColors.error }]}>-₹{Math.round(item.amount).toLocaleString()}</Text>
                                                    </View>
                                                    <View style={styles.detailGrid}>
                                                        <View style={styles.detailItem}>
                                                            <Text style={[styles.detailLabel, { color: activeColors.textLight }]}>{t('gross_wt') || 'G.WT'}</Text>
                                                            <Text style={[styles.detailValue, { color: activeColors.text }]}>{item.grossWeight?.toFixed(3)}g</Text>
                                                        </View>
                                                        <View style={styles.detailItem}>
                                                            <Text style={[styles.detailLabel, { color: activeColors.textLight }]}>{t('net_wt') || 'N.WT'}</Text>
                                                            <Text style={[styles.detailValue, { color: activeColors.text }]}>{item.netWeight?.toFixed(3)}g</Text>
                                                        </View>
                                                        <View style={styles.detailItem}>
                                                            <Text style={[styles.detailLabel, { color: activeColors.textLight }]}>{t('rate') || 'Rate'}</Text>
                                                            <Text style={[styles.detailValue, { color: activeColors.text }]}>₹{item.rate?.toLocaleString()}</Text>
                                                        </View>
                                                    </View>
                                                </View>
                                            ))}
                                        </View>
                                    );
                                })()}

                                {/* Chits/Advances Section */}
                                {(() => {
                                    let chits = [];
                                    let advances = [];
                                    try {
                                        chits = typeof data.chitItems === 'string' ? JSON.parse(data.chitItems) : data.chitItems || [];
                                        advances = typeof data.advanceItems === 'string' ? JSON.parse(data.advanceItems) : data.advanceItems || [];
                                    } catch (e) { }

                                    if (chits.length === 0 && advances.length === 0) return null;

                                    return (
                                        <View style={[styles.premiumSection, { borderTopColor: activeColors.primary + '30' }]}>
                                            <Text style={[styles.premiumSectionTitle, { color: activeColors.primary }]}>{t('deductions') || 'DEDUCTIONS'}</Text>
                                            {chits.map((item: any, idx: number) => (
                                                <View key={`chit-${idx}`} style={styles.premiumRow}>
                                                    <View style={{ flex: 1 }}>
                                                        <Text style={[styles.premiumItemName, { color: activeColors.text }]}>Chit ID: {item.chitId}</Text>
                                                        {item.customerName && <Text style={[styles.premiumItemSub, { color: activeColors.textLight }]}>{item.customerName}</Text>}
                                                    </View>
                                                    <Text style={[styles.premiumItemPrice, { color: activeColors.error }]}>-₹{Math.round(item.amount).toLocaleString()}</Text>
                                                </View>
                                            ))}
                                            {advances.map((item: any, idx: number) => (
                                                <View key={`adv-${idx}`} style={styles.premiumRow}>
                                                    <View style={{ flex: 1 }}>
                                                        <Text style={[styles.premiumItemName, { color: activeColors.text }]}>Advance ID: {item.advanceId}</Text>
                                                        {item.customerName && <Text style={[styles.premiumItemSub, { color: activeColors.textLight }]}>{item.customerName}</Text>}
                                                    </View>
                                                    <Text style={[styles.premiumItemPrice, { color: activeColors.error }]}>-₹{Math.round(item.amount).toLocaleString()}</Text>
                                                </View>
                                            ))}
                                        </View>
                                    );
                                })()}


                                {/* Totals Section */}
                                <View style={[styles.premiumTotals, { borderTopColor: activeColors.primary + '30', backgroundColor: activeColors.primary + '08' }]}>
                                    <View style={styles.totalRow}>
                                        <Text style={[styles.totalLabel, { color: activeColors.textLight }]}>{t('total_weight') || 'Net Weight'}</Text>
                                        <Text style={[styles.totalValue, { color: activeColors.text }]}>{data.totalWeight?.toFixed(3) || '0.000'}g</Text>
                                    </View>

                                    {/* Deductions breakdown in totals if applicable */}
                                    {(() => {
                                        let purchaseTotal = 0;
                                        let otherTotal = 0;
                                        try {
                                            const purchases = typeof data.purchaseItems === 'string' ? JSON.parse(data.purchaseItems) : data.purchaseItems || [];
                                            const chits = typeof data.chitItems === 'string' ? JSON.parse(data.chitItems) : data.chitItems || [];
                                            const advances = typeof data.advanceItems === 'string' ? JSON.parse(data.advanceItems) : data.advanceItems || [];

                                            purchaseTotal = purchases.reduce((s: number, i: any) => s + (i.amount || 0), 0);
                                            otherTotal = chits.reduce((s: number, i: any) => s + (i.amount || 0), 0) + advances.reduce((s: number, i: any) => s + (i.amount || 0), 0);
                                        } catch (e) { }

                                        if (purchaseTotal === 0 && otherTotal === 0) return null;

                                        return (
                                            <>
                                                {purchaseTotal > 0 && (
                                                    <View style={styles.totalRow}>
                                                        <Text style={[styles.totalLabel, { color: activeColors.error }]}>{t('purchase_deduction') || 'Purchase Deduction'}</Text>
                                                        <Text style={[styles.totalValue, { color: activeColors.error }]}>-₹{Math.round(purchaseTotal).toLocaleString()}</Text>
                                                    </View>
                                                )}
                                                {otherTotal > 0 && (
                                                    <View style={styles.totalRow}>
                                                        <Text style={[styles.totalLabel, { color: activeColors.error }]}>{t('other_deductions') || 'Other Deductions'}</Text>
                                                        <Text style={[styles.totalValue, { color: activeColors.error }]}>-₹{Math.round(otherTotal).toLocaleString()}</Text>
                                                    </View>
                                                )}
                                            </>
                                        );
                                    })()}

                                    {/* Tax Breakdown */}
                                    {(() => {
                                        let items = [];
                                        try {
                                            items = typeof data.items === 'string' ? JSON.parse(data.items) : data.items || [];
                                        } catch (e) { }

                                        const gstTotal = items.reduce((sum: number, i: any) => sum + (i.gstValue || 0), 0);
                                        if (gstTotal <= 0) return null;

                                        const estimationTotal = items.reduce((sum: number, i: any) => sum + (i.totalValue || 0), 0);
                                        const taxableAmount = estimationTotal - gstTotal;

                                        return (
                                            <>
                                                <View style={styles.totalRow}>
                                                    <Text style={[styles.totalLabel, { color: activeColors.textLight }]}>{t('taxable_amount') || 'Taxable Amount'}</Text>
                                                    <Text style={[styles.totalValue, { color: activeColors.text }]}>₹ {Math.round(taxableAmount).toLocaleString()}</Text>
                                                </View>
                                                <View style={styles.totalRow}>
                                                    <Text style={[styles.totalLabel, { color: activeColors.textLight }]}>{t('gst_label') || 'GST (3%)'}</Text>
                                                    <Text style={[styles.totalValue, { color: activeColors.text }]}>₹ {Math.round(gstTotal).toLocaleString()}</Text>
                                                </View>
                                            </>
                                        );
                                    })()}

                                    <View style={[styles.grandTotalItem, { borderTopColor: activeColors.border + '20' }]}>

                                        <Text style={[styles.grandTotalLabel, { color: activeColors.text }]}>{t('net_payable') || 'Net Payable'}</Text>
                                        <Text style={[styles.grandTotalValue, { color: activeColors.primary }]}>₹{Math.round(data.grandTotal).toLocaleString()}</Text>
                                    </View>
                                </View>


                                {/* QR Code Branding */}
                                {qrData && (
                                    <View style={styles.premiumQR}>
                                        <View style={{ flex: 1 }}>
                                            <Text style={[styles.qrTitle, { color: activeColors.text }]}>{t('scan_to_track') || 'Digital Tracking'}</Text>
                                            <Text style={[styles.qrID, { color: activeColors.textLight }]}>#{qrData}</Text>
                                        </View>
                                        <Image
                                            source={{ uri: `https://quickchart.io/qr?text=${qrContent}&size=100&margin=0` }}
                                            style={styles.premiumQRImage}
                                        />
                                    </View>
                                )}

                                {/* Footer Message for Premium Card */}
                                <View style={{ marginTop: SPACING.lg, alignItems: 'center' }}>
                                    <Text style={[styles.premiumBadgeText, { color: activeColors.textLight, fontStyle: 'italic', fontSize: 12 }]}>
                                        {shopDetails.footerMessage || '*** THANK YOU VISIT AGAIN ***'}
                                    </Text>
                                </View>
                            </View>
                        ) : (
                            <View
                                style={[
                                    styles.receiptContainer,
                                    {
                                        width: getDisplayWidth(),
                                        backgroundColor: '#fff',
                                    }
                                ]}
                            >
                                <View style={{ padding: 10 }}>
                                    <Text style={styles.thermalText}>
                                        {cleanText || 'No Preview Data Available'}
                                    </Text>
                                </View>
                            </View>
                        )}
                    </ScrollView>



                    {onWidthChange && (
                        <View style={styles.infoContainer}>
                            {['58mm', '80mm', '112mm'].map((width: any) => (
                                <TouchableOpacity
                                    key={width}
                                    onPress={() => onWidthChange(width)}
                                    style={[
                                        styles.widthTab,
                                        paperWidth === width && { backgroundColor: activeColors.primary }
                                    ]}
                                >
                                    <Text style={[
                                        styles.widthTabText,
                                        { color: paperWidth === width ? '#fff' : activeColors.textLight }
                                    ]}>
                                        {width}
                                    </Text>
                                </TouchableOpacity>
                            ))}
                        </View>
                    )}

                    <View style={styles.footer}>
                        <PrimaryButton
                            title={t('cancel') || 'Cancel'}
                            variant="outline"
                            onPress={onClose}
                            style={styles.actionButton}
                        />
                        <PrimaryButton
                            title={t('print') || 'Print'}
                            onPress={onPrint}
                            style={styles.actionButton}
                        />
                    </View>
                </View>
            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.22)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    modalContent: {
        width: '90%',
        height: '80%',
        borderRadius: BORDER_RADIUS.lg,
        overflow: 'hidden',
        elevation: 5,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: SPACING.md,
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(0,0,0,0.1)',
    },
    headerTitle: {
        fontSize: FONT_SIZES.lg,
        fontWeight: 'bold',
    },
    closeButton: {
        padding: 4,
    },
    infoContainer: {
        flexDirection: 'row',
        padding: SPACING.sm,
        justifyContent: 'center',
        gap: SPACING.sm,
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(0,0,0,0.05)',
    },
    widthTab: {
        paddingVertical: 6,
        paddingHorizontal: 16,
        borderRadius: 20,
        borderWidth: 1,
        borderColor: 'rgba(0,0,0,0.1)',
    },
    widthTabText: {
        fontSize: FONT_SIZES.sm,
        fontWeight: 'bold',
    },
    previewScroll: {
        flex: 1,
    },
    scrollContent: {
        alignItems: 'center',
        paddingVertical: SPACING.lg,
    },
    receiptContainer: {
        padding: 10,
        elevation: 10,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 10,
        minHeight: 300,
        borderRadius: 4,
        borderWidth: 0.5,
        borderColor: '#ccc',
    },
    thermalText: {
        fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
        fontSize: 11,
        color: '#000',
        lineHeight: 16,
    },
    footer: {
        flexDirection: 'row',
        padding: SPACING.md,
        gap: SPACING.md,
        borderTopWidth: 1,
        borderTopColor: 'rgba(0,0,0,0.1)',
    },
    actionButton: {
        flex: 1,
    },
    // Premium Styles
    modeToggle: {
        flexDirection: 'row',
        padding: SPACING.sm,
        justifyContent: 'center',
        backgroundColor: 'rgba(0,0,0,0.03)',
        borderRadius: 30,
        margin: SPACING.md,
        alignSelf: 'center',
    },
    modeTab: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 8,
        paddingHorizontal: 16,
        borderRadius: 20,
        gap: 6,
    },
    modeTabText: {
        fontSize: 12,
        fontWeight: 'bold',
    },
    premiumCard: {
        width: '95%',
        borderRadius: BORDER_RADIUS.xl,
        borderWidth: 1,
        padding: SPACING.xl,
        elevation: 4,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
    },
    premiumHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: SPACING.lg,
    },
    premiumShopName: {
        fontSize: FONT_SIZES.xl,
        fontWeight: '900',
        letterSpacing: 0.5,
    },
    premiumShopInfo: {
        fontSize: 11,
        marginTop: 4,
    },
    premiumBadge: {
        backgroundColor: COLORS.primary + '20',
        paddingHorizontal: 10,
        paddingVertical: 5,
        borderRadius: 8,
    },
    premiumBadgeText: {
        fontSize: 10,
        fontWeight: 'bold',
        color: COLORS.primary,
        letterSpacing: 1,
    },
    premiumSection: {
        borderTopWidth: 1,
        paddingVertical: SPACING.md,
    },
    premiumSectionTitle: {
        fontSize: 10,
        fontWeight: '900',
        textTransform: 'uppercase',
        letterSpacing: 1.5,
        marginBottom: SPACING.sm,
        opacity: 0.8,
    },

    infoGrid: {
        flexDirection: 'row',
        justifyContent: 'space-between',
    },
    infoItem: {
        flex: 1,
    },
    infoLabel: {
        fontSize: 10,
        textTransform: 'uppercase',
        letterSpacing: 1,
        marginBottom: 4,
    },
    infoValue: {
        fontSize: FONT_SIZES.md,
        fontWeight: 'bold',
    },
    tableHeader: {
        flexDirection: 'row',
        marginBottom: SPACING.sm,
    },
    tableHead: {
        fontSize: 10,
        fontWeight: 'bold',
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },
    detailedRow: {
        paddingVertical: 12,
        borderBottomWidth: 1,
    },
    rowMain: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 8,
    },
    detailGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 12,
        marginTop: 4,
    },
    detailItem: {
        minWidth: '20%',
    },
    detailLabel: {
        fontSize: 9,
        fontWeight: '600',
        textTransform: 'uppercase',
        opacity: 0.6,
        marginBottom: 2,
    },
    detailValue: {
        fontSize: 12,
        fontWeight: 'bold',
    },
    premiumRow: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 10,
    },
    premiumItemName: {
        fontSize: FONT_SIZES.md,
        fontWeight: 'bold',
    },
    premiumItemSub: {
        fontSize: 11,
        marginTop: 2,
    },
    premiumItemText: {
        fontSize: FONT_SIZES.sm,
    },
    premiumItemPrice: {
        fontSize: FONT_SIZES.md,
        fontWeight: 'bold',
    },

    premiumTotals: {
        borderTopWidth: 2,
        borderRadius: BORDER_RADIUS.lg,
        padding: SPACING.md,
        marginTop: SPACING.sm,
    },
    totalRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 8,
    },
    totalLabel: {
        fontSize: FONT_SIZES.sm,
    },
    totalValue: {
        fontSize: FONT_SIZES.sm,
        fontWeight: 'bold',
    },
    grandTotalItem: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingTop: SPACING.md,
        marginTop: SPACING.sm,
        borderTopWidth: 1,
    },
    grandTotalLabel: {
        fontSize: FONT_SIZES.lg,
        fontWeight: '900',
    },
    grandTotalValue: {
        fontSize: FONT_SIZES.xl,
        fontWeight: '900',
    },
    premiumQR: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: SPACING.xl,
        padding: SPACING.md,
        backgroundColor: 'rgba(0,0,0,0.02)',
        borderRadius: BORDER_RADIUS.md,
    },
    qrTitle: {
        fontSize: FONT_SIZES.md,
        fontWeight: 'bold',
    },
    qrID: {
        fontSize: 12,
        marginTop: 4,
    },
    premiumQRImage: {
        width: 80,
        height: 80,
        borderRadius: 8,
    },
});


