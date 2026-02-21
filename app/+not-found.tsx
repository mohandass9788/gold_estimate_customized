import { Link, Stack } from 'expo-router';
import { StyleSheet, View, Text } from 'react-native';
import { COLORS, FONT_SIZES, SPACING } from '../src/constants/theme';

export default function NotFoundScreen() {
    return (
        <>
            <Stack.Screen options={{ title: 'Oops!' }} />
            <View style={styles.container}>
                <Text style={styles.title}>This screen doesn't exist.</Text>
                <Link href="/" style={styles.link}>
                    <Text style={styles.linkText}>Go to home screen!</Text>
                </Link>
            </View>
        </>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        padding: 20,
        backgroundColor: COLORS.background,
    },
    title: {
        fontSize: FONT_SIZES.xl,
        fontWeight: 'bold',
        marginBottom: SPACING.md,
        color: COLORS.text,
    },
    link: {
        marginTop: SPACING.md,
        paddingVertical: SPACING.md,
    },
    linkText: {
        fontSize: FONT_SIZES.md,
        color: COLORS.primary,
    },
});
