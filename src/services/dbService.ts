import * as SQLite from 'expo-sqlite';

const DB_NAME = 'gold_estimation.db';

export interface DBProduct {
    id: number;
    name: string;
    description?: string;
    defaultPurity?: number;
    defaultWastage?: number;
    defaultWastageType?: string;
    defaultMakingCharge?: number;
    defaultMakingChargeType?: string;
    metal: 'GOLD' | 'SILVER';
    hsnCode?: string;
}

export interface DBSubProduct {
    id: number;
    productId: number;
    name: string;
}

export interface DBSettings {
    key: string;
    value: string;
}

export interface DBEstimation {
    id: string;
    customerName: string;
    customerMobile: string;
    date: string;
    items: string; // JSON stringified ExecutionItem[]
    purchaseItems?: string; // JSON stringified PurchaseItem[]
    chitItems?: string; // JSON stringified ChitItem[]
    advanceItems?: string; // JSON stringified AdvanceItem[]
    totalWeight: number;
    grandTotal: number;
}

let db: SQLite.SQLiteDatabase | null = null;
let initPromise: Promise<void> | null = null;

export const initDatabase = async () => {
    if (initPromise) return initPromise;

    initPromise = (async () => {
        try {
            db = await SQLite.openDatabaseAsync(DB_NAME);

            // Enable foreign keys
            await db.execAsync('PRAGMA foreign_keys = ON;');

            // Create Products table
            await db.execAsync(`
                CREATE TABLE IF NOT EXISTS products (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    name TEXT NOT NULL UNIQUE,
                    description TEXT,
                    defaultPurity INTEGER DEFAULT 22,
                    defaultWastage REAL DEFAULT 0,
                    defaultWastageType TEXT DEFAULT 'percentage',
                    defaultMakingCharge REAL DEFAULT 0,
                    defaultMakingChargeType TEXT DEFAULT 'perGram',
                    metal TEXT DEFAULT 'GOLD',
                    hsnCode TEXT
                );
            `);

            // Migration: Add missing columns if table already existed without them
            const tableInfo = await db.getAllAsync<{ name: string }>('PRAGMA table_info(products);');
            const columnNames = tableInfo.map(c => c.name);

            const migrations = [
                { name: 'description', type: 'TEXT' },
                { name: 'defaultPurity', type: 'INTEGER DEFAULT 22' },
                { name: 'defaultWastage', type: 'REAL DEFAULT 0' },
                { name: 'defaultWastageType', type: "TEXT DEFAULT 'percentage'" },
                { name: 'defaultMakingCharge', type: 'REAL DEFAULT 0' },
                { name: 'defaultMakingChargeType', type: "TEXT DEFAULT 'perGram'" },
                { name: 'metal', type: "TEXT DEFAULT 'GOLD'" },
                { name: 'hsnCode', type: 'TEXT' },
            ];

            for (const m of migrations) {
                if (!columnNames.includes(m.name)) {
                    console.log(`Migrating: Adding column ${m.name} to products table`);
                    await db.execAsync(`ALTER TABLE products ADD COLUMN ${m.name} ${m.type};`);
                }
            }

            // Create Sub-Products table
            await db.execAsync(`
                CREATE TABLE IF NOT EXISTS sub_products (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    productId INTEGER NOT NULL,
                    name TEXT NOT NULL,
                    FOREIGN KEY (productId) REFERENCES products (id) ON DELETE CASCADE,
                    UNIQUE(productId, name)
                );
            `);

            // Create settings table
            await db.execAsync(`
                CREATE TABLE IF NOT EXISTS settings (
                    key TEXT PRIMARY KEY,
                    value TEXT NOT NULL
                );
            `);

            // Create Users table for Auth
            await db.execAsync(`
                CREATE TABLE IF NOT EXISTS users (
                    username TEXT PRIMARY KEY,
                    password TEXT NOT NULL
                );
            `);

            // Insert default admin user if not exists
            const userCount = await db.getFirstAsync<{ count: number }>('SELECT COUNT(*) as count FROM users;');
            if (userCount?.count === 0) {
                await db.runAsync('INSERT INTO users (username, password) VALUES (?, ?);', ['admin', 'admin']);
            }

            // Create Estimations table (for history)
            await db.execAsync(`
                CREATE TABLE IF NOT EXISTS estimations (
                    id TEXT PRIMARY KEY,
                    customerName TEXT,
                    customerMobile TEXT,
                    date TEXT NOT NULL,
                    items TEXT NOT NULL,
                    purchaseItems TEXT,
                    chitItems TEXT,
                    advanceItems TEXT,
                    totalWeight REAL NOT NULL,
                    grandTotal REAL NOT NULL
                );
            `);

            // Create Orders table
            await db.execAsync(`
                CREATE TABLE IF NOT EXISTS orders (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    orderId TEXT NOT NULL UNIQUE,
                    customerName TEXT,
                    customerMobile TEXT,
                    employeeName TEXT NOT NULL,
                    date TEXT NOT NULL,
                    grossTotal REAL NOT NULL,
                    netPayable REAL NOT NULL,
                    status TEXT DEFAULT 'completed'
                );
            `);

            // Create Order-Items table
            await db.execAsync(`
                CREATE TABLE IF NOT EXISTS order_items (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    orderId TEXT NOT NULL,
                    type TEXT NOT NULL, -- 'PRODUCT', 'PURCHASE', 'CHIT', 'ADVANCE'
                    itemData TEXT NOT NULL, -- JSON string
                    FOREIGN KEY (orderId) REFERENCES orders (orderId) ON DELETE CASCADE
                );
            `);

            // Migration: Add purchaseItems column if missing
            const estTableInfo = await db.getAllAsync<{ name: string }>('PRAGMA table_info(estimations);');
            const estColumnNames = estTableInfo.map(c => c.name);
            if (!estColumnNames.includes('purchaseItems')) {
                console.log('Migrating: Adding purchaseItems column to estimations table');
                await db.execAsync('ALTER TABLE estimations ADD COLUMN purchaseItems TEXT;');
            }
            if (!estColumnNames.includes('chitItems')) {
                console.log('Migrating: Adding chitItems column to estimations table');
                await db.execAsync('ALTER TABLE estimations ADD COLUMN chitItems TEXT;');
            }
            if (!estColumnNames.includes('advanceItems')) {
                console.log('Migrating: Adding advanceItems column to estimations table');
                await db.execAsync('ALTER TABLE estimations ADD COLUMN advanceItems TEXT;');
            }

            // Create metal_types table
            await db.execAsync(`
                CREATE TABLE IF NOT EXISTS metal_types (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    name TEXT NOT NULL UNIQUE,
                    purity REAL NOT NULL,
                    metal TEXT NOT NULL -- 'GOLD' or 'SILVER'
                );
            `);

            // Initialize default metal types if empty
            const metalCount = await db.getFirstAsync<{ count: number }>('SELECT COUNT(*) as count FROM metal_types;');
            if (metalCount?.count === 0) {
                console.log('Initializing default metal types...');
                const defaultMetals = [
                    { name: '24K Gold', purity: 24, metal: 'GOLD' },
                    { name: '22K Gold (916)', purity: 22, metal: 'GOLD' },
                    { name: '20K Gold (833)', purity: 20, metal: 'GOLD' },
                    { name: '18K Gold (750)', purity: 18, metal: 'GOLD' },
                    { name: 'Pure Silver', purity: 100, metal: 'SILVER' },
                    { name: 'Sterling Silver (925)', purity: 92.5, metal: 'SILVER' },
                ];
                for (const m of defaultMetals) {
                    await db.runAsync('INSERT INTO metal_types (name, purity, metal) VALUES (?, ?, ?);', [m.name, m.purity, m.metal]);
                }
            }

            // Create Purchase Categories table
            await db.execAsync(`
                CREATE TABLE IF NOT EXISTS purchase_categories (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    name TEXT NOT NULL UNIQUE
                );
            `);

            // Create Purchase Sub-Categories table
            await db.execAsync(`
                CREATE TABLE IF NOT EXISTS purchase_sub_categories (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    categoryId INTEGER NOT NULL,
                    name TEXT NOT NULL,
                    FOREIGN KEY (categoryId) REFERENCES purchase_categories (id) ON DELETE CASCADE,
                    UNIQUE(categoryId, name)
                );
            `);

            // Insert default data if empty
            const productCount = await db.getFirstAsync<{ count: number }>('SELECT COUNT(*) as count FROM products;');
            if (productCount?.count === 0) {
                console.log('Initializing default products...');
                const defaultProducts = ['Bangle', 'Chain', 'Ring', 'Earring'];
                const defaultSubProducts: Record<string, string[]> = {
                    'Bangle': ['Plain', 'Casting', 'Fancy', 'Diamond Look'],
                    'Chain': ['Plain', 'Casting', 'Fancy', 'Machine Made'],
                    'Ring': ['Plain', 'Casting', 'Fancy', 'Stone'],
                    'Earring': ['Plain', 'Casting', 'Fancy', 'Stud'],
                };

                for (const productName of defaultProducts) {
                    const result = await db.runAsync('INSERT INTO products (name) VALUES (?);', [productName]);
                    const productId = result.lastInsertRowId;

                    const subs = defaultSubProducts[productName] || ['Plain', 'Casting', 'Fancy'];
                    for (const subName of subs) {
                        await db.runAsync('INSERT INTO sub_products (productId, name) VALUES (?, ?);', [productId, subName]);
                    }
                }
            }

            // Insert default purchase categories if empty
            const purchaseCatCount = await db.getFirstAsync<{ count: number }>('SELECT COUNT(*) as count FROM purchase_categories;');
            if (purchaseCatCount?.count === 0) {
                console.log('Initializing default purchase categories...');
                const defaultCats = ['Old Gold', 'Old Silver', 'Exchange'];
                const defaultSubCats: Record<string, string[]> = {
                    'Old Gold': ['916 KDM', '916 Hallmark', 'Nallapusa', 'Melting'],
                    'Old Silver': ['925 Sterling', 'Local Silver', 'Patti', 'Vessels'],
                    'Exchange': ['Gold Exchange', 'Silver Exchange'],
                };

                for (const catName of defaultCats) {
                    const result = await db.runAsync('INSERT INTO purchase_categories (name) VALUES (?);', [catName]);
                    const catId = result.lastInsertRowId;

                    const subs = defaultSubCats[catName] || ['General'];
                    for (const subName of subs) {
                        await db.runAsync('INSERT INTO purchase_sub_categories (categoryId, name) VALUES (?, ?);', [catId, subName]);
                    }
                }
            }

            // Insert default settings if empty
            const settingsCount = await db.getFirstAsync<{ count: number }>('SELECT COUNT(*) as count FROM settings;');
            if (settingsCount?.count === 0) {
                await db.runAsync('INSERT INTO settings (key, value) VALUES (?, ?);', ['gst_percentage', '3']);
                await db.runAsync('INSERT INTO settings (key, value) VALUES (?, ?);', ['shop_name', 'Gold Estimation App']);
            }

            console.log('Database initialized successfully');
        } catch (error) {
            console.error('Database initialization error:', error);
            initPromise = null;
            throw error;
        }
    })();
    return initPromise;
};

