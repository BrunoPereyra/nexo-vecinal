import React, { useEffect, useState } from 'react';
import { StatusBar, TouchableOpacity, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Tabs, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { ProtectedRoute } from '../../components/ProtectedRoute';
import colors from '@/style/colors';
import { Image } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function ProtectedLayout() {
  const router = useRouter();
  const [isWork, setIsWork] = useState(false); // Default to true, will be updated by useEffect
  const [isLoading, setIsLoading] = useState(true); // State to manage loading
useEffect(() => {
  const interval = setInterval(async () => {
    try {
      const availableToWork = await AsyncStorage.getItem('availableToWork');

      if (availableToWork === "true") {
        setIsWork(true);
      } else {
        setIsWork(false);
      }
    } catch (error) {
      setIsWork(false);
    }finally {
      setIsLoading(false); // ✅ Marcar como cargado
    }

  }, 2000);

  return () => clearInterval(interval);
}, []);

if (isLoading) {
  return null; // O un loading spinner si querés feedback visual
}

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
              tabBarInactiveTintColor: colors.textDark,
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
              name="jobsStatus"
              options={{
                title: 'Jobs Status',
                tabBarIcon: ({ color, size, focused }) => (
                  <View style={[styles.iconWrapper, focused && styles.iconWrapper]}>
                    <Ionicons name="briefcase-outline" size={focused ? size + 6 : size} color={color} />
                  </View>
                ),
                href: isWork ? '/(protected)/jobsStatus/jobs' : null,
              }}
            />

             <Tabs.Screen
              name="trabajadoresScreen"
              options={{
                title: 'trabajadoresScreen',
                tabBarIcon: ({ color, size, focused }) => (
                  <Image
                    source={require('@/assets/images/logo-nexovecinal-transparente.png')}
                    style={{
                      width: focused ? 55 :35,
                      height: focused ? 55 : 35,
                      resizeMode: 'contain',
                      borderRadius: 25,
                    }}
                  />
                ),
                href: isWork ? '/(protected)/trabajadoresScreen' : null,
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
    zIndex: 9999, // Asegura que la barra de pestañas esté por encima de otros contenidos si los hay
  },
  tabBarStyle: {
    borderTopWidth: 0,
    shadowColor: '#000',
    backgroundColor: colors.background,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 8,
    height: 70, // Aumenta la altura de la tab bar para acomodar el botón central
    paddingBottom: 5, // Pequeño padding para iconos no centrales
  },
  tabButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingBottom: 5, // Ajusta el padding para que los íconos no se peguen al borde
  },
  iconWrapper: {
    width: 40, // Un poco más pequeño que el principal
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconFocusedWrapper: {
    // Si quieres un estilo diferente para el fondo cuando está enfocado
    // backgroundColor: 'rgba(117, 117, 117, 0.1)',
  },
  // *** ESTILOS ESPECÍFICOS PARA EL BOTÓN CENTRAL (Nexo Vecinal) ***
  mainTabButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    // IMPORTANTE: Ajusta el margen negativo para que sobresalga
    // Esto empuja el botón hacia arriba fuera de la tab bar
    marginTop: -30, // Experimenta con este valor para el efecto deseado
    zIndex: 1, // Asegura que esté por encima de otros elementos de la tab bar
    height: 80, // Aumenta el área táctil del botón principal
    width: 80, // Asegura que sea un círculo
    borderRadius: 40, // Para hacerlo circular
    backgroundColor: colors.primary, // Un color de fondo distintivo, puedes cambiarlo
    shadowColor: '#000', // Sombra para que "flote"
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    elevation: 10,
  },
  mainIconWrapper: {
    width: 50, // Tamaño base del wrapper para la imagen principal
    height: 50,
    borderRadius: 25,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent', // Ya tiene fondo el mainTabButton
  },
  mainIconImage: {
    width: 70, // Tamaño de la imagen cuando NO está enfocada
    height: 70,
    resizeMode: 'contain',
    tintColor: colors.textDark, // Puedes darle un tintColor si quieres que el logo sea monocromático
  },
  mainIconWrapperFocused: {
    width: 60, // Tamaño del wrapper cuando está enfocada
    height: 60,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent', // Ya tiene fondo el mainTabButton
  },
  mainIconImageFocused: {
    width: 80, // Tamaño de la imagen cuando está enfocada (más grande)
    height: 80,
    resizeMode: 'contain',
    tintColor: colors.white, // Color blanco para que destaque en el fondo primario
  },
});