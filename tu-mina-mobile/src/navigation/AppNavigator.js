// src/navigation/AppNavigator.js
import React, { useState, useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { ActivityIndicator, View } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

import LoginScreen from '../screens/LoginScreen';
import HomeScreen from '../screens/HomeScreen';
import RegistrarPuntoScreen from '../screens/RegistrarPuntoScreen';
import HistorialPuntosScreen from '../screens/HistorialPuntosScreen';
import MapaHistorialScreen from '../screens/MapaHistorialScreen';

import { STORAGE_KEYS } from '../utils/constants';
import COLORS from '../utils/colors';

const Stack = createStackNavigator();

const AppNavigator = () => {
  const [isLoading, setIsLoading] = useState(true);
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  useEffect(() => {
    checkAuthStatus();
  }, []);

  const checkAuthStatus = async () => {
    try {
      const token = await AsyncStorage.getItem(STORAGE_KEYS.TOKEN);
      setIsLoggedIn(!!token);
    } catch (error) {
      console.error('Error checking auth:', error);
      setIsLoggedIn(false);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: COLORS.background }}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  return (
    <NavigationContainer>
      <Stack.Navigator
        initialRouteName={isLoggedIn ? 'Home' : 'Login'}
        screenOptions={{
          headerStyle: {
            backgroundColor: COLORS.primary,
          },
          headerTintColor: COLORS.white,
          headerTitleStyle: {
            fontWeight: 'bold',
          },
        }}
      >
        <Stack.Screen
          name="Login"
          component={LoginScreen}
          options={{ headerShown: false }}
        />
        
        <Stack.Screen
          name="Home"
          component={HomeScreen}
          options={{ headerShown: false }}
        />

        <Stack.Screen
          name="RegistrarPunto"
          component={RegistrarPuntoScreen}
          options={{ headerShown: false }}
        />

        <Stack.Screen
          name="HistorialPuntos"
          component={HistorialPuntosScreen}
          options={{ headerShown: false }}
        />

        {/* ✅ ESTA ES LA PANTALLA QUE FALTABA */}
        <Stack.Screen
          name="MapaHistorial"
          component={MapaHistorialScreen}
          options={{ headerShown: false }}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
};

export default AppNavigator;
