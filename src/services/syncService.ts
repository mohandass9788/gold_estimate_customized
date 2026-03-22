import apiClient from './apiClient';
import {
    getEstimationsForRecentDays,
    getOrders,
    getRepairs,
    getEmployees,
    getCustomers,
    saveEstimation,
    saveOrder,
    saveRepair,
    saveCustomer,
    addEmployee,
    getSyncTotals,
    DBEstimation,
    DBOrder,
    DBRepair,
    DBEmployee,
    DBCustomer
} from './dbService';

export interface SyncPayload {
    customers: any[];
    estimations: any[];
    purchases: any[];
    repairs: any[];
    employees: any[];
}

/**
 * Gets a preview of the sync data counts
 */
export const getSyncBackupPreview = async () => {
    return await getSyncTotals();
};

/**
 * Pushes local data to the central server
 */
export const pushSyncData = async (): Promise<any> => {
    try {
        console.log('[sync] Gathering local data for push sync...');

        // Gather full local data
        const estimationsRaw = await getEstimationsForRecentDays(10000);
        const purchasesRaw = await getOrders(10000);
        const repairsRaw = await getRepairs(10000);
        const employeesRaw = await getEmployees();
        const customersRaw = await getCustomers('');

        // Map to exact backend format with defensive guards
        const payload: SyncPayload = {
            customers: customersRaw.map(c => ({
                id: String(c.id),
                local_id: String(c.id),
                name: c.name || 'Unknown',
                phone: c.mobile || '',
                address: c.address1 || '',
                total_visits: 0
            })),
            estimations: estimationsRaw.map(e => ({
                id: String(e.id),
                local_id: String(e.id),
                bill_no: e.estimationNumber || 0,
                customer_name: e.customerName || 'Walking Customer',
                customer_phone: e.customerMobile || '',
                total_amount: Number(e.grandTotal || 0),
                items: e.items || '[]',
                status: 'active'
            })),
            purchases: purchasesRaw.map(o => ({
                id: String(o.orderId),
                local_id: String(o.orderId),
                bill_no: o.estimationNumber || 0,
                customer_name: o.customerName || 'Walking Customer',
                customer_phone: o.customerMobile || '',
                total_amount: Number(o.netPayable || 0),
                status: o.status || 'completed'
            })),
            repairs: repairsRaw.map(r => ({
                id: String(r.id),
                local_id: String(r.id),
                customer_name: r.customerName || 'Walking Customer',
                customer_phone: r.customerMobile || '',
                item: r.itemName || '',
                amount: Number(r.amount || 0),
                status: r.status || 'pending'
            })),
            employees: employeesRaw.map(emp => ({
                id: String(emp.empId),
                local_id: String(emp.empId),
                name: emp.name || '',
                phone: emp.phone || '',
                role: emp.role || 'employee',
                status: emp.isActive ? 'active' : 'inactive'
            }))
        };

        console.log(`[sync] Pushing => Estimations: ${payload.estimations.length}, Purchases: ${payload.purchases.length}`, payload);

        const response = await apiClient.post('/api/sync/push', payload);
        console.log('[sync] Push success:', response.data);
        return response.data;
    } catch (error: any) {
        console.error('[sync] Push failed:', error);
        throw error;
    }
};

/**
 * Pulls central server data and updates local SQLite database
 */
export const pullSyncData = async (): Promise<any> => {
    try {
        console.log('[sync] Requesting pull sync from server...');
        const response = await apiClient.post<SyncPayload>('/api/sync/pull');
        const data = response.data;

        console.log(`[sync] Received data payload`);

        // Bulk insert/update
        if (data.estimations && Array.isArray(data.estimations)) {
            for (const est of data.estimations) {
                await saveEstimation({
                    id: est.local_id || est.id,
                    estimationNumber: est.bill_no,
                    customerName: est.customer_name,
                    customerMobile: est.customer_phone,
                    grandTotal: est.total_amount,
                    items: est.items,
                    date: est.date || new Date().toISOString(),
                    totalWeight: 0, // Server might not send this, we fallback
                } as any);
            }
        }

        if (data.purchases && Array.isArray(data.purchases)) {
            for (const pur of data.purchases) {
                await saveOrder({
                    orderId: pur.local_id || pur.id,
                    estimationNumber: pur.bill_no,
                    customerName: pur.customer_name,
                    customerMobile: pur.customer_phone,
                    netPayable: pur.total_amount,
                    grossTotal: pur.total_amount,
                    status: pur.status,
                    date: pur.date || new Date().toISOString(),
                    employeeName: 'Sync'
                }, []);
            }
        }

        if (data.repairs && Array.isArray(data.repairs)) {
            for (const rep of data.repairs) {
                await saveRepair({
                    id: rep.local_id || rep.id,
                    customerName: rep.customer_name,
                    customerMobile: rep.customer_phone,
                    itemName: rep.item,
                    amount: rep.amount,
                    status: rep.status,
                    date: rep.date || new Date().toISOString()
                } as any);
            }
        }

        if (data.customers && Array.isArray(data.customers)) {
            for (const cust of data.customers) {
                if (cust.name && cust.phone) {
                    await saveCustomer(cust.name, cust.phone, cust.address);
                }
            }
        }

        console.log('[sync] Local database updated successfully.');
        return data;
    } catch (error: any) {
        console.error('[sync] Pull failed:', error);
        throw error;
    }
};