export const getProducts = async (): Promise<DBProduct[]> => {
    if (!db) await initDatabase();
    return await db!.getAllAsync<DBProduct>('SELECT * FROM products ORDER BY name;');
};

export const getSubProducts = async (productId: number): Promise<DBSubProduct[]> => {
    if (!db) await initDatabase();
    return await db!.getAllAsync<DBSubProduct>('SELECT * FROM sub_products WHERE productId = ? ORDER BY name;', [productId]);
};

export const addProduct = async (
    name: string,
    purity: number = 22,
    wastage: number = 0,
    wastageType: string = 'percentage',
    makingCharge: number = 0,
    makingChargeType: string = 'perGram',
    metal: string = 'GOLD',
    hsnCode: string = ''
): Promise<number> => {
    if (!db) await initDatabase();
    const result = await db!.runAsync(
        'INSERT INTO products (name, defaultPurity, defaultWastage, defaultWastageType, defaultMakingCharge, defaultMakingChargeType, metal, hsnCode) VALUES (?, ?, ?, ?, ?, ?, ?, ?);',
        [name, purity, wastage, wastageType, makingCharge, makingChargeType, metal, hsnCode]
    );
    return result.lastInsertRowId;
};

export const updateProduct = async (product: DBProduct): Promise<void> => {
    if (!db) await initDatabase();
    await db!.runAsync(
        'UPDATE products SET defaultPurity = ?, defaultWastage = ?, defaultWastageType = ?, defaultMakingCharge = ?, defaultMakingChargeType = ?, metal = ?, hsnCode = ? WHERE id = ?;',
        [
            product.defaultPurity ?? 22,
            product.defaultWastage ?? 0,
            product.defaultWastageType ?? 'percentage',
            product.defaultMakingCharge ?? 0,
            product.defaultMakingChargeType ?? 'perGram',
            product.metal || 'GOLD',
            product.hsnCode || '',
            product.id
        ]
    );
};

