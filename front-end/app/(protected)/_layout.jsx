import React from 'react';
import { Tabs } from 'expo-router';
import { ProtectedRoute } from '../../components/ProtectedRoute';

export default function ProtectedLayout() {
  return (
    <ProtectedRoute>
      <Tabs>
        <Tabs.Screen
          name="profile"
          options={{ title: 'Perfil', tabBarIcon: () => null }}
        />
      </Tabs>
 
    </ProtectedRoute>
  );
}
