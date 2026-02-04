// src/screens/LoginScreen.js
import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  ActivityIndicator,
  Image,
} from 'react-native';
import { authService } from '../services/api';
import COLORS from '../utils/colors';

const LoginScreen = ({ navigation }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleLogin = async () => {
  if (!email || !password) {
    Alert.alert('Error', 'Por favor completa todos los campos');
    return;
  }

  try {
    setLoading(true);
    console.log('🔐 Intentando login...');
    
    const response = await authService.login(email.trim().toLowerCase(), password);
    
    console.log('📥 Respuesta login en LoginScreen:', response);

    if (response && response.success) {
      console.log('✅ Login exitoso');
      
      // ⚠️ ESPERAR UN MOMENTO para que AsyncStorage guarde
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Verificar que se guardó
      const userData = await authService.getCurrentUser();
      console.log('🔍 Usuario después de login:', userData);
      
      if (userData) {
        console.log('✅ Navegando a Home...');
        navigation.replace('Home');
      } else {
        console.log('❌ Usuario no se guardó correctamente');
        Alert.alert('Error', 'Error guardando datos. Intenta nuevamente.');
      }
    } else {
      Alert.alert(
        'Error de autenticación',
        response?.message || 'Credenciales inválidas'
      );
    }
  } catch (error) {
    console.error('❌ Error en login:', error);
    Alert.alert(
      'Error',
      error.response?.data?.message || 'Error de conexión con el servidor'
    );
  } finally {
    setLoading(false);
  }
};

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView 
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        {/* Header con logo */}
        <View style={styles.header}>
          <View style={styles.logoContainer}>
            <Image 
              source={require('../../assets/icon.png')}
              style={styles.logoImage}
              resizeMode="contain"
            />
          </View>
          <Text style={styles.appTitle}>TU MINA</Text>
          <Text style={styles.appSubtitle}>Desarrollado por CTGlobal</Text>
        </View>

        {/* Login Card */}
        <View style={styles.loginCard}>
          <View style={styles.cardHeader}>
            <Text style={styles.welcomeText}>Bienvenido</Text>
            <Text style={styles.instructionText}>
              Ingresa tus credenciales para continuar
            </Text>
          </View>

          {/* Email Input */}
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>📧 Correo Electrónico</Text>
            <View style={styles.inputContainer}>
              <TextInput
                style={styles.input}
                placeholder="ejemplo@tumina.com"
                placeholderTextColor="#999"
                value={email}
                onChangeText={setEmail}
                autoCapitalize="none"
                keyboardType="email-address"
                editable={!loading}
              />
            </View>
          </View>

          {/* Password Input */}
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>🔒 Contraseña</Text>
            <View style={styles.inputContainer}>
              <TextInput
                style={styles.input}
                placeholder="Ingresa tu contraseña"
                placeholderTextColor="#999"
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPassword}
                editable={!loading}
              />
              <TouchableOpacity
                style={styles.eyeButton}
                onPress={() => setShowPassword(!showPassword)}
              >
                <Text style={styles.eyeIcon}>{showPassword ? '👁️' : '👁️‍🗨️'}</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Login Button */}
          <TouchableOpacity
            style={[styles.loginButton, loading && styles.loginButtonDisabled]}
            onPress={handleLogin}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.loginButtonText}>Iniciar Sesión</Text>
            )}
          </TouchableOpacity>
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>
            Sistema de Monitoreo de Actividades Mineras
          </Text>
          <Text style={styles.footerSubtext}>
            Agencia Nacional de Minería - Colombia 🇨🇴
          </Text>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f7fa',
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 20,
  },

  // Header con logo
  header: {
    alignItems: 'center',
    marginBottom: 40,
  },
  logoContainer: {
    width: 100,
    height: 100,
    backgroundColor: COLORS.primary,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  logoImage: {
  width: 80,
  height: 80,
},
  appTitle: {
    fontSize: 36,
    fontWeight: 'bold',
    color: COLORS.primary,
    marginBottom: 5,
  },
  appSubtitle: {
    fontSize: 14,
    color: '#666',
    fontStyle: 'italic',
  },

  // Login Card
  loginCard: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 30,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 6,
    marginBottom: 30,
  },
  cardHeader: {
    marginBottom: 30,
  },
  welcomeText: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  instructionText: {
    fontSize: 15,
    color: '#666',
    lineHeight: 22,
  },

  // Inputs
  inputGroup: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#e9ecef',
  },
  input: {
    flex: 1,
    padding: 16,
    fontSize: 16,
    color: '#333',
  },
  eyeButton: {
    padding: 16,
  },
  eyeIcon: {
    fontSize: 20,
  },

  // Login Button
  loginButton: {
    backgroundColor: COLORS.primary,
    borderRadius: 12,
    padding: 18,
    alignItems: 'center',
    marginTop: 10,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  loginButtonDisabled: {
    backgroundColor: '#ccc',
  },
  loginButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },

  // Demo Section
  demoSection: {
    marginTop: 30,
    padding: 20,
    backgroundColor: '#e7f3ff',
    borderRadius: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#2196F3',
  },
  demoTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
  },
  demoButton: {
    backgroundColor: '#2196F3',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  demoButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },

  // Footer
  footer: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  footerText: {
    fontSize: 13,
    color: '#666',
    textAlign: 'center',
    marginBottom: 5,
  },
  footerSubtext: {
    fontSize: 12,
    color: '#999',
    textAlign: 'center',
  },
});

export default LoginScreen;