export const deleteProduct = async (id: number): Promise<void> => {
    if (!db) await initDatabase();
    await db!.runAsync('DELETE FROM products WHERE id = ?;', [id]);
};

export const addSubProduct = async (productId: number, name: string): Promise<number> => {
    if (!db) await initDatabase();
    const result = await db!.runAsync('INSERT INTO sub_products (productId, name) VALUES (?, ?);', [productId, name]);
    return result.lastInsertRowId;
};

export const ensureProduct = async (
    name: string,
    purity: number = 22,
    wastage: number = 0,
    wastageType: string = 'percentage',
    makingCharge: number = 0,
    makingChargeType: string = 'perGram',
    metal: string = 'GOLD',
    hsnCode: string = ''
): Promise<{ id: number, created: boolean }> => {
    if (!db) await initDatabase();

    // Check if exists
    const existing = await db!.getFirstAsync<{ id: number }>('SELECT id FROM products WHERE name = ?;', [name]);
    if (existing) {
        return { id: existing.id, created: false };
    }

    // Create new
    const id = await addProduct(name, purity, wastage, wastageType, makingCharge, makingChargeType, metal, hsnCode);
    return { id, created: true };
};

export const ensureSubProduct = async (productId: number, name: string): Promise<{ id: number, created: boolean }> => {
    if (!db) await initDatabase();

    // Check if exists
    const existing = await db!.getFirstAsync<{ id: number }>('SELECT id FROM sub_products WHERE productId = ? AND name = ?;', [productId, name]);
    if (existing) {
        return { id: existing.id, created: false };
    }

    // Create new
    const id = await addSubProduct(productId, name);
    return { id, created: true };
};

