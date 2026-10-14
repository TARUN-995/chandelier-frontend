// Change these two lines to match your business.
export const BRAND = 'MGR Celebrations';
export const CURRENCY = '₹';

const BASE = import.meta.env.VITE_API_URL || 'http://localhost:8080/api';

export const getKey = () => sessionStorage.getItem('adminKey') || '';

async function request(method, path, body) {
  const headers = { 'Content-Type': 'application/json' };
  if (getKey()) headers['X-Admin-Key'] = getKey();
  const res = await fetch(BASE + path, {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  if (!res.ok) {
    let message = '';
    try {
      const data = await res.json();
      message = data.message || '';
    } catch {
      /* no JSON body */
    }
    if (res.status === 401) message = 'Wrong or missing admin key.';
    throw new Error(message || `Request failed (${res.status})`);
  }
  return res.status === 204 ? null : res.json();
}

export const api = {
  get: (path) => request('GET', path),
  post: (path, body) => request('POST', path, body),
  put: (path, body) => request('PUT', path, body),
  del: (path) => request('DELETE', path),
};
