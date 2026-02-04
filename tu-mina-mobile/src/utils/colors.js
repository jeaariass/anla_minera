// tu-mina-mobile/src/utils/colors.js
// Paleta de colores basada en el logo de TU MINA

export const COLORS = {
  // Colores principales del logo
  primary: '#3D9B9B',        // Turquesa principal del logo
  primaryDark: '#2C7373',    // Turquesa oscuro (sombras)
  primaryLight: '#5BC0BE',   // Turquesa claro
  
  // Colores secundarios
  secondary: '#A8E6CF',      // Verde menta suave
  secondaryDark: '#7EC8A3',  // Verde menta oscuro
  
  // Colores de fondo
  background: '#F0F8F8',     // Fondo muy claro, casi blanco azulado
  backgroundDark: '#E5F3F3', // Fondo levemente más oscuro
  white: '#FFFFFF',
  
  // Colores de texto
  text: '#2C3E50',           // Texto principal oscuro
  textLight: '#7F8C8D',      // Texto secundario gris
  textWhite: '#FFFFFF',      // Texto blanco
  
  // Colores de estado
  success: '#27AE60',        // Verde para éxito
  warning: '#F39C12',        // Naranja para advertencias
  danger: '#E74C3C',         // Rojo para errores
  info: '#3498DB',           // Azul para información
  
  // Colores de UI
  border: '#BDC3C7',         // Bordes sutiles
  borderLight: '#ECF0F1',    // Bordes muy suaves
  shadow: 'rgba(61, 155, 155, 0.15)', // Sombra con tono del logo
  
  // Transparencias
  overlay: 'rgba(0, 0, 0, 0.5)',      // Overlay oscuro
  overlayLight: 'rgba(0, 0, 0, 0.3)', // Overlay suave
  
  // Gradientes (para usar con LinearGradient si es necesario)
  gradientStart: '#3D9B9B',
  gradientEnd: '#2C7373',
};

// Estilos de sombra predefinidos
export const SHADOWS = {
  small: {
    shadowColor: COLORS.shadow,
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 2,
  },
  medium: {
    shadowColor: COLORS.shadow,
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.30,
    shadowRadius: 4.65,
    elevation: 4,
  },
  large: {
    shadowColor: COLORS.shadow,
    shadowOffset: {
      width: 0,
      height: 6,
    },
    shadowOpacity: 0.37,
    shadowRadius: 7.49,
    elevation: 6,
  },
};

export default COLORS;