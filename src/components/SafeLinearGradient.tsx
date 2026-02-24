import React from 'react';
import { View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

interface SafeLinearGradientProps {
    children?: React.ReactNode;
    colors: any;
    style?: any;
    start?: { x: number; y: number };
    end?: { x: number; y: number };
}

const SafeLinearGradient = ({ children, colors, style, start, end }: SafeLinearGradientProps) => {
    try {
        return (
            <LinearGradient
                colors={colors}
                style={style}
                start={start}
                end={end}
            >
                {children}
            </LinearGradient>
        );
    } catch (e) {
        return (
            <View style={[style, { backgroundColor: colors[0] }]}>
                {children}
            </View>
        );
    }
};

export default SafeLinearGradient;
