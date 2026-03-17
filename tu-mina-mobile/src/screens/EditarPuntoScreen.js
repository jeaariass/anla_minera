// src/screens/EditarPuntoScreen.js
import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  TextInput, ActivityIndicator, Alert, Modal, FlatList,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import HeaderComponent from '../components/HeaderComponent';
import Breadcrumb from '../components/Breadcrumb';
import { actividadService } from '../services/api';
import { STORAGE_KEYS } from '../utils/constants';
import COLORS from '../utils/colors';

// ─── Constantes ───────────────────────────────────────────────────────────────

const CATEGORIAS = [
  { id: 'extraccion',    label: '⛏️ Extracción',   color: '#e74c3c' },
  { id: 'acopio',        label: '📦 Acopio',        color: '#3498db' },
  { id: 'procesamiento', label: '⚙️ Procesamiento', color: '#f39c12' },
  { id: 'inspeccion',    label: '🔍 Inspección',     color: '#27ae60' },
];

/** "YYYY-MM-DD" según hora Colombia ahora mismo */
const colombiaToday = () => {
  const local = new Date(Date.now() - 5 * 3600000);
  return local.toISOString().split('T')[0];
};

/** True si el campo dia del punto coincide con hoy Colombia */
const esMismoDia = (dia) => !!dia && String(dia).split('T')[0] === colombiaToday();

// ─── Selector reutilizable ────────────────────────────────────────────────────

