export const MARKET_PANEL_CSS = `
  .market-modal {
    background: rgba(20, 20, 30, 0.98);
    border-radius: 16px;
    max-width: 760px;
    width: 92%;
    max-height: 82vh;
    overflow: hidden;
    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.8);
    border: 2px solid rgba(255, 215, 0, 0.3);
    display: flex;
    flex-direction: column;
    color: #e8e8e8;
  }
  .market-header {
    background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
    padding: 16px 22px;
    border-bottom: 2px solid rgba(255, 215, 0, 0.2);
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 16px;
  }
  .market-header h2 { margin: 0; color: #ffd700; font-size: 22px; }
  .market-balance { display: flex; gap: 8px; align-items: center; margin-left: auto; }
  .market-balance-label { color: #9aa; font-size: 13px; }
  .market-balance-amount { color: #ffd700; font-weight: bold; font-size: 18px; }
  .market-body { padding: 14px 22px 20px; overflow-y: auto; }
  .market-section { margin-bottom: 18px; }
  .market-section-head { display: flex; align-items: center; justify-content: space-between; margin-bottom: 8px; }
  .market-section h3 { margin: 0 0 8px; color: #cfd8ff; font-size: 15px; letter-spacing: 0.04em; text-transform: uppercase; }
  .market-section-head h3 { margin: 0; }
  .market-row {
    display: flex; align-items: center; gap: 12px;
    padding: 8px 10px; border-radius: 8px;
    background: rgba(255, 255, 255, 0.04); margin-bottom: 6px;
  }
  .market-icon { font-size: 20px; width: 26px; text-align: center; }
  .market-name { font-weight: 600; min-width: 90px; }
  .market-creature { display: flex; flex-direction: column; flex: 1; min-width: 0; }
  .market-sub { color: #9aa; font-size: 12px; }
  .market-owned { color: #9aa; min-width: 44px; }
  .market-price { color: #ffd700; min-width: 96px; text-align: right; margin-left: auto; }
  .market-demand { width: 70px; height: 8px; background: rgba(255,255,255,0.1); border-radius: 4px; overflow: hidden; display: inline-block; }
  .market-demand-bar { display: block; height: 100%; background: linear-gradient(90deg, #e0603a, #6fd36f); }
  .market-btn {
    background: #2b3a67; color: #fff; border: 1px solid rgba(255,255,255,0.2);
    border-radius: 6px; padding: 5px 10px; cursor: pointer; font-size: 13px;
  }
  .market-btn:hover:not(:disabled) { background: #3a4d87; }
  .market-btn:disabled { opacity: 0.4; cursor: default; }
  .market-btn.danger { background: #8a2f2f; border-color: #ff9a9a; }
  .market-empty { color: #9aa; padding: 10px; font-style: italic; }
  @media (max-width: 520px) {
    .market-row { flex-wrap: wrap; }
    .market-demand { display: none; }
  }
`
