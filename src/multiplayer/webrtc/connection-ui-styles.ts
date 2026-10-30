export const CONNECTION_UI_CSS = `
      .mp-modal-overlay {
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0, 0, 0, 0.85);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 2000;
        backdrop-filter: blur(4px);
      }

      .mp-modal {
        background: rgba(27, 36, 48, 0.95);
        border: 1px solid rgba(255, 255, 255, 0.1);
        border-radius: 12px;
        padding: 24px;
        max-width: 500px;
        width: 90%;
        max-height: 80vh;
        overflow-y: auto;
        box-shadow: 0 8px 32px rgba(0, 0, 0, 0.5);
      }

      .mp-modal-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 20px;
      }

      .mp-modal-header h2 {
        margin: 0;
        color: #e8e8e8;
        font-size: 1.5em;
      }

      .mp-close-btn {
        background: transparent;
        border: none;
        color: #e8e8e8;
        font-size: 1.8em;
        cursor: pointer;
        padding: 4px 8px;
        border-radius: 4px;
        line-height: 1;
      }

      .mp-close-btn:hover {
        background: rgba(255, 255, 255, 0.1);
      }

      .mp-modal-content {
        display: flex;
        flex-direction: column;
        gap: 16px;
      }

      .mp-button-group {
        display: flex;
        gap: 12px;
        margin-bottom: 16px;
      }

      .mp-button {
        flex: 1;
        background: #1b2430;
        color: #e8e8e8;
        border: 1px solid #2a384a;
        padding: 12px 16px;
        border-radius: 8px;
        cursor: pointer;
        font-size: 1em;
        font-weight: 500;
        transition: all 0.2s;
      }

      .mp-button:hover {
        background: #2a384a;
        border-color: #6cf;
      }

      .mp-button:disabled {
        opacity: 0.5;
        cursor: not-allowed;
      }

      .mp-button.primary {
        background: #6cf;
        color: #0b0f16;
        border-color: #6cf;
      }

      .mp-button.primary:hover {
        background: #5bc;
      }

      .mp-button.danger {
        background: #dc2626;
        border-color: #dc2626;
        color: white;
      }

      .mp-button.danger:hover {
        background: #b91c1c;
      }

      .mp-input-group {
        display: flex;
        flex-direction: column;
        gap: 8px;
      }

      .mp-input-group label {
        color: #e8e8e8;
        font-size: 0.9em;
        font-weight: 500;
      }

      .mp-input-group textarea {
        background: #0b0f16;
        color: #e8e8e8;
        border: 1px solid #2a384a;
        border-radius: 6px;
        padding: 10px;
        font-family: monospace;
        font-size: 0.85em;
        resize: vertical;
        min-height: 80px;
      }

      .mp-input-group textarea:focus {
        outline: none;
        border-color: #6cf;
      }

      .mp-signal-data {
        background: #0b0f16;
        border: 1px solid #2a384a;
        border-radius: 6px;
        padding: 12px;
        margin-top: 8px;
      }

      .mp-signal-data-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 8px;
      }

      .mp-signal-data-header span {
        color: #6cf;
        font-weight: 500;
        font-size: 0.9em;
      }

      .mp-copy-btn {
        background: #1b2430;
        color: #e8e8e8;
        border: 1px solid #2a384a;
        padding: 4px 12px;
        border-radius: 4px;
        cursor: pointer;
        font-size: 0.85em;
      }

      .mp-copy-btn:hover {
        background: #2a384a;
      }

      .mp-signal-data-content {
        background: #000;
        color: #6cf;
        padding: 8px;
        border-radius: 4px;
        font-family: monospace;
        font-size: 0.75em;
        word-break: break-all;
        max-height: 120px;
        overflow-y: auto;
      }

      .mp-status-indicator {
        position: fixed;
        top: 80px;
        right: 20px;
        background: rgba(0, 0, 0, 0.8);
        color: white;
        padding: 8px 12px;
        border-radius: 16px;
        font-size: 12px;
        font-weight: bold;
        display: flex;
        align-items: center;
        gap: 6px;
        z-index: 1999;
        transition: all 0.3s ease;
        border: 1px solid rgba(255, 255, 255, 0.2);
        backdrop-filter: blur(4px);
        pointer-events: none;
      }

      .mp-status-indicator.disconnected {
        background: rgba(107, 114, 128, 0.8);
        border-color: rgba(107, 114, 128, 0.5);
      }

      .mp-status-indicator.connecting {
        background: rgba(59, 130, 246, 0.8);
        border-color: rgba(59, 130, 246, 0.5);
      }

      .mp-status-indicator.connected {
        background: rgba(34, 197, 94, 0.8);
        border-color: rgba(34, 197, 94, 0.5);
      }

      .mp-status-indicator.error {
        background: rgba(220, 38, 38, 0.8);
        border-color: rgba(220, 38, 38, 0.5);
      }

      .mp-status-icon {
        font-size: 14px;
      }

      .mp-notification {
        position: fixed;
        top: 120px;
        right: 20px;
        background: rgba(102, 204, 255, 0.95);
        color: #0b0f16;
        padding: 12px 16px;
        border-radius: 8px;
        font-size: 14px;
        font-weight: 500;
        display: flex;
        align-items: center;
        gap: 8px;
        z-index: 2001;
        max-width: 300px;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
        animation: slideInRight 0.3s ease-out;
      }

      @keyframes slideInRight {
        from {
          transform: translateX(100%);
          opacity: 0;
        }
        to {
          transform: translateX(0);
          opacity: 1;
        }
      }

      @keyframes slideOutRight {
        from {
          transform: translateX(0);
          opacity: 1;
        }
        to {
          transform: translateX(100%);
          opacity: 0;
        }
      }

      .mp-info-text {
        color: #9ca3af;
        font-size: 0.85em;
        line-height: 1.4;
        margin-top: 8px;
      }

      .mp-divider {
        height: 1px;
        background: rgba(255, 255, 255, 0.1);
        margin: 16px 0;
      }

      .mp-flow-container {
        display: none;
      }

      .mp-flow-container.active {
        display: block;
      }
    `
