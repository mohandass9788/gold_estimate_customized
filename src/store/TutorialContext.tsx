import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import apiClient from '../services/apiClient';
import { useActivation } from './ActivationContext';
import { useAuth } from './AuthContext';

interface TutorialData {
    isEnabled: boolean;
    videoUrl: string;
    title?: string;
    description?: string;
    showOnScreens: string[]; // e.g., ['activation', 'dashboard']
}

interface TutorialContextType {
    tutorialData: TutorialData | null;
    isPopupVisible: boolean;
    setPopupVisible: (visible: boolean) => void;
    refreshTutorialData: () => Promise<void>;
}

const TutorialContext = createContext<TutorialContextType | undefined>(undefined);

export const TutorialProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [tutorialData, setTutorialData] = useState<TutorialData | null>(null);
    const [isPopupVisible, setIsPopupVisible] = useState(false);
    const { isActivated } = useActivation();
    const { isAuthenticated } = useAuth();

    const refreshTutorialData = useCallback(async () => {
        try {
            // Fetching from a public endpoint as it might be needed before login (Activation screen)
            const response = await apiClient.get('/api/public/tutorial-video');
            if (response.data) {
                setTutorialData(response.data);
                
                // Logic to show/hide based on screen/state if needed
                // For now, we just enable it if it's enabled in backend
                if (response.data.isEnabled) {
                    setIsPopupVisible(true);
                }
            }
        } catch (error) {
            // Silently fail if endpoint doesn't exist yet, but provide mock data for development if needed
            console.log('Tutorial video endpoint failed. Using mock data for testing if in development.');
            // Mock data for demo/testing
            /*
            setTutorialData({
                isEnabled: true,
                videoUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
                title: 'Welcome Tutorial',
                showOnScreens: ['activation', 'dashboard']
            });
            setIsPopupVisible(true);
            */
        }
    }, []);

    useEffect(() => {
        refreshTutorialData();
    }, [refreshTutorialData]);

    return (
        <TutorialContext.Provider value={{ tutorialData, isPopupVisible, setPopupVisible: setIsPopupVisible, refreshTutorialData }}>
            {children}
        </TutorialContext.Provider>
    );
};

export const useTutorial = () => {
    const context = useContext(TutorialContext);
    if (context === undefined) {
        throw new Error('useTutorial must be used within a TutorialProvider');
    }
    return context;
};
