import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { authService, friService } from '../services/api';
import { 
  Plus, 
  List, 
  ArrowLeft,
  Save,
  X,
  Edit,
  Trash2,
  Eye,
  Send,
  AlertCircle,
  CheckCircle,
  Filter,
  FileText,
  BarChart3,
  Calendar,
  Package,
  PauseCircle,
  Settings,
  Truck,
  DollarSign,
  Layers,
  Zap,
  TrendingUp,
  User, LogOut,
} from 'lucide-react';
import './Formularios.css';

const Formularios = () => {
  const navigate = useNavigate();
  const [usuario] = useState(authService.getCurrentUser());
   const handleLogout = () => {  // ← AGREGAR
    authService.logout();
    navigate('/login');
  };
  const [view, setView] = useState('dashboard');
  const [selectedType, setSelectedType] = useState('');
  const [formData, setFormData] = useState({});
  const [formularios, setFormularios] = useState([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });
  const [borradoresCount, setBorradoresCount] = useState(0);
  const [filtroEstado, setFiltroEstado] = useState('TODOS');
  const [modalFormulario, setModalFormulario] = useState(null);
  const [editMode, setEditMode] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [dashboardStats, setDashboardStats] = useState({
    total: 0,
    borradores: 0,
    enviados: 0,
    aprobados: 0,
    rechazados: 0,
    porTipo: {}
  });
  const [fieldErrors, setFieldErrors] = useState({});
  const [formErrorBanner, setFormErrorBanner] = useState('');

  const tiposFormularios = [
    { id: 'produccion', nombre: 'FRI Producción (Mensual)', icon: <FileText size={32} />, color: '#3b82f6' },
    { id: 'inventarios', nombre: 'FRI Inventarios (Mensual)', icon: <Package size={32} />, color: '#10b981' },
    { id: 'paradas', nombre: 'FRI Paradas de Producción', icon: <PauseCircle size={32} />, color: '#ef4444' },
    { id: 'ejecucion', nombre: 'FRI Ejecución (Mensual)', icon: <Settings size={32} />, color: '#f59e0b' },
    { id: 'maquinaria', nombre: 'FRI Utilización de Maquinaria', icon: <Truck size={32} />, color: '#8b5cf6' },
    { id: 'regalias', nombre: 'FRI Regalías (Trimestral)', icon: <DollarSign size={32} />, color: '#ec4899' },
    { id: 'inventarioMaquinaria', nombre: 'FRI Inventario Maquinaria (Anual)', icon: <Layers size={32} />, color: '#06b6d4' },
    { id: 'capacidad', nombre: 'FRI Capacidad (Anual)', icon: <Zap size={32} />, color: '#14b8a6' },
    { id: 'proyecciones', nombre: 'FRI Proyecciones (Anual)', icon: <TrendingUp size={32} />, color: '#f97316' },
  ];

  useEffect(() => {
    loadDashboardData();
    loadBorradoresCount();
  }, []);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      const stats = {
        total: 0,
        borradores: 0,
        enviados: 0,
        aprobados: 0,
        rechazados: 0,
        porTipo: {}
      };

      for (const tipo of tiposFormularios) {
        try {
          const serviceMethod = `get${tipo.id.charAt(0).toUpperCase() + tipo.id.slice(1)}`;
          const response = await friService[serviceMethod]();
          
          if (response.data.success && response.data.fris) {
            const fris = response.data.fris;
            stats.total += fris.length;
            stats.porTipo[tipo.id] = fris.length;

            fris.forEach(fri => {
              if (fri.estado === 'BORRADOR') stats.borradores++;
              else if (fri.estado === 'ENVIADO') stats.enviados++;
              else if (fri.estado === 'APROBADO') stats.aprobados++;
              else if (fri.estado === 'RECHAZADO') stats.rechazados++;
            });
          }
        } catch (error) {
          console.error(`Error al cargar ${tipo.id}:`, error);
        }
      }

      setDashboardStats(stats);
    } catch (error) {
      console.error('Error al cargar dashboard:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadBorradoresCount = async () => {
    try {
      const response = await friService.getBorradoresCount();
      if (response.data.success) {
        setBorradoresCount(response.data.total);
      }
    } catch (error) {
      console.error('Error al cargar contador de borradores:', error);
    }
  };

  const handleTypeSelect = (tipo) => {
    setSelectedType(tipo);
    setFormData({});
    setMessage({ type: '', text: '' });
    setEditMode(false);
    setEditingId(null);
    setView('create');
  };

  const handleListView = async (tipo) => {
    setSelectedType(tipo);
    setLoading(true);
    setMessage({ type: '', text: '' });
    try {
      const serviceMethod = `get${tipo.charAt(0).toUpperCase() + tipo.slice(1)}`;
      const response = await friService[serviceMethod]();
      
      if (response.data.success) {
        setFormularios(response.data.fris || []);
      } else {
        setFormularios([]);
        setMessage({ type: 'info', text: 'No hay formularios registrados' });
      }
      setView('list');
    } catch (error) {
      console.error('Error al cargar formularios:', error);
      setMessage({ 
        type: 'error', 
        text: error.response?.data?.message || 'Error al cargar formularios' 
      });
      setFormularios([]);
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (formulario) => {
    setEditMode(true);
    setEditingId(formulario.id);
    
    // Detectar tipo basándose en los campos
    let tipo = '';
    if (formulario.cantidadProduccion !== undefined) tipo = 'produccion';
    else if (formulario.inventarioInicialAcopio !== undefined) tipo = 'inventarios';
    else if (formulario.tipoParada !== undefined) tipo = 'paradas';
    else if (formulario.denominacionFrente !== undefined) tipo = 'ejecucion';
    else if (formulario.tipoMaquinaria !== undefined && formulario.horasOperacion !== undefined) tipo = 'maquinaria';
    else if (formulario.valorDeclaracion !== undefined) tipo = 'regalias';
    else if (formulario.estadoOperativo !== undefined) tipo = 'inventarioMaquinaria';
    else if (formulario.capacidadInstalada !== undefined) tipo = 'capacidad';
    else if (formulario.capacidadExtraccion !== undefined) tipo = 'proyecciones';
    
    setSelectedType(tipo);
    
    // Preparar datos para edición
    const editData = { ...formulario };
    
    // Formatear fechas para inputs
    if (editData.fechaCorte) {
      editData.fechaCorte = new Date(editData.fechaCorte).toISOString().split('T')[0];
    }
    if (editData.fechaInicio) {
      editData.fechaInicio = new Date(editData.fechaInicio).toISOString().slice(0, 16);
    }
    if (editData.fechaFin && editData.fechaFin !== null) {
      editData.fechaFin = new Date(editData.fechaFin).toISOString().slice(0, 16);
    }
    
    setFormData(editData);
    setView('create');
  };

  // Campos que deben ser alfanuméricos (permiten letras, números, espacios y algunos separadores)
  const ALFANUM_FIELDS = new Set([
    'denominacionFrente',
    'tipoMaquinaria',       // OJO: en "maquinaria" es <select>, pero validamos solo si type==="text"
    'marca',
    'modelo',
    'areaProduccion',
    'tecnologiaUtilizada',
    'certificaciones',
    'proyeccionTopografia',
    'resolucionUPME',
  ]);

  const validateAlfanumerico = (value) => {
      if (!value || value.trim() === '') return ''; // vacío lo validaremos después con required

      const v = value.trim();

      // 1) Si es solo números => error (lo que tú pediste)
      if (/^\d+$/.test(v)) {
        return 'Este campo debe ser alfanumérico (debe contener al menos una letra).';
      }

      // 2) Debe contener al menos una letra (puede tener números o no)
      if (!/[A-Za-zÁÉÍÓÚáéíóúÑñ]/.test(v)) {
        return 'Este campo debe contener letras (puede incluir números).';
      }

      // 3) Solo permitir letras/números/espacios y separadores comunes
      // (si quieres ser más estricto, quitamos - . /)
      if (!/^[A-Za-z0-9ÁÉÍÓÚáéíóúÑñ\s\-./]+$/.test(v)) {
        return 'Solo se permiten letras y números.';
      }

      return '';
      };

    const COORD_5_DECIMALS = /^-?\d+\.\d{5}$/;

  const validateCoord5 = (value, kind /* 'lat' | 'lng' */) => {
    const v = String(value ?? '').trim();
    if (!v) return 'Este campo es obligatorio.';

    if (!COORD_5_DECIMALS.test(v)) {
      return 'Debe tener exactamente 5 decimales (ej: 4.12345).';
    }

    const n = Number(v);
    if (Number.isNaN(n)) return 'Coordenada inválida.';

    if (kind === 'lat' && (n < -90 || n > 90)) return 'Latitud fuera de rango (-90 a 90).';
    if (kind === 'lng' && (n < -180 || n > 180)) return 'Longitud fuera de rango (-180 a 180).';

    return '';
  };

  const hasErrors = (errs) =>
  Object.values(errs).some(msg => msg && String(msg).trim().length > 0);



  const handleInputChange = (e) => {
    const { name, value, type } = e.target;
    
    // Manejar números decimales
    let processedValue = value;
    if (type === 'number' && value !== '') {
      processedValue = parseFloat(value) || 0;
    }

    // Validación alfanumérica SOLO si el campo está en la lista y el input es de texto
    if (type === 'text' && ALFANUM_FIELDS.has(name)) {
      const err = validateAlfanumerico(value);
      setFieldErrors(prev => ({ ...prev, [name]: err }));
    } else {
      // si cambia otro tipo de input, no tocamos ese error (o lo limpiamos si era de este name)
    
    }

    //  VALIDACIÓN LATITUD (5 decimales)
    if (name === 'latitud') {
      const err = /^-?\d+\.\d{5}$/.test(value)
        ? ''
        : 'Debe tener exactamente 5 decimales (ej: 4.12345)';
      setFieldErrors(prev => ({ ...prev, latitud: err }));
    }

    //  VALIDACIÓN LONGITUD (5 decimales)
    if (name === 'longitud') {
      const err = /^-?\d+\.\d{5}$/.test(value)
        ? ''
        : 'Debe tener exactamente 5 decimales (ej: -74.12345)';
      setFieldErrors(prev => ({ ...prev, longitud: err }));
    }

    
    setFormData(prev => ({
      ...prev,
      [name]: processedValue
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const nextErrors = { ...fieldErrors };

    if ('latitud' in formData) nextErrors.latitud = validateCoord5(formData.latitud, 'lat');
    if ('longitud' in formData) nextErrors.longitud = validateCoord5(formData.longitud, 'lng');

    setFieldErrors(nextErrors);

    if (hasErrors(nextErrors)) {
      setFormErrorBanner('Hay campos con formato incorrecto. Revisa los marcados en rojo.');
      return; 
    }

    setFormErrorBanner('');

    setLoading(true);
    setMessage({ type: '', text: '' });

    try {
      const form = e.target;
      const requiredFields = form.querySelectorAll('[required]');
      let hasErrors = false;

      requiredFields.forEach(field => {
        if (!field.value || field.value === '') {
          hasErrors = true;
          field.classList.add('error');
        } else {
          field.classList.remove('error');
        }
      });

      if (hasErrors) {
        setMessage({ type: 'error', text: '⚠️ Por favor completa todos los campos requeridos' });
        setLoading(false);
        return;
      }

      // Preparar datos para envío
      const submitData = { ...formData };
      
      // Convertir números a formato correcto
      Object.keys(submitData).forEach(key => {
        if (typeof submitData[key] === 'string' && !isNaN(submitData[key]) && submitData[key] !== '') {
          submitData[key] = parseFloat(submitData[key]);
        }
      });

      if (editMode && editingId) {
        // Modo edición
        const serviceMethod = `update${selectedType.charAt(0).toUpperCase() + selectedType.slice(1)}`;
        const response = await friService[serviceMethod](editingId, submitData);
        
        if (response.data.success) {
          setMessage({ type: 'success', text: '✅ Formulario actualizado correctamente' });
          setFormData({});
          setEditMode(false);
          setEditingId(null);
          await loadDashboardData();
          
          setTimeout(() => {
            setView('dashboard');
            setMessage({ type: '', text: '' });
          }, 2000);
        }
      } else {
        // Modo creación
        const serviceMethod = `create${selectedType.charAt(0).toUpperCase() + selectedType.slice(1)}`;
        const response = await friService[serviceMethod](submitData);
        
        if (response.data.success) {
          setMessage({ type: 'success', text: '✅ Formulario creado correctamente' });
          setFormData({});
          form.reset();
          await loadBorradoresCount();
          await loadDashboardData();
          
          setTimeout(() => {
            setView('dashboard');
            setMessage({ type: '', text: '' });
          }, 2000);
        }
      }
    } catch (error) {
      console.error('Error al procesar formulario:', error);
      setMessage({ 
        type: 'error', 
        text: '❌ ' + (error.response?.data?.message || error.message || 'Error al procesar formulario. Verifica los datos ingresados.') 
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCambiarEstado = async (id, nuevoEstado) => {
    const confirmar = window.confirm(
      `¿Estás seguro de cambiar el estado a ${nuevoEstado}?\n\nEste cambio no se puede deshacer.`
    );

    if (!confirmar) return;

    try {
      setLoading(true);
      
      // Usar el método cambiarEstado con el tipo correcto
      const response = await friService.cambiarEstado(selectedType, id, nuevoEstado);

      if (response.data.success) {
        setMessage({ type: 'success', text: '✅ Estado cambiado correctamente' });
        await loadBorradoresCount();
        await loadDashboardData();
        await handleListView(selectedType);
      }
    } catch (error) {
      console.error('Error al cambiar estado:', error);
      setMessage({ 
        type: 'error', 
        text: '❌ ' + (error.response?.data?.message || error.message || 'Error al cambiar estado') 
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteFormulario = async (id) => {
    const confirmar = window.confirm(
      '¿Estás seguro de eliminar este formulario?\n\nEsta acción no se puede deshacer.'
    );

    if (!confirmar) return;

    try {
      setLoading(true);
      const serviceMethod = `delete${selectedType.charAt(0).toUpperCase() + selectedType.slice(1)}`;
      const response = await friService[serviceMethod](id);

      if (response.data.success) {
        setMessage({ type: 'success', text: '✅ Formulario eliminado correctamente' });
        await loadBorradoresCount();
        await loadDashboardData();
        await handleListView(selectedType);
      }
    } catch (error) {
      setMessage({ 
        type: 'error', 
        text: '❌ ' + (error.response?.data?.message || 'Error al eliminar formulario') 
      });
    } finally {
      setLoading(false);
    }
  };

  const handleEnviarBorradores = async () => {
    if (borradoresCount === 0) {
      alert('⚠️ No hay borradores para enviar');
      return;
    }

    const confirmar = window.confirm(
      `¿Estás seguro de que deseas ENVIAR todos los ${borradoresCount} borradores?\n\nEsto cambiará su estado y ya no podrás editarlos.`
    );

    if (!confirmar) return;

    try {
      setLoading(true);
      const response = await friService.enviarBorradores();
      if (response.data.success) {
        alert('✅ ' + response.data.message);
        await loadBorradoresCount();
        await loadDashboardData();
        if (view === 'list') {
          await handleListView(selectedType);
        }
      }
    } catch (error) {
      alert('❌ Error al enviar borradores: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const getFormulariosFiltrados = () => {
    if (filtroEstado === 'TODOS') {
      return formularios;
    }
    return formularios.filter(form => form.estado === filtroEstado);
  };

  const renderFormFields = () => {
    switch (selectedType) {
      case 'produccion':
        return (
          <>
            <div className="grid grid-2">
              <div className="form-group">
                <label className="form-label">Mineral *</label>
                <select 
                  name="mineral" 
                  className="form-select"
                  value={formData.mineral || ''}
                  onChange={handleInputChange}
                  required
                >
                  <option value="">Seleccione...</option>
                  <option value="Plata">Plata</option>
                  <option value="Oro">Oro</option>
                  <option value="Cobre">Cobre</option>
                  <option value="Carbón">Carbón</option>
                  <option value="Esmeraldas">Esmeraldas</option>
                  <option value="Caliza">Caliza</option>
                  <option value="Arcilla">Arcilla</option>
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Fecha de Corte *</label>
                <input 
                  type="date" 
                  name="fechaCorte" 
                  className="form-input"
                  value={formData.fechaCorte || ''}
                  onChange={handleInputChange}
                  required
                />
              </div>
            </div>

            <div className="grid grid-2">
              <div className="form-group">
                <label className="form-label">Horas Operativas *</label>
                <input 
                  type="number" 
                  name="horasOperativas" 
                  className="form-input"
                  value={formData.horasOperativas || ''}
                  onChange={handleInputChange}
                  min="0"
                  step="0.01"
                  placeholder="Ej: 720"
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Unidad de Medida *</label>
                <select 
                  name="unidadMedida" 
                  className="form-select"
                  value={formData.unidadMedida || ''}
                  onChange={handleInputChange}
                  required
                >
                  <option value="">Seleccione...</option>
                  <option value="Toneladas">Toneladas</option>
                  <option value="Kilogramos">Kilogramos</option>
                  <option value="Gramos">Gramos</option>
                  <option value="Onzas">Onzas</option>
                  <option value="Metros cúbicos">Metros cúbicos</option>
                </select>
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Cantidad de Producción *</label>
              <input 
                type="number" 
                name="cantidadProduccion" 
                className="form-input"
                value={formData.cantidadProduccion || ''}
                onChange={handleInputChange}
                min="0"
                step="0.0001"
                placeholder="Cantidad producida"
                required
              />
            </div>

            <div className="grid grid-2">
              <div className="form-group">
                <label className="form-label">Material Entra Planta</label>
                <input 
                  type="number" 
                  name="materialEntraPlanta" 
                  className="form-input"
                  value={formData.materialEntraPlanta || ''}
                  onChange={handleInputChange}
                  min="0"
                  step="0.0001"
                />
              </div>

              <div className="form-group">
                <label className="form-label">Material Sale Planta</label>
                <input 
                  type="number" 
                  name="materialSalePlanta" 
                  className="form-input"
                  value={formData.materialSalePlanta || ''}
                  onChange={handleInputChange}
                  min="0"
                  step="0.0001"
                />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Masa Unitaria</label>
              <input 
                type="number" 
                name="masaUnitaria" 
                className="form-input"
                value={formData.masaUnitaria || ''}
                onChange={handleInputChange}
                min="0"
                step="0.0001"
              />
            </div>

            <div className="form-group">
              <label className="form-label">Observaciones</label>
              <textarea 
                name="observaciones" 
                className="form-textarea"
                value={formData.observaciones || ''}
                onChange={handleInputChange}
                placeholder="Observaciones adicionales..."
                rows="3"
              />
            </div>
          </>
        );

      case 'inventarios':
        return (
          <>
            <div className="grid grid-2">
              <div className="form-group">
                <label className="form-label">Mineral *</label>
                <select 
                  name="mineral" 
                  className="form-select"
                  value={formData.mineral || ''}
                  onChange={handleInputChange}
                  required
                >
                  <option value="">Seleccione...</option>
                  <option value="Plata">Plata</option>
                  <option value="Oro">Oro</option>
                  <option value="Cobre">Cobre</option>
                  <option value="Carbón">Carbón</option>
                  <option value="Esmeraldas">Esmeraldas</option>
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Fecha de Corte *</label>
                <input 
                  type="date" 
                  name="fechaCorte" 
                  className="form-input"
                  value={formData.fechaCorte || ''}
                  onChange={handleInputChange}
                  required
                />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Unidad de Medida *</label>
              <select 
                name="unidadMedida" 
                className="form-select"
                value={formData.unidadMedida || ''}
                onChange={handleInputChange}
                required
              >
                <option value="">Seleccione...</option>
                <option value="Toneladas">Toneladas</option>
                <option value="Kilogramos">Kilogramos</option>
                <option value="Gramos">Gramos</option>
              </select>
            </div>

            <div className="grid grid-2">
              <div className="form-group">
                <label className="form-label">Inventario Inicial Acopio *</label>
                <input 
                  type="number" 
                  name="inventarioInicialAcopio" 
                  className="form-input"
                  value={formData.inventarioInicialAcopio || ''}
                  onChange={handleInputChange}
                  min="0"
                  step="0.0001"
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Ingreso Acopio *</label>
                <input 
                  type="number" 
                  name="ingresoAcopio" 
                  className="form-input"
                  value={formData.ingresoAcopio || ''}
                  onChange={handleInputChange}
                  min="0"
                  step="0.0001"
                  required
                />
              </div>
            </div>

            <div className="grid grid-2">
              <div className="form-group">
                <label className="form-label">Salida Acopio *</label>
                <input 
                  type="number" 
                  name="salidaAcopio" 
                  className="form-input"
                  value={formData.salidaAcopio || ''}
                  onChange={handleInputChange}
                  min="0"
                  step="0.0001"
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Inventario Final Acopio *</label>
                <input 
                  type="number" 
                  name="inventarioFinalAcopio" 
                  className="form-input"
                  value={formData.inventarioFinalAcopio || ''}
                  onChange={handleInputChange}
                  min="0"
                  step="0.0001"
                  required
                />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Observaciones</label>
              <textarea 
                name="observaciones" 
                className="form-textarea"
                value={formData.observaciones || ''}
                onChange={handleInputChange}
                placeholder="Observaciones adicionales..."
                rows="3"
              />
            </div>
          </>
        );

      case 'paradas':
        return (
          <>
            <div className="form-group">
              <label className="form-label">Fecha de Corte *</label>
              <input 
                type="date" 
                name="fechaCorte" 
                className="form-input"
                value={formData.fechaCorte || ''}
                onChange={handleInputChange}
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label">Tipo de Parada *</label>
              <select 
                name="tipoParada" 
                className="form-select"
                value={formData.tipoParada || ''}
                onChange={handleInputChange}
                required
              >
                <option value="">Seleccione...</option>
                <option value="Programada">Programada</option>
                <option value="No programada">No programada</option>
                <option value="Mantenimiento">Mantenimiento</option>
                <option value="Clima">Clima</option>
                <option value="Falta de insumos">Falta de insumos</option>
                <option value="Otros">Otros</option>
              </select>
            </div>

            <div className="grid grid-2">
              <div className="form-group">
                <label className="form-label">Fecha Inicio *</label>
                <input 
                  type="datetime-local" 
                  name="fechaInicio" 
                  className="form-input"
                  value={formData.fechaInicio || ''}
                  onChange={handleInputChange}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Fecha Fin</label>
                <input 
                  type="datetime-local" 
                  name="fechaFin" 
                  className="form-input"
                  value={formData.fechaFin || ''}
                  onChange={handleInputChange}
                />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Horas de Parada *</label>
              <input 
                type="number" 
                name="horasParadas" 
                className="form-input"
                value={formData.horasParadas || ''}
                onChange={handleInputChange}
                min="0"
                step="0.01"
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label">Motivo de la Parada *</label>
              <textarea 
                name="motivo" 
                className="form-textarea"
                value={formData.motivo || ''}
                onChange={handleInputChange}
                placeholder="Describa el motivo de la parada..."
                required
                rows="3"
              />
            </div>

            <div className="form-group">
              <label className="form-label">Observaciones</label>
              <textarea 
                name="observaciones" 
                className="form-textarea"
                value={formData.observaciones || ''}
                onChange={handleInputChange}
                placeholder="Observaciones adicionales..."
                rows="3"
              />
            </div>
          </>
        );

      case 'ejecucion':
        return (
          <>
            <div className="grid grid-2">
              <div className="form-group">
                <label className="form-label">Mineral *</label>
                <select 
                  name="mineral" 
                  className="form-select"
                  value={formData.mineral || ''}
                  onChange={handleInputChange}
                  required
                >
                  <option value="">Seleccione...</option>
                  <option value="Plata">Plata</option>
                  <option value="Oro">Oro</option>
                  <option value="Carbón">Carbón</option>
                  <option value="Caliza">Caliza</option>
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Fecha de Corte *</label>
                <input 
                  type="date" 
                  name="fechaCorte" 
                  className="form-input"
                  value={formData.fechaCorte || ''}
                  onChange={handleInputChange}
                  required
                />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Denominación del Frente *</label>
              <input 
                type="text" 
                name="denominacionFrente" 
                className={`form-input ${fieldErrors.denominacionFrente ? 'error' : ''}`}
                value={formData.denominacionFrente || ''}
                onChange={handleInputChange}
                placeholder="Ej: Frente A, Frente Norte"
                required
              />
              <div className="field-hint">Ejemplo: Frente A / Norte 2</div>
              {fieldErrors.denominacionFrente && (
                <div className="field-error-text">{fieldErrors.denominacionFrente}</div>
              )}
            </div>

            <div className="grid grid-2">
              <div className="form-group">
                <label className="form-label">Latitud *</label>
                <input
                  type="number"
                  name="latitud"
                  value={formData.latitud ?? ''}
                  onChange={handleInputChange}
                  className={`form-input ${fieldErrors.latitud ? 'error' : ''}`}
                  step="0.00001"
                  min="4"
                  max="12"
                  placeholder="Ej: 4.12345"
                  required
                />

                <div className="field-hint">Formato: 4.00000 a 12.00000 (5 decimales)</div>
                {fieldErrors.latitud && <div className="field-error-text">{fieldErrors.latitud}</div>}
              </div>

              <div className="form-group">
                <label className="form-label">Longitud *</label>
                <input
                  type="number"
                  name="longitud"
                  value={formData.longitud ?? ''}
                  onChange={handleInputChange}
                  className={`form-input ${fieldErrors.longitud ? 'error' : ''}`}
                  step="0.00001"
                  min="-79"
                  max="-66"
                  placeholder="Ej: -74.12345"
                  required
                />

                <div className="field-hint">Formato: -66.00000 a -79.00000 (5 decimales)</div>
                {fieldErrors.longitud && <div className="field-error-text">{fieldErrors.longitud}</div>}
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Método de Explotación *</label>
              <select 
                name="metodoExplotacion" 
                className="form-select"
                value={formData.metodoExplotacion || ''}
                onChange={handleInputChange}
                required
              >
                <option value="">Seleccione...</option>
                <option value="Cielo abierto">Cielo abierto</option>
                <option value="Subterráneo">Subterráneo</option>
                <option value="Mixto">Mixto</option>
              </select>
            </div>

            <div className="grid grid-2">
              <div className="form-group">
                <label className="form-label">Avance Ejecutado *</label>
                <input 
                  type="number" 
                  name="avanceEjecutado" 
                  className="form-input"
                  value={formData.avanceEjecutado || ''}
                  onChange={handleInputChange}
                  min="0"
                  step="0.01"
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Unidad Medida Avance *</label>
                <select 
                  name="unidadMedidaAvance" 
                  className="form-select"
                  value={formData.unidadMedidaAvance || ''}
                  onChange={handleInputChange}
                  required
                >
                  <option value="">Seleccione...</option>
                  <option value="Metros">Metros</option>
                  <option value="Metros cuadrados">Metros cuadrados</option>
                  <option value="Metros cúbicos">Metros cúbicos</option>
                </select>
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Volumen Ejecutado *</label>
              <input 
                type="number" 
                name="volumenEjecutado" 
                className="form-input"
                value={formData.volumenEjecutado || ''}
                onChange={handleInputChange}
                min="0"
                step="0.0001"
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label">Observaciones</label>
              <textarea 
                name="observaciones" 
                className="form-textarea"
                value={formData.observaciones || ''}
                onChange={handleInputChange}
                placeholder="Observaciones adicionales..."
                rows="3"
              />
            </div>
          </>
        );

      case 'maquinaria':
        return (
          <>
            <div className="grid grid-2">
              <div className="form-group">
                <label className="form-label">Fecha de Corte *</label>
                <input 
                  type="date" 
                  name="fechaCorte" 
                  className="form-input"
                  value={formData.fechaCorte || ''}
                  onChange={handleInputChange}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Tipo de Maquinaria *</label>
                <select 
                  name="tipoMaquinaria" 
                  className="form-select"
                  value={formData.tipoMaquinaria || ''}
                  onChange={handleInputChange}
                  required
                >
                  <option value="">Seleccione...</option>
                  <option value="Excavadora">Excavadora</option>
                  <option value="Cargador">Cargador</option>
                  <option value="Volqueta">Volqueta</option>
                  <option value="Retroexcavadora">Retroexcavadora</option>
                  <option value="Bulldozer">Bulldozer</option>
                  <option value="Grúa">Grúa</option>
                </select>
              </div>
            </div>

            <div className="grid grid-2">
              <div className="form-group">
                <label className="form-label">Cantidad *</label>
                <input 
                  type="number" 
                  name="cantidad" 
                  className="form-input"
                  value={formData.cantidad || ''}
                  onChange={handleInputChange}
                  min="1"
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Horas de Operación *</label>
                <input 
                  type="number" 
                  name="horasOperacion" 
                  className="form-input"
                  value={formData.horasOperacion || ''}
                  onChange={handleInputChange}
                  min="0"
                  step="0.01"
                  required
                />
              </div>
            </div>

            <div className="grid grid-2">
              <div className="form-group">
                <label className="form-label">Capacidad de Transporte</label>
                <input 
                  type="number" 
                  name="capacidadTransporte" 
                  className="form-input"
                  value={formData.capacidadTransporte || ''}
                  onChange={handleInputChange}
                  min="0"
                  step="0.01"
                />
              </div>

              <div className="form-group">
                <label className="form-label">Unidad de Capacidad</label>
                <select 
                  name="unidadCapacidad" 
                  className="form-select"
                  value={formData.unidadCapacidad || ''}
                  onChange={handleInputChange}
                >
                  <option value="">Seleccione...</option>
                  <option value="Toneladas">Toneladas</option>
                  <option value="Metros cúbicos">Metros cúbicos</option>
                  <option value="Kilogramos">Kilogramos</option>
                </select>
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Observaciones</label>
              <textarea 
                name="observaciones" 
                className="form-textarea"
                value={formData.observaciones || ''}
                onChange={handleInputChange}
                placeholder="Observaciones adicionales..."
                rows="3"
              />
            </div>
          </>
        );

      case 'regalias':
        return (
          <>
            <div className="grid grid-2">
              <div className="form-group">
                <label className="form-label">Mineral *</label>
                <select 
                  name="mineral" 
                  className="form-select"
                  value={formData.mineral || ''}
                  onChange={handleInputChange}
                  required
                >
                  <option value="">Seleccione...</option>
                  <option value="Oro">Oro</option>
                  <option value="Plata">Plata</option>
                  <option value="Carbón">Carbón</option>
                  <option value="Esmeraldas">Esmeraldas</option>
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Fecha de Corte *</label>
                <input 
                  type="date" 
                  name="fechaCorte" 
                  className="form-input"
                  value={formData.fechaCorte || ''}
                  onChange={handleInputChange}
                  required
                />
              </div>
            </div>

            <div className="grid grid-2">
              <div className="form-group">
                <label className="form-label">Cantidad Extraída *</label>
                <input 
                  type="number" 
                  name="cantidadExtraida" 
                  className="form-input"
                  value={formData.cantidadExtraida || ''}
                  onChange={handleInputChange}
                  min="0"
                  step="0.0001"
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Unidad de Medida *</label>
                <select 
                  name="unidadMedida" 
                  className="form-select"
                  value={formData.unidadMedida || ''}
                  onChange={handleInputChange}
                  required
                >
                  <option value="">Seleccione...</option>
                  <option value="Toneladas">Toneladas</option>
                  <option value="Kilogramos">Kilogramos</option>
                  <option value="Gramos">Gramos</option>
                  <option value="Onzas">Onzas</option>
                </select>
              </div>
            </div>

            <div className="grid grid-2">
              <div className="form-group">
                <label className="form-label">Valor Declaración *</label>
                <input 
                  type="number" 
                  name="valorDeclaracion" 
                  className="form-input"
                  value={formData.valorDeclaracion || ''}
                  onChange={handleInputChange}
                  min="0"
                  step="0.01"
                  placeholder="Valor en COP"
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Valor Contraprestaciones</label>
                <input 
                  type="number" 
                  name="valorContraprestaciones" 
                  className="form-input"
                  value={formData.valorContraprestaciones || ''}
                  onChange={handleInputChange}
                  min="0"
                  step="0.01"
                  placeholder="Valor en COP"
                />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Resolución UPME</label>
              <input 
                type="text" 
                name="resolucionUPME" 
                className={`form-input ${fieldErrors.resolucionUPME ? 'error' : ''}`}
                value={formData.resolucionUPME || ''}
                onChange={handleInputChange}
                placeholder="Número de resolución"
              />
              <div className="field-hint">Ejemplo: Resolución 599 </div>
              {fieldErrors.resolucionUPME && <div className="field-error-text">{fieldErrors.resolucionUPME}</div>}
            </div>

            <div className="form-group">
              <label className="form-label">Observaciones</label>
              <textarea 
                name="observaciones" 
                className="form-textarea"
                value={formData.observaciones || ''}
                onChange={handleInputChange}
                placeholder="Observaciones adicionales..."
                rows="3"
              />
            </div>
          </>
        );

      case 'inventarioMaquinaria':
        return (
          <>
            <div className="grid grid-2">
              <div className="form-group">
                <label className="form-label">Fecha de Corte *</label>
                <input 
                  type="date" 
                  name="fechaCorte" 
                  className="form-input"
                  value={formData.fechaCorte || ''}
                  onChange={handleInputChange}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Tipo de Maquinaria *</label>
                <input 
                  type="text" 
                  name="tipoMaquinaria" 
                  className={`form-input ${fieldErrors.tipoMaquinaria ? 'error' : ''}`}
                  value={formData.tipoMaquinaria || ''}
                  onChange={handleInputChange}
                  placeholder="Ej: Excavadora, Cargador"
                  required
                />
                <div className="field-hint">Ejemplo: Excavadora, Cargador</div>
                {fieldErrors.tipoMaquinaria && <div className="field-error-text">{fieldErrors.tipoMaquinaria}</div>}
              </div>
            </div>

            <div className="grid grid-2">
              <div className="form-group">
                <label className="form-label">Marca</label>
                <input 
                  type="text" 
                  name="marca" 
                  className={`form-input ${fieldErrors.marca ? 'error' : ''}`}
                  value={formData.marca || ''}
                  onChange={handleInputChange}
                  placeholder="Ej: Caterpillar, Komatsu"
                />
                <div className="field-hint">Ejemplo: Caterpillar / Komatsu</div>
                {fieldErrors.marca && <div className="field-error-text">{fieldErrors.marca}</div>}    
              </div>

              <div className="form-group">
                <label className="form-label">Modelo</label>
                <input 
                  type="text" 
                  name="modelo" 
                  className={`form-input ${fieldErrors.modelo ? 'error' : ''}`}
                  value={formData.modelo || ''}
                  onChange={handleInputChange}
                  placeholder="Ej: 320D, PC200"
                />
                <div className="field-hint">Ejemplo: 320D / PC200</div>
                {fieldErrors.modelo && <div className="field-error-text">{fieldErrors.modelo}</div>}
              </div>
            </div>

            <div className="grid grid-2">
              <div className="form-group">
                <label className="form-label">Año de Fabricación</label>
                <input 
                  type="number" 
                  name="anoFabricacion" 
                  className="form-input"
                  value={formData.anoFabricacion || ''}
                  onChange={handleInputChange}
                  min="1900"
                  max="2100"
                  placeholder="Ej: 2020"
                />
              </div>

              <div className="form-group">
                <label className="form-label">Capacidad</label>
                <input 
                  type="number" 
                  name="capacidad" 
                  className="form-input"
                  value={formData.capacidad || ''}
                  onChange={handleInputChange}
                  min="0"
                  step="0.01"
                  placeholder="Capacidad en toneladas o m³"
                />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Estado Operativo *</label>
              <select 
                name="estadoOperativo" 
                className="form-select"
                value={formData.estadoOperativo || ''}
                onChange={handleInputChange}
                required
              >
                <option value="">Seleccione...</option>
                <option value="Operativo">Operativo</option>
                <option value="En mantenimiento">En mantenimiento</option>
                <option value="Fuera de servicio">Fuera de servicio</option>
                <option value="En reparación">En reparación</option>
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">Observaciones</label>
              <textarea 
                name="observaciones" 
                className="form-textarea"
                value={formData.observaciones || ''}
                onChange={handleInputChange}
                placeholder="Observaciones sobre el estado de la maquinaria..."
                rows="3"
              />
            </div>
          </>
        );

      case 'capacidad':
        return (
          <>
            <div className="grid grid-2">
              <div className="form-group">
                <label className="form-label">Fecha de Corte *</label>
                <input 
                  type="date" 
                  name="fechaCorte" 
                  className="form-input"
                  value={formData.fechaCorte || ''}
                  onChange={handleInputChange}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Área de Producción *</label>
                <input 
                  type="text" 
                  name="areaProduccion" 
                  className={`form-input ${fieldErrors.areaProduccion ? 'error' : ''}`}
                  value={formData.areaProduccion || ''}
                  onChange={handleInputChange}
                  placeholder="Ej: Zona Norte, Sector A"
                  required
                />
                <div className="field-hint">Ejemplo: Zona Norte, Sector A</div>
                {fieldErrors.areaProduccion && <div className="field-error-text">{fieldErrors.areaProduccion}</div>}
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Tecnología Utilizada *</label>
              <input 
                type="text" 
                name="tecnologiaUtilizada" 
                className={`form-input ${fieldErrors.tecnologiaUtilizada ? 'error' : ''}`}
                value={formData.tecnologiaUtilizada || ''}
                onChange={handleInputChange}
                placeholder="Descripción de la tecnología"
                required
              />
              <div className="field-hint">Descripción de la tecnología</div>
              {fieldErrors.tecnologiaUtilizada && <div className="field-error-text">{fieldErrors.tecnologiaUtilizada}</div>}
            </div>

            <div className="grid grid-2">
              <div className="form-group">
                <label className="form-label">Capacidad Instalada *</label>
                <input 
                  type="number" 
                  name="capacidadInstalada" 
                  className="form-input"
                  value={formData.capacidadInstalada || ''}
                  onChange={handleInputChange}
                  min="0"
                  step="0.0001"
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Unidad de Medida *</label>
                <select 
                  name="unidadMedida" 
                  className="form-select"
                  value={formData.unidadMedida || ''}
                  onChange={handleInputChange}
                  required
                >
                  <option value="">Seleccione...</option>
                  <option value="Toneladas/día">Toneladas/día</option>
                  <option value="Toneladas/mes">Toneladas/mes</option>
                  <option value="Metros cúbicos/día">Metros cúbicos/día</option>
                  <option value="Metros cúbicos/mes">Metros cúbicos/mes</option>
                </select>
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Personal Capacitado *</label>
              <input 
                type="number" 
                name="personalCapacitado" 
                className="form-input"
                value={formData.personalCapacitado || ''}
                onChange={handleInputChange}
                min="0"
                placeholder="Número de personas"
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label">Certificaciones</label>
              <input 
                type="text" 
                name="certificaciones" 
                className={`form-input ${fieldErrors.certificaciones ? 'error' : ''}`}
                value={formData.certificaciones || ''}
                onChange={handleInputChange}
                placeholder="ISO, RETIE, etc."
              />
              <div className="field-hint">Ejemplo: ISO, RETIE, etc.</div>
              {fieldErrors.certificaciones && <div className="field-error-text">{fieldErrors.certificaciones}</div>}
            </div>

            <div className="form-group">
              <label className="form-label">Observaciones</label>
              <textarea 
                name="observaciones" 
                className="form-textarea"
                value={formData.observaciones || ''}
                onChange={handleInputChange}
                placeholder="Observaciones adicionales..."
                rows="3"
              />
            </div>
          </>
        );

      case 'proyecciones':
        return (
          <>
            <div className="grid grid-2">
              <div className="form-group">
                <label className="form-label">Fecha de Corte *</label>
                <input 
                  type="date" 
                  name="fechaCorte" 
                  className="form-input"
                  value={formData.fechaCorte || ''}
                  onChange={handleInputChange}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Mineral *</label>
                <select 
                  name="mineral" 
                  className="form-select"
                  value={formData.mineral || ''}
                  onChange={handleInputChange}
                  required
                >
                  <option value="">Seleccione...</option>
                  <option value="Oro">Oro</option>
                  <option value="Plata">Plata</option>
                  <option value="Carbón">Carbón</option>
                  <option value="Cobre">Cobre</option>
                </select>
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Método de Explotación *</label>
              <select 
                name="metodoExplotacion" 
                className="form-select"
                value={formData.metodoExplotacion || ''}
                onChange={handleInputChange}
                required
              >
                <option value="">Seleccione...</option>
                <option value="Cielo abierto">Cielo abierto</option>
                <option value="Subterráneo">Subterráneo</option>
                <option value="Mixto">Mixto</option>
              </select>
            </div>

            <div className="grid grid-3">
              <div className="form-group">
                <label className="form-label">Capacidad Extracción *</label>
                <input 
                  type="number" 
                  name="capacidadExtraccion" 
                  className="form-input"
                  value={formData.capacidadExtraccion || ''}
                  onChange={handleInputChange}
                  min="0"
                  step="0.0001"
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Capacidad Transporte *</label>
                <input 
                  type="number" 
                  name="capacidadTransporte" 
                  className="form-input"
                  value={formData.capacidadTransporte || ''}
                  onChange={handleInputChange}
                  min="0"
                  step="0.0001"
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Capacidad Beneficio *</label>
                <input 
                  type="number" 
                  name="capacidadBeneficio" 
                  className="form-input"
                  value={formData.capacidadBeneficio || ''}
                  onChange={handleInputChange}
                  min="0"
                  step="0.0001"
                  required
                />
              </div>
            </div>

            <div className="grid grid-2">
              <div className="form-group">
                <label className="form-label">Proyección Topográfica</label>
                <input 
                  type="text" 
                  name="proyeccionTopografia" 
                  className={`form-input ${fieldErrors.proyeccionTopografia ? 'error' : ''}`}
                  value={formData.proyeccionTopografia || ''}
                  onChange={handleInputChange}
                  placeholder="Sistema de coordenadas"
                />
                <div className="field-hint">Ejemplo: EPGS 9377</div>
                {fieldErrors.proyeccionTopografiaa && <div className="field-error-text">{fieldErrors.proyeccionTopografia}</div>}
              </div>

              <div className="form-group">
                <label className="form-label">Densidad del Manto</label>
                <input 
                  type="number" 
                  name="densidadManto" 
                  className="form-input"
                  value={formData.densidadManto || ''}
                  onChange={handleInputChange}
                  min="0"
                  step="0.0001"
                  placeholder="Densidad en g/cm³"
                />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Cantidad Proyectada *</label>
              <input 
                type="number" 
                name="cantidadProyectada" 
                className="form-input"
                value={formData.cantidadProyectada || ''}
                onChange={handleInputChange}
                min="0"
                step="0.0001"
                placeholder="Cantidad proyectada a extraer"
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label">Observaciones</label>
              <textarea 
                name="observaciones" 
                className="form-textarea"
                value={formData.observaciones || ''}
                onChange={handleInputChange}
                placeholder="Observaciones adicionales..."
                rows="3"
              />
            </div>
          </>
        );

      default:
        return (
          <div className="alert alert-info">
            <AlertCircle size={20} />
            <span>Formulario en construcción para: {selectedType}</span>
          </div>
        );
    }
  };

  const renderDashboard = () => (
    <div className="dashboard-view">
      <div className="dashboard-header">
        <h2>📊 Resumen de Formularios FRI</h2>
        <p>Vista general de todos los formularios registrados en el sistema</p>
      </div>

      <div className="stats-grid">
        <div className="stat-card" style={{ borderLeftColor: '#93c5fd' }}>
          <div className="stat-icon" style={{ background: '#dbeafe', color: '#1e40af' }}>
            <FileText size={24} />
          </div>
          <div className="stat-content">
            <h3>{dashboardStats.total}</h3>
            <p>Total Formularios</p>
          </div>
        </div>

        <div className="stat-card" style={{ borderLeftColor: '#fcd34d' }}>
          <div className="stat-icon" style={{ background: '#fef3c7', color: '#b45309' }}>
            <Edit size={24} />
          </div>
          <div className="stat-content">
            <h3>{dashboardStats.borradores}</h3>
            <p>Borradores</p>
          </div>
        </div>

        <div className="stat-card" style={{ borderLeftColor: '#67e8f9' }}>
          <div className="stat-icon" style={{ background: '#cffafe', color: '#0e7490' }}>
            <Send size={24} />
          </div>
          <div className="stat-content">
            <h3>{dashboardStats.enviados}</h3>
            <p>Enviados</p>
          </div>
        </div>

        <div className="stat-card" style={{ borderLeftColor: '#86efac' }}>
          <div className="stat-icon" style={{ background: '#d1fae5', color: '#15803d' }}>
            <CheckCircle size={24} />
          </div>
          <div className="stat-content">
            <h3>{dashboardStats.aprobados}</h3>
            <p>Aprobados</p>
          </div>
        </div>
      </div>

      <div className="tipos-section">
        <h3>📝 Formularios por Tipo</h3>
        <div className="tipos-grid">
          {tiposFormularios.map((tipo) => (
            <div key={tipo.id} className="tipo-card" style={{ borderColor: tipo.color }}>
              <div className="tipo-header">
                <div className="tipo-icon" style={{ color: tipo.color }}>
                  {tipo.icon}
                </div>
                <div className="tipo-info">
                  <h4>{tipo.nombre}</h4>
                  <span className="tipo-count">
                    {dashboardStats.porTipo[tipo.id] || 0} registros
                  </span>
                </div>
              </div>
              <div className="tipo-actions">
                <button
                  className="btn btn-sm btn-primary"
                  onClick={() => handleTypeSelect(tipo.id)}
                  title="Crear nuevo formulario"
                >
                  <Plus size={16} />
                  Crear
                </button>
                <button
                  className="btn btn-sm btn-outline"
                  onClick={() => handleListView(tipo.id)}
                  title="Ver todos los formularios"
                >
                  <List size={16} />
                  Ver
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  return (
    <div className="formularios-container">
     {/* Header */}
      <header className="formularios-header">
        <div className="container">
          <div className="header-content">
            <div className="header-left">
              <div className="logo">
                <img
                  src={`${import.meta.env.BASE_URL}logo.png`}
                  alt="Logo TU MINA"
                  width="50"
                  height="50"
                  style={{ borderRadius: '8px', objectFit: 'contain' }}
                />
              </div>
              <div>
                <h1>TU MINA</h1>
                <p>Desarrollado por CTGlobal</p>
              </div>
            </div>
            
            <div className="header-right">
              <div className="user-info">
                <div className="user-avatar">
                  <User size={20} />
                </div>
                <div className="user-details">
                  <p className="user-name">{usuario?.nombre || 'Carlos Fajardo'}</p>
                  <p className="user-role">{usuario?.rol || 'ADMIN'}</p>
                </div>
              </div>
              
              <button onClick={handleLogout} className="btn-logout">
                <LogOut size={18} />
                Salir
              </button>
            </div>
          </div>

          {/* Breadcrumb */}
          <div className="breadcrumb">
            <button onClick={() => navigate('/home')} className="breadcrumb-link">
              <ArrowLeft size={16} />
              Volver al Home
            </button>
            <span className="breadcrumb-separator">/</span>
            <span className="breadcrumb-current">Formularios</span>
          </div>
        </div>
      </header>

      <main className="page-main">
        <div className="container">
          {message.text && (
            <div className={`alert alert-${message.type}`}>
              {message.type === 'success' ? <CheckCircle size={20} /> : <AlertCircle size={20} />}
              <span>{message.text}</span>
            </div>
          )}

          {view === 'dashboard' && renderDashboard()}

          {view === 'select' && (
            <div className="select-section">
              <h2>Selecciona el tipo de formulario</h2>
              <div className="formularios-grid">
                {tiposFormularios.map((tipo) => (
                  <div key={tipo.id} className="formulario-card">
                    <div className="card-icon" style={{color: tipo.color}}>{tipo.icon}</div>
                    <h3>{tipo.nombre}</h3>
                    <div className="card-actions">
                      <button
                        className="btn btn-primary"
                        onClick={() => handleTypeSelect(tipo.id)}
                      >
                        <Plus size={18} />
                        Crear
                      </button>
                      <button
                        className="btn btn-outline"
                        onClick={() => handleListView(tipo.id)}
                      >
                        <List size={18} />
                        Ver
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {view === 'create' && (
            <div className="form-section">
              <div className="form-header">
                <h2>
                  {editMode ? '✏️ Editar' : '➕ Crear'} {tiposFormularios.find(t => t.id === selectedType)?.nombre}
                </h2>
                <button
                  className="btn btn-outline"
                  onClick={() => {
                    setView('dashboard');
                    setEditMode(false);
                    setEditingId(null);
                    setFormData({});
                  }}
                >
                  <X size={18} />
                  Cancelar
                </button>
              </div>

              <form onSubmit={handleSubmit} className="formulario-form">
                {renderFormFields()}

                {formErrorBanner && (
                  <div className="form-error-banner">
                    {formErrorBanner}
                  </div>
                )}

                <div className="form-actions">
                  <button
                    type="button"
                    className="btn btn-outline"
                    onClick={() => {
                      setView('dashboard');
                      setEditMode(false);
                      setEditingId(null);
                      setFormData({});
                    }}
                  >
                    <X size={18} />
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="btn btn-primary"
                    disabled={loading}
                  >
                    <Save size={18} />
                    {loading ? 'Guardando...' : (editMode ? 'Actualizar' : 'Guardar')}
                  </button>
                </div>
              </form>
            </div>
          )}

          {view === 'list' && (
            <div className="list-section">
              <div className="list-header">
                <h2>
                  📋 {tiposFormularios.find(t => t.id === selectedType)?.nombre}
                </h2>
                <div className="list-actions">
                  <div className="filter-group">
                    <Filter size={18} />
                    <select
                      className="filter-select"
                      value={filtroEstado}
                      onChange={(e) => setFiltroEstado(e.target.value)}
                    >
                      <option value="TODOS">Todos</option>
                      <option value="BORRADOR">Borradores</option>
                      <option value="ENVIADO">Enviados</option>
                      <option value="APROBADO">Aprobados</option>
                      <option value="RECHAZADO">Rechazados</option>
                    </select>
                  </div>
                  <button
                    className="btn btn-primary"
                    onClick={() => {
                      setView('create');
                      setEditMode(false);
                      setFormData({});
                    }}
                  >
                    <Plus size={18} />
                    Nuevo
                  </button>
                  <button
                    className="btn btn-outline"
                    onClick={() => setView('dashboard')}
                  >
                    <ArrowLeft size={18} />
                    Volver
                  </button>
                </div>
              </div>

              <div className="table-container">
                {loading ? (
                  <div className="loading-container">
                    <div className="loading"></div>
                    <p>Cargando...</p>
                  </div>
                ) : getFormulariosFiltrados().length === 0 ? (
                  <div className="empty-state">
                    <FileText size={48} />
                    <h3>No hay formularios registrados</h3>
                    <p>Crea tu primer formulario para comenzar</p>
                    <button
                      className="btn btn-primary"
                      onClick={() => {
                        setView('create');
                        setEditMode(false);
                        setFormData({});
                      }}
                    >
                      <Plus size={18} />
                      Crear Formulario
                    </button>
                  </div>
                ) : (
                  <div className="table-responsive">
                    <table className="table">
                      <thead>
                        <tr>
                          <th>ID</th>
                          <th>Fecha</th>
                          <th>Estado</th>
                          <th>Detalles</th>
                          <th>Acciones</th>
                        </tr>
                      </thead>
                      <tbody>
                        {getFormulariosFiltrados().map((form) => (
                          <tr key={form.id}>
                            <td>{form.id.substring(0, 8)}...</td>
                            <td>
                              {new Date(form.fechaCorte || form.createdAt).toLocaleDateString('es-CO')}
                            </td>
                            <td>
                              <span className={`badge badge-${form.estado.toLowerCase()}`}>
                                {form.estado}
                              </span>
                            </td>
                            <td>
                              {form.mineral || form.tipoParada || form.tipoMaquinaria || form.estadoOperativo || form.areaProduccion || 'Ver detalles'}
                            </td>
                            <td>
                              <div className="action-buttons">
                                <button
                                  className="btn-icon btn-info"
                                  title="Ver detalles"
                                  onClick={() => setModalFormulario(form)}
                                >
                                  <Eye size={16} />
                                </button>
                                {form.estado === 'BORRADOR' && (
                                  <>
                                    <button
                                      className="btn-icon btn-primary"
                                      title="Editar"
                                      onClick={() => handleEdit(form)}
                                    >
                                      <Edit size={16} />
                                    </button>
                                    <button
                                      className="btn-icon btn-success"
                                      title="Enviar"
                                      onClick={() => handleCambiarEstado(form.id, 'ENVIADO')}
                                    >
                                      <Send size={16} />
                                    </button>
                                  </>
                                )}
                                <button
                                  className="btn-icon btn-danger"
                                  title="Eliminar"
                                  onClick={() => handleDeleteFormulario(form.id)}
                                >
                                  <Trash2 size={16} />
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </main>

      {modalFormulario && (
        <div className="modal-overlay" onClick={() => setModalFormulario(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>
                <FileText size={24} />
                Detalles del Formulario
              </h3>
              <button
                className="btn-close"
                onClick={() => setModalFormulario(null)}
              >
                <X size={24} />
              </button>
            </div>
            <div className="modal-body">
              <div className="detail-grid">
                {Object.entries(modalFormulario).map(([key, value]) => {
                  if (key === 'id' || key === 'usuarioId' || key === 'tituloMineroId' || key === 'usuario' || key === 'tituloMinero') {
                    return null;
                  }
                  
                  let displayValue = value;
                  if (key.includes('fecha') || key.includes('Fecha') || key === 'createdAt' || key === 'updatedAt') {
                    displayValue = value ? new Date(value).toLocaleString('es-CO') : 'N/A';
                  } else if (typeof value === 'number') {
                    displayValue = value.toLocaleString('es-CO');
                  } else {
                    displayValue = value?.toString() || 'N/A';
                  }
                  
                  return (
                    <div key={key} className="detail-item">
                      <strong>{key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}:</strong>
                      <span>{displayValue}</span>
                    </div>
                  );
                })}
              </div>
            </div>
            <div className="modal-footer">
              {modalFormulario.estado === 'BORRADOR' && (
                <button
                  className="btn btn-primary"
                  onClick={() => {
                    handleEdit(modalFormulario);
                    setModalFormulario(null);
                  }}
                >
                  <Edit size={18} />
                  Editar
                </button>
              )}
              <button
                className="btn btn-secondary"
                onClick={() => setModalFormulario(null)}
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Formularios;