const BASE = process.env.REACT_APP_API_URL || '';

const getHeaders = () => {
  const token = localStorage.getItem('pex_token');
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {})
  };
};

const api = {
  // Auth
  register: (data) =>
    fetch(`${BASE}/api/auth/register`, { method: 'POST', headers: getHeaders(), body: JSON.stringify(data) }).then(r => r.json()),

  login: (data) =>
    fetch(`${BASE}/api/auth/login`, { method: 'POST', headers: getHeaders(), body: JSON.stringify(data) }).then(r => r.json()),

  me: () =>
    fetch(`${BASE}/api/auth/me`, { headers: getHeaders() }).then(r => r.json()),

  // Stocks
  getAllStocks: () =>
    fetch(`${BASE}/api/stocks`, { headers: getHeaders() }).then(r => r.json()),

  getMyStock: () =>
    fetch(`${BASE}/api/stocks/mine`, { headers: getHeaders() }).then(r => r.json()),

  createStock: (data) =>
    fetch(`${BASE}/api/stocks`, { method: 'POST', headers: getHeaders(), body: JSON.stringify(data) }).then(r => r.json()),

  updatePrice: (ticker, price) =>
    fetch(`${BASE}/api/stocks/${ticker}/price`, {
      method: 'PATCH',
      headers: getHeaders(),
      body: JSON.stringify({ price })
    }).then(r => r.json()),

  // Trades
  getPortfolio: () =>
    fetch(`${BASE}/api/trades/portfolio`, { headers: getHeaders() }).then(r => r.json()),

  buy: (ticker, shares) =>
    fetch(`${BASE}/api/trades/buy`, { method: 'POST', headers: getHeaders(), body: JSON.stringify({ ticker, shares }) }).then(r => r.json()),

  sell: (ticker, shares) =>
    fetch(`${BASE}/api/trades/sell`, { method: 'POST', headers: getHeaders(), body: JSON.stringify({ ticker, shares }) }).then(r => r.json()),
};

export default api;
