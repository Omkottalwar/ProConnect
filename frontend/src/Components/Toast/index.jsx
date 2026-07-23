import React from 'react';
import styles from './styles.module.css';

export default function Toast({ toasts = [], onClose }) {
  if (!toasts || toasts.length === 0) return null;

  return (
    <div className={styles.toastContainer}>
      {toasts.map((toast) => {
        let typeClass = styles.toastInfo;
        let icon = 'ℹ️';
        if (toast.type === 'success') {
          typeClass = styles.toastSuccess;
          icon = '✓';
        } else if (toast.type === 'error') {
          typeClass = styles.toastError;
          icon = '⚠️';
        }

        return (
          <div key={toast.id} className={`${styles.toastItem} ${typeClass}`}>
            <span className={styles.toastIcon}>{icon}</span>
            <span className={styles.toastText}>{toast.message}</span>
            <button
              onClick={() => onClose && onClose(toast.id)}
              className={styles.closeBtn}
            >
              ✕
            </button>
          </div>
        );
      })}
    </div>
  );
}
