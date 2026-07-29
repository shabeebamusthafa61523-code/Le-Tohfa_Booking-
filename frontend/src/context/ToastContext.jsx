import React, { createContext, useContext, useState } from 'react';
import { CheckCircle2, AlertCircle, Info, X, Zap, Trash2 } from 'lucide-react';

const ToastContext = createContext(null);

export const ToastProvider = ({ children }) => {
  const [toasts, setToasts] = useState([]);
  const [confirmDialog, setConfirmDialog] = useState(null);

  const addToast = (message, type = 'success', duration = 3000) => {
    const id = Date.now() + Math.random();
    setToasts((prev) => [...prev, { id, message, type }]);

    setTimeout(() => {
      removeToast(id);
    }, duration);
  };

  const removeToast = (id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  const toast = {
    success: (msg) => addToast(msg, 'success'),
    error: (msg) => addToast(msg, 'error'),
    info: (msg) => addToast(msg, 'info'),
    temp: (msg) => addToast(msg, 'temp'),
  };

  const showConfirm = (message, onConfirm) => {
    setConfirmDialog({ message, onConfirm });
  };

  const closeConfirm = () => {
    setConfirmDialog(null);
  };

  return (
    <ToastContext.Provider value={{ toast, showConfirm }}>
      {children}

      {/* Floating Toast Stack */}
      <div style={{
        position: 'fixed',
        top: '20px',
        right: '20px',
        zIndex: 99999,
        display: 'flex',
        flexDirection: 'column',
        gap: '0.6rem',
        maxWidth: '380px',
        width: 'calc(100% - 40px)',
        pointerEvents: 'none',
      }}>
        {toasts.map((t) => {
          let bg = '#10b981';
          let border = '#059669';
          let icon = <CheckCircle2 size={18} />;

          if (t.type === 'error') {
            bg = '#ef4444';
            border = '#dc2626';
            icon = <AlertCircle size={18} />;
          } else if (t.type === 'info') {
            bg = '#0284c7';
            border = '#0369a1';
            icon = <Info size={18} />;
          } else if (t.type === 'temp') {
            bg = '#eab308';
            border = '#ca8a04';
            icon = <Zap size={18} />;
          }

          return (
            <div
              key={t.id}
              style={{
                background: bg,
                color: '#ffffff',
                border: `1px solid ${border}`,
                padding: '0.75rem 1rem',
                borderRadius: '8px',
                boxShadow: '0 4px 12px rgba(0,0,0,0.25)',
                display: 'flex',
                alignItems: 'center',
                justify: 'space-between',
                gap: '0.6rem',
                fontSize: '0.9rem',
                fontWeight: '600',
                pointerEvents: 'auto',
                animation: 'slideIn 0.2s ease-out',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                {icon}
                <span>{t.message}</span>
              </div>
              <button
                onClick={() => removeToast(t.id)}
                style={{ background: 'none', border: 'none', color: '#ffffff', cursor: 'pointer', opacity: 0.8 }}
              >
                <X size={16} />
              </button>
            </div>
          );
        })}
      </div>

      {/* DEAD-CENTERED DELETE CONFIRMATION MODAL */}
      {confirmDialog && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          width: '100vw',
          height: '100vh',
          background: 'rgba(0,0,0,0.65)',
          backdropFilter: 'blur(4px)',
          display: 'flex',
          alignItems: 'center',
          justify: 'center',
          zIndex: 100000,
          padding: '1rem',
          boxSizing: 'border-box',
        }}>
          <div className="card" style={{
            width: '100%',
            maxWidth: '420px',
            padding: '1.75rem',
            textAlign: 'center',
            margin: 'auto',
            borderRadius: '12px',
            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.3), 0 10px 10px -5px rgba(0, 0, 0, 0.2)',
            transform: 'scale(1)',
            animation: 'slideIn 0.15s ease-out',
          }}>
            <div style={{
              width: '48px',
              height: '48px',
              borderRadius: '50%',
              background: '#fee2e2',
              color: '#ef4444',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 1rem auto',
            }}>
              <Trash2 size={24} />
            </div>

            <h3 style={{ fontSize: '1.3rem', color: 'var(--text-main)', marginBottom: '0.5rem', fontWeight: '700' }}>
              Confirm Delete Block
            </h3>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.92rem', marginBottom: '1.5rem', lineHeight: '1.4' }}>
              {confirmDialog.message}
            </p>

            <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center' }}>
              <button
                className="btn btn-secondary"
                style={{ flex: 1, padding: '0.65rem', justifyContent: 'center' }}
                onClick={closeConfirm}
              >
                Cancel
              </button>

              <button
                className="btn btn-danger"
                style={{ flex: 1, padding: '0.65rem', justifyContent: 'center', fontWeight: '700' }}
                onClick={() => {
                  confirmDialog.onConfirm();
                  closeConfirm();
                }}
              >
                Yes, Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </ToastContext.Provider>
  );
};

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
};
