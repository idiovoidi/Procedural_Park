export const FOOD_STORE_CSS = `
      .food-store-modal {
        background: rgba(20, 20, 30, 0.98);
        border-radius: 16px;
        padding: 0;
        max-width: 800px;
        width: 90%;
        max-height: 80vh;
        overflow: hidden;
        box-shadow: 0 8px 32px rgba(0, 0, 0, 0.8);
        border: 2px solid rgba(255, 215, 0, 0.3);
        display: flex;
        flex-direction: column;
      }

      .food-store-header {
        background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
        padding: 20px 24px;
        border-bottom: 2px solid rgba(255, 215, 0, 0.2);
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 16px;
      }

      .food-store-header h2 {
        margin: 0;
        color: #ffd700;
        font-size: 24px;
        font-weight: bold;
      }

      .store-balance {
        display: flex;
        flex-direction: column;
        align-items: flex-end;
        gap: 4px;
      }

      .balance-label {
        font-size: 12px;
        color: #888;
        text-transform: uppercase;
      }

      .balance-amount {
        font-size: 20px;
        font-weight: bold;
        color: #ffd700;
        font-family: 'Courier New', monospace;
      }

      .food-store-content {
        padding: 24px;
        overflow-y: auto;
        flex: 1;
      }

      .store-items {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
        gap: 16px;
      }

      .store-item {
        background: rgba(30, 30, 45, 0.8);
        border: 2px solid rgba(255, 255, 255, 0.1);
        border-radius: 12px;
        padding: 16px;
        cursor: pointer;
        transition: all 0.2s ease;
        display: flex;
        flex-direction: column;
        gap: 8px;
      }

      .store-item:hover {
        transform: translateY(-4px);
        border-color: rgba(255, 215, 0, 0.5);
        box-shadow: 0 4px 16px rgba(255, 215, 0, 0.2);
      }

      .store-item.affordable {
        border-color: rgba(34, 197, 94, 0.3);
      }

      .store-item.affordable:hover {
        border-color: rgba(34, 197, 94, 0.6);
      }

      .store-item.expensive {
        opacity: 0.6;
        cursor: not-allowed;
      }

      .store-item.expensive:hover {
        transform: none;
        border-color: rgba(220, 38, 38, 0.5);
      }

      .store-item-icon {
        font-size: 48px;
        text-align: center;
        margin-bottom: 8px;
      }

      .store-item-name {
        font-size: 16px;
        font-weight: bold;
        color: #fff;
        text-align: center;
      }

      .store-item-description {
        font-size: 12px;
        color: #aaa;
        text-align: center;
        min-height: 36px;
      }

      .store-item-price {
        font-size: 18px;
        font-weight: bold;
        color: #ffd700;
        text-align: center;
        margin-top: 8px;
        padding-top: 8px;
        border-top: 1px solid rgba(255, 255, 255, 0.1);
      }

      .store-item-rarity {
        font-size: 10px;
        text-transform: uppercase;
        text-align: center;
        padding: 4px 8px;
        border-radius: 4px;
        font-weight: bold;
      }

      .rarity-common { background: rgba(156, 163, 175, 0.3); color: #9ca3af; }
      .rarity-uncommon { background: rgba(34, 197, 94, 0.3); color: #22c55e; }
      .rarity-rare { background: rgba(59, 130, 246, 0.3); color: #3b82f6; }
      .rarity-epic { background: rgba(168, 85, 247, 0.3); color: #a855f7; }
      .rarity-legendary { background: rgba(251, 191, 36, 0.3); color: #fbbf24; }

      .store-empty {
        text-align: center;
        padding: 40px;
        color: #888;
        font-size: 16px;
      }
    `
