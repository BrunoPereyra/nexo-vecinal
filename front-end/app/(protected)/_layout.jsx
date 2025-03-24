import React from 'react';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Tabs } from 'expo-router';
import { TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { ProtectedRoute } from '../../components/ProtectedRoute';

export default function ProtectedLayout() {
  const router = useRouter();
  return (
    <ProtectedRoute>
      <SafeAreaView style={{ flex: 1, backgroundColor: '#0f2027' }}>
        <StatusBar style="light" translucent={false} backgroundColor="#0f2027" />
        <Tabs
          initialRouteName="home"
          screenOptions={{
            headerShown: false,
            tabBarStyle: {
              backgroundColor: '#0f2027',
              borderTopWidth: 0,
            },
            tabBarActiveTintColor: '#FFFFFF',
            tabBarInactiveTintColor: '#A0A0A0',
          }}
        >
          <Tabs.Screen
            name="home"
            options={{
              title: 'Home',
              unmountOnBlur: false,
              tabBarIcon: ({ color, size }) => (
                <Ionicons name="home-outline" size={size} color={color} />
              ),
              tabBarButton: (props) => (
                <TouchableOpacity
                  {...props}
                  onPress={() => router.replace('/(protected)/home')}
                />
              ),
            }}
          />
          <Tabs.Screen
            name="Agenda"
            options={{
              title: 'Agenda',
              unmountOnBlur: false,
              tabBarIcon: ({ color, size }) => (
                <Ionicons name="people-outline" size={size} color={color} />
              ),
              tabBarButton: (props) => (
                <TouchableOpacity
                  {...props}
                  onPress={() => router.replace('/(protected)/Agenda/Agenda')}
                />
              ),
            }}
          />
          <Tabs.Screen
            name="jobsStatus"
            options={{
              title: 'Jobs Status',
              unmountOnBlur: false,
              tabBarIcon: ({ color, size }) => (
                <Ionicons name="briefcase-outline" size={size} color={color} />
              ),
              tabBarButton: (props) => (
                <TouchableOpacity
                  {...props}
                  onPress={() => router.replace('/(protected)/jobsStatus/jobs')}
                />
              ),
            }}
          />
          <Tabs.Screen
            name="cursos"
            options={{
              title: 'Cursos',
              unmountOnBlur: false,
              tabBarIcon: ({ color, size }) => (
                <Ionicons name="book-outline" size={size} color={color} />
              ),
              tabBarButton: (props) => (
                <TouchableOpacity
                  {...props}
                  onPress={() => router.replace('/(protected)/cursos/cursos')}
                />
              ),
            }}
          />
          <Tabs.Screen
            name="profile"
            options={{
              title: 'Perfil',
              tabBarIcon: ({ color, size }) => (
                <Ionicons name="person-outline" size={size} color={color} />
              ),
              tabBarButton: (props) => (
                <TouchableOpacity
                  {...props}
                  onPress={() => router.replace('/(protected)/profile/Profile')}
                />
              ),
            }}
          />
          <Tabs.Screen
            name="(chat)"
            options={{
              title: '(chat)',
              href: null,
              unmountOnBlur: false,
              tabBarStyle: { display: 'none' },
              tabBarIcon: ({ color, size }) => (
                <Ionicons name="chatbubble-ellipses-outline" size={size} color={color} />
              ),
            }}
          />
        </Tabs>
      </SafeAreaView>
    </ProtectedRoute>
  );
}
