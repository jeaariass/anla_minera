// src/screens/EditarParadaScreen.js
import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  TextInput, ActivityIndicator, Alert, Modal, FlatList,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import HeaderComponent from '../components/HeaderComponent';
import Breadcrumb from '../components/Breadcrumb';
import { paradasService } from '../services/api';
import { STORAGE_KEYS } from '../utils/constants';
import COLORS from '../utils/colors';

// ─── Helpers timezone Colombia ────────────────────────────────────────────────
// El backend retorna timestamps como strings "YYYY-MM-DDTHH:MM:SS" (sin Z),
// ya en hora Colombia. Extraemos hora/fecha directamente del string.

/** "YYYY-MM-DDTHH:MM:SS" → "HH:MM" */
const isoToHHMM = (iso) => {
  if (!iso) return '';
  const match = String(iso).match(/T(\d{2}:\d{2})/);
  return match ? match[1] : '';
};

/**
 * Toma la fecha del string base (YYYY-MM-DD) + nueva hora "HH:MM"
 * y devuelve un ISO con offset -05:00 para que el backend lo interprete
 * correctamente como hora Colombia antes de convertir a naive.
 */
const hhmmToIso = (base, hhmm) => {
  if (!hhmm || !/^\d{1,2}:\d{2}$/.test(hhmm)) return null;
  const datePart = String(base).split('T')[0]; // "YYYY-MM-DD"
  const [h, m]   = hhmm.split(':').map(Number);
  const hStr     = String(h).padStart(2, '0');
  const mStr     = String(m).padStart(2, '0');
  // -05:00 = Colombia. El backend aplica toColombia(new Date(this)) antes de guardar.
  return `${datePart}T${hStr}:${mStr}:00-05:00`;
};

/** "YYYY-MM-DD" del inicio de Colombia ahora */
const colombiaToday = () => {
  const local = new Date(Date.now() - 5 * 3600000);
  return local.toISOString().split('T')[0];
};

/** True si el ISO naívo "YYYY-MM-DDTHH:MM:SS" es del día de hoy Colombia */
const esMismoDia = (iso) => {
  if (!iso) return false;
  return String(iso).split('T')[0] === colombiaToday();
};

// ─── Pantalla ─────────────────────────────────────────────────────────────────

