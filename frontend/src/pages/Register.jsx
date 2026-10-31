import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import api from "../services/api";
import { useAuth } from "../context/AuthContext";
import AuthLayout from "../components/AuthLayout";

function Register() {
  const navigate = useNavigate();
  const { login } = useAuth();

  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
  });

  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  const handleChange = (event) => {
    setFormData({
      ...formData,
      [event.target.name]: event.target.value,
    });
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    try {
      setLoading(true);
      setMessage("");

      const response = await api.post("/auth/register", formData);

      login(response.data.token, response.data.user);

      navigate("/");
    } catch (error) {
      setMessage(
        error.response?.data?.message || "Registration failed"
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout title="Create Account" description="Good food, less waiting. Join BiteLine to get started." footer={<p>Already have an account? <Link to="/login">Login</Link></p>}>
      <form className="auth-form" onSubmit={handleSubmit} aria-busy={loading}>
        <div>
          <label htmlFor="register-name">Name</label>
          <input
            id="register-name"
            autoComplete="name"
            type="text"
            name="name"
            value={formData.name}
            onChange={handleChange}
            required
          />
        </div>

        <div>
          <label htmlFor="register-email">Email</label>
          <input
            id="register-email"
            autoComplete="email"
            type="email"
            name="email"
            value={formData.email}
            onChange={handleChange}
            required
          />
        </div>

        <div>
          <label htmlFor="register-password">Password</label>
          <input
            id="register-password"
            autoComplete="new-password"
            aria-describedby="password-hint"
            type="password"
            name="password"
            value={formData.password}
            onChange={handleChange}
            minLength="6"
            required
          />
          <small className="auth-hint" id="password-hint">Use at least 6 characters.</small>
        </div>

        {message && <p className="message message-error" role="alert">{message}</p>}

        <button className="auth-submit" type="submit" disabled={loading}>
          {loading ? "Creating account..." : "Register"}
        </button>
      </form>

    </AuthLayout>
  );
}

export default Register;
