import { useRouter, useRootNavigationState, useSegments } from 'expo-router';
import { useEffect, useState } from 'react';
import { useAuth } from '../src/store/AuthContext';
import { View as RNView, ActivityIndicator as RNActivityIndicator } from 'react-native';

// Fix for React 19 type mismatch
const View = RNView as any;
const ActivityIndicator = RNActivityIndicator as any;

export default function Index() {
    const router = useRouter();
    const { isAuthenticated } = useAuth();
    const segments = useSegments();
    const rootNavigationState = useRootNavigationState();

    const [isNavigationReady, setIsNavigationReady] = useState(false);

    useEffect(() => {
        if (!rootNavigationState?.key) return;
        setIsNavigationReady(true);
    }, [rootNavigationState?.key]);

    useEffect(() => {
        if (!isNavigationReady) return;

        const inAuthGroup = segments[0] === '(auth)';

        if (isAuthenticated && !inAuthGroup) {
            router.replace('/(tabs)/');
        } else if (!isAuthenticated) {
            router.replace('/login');
        }
    }, [isAuthenticated, isNavigationReady]);

    return (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
            <ActivityIndicator size="large" />
        </View>
    );
}
