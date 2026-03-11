import { thermalCommands, padR, padL } from './thermalHelpers';
import { ReceiptConfig } from '../../../store/GeneralSettingsContext';
import { format } from 'date-fns';

export const getThermalHeader = (
    shopName: string,
    deviceName: string,
    config?: ReceiptConfig,
    goldRate?: number,
    silverRate?: number
) => {
    const width = config?.paperWidth === '80mm' ? 48 : config?.paperWidth === '112mm' ? 64 : 32;
    const dateStr = format(new Date(), 'dd-MM-yyyy hh:mm a');

    let header = `${thermalCommands.reset}${thermalCommands.center}${thermalCommands.boldOn}${shopName}${thermalCommands.boldOff}\x0a`;

    // Row 1: Device ID and Date
    const devPrefix = width === 32 ? 'Dev ID:' : 'Device ID:';
    const devLabel = `${devPrefix} ${deviceName || 'NA'}`;
    header += thermalCommands.left;
    header += padR(devLabel, width - dateStr.length) + dateStr + '\x0a';

    // Row 2: Gold and Silver Rates
    if (goldRate || silverRate) {
        const goldStr = goldRate ? `Gold: ${Math.round(goldRate)}` : '';
        const silverStr = silverRate ? `Silver: ${Math.round(silverRate)}` : '';
        header += padR(goldStr, width - silverStr.length) + silverStr + '\x0a';
    }

    return header;
};

export const getThermalCustomer = (
    customer: { name?: string, mobile?: string, address?: string },
    width: number,
    config?: ReceiptConfig
) => {
    if (!customer.name && !customer.mobile && !customer.address) return '';

    let content = `${thermalCommands.left}${thermalCommands.smallOn}`;

    const details = [];
    if (customer.name && config?.showCustomerName !== false) {
        details.push(customer.name.toUpperCase());
    }

    if (customer.mobile && config?.showCustomerMobile !== false) {
        details.push(customer.mobile);
    }

    if (customer.address && config?.showCustomerAddress !== false) {
        details.push(customer.address.toUpperCase());
    }

    if (details.length > 0) {
        content += details.join(' / ') + '\x0a';
    }

    content += thermalCommands.smallOff;
    return content;
};

export const getThermalFooter = (
    employeeName: string,
    customer: { name?: string, mobile?: string, address?: string },
    width: number,
    config?: ReceiptConfig,
    footerMessage?: string,
    skipCustomer: boolean = false,
    skipCut: boolean = false
) => {
    // 1. Respect showFooter setting
    if (config && config.showFooter === false) {
        return '';
    }

    let footer = '';
    let footerStr = '';

    // 2. Add Employee Info if enabled
    if (employeeName && config?.showOperator !== false) {
        footerStr += `Emp: ${employeeName.toUpperCase()}`;
    }

    // 3. Add Customer Info if not skipped and enabled
    if (!skipCustomer && customer && (customer.name || customer.mobile || customer.address)) {
        const details = [];
        if (customer.name && config?.showCustomerName !== false) {
            details.push(customer.name.toUpperCase());
        }
        if (customer.mobile && config?.showCustomerMobile !== false) {
            details.push(customer.mobile);
        }
        if (customer.address && config?.showCustomerAddress !== false) {
            details.push(customer.address.toUpperCase());
        }

        if (details.length > 0) {
            if (footerStr.length > 0) footerStr += ' | ';
            footerStr += `Cust: ${details.join(' / ')}`;
        }
    }

    if (footerStr.length > 0) {
        footer += `${thermalCommands.smallOn}${footerStr}\x0a${thermalCommands.smallOff}`;
    }

    // 4. Add Thank You Message (Custom or Default)
    footer += `${thermalCommands.center}${thermalCommands.boldOn}`;
    if (footerMessage && footerMessage.trim()) {
        footer += footerMessage.toUpperCase();
    } else {
        footer += '*** THANK YOU VISIT AGAIN ***';
    }
    footer += thermalCommands.boldOff;
    if (!skipCut) {
        footer += '\x0a';
    }

    // 5. Final spacing and cut
    if (!skipCut) {
        footer += `\x1d\x56\x42\x00`; // GS V B 0 (Partial cut)
    }
    return footer;
};
