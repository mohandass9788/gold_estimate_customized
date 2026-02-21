import React, { createContext, useContext, useState, useEffect } from 'react';
import { setSetting, getSetting } from '../services/dbService';

type ThemeMode = 'light' | 'dark';
type Language = 'en' | 'ta';

interface ConnectedPrinter {
    id: string;
    name: string;
    address?: string; // MAC address for Bluetooth
    type?: string;
}

type PrinterType = 'system' | 'thermal';

interface GeneralSettingsContextType {
    theme: ThemeMode;
    language: Language;
    toggleTheme: () => void;
    setLanguage: (lang: Language) => void;
    connectedPrinter: ConnectedPrinter | null;
    setConnectedPrinter: (printer: ConnectedPrinter | null) => void;
    printerType: PrinterType;
    setPrinterType: (type: PrinterType) => void;
    isPrinterConnected: boolean;
    setIsPrinterConnected: (status: boolean) => void;
    isBluetoothEnabled: boolean;
    setIsBluetoothEnabled: (status: boolean) => void;
    shopDetails: {
        name: string;
        address: string;
        phone: string;
        gstNumber: string;
        email: string;
        footerMessage: string;
    };
    updateShopDetails: (details: Partial<{
        name: string;
        address: string;
        phone: string;
        gstNumber: string;
        email: string;
        footerMessage: string;
    }>) => void;
    t: (key: string, params?: Record<string, string>) => string;
    adminPin: string;
    updateAdminPin: (newPin: string) => void;
    deviceName: string;
    updateDeviceName: (name: string) => void;
}

const GeneralSettingsContext = createContext<GeneralSettingsContextType | undefined>(undefined);

