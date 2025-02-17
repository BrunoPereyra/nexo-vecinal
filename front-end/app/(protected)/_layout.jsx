import React from 'react';
import { Tabs } from 'expo-router';
import { ProtectedRoute } from '../../components/ProtectedRoute';
import { useColorScheme } from 'react-native';

export default function ProtectedLayout() {
  const colorScheme = useColorScheme(); // Detecta si el sistema está en modo oscuro o claro
  const isDarkMode = colorScheme === 'dark';

  return (
    <ProtectedRoute>
      <Tabs
        screenOptions={{
          tabBarStyle: {
            backgroundColor: isDarkMode ? '#121212' : '#FFFFFF', // Fondo oscuro
            borderTopColor: isDarkMode ? '#1E1E1E' : '#E0E0E0', // Color del borde
          },
          tabBarActiveTintColor: isDarkMode ? '#FFFFFF' : '#000000', // Color de ítems activos
          tabBarInactiveTintColor: isDarkMode ? '#A0A0A0' : '#808080', // Color de ítems inactivos
          headerStyle: {
            backgroundColor: isDarkMode ? '#121212' : '#FFFFFF', // Fondo del header
          },
          headerTintColor: isDarkMode ? '#FFFFFF' : '#000000', // Color del texto del header
        }}
      >
        <Tabs.Screen
          name="profile"
          options={{ title: 'Perfil', tabBarIcon: () => null }}
        />
        <Tabs.Screen
          name="home"
          options={{ title: 'Home', tabBarIcon: () => null }}
        />
          <Tabs.Screen
          name="jobsStatus"
          options={{ title: 'jobs Status', tabBarIcon: () => null }}
        />
      </Tabs>
    </ProtectedRoute>
  );
}
