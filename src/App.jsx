import { Link, Route, Routes } from 'react-router-dom';
import Home from './pages/Home.jsx';
import Admin from './pages/Admin.jsx';
import { BRAND } from './api.js';

export default function App() {
  return (
    <>
      <header className="site-header">
        <Link to="/" className="brand">{BRAND}</Link>
        <nav>
          <a href="/#catalog">Chandeliers</a>
          <Link to="/admin">Admin</Link>
        </nav>
      </header>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/admin" element={<Admin />} />
      </Routes>
      <footer className="site-footer">{BRAND} - chandelier rental, installation and wiring for your event.</footer>
    </>
  );
}
