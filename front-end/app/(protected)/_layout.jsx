import React from 'react';
import { StatusBar, TouchableOpacity, StyleSheet, View, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Tabs, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { ProtectedRoute } from '../../components/ProtectedRoute';
import colors from '@/style/colors';

export default function ProtectedLayout() {
  const router = useRouter();

  return (
    <ProtectedRoute>
      <SafeAreaView style={styles.container}>
        <StatusBar backgroundColor={colors.textDark} barStyle="light-content" />
        <View style={styles.absoluteWrapper}>
          <Tabs
            initialRouteName="home"
            screenOptions={{
              headerShown: false,
              tabBarShowLabel: false,
              tabBarStyle: styles.tabBarStyle,
              tabBarActiveTintColor: '#757575',
              tabBarInactiveTintColor:   colors.textDark,
            }}
          >
            <Tabs.Screen
              name="home"
              options={{
                title: 'Home',
                tabBarIcon: ({ color, size, focused }) => (
                  <View style={[styles.iconWrapper, focused && styles.iconWrapper]}>
                    <Ionicons name="home-outline" size={focused ? size + 6 : size} color={color} />
                  </View>
                ),
                tabBarButton: (props) => (
                  <TouchableOpacity
                    {...props}
                    onPress={() => router.push('/(protected)/home')}
                    style={styles.tabButton}
                  />
                ),
              }}
            />

            <Tabs.Screen
              name="Agenda"
              options={{
                title: 'Agenda',
                tabBarIcon: ({ color, size, focused }) => (
                  <View style={[styles.iconWrapper, focused && styles.iconWrapper]}>
                    <Ionicons name="people-outline" size={focused ? size + 6 : size} color={color} />
                  </View>
                ),
                tabBarButton: (props) => (
                  <TouchableOpacity
                    {...props}
                    onPress={() => router.push('/(protected)/Agenda/Agenda')}
                    style={styles.tabButton}
                  />
                ),
              }}
            />

            <Tabs.Screen
              name="jobsStatus"
              options={{
                title: 'Jobs Status',
                tabBarIcon: ({ color, size, focused }) => (
                  <View style={[styles.iconWrapper, focused && styles.iconWrapper]}>
                    <Ionicons name="briefcase-outline" size={focused ? size + 6 : size} color={color} />
                  </View>
                ),
                tabBarButton: (props) => (
                  <TouchableOpacity
                    {...props}
                    onPress={() => router.push('/(protected)/jobsStatus/jobs')}
                    style={styles.tabButton}
                  />
                ),
              }}
            />

            <Tabs.Screen
              name="cursos"
              options={{
                title: 'Cursos',
                tabBarIcon: ({ color, size, focused }) => (
                  <View style={[styles.iconWrapper, focused && styles.iconWrapper]}>
                    <Ionicons name="book-outline" size={focused ? size + 6 : size} color={color} />
                  </View>
                ),
                tabBarButton: (props) => (
                  <TouchableOpacity
                    {...props}
                    onPress={() => router.push('/(protected)/cursos/cursos')}
                    style={styles.tabButton}
                  />
                ),
              }}
            />

            <Tabs.Screen
              name="profile"
              options={{
                title: 'Perfil',
                tabBarIcon: ({ color, size, focused }) => (
                  <View style={[styles.iconWrapper, focused && styles.iconWrapper]}>
                    <Ionicons name="person-outline" size={focused ? size + 6 : size} color={color} />
                  </View>
                ),
                tabBarButton: (props) => (
                  <TouchableOpacity
                    {...props}
                    onPress={() => router.push('/(protected)/profile/Profile')}
                    style={styles.tabButton}
                  />
                ),
              }}
            />

            {/* Pantallas ocultas en la barra */}
            <Tabs.Screen
              name="(chat)"
              options={{
                title: '(chat)',
                href: null,
                unmountOnBlur: true,
                tabBarStyle: { display: 'none' },
              }}
            />
            <Tabs.Screen
              name="(admin)"
              options={{
                title: '(admin)',
                href: null,
                unmountOnBlur: false,
                tabBarStyle: { display: 'none' },
              }}
            />
          </Tabs>
        </View>
      </SafeAreaView>
    </ProtectedRoute>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  absoluteWrapper: {
    flex: 1,
    zIndex: 9999,
  },
  tabBarStyle: {
    borderTopWidth: 0,
    shadowColor: '#000',
    backgroundColor: colors.background,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 8,
    overflow: 'visible',
  },
  tabButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconWrapper: {
    width: 50,
    height: 50,
    borderRadius: 25,
    alignItems: 'center',
    justifyContent: 'center',
  },
 
});
