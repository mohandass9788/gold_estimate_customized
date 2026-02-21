import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { View, StyleSheet, TouchableOpacity, Platform } from 'react-native';
import { COLORS } from '../../src/constants/theme';

const Icon = Ionicons as any;
const ViewAny = View as any;

export default function TabsLayout() {
    return (
        <Tabs screenOptions={{
            headerShown: false,
            tabBarActiveTintColor: COLORS.primary,
            tabBarInactiveTintColor: COLORS.textLight,
            tabBarStyle: {
                backgroundColor: COLORS.white,
                borderTopColor: COLORS.border,
                height: 60,
                paddingBottom: 8,
            }
        }}>
            <Tabs.Screen
                name="index"
                options={{
                    title: 'Home',
                    tabBarIcon: ({ color, size }) => <Icon name="home-outline" color={color} size={size} />,
                }}
            />
            <Tabs.Screen
                name="summary"
                options={{
                    title: 'Orders',
                    tabBarIcon: ({ color, size }) => <Icon name="list-outline" color={color} size={size} />,
                }}
            />
            <Tabs.Screen
                name="scan"
                options={{
                    title: '',
                    tabBarIcon: ({ color, size }) => (
                        <ViewAny style={styles.liftedButton}>
                            <Icon name="scan" color={COLORS.white} size={30} />
                        </ViewAny>
                    ),
                }}
            />
            <Tabs.Screen
                name="rates"
                options={{
                    title: 'Rates',
                    tabBarIcon: ({ color, size }) => <Icon name="trending-up-outline" color={color} size={size} />,
                }}
            />
            <Tabs.Screen
                name="settings"
                options={{
                    title: 'Settings',
                    tabBarIcon: ({ color, size }) => <Icon name="settings-outline" color={color} size={size} />,
                }}
            />
            {/* Hidden tabs that still show the bottom bar */}
            <Tabs.Screen name="purchase" options={{ href: null, title: 'Purchase Mode' }} />
            <Tabs.Screen name="manual" options={{ href: null, title: 'Manual Entry' }} />
            <Tabs.Screen name="multi-scan" options={{ href: null, title: 'Multi-Tag Scan' }} />
            <Tabs.Screen name="estimation" options={{ href: null }} />
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
