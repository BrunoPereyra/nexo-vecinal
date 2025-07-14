import { Tabs, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'react-native';
import colors from '@/style/colors';

export default function WorkTabsLayout() {
    const router = useRouter();
    return (
        <Tabs
            screenOptions={{
                headerShown: false,
                tabBarShowLabel: false,
                tabBarStyle: { backgroundColor: colors.background },
            }}
        >
            <Tabs.Screen
                name="TrabajosParaTrabajadoresScreen"
                options={{
                    title: 'Trabajos',
                    tabBarIcon: ({ color, size, focused }) => (
                        <Image
                            source={require('@/assets/images/logo-nexovecinal-transparente.png')}
                            style={{
                                width: focused ? 32 : 26,
                                height: focused ? 32 : 26,
                                resizeMode: 'contain',
                            }}
                        />
                    ),
                }}
            />
            <Tabs.Screen
                name="jobsStatus"
                options={{
                    title: 'Jobs Status',
                    tabBarIcon: ({ color, size, focused }) => (
                        <Ionicons name="briefcase-outline" size={focused ? size + 6 : size} color={color} />
                    ),
                }}
            />
        </Tabs>
    );
}