const SelectorConPicker = ({
  label, placeholder, valorSeleccionado, onSeleccionar,
  items, loading, colorActivo, otroValue, onOtroChange,
  labelOtro, placeholderOtro, disabled,
}) => {
  const [visible, setVisible] = useState(false);
  const esOtro    = valorSeleccionado?.codigo === 'OTRO';
  const textoSel  = valorSeleccionado
    ? (esOtro ? '✏️ Otro (escribir)' : (valorSeleccionado.display || valorSeleccionado.nombre))
    : null;

  return (
    <View>
      <TouchableOpacity
        style={[
          styles.selector,
          valorSeleccionado && { borderColor: colorActivo, backgroundColor: colorActivo + '12' },
          disabled && styles.selectorDisabled,
        ]}
        onPress={() => !disabled && setVisible(true)}
        disabled={disabled || loading}
      >
        {loading
          ? <ActivityIndicator size="small" color={colorActivo} />
          : <>
              <Text style={[styles.selectorText, valorSeleccionado && { color: '#222', fontWeight: '700' }, disabled && { color: '#bbb' }]}>
                {textoSel ?? placeholder}
              </Text>
              {!disabled && <Text style={[styles.selectorArrow, { color: colorActivo }]}>▼</Text>}
            </>
        }
      </TouchableOpacity>

      {esOtro && !disabled && (
        <View style={styles.otroContainer}>
          <Text style={styles.label}>{labelOtro}</Text>
          <TextInput
            style={styles.input}
            placeholder={placeholderOtro}
            value={otroValue}
            onChangeText={onOtroChange}
            multiline
            numberOfLines={2}
          />
        </View>
      )}

      <Modal visible={visible} transparent animationType="slide">
        <View style={styles.pickerOverlay}>
          <View style={styles.pickerModal}>
            <View style={[styles.pickerHeader, { borderBottomColor: colorActivo }]}>
              <Text style={[styles.pickerTitle, { color: colorActivo }]}>{label}</Text>
            </View>
            {loading
              ? <View style={styles.pickerLoading}><ActivityIndicator size="large" color={colorActivo} /></View>
              : <FlatList
                  data={items}
                  keyExtractor={i => i.id}
                  style={styles.pickerList}
                  renderItem={({ item }) => {
                    const isOtro   = item.codigo === 'OTRO';
                    const isActive = valorSeleccionado?.id === item.id;
                    const texto    = isOtro ? '✏️  Otro (escribir)' : (item.display || item.nombre);
                    return (
                      <TouchableOpacity
                        style={[
                          styles.itemRow,
                          isActive && { backgroundColor: colorActivo + '18' },
                          isOtro   && styles.itemRowOtro,
                        ]}
                        onPress={() => {
                          onSeleccionar(item);
                          setVisible(false);
                          if (!isOtro && onOtroChange) onOtroChange('');
                        }}
                      >
                        <Text style={[
                          styles.itemRowText,
                          isActive && { color: colorActivo, fontWeight: '800' },
                          isOtro   && { color: '#888', fontStyle: 'italic' },
                        ]}>
                          {texto}
                        </Text>
                        {isActive && <Text style={[styles.itemCheck, { color: colorActivo }]}>✓</Text>}
                      </TouchableOpacity>
                    );
                  }}
                  ItemSeparatorComponent={() => <View style={styles.itemSeparator} />}
                />
            }
            <TouchableOpacity style={styles.pickerCancelBtn} onPress={() => setVisible(false)}>
              <Text style={styles.pickerCancelText}>Cancelar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
};

// ─── Pantalla principal ───────────────────────────────────────────────────────

const EditarPuntoScreen = ({ navigation, route }) => {
  const { punto } = route.params;   // objeto completo desde HistorialPuntosScreen

  const editable = esMismoDia(punto.dia);

  // Form state — inicializado con los valores del punto
  const [categoriaSeleccionada, setCategoriaSeleccionada] = useState(punto.categoria || null);

  // Ítem
  const [items,           setItems]           = useState([]);
  const [loadingItems,    setLoadingItems]     = useState(false);
  const [itemSeleccionado, setItemSeleccionado] = useState(
    punto.itemId ? { id: punto.itemId, nombre: punto.itemNombre, codigo: punto.itemOtro ? 'OTRO' : '_', display: punto.itemDisplay } : null
  );
  const [itemOtro, setItemOtro] = useState(punto.itemOtro || '');

  // Maquinaria
  const [maquinariaLista,        setMaquinariaLista]        = useState([]);
  const [loadingMaquinaria,      setLoadingMaquinaria]      = useState(false);
  const [maquinariaSeleccionada, setMaquinariaSeleccionada] = useState(
    punto.maquinariaId ? { id: punto.maquinariaId, nombre: punto.maquinariaNombre, codigo: punto.maquinariaOtro ? 'OTRO' : '_', display: punto.maquinariaNombre } : null
  );
  const [maquinariaOtro, setMaquinariaOtro] = useState(punto.maquinariaOtro || '');

  // Extras
  const [descripcion, setDescripcion] = useState(punto.descripcion || '');
  const [volumen,     setVolumen]     = useState(punto.volumenM3 ? String(punto.volumenM3) : '');

  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    cargarMaquinaria();
  }, []);

  useEffect(() => {
    if (categoriaSeleccionada) cargarItems(categoriaSeleccionada);
    // No limpiar selección al montar para preservar el valor original
  }, [categoriaSeleccionada]);

  const cargarItems = async (cat) => {
    try {
      setLoadingItems(true);
      const resp = await actividadService.getItems(cat);
      setItems(resp?.data ?? []);
    } catch (e) { console.error(e); setItems([]); }
    finally { setLoadingItems(false); }
  };

  const cargarMaquinaria = async () => {
    try {
      setLoadingMaquinaria(true);
      const resp = await actividadService.getMaquinaria();
      setMaquinariaLista(resp?.data ?? []);
    } catch (e) { console.error(e); setMaquinariaLista([]); }
    finally { setLoadingMaquinaria(false); }
  };

  const handleGuardar = async () => {
    if (!editable) return;

    if (!categoriaSeleccionada)
      return Alert.alert('Campo requerido', 'Selecciona una categoría.');
    if (!itemSeleccionado)
      return Alert.alert('Campo requerido', 'Selecciona un ítem.');
    if (itemSeleccionado.codigo === 'OTRO' && !itemOtro.trim())
      return Alert.alert('Campo requerido', 'Describe el ítem en el campo "Otro ítem".');
    if (maquinariaSeleccionada?.codigo === 'OTRO' && !maquinariaOtro.trim())
      return Alert.alert('Campo requerido', 'Describe la maquinaria en el campo "Otra maquinaria".');

    try {
      setSubmitting(true);

      const payload = {
        categoria:      categoriaSeleccionada,
        itemId:         itemSeleccionado?.id          ?? null,
        itemOtro:       itemSeleccionado?.codigo === 'OTRO' ? itemOtro.trim() : null,
        maquinariaId:   maquinariaSeleccionada?.id    ?? null,
        maquinariaOtro: maquinariaSeleccionada?.codigo === 'OTRO' ? maquinariaOtro.trim() : null,
        descripcion:    descripcion.trim() || null,
        volumenM3:      volumen ? parseFloat(volumen) : null,
      };

      const resp = await actividadService.editarPunto(punto.id, payload);

      if (resp?.success) {
        Alert.alert('✅ Actualizado', 'El punto fue modificado correctamente.', [
          { text: 'OK', onPress: () => navigation.goBack() },
        ]);
      } else {
        Alert.alert('Error', resp?.message || 'No se pudo actualizar el punto.');
      }
    } catch (e) {
      console.error(e);
      Alert.alert('Error', 'No se pudo conectar con el servidor.');
    } finally {
      setSubmitting(false);
    }
  };

  const colorCategoria = CATEGORIAS.find(c => c.id === categoriaSeleccionada)?.color ?? COLORS.primary;

  // ── Render ────────────────────────────────────────────────────────────────────

  return (
    <View style={styles.container}>
      <HeaderComponent />
      <Breadcrumb items={[
        { label: 'Inicio',    screen: 'Home' },
        { label: 'Historial', screen: 'HistorialPuntos' },
        { label: 'Editar Punto' },
      ]} />

      <ScrollView contentContainerStyle={styles.scroll}>

        {/* Banner solo lectura */}
        {!editable && (
          <View style={styles.lockedBanner}>
            <Text style={styles.lockedIcon}>🔒</Text>
            <View style={{ flex: 1 }}>
              <Text style={styles.lockedTitle}>Solo lectura</Text>
              <Text style={styles.lockedSub}>Solo se pueden editar puntos del día de hoy</Text>
            </View>
          </View>
        )}

        {/* Resumen original */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>📍 Punto original</Text>
          <Text style={styles.resumenCategoria}>
            {CATEGORIAS.find(c => c.id === punto.categoria)?.label ?? punto.categoria}
          </Text>
          <Text style={styles.resumenItem}>{punto.itemDisplay || punto.itemNombre || '—'}</Text>
          {punto.fecha && (
            <Text style={styles.resumenFecha}>
              🕒 {String(punto.fecha).replace('T', '  ').slice(0, 16)}
            </Text>
          )}
        </View>

        {/* Categoría */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Categoría *</Text>
          <View style={styles.categoriaGrid}>
            {CATEGORIAS.map(cat => (
              <TouchableOpacity
                key={cat.id}
                style={[
                  styles.categoriaBtn,
                  categoriaSeleccionada === cat.id && { backgroundColor: cat.color, borderColor: cat.color },
                  !editable && styles.categoriaBtnDisabled,
                ]}
                onPress={() => {
                  if (!editable) return;
                  setCategoriaSeleccionada(cat.id);
                  setItemSeleccionado(null);
                  setItemOtro('');
                }}
              >
                <Text style={[
                  styles.categoriaBtnText,
                  categoriaSeleccionada === cat.id && { color: '#fff' },
                  !editable && { color: '#bbb' },
                ]}>
                  {cat.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Ítem */}
        {categoriaSeleccionada && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>
              Ítem · {CATEGORIAS.find(c => c.id === categoriaSeleccionada)?.label} *
            </Text>
            <SelectorConPicker
              label={`Ítems de ${CATEGORIAS.find(c => c.id === categoriaSeleccionada)?.label}`}
              placeholder="Toca para seleccionar ítem..."
              valorSeleccionado={itemSeleccionado}
              onSeleccionar={setItemSeleccionado}
              items={items}
              loading={loadingItems}
              colorActivo={colorCategoria}
              otroValue={itemOtro}
              onOtroChange={setItemOtro}
              labelOtro="Describe el ítem *"
              placeholderOtro="Ej: Material especial no listado..."
              disabled={!editable}
            />
          </View>
        )}

        {/* Maquinaria */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>🚜 Maquinaria</Text>
          <SelectorConPicker
            label="Seleccionar maquinaria"
            placeholder="Toca para seleccionar maquinaria..."
            valorSeleccionado={maquinariaSeleccionada}
            onSeleccionar={setMaquinariaSeleccionada}
            items={maquinariaLista}
            loading={loadingMaquinaria}
            colorActivo="#7c3aed"
            otroValue={maquinariaOtro}
            onOtroChange={setMaquinariaOtro}
            labelOtro="Describe la maquinaria *"
            placeholderOtro="Ej: Retroexcavadora Komatzu 2020..."
            disabled={!editable}
          />
        </View>

        {/* Detalles */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Detalles adicionales</Text>

          <Text style={styles.label}>Descripción / Observación</Text>
          <TextInput
            style={[styles.input, { marginBottom: 16 }, !editable && styles.inputDisabled]}
            placeholder="Ej: Frente norte, material seco..."
            value={descripcion}
            onChangeText={setDescripcion}
            multiline
            numberOfLines={3}
            editable={editable}
          />

          <Text style={styles.label}>Volumen (m³)</Text>
          <TextInput
            style={[styles.input, !editable && styles.inputDisabled]}
            placeholder="Ej: 15.5"
            value={volumen}
            onChangeText={setVolumen}
            keyboardType="decimal-pad"
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

// ─── Estilos ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  scroll:    { padding: 16 },

  lockedBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: '#fff8e1', borderRadius: 12, padding: 16, marginBottom: 16,
    borderLeftWidth: 4, borderLeftColor: '#f39c12',
  },
  lockedIcon: { fontSize: 28 },
  lockedTitle:{ fontSize: 15, fontWeight: '800', color: '#c77300' },
  lockedSub:  { fontSize: 13, color: '#c77300', marginTop: 2 },

  card: {
    backgroundColor: '#fff', borderRadius: 14, padding: 18, marginBottom: 14,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07, shadowRadius: 6, elevation: 3,
  },
  cardTitle:        { fontSize: 15, fontWeight: '800', color: '#333', marginBottom: 14 },
  resumenCategoria: { fontSize: 18, fontWeight: '800', color: COLORS.primary, marginBottom: 4 },
  resumenItem:      { fontSize: 14, color: '#555', marginBottom: 4 },
  resumenFecha:     { fontSize: 12, color: '#999' },

  categoriaGrid:       { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  categoriaBtn:        { flex: 1, minWidth: '45%', padding: 14, borderRadius: 10, backgroundColor: '#f0f0f0', borderWidth: 2, borderColor: '#ddd' },
  categoriaBtnDisabled:{ opacity: 0.5 },
  categoriaBtnText:    { fontSize: 13, color: '#333', textAlign: 'center', fontWeight: '600' },

  selector: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    borderWidth: 2, borderColor: '#ddd', borderRadius: 10, padding: 15,
    backgroundColor: '#fafafa', minHeight: 52,
  },
  selectorDisabled: { backgroundColor: '#f5f5f5', opacity: 0.6 },
  selectorText:     { fontSize: 15, color: '#999', flex: 1 },
  selectorArrow:    { fontSize: 14, marginLeft: 8 },
  otroContainer:    { marginTop: 12 },

  label: { fontSize: 14, fontWeight: '600', color: '#333', marginBottom: 8 },
  input: {
    borderWidth: 1.5, borderColor: '#ddd', borderRadius: 10,
    padding: 13, fontSize: 15, color: '#333', backgroundColor: '#fafafa',
  },
  inputDisabled: { backgroundColor: '#f5f5f5', color: '#aaa' },

  saveBtn:         { backgroundColor: COLORS.primary, padding: 18, borderRadius: 14, alignItems: 'center', marginBottom: 12, elevation: 4 },
  saveBtnDisabled: { backgroundColor: '#ccc' },
  saveBtnText:     { color: '#fff', fontSize: 17, fontWeight: '900' },

  backBtn:     { backgroundColor: '#fff', padding: 15, borderRadius: 14, alignItems: 'center', borderWidth: 1.5, borderColor: '#ddd' },
  backBtnText: { color: '#666', fontSize: 15, fontWeight: '700' },

  pickerOverlay:   { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  pickerModal:     { backgroundColor: '#fff', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, maxHeight: '80%' },
  pickerHeader:    { borderBottomWidth: 2, paddingBottom: 14, marginBottom: 8 },
  pickerTitle:     { fontSize: 18, fontWeight: '900', color: '#333' },
  pickerLoading:   { paddingVertical: 40, alignItems: 'center' },
  pickerList:      { maxHeight: 400 },
  itemRow:         { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 15, paddingHorizontal: 8, borderRadius: 8 },
  itemRowOtro:     { marginTop: 6, borderTopWidth: 1, borderTopColor: '#eee', paddingTop: 16 },
  itemRowText:     { fontSize: 15, color: '#444', fontWeight: '500', flex: 1 },
  itemCheck:       { fontSize: 18, fontWeight: '900', marginLeft: 8 },
  itemSeparator:   { height: 1, backgroundColor: '#f0f0f0', marginHorizontal: 4 },
  pickerCancelBtn: { marginTop: 14, backgroundColor: '#f5f5f5', padding: 15, borderRadius: 12, alignItems: 'center' },
  pickerCancelText:{ fontSize: 15, fontWeight: '700', color: '#666' },
});

export default EditarPuntoScreen;