const translations: Record<Language, Record<string, string>> = {
    en: {
        // App Core
        'app_name': 'Gold Estimation',
        'settings': 'Settings',
        'home': 'Home',
        'summary': 'Summary',
        'history': 'History',

        // Settings Page
        'account': 'Account',
        'profile': 'Profile',
        'notifications': 'Notifications',
        'privacy_security': 'Privacy & Security',
        'app_settings': 'App Settings',
        'manage_products': 'Manage Products',
        'printers_settings': 'Printers Settings',
        'general_settings': 'General Settings',
        'theme': 'Theme',
        'language': 'Language',
        'help_support': 'Help & Support',
        'logout': 'Logout',
        'version': 'Version',
        'light': 'Light',
        'dark': 'Dark',
        'english': 'English',
        'tamil': 'Tamil',
        'helpline': 'Helpline',
        'whatsapp': 'WhatsApp',
        'email': 'Email',
        'contact_us': 'Contact Us',

        // Global Settings
        'profile_security': 'Profile & Security',
        'business_info': 'Business Info',
        'shop_name': 'Shop Name',
        'enter_shop_name': 'Enter your shop name',
        'shop_address': 'Shop Address',
        'enter_shop_address': 'Enter your shop address',
        'tax_settings': 'Tax Settings',
        'default_gst': 'Default GST (%)',
        'product_management': 'Product Management',
        'manage_purchase_categories': 'Manage Purchase Categories',
        'save_settings': 'Save Settings',
        'settings_saved': 'Settings saved successfully',
        'settings_save_failed': 'Failed to save settings',

        // Category Modal
        'categories': 'Categories',
        'new_category': 'New Category',
        'sub_category': 'Sub-Category',
        'new_sub_category': 'New Sub-Category',
        'sub_categories_for': 'Sub-Categories for',
        'no_sub_categories': 'No sub-categories added',
        'done': 'Done',
        'confirm_delete': 'Confirm Delete',
        'confirm_delete_msg': 'Are you sure you want to delete this and all its sub-categories?',
        'delete_failed': 'Failed to delete',
        'add_failed': 'Failed to add',

        // Dashboard
        'good_morning': 'Good Morning',
        'good_afternoon': 'Good Afternoon',
        'good_evening': 'Good Evening',
        'estimates': 'Estimates',
        'total_weight': 'Total Weight',
        'scan_tag': 'Scan Tag',
        'manual_entry': 'Manual Entry',
        'multi_tag_scan': 'Multi-Tag Scan',
        'purchase': 'Purchase',
        'recent_activity': 'Recent Activity',
        'view_all': 'View All',
        'no_recent_activity': 'No recent activity yet',
        'proceed_with_count': 'Proceed with {count} items',
        'scanned_tags': 'Scanned Tags',
        'clear_all': 'Clear All',
        'no_tags_scanned': 'No tags scanned yet',
        'position_qr_code': 'Position QR code in center',
        'scanned': 'Scanned',
        'confirmed': 'Confirmed',
        'processing': 'Processing...',

        // Estimation Form
        'customer_info': 'Customer Information',
        'customer_name': 'Customer Name',
        'phone_number': 'Phone Number',
        'item_details': 'Item Details',
        'select_product': 'Select Product',
        'product_name': 'Product Name',
        'sub_product_name': 'Sub Product Name',
        'metal': 'Metal',
        'purity': 'Purity',
        'gross_weight': 'Gross Weight',
        'net_weight': 'Net Weight',
        'wastage': 'Wastage',
        'making_charge': 'Making Charge',
        'gst': 'GST',
        'total': 'Total',
        'add_item': 'Add Item',
        'add_to_list': 'Add to List',
        'preview': 'Preview',
        'gold': 'Gold',
        'silver': 'Silver',
        'rate': 'Rate',
        'field_required': 'Please fill all required fields',
        'tag_number': 'Tag Number',
        'scan_or_enter_tag': 'Scan or enter tag number',
        'type_and_purity': 'Type & Purity',
        'product_information': 'Product Information',
        'measurements': 'Measurements',
        'pricing_and_charges': 'Pricing & Charges',
        'gold_value': 'Gold Value',
        'type': 'Type',
        'percentage': 'Percentage (%)',
        'per_gram': 'Per Gram (Amt)',
        'fixed': 'Fixed (Total)',
        'weight': 'Weight (g)',
        'gram': 'Gram (கி)',
        'clear': 'Clear',
        'item_added_to_list': 'Item added to list',
        'chit': 'Chit',
        'advance': 'Advance',
        'chit_deduction': 'Chit Deduction',
        'advance_deduction': 'Advance Deduction',
        'net_payable': 'Net Payable',

        // Purchase workflow
        'category': 'Category',
        'pcs': 'Pcs',
        'less_weight': 'Less Weight',
        'total_purchase_amount': 'Total Purchase Amount',
        'add_purchase': 'Add Purchase',
        'added_items': 'Added Items',
        'print_selected': 'Print Selected',
        'confirm_remove': 'Remove Item',
        'confirm_remove_msg': 'Are you sure you want to remove this item?',
        'cancel': 'Cancel',
        'remove': 'Remove',

        // Summary Screen
        'grand_total': 'Grand Total',
        'total_items': 'Total Items',
        'save_estimation': 'Save Estimation',
        'share': 'Share',
        'print': 'Print',
        'no_items': 'No items in estimation',
        'item_removed': 'Item removed from list',
        'connected': 'Connected',
        'disconnected': 'Disconnected',
        'save': 'Save',
        'no_items_added': 'No items added yet',
        'purchase_item_added': 'Purchase item added',
        'product_found': 'Product Found',
        'scan_again': 'Scan Again',
        'camera_permission_needed': 'Camera permission is needed to scan tags.',
        'grant_permission': 'Grant Permission',
        'align_qr_code': 'Align QR code within the frame',
        'fetching_product': 'Fetching Product...',
        'product_not_found': 'Product not found',
        'value': 'Value',
        'optional': 'Optional',
        'hsn_code': 'HSN Code',
        'bulk_upload': 'Bulk Upload',
        'import_excel': 'Import Excel/CSV',
        'print_preview': 'Print Preview',
        'search_placeholder': 'Search Products...',

        // Product Management
        'manage_products_title': 'Manage Products',
        'select_product_category': 'Select Product Category',
        'add_new': 'Add New',
        'default_settings_for': 'Default Settings for {name}',
        'save_defaults': 'Save Defaults',
        'add_sub': 'Add Sub',
        'delete_sub_confirm': 'Delete this sub-product?',
        'delete_product_confirm': 'Deleting a product will delete all its sub-products. Proceed?',
        'product_category_manage_help': 'Select a product category above to manage its defaults and sub-products.',
        'add_new_product': 'Add New Product',
        'add_sub_product_for': 'Add Sub-product for {name}',
        'product_name_placeholder': 'Product Name (e.g. Ring, Chain)',
        'sub_product_name_placeholder': 'Sub-product Name (e.g. Plain, Casting)',
        'set_initial_defaults': 'Set initial defaults (optional):',
        'save_product': 'Save Product',
        'add_sub_product': 'Add Sub-product',

        // Rate update
        'update_daily_rates': 'Update Daily Rates',
        'gold_24k': 'Gold 24K',
        'gold_22k': 'Gold 22K',
        'gold_18k': 'Gold 18K',
        'update_rates': 'Update Rates',

        // Customer Details
        'enter_name': 'Enter Name',
        'enter_mobile': 'Enter Mobile',
        'enter_email': 'Enter Email',
        'enter_address': 'Enter Address',
        'address': 'Address',
        'success': 'Success',
        'yes': 'Yes',
        'no': 'No',
        'device_name': 'Device Name',
        'enter_device_name': 'Enter device name (e.g., Counter-1)',
        'download_sample': 'Download Sample',
        'filter_orders': 'Filter Orders',
        'today': 'Today',
        'yesterday': 'Yesterday',
        'last_7_days': 'Last 7 Days',
        'last_month': 'Last Month',
        'custom_range': 'Custom Range',
        'apply': 'Apply',
        'start_date': 'Start Date',
        'end_date': 'End Date',
        'employee_name': 'Employee Name',
        'bluetooth_on': 'Bluetooth is ON',
        'bluetooth_off': 'Bluetooth is OFF',
        'enable': 'Enable',
        'retry': 'Retry',
        'connected_status': 'Connected',
        'duplicate_item': 'Duplicate Item',
        'duplicate_item_msg': 'Item with Tag {tag} is already in the list.',
        'operator_required': 'Operator Required',
        'enter_operator_msg': 'Please enter employee name before printing.',
        'merged_receipt': 'Single Receipt (Merged)',
        'separate_receipts': 'Separate Receipts',
        'print_success': 'Print Successful',
        'print_success_msg': 'Receipt printed and order saved. Clear list?',
        'keep_list': 'Keep List',
        'clear_list_confirm': 'Clear List',
        'item_added': 'Item added successfully',
        'thank_you': 'THANK YOU VISIT AGAIN',
    },
    ta: {
        // App Core
        'app_name': 'தங்க மதிப்பீடு',
        'settings': 'அமைப்புகள்',
        'home': 'முகப்பு',
        'summary': 'சுருக்கம்',
        'history': 'வரலாறு',

        // Settings Page
        'account': 'கணக்கு',
        'profile': 'சுயவிவரம்',
        'notifications': 'அறிவிப்புகள்',
        'privacy_security': 'தனியுரிமை மற்றும் பாதுகாப்பு',
        'app_settings': 'பயன்பாட்டு அமைப்புகள்',
        'manage_products': 'தயாரிப்புகளை நிர்வகி',
        'printers_settings': 'பிரிண்டர் அமைப்புகள்',
        'general_settings': 'பொதுவான அமைப்புகள்',
        'theme': 'தீம்',
        'language': 'மொழி',
        'help_support': 'உதவி மற்றும் ஆதரவு',
        'logout': 'வெளியேறு',
        'version': 'பதிப்பு',
        'light': 'லைட்',
        'dark': 'டார்க்',
        'english': 'ஆங்கிலம்',
        'tamil': 'தமிழ்',
        'helpline': 'உதவி எண்',
        'whatsapp': 'வாட்ஸ்அப்',
        'email': 'மின்னஞ்சல்',
        'contact_us': 'எங்களைத் தொடர்பு கொள்ளவும்',

        // Global Settings
        'profile_security': 'சுயவிவரம் மற்றும் பாதுகாப்பு',
        'business_info': 'வணிக தகவல்',
        'shop_name': 'கடை பெயர்',
        'enter_shop_name': 'உங்கள் கடை பெயரை உள்ளிடுக',
        'shop_address': 'கடை முகவரி',
        'enter_shop_address': 'உங்கள் கடை முகவரியை உள்ளிடுக',
        'tax_settings': 'வரி அமைப்புகள்',
        'default_gst': 'ஜிஎஸ்டி (%)',
        'product_management': 'தயாரிப்பு மேலாண்மை',
        'manage_purchase_categories': 'கொள்முதல் வகைகளை நிர்வகி',
        'save_settings': 'அமைப்புகளைச் சேமி',
        'settings_saved': 'அமைப்புகள் வெற்றிகரமாகச் சேமிக்கப்பட்டன',
        'settings_save_failed': 'அமைப்புகளைச் சேமிப்பதில் தோல்வி',

        // Category Modal
        'categories': 'வகைகள்',
        'new_category': 'புதிய வகை',
        'sub_category': 'துணை வகை',
        'new_sub_category': 'புதிய துணை வகை',
        'sub_categories_for': 'துணை வகைகள் -',
        'no_sub_categories': 'துணை வகைகள் எதுவும் சேர்க்கப்படவில்லை',
        'done': 'முடிந்தது',
        'confirm_delete': 'நீக்குதலை உறுதிப்படுத்து',
        'confirm_delete_msg': 'நிச்சயமாக இதை மற்றும் இதன் அனைத்து துணை வகைகளையும் நீக்க விரும்புகிறீர்களா?',
        'delete_failed': 'நீக்குவதில் தோல்வி',
        'add_failed': 'சேர்ப்பதில் தோல்வி',

        // Dashboard
        'good_morning': 'காலை வணக்கம்',
        'good_afternoon': 'மதிய வணக்கம்',
        'good_evening': 'மாலை வணக்கம்',
        'estimates': 'மதிப்பீடுகள்',
        'total_weight': 'மொத்த எடை',
        'scan_tag': 'டேக் ஸ்கேன்',
        'manual_entry': 'நேரடி உள்ளீடு',
        'multi_tag_scan': 'மல்டி டேக் ஸ்கேன்',
        'purchase': 'கொள்முதல்',
        'recent_activity': 'சமீபத்திய செயல்பாடு',
        'view_all': 'அனைத்தையும் காண்க',
        'no_recent_activity': 'சமீபத்திய செயல்பாடு எதுவும் இல்லை',
        'proceed_with_count': '{count} உருப்படிகளுடன் தொடரவும்',
        'scanned_tags': 'ஸ்கேன் செய்யப்பட்ட டேக்குகள்',
        'clear_all': 'அனைத்தையும் அழி',
        'no_tags_scanned': 'இன்னும் டேக்குகள் ஸ்கேன் செய்யப்படவில்லை',
        'position_qr_code': 'QR குறியீட்டை மையத்தில் வைக்கவும்',
        'scanned': 'ஸ்கேன் செய்யப்பட்டது',
        'confirmed': 'உறுதி செய்யப்பட்டது',
        'processing': 'செயலாக்கம்...',

        // Estimation Form
        'customer_info': 'வாடிக்கையாளர் தகவல்',
        'customer_name': 'வாடிக்கையாளர் பெயர்',
        'phone_number': 'தொலைபேசி எண்',
        'item_details': 'பொருள் விவரங்கள்',
        'select_product': 'தயாரிப்பைத் தேர்ந்தெடுக்கவும்',
        'product_name': 'தயாரிப்பு பெயர்',
        'sub_product_name': 'துணை தயாரிப்பு பெயர்',
        'metal': 'உலோகம்',
        'purity': 'தூய்மை',
        'gross_weight': 'மொத்த எடை',
        'net_weight': 'நிகர எடை',
        'wastage': 'சேதாரம்',
        'making_charge': 'தங்கக் கூலி',
        'gst': 'ஜிஎஸ்டி',
        'total': 'மொத்தம்',
        'add_item': 'பொருளைச் சேர்',
        'add_to_list': 'பட்டியலில் சேர்',
        'preview': 'முன்னோட்டம்',
        'gold': 'தங்கம்',
        'silver': 'வெள்ளி',
        'rate': 'விலை',
        'field_required': 'அனைத்து கட்டாய புலங்களையும் நிரப்பவும்',
        'tag_number': 'டேக் எண்',
        'scan_or_enter_tag': 'டேக் எண்ணை ஸ்கேன் செய்யவும் அல்லது உள்ளிடவும்',
        'type_and_purity': 'வகை மற்றும் தூய்மை',
        'product_information': 'தயாரிப்பு தகவல்',
        'measurements': 'அளவீடுகள்',
        'pricing_and_charges': 'விலை மற்றும் கட்டணங்கள்',
        'gold_value': 'தங்கத்தின் மதிப்பு',
        'type': 'வகை',
        'percentage': 'சதவீதம் (%)',
        'per_gram': 'ஒரு கிராமுக்கு (விலை)',
        'fixed': 'நிலையான (மொத்தம்)',
        'weight': 'எடை (கி)',
        'gram': 'கி',
        'clear': 'அழி',
        'item_added_to_list': 'பொருள் பட்டியலில் சேர்க்கப்பட்டது',
        'chit': 'சிட்',
        'advance': 'அட்வான்ஸ்',
        'chit_deduction': 'சிட் கழிவு',
        'advance_deduction': 'முன்பணம் கழிவு',
        'net_payable': 'நிகர செலுத்த வேண்டிய தொகை',

        // Purchase workflow
        'category': 'வகை',
        'pcs': 'துண்டுகள்',
        'less_weight': 'கழிவு எடை',
        'total_purchase_amount': 'மொத்த கொள்முதல் தொகை',
        'add_purchase': 'கொள்முதல் சேர்க்கவும்',
        'added_items': 'சேர்க்கப்பட்ட உருப்படிகள்',
        'print_selected': 'தேர்ந்தெடுக்கப்பட்டதை அச்சிடுக',
        'confirm_remove': 'பொருளை அகற்று',
        'confirm_remove_msg': 'இந்த பொருளை அகற்ற விரும்புகிறீர்களா?',
        'cancel': 'ரத்துசெய்',
        'remove': 'அகற்று',

        // Summary Screen
        'grand_total': 'மொத்த தொகை',
        'total_items': 'மொத்த உருப்படிகள்',
        'save_estimation': 'மதிப்பீட்டைச் சேமி',
        'share': 'பகிர்',
        'print': 'பிரிண்ட்',
        'no_items': 'மதிப்பீட்டில் எந்த பொருளும் இல்லை',
        'item_removed': 'பட்டியலில் இருந்து பொருள் அகற்றப்பட்டது',
        'connected': 'இணைக்கப்பட்டுள்ளது',
        'disconnected': 'துண்டிக்கப்பட்டது',
        'save': 'சேமி',
        'no_items_added': 'இன்னும் உருப்படிகள் எதுவும் சேர்க்கப்படவில்லை',
        'purchase_item_added': 'கொள்முதல் உருப்படி சேர்க்கப்பட்டது',
        'product_found': 'தயாரிப்பு கண்டறியப்பட்டது',
        'scan_again': 'மீண்டும் ஸ்கேன் செய்',
        'camera_permission_needed': 'டேக்குகளை ஸ்கேன் செய்ய கேமரா அனுமதி தேவை.',
        'grant_permission': 'அனுமதி வழங்கு',
        'align_qr_code': 'QR குறியீட்டை சட்டகத்திற்குள் சீரமைக்கவும்',
        'fetching_product': 'தயாரிப்புகளைத் தேடுகிறது...',
        'product_not_found': 'தயாரிப்பு கண்டறியப்படவில்லை',
        'value': 'மதிப்பு',
        'optional': 'விருப்பத்தேர்வு',
        'hsn_code': 'HSN குறியீடு',
        'bulk_upload': 'மொத்த பதிவேற்றம்',
        'import_excel': 'Excel/CSV இறக்குமதி',
        'print_preview': 'அச்சு முன்னோட்டம்',
        'search_placeholder': 'தயாரிப்புகளைத் தேடு...',

        // Product Management
        'manage_products_title': 'தயாரிப்புகளை நிர்வகி',
        'select_product_category': 'தயாரிப்பு வகையைத் தேர்ந்தெடுக்கவும்',
        'add_new': 'புதியதைச் சேர்',
        'default_settings_for': '{name} க்கான இயல்புநிலை அமைப்புகள்',
        'save_defaults': 'இயல்புநிலைகளைச் சேமி',
        'add_sub': 'துணை வகையைச் சேர்',
        'delete_sub_confirm': 'இந்தத் துணைத் தயாரிப்பை நீக்கவா?',
        'delete_product_confirm': 'தயாரிப்பை நீக்கினால் அதன் அனைத்து துணைத் தயாரிப்புகளும் நீக்கப்படும். தொடரவா?',
        'product_category_manage_help': 'இயல்புநிலைகள் மற்றும் துணைத் தயாரிப்புகளை நிர்வகிக்க மேலே உள்ள தயாரிப்பு வகையைத் தேர்ந்தெடுக்கவும்.',
        'add_new_product': 'புதிய தயாரிப்பைச் சேர்',
        'add_sub_product_for': '{name} க்கான துணைத் தயாரிப்பைச் சேர்',
        'product_name_placeholder': 'தயாரிப்பு பெயர் (எ.கா. மோதிரம், சங்கிலி)',
        'sub_product_name_placeholder': 'துணைத் தயாரிப்பு பெயர் (எ.கா. பிளைன், காஸ்டிங்)',
        'set_initial_defaults': 'ஆரம்ப இயல்புநிலைகளை அமைக்கவும் (விருப்பத்தேர்வு):',
        'save_product': 'தயாரிப்பைச் சேமி',
        'add_sub_product': 'துணைத் தயாரிப்பைச் சேர்',

        // Rate update
        'update_daily_rates': 'தினசரி விலைகளைப் புதுப்பிக்கவும்',
        'gold_24k': 'தங்கம் 24K',
        'gold_22k': 'தங்கம் 22K',
        'gold_18k': 'தங்கம் 18K',
        'update_rates': 'விலைகளைப் புதுப்பி',

        // Customer Details
        'enter_name': 'பெயரை உள்ளிடவும்',
        'enter_mobile': 'மொபைல் எண்ணை உள்ளிடவும்',
        'enter_email': 'மின்னஞ்சலை உள்ளிடவும்',
        'enter_address': 'முகவரியை உள்ளிடவும்',
        'address': 'முகவரி',
        'success': 'வெற்றி',
        'yes': 'ஆம்',
        'no': 'இல்லை',
        'device_name': 'சாதனத்தின் பெயர்',
        'enter_device_name': 'சாதனத்தின் பெயரை உள்ளிடவும்',
        'download_sample': 'மாதிரி கோப்பைப் பதிவிறக்கு',
        'filter_orders': 'ஆர்டர்களை வடிகட்டவும்',
        'today': 'இன்று',
        'yesterday': 'நேற்று',
        'last_7_days': 'கடந்த 7 நாட்கள்',
        'last_month': 'கடந்த மாதம்',
        'custom_range': 'விருப்பத்தேர்வு காலம்',
        'apply': 'தேர்ந்தெடு',
        'start_date': 'ஆரம்ப தேதி',
        'end_date': 'முடிவு தேதி',
        'employee_name': 'பணியாளர் பெயர்',
        'bluetooth_on': 'ப்ளூடூத் ஆன் செய்யப்பட்டுள்ளது',
        'bluetooth_off': 'ப்ளூடூத் ஆஃப் செய்யப்பட்டுள்ளது',
        'enable': 'ஆன் செய்',
        'retry': 'மீண்டும் முயற்சி',
        'connected_status': 'இணைக்கப்பட்டுள்ளது',
        'duplicate_item': 'நகல் பொருள்',
        'duplicate_item_msg': 'டேக் {tag} கொண்ட பொருள் ஏற்கனவே பட்டியலில் உள்ளது.',
        'operator_required': 'பணியாளர் பெயர் தேவை',
        'enter_operator_msg': 'பிரிண்ட் எடுப்பதற்கு முன் பணியாளர் பெயரை உள்ளிடவும்.',
        'merged_receipt': 'ஒற்றை ரசீது (இணைக்கப்பட்டது)',
        'separate_receipts': 'தனித்தனி ரசீதுகள்',
        'print_success': 'பிரிண்ட் முடிந்தது',
        'print_success_msg': 'ரசீது அச்சிடப்பட்டு ஆர்டர் சேமிக்கப்பட்டது. பட்டியலை அழிக்கவா?',
        'keep_list': 'அப்படியே இருக்கட்டும்',
        'clear_list_confirm': 'பட்டியலை அழி',
        'item_added': 'பொருள் சேர்க்கப்பட்டது',
        'thank_you': 'மிக்க நன்றி மீண்டும் வருக',
    }
}

