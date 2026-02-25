// src/screens/RegistrarParadaScreen.js
import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Alert,
  ScrollView,
  ActivityIndicator,
  Modal,
  Animated,
  FlatList,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import HeaderComponent from '../components/HeaderComponent';
import Breadcrumb from '../components/Breadcrumb';
import { paradasService } from '../services/api';
import { STORAGE_KEYS } from '../utils/constants';
import COLORS from '../utils/colors';

// ─── Helpers ─────────────────────────────────────────────────────────────────

/** Formatea un Date como "HH:MM" en hora LOCAL del dispositivo */
const formatHora = (date) => {
  if (!date) return '—';
  const h = String(date.getHours()).padStart(2, '0');
  const m = String(date.getMinutes()).padStart(2, '0');
  return `${h}:${m}`;
};

/** Formatea un Date como "DD/MM/YYYY HH:MM" en hora LOCAL */
const formatFechaHora = (date) => {
  if (!date) return '—';
  const d  = String(date.getDate()).padStart(2, '0');
  const mo = String(date.getMonth() + 1).padStart(2, '0');
  const y  = date.getFullYear();
  return `${d}/${mo}/${y}  ${formatHora(date)}`;
};

/** Diferencia en minutos entre dos fechas */
const diffMinutos = (ini, fin) => {
  if (!ini || !fin) return null;
  const mins = Math.round((fin - ini) / 60000);
  return mins >= 0 ? mins : null;
};

// ─── TimePicker manual ────────────────────────────────────────────────────────

const TimePickerModal = ({ visible, value, onConfirm, onCancel, titulo }) => {
  const now = new Date();
  const [horas,   setHoras]   = useState(value ? value.getHours()   : now.getHours());
  const [minutos, setMinutos] = useState(value ? value.getMinutes() : now.getMinutes());

  useEffect(() => {
    if (visible && value) {
      setHoras(value.getHours());
      setMinutos(value.getMinutes());
    }
  }, [visible, value]);

  const cambiarHora   = (d) => setHoras(h   => (h   + d + 24) % 24);
  const cambiarMinuto = (d) => setMinutos(m => (m   + d + 60) % 60);

  const handleConfirm = () => {
    const base = value ? new Date(value) : new Date();
    base.setHours(horas, minutos, 0, 0);
    onConfirm(base);
  };

  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={tp.overlay}>
        <View style={tp.modal}>
          <Text style={tp.titulo}>{titulo || 'Seleccionar Hora'}</Text>
          <View style={tp.pickerRow}>
            <View style={tp.column}>
              <TouchableOpacity style={tp.btn} onPress={() => cambiarHora(1)}>
                <Text style={tp.arrow}>▲</Text>
              </TouchableOpacity>
              <Text style={tp.digit}>{String(horas).padStart(2, '0')}</Text>
              <TouchableOpacity style={tp.btn} onPress={() => cambiarHora(-1)}>
                <Text style={tp.arrow}>▼</Text>
              </TouchableOpacity>
              <Text style={tp.colLabel}>Horas</Text>
            </View>
            <Text style={tp.colon}>:</Text>
            <View style={tp.column}>
              <TouchableOpacity style={tp.btn} onPress={() => cambiarMinuto(1)}>
                <Text style={tp.arrow}>▲</Text>
              </TouchableOpacity>
              <Text style={tp.digit}>{String(minutos).padStart(2, '0')}</Text>
              <TouchableOpacity style={tp.btn} onPress={() => cambiarMinuto(-1)}>
                <Text style={tp.arrow}>▼</Text>
              </TouchableOpacity>
              <Text style={tp.colLabel}>Minutos</Text>
            </View>
          </View>
          <View style={tp.actions}>
            <TouchableOpacity style={tp.cancelBtn} onPress={onCancel}>
              <Text style={tp.cancelText}>Cancelar</Text>
            </TouchableOpacity>
            <TouchableOpacity style={tp.confirmBtn} onPress={handleConfirm}>
              <Text style={tp.confirmText}>Confirmar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const tp = StyleSheet.create({
  overlay:   { flex: 1, backgroundColor: 'rgba(0,0,0,0.55)', justifyContent: 'center', alignItems: 'center' },
  modal:     { backgroundColor: '#fff', borderRadius: 20, padding: 28, width: 300, alignItems: 'center' },
  titulo:    { fontSize: 17, fontWeight: '800', color: '#333', marginBottom: 24 },
  pickerRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 28 },
  column:    { alignItems: 'center', minWidth: 80 },
  btn:       { padding: 10 },
  arrow:     { fontSize: 24, color: COLORS.primary, fontWeight: '700' },
  digit:     { fontSize: 48, fontWeight: '900', color: '#222', minWidth: 70, textAlign: 'center' },
  colLabel:  { fontSize: 12, color: '#999', marginTop: 4, fontWeight: '600' },
  colon:     { fontSize: 44, fontWeight: '900', color: '#333', marginHorizontal: 8, marginBottom: 20 },
  actions:   { flexDirection: 'row', gap: 12 },
  cancelBtn: { flex: 1, padding: 14, borderRadius: 10, backgroundColor: '#f0f0f0', alignItems: 'center' },
  cancelText:{ fontWeight: '700', color: '#666', fontSize: 15 },
  confirmBtn:{ flex: 1, padding: 14, borderRadius: 10, backgroundColor: COLORS.primary, alignItems: 'center' },
  confirmText:{ fontWeight: '800', color: '#fff', fontSize: 15 },
});

