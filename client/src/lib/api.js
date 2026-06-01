const BASE = import.meta.env.VITE_API_URL || '/api';

async function request(path, options = {}) {
  const res = await fetch(`${BASE}${path}`, {
    credentials: 'include',
    headers: { 'Content-Type': 'application/json', ...options.headers },
    ...options,
    body: options.body ? JSON.stringify(options.body) : undefined,
  });

  if (res.status === 401) {
    const refreshed = await fetch(`${BASE}/auth/refresh`, { method: 'POST', credentials: 'include' });
    if (refreshed.ok) {
      const res2 = await fetch(`${BASE}${path}`, {
        credentials: 'include',
        headers: { 'Content-Type': 'application/json', ...options.headers },
        ...options,
        body: options.body ? JSON.stringify(options.body) : undefined,
      });
      if (!res2.ok) {
        let err;
        try { err = await res2.json(); } catch { err = { error: `Erreur serveur (${res2.status})` }; }
        throw err;
      }
      try { return await res2.json(); } catch { return {}; }
    }
    window.location.href = '/login';
    return;
  }

  if (!res.ok) {
    let err;
    try { err = await res.json(); } catch { err = { error: `Erreur serveur (${res.status})` }; }
    throw err;
  }
  try { return await res.json(); } catch { return {}; }
}

export const api = {
  get: (path) => request(path),
  post: (path, body) => request(path, { method: 'POST', body }),
  patch: (path, body) => request(path, { method: 'PATCH', body }),
  del: (path) => request(path, { method: 'DELETE' }),
};
