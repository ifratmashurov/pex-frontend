import React, { useState, useEffect, useRef } from 'react';
import api from './api';
import useWebSocket from './useWebSocket';
import './Dashboard.css';

const fmt = (n) => `$${Number(n).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const Dashboard = ({ user, onLogout, onUserUpdate }) => {
  const [stocks, setStocks] = useState([]);       // all stocks from API
  const [prices, setPrices] = useState({});        // live prices from WS: { TICKER: price }
  const [portfolio, setPortfolio] = useState([]);  // user's holdings
  const [myStock, setMyStock] = useState(null);

  const [activeTab, setActiveTab] = useState('market');

  // Forms
  const [createForm, setCreateForm] = useState({ ticker: '', price: '10', description: '' });
  const [priceForm, setPriceForm] = useState('');
  const [tradeForm, setTradeForm] = useState({ ticker: '', shares: '1' });
  const [sellForm, setSellForm] = useState({ ticker: '', shares: '1' });

  const [msg, setMsg] = useState({ text: '', type: '' });
  const [loading, setLoading] = useState(false);

  // Flash map: { TICKER: 'green' | 'red' }
  const [flashes, setFlashes] = useState({});
  const prevPricesRef = useRef({});

  // ─── Load initial data ──────────────────────────────────────────────────────
  const loadAll = async () => {
    const [stocksData, portfolioData] = await Promise.all([
      api.getAllStocks(),
      api.getPortfolio()
    ]);

    if (Array.isArray(stocksData)) {
      setStocks(stocksData);
      const priceMap = {};
      stocksData.forEach(s => { priceMap[s.ticker] = s.price; });
      setPrices(priceMap);
      prevPricesRef.current = priceMap;
    }

    if (Array.isArray(portfolioData)) setPortfolio(portfolioData);

    const myStockData = await api.getMyStock();
    if (!myStockData.error) setMyStock(myStockData);
  };

  
  useEffect(() => { loadAll(); }, []);

  // ─── WebSocket message handler ──────────────────────────────────────────────
  const handleWsMessage = (data) => {
    if (data.type === 'TICKER_UPDATE') {
      const { ticker, price } = data.payload;

      setPrices(prev => {
        const prevPrice = prev[ticker] ?? price;
        const flashColor = price > prevPrice ? 'green' : price < prevPrice ? 'red' : null;
        if (flashColor) {
          setFlashes(f => ({ ...f, [ticker]: flashColor }));
          setTimeout(() => setFlashes(f => { const n = { ...f }; delete n[ticker]; return n; }), 800);
        }
        return { ...prev, [ticker]: price };
      });

      setStocks(prev =>
        prev.map(s => s.ticker === ticker ? { ...s, price } : s)
      );
    }
  };

  useWebSocket(handleWsMessage, true);

  // ─── Net Worth calculation (frontend only, never stored in DB) ──────────────
  const netWorth = React.useMemo(() => {
    const holdingsValue = portfolio.reduce((sum, h) => {
      const currentPrice = prices[h.stock?.ticker] ?? h.stock?.price ?? 0;
      return sum + (h.shares * currentPrice);
    }, 0);
    return user.walletBalance + holdingsValue;
  }, [portfolio, prices, user.walletBalance]);

  // ─── Show message helper ────────────────────────────────────────────────────
  const showMsg = (text, type = 'success') => {
    setMsg({ text, type });
    setTimeout(() => setMsg({ text: '', type: '' }), 3000);
  };

  // ─── Handlers ───────────────────────────────────────────────────────────────
  const handleCreateStock = async (e) => {
    e.preventDefault();
    setLoading(true);
    const data = await api.createStock({
      ticker: createForm.ticker.toUpperCase(),
      price: parseFloat(createForm.price),
      description: createForm.description
    });
    setLoading(false);
    if (data.error) return showMsg(data.error, 'error');
    setMyStock(data);
    showMsg(`$${data.ticker} listed successfully!`);
  };

  const handleUpdatePrice = async (e) => {
    e.preventDefault();
    if (!myStock) return;
    setLoading(true);
    const data = await api.updatePrice(myStock.ticker, parseFloat(priceForm));
    setLoading(false);
    if (data.error) return showMsg(data.error, 'error');
    showMsg(`Price updated to ${fmt(data.price)}`);
  };

  const handleBuy = async (e) => {
    e.preventDefault();
    setLoading(true);
    const data = await api.buy(tradeForm.ticker.toUpperCase(), parseInt(tradeForm.shares));
    setLoading(false);
    if (data.error) return showMsg(data.error, 'error');
    showMsg(data.message);
    onUserUpdate({ ...user, walletBalance: data.walletBalance });
    const portfolioData = await api.getPortfolio();
    if (Array.isArray(portfolioData)) setPortfolio(portfolioData);
  };

  const handleSell = async (e) => {
    e.preventDefault();
    setLoading(true);
    const data = await api.sell(sellForm.ticker.toUpperCase(), parseInt(sellForm.shares));
    setLoading(false);
    if (data.error) return showMsg(data.error, 'error');
    showMsg(data.message);
    onUserUpdate({ ...user, walletBalance: data.walletBalance });
    const portfolioData = await api.getPortfolio();
    if (Array.isArray(portfolioData)) setPortfolio(portfolioData);
  };

  // ─── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="dashboard">
      {/* Header */}
      <header className="dash-header">
        <div className="dash-header__logo">
          <span className="mono" style={{ color: 'var(--accent)', fontWeight: 700 }}>[PEX]</span>
          <span className="dash-header__ws-dot" title="Live feed" />
        </div>

        <div className="dash-header__stats">
          <div className="stat">
            <span className="stat__label">Wallet</span>
            <span className="stat__value mono">{fmt(user.walletBalance)}</span>
          </div>
          <div className="stat">
            <span className="stat__label">Net Worth</span>
            <span className="stat__value mono green">{fmt(netWorth)}</span>
          </div>
          <div className="stat stat--user">
            <span className="stat__label">Logged in as</span>
            <span className="stat__value">{user.username}</span>
          </div>
        </div>

        <button className="btn-logout" onClick={onLogout}>Logout</button>
      </header>

      {/* Message toast */}
      {msg.text && (
        <div className={`toast toast--${msg.type}`}>{msg.text}</div>
      )}

      {/* Tabs */}
      <nav className="dash-tabs">
        {['market', 'trade', 'portfolio', 'mystock'].map(tab => (
          <button
            key={tab}
            className={`dash-tab ${activeTab === tab ? 'dash-tab--active' : ''}`}
            onClick={() => setActiveTab(tab)}
          >
            {{ market: 'Market', trade: 'Trade', portfolio: 'Portfolio', mystock: 'My Stock' }[tab]}
          </button>
        ))}
      </nav>

      <main className="dash-content">
        {/* ── MARKET TAB ── */}
        {activeTab === 'market' && (
          <section className="panel">
            <h2 className="panel__title">Live Market</h2>
            <p className="panel__sub">Prices update in real-time via WebSocket.</p>
            {stocks.length === 0 ? (
              <p className="empty">No stocks listed yet.</p>
            ) : (
              <table className="market-table">
                <thead>
                  <tr>
                    <th>Ticker</th>
                    <th>Owner</th>
                    <th>Price</th>
                    <th>Description</th>
                  </tr>
                </thead>
                <tbody>
                  {stocks.map(s => {
                    const livePrice = prices[s.ticker] ?? s.price;
                    const flash = flashes[s.ticker];
                    return (
                      <tr key={s.ticker} className={flash ? `flash-${flash}` : ''}>
                        <td className="ticker-cell mono">
                          <span className="ticker-tag">${s.ticker}</span>
                        </td>
                        <td className="dim">{s.owner?.username}</td>
                        <td className={`price-cell mono ${flash === 'green' ? 'green' : flash === 'red' ? 'red' : ''}`}>
                          {fmt(livePrice)}
                        </td>
                        <td className="dim small">{s.description || '—'}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </section>
        )}

        {/* ── TRADE TAB ── */}
        {activeTab === 'trade' && (
          <section className="panel panel--split">
            <div className="trade-block">
              <h2 className="panel__title">Buy Shares</h2>
              <form onSubmit={handleBuy} className="trade-form">
                <div className="form-field">
                  <label>Ticker</label>
                  <input
                    placeholder="AAPL"
                    value={tradeForm.ticker}
                    onChange={e => setTradeForm(f => ({ ...f, ticker: e.target.value.toUpperCase() }))}
                    required
                  />
                </div>
                <div className="form-field">
                  <label>Shares</label>
                  <input
                    type="number"
                    min="1"
                    step="1"
                    value={tradeForm.shares}
                    onChange={e => setTradeForm(f => ({ ...f, shares: e.target.value }))}
                    required
                  />
                </div>
                {tradeForm.ticker && prices[tradeForm.ticker.toUpperCase()] && (
                  <p className="trade-estimate">
                    Est. cost: <span className="mono green">
                      {fmt(prices[tradeForm.ticker.toUpperCase()] * (parseInt(tradeForm.shares) || 0))}
                    </span>
                  </p>
                )}
                <button className="btn-buy" type="submit" disabled={loading}>Buy</button>
              </form>
            </div>

            <div className="trade-block">
              <h2 className="panel__title">Sell Shares</h2>
              <form onSubmit={handleSell} className="trade-form">
                <div className="form-field">
                  <label>Ticker</label>
                  <input
                    placeholder="AAPL"
                    value={sellForm.ticker}
                    onChange={e => setSellForm(f => ({ ...f, ticker: e.target.value.toUpperCase() }))}
                    required
                  />
                </div>
                <div className="form-field">
                  <label>Shares</label>
                  <input
                    type="number"
                    min="1"
                    step="1"
                    value={sellForm.shares}
                    onChange={e => setSellForm(f => ({ ...f, shares: e.target.value }))}
                    required
                  />
                </div>
                {sellForm.ticker && prices[sellForm.ticker.toUpperCase()] && (
                  <p className="trade-estimate">
                    Est. value: <span className="mono green">
                      {fmt(prices[sellForm.ticker.toUpperCase()] * (parseInt(sellForm.shares) || 0))}
                    </span>
                  </p>
                )}
                <button className="btn-sell" type="submit" disabled={loading}>Sell</button>
              </form>
            </div>
          </section>
        )}

        {/* ── PORTFOLIO TAB ── */}
        {activeTab === 'portfolio' && (
          <section className="panel">
            <h2 className="panel__title">Your Portfolio</h2>
            <div className="portfolio-summary">
              <div className="summary-card">
                <span className="summary-card__label">Wallet Balance</span>
                <span className="summary-card__value mono">{fmt(user.walletBalance)}</span>
              </div>
              <div className="summary-card">
                <span className="summary-card__label">Holdings Value</span>
                <span className="summary-card__value mono green">
                  {fmt(netWorth - user.walletBalance)}
                </span>
              </div>
              <div className="summary-card summary-card--accent">
                <span className="summary-card__label">Total Net Worth</span>
                <span className="summary-card__value mono">{fmt(netWorth)}</span>
              </div>
            </div>

            {portfolio.filter(h => h.shares > 0).length === 0 ? (
              <p className="empty">No holdings yet. Go to Trade to buy some stocks!</p>
            ) : (
              <table className="market-table">
                <thead>
                  <tr>
                    <th>Ticker</th>
                    <th>Shares</th>
                    <th>Current Price</th>
                    <th>Total Value</th>
                  </tr>
                </thead>
                <tbody>
                  {portfolio.filter(h => h.shares > 0).map(h => {
                    const ticker = h.stock?.ticker;
                    const price = prices[ticker] ?? h.stock?.price ?? 0;
                    const flash = flashes[ticker];
                    return (
                      <tr key={h._id} className={flash ? `flash-${flash}` : ''}>
                        <td className="mono"><span className="ticker-tag">${ticker}</span></td>
                        <td className="mono">{h.shares}</td>
                        <td className={`mono ${flash === 'green' ? 'green' : flash === 'red' ? 'red' : ''}`}>
                          {fmt(price)}
                        </td>
                        <td className="mono green">{fmt(h.shares * price)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </section>
        )}

        {/* ── MY STOCK TAB ── */}
        {activeTab === 'mystock' && (
          <section className="panel">
            {myStock ? (
              <>
                <h2 className="panel__title">Your Stock: <span className="green mono">${myStock.ticker}</span></h2>
                <p className="panel__sub">Only you can change its price. Changes broadcast to all users instantly.</p>

                <div className="my-stock-info">
                  <div className="my-stock-price">
                    <span className="my-stock-price__label">Current Price</span>
                    <span className="my-stock-price__value mono green">{fmt(prices[myStock.ticker] ?? myStock.price)}</span>
                  </div>
                  {myStock.description && <p className="dim">{myStock.description}</p>}
                </div>

                <form onSubmit={handleUpdatePrice} className="price-form">
                  <div className="form-field">
                    <label>New Price (USD)</label>
                    <input
                      type="number"
                      step="0.01"
                      min="0.01"
                      placeholder="e.g. 42.00"
                      value={priceForm}
                      onChange={e => setPriceForm(e.target.value)}
                      required
                    />
                  </div>
                  <button className="btn-primary" type="submit" disabled={loading}>
                    {loading ? 'Broadcasting...' : 'Update Price'}
                  </button>
                </form>
              </>
            ) : (
              <>
                <h2 className="panel__title">List Your Stock</h2>
                <p className="panel__sub">Every user can list one stock. You set the price, others can trade it.</p>
                <form onSubmit={handleCreateStock} className="create-form">
                  <div className="form-field">
                    <label>Ticker Symbol (2–6 letters)</label>
                    <input
                      placeholder="e.g. ALEX"
                      value={createForm.ticker}
                      onChange={e => setCreateForm(f => ({ ...f, ticker: e.target.value.toUpperCase() }))}
                      required
                      maxLength={6}
                      pattern="[A-Za-z]+"
                    />
                  </div>
                  <div className="form-field">
                    <label>Initial Price (USD)</label>
                    <input
                      type="number"
                      step="0.01"
                      min="0.01"
                      value={createForm.price}
                      onChange={e => setCreateForm(f => ({ ...f, price: e.target.value }))}
                      required
                    />
                  </div>
                  <div className="form-field">
                    <label>Description (optional)</label>
                    <input
                      placeholder="What are you selling?"
                      value={createForm.description}
                      onChange={e => setCreateForm(f => ({ ...f, description: e.target.value }))}
                      maxLength={200}
                    />
                  </div>
                  <button className="btn-primary" type="submit" disabled={loading}>
                    {loading ? 'Creating...' : 'List Stock'}
                  </button>
                </form>
              </>
            )}
          </section>
        )}
      </main>
    </div>
  );
};

export default Dashboard;
