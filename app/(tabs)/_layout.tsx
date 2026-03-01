import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { View, StyleSheet, Platform } from 'react-native';
import { COLORS, LIGHT_COLORS, DARK_COLORS } from '../../src/constants/theme';
import { useGeneralSettings } from '../../src/store/GeneralSettingsContext';

const Icon = Ionicons as any;
const ViewAny = View as any;

export default function TabsLayout() {
    const { t, theme, featureFlags } = useGeneralSettings();
    const activeColors = theme === 'light' ? LIGHT_COLORS : DARK_COLORS;

    return (
        <Tabs screenOptions={{
            headerShown: false,
            tabBarActiveTintColor: COLORS.primary,
            tabBarInactiveTintColor: activeColors.textLight,
            tabBarStyle: {
                backgroundColor: activeColors.cardBg,
                borderTopColor: activeColors.border,
                height: 60,
                paddingBottom: 8,
                elevation: 10,
                shadowColor: '#000',
                shadowOffset: { width: 0, height: -2 },
                shadowOpacity: 0.1,
                shadowRadius: 4,
            }
        }}>
            <Tabs.Screen
                name="index"
                options={{
                    title: t('home'),
                    tabBarIcon: ({ color, size }) => <Icon name="home-outline" color={color} size={size} />,
                }}
            />
            <Tabs.Screen
                name="summary"
                options={{
                    title: t('history'),
                    tabBarIcon: ({ color, size }) => <Icon name="list-outline" color={color} size={size} />,
                }}
            />
            <Tabs.Screen
                name="scan"
                options={{
                    title: '',
                    tabBarIcon: ({ color, size }) => (
                        <ViewAny style={[styles.liftedButton, { borderColor: activeColors.cardBg }]}>
                            <Icon name="scan" color={COLORS.white} size={30} />
                        </ViewAny>
                    ),
                }}
            />
            <Tabs.Screen
                name="repairs"
                options={{
                    title: t('repairs'),
                    href: featureFlags.isRepairEnabled ? '/(tabs)/repairs' : null,
                    tabBarIcon: ({ color, size }) => <Icon name="construct-outline" color={color} size={size} />,
                }}
            />
            <Tabs.Screen
                name="rates"
                options={{
                    title: t('rate', { defaultValue: 'Rate' }),
                    href: !featureFlags.isRepairEnabled ? '/(tabs)/rates' : null,
                    tabBarIcon: ({ color, size }) => <Icon name="trending-up-outline" color={color} size={size} />,
                }}
            />
            <Tabs.Screen
                name="settings"
                options={{
                    title: t('settings'),
                    tabBarIcon: ({ color, size }) => <Icon name="settings-outline" color={color} size={size} />,
                }}
            />
            {/* Hidden tabs that still show the bottom bar */}
            <Tabs.Screen name="purchase" options={{ href: null, title: t('purchase') }} />
            <Tabs.Screen name="manual" options={{ href: null, title: t('manual_entry') }} />
            <Tabs.Screen name="multi-scan" options={{ href: null, title: t('multi_tag_scan') }} />
            <Tabs.Screen name="estimation" options={{ href: null }} />
            <Tabs.Screen name="repairs/new" options={{ href: null }} />
        </Tabs>
    );
}

const styles = StyleSheet.create({
    liftedButton: {
        width: 60,
        height: 60,
        borderRadius: 30,
        backgroundColor: COLORS.primary,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 30, // Lifts the button
        elevation: 5,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.3,
        shadowRadius: 3,
        borderWidth: 4,
        borderColor: COLORS.white,
    }
});
