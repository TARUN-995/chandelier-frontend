import { useEffect, useState } from 'react';
import { api, CURRENCY, getKey } from '../api.js';

const STATUSES = ['NEW', 'CONFIRMED', 'COMPLETED', 'CANCELLED'];

export default function Admin() {
  const [authed, setAuthed] = useState(false);
  const [key, setKey] = useState('');
  const [error, setError] = useState('');
  const [tab, setTab] = useState('chandeliers');

  useEffect(() => {
    if (getKey()) {
      api.get('/admin/check').then(() => setAuthed(true)).catch(() => sessionStorage.removeItem('adminKey'));
    }
  }, []);

  function login(e) {
    e.preventDefault();
    sessionStorage.setItem('adminKey', key);
    api.get('/admin/check')
      .then(() => { setAuthed(true); setError(''); })
      .catch(() => { sessionStorage.removeItem('adminKey'); setError('That admin key is not correct.'); });
  }

  function logout() {
    sessionStorage.removeItem('adminKey');
    setAuthed(false);
    setKey('');
  }

  if (!authed) {
    return (
      <main className="admin narrow">
        <h1>Admin sign in</h1>
        <form onSubmit={login} className="stack">
          <label>Admin key<input type="password" value={key} onChange={(e) => setKey(e.target.value)} required /></label>
          {error && <p className="notice error" role="alert">{error}</p>}
          <button className="btn">Sign in</button>
        </form>
      </main>
    );
  }

  return (
    <main className="admin">
      <div className="admin-bar">
        <h1>Admin</h1>
        <button className="btn ghost" onClick={logout}>Sign out</button>
      </div>
      <div className="tabs" role="tablist">
        {[['chandeliers', 'Chandeliers'], ['quotes', 'Quote requests'], ['pricing', 'Pricing']].map(([id, label]) => (
          <button key={id} role="tab" aria-selected={tab === id} className={tab === id ? 'tab active' : 'tab'} onClick={() => setTab(id)}>{label}</button>
        ))}
      </div>
      {tab === 'chandeliers' && <ChandelierAdmin />}
      {tab === 'quotes' && <QuoteAdmin />}
      {tab === 'pricing' && <PricingAdmin />}
    </main>
  );
}

const blankChandelier = { name: '', description: '', size: 'BIG', imageUrl: '', totalQuantity: 0 };

