import React, { useState, useEffect } from 'react';
import Auth from './Auth';
import Dashboard from './Dashboard';
import api from './api';
import './index.css';

function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Check for existing session on mount
  useEffect(() => {
    const token = localStorage.getItem('pex_token');
    if (!token) {
      setLoading(false);
      return;
    }

    api.me().then(data => {
      if (data.id) {
        setUser(data);
      } else {
        localStorage.removeItem('pex_token');
      }
      setLoading(false);
    }).catch(() => {
      localStorage.removeItem('pex_token');
      setLoading(false);
    });
  }, []);

  const handleLogin = (userData) => {
    setUser(userData);
  };

  const handleLogout = () => {
    localStorage.removeItem('pex_token');
    setUser(null);
  };

  const handleUserUpdate = (updatedUser) => {
    setUser(updatedUser);
  };

  if (loading) {
    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontFamily: 'Space Mono, monospace',
        color: 'var(--accent)',
        fontSize: '13px',
        letterSpacing: '0.1em'
      }}>
        LOADING PEX...
      </div>
    );
  }

  if (!user) {
    return <Auth onLogin={handleLogin} />;
  }

  return (
    <Dashboard
      user={user}
      onLogout={handleLogout}
      onUserUpdate={handleUserUpdate}
    />
  );
}

export default App;
