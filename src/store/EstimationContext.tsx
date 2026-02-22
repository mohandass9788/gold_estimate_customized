import React, { createContext, useReducer, useContext } from 'react';
import { EstimationItem, EstimationTotals, GoldRate, Customer, PurchaseItem, ChitItem, AdvanceItem } from '../types';
import { calculateEstimationTotals } from '../utils/calculations';
import { initDatabase, saveEstimation, getRecentEstimations, getSetting, setSetting, DBEstimation, getNextEstimationNumber, getEstimationsForRecentDays } from '../services/dbService';

interface EstimationState {
    items: EstimationItem[];
    purchaseItems: PurchaseItem[];
    chitItems: ChitItem[];
    advanceItems: AdvanceItem[];
    goldRate: GoldRate;
    customer: Customer | null;
    totals: EstimationTotals;
    history: DBEstimation[];
}

type Action =
    | { type: 'ADD_TAG_ITEM'; payload: EstimationItem }
    | { type: 'ADD_MANUAL_ITEM'; payload: EstimationItem }
    | { type: 'ADD_PURCHASE_ITEM'; payload: PurchaseItem }
    | { type: 'ADD_CHIT_ITEM'; payload: ChitItem }
    | { type: 'ADD_ADVANCE_ITEM'; payload: AdvanceItem }
    | { type: 'REMOVE_ITEM'; payload: { id: string, type: 'estimation' | 'purchase' | 'chit' | 'advance' } }
    | { type: 'UPDATE_GOLD_RATE'; payload: GoldRate }
    | { type: 'SET_CUSTOMER'; payload: Customer }
    | { type: 'SET_HISTORY'; payload: DBEstimation[] }
    | { type: 'ADD_MULTIPLE_TAG_ITEMS'; payload: EstimationItem[] }
    | { type: 'CLEAR_FORM' }
    | { type: 'CLEAR_ESTIMATION' };

const initialState: EstimationState = {
    items: [],
    purchaseItems: [],
    chitItems: [],
    advanceItems: [],
    goldRate: {
        rate18k: 0,
        rate20k: 0,
        rate22k: 0,
        rate24k: 0,
        silver: 0,
        date: new Date().toISOString()
    },
    customer: null,
    totals: {
        totalWeight: 0,
        totalGoldValue: 0,
        totalMakingCharge: 0,
        totalWastage: 0,
        totalGST: 0,
        totalChit: 0,
        totalAdvance: 0,
        totalPurchase: 0,
        grandTotal: 0,
    },
    history: [],
};

const estimationReducer = (state: EstimationState, action: Action): EstimationState => {
    switch (action.type) {
        case 'ADD_TAG_ITEM':
        case 'ADD_MANUAL_ITEM': {
            const newItems = [...state.items, action.payload];
            return {
                ...state,
                items: newItems,
                totals: calculateEstimationTotals(newItems, state.purchaseItems, state.chitItems, state.advanceItems),
            };
        }
        case 'ADD_MULTIPLE_TAG_ITEMS': {
            const newItems = [...state.items, ...action.payload];
            return {
                ...state,
                items: newItems,
                totals: calculateEstimationTotals(newItems, state.purchaseItems, state.chitItems, state.advanceItems),
            };
        }
        case 'ADD_PURCHASE_ITEM': {
            const newPurchaseItems = [...state.purchaseItems, action.payload];
            return {
                ...state,
                purchaseItems: newPurchaseItems,
                totals: calculateEstimationTotals(state.items, newPurchaseItems, state.chitItems, state.advanceItems),
            };
        }
        case 'ADD_CHIT_ITEM': {
            const newChitItems = [...state.chitItems, action.payload];
            return {
                ...state,
                chitItems: newChitItems,
                totals: calculateEstimationTotals(state.items, state.purchaseItems, newChitItems, state.advanceItems),
            };
        }
        case 'ADD_ADVANCE_ITEM': {
            const newAdvanceItems = [...state.advanceItems, action.payload];
            return {
                ...state,
                advanceItems: newAdvanceItems,
                totals: calculateEstimationTotals(state.items, state.purchaseItems, state.chitItems, newAdvanceItems),
            };
        }
        case 'REMOVE_ITEM': {
            if (action.payload.type === 'estimation') {
                const newItems = state.items.filter((item) => item.id !== action.payload.id);
                return {
                    ...state,
                    items: newItems,
                    totals: calculateEstimationTotals(newItems, state.purchaseItems, state.chitItems, state.advanceItems),
                };
            } else if (action.payload.type === 'purchase') {
                const newPurchaseItems = state.purchaseItems.filter((item) => item.id !== action.payload.id);
                return {
                    ...state,
                    purchaseItems: newPurchaseItems,
                    totals: calculateEstimationTotals(state.items, newPurchaseItems, state.chitItems, state.advanceItems),
                };
            } else if (action.payload.type === 'chit') {
                const newChitItems = state.chitItems.filter((item) => item.id !== action.payload.id);
                return {
                    ...state,
                    chitItems: newChitItems,
                    totals: calculateEstimationTotals(state.items, state.purchaseItems, newChitItems, state.advanceItems),
                };
            } else {
                const newAdvanceItems = state.advanceItems.filter((item) => item.id !== action.payload.id);
                return {
                    ...state,
                    advanceItems: newAdvanceItems,
                    totals: calculateEstimationTotals(state.items, state.purchaseItems, state.chitItems, newAdvanceItems),
                };
            }
        }
        case 'UPDATE_GOLD_RATE':
            return {
                ...state,
                goldRate: action.payload,
            };
        case 'SET_CUSTOMER':
            return {
                ...state,
                customer: action.payload,
            };
        case 'SET_HISTORY':
            return {
                ...state,
                history: action.payload,
            };
        case 'CLEAR_FORM':
            // Logic to clear working form state could be here or managed in the component
            return state;
        case 'CLEAR_ESTIMATION':
            return {
                ...initialState,
                goldRate: state.goldRate,
            };
        default:
            return state;
    }
};

