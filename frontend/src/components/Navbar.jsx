import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
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
          <Link to="/customer">Customer Dashboard</Link>
        )}

        {user?.role === "staff" && (
          <Link to="/staff">Staff Dashboard</Link>
        )}

        {user?.role === "admin" && (
          <Link to="/admin">Admin Dashboard</Link>
        )}

        {user && <button onClick={handleLogout}>Logout</button>}
      </div>
    </nav>
  );
}

export default Navbar;
