import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { authService } from '../services/api';
import './Login.css';

const Login = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    email: '',
    password: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
    setError('');
  };

  const handleSubmit = async (e) => {
  e.preventDefault();
  setLoading(true);
  setError('');

  try {
    const response = await authService.login(formData);
    
    if (response.data.success) {
      localStorage.setItem('token', response.data.token);
      localStorage.setItem('usuario', JSON.stringify(response.data.usuario));
      navigate('/home');
    } else {
      setError(response.data.message || 'Error al iniciar sesión');
    }
  } catch (err) {
    setError(
      err.response?.data?.message || 
      'Error al iniciar sesión. Verifica tus credenciales.'
    );
  } finally {
    setLoading(false);
  }
};

  return (
    <div className="login-container">
      <div className="login-background">
        <div className="login-shapes">
          <div className="shape shape-1"></div>
          <div className="shape shape-2"></div>
          <div className="shape shape-3"></div>
        </div>
      </div>
      
      <div className="login-content">
        <div className="login-card">
          <div className="login-header">
            <div className="login-logo">
              <img src="/logo.png" alt="Logo TU MINA"l width="100" height="100"
              style={{ borderRadius: '16px', objectFit: 'contain' }} />
            </div>
            <h1>Sistema TU MINA</h1>
            <p>Agencia Nacional de Minería</p>
            <p className="company">CTGlobal</p>
          </div>

          <form onSubmit={handleSubmit} className="login-form">
            {error && (
              <div className="alert alert-error">
                {error}
              </div>
            )}

            <div className="form-group">
              <label htmlFor="email" className="form-label">
                📧 Correo Electrónico
              </label>
              <input
                type="email"
                id="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                className="form-input"
                placeholder="usuario@tumina.com"
                required
                disabled={loading}
              />
            </div>

            <div className="form-group">
              <label htmlFor="password" className="form-label">
                🔒 Contraseña
              </label>
              <input
                type="password"
                id="password"
                name="password"
                value={formData.password}
                onChange={handleChange}
                className="form-input"
                placeholder="••••••••"
                required
                disabled={loading}
              />
            </div>

            <button
              type="submit"
              className="btn btn-primary btn-login"
              disabled={loading}
            >
              {loading ? (
                <>
                  <span className="loading"></span>
                  Iniciando sesión...
                </>
              ) : (
                <>
                  🚀 Iniciar Sesión
                </>
              )}
            </button>
          </form>

          <div className="login-footer">
            <p className="login-info">
              💡 <strong>Nota:</strong>
            </p>
            <p className="login-hint" style={{ marginTop: '0.5rem', fontSize: '0.85rem', color: '#6b7280' }}>
              En cumplimiento de la Resolución 371 de 2024
            </p>
          </div>
        </div>

        <div className="login-info-panel">
          <h2>Bienvenido al Sistema FRI</h2>
          <ul>
            <li>✅ Gestión de formularios de recolección de información</li>
            <li>📊 Dashboard con análisis en tiempo real</li>
            <li>📥 Exportación de reportes en PDF y Excel</li>
            <li>👥 Control de roles y permisos de usuarios</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default Login;