const EditarParadaScreen = ({ navigation, route }) => {
  const { parada } = route.params;

  const editable = esMismoDia(parada.inicio);

  // Form state
  const [motivoId,      setMotivoId]      = useState(parada.motivoId      || '');
  const [motivoCodigo,  setMotivoCodigo]  = useState(parada.motivoCodigo  || '');
  const [motivoNombre,  setMotivoNombre]  = useState(parada.motivoNombre  || '');
  const [motivoOtro,    setMotivoOtro]    = useState(parada.motivoOtro    || '');
  const [horaInicio,    setHoraInicio]    = useState(isoToHHMM(parada.inicio));
  const [horaFin,       setHoraFin]       = useState(isoToHHMM(parada.fin));
  const [observaciones, setObservaciones] = useState(parada.observaciones || '');

  // Catálogo
  const [motivos,        setMotivos]        = useState([]);
  const [loadingMotivos, setLoadingMotivos] = useState(false);
  const [modalVisible,   setModalVisible]   = useState(false);

  // Submit
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => { cargarMotivos(); }, []);

  const cargarMotivos = async () => {
    setLoadingMotivos(true);
    try {
      const resp = await paradasService.getMotivos();
      if (resp?.success) setMotivos(resp.data);
    } catch (e) { console.error(e); }
    finally { setLoadingMotivos(false); }
  };

  const seleccionarMotivo = (m) => {
    setMotivoId(m.id);
    setMotivoCodigo(m.codigo);
    setMotivoNombre(m.nombre);
    if (m.codigo !== 'OTRO') setMotivoOtro('');
    setModalVisible(false);
  };

  const handleGuardar = async () => {
    if (!editable) return;

    if (!motivoId)
      return Alert.alert('Campo requerido', 'Selecciona un motivo.');
    if (motivoCodigo === 'OTRO' && !motivoOtro.trim())
      return Alert.alert('Campo requerido', 'Describe el motivo "Otro".');
    if (!horaInicio || !/^\d{1,2}:\d{2}$/.test(horaInicio))
      return Alert.alert('Hora inválida', 'Formato de inicio incorrecto (HH:MM).');
    if (!horaFin || !/^\d{1,2}:\d{2}$/.test(horaFin))
      return Alert.alert('Hora inválida', 'Formato de fin incorrecto (HH:MM).');

    const nuevoInicio = hhmmToIso(parada.inicio, horaInicio);
    const nuevoFin    = hhmmToIso(parada.inicio, horaFin);

    if (!nuevoInicio || !nuevoFin)
      return Alert.alert('Error', 'No se pudo calcular las fechas.');

    // Comparar sin TZ: convertir ambos a minutos del día para la validación
    const [hi, mi] = horaInicio.split(':').map(Number);
    const [hf, mf] = horaFin.split(':').map(Number);
    if (hf * 60 + mf <= hi * 60 + mi)
      return Alert.alert('Error', 'La hora de fin debe ser posterior al inicio.');

    try {
      setSubmitting(true);
      const resp = await paradasService.editarParada(parada.id, {
        motivoId,
        motivoOtro: motivoCodigo === 'OTRO' ? motivoOtro.trim() : null,
        inicio:     nuevoInicio,
        fin:        nuevoFin,
        observaciones: observaciones.trim() || null,
      });

      if (resp?.success) {
        Alert.alert('✅ Actualizado', 'El paro fue modificado correctamente.', [
          { text: 'OK', onPress: () => navigation.goBack() },
        ]);
      } else {
        Alert.alert('Error', resp?.message || 'No se pudo actualizar el paro.');
      }
    } catch (e) {
      console.error(e);
      Alert.alert('Error', 'No se pudo conectar con el servidor.');
    } finally {
      setSubmitting(false);
    }
  };

  // ── Render ────────────────────────────────────────────────────────────────────

  return (
    <View style={styles.container}>
      <HeaderComponent />
      <Breadcrumb items={[
        { label: 'Inicio', screen: 'Home' },
        { label: 'Historial', screen: 'HistorialParadas' },
        { label: 'Editar Paro' },
      ]} />

      {/* Modal selector de motivo */}
      <Modal visible={modalVisible} transparent animationType="slide">
        <View style={styles.pickerOverlay}>
          <View style={styles.pickerModal}>
            <Text style={styles.pickerTitle}>Selecciona el Motivo</Text>
            {loadingMotivos
              ? <ActivityIndicator size="large" color={COLORS.primary} style={{ marginVertical: 30 }} />
              : (
                <FlatList
                  data={motivos}
                  keyExtractor={m => m.id}
                  renderItem={({ item }) => (
                    <TouchableOpacity
                      style={[styles.motivoItem, motivoId === item.id && styles.motivoItemActive]}
                      onPress={() => seleccionarMotivo(item)}
                    >
                      <Text style={[styles.motivoText, motivoId === item.id && styles.motivoTextActive]}>
                        {item.nombre}
                      </Text>
                      {motivoId === item.id && <Text style={styles.check}>✓</Text>}
                    </TouchableOpacity>
                  )}
                  ItemSeparatorComponent={() => <View style={{ height: 1, backgroundColor: '#f0f0f0' }} />}
                />
              )
            }
            <TouchableOpacity style={styles.cancelPickerBtn} onPress={() => setModalVisible(false)}>
              <Text style={styles.cancelPickerText}>Cancelar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <ScrollView contentContainerStyle={styles.scroll}>

        {/* Banner de solo lectura */}
        {!editable && (
          <View style={styles.lockedBanner}>
            <Text style={styles.lockedIcon}>🔒</Text>
            <View style={{ flex: 1 }}>
              <Text style={styles.lockedTitle}>Solo lectura</Text>
              <Text style={styles.lockedSubtitle}>
                Solo se pueden editar paros del día de hoy
              </Text>
            </View>
          </View>
        )}

        {/* Resumen original */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>📋 Paro original</Text>
          <Text style={styles.resumenText}>
            {isoToHHMM(parada.inicio)} → {isoToHHMM(parada.fin)}
          </Text>
          <Text style={styles.resumenMotivo}>{parada.motivoNombre || parada.motivoDisplay}</Text>
        </View>

        {/* Motivo */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Motivo de Paro *</Text>
          <TouchableOpacity
            style={[styles.selector, !editable && styles.selectorDisabled, motivoId && styles.selectorSelected]}
            onPress={() => editable && setModalVisible(true)}
            disabled={!editable}
          >
            <Text style={[styles.selectorText, !motivoId && styles.selectorPlaceholder]}>
              {motivoNombre || 'Toca para seleccionar...'}
            </Text>
            {editable && <Text style={styles.arrow}>▼</Text>}
          </TouchableOpacity>
          {motivoCodigo === 'OTRO' && (
            <View style={{ marginTop: 12 }}>
              <Text style={styles.label}>Describe el motivo *</Text>
              <TextInput
                style={[styles.input, !editable && styles.inputDisabled]}
                value={motivoOtro}
                onChangeText={setMotivoOtro}
                placeholder="Ej: Falla mecánica específica..."
                editable={editable}
                multiline
              />
            </View>
          )}
        </View>

        {/* Horas */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>⏱️ Horario *</Text>
          <Text style={styles.label}>Hora de inicio (HH:MM)</Text>
          <TextInput
            style={[styles.input, !editable && styles.inputDisabled, { marginBottom: 14 }]}
            value={horaInicio}
            onChangeText={setHoraInicio}
            keyboardType="numbers-and-punctuation"
            placeholder="Ej: 09:30"
            editable={editable}
          />
          <Text style={styles.label}>Hora de fin (HH:MM)</Text>
          <TextInput
            style={[styles.input, !editable && styles.inputDisabled]}
            value={horaFin}
            onChangeText={setHoraFin}
            keyboardType="numbers-and-punctuation"
            placeholder="Ej: 10:15"
            editable={editable}
          />
        </View>

        {/* Observaciones */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>💬 Observaciones</Text>
          <TextInput
            style={[styles.input, styles.inputMultiline, !editable && styles.inputDisabled]}
            value={observaciones}
            onChangeText={setObservaciones}
            placeholder="Notas adicionales (opcional)..."
            multiline
            numberOfLines={4}
            textAlignVertical="top"
            editable={editable}
          />
        </View>

        {/* Botones */}
        {editable && (
          <TouchableOpacity
            style={[styles.saveBtn, submitting && styles.saveBtnDisabled]}
            onPress={handleGuardar}
            disabled={submitting}
          >
            {submitting
              ? <ActivityIndicator color="#fff" />
              : <Text style={styles.saveBtnText}>💾 Guardar Cambios</Text>
            }
          </TouchableOpacity>
        )}

        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Text style={styles.backBtnText}>← Volver al historial</Text>
        </TouchableOpacity>

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  scroll:    { padding: 16 },

  lockedBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: '#fff8e1', borderRadius: 12, padding: 16, marginBottom: 16,
    borderLeftWidth: 4, borderLeftColor: '#f39c12',
  },
  lockedIcon:     { fontSize: 28 },
  lockedTitle:    { fontSize: 15, fontWeight: '800', color: '#c77300' },
  lockedSubtitle: { fontSize: 13, color: '#c77300', marginTop: 2 },

  card: {
    backgroundColor: '#fff', borderRadius: 14, padding: 18, marginBottom: 14,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07, shadowRadius: 6, elevation: 3,
  },
  cardTitle:    { fontSize: 15, fontWeight: '800', color: '#333', marginBottom: 14 },
  resumenText:  { fontSize: 24, fontWeight: '900', color: COLORS.primary, marginBottom: 6 },
  resumenMotivo:{ fontSize: 14, color: '#666' },

  selector: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    borderWidth: 2, borderColor: '#ddd', borderRadius: 10, padding: 15, backgroundColor: '#fafafa',
  },
  selectorSelected: { borderColor: COLORS.primary, backgroundColor: '#f0fdfd' },
  selectorDisabled: { backgroundColor: '#f5f5f5', opacity: 0.7 },
  selectorText:     { fontSize: 15, color: COLORS.primary, fontWeight: '700', flex: 1 },
  selectorPlaceholder:{ color: '#aaa', fontWeight: '400' },
  arrow:            { fontSize: 14, color: '#666' },

  label: { fontSize: 14, fontWeight: '700', color: '#444', marginBottom: 8 },
  input: {
    borderWidth: 1.5, borderColor: '#ddd', borderRadius: 10,
    padding: 13, fontSize: 15, color: '#333', backgroundColor: '#fafafa',
  },
  inputDisabled: { backgroundColor: '#f5f5f5', color: '#999' },
  inputMultiline:{ minHeight: 90, textAlignVertical: 'top' },

  saveBtn:         { backgroundColor: COLORS.primary, padding: 18, borderRadius: 14, alignItems: 'center', marginBottom: 12, elevation: 4 },
  saveBtnDisabled: { backgroundColor: '#ccc' },
  saveBtnText:     { color: '#fff', fontSize: 17, fontWeight: '900' },

  backBtn:     { backgroundColor: '#fff', padding: 15, borderRadius: 14, alignItems: 'center', borderWidth: 1.5, borderColor: '#ddd' },
  backBtnText: { color: '#666', fontSize: 15, fontWeight: '700' },

  pickerOverlay:   { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  pickerModal:     { backgroundColor: '#fff', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, maxHeight: '75%' },
  pickerTitle:     { fontSize: 18, fontWeight: '900', color: '#333', marginBottom: 16, textAlign: 'center' },
  motivoItem:      { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 16, paddingHorizontal: 10, borderRadius: 8 },
  motivoItemActive:{ backgroundColor: '#f0fdfd' },
  motivoText:      { fontSize: 15, color: '#444', fontWeight: '600', flex: 1 },
  motivoTextActive:{ color: COLORS.primary, fontWeight: '800' },
  check:           { fontSize: 18, color: COLORS.primary, fontWeight: '900', marginLeft: 8 },
  cancelPickerBtn: { marginTop: 14, backgroundColor: '#f5f5f5', padding: 15, borderRadius: 12, alignItems: 'center' },
  cancelPickerText:{ fontSize: 15, fontWeight: '700', color: '#666' },
});

export default EditarParadaScreen;