function ChandelierAdmin() {
  const [list, setList] = useState([]);
  const [edit, setEdit] = useState(null);
  const [error, setError] = useState('');

  const load = () => api.get('/chandeliers').then(setList).catch((e) => setError(e.message));
  useEffect(() => { load(); }, []);

  async function save(e) {
    e.preventDefault();
    try {
      const body = { ...edit, totalQuantity: Number(edit.totalQuantity) };
      if (edit.id) await api.put(`/chandeliers/${edit.id}`, body);
      else await api.post('/chandeliers', body);
      setEdit(null);
      setError('');
      load();
    } catch (err) {
      setError(err.message);
    }
  }

  async function remove(c) {
    if (!window.confirm(`Delete ${c.name}?`)) return;
    try {
      await api.del(`/chandeliers/${c.id}`);
      setError('');
      load();
    } catch (err) {
      setError(err.message);
    }
  }

  const set = (name) => (e) => setEdit((x) => ({ ...x, [name]: e.target.value }));

  return (
    <section>
      {error && <p className="notice error" role="alert">{error}</p>}
      {edit ? (
        <form onSubmit={save} className="stack panel">
          <h2>{edit.id ? 'Edit chandelier' : 'Add chandelier'}</h2>
          <label>Name<input required value={edit.name} onChange={set('name')} /></label>
          <label>Size
            <select value={edit.size} onChange={set('size')}>
              <option value="BIG">Big</option>
              <option value="SMALL">Small</option>
            </select>
          </label>
          <label>Pieces owned<input type="number" min="0" required value={edit.totalQuantity} onChange={set('totalQuantity')} /></label>
          <label>Photo link (URL)<input value={edit.imageUrl || ''} onChange={set('imageUrl')} /></label>
          <label>Description<textarea rows="3" value={edit.description || ''} onChange={set('description')} /></label>
          <div className="row">
            <button className="btn">Save chandelier</button>
            <button type="button" className="btn ghost" onClick={() => setEdit(null)}>Cancel</button>
          </div>
        </form>
      ) : (
        <>
          <button className="btn" onClick={() => setEdit({ ...blankChandelier })}>Add chandelier</button>
          <table>
            <thead><tr><th>Name</th><th>Size</th><th>Pieces</th><th></th></tr></thead>
            <tbody>
              {list.map((c) => (
                <tr key={c.id}>
                  <td>{c.name}</td>
                  <td>{c.size === 'BIG' ? 'Big' : 'Small'}</td>
                  <td>{c.totalQuantity}</td>
                  <td className="row">
                    <button className="btn ghost" onClick={() => setEdit(c)}>Edit</button>
                    <button className="btn ghost danger" onClick={() => remove(c)}>Delete</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      )}
    </section>
  );
}

function QuoteAdmin() {
  const [quotes, setQuotes] = useState([]);
  const [pricing, setPricing] = useState(null);
  const [error, setError] = useState('');

  const load = () => api.get('/quotes').then(setQuotes).catch((e) => setError(e.message));
  useEffect(() => {
    load();
    api.get('/pricing').then(setPricing).catch(() => {});
  }, []);

  async function setStatus(q, status) {
    try {
      await api.put(`/quotes/${q.id}/status`, { status });
      setError('');
      load();
    } catch (err) {
      setError(err.message);
    }
  }

  async function remove(q) {
    if (!window.confirm(`Delete the request from ${q.customerName}?`)) return;
    try {
      await api.del(`/quotes/${q.id}`);
      load();
    } catch (err) {
      setError(err.message);
    }
  }

  const estimate = (q) => {
    if (!pricing) return 0;
    const perHour = q.items.reduce((s, i) => s + i.quantity * Number(i.chandelier.size === 'BIG' ? pricing.bigPricePerHour : pricing.smallPricePerHour), 0);
    return perHour * q.hours;
  };

  return (
    <section className="stack">
      {error && <p className="notice error" role="alert">{error}</p>}
      {quotes.length === 0 && <p className="muted">No quote requests yet.</p>}
      {quotes.map((q) => (
        <article className="panel" key={q.id}>
          <div className="admin-bar">
            <h3>{q.customerName} - {q.phone}</h3>
            <select value={q.status} onChange={(e) => setStatus(q, e.target.value)} aria-label="Status">
              {STATUSES.map((s) => <option key={s} value={s}>{s.charAt(0) + s.slice(1).toLowerCase()}</option>)}
            </select>
          </div>
          <p>{q.eventDate} for {q.hours} hours at {q.venueAddress}</p>
          <ul>{q.items.map((i) => <li key={i.id}>{i.quantity} x {i.chandelier.name} ({i.chandelier.size === 'BIG' ? 'big' : 'small'})</li>)}</ul>
          {q.notes && <p className="muted">Notes: {q.notes}</p>}
          <p className="total">Estimate before transport: {CURRENCY}{estimate(q).toLocaleString()}</p>
          <button className="btn ghost danger" onClick={() => remove(q)}>Delete request</button>
        </article>
      ))}
    </section>
  );
}

function PricingAdmin() {
  const [p, setP] = useState(null);
  const [message, setMessage] = useState({ type: '', text: '' });

  useEffect(() => { api.get('/pricing').then(setP).catch((e) => setMessage({ type: 'error', text: e.message })); }, []);

  async function save(e) {
    e.preventDefault();
    try {
      await api.put('/pricing', { bigPricePerHour: Number(p.bigPricePerHour), smallPricePerHour: Number(p.smallPricePerHour) });
      setMessage({ type: 'ok', text: 'Prices saved.' });
    } catch (err) {
      setMessage({ type: 'error', text: err.message });
    }
  }

  if (!p) return <p className="muted">Loading...</p>;
  return (
    <form onSubmit={save} className="stack panel narrow">
      <h2>Hourly prices</h2>
      <label>Big chandelier, per hour ({CURRENCY})<input type="number" min="0" required value={p.bigPricePerHour} onChange={(e) => setP({ ...p, bigPricePerHour: e.target.value })} /></label>
      <label>Small chandelier, per hour ({CURRENCY})<input type="number" min="0" required value={p.smallPricePerHour} onChange={(e) => setP({ ...p, smallPricePerHour: e.target.value })} /></label>
      {message.text && <p className={`notice ${message.type}`} role="status">{message.text}</p>}
      <button className="btn">Save prices</button>
    </form>
  );
}