// ─── Pantalla principal ───────────────────────────────────────────────────────

const RegistrarParadaScreen = ({ navigation }) => {
  const [userData,      setUserData]      = useState(null);
  const [loadingMotivos,setLoadingMotivos]= useState(true);
  const [submitting,    setSubmitting]    = useState(false);

  const [motivos,           setMotivos]           = useState([]);
  const [motivoSeleccionado,setMotivoSeleccionado] = useState(null);
  const [motivoOtro,        setMotivoOtro]         = useState('');
  const [inicio,            setInicio]             = useState(null);
  const [fin,               setFin]                = useState(null);
  const [observaciones,     setObservaciones]      = useState('');

  const [showMotivoPicker,  setShowMotivoPicker]  = useState(false);
  const [timePickerConfig,  setTimePickerConfig]  = useState({ visible: false, field: null });

  // Estado de éxito con minutos (para mostrar en modal y luego en botones)
  const [paradaExitosa,    setParadaExitosa]      = useState(null); // { minutos }
  const [mostrarExito,     setMostrarExito]       = useState(false);
  const scaleAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => { cargarDatos(); }, []);

  const cargarDatos = async () => {
    try {
      const raw = await AsyncStorage.getItem(STORAGE_KEYS.USER_DATA);
      if (raw) setUserData(JSON.parse(raw));

      const resp = await paradasService.getMotivos();
      const lista = resp?.data ?? resp?.motivos ?? [];
      setMotivos(lista);
    } catch (err) {
      console.error('Error cargando motivos:', err);
      Alert.alert('Error', 'No se pudieron cargar los motivos de paro. Intenta de nuevo.');
    } finally {
      setLoadingMotivos(false);
    }
  };

  const registrarAhora = (field) => {
    const ahora = new Date();
    if (field === 'inicio') {
      setInicio(ahora);
    } else {
      if (inicio && ahora < inicio) {
        Alert.alert('Error', 'La hora de fin no puede ser anterior al inicio.');
        return;
      }
      setFin(ahora);
    }
  };

  const abrirTimePicker = (field) => setTimePickerConfig({ visible: true, field });

  const confirmarTimePicker = (date) => {
    const { field } = timePickerConfig;
    setTimePickerConfig({ visible: false, field: null });
    if (field === 'inicio') {
      setInicio(date);
      if (fin && date > fin) setFin(null);
    } else {
      if (inicio && date < inicio) {
        Alert.alert('Error', 'La hora de fin no puede ser anterior al inicio.');
        return;
      }
      setFin(date);
    }
  };

  const validarFormulario = () => {
    if (!motivoSeleccionado) {
      Alert.alert('Campo requerido', 'Selecciona un motivo de paro.');
      return false;
    }
    if (motivoSeleccionado.codigo === 'OTRO' && !motivoOtro.trim()) {
      Alert.alert('Campo requerido', 'Describe el motivo en "Otro motivo".');
      return false;
    }
    if (!inicio) {
      Alert.alert('Campo requerido', 'Registra la hora de inicio del paro.');
      return false;
    }
    if (!fin) {
      Alert.alert('Campo requerido', 'Registra la hora de fin del paro.');
      return false;
    }
    if (fin <= inicio) {
      Alert.alert('Error', 'La hora de fin debe ser posterior al inicio.');
      return false;
    }
    return true;
  };

  const handleGuardar = async () => {
    if (!validarFormulario()) return;

    const tituloMineroId = userData?.tituloMinero?.id || userData?.tituloMineroId;
    if (!tituloMineroId) {
      Alert.alert('Error', 'No se encontró el título minero en tu sesión.');
      return;
    }

    try {
      setSubmitting(true);

      const payload = {
        usuarioId:    userData.id,
        tituloMineroId,
        motivoId:     motivoSeleccionado.id,
        motivoOtro:   motivoSeleccionado.codigo === 'OTRO' ? motivoOtro.trim() : null,
        // toISOString() envía UTC; el backend convierte a hora Colombia antes de guardar
        inicio:       inicio.toISOString(),
        fin:          fin.toISOString(),
        observaciones: observaciones.trim() || null,
        estado:       'ENVIADO',
      };

      const resp = await paradasService.registrarParada(payload);

      if (resp?.success) {
        const minutos = diffMinutos(inicio, fin);
        setParadaExitosa({ minutos });
        mostrarModalExito();
      } else {
        Alert.alert('Error', resp?.message || 'No se pudo guardar la parada.');
      }
    } catch (err) {
      console.error('Error guardando parada:', err);
      Alert.alert('Error', 'No se pudo conectar con el servidor.');
    } finally {
      setSubmitting(false);
    }
  };

  const mostrarModalExito = () => {
    setMostrarExito(true);
    scaleAnim.setValue(0);
    Animated.spring(scaleAnim, {
      toValue: 1, tension: 50, friction: 7, useNativeDriver: true,
    }).start();
    // El modal se cierra solo a los 2s, dejando los botones visibles
    setTimeout(() => setMostrarExito(false), 2200);
  };

  const limpiarFormulario = () => {
    setMotivoSeleccionado(null);
    setMotivoOtro('');
    setInicio(null);
    setFin(null);
    setObservaciones('');
    setParadaExitosa(null);
  };

  // ── Render ────────────────────────────────────────────────────────────────────

  const duracionMinutos = diffMinutos(inicio, fin);

  if (loadingMotivos) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={styles.loadingText}>Cargando motivos...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <HeaderComponent />
      <Breadcrumb items={[
        { label: 'Inicio', screen: 'Home' },
        { label: 'Registrar Paro' },
      ]} />

      {/* ─── Modal Éxito ─── */}
      <Modal visible={mostrarExito} transparent animationType="fade">
        <View style={styles.exitoOverlay}>
          <Animated.View style={[styles.exitoModal, { transform: [{ scale: scaleAnim }] }]}>
            <Text style={styles.exitoIcon}>✅</Text>
            <Text style={styles.exitoTitle}>¡Paro Registrado!</Text>
            {paradaExitosa?.minutos != null && (
              <Text style={styles.exitoSub}>{paradaExitosa.minutos} minutos de paro</Text>
            )}
          </Animated.View>
        </View>
      </Modal>

      {/* ─── Modal selector de motivo ─── */}
      <Modal visible={showMotivoPicker} transparent animationType="slide">
        <View style={styles.pickerOverlay}>
          <View style={styles.pickerModal}>
            <Text style={styles.pickerTitle}>Selecciona el Motivo</Text>
            <FlatList
              data={motivos}
              keyExtractor={(item) => item.id}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[
                    styles.motivoItem,
                    motivoSeleccionado?.id === item.id && styles.motivoItemActive,
                  ]}
                  onPress={() => {
                    setMotivoSeleccionado(item);
                    setShowMotivoPicker(false);
                    if (item.codigo !== 'OTRO') setMotivoOtro('');
                  }}
                >
                  <Text style={[
                    styles.motivoItemText,
                    motivoSeleccionado?.id === item.id && styles.motivoItemTextActive,
                  ]}>
                    {item.nombre}
                  </Text>
                  {motivoSeleccionado?.id === item.id && (
                    <Text style={styles.motivoCheck}>✓</Text>
                  )}
                </TouchableOpacity>
              )}
              ItemSeparatorComponent={() => <View style={styles.motivoSeparator} />}
            />
            <TouchableOpacity
              style={styles.pickerCancelBtn}
              onPress={() => setShowMotivoPicker(false)}
            >
              <Text style={styles.pickerCancelText}>Cancelar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* ─── TimePicker ─── */}
      <TimePickerModal
        visible={timePickerConfig.visible}
        value={timePickerConfig.field === 'inicio' ? inicio : fin}
        titulo={timePickerConfig.field === 'inicio' ? '⏱️ Hora de Inicio' : '🏁 Hora de Fin'}
        onConfirm={confirmarTimePicker}
        onCancel={() => setTimePickerConfig({ visible: false, field: null })}
      />

      {/* ─── Formulario ─── */}
      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>

        <View style={styles.pageHeader}>
          <Text style={styles.pageTitle}>🛑 Registrar Paro</Text>
          <Text style={styles.pageSubtitle}>Documenta el tiempo de parada de la operación</Text>
        </View>

        {/* ─ MOTIVO ─ */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Motivo de Paro *</Text>
          <TouchableOpacity
            style={[styles.selector, motivoSeleccionado && styles.selectorSelected]}
            onPress={() => setShowMotivoPicker(true)}
          >
            <Text style={[styles.selectorText, !motivoSeleccionado && styles.selectorPlaceholder]}>
              {motivoSeleccionado ? '✓  Motivo seleccionado' : 'Toca para seleccionar...'}
            </Text>
            <Text style={styles.selectorArrow}>▼</Text>
          </TouchableOpacity>

          {motivoSeleccionado && motivoSeleccionado.codigo !== 'OTRO' && (
            <View style={styles.otroContainer}>
              <Text style={styles.label}>Motivo seleccionado</Text>
              <View style={styles.motivoDisplay}>
                <Text style={styles.motivoDisplayText}>{motivoSeleccionado.nombre}</Text>
                <TouchableOpacity onPress={() => setShowMotivoPicker(true)}>
                  <Text style={styles.motivoDisplayCambiar}>Cambiar</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}

          {motivoSeleccionado?.codigo === 'OTRO' && (
            <View style={styles.otroContainer}>
              <Text style={styles.label}>Motivo seleccionado</Text>
              <View style={[styles.motivoDisplay, { marginBottom: 12 }]}>
                <Text style={styles.motivoDisplayText}>{motivoSeleccionado.nombre}</Text>
                <TouchableOpacity onPress={() => setShowMotivoPicker(true)}>
                  <Text style={styles.motivoDisplayCambiar}>Cambiar</Text>
                </TouchableOpacity>
              </View>
              <Text style={styles.label}>Describe el motivo *</Text>
              <TextInput
                style={styles.input}
                placeholder="Ej: Falla en la bomba hidráulica..."
                value={motivoOtro}
                onChangeText={setMotivoOtro}
                multiline
                numberOfLines={2}
              />
            </View>
          )}
        </View>

        {/* ─ TIEMPOS ─ */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>⏱️ Registro de Tiempo *</Text>

          {/* Inicio */}
          <View style={styles.timeBlock}>
            <View style={styles.timeHeader}>
              <Text style={styles.timeLabel}>Inicio del Paro</Text>
              {inicio && <Text style={styles.timeValue}>{formatFechaHora(inicio)}</Text>}
            </View>
            <View style={styles.timeButtons}>
              <TouchableOpacity style={styles.ahoraBtn} onPress={() => registrarAhora('inicio')}>
                <Text style={styles.ahoraBtnText}>⚡ Ahora</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.editarBtn} onPress={() => abrirTimePicker('inicio')}>
                <Text style={styles.editarBtnText}>✏️ Editar</Text>
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.timeDivider} />

          {/* Fin */}
          <View style={styles.timeBlock}>
            <View style={styles.timeHeader}>
              <Text style={styles.timeLabel}>Fin del Paro</Text>
              {fin && <Text style={styles.timeValue}>{formatFechaHora(fin)}</Text>}
            </View>
            <View style={styles.timeButtons}>
              <TouchableOpacity
                style={[styles.ahoraBtn, { backgroundColor: '#e74c3c' }]}
                onPress={() => registrarAhora('fin')}
              >
                <Text style={styles.ahoraBtnText}>🏁 Ahora</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.editarBtn} onPress={() => abrirTimePicker('fin')}>
                <Text style={styles.editarBtnText}>✏️ Editar</Text>
              </TouchableOpacity>
            </View>
          </View>

          {duracionMinutos !== null && (
            <View style={styles.duracionBadge}>
              <Text style={styles.duracionText}>⏳ Duración: {duracionMinutos} minutos</Text>
            </View>
          )}
        </View>

        {/* ─ OBSERVACIONES ─ */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>💬 Observaciones</Text>
          <TextInput
            style={[styles.input, styles.inputMultiline]}
            placeholder="Notas adicionales sobre el paro (opcional)..."
            value={observaciones}
            onChangeText={setObservaciones}
            multiline
            numberOfLines={4}
            textAlignVertical="top"
          />
        </View>

        {/* ─ BOTONES ─ */}

        {/* Si ya se registró con éxito, mostrar botones de acción post-registro */}
        {paradaExitosa !== null ? (
          <View style={styles.postRegistroContainer}>
            <View style={styles.postRegistroBadge}>
              <Text style={styles.postRegistroIcon}>✅</Text>
              <Text style={styles.postRegistroText}>
                Paro registrado · {paradaExitosa.minutos ?? 0} min
              </Text>
            </View>
            <TouchableOpacity
              style={styles.historialBtn}
              onPress={() => navigation.navigate('HistorialParadas')}
            >
              <Text style={styles.historialBtnText}>📋 Ver Historial de Paros</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.nuevoBtn} onPress={limpiarFormulario}>
              <Text style={styles.nuevoBtnText}>➕ Registrar otro paro</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.cancelBtn} onPress={() => navigation.navigate('Home')}>
              <Text style={styles.cancelBtnText}>Ir al inicio</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <>
            <TouchableOpacity
              style={[styles.submitBtn, submitting && styles.submitBtnDisabled]}
              onPress={handleGuardar}
              disabled={submitting}
            >
              {submitting
                ? <ActivityIndicator color="#fff" />
                : <Text style={styles.submitBtnText}>🛑 Registrar Paro</Text>
              }
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.historialBtn}
              onPress={() => navigation.navigate('HistorialParadas')}
            >
              <Text style={styles.historialBtnText}>📋 Ver Historial de Paros</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.cancelBtn} onPress={() => navigation.goBack()}>
              <Text style={styles.cancelBtnText}>Cancelar</Text>
            </TouchableOpacity>
          </>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
};

