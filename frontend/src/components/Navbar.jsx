import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useCart } from "../context/CartContext";

function Navbar() {
  const { user, logout } = useAuth();
  const { cartItems, clearCart } = useCart();
  const cartCount = cartItems.reduce((sum, item) => sum + item.quantity, 0);
  const navigate = useNavigate();

  const handleLogout = () => {
    clearCart();
    logout();
    navigate("/login");
  };

  return (
    <nav>
      <h2>BiteLine</h2>

      <div>
        <Link to="/">Home</Link>

        {!user && (
          <>
            <Link to="/login">Login</Link>
            <Link to="/register">Register</Link>
          </>
        )}

        {user?.role === "customer" && (
          <>
            <Link to="/customer">Customer Dashboard</Link>
            <Link to="/menu">Menu</Link>
            <Link to="/cart">Cart ({cartCount})</Link>
            <Link to="/orders">My Orders</Link>
          </>
        )}

        {user?.role === "staff" && (
          <Link to="/staff">Staff Dashboard</Link>
        )}

        {user?.role === "admin" && (
          <>
            <Link to="/admin">Admin Dashboard</Link>
            <Link to="/admin/menu">Manage Menu</Link>
          </>
        )}

        {user && <button onClick={handleLogout}>Logout</button>}
      </div>
    </nav>
  );
}

export default Navbar;