export const GeneralSettingsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [theme, setTheme] = useState<ThemeMode>('light');
    const [language, setLanguageState] = useState<Language>('en');
    const [shopDetails, setShopDetails] = useState({
        name: 'GOLD ESTIMATION',
        address: '',
        phone: '',
        gstNumber: '',
        email: '',
        footerMessage: 'Thank You! Visit Again.',
    });

    const [connectedPrinter, setConnectedPrinter] = useState<ConnectedPrinter | null>(null);
    const [printerType, setPrinterTypeState] = useState<PrinterType>('system');

    const [adminPin, setAdminPin] = useState('1234');

    const [isPrinterConnected, setIsPrinterConnected] = useState(false);
    const [isBluetoothEnabled, setIsBluetoothEnabled] = useState(true);
    const [deviceName, setDeviceNameState] = useState<string>('');

    useEffect(() => {
        // Load settings from DB on mount
        const loadSettings = async () => {
            try {
                // Load shop details
                const savedShopDetails = await Promise.all([
                    getSetting('shop_name'),
                    getSetting('shop_address'),
                    getSetting('shop_phone'),
                    getSetting('shop_gst'),
                    getSetting('shop_email'),
                    getSetting('shop_footer')
                ]);

                if (savedShopDetails[0]) setShopDetails(prev => ({ ...prev, name: savedShopDetails[0]! }));
                if (savedShopDetails[1]) setShopDetails(prev => ({ ...prev, address: savedShopDetails[1]! }));
                if (savedShopDetails[2]) setShopDetails(prev => ({ ...prev, phone: savedShopDetails[2]! }));
                if (savedShopDetails[3]) setShopDetails(prev => ({ ...prev, gstNumber: savedShopDetails[3]! }));
                if (savedShopDetails[4]) setShopDetails(prev => ({ ...prev, email: savedShopDetails[4]! }));
                if (savedShopDetails[5]) setShopDetails(prev => ({ ...prev, footerMessage: savedShopDetails[5]! }));

                // Load Admin PIN
                const savedPin = await getSetting('admin_pin');
                if (savedPin) setAdminPin(savedPin);

                // Load Theme/Language if saved
                const savedTheme = await getSetting('app_theme');
                if (savedTheme) setTheme(savedTheme as ThemeMode);

                const savedLang = await getSetting('app_language');
                if (savedLang) setLanguageState(savedLang as Language);

                // Load Connected Printer
                const savedPrinter = await getSetting('connected_printer');
                if (savedPrinter) {
                    try {
                        setConnectedPrinter(JSON.parse(savedPrinter));
                    } catch (e) {
                        console.error("Failed to parse saved printer", e);
                    }
                }

                // Load Printer Type
                const savedPrinterType = await getSetting('printer_type');
                if (savedPrinterType) setPrinterTypeState(savedPrinterType as PrinterType);

                // Load Device Name
                const savedDeviceName = await getSetting('device_name');
                if (savedDeviceName) {
                    setDeviceNameState(savedDeviceName);
                } else {
                    const randomId = Math.random().toString(36).substring(7).toUpperCase();
                    const defaultName = `Device-${randomId}`;
                    setDeviceNameState(defaultName);
                    await setSetting('device_name', defaultName);
                }

            } catch (e) {
                console.error("Failed to load settings", e);
            }
        }
        loadSettings();
    }, []);

    const updateShopDetails = async (details: Partial<typeof shopDetails>) => {
        setShopDetails(prev => ({ ...prev, ...details }));
        // Save individually to DB
        if (details.name) await setSetting('shop_name', details.name);
        if (details.address) await setSetting('shop_address', details.address);
        if (details.phone) await setSetting('shop_phone', details.phone);
        if (details.gstNumber) await setSetting('shop_gst', details.gstNumber);
        if (details.email) await setSetting('shop_email', details.email);
        if (details.footerMessage) await setSetting('shop_footer', details.footerMessage);
    };

    const updateAdminPin = async (newPin: string) => {
        setAdminPin(newPin);
        await setSetting('admin_pin', newPin);
    };

    const toggleTheme = () => {
        const newTheme = theme === 'light' ? 'dark' : 'light';
        setTheme(newTheme);
        setSetting('app_theme', newTheme);
    };

    const setLanguage = (lang: Language) => {
        setLanguageState(lang);
        setSetting('app_language', lang);
    };

    const setPrinterType = (type: PrinterType) => {
        setPrinterTypeState(type);
        setSetting('printer_type', type);
    };

    const updateDeviceName = async (name: string) => {
        setDeviceNameState(name);
        await setSetting('device_name', name);
    };

    const t = (key: string, params?: Record<string, string>) => {
        let translation = translations[language][key] || key;
        if (params) {
            Object.keys(params).forEach(param => {
                translation = translation.replace(`{${param}}`, params[param]);
            });
        }
        return translation;
    };

    return (
        <GeneralSettingsContext.Provider value={{
            theme,
            language,
            toggleTheme,
            setLanguage,
            connectedPrinter,
            setPrinterType,
            printerType,
            setConnectedPrinter: async (printer: ConnectedPrinter | null) => {
                setConnectedPrinter(printer);
                if (printer) {
                    await setSetting('connected_printer', JSON.stringify(printer));
                } else {
                    // We don't have a specific removeSetting but setSetting with empty or null might work 
                    // or we just set it to empty string/null string
                    await setSetting('connected_printer', '');
                }
            },
            shopDetails,
            updateShopDetails,
            t,
            adminPin,
            updateAdminPin,
            isPrinterConnected,
            setIsPrinterConnected,
            isBluetoothEnabled,
            setIsBluetoothEnabled,
            deviceName,
            updateDeviceName
        }}>
            {children}
        </GeneralSettingsContext.Provider>
    );
};

export const useGeneralSettings = () => {
    const context = useContext(GeneralSettingsContext);
    if (context === undefined) {
        throw new Error('useGeneralSettings must be used within a GeneralSettingsProvider');
    }
    return context;
};