export const deleteSubProduct = async (id: number): Promise<void> => {
    if (!db) await initDatabase();
    await db!.runAsync('DELETE FROM sub_products WHERE id = ?;', [id]);
};

export const saveEstimation = async (estimation: DBEstimation): Promise<void> => {
    if (!db) await initDatabase();
    await db!.runAsync(
        'INSERT INTO estimations (id, customerName, customerMobile, date, items, purchaseItems, chitItems, advanceItems, totalWeight, grandTotal) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?);',
        [
            estimation.id,
            estimation.customerName,
            estimation.customerMobile,
            estimation.date,
            estimation.items,
            estimation.purchaseItems || '[]',
            estimation.chitItems || '[]',
            estimation.advanceItems || '[]',
            estimation.totalWeight,
            estimation.grandTotal
        ]
    );
};

export const getRecentEstimations = async (limit: number = 10): Promise<DBEstimation[]> => {
    if (!db) await initDatabase();
    return await db!.getAllAsync<DBEstimation>('SELECT * FROM estimations ORDER BY date DESC LIMIT ?;', [limit]);
};

export const clearEstimations = async (): Promise<void> => {
    if (!db) await initDatabase();
    await db!.runAsync('DELETE FROM estimations;');
};

export const getFilteredEstimations = async (startDate?: string, endDate?: string, limit: number = 50): Promise<DBEstimation[]> => {
    if (!db) await initDatabase();
    if (startDate && endDate) {
        return await db!.getAllAsync<DBEstimation>(
            'SELECT * FROM estimations WHERE date >= ? AND date <= ? ORDER BY date DESC LIMIT ?;',
            [startDate, endDate, limit]
        );
    }
    return await db!.getAllAsync<DBEstimation>('SELECT * FROM estimations ORDER BY date DESC LIMIT ?;', [limit]);
};