// ─── Estilos ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container:      { flex: 1, backgroundColor: '#f5f5f5' },
  scroll:         { flex: 1 },
  scrollContent:  { padding: 16 },
  loadingContainer:{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f5f5f5' },
  loadingText:    { marginTop: 14, fontSize: 16, color: '#666' },

  pageHeader: {
    backgroundColor: '#fff', borderRadius: 14, padding: 20, marginBottom: 16,
    borderLeftWidth: 4, borderLeftColor: '#e74c3c',
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.08, shadowRadius: 6, elevation: 3,
  },
  pageTitle:   { fontSize: 22, fontWeight: '900', color: '#333', marginBottom: 4 },
  pageSubtitle:{ fontSize: 13.5, color: '#666' },

  card: {
    backgroundColor: '#fff', borderRadius: 14, padding: 20, marginBottom: 16,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.08, shadowRadius: 6, elevation: 3,
  },
  cardTitle: { fontSize: 16, fontWeight: '800', color: '#333', marginBottom: 14 },

  selector:         { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderWidth: 2, borderColor: '#ddd', borderRadius: 10, padding: 16, backgroundColor: '#fafafa' },
  selectorSelected: { borderColor: COLORS.primary, backgroundColor: '#f0fdfd' },
  selectorText:     { fontSize: 15, color: COLORS.primary, fontWeight: '700', flex: 1 },
  selectorPlaceholder:{ color: '#aaa', fontWeight: '400' },
  selectorArrow:    { fontSize: 14, color: '#666', marginLeft: 8 },

  motivoDisplay:       { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderWidth: 1.5, borderColor: COLORS.primary, borderRadius: 10, paddingVertical: 13, paddingHorizontal: 14, backgroundColor: '#f0fdfd' },
  motivoDisplayText:   { fontSize: 15, color: '#222', fontWeight: '700', flex: 1 },
  motivoDisplayCambiar:{ fontSize: 13, color: COLORS.primary, fontWeight: '700', marginLeft: 10 },
  otroContainer:       { marginTop: 14 },

  label: { fontSize: 14, fontWeight: '700', color: '#444', marginBottom: 8 },
  input: { borderWidth: 1.5, borderColor: '#ddd', borderRadius: 10, padding: 13, fontSize: 15, color: '#333', backgroundColor: '#fafafa' },
  inputMultiline: { minHeight: 100, textAlignVertical: 'top' },

  timeBlock:  { marginVertical: 4 },
  timeHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  timeLabel:  { fontSize: 15, fontWeight: '700', color: '#444' },
  timeValue:  { fontSize: 13, fontWeight: '600', color: COLORS.primary },
  timeButtons:{ flexDirection: 'row', gap: 10 },
  timeDivider:{ height: 1, backgroundColor: '#eee', marginVertical: 14 },

  ahoraBtn:    { flex: 1, backgroundColor: COLORS.primary, paddingVertical: 12, borderRadius: 10, alignItems: 'center' },
  ahoraBtnText:{ color: '#fff', fontWeight: '800', fontSize: 14 },
  editarBtn:   { flex: 1, backgroundColor: '#f0f0f0', paddingVertical: 12, borderRadius: 10, alignItems: 'center' },
  editarBtnText:{ color: '#555', fontWeight: '700', fontSize: 14 },

  duracionBadge:{ marginTop: 14, backgroundColor: '#fff8e1', borderRadius: 10, padding: 12, borderLeftWidth: 4, borderLeftColor: '#f39c12', alignItems: 'center' },
  duracionText: { fontSize: 15, fontWeight: '800', color: '#c77300' },

  // Botones principales
  submitBtn:         { backgroundColor: '#e74c3c', padding: 18, borderRadius: 14, alignItems: 'center', marginBottom: 12, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.18, shadowRadius: 8, elevation: 5 },
  submitBtnDisabled: { backgroundColor: '#ccc' },
  submitBtnText:     { color: '#fff', fontSize: 17, fontWeight: '900' },

  historialBtn:    { backgroundColor: '#fff', padding: 15, borderRadius: 14, alignItems: 'center', marginBottom: 12, borderWidth: 1.5, borderColor: COLORS.primary },
  historialBtnText:{ color: COLORS.primary, fontSize: 15, fontWeight: '700' },

  cancelBtn:    { backgroundColor: '#fff', padding: 15, borderRadius: 14, alignItems: 'center', borderWidth: 1.5, borderColor: '#ddd' },
  cancelBtnText:{ color: '#666', fontSize: 15, fontWeight: '700' },

  // Post-registro
  postRegistroContainer: { marginBottom: 0 },
  postRegistroBadge:     { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: '#f0fff4', borderRadius: 12, padding: 14, marginBottom: 14, borderLeftWidth: 4, borderLeftColor: '#27ae60' },
  postRegistroIcon:      { fontSize: 24 },
  postRegistroText:      { fontSize: 15, fontWeight: '800', color: '#1a7340', flex: 1 },

  nuevoBtn:    { backgroundColor: '#e74c3c', padding: 15, borderRadius: 14, alignItems: 'center', marginBottom: 12 },
  nuevoBtnText:{ color: '#fff', fontSize: 15, fontWeight: '800' },

  // Modal éxito
  exitoOverlay:{ flex: 1, backgroundColor: 'rgba(0,0,0,0.55)', justifyContent: 'center', alignItems: 'center' },
  exitoModal:  { backgroundColor: '#fff', padding: 40, borderRadius: 24, alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.3, shadowRadius: 20, elevation: 10 },
  exitoIcon:   { fontSize: 72, marginBottom: 14 },
  exitoTitle:  { fontSize: 24, fontWeight: '900', color: '#27ae60', marginBottom: 6 },
  exitoSub:    { fontSize: 15, color: '#666', fontWeight: '700' },

  // Modal selector motivo
  pickerOverlay:   { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  pickerModal:     { backgroundColor: '#fff', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, maxHeight: '75%' },
  pickerTitle:     { fontSize: 18, fontWeight: '900', color: '#333', marginBottom: 18, textAlign: 'center' },
  motivoItem:      { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 16, paddingHorizontal: 12, borderRadius: 10 },
  motivoItemActive:{ backgroundColor: '#f0fdfd' },
  motivoItemText:  { fontSize: 15, color: '#444', fontWeight: '600', flex: 1 },
  motivoItemTextActive:{ color: COLORS.primary, fontWeight: '800' },
  motivoCheck:     { fontSize: 18, color: COLORS.primary, fontWeight: '900', marginLeft: 8 },
  motivoSeparator: { height: 1, backgroundColor: '#f0f0f0' },
  pickerCancelBtn: { marginTop: 16, backgroundColor: '#f5f5f5', padding: 15, borderRadius: 12, alignItems: 'center' },
  pickerCancelText:{ fontSize: 15, fontWeight: '700', color: '#666' },
});

export default RegistrarParadaScreen;