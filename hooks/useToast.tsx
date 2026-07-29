'use client';

import { useState, useCallback } from 'react';

export interface Toast {
  id: string;
  message: string;
  type: 'success' | 'error' | 'info' | 'warning';
  duration?: number;
}

export function useToast() {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const addToast = useCallback((message: string, type: Toast['type'] = 'info', duration: number = 3000) => {
    const id = `toast-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    const newToast: Toast = { id, message, type, duration };
    
    setToasts(prev => [...prev, newToast]);

    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, duration);
  }, []);

  const removeToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  return { toasts, addToast, removeToast };
}

// ============ Toast Container Component ============
interface ToastContainerProps {
  toasts: Toast[];
  removeToast: (id: string) => void;
}

export function ToastContainer({ toasts, removeToast }: ToastContainerProps) {
  if (toasts.length === 0) return null;

  const getTypeClass = (type: Toast['type']) => {
    switch (type) {
      case 'error': return 'toast-error';
      case 'success': return 'toast-success';
      case 'warning': return 'toast-warning';
      default: return 'toast-info';
    }
  };

  const getIcon = (type: Toast['type']) => {
    switch (type) {
      case 'error': return '❌';
      case 'success': return '✅';
      case 'warning': return '⚠️';
      default: return 'ℹ️';
    }
  };

  return (
    <div className="toast-container">
      {toasts.map((toast) => (
        <div 
          key={toast.id}
          className={`toast ${getTypeClass(toast.type)}`}
        >
          <span className="toast-icon">{getIcon(toast.type)}</span>
          <span className="toast-message">{toast.message}</span>
          <button 
            className="toast-close"
            onClick={() => removeToast(toast.id)}
            aria-label="ปิดการแจ้งเตือน"
          >
            ✕
          </button>
        </div>
      ))}

      <style jsx>{`
        .toast-container {
          position: fixed;
          bottom: 20px;
          right: 20px;
          z-index: 9999;
          display: flex;
          flex-direction: column;
          gap: 8px;
          max-width: 380px;
          width: 100%;
          pointer-events: none;
        }

        .toast {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 12px 16px;
          background: var(--surface-solid);
          border-radius: var(--radius-sm);
          box-shadow: var(--shadow-strong);
          border: 1px solid var(--border);
          pointer-events: auto;
          animation: slideInRight 0.3s ease;
        }

        .toast-error {
          border-left: 4px solid #efb7b7;
        }

        .toast-success {
          border-left: 4px solid #a9dfcf;
        }

        .toast-warning {
          border-left: 4px solid #f6e4b5;
        }

        .toast-info {
          border-left: 4px solid #8d9fdb;
        }

        .toast-icon {
          font-size: 1.2rem;
          flex-shrink: 0;
        }

        .toast-message {
          flex: 1;
          font-size: 0.9rem;
          color: var(--fg);
        }

        .toast-close {
          background: none;
          border: none;
          font-size: 1rem;
          color: var(--fg-muted);
          cursor: pointer;
          padding: 0 4px;
          transition: color 180ms ease;
        }

        .toast-close:hover {
          color: var(--fg);
        }

        @keyframes slideInRight {
          from {
            opacity: 0;
            transform: translateX(40px);
          }
          to {
            opacity: 1;
            transform: translateX(0);
          }
        }

        @media (max-width: 480px) {
          .toast-container {
            bottom: 12px;
            right: 12px;
            left: 12px;
            max-width: none;
          }
        }
      `}</style>
    </div>
  );
}