import { useEffect, useState } from 'react';
import { api, CURRENCY } from '../api.js';

const emptyForm = { customerName: '', phone: '', eventDate: '', hours: 4, venueAddress: '', notes: '' };

export default function Home() {
  const [chandeliers, setChandeliers] = useState([]);
  const [pricing, setPricing] = useState(null);
  const [available, setAvailable] = useState(null); // chandelier id -> free pieces on the chosen date
  const [qty, setQty] = useState({});
  const [form, setForm] = useState(emptyForm);
  const [message, setMessage] = useState({ type: '', text: '' });
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    Promise.all([api.get('/chandeliers'), api.get('/pricing')])
      .then(([c, p]) => {
        setChandeliers(c);
        setPricing(p);
      })
      .catch(() => setMessage({ type: 'error', text: 'Could not load chandeliers. Check that the backend is running on port 8080.' }));
  }, []);

  useEffect(() => {
    if (!form.eventDate) {
      setAvailable(null);
      return;
    }
    api.get(`/chandeliers/availability?date=${form.eventDate}`)
      .then((a) => {
        setAvailable(a);
        // never keep more pieces selected than are free on the new date
        setQty((q) => Object.fromEntries(Object.entries(q).map(([id, n]) => [id, Math.min(n, a[id] ?? 0)])));
      })
      .catch(() => setAvailable(null));
  }, [form.eventDate]);

  const maxFor = (c) => (available ? available[c.id] ?? 0 : c.totalQuantity);
  const setQuantity = (c, value) => {
    const n = Math.max(0, Math.min(maxFor(c), Number(value) || 0));
    setQty((q) => ({ ...q, [c.id]: n }));
  };
  const setField = (name) => (e) => setForm((f) => ({ ...f, [name]: e.target.value }));

  const selected = chandeliers.filter((c) => qty[c.id] > 0);
  const ratePerHour = (c) => Number(c.size === 'BIG' ? pricing?.bigPricePerHour : pricing?.smallPricePerHour) || 0;
  const estimate = selected.reduce((sum, c) => sum + qty[c.id] * ratePerHour(c), 0) * (Number(form.hours) || 0);

  async function submit(e) {
    e.preventDefault();
    if (selected.length === 0) {
      setMessage({ type: 'error', text: 'Choose at least one chandelier first.' });
      return;
    }
    setBusy(true);
    try {
      await api.post('/quotes', {
        ...form,
        hours: Number(form.hours),
        items: selected.map((c) => ({ chandelier: { id: c.id }, quantity: qty[c.id] })),
      });
      setMessage({ type: 'ok', text: 'Request sent. We will call you with your quotation soon.' });
      setQty({});
      setForm(emptyForm);
    } catch (err) {
      setMessage({ type: 'error', text: err.message });
    } finally {
      setBusy(false);
    }
  }

  return (
    <main>
      <section className="hero">
        <div className="pendant" aria-hidden="true" />
        <div>
          <h1>Chandeliers for the room you are about to fill with people you love.</h1>
          <p>
            Pick your chandeliers, tell us the date and venue, and we send a quotation. Our team hangs and wires
            everything at your venue, then takes it all away after the event.
          </p>
          <a className="btn" href="#catalog">Choose chandeliers</a>
        </div>
      </section>

      <div className="layout" id="catalog">
        <section>
          <h2>Our chandeliers</h2>
          <p className="muted">
            {form.eventDate ? 'Showing pieces free on your event date.' : 'Pick an event date in the request form to see what is free that day.'}
          </p>
          {chandeliers.length === 0 && <p className="muted">No chandeliers to show yet.</p>}
          <div className="grid">
            {chandeliers.map((c) => (
              <article className="card" key={c.id}>
                {c.imageUrl ? <img src={c.imageUrl} alt={c.name} /> : <div className="noimg">Photo coming soon</div>}
                <div className="card-body">
                  <h3>{c.name}</h3>
                  <p className="muted">{c.size === 'BIG' ? 'Big' : 'Small'} chandelier{pricing ? ` - ${CURRENCY}${ratePerHour(c)} per hour` : ''}</p>
                  {c.description && <p>{c.description}</p>}
                  <label className="qty">
                    <span>{maxFor(c)} {available ? 'free on this date' : 'in stock'}</span>
                    <input
                      type="number"
                      min="0"
                      max={maxFor(c)}
                      value={qty[c.id] || 0}
                      onChange={(e) => setQuantity(c, e.target.value)}
                      aria-label={`Quantity of ${c.name}`}
                    />
                  </label>
                </div>
              </article>
            ))}
          </div>
        </section>

        <aside className="panel">
          <h2>Request a quotation</h2>
          <form onSubmit={submit}>
            <label>Your name<input required value={form.customerName} onChange={setField('customerName')} /></label>
            <label>Phone number<input required value={form.phone} onChange={setField('phone')} /></label>
            <label>Event date<input required type="date" min={new Date().toISOString().slice(0, 10)} value={form.eventDate} onChange={setField('eventDate')} /></label>
            <label>Hours needed<input required type="number" min="1" value={form.hours} onChange={setField('hours')} /></label>
            <label>Venue address<textarea required rows="2" value={form.venueAddress} onChange={setField('venueAddress')} /></label>
            <label>Anything else we should know<textarea rows="2" value={form.notes} onChange={setField('notes')} /></label>

            <div className="summary">
              {selected.length === 0 ? (
                <p className="muted">No chandeliers chosen yet.</p>
              ) : (
                <>
                  <ul>
                    {selected.map((c) => (
                      <li key={c.id}>{qty[c.id]} x {c.name}</li>
                    ))}
                  </ul>
                  <p className="total">Estimate: {CURRENCY}{estimate.toLocaleString()}</p>
                  <p className="muted">Transportation is added when we confirm your venue.</p>
                </>
              )}
            </div>

            {message.text && <p className={`notice ${message.type}`} role="status">{message.text}</p>}
            <button className="btn" disabled={busy}>{busy ? 'Sending...' : 'Send request'}</button>
          </form>
        </aside>
      </div>
    </main>
  );
}
