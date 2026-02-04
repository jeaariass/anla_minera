// src/components/HeaderComponent.js
import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Image } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { STORAGE_KEYS } from '../utils/constants';
import COLORS from '../utils/colors';

const HeaderComponent = () => {
  const [userData, setUserData] = useState(null);

  useEffect(() => {
    cargarUsuario();
  }, []);

  const cargarUsuario = async () => {
    try {
      const userDataString = await AsyncStorage.getItem(STORAGE_KEYS.USER_DATA);
      if (userDataString) {
        setUserData(JSON.parse(userDataString));
      }
    } catch (error) {
      console.error('Error cargando usuario en header:', error);
    }
  };

  return (
    <View style={styles.header}>
      <View style={styles.headerLeft}>
        <View style={styles.logoContainer}>
          <Image 
            source={require('../../assets/icon.png')}
            style={styles.logoImage}
            resizeMode="contain"
          />
        </View>

        <View style={styles.brandContainer}>
          <Text style={styles.headerTitle}>TU MINA</Text>
          <Text style={styles.headerSubtitle}>Desarrollado por CTGlobal</Text>
        </View>
      </View>
      
      <View style={styles.headerRight}>
        <View style={styles.userInfo}>
          <View style={styles.userAvatar}>
            <Text style={styles.userAvatarText}>
              {userData?.nombre?.charAt(0).toUpperCase() || 'U'}
            </Text>
          </View>
          <View style={styles.userDetails}>
            <Text style={styles.userName} numberOfLines={1}>
              {userData?.nombre?.split(' ')[0] || 'Usuario'}
            </Text>
            <Text style={styles.userRole}>{userData?.rol || 'ROL'}</Text>
          </View>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  header: {
    backgroundColor: COLORS.primary,
    padding: 20,
    paddingTop: 50,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 4,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  logoContainer: {
    width: 50,
    height: 50,
    backgroundColor: 'white',
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
    marginRight: 12,
  },
  logoImage: {
    width: 40,
    height: 40,
  },
  brandContainer: {
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: 'white',
  },
  headerSubtitle: {
    fontSize: 11,
    color: 'white',
    opacity: 0.9,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  userAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  userAvatarText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
  },
  userDetails: {
    maxWidth: 80,
  },
  userName: {
    color: 'white',
    fontSize: 12,
    fontWeight: '600',
  },
  userRole: {
    color: 'white',
    fontSize: 10,
    opacity: 0.8,
  },
});

export default HeaderComponent;