export interface DBPurchaseCategory {
    id: number;
    name: string;
}

export interface DBPurchaseSubCategory {
    id: number;
    categoryId: number;
    name: string;
}

export const getPurchaseCategories = async (): Promise<DBPurchaseCategory[]> => {
    if (!db) await initDatabase();
    return await db!.getAllAsync<DBPurchaseCategory>('SELECT * FROM purchase_categories ORDER BY name;');
};

export const getPurchaseSubCategories = async (categoryId: number): Promise<DBPurchaseSubCategory[]> => {
    if (!db) await initDatabase();
    return await db!.getAllAsync<DBPurchaseSubCategory>('SELECT * FROM purchase_sub_categories WHERE categoryId = ? ORDER BY name;', [categoryId]);
};

export const addPurchaseCategory = async (name: string): Promise<number> => {
    if (!db) await initDatabase();
    const result = await db!.runAsync('INSERT INTO purchase_categories (name) VALUES (?);', [name]);
    return result.lastInsertRowId;
};

export const deletePurchaseCategory = async (id: number): Promise<void> => {
    if (!db) await initDatabase();
    await db!.runAsync('DELETE FROM purchase_categories WHERE id = ?;', [id]);
};

export const addPurchaseSubCategory = async (categoryId: number, name: string): Promise<number> => {
    if (!db) await initDatabase();
    const result = await db!.runAsync('INSERT INTO purchase_sub_categories (categoryId, name) VALUES (?, ?);', [categoryId, name]);
    return result.lastInsertRowId;
};

export const deletePurchaseSubCategory = async (id: number): Promise<void> => {
    if (!db) await initDatabase();
    await db!.runAsync('DELETE FROM purchase_sub_categories WHERE id = ?;', [id]);
};

export const getSettings = async (): Promise<DBSettings[]> => {
    if (!db) await initDatabase();
    return await db!.getAllAsync<DBSettings>('SELECT * FROM settings;');
};

export const getSetting = async (key: string): Promise<string | null> => {
    if (!db) await initDatabase();
    const result = await db!.getFirstAsync<{ value: string }>('SELECT value FROM settings WHERE key = ?;', [key]);
    return result ? result.value : null;
};

export const setSetting = async (key: string, value: string): Promise<void> => {
    if (!db) await initDatabase();
    await db!.runAsync('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?);', [key, value]);
};

export const validateUser = async (username: string, password?: string): Promise<boolean> => {
    if (!db) await initDatabase();
    // Validate username and password
    if (password) {
        const result = await db!.getFirstAsync<{ count: number }>('SELECT COUNT(*) as count FROM users WHERE username = ? AND password = ?;', [username, password]);
        return (result?.count || 0) > 0;
    }
    // Just validate username config existing (for profile load)
    const result = await db!.getFirstAsync<{ count: number }>('SELECT COUNT(*) as count FROM users WHERE username = ?;', [username]);
    return (result?.count || 0) > 0;
};

export const updateUserCredentials = async (username: string, newPassword?: string, newUsername?: string): Promise<void> => {
    if (!db) await initDatabase();

    if (newUsername && newUsername !== username) {
        if (newPassword) {
            await db!.runAsync('UPDATE users SET username = ?, password = ? WHERE username = ?;', [newUsername, newPassword, username]);
        } else {
            await db!.runAsync('UPDATE users SET username = ? WHERE username = ?;', [newUsername, username]);
        }
    } else if (newPassword) {
        await db!.runAsync('UPDATE users SET password = ? WHERE username = ?;', [newPassword, username]);
    }
};

export const getCurrentUser = async (): Promise<{ username: string } | null> => {
    if (!db) await initDatabase();
    const result = await db!.getFirstAsync<{ username: string }>('SELECT username FROM users LIMIT 1;');
    return result || null;
};

// Metal Types Management (Gold Master)
export interface DBMetalType {
    id: number;
    name: string;
    purity: number;
    metal: 'GOLD' | 'SILVER';
}

