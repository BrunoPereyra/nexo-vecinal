import React from 'react';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Tabs } from 'expo-router';
import { ProtectedRoute } from '../../components/ProtectedRoute';

export default function ProtectedLayout() {
  return (
    <ProtectedRoute>
      {/* SafeAreaView se asegura de que el contenido no quede tapado por el status bar */}
      <SafeAreaView style={{ flex: 1, backgroundColor: '#121212' }}>
        {/* Configuramos el StatusBar: style "light" para textos claros, y translucent false */}
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
          <Tabs.Screen name="profile" options={{ title: 'Perfil', tabBarIcon: () => null }} />
          <Tabs.Screen name="home" options={{ title: 'Home', tabBarIcon: () => null }} />
          <Tabs.Screen name="jobsStatus" options={{ title: 'jobs Status', tabBarIcon: () => null }} />
          <Tabs.Screen name="cursos" options={{ title: 'cursos', tabBarIcon: () => null }} />
        </Tabs>
      </SafeAreaView>
    </ProtectedRoute>
  );
}
