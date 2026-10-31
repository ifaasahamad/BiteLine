import { useRef, useState } from "react";
import { Link, NavLink, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useCart } from "../context/CartContext";
import { navigationLinks } from "./navigation";
import "./Navbar.css";

function Navbar() {
  const { user, logout, loading } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);
  const toggleRef = useRef(null);
  const location = useLocation();
  const [openedAt, setOpenedAt] = useState("");
  const expanded = menuOpen && openedAt === location.key;
  const { cartItems, clearCart } = useCart();
  const cartCount = cartItems.reduce((sum, item) => sum + item.quantity, 0);
  const navigate = useNavigate();

  const handleLogout = () => {
    setMenuOpen(false);
    clearCart();
    logout();
    navigate("/login");
  };

  return (
    <header className="site-header" onKeyDown={(event) => {
      if (event.key === "Escape") { setMenuOpen(false); toggleRef.current?.focus(); }
    }}>
      <a className="skip-link" href="#main-content">Skip to content</a>
      <nav className="site-nav container" aria-label="Main navigation">
        <Link className="brand" to="/" onClick={() => setMenuOpen(false)} aria-label="BiteLine home">
          <span className="brand-mark" aria-hidden="true">b<span>•</span></span>
          <span>BiteLine<span className="brand-caption">GOOD FOOD. LESS WAITING.</span></span>
        </Link>
        <button className="nav-toggle" ref={toggleRef} type="button" aria-expanded={expanded} aria-controls="primary-navigation" onClick={() => {
          setOpenedAt(location.key); setMenuOpen(!expanded);
        }}><span aria-hidden="true">{expanded ? "✕" : "☰"}</span><span>{expanded ? "Close" : "Menu"}</span></button>
        <div id="primary-navigation" className={`nav-links${expanded ? " is-open" : ""}`}>
          {loading ? <span className="nav-session" role="status">Checking session…</span> : navigationLinks(user?.role).map((link) => (
            <NavLink key={link.to} to={link.to} end={link.end} onClick={() => setMenuOpen(false)} className={({ isActive }) => `nav-link${isActive ? " is-active" : ""}${link.to === "/register" ? " nav-register" : ""}`}>
              {link.label}{link.to === "/cart" && <span className="cart-count" aria-label={`${cartCount} items`}>{cartCount}</span>}
            </NavLink>
          ))}
          {user && !loading && <button type="button" className="nav-logout" onClick={handleLogout}>Logout</button>}
        </div>
      </nav>
    </header>
  );
}

export default Navbar;
