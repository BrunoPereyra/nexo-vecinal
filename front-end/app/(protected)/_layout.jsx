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
      <SafeAreaView style={{ flex: 1, backgroundColor: '#121212' }}>
        <StatusBar style="light" translucent={false} backgroundColor="#121212" />
        <Tabs
          initialRouteName="home"
          screenOptions={{
            headerShown: false,
            tabBarStyle: {
              backgroundColor: '#121212',
              borderTopColor: '#1E1E1E',
            },
            tabBarActiveTintColor: '#FFFFFF',
            tabBarInactiveTintColor: '#A0A0A0',
          }}
        >
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
            name="home"
            options={{
              title: 'Home',
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
            name="jobsStatus"
            options={{
              title: 'Jobs Status',
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
        </Tabs>
      </SafeAreaView>
    </ProtectedRoute>
  );
}
