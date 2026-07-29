"use client";

import { useState, useCallback } from 'react';

export type ToastType = 'success' | 'error' | 'info' | 'warning';

export interface Toast {
  id: string;
  message: string;
  type: ToastType;
  duration?: number;
}

export function useToast() {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const showToast = useCallback((message: string, type: ToastType = 'info', duration = 3000) => {
    const id = 'toast-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9);
    const newToast: Toast = { id, message, type, duration };
    
    setToasts(prev => [...prev, newToast]);
    
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, duration);
    
    return id;
  }, []);

  const removeToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  const success = useCallback((message: string, duration?: number) => 
    showToast(message, 'success', duration), [showToast]);
    
  const error = useCallback((message: string, duration?: number) => 
    showToast(message, 'error', duration), [showToast]);
    
  const info = useCallback((message: string, duration?: number) => 
    showToast(message, 'info', duration), [showToast]);
    
  const warning = useCallback((message: string, duration?: number) => 
    showToast(message, 'warning', duration), [showToast]);

  return {
    toasts,
    success,
    error,
    info,
    warning,
    showToast,
    removeToast,
  };
}

export function ToastContainer({ toasts, onRemove }: { 
  toasts: Toast[]; 
  onRemove: (id: string) => void;
}) {
  if (toasts.length === 0) return null;

  return (
    <div className="toast-container" role="region" aria-live="polite" aria-label="Notifications">
      {toasts.map((toast: Toast) => (
        <div 
          key={toast.id} 
          className={"toast toast-" + toast.type}
          role="alert"
        >
          <div className="toast-content">
            <span className="toast-icon">
              {toast.type === 'success' && '✅'}
              {toast.type === 'error' && '❌'}
              {toast.type === 'info' && 'ℹ️'}
              {toast.type === 'warning' && '⚠️'}
            </span>
            <span className="toast-message">{toast.message}</span>
          </div>
          <button 
            className="toast-close"
            onClick={() => onRemove(toast.id)}
            aria-label="Dismiss"
          >
            ✕
          </button>
        </div>
      ))}
    </div>
  );
}