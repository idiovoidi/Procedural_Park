export const GALLERY_CSS = `
      .photo-modal {
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0,0,0,0.9);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 1000;
      }
      .modal-content {
        background: var(--hud-bg);
        border-radius: 12px;
        padding: 20px;
        max-width: 90vw;
        max-height: 90vh;
        display: flex;
        flex-direction: column;
      }
      .modal-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 15px;
      }
      .modal-header h3 {
        margin: 0;
        color: var(--hud-text);
      }
      .close-btn, .delete-btn {
        background: #1b2430;
        color: var(--hud-text);
        border: 1px solid #2a384a;
        padding: 8px 12px;
        border-radius: 6px;
        cursor: pointer;
      }
      .close-btn:hover, .delete-btn:hover {
        background: #2a384a;
      }
      .modal-image {
        max-width: 100%;
        max-height: 60vh;
        object-fit: contain;
        border-radius: 8px;
      }
      .modal-footer {
        margin-top: 15px;
        display: flex;
        justify-content: space-between;
        align-items: center;
      }
      .modal-footer p {
        margin: 0;
        color: var(--hud-text);
        font-weight: bold;
      }
    `