interface EstimationContextType {
    state: EstimationState;
    addTagItem: (item: EstimationItem) => void;
    addMultipleTagItems: (items: EstimationItem[]) => void;
    addManualItem: (item: EstimationItem) => void;
    addPurchaseItem: (item: PurchaseItem) => void;
    addChitItem: (item: ChitItem) => void;
    addAdvanceItem: (item: AdvanceItem) => void;
    removeItem: (id: string, type?: 'estimation' | 'purchase' | 'chit' | 'advance') => void;
    updateGoldRate: (rate: GoldRate) => void;
    setCustomer: (customer: Customer) => void;
    clearForm: () => void;
    resetEstimation: () => void;
    clearEstimation: () => void;
}

const EstimationContext = createContext<EstimationContextType>({} as EstimationContextType);

export const useEstimation = () => useContext(EstimationContext);

export const EstimationProvider = ({ children }: { children: React.ReactNode }) => {
    const [state, dispatch] = useReducer(estimationReducer, initialState);

    React.useEffect(() => {
        const setup = async () => {
            await initDatabase();
            // Load history for the last 3 days
            const history = await getRecentEstimations(10); // Still load some recent ones for initial list
            // But we will use the date-filtered one for Dashboard soon if needed
            // Actually, let's keep it simple and just load the recent 10 for now in global state.
            // We can fetch specifically on Dashboard if required.

            // Load rates from DB
            const rate24k = await getSetting('rate_24k');
            const rate22k = await getSetting('rate_22k');
            const rate20k = await getSetting('rate_20k');
            const rate18k = await getSetting('rate_18k');
            const silver = await getSetting('rate_silver');

            if (rate24k && rate22k) {
                dispatch({
                    type: 'UPDATE_GOLD_RATE',
                    payload: {
                        rate24k: parseFloat(rate24k),
                        rate22k: parseFloat(rate22k),
                        rate20k: parseFloat(rate20k || '0'),
                        rate18k: parseFloat(rate18k || '0'),
                        silver: parseFloat(silver || '0'),
                        date: new Date().toISOString()
                    }
                });
            }

            dispatch({ type: 'SET_HISTORY', payload: history });
        };
        setup();
    }, []);

    const addTagItem = (item: EstimationItem) => dispatch({ type: 'ADD_TAG_ITEM', payload: item });
    const addMultipleTagItems = (items: EstimationItem[]) => dispatch({ type: 'ADD_MULTIPLE_TAG_ITEMS', payload: items });
    const addManualItem = (item: EstimationItem) => dispatch({ type: 'ADD_MANUAL_ITEM', payload: item });
    const addPurchaseItem = (item: PurchaseItem) => dispatch({ type: 'ADD_PURCHASE_ITEM', payload: item });
    const addChitItem = (item: ChitItem) => dispatch({ type: 'ADD_CHIT_ITEM', payload: item });
    const addAdvanceItem = (item: AdvanceItem) => dispatch({ type: 'ADD_ADVANCE_ITEM', payload: item });
    const removeItem = (id: string, type: 'estimation' | 'purchase' | 'chit' | 'advance' = 'estimation') =>
        dispatch({ type: 'REMOVE_ITEM', payload: { id, type } });
    const updateGoldRate = async (rate: GoldRate) => {
        dispatch({ type: 'UPDATE_GOLD_RATE', payload: rate });
        // Persist to DB
        await setSetting('rate_24k', rate.rate24k.toString());
        await setSetting('rate_22k', rate.rate22k.toString());
        await setSetting('rate_20k', rate.rate20k.toString());
        await setSetting('rate_18k', rate.rate18k.toString());
        await setSetting('rate_silver', rate.silver.toString());
    };
    const setCustomer = (customer: Customer) => dispatch({ type: 'SET_CUSTOMER', payload: customer });
    const clearForm = () => dispatch({ type: 'CLEAR_FORM' });
    const resetEstimation = () => dispatch({ type: 'CLEAR_ESTIMATION' });

    const clearEstimation = async () => {
        if (state.items.length > 0) {
            const estNum = await getNextEstimationNumber();
            // Auto-save to history when clearing/completing
            const dbEstimate: DBEstimation = {
                id: Date.now().toString(),
                customerName: state.customer?.name || 'Walk-in',
                customerMobile: state.customer?.mobile || 'N/A',
                date: new Date().toISOString(),
                items: JSON.stringify(state.items),
                purchaseItems: JSON.stringify(state.purchaseItems),
                chitItems: JSON.stringify(state.chitItems),
                advanceItems: JSON.stringify(state.advanceItems),
                totalWeight: state.totals.totalWeight,
                grandTotal: state.totals.grandTotal,
                estimationNumber: estNum
            };
            await saveEstimation(dbEstimate);
            const history = await getRecentEstimations(10);
            dispatch({ type: 'SET_HISTORY', payload: history });
        }
        dispatch({ type: 'CLEAR_ESTIMATION' });
    };

    return (
        <EstimationContext.Provider
            value={{
                state,
                addTagItem,
                addMultipleTagItems,
                addManualItem,
                addPurchaseItem,
                addChitItem,
                addAdvanceItem,
                removeItem,
                updateGoldRate,
                setCustomer,
                clearForm,
                resetEstimation,
                clearEstimation,
            }}
        >
            {children}
        </EstimationContext.Provider>
    );
};
