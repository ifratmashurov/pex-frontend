import React, { useState } from 'react';
import api from './api';
import './Auth.css';

const Auth = ({ onLogin }) => {
  const [mode, setMode] = useState('login');
  const [form, setForm] = useState({ username: '', email: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    setForm(f => ({ ...f, [e.target.name]: e.target.value }));
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const data = mode === 'login'
        ? await api.login({ email: form.email, password: form.password })
        : await api.register({ username: form.username, email: form.email, password: form.password });

      if (data.error) {
        setError(data.error);
      } else {
        localStorage.setItem('pex_token', data.token);
        onLogin(data.user, data.token);
      }
    } catch (err) {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-bg">
        {Array.from({ length: 20 }).map((_, i) => (
          <span key={i} className="auth-bg__line" style={{ animationDelay: `${i * 0.3}s` }} />
        ))}
      </div>

      <div className="auth-card">
        <div className="auth-logo">
          <span className="auth-logo__bracket">[</span>
          <span className="auth-logo__text">PEX</span>
          <span className="auth-logo__bracket">]</span>
        </div>
        <p className="auth-tagline">Personal Exchange — trade yourself.</p>

        <div className="auth-tabs">
          <button
            className={`auth-tab ${mode === 'login' ? 'auth-tab--active' : ''}`}
            onClick={() => { setMode('login'); setError(''); }}
          >Login</button>
          <button
            className={`auth-tab ${mode === 'register' ? 'auth-tab--active' : ''}`}
            onClick={() => { setMode('register'); setError(''); }}
          >Register</button>
        </div>

        <form className="auth-form" onSubmit={handleSubmit}>
          {mode === 'register' && (
            <div className="form-field">
              <label>Username</label>
              <input
                name="username"
                type="text"
                placeholder="satoshi"
                value={form.username}
                onChange={handleChange}
                required
                minLength={3}
                maxLength={20}
              />
            </div>
          )}

          <div className="form-field">
            <label>Email</label>
            <input
              name="email"
              type="email"
              placeholder="you@example.com"
              value={form.email}
              onChange={handleChange}
              required
            />
          </div>

          <div className="form-field">
            <label>Password</label>
            <input
              name="password"
              type="password"
              placeholder="••••••••"
              value={form.password}
              onChange={handleChange}
              required
              minLength={6}
            />
          </div>

          {error && <p className="auth-error">{error}</p>}

          <button className="btn-primary" type="submit" disabled={loading}>
            {loading ? 'Loading...' : mode === 'login' ? 'Sign In' : 'Create Account'}
          </button>
        </form>

        {mode === 'login' && (
          <p className="auth-note">New users receive $10,000 wallet balance.</p>
        )}
      </div>
    </div>
  );
};

export default Auth;
