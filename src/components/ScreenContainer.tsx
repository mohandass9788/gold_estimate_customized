import { View as RNView, StyleSheet, KeyboardAvoidingView, Platform } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LIGHT_COLORS, DARK_COLORS } from '../constants/theme';
import { useGeneralSettings } from '../store/GeneralSettingsContext';
import EmployeeModal from '../modals/EmployeeModal';

const View = RNView as any;

interface ScreenContainerProps {
    children: React.ReactNode;
    backgroundColor?: string;
    keyboardAvoiding?: boolean;
}

export default function ScreenContainer({ children, backgroundColor, keyboardAvoiding = true }: ScreenContainerProps) {
    const { theme } = useGeneralSettings();
    const activeColors = theme === 'light' ? LIGHT_COLORS : DARK_COLORS;

    const finalBackgroundColor = backgroundColor || activeColors.background;

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: finalBackgroundColor }]} edges={['top', 'left', 'right']}>
            <StatusBar style={theme === 'light' ? 'dark' : 'light'} backgroundColor={finalBackgroundColor} />
            <KeyboardAvoidingView
                style={styles.keyboardContainer}
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
                enabled={keyboardAvoiding}
            >
                <View style={styles.content}>{children}</View>
                <EmployeeModal />
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    keyboardContainer: {
        flex: 1,
    },
    content: {
        flex: 1,
    },
});
