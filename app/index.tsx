import { useRouter, useRootNavigationState, useSegments } from 'expo-router';
import { useEffect, useState } from 'react';
import { useAuth } from '../src/store/AuthContext';
import { useActivation } from '../src/store/ActivationContext';
import { View as RNView, ActivityIndicator as RNActivityIndicator } from 'react-native';

// Fix for React 19 type mismatch
const View = RNView as any;
const ActivityIndicator = RNActivityIndicator as any;

export default function Index() {
    const router = useRouter();
    const { isAuthenticated } = useAuth();
    const { isActivated, isCheckingActivation } = useActivation();
    const segments = useSegments();
    const rootNavigationState = useRootNavigationState();

    const [isNavigationReady, setIsNavigationReady] = useState(false);

    useEffect(() => {
        if (!rootNavigationState?.key) return;
        setIsNavigationReady(true);
    }, [rootNavigationState?.key]);

    useEffect(() => {
        if (!isNavigationReady || isCheckingActivation) return;

        const inAuthGroup = segments[0] === '(auth)';
        const inActivationGroup = segments[0] === 'activation';

        if (!isActivated) {
            if (!inActivationGroup) {
                router.replace('/activation');
            }
            return;
        }

        // If activated, handle auth
        if (isAuthenticated && !inAuthGroup) {
            router.replace('/(tabs)/');
        } else if (!isAuthenticated) {
            router.replace('/login');
        }
    }, [isAuthenticated, isActivated, isCheckingActivation, isNavigationReady, segments]);

    return (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
            <ActivityIndicator size="large" />
        </View>
    );
}