export const getMetalTypes = async (): Promise<DBMetalType[]> => {
    if (!db) await initDatabase();
    return await db!.getAllAsync<DBMetalType>('SELECT * FROM metal_types ORDER BY metal DESC, purity DESC;');
};

export const addMetalType = async (name: string, purity: number, metal: 'GOLD' | 'SILVER'): Promise<number> => {
    if (!db) await initDatabase();
    const result = await db!.runAsync('INSERT INTO metal_types (name, purity, metal) VALUES (?, ?, ?);', [name, purity, metal]);
    return result.lastInsertRowId;
};

export const updateMetalType = async (metalType: DBMetalType): Promise<void> => {
    if (!db) await initDatabase();
    await db!.runAsync(
        'UPDATE metal_types SET name = ?, purity = ?, metal = ? WHERE id = ?;',
        [metalType.name, metalType.purity, metalType.metal, metalType.id]
    );
};

export const deleteMetalType = async (id: number): Promise<void> => {
    if (!db) await initDatabase();
    await db!.runAsync('DELETE FROM metal_types WHERE id = ?;', [id]);
};

// Order Management
export interface DBOrder {
    id: number;
    orderId: string;
    customerName: string;
    customerMobile: string;
    employeeName: string;
    date: string;
    grossTotal: number;
    netPayable: number;
    status: string;
}

export interface DBOrderItem {
    id: number;
    orderId: string;
    type: 'PRODUCT' | 'PURCHASE' | 'CHIT' | 'ADVANCE';
    itemData: string;
}

export const saveOrder = async (
    order: Omit<DBOrder, 'id'>,
    items: { type: 'PRODUCT' | 'PURCHASE' | 'CHIT' | 'ADVANCE', data: any }[]
): Promise<void> => {
    if (!db) await initDatabase();

    try {
        await db!.withTransactionAsync(async () => {
            await db!.runAsync(
                'INSERT INTO orders (orderId, customerName, customerMobile, employeeName, date, grossTotal, netPayable) VALUES (?, ?, ?, ?, ?, ?, ?);',
                [order.orderId, order.customerName, order.customerMobile, order.employeeName, order.date, order.grossTotal, order.netPayable]
            );

            for (const item of items) {
                await db!.runAsync(
                    'INSERT INTO order_items (orderId, type, itemData) VALUES (?, ?, ?);',
                    [order.orderId, item.type, JSON.stringify(item.data)]
                );
            }
        });
    } catch (e) {
        console.error('Failed to save order:', e);
        throw e;
    }
};

export const getOrders = async (limit: number = 50): Promise<DBOrder[]> => {
    if (!db) await initDatabase();
    return await db!.getAllAsync<DBOrder>('SELECT * FROM orders ORDER BY date DESC LIMIT ?;', [limit]);
};

export const getFilteredOrders = async (startDate: string, endDate: string, limit: number = 100): Promise<DBOrder[]> => {
    if (!db) await initDatabase();
    return await db!.getAllAsync<DBOrder>(
        'SELECT * FROM orders WHERE date >= ? AND date <= ? ORDER BY date DESC LIMIT ?;',
        [startDate, endDate, limit]
    );
};

export const getOrderDetails = async (orderId: string): Promise<{ order: DBOrder, items: DBOrderItem[] }> => {
    if (!db) await initDatabase();
    const order = await db!.getFirstAsync<DBOrder>('SELECT * FROM orders WHERE orderId = ?;', [orderId]);
    if (!order) throw new Error('Order not found');

    const items = await db!.getAllAsync<DBOrderItem>('SELECT * FROM order_items WHERE orderId = ?;', [orderId]);
    return { order, items };
};

export const deleteOrder = async (orderId: string): Promise<void> => {
    if (!db) await initDatabase();
    await db!.runAsync('DELETE FROM orders WHERE orderId = ?;', [orderId]);
};

export const getNextOrderId = async (): Promise<string> => {
    if (!db) await initDatabase();
    const result = await db!.getFirstAsync<{ count: number }>('SELECT COUNT(*) as count FROM orders;');
    const nextNum = (result?.count || 0) + 1;
    return `ORD-${new Date().getFullYear()}${String(new Date().getMonth() + 1).padStart(2, '0')}-${String(nextNum).padStart(4, '0')}`;
};
