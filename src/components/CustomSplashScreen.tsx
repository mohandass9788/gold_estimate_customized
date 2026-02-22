import React, { useEffect, useState } from 'react';
import { View, Image, StyleSheet, Animated, Dimensions } from 'react-native';
import { useGeneralSettings } from '../store/GeneralSettingsContext';
import { COLORS } from '../constants/theme';

const { width, height } = Dimensions.get('window');

interface CustomSplashScreenProps {
    onFinish: () => void;
}

export default function CustomSplashScreen({ onFinish }: CustomSplashScreenProps) {
    const { shopDetails } = useGeneralSettings();
    const [fadeAnim] = useState(new Animated.Value(0));
    const [opacity] = useState(new Animated.Value(1));

    useEffect(() => {
        // Fade in
        Animated.timing(fadeAnim, {
            toValue: 1,
            duration: 1000,
            useNativeDriver: true,
        }).start();

        // Hold and fade out
        const timer = setTimeout(() => {
            Animated.timing(opacity, {
                toValue: 0,
                duration: 500,
                useNativeDriver: true,
            }).start(() => onFinish());
        }, 2500);

        return () => clearTimeout(timer);
    }, []);

    return (
        <Animated.View style={[styles.container, { opacity }]}>
            <Animated.View style={{ opacity: fadeAnim, width: '100%', height: '100%' }}>
                {shopDetails.splashImage ? (
                    <Image
                        source={{ uri: shopDetails.splashImage }}
                        style={styles.splashImage}
                        resizeMode="cover"
                    />
                ) : (
                    <View style={styles.placeholder}>
                        <Image
                            source={require('../../assets/icon.png')}
                            style={styles.logo}
                            resizeMode="contain"
                        />
                    </View>
                )}
            </Animated.View>
        </Animated.View>
    );
}

const styles = StyleSheet.create({
    container: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: COLORS.white,
        zIndex: 9999,
        justifyContent: 'center',
        alignItems: 'center',
    },
    splashImage: {
        width: '100%',
        height: '100%',
    },
    placeholder: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: COLORS.primary,
    },
    logo: {
        width: 150,
        height: 150,
    },
});
