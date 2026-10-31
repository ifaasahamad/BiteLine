import { useCallback, useEffect, useRef, useState } from "react";
import { useAuth } from "../context/AuthContext";
import api from "../services/api";
import "./StaffDashboard.css";

const nextStatuses = {
  pending: ["accepted", "Accept order"],
  accepted: ["preparing", "Start preparing"],
  preparing: ["ready", "Mark ready"],
  ready: ["completed", "Complete order"],
};
const statuses = ["pending", "accepted", "preparing", "ready", "completed", "cancelled"];
const money = (amount) => `Rs. ${Number(amount).toLocaleString("en-LK", { minimumFractionDigits: 2 })}`;

function StaffDashboard() {
  const { token, user } = useAuth();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [filter, setFilter] = useState("all");
  const [updatingId, setUpdatingId] = useState(null);
  const [updatedAt, setUpdatedAt] = useState(null);
  const requestId = useRef(0);
  const saving = useRef(false);

  const loadOrders = useCallback(async () => {
    const id = ++requestId.current;
    setLoading(true);
    setError("");
    try {
      if (!token) throw new Error("Please log in again to view orders.");
      const response = await api.get("/orders", { headers: { Authorization: `Bearer ${token}` } });
      if (!Array.isArray(response.data)) throw new Error("Unexpected orders response.");
      if (id === requestId.current) {
        setOrders(response.data);
        setUpdatedAt(new Date());
      }
    } catch (failure) {
      if (id === requestId.current) setError(failure.response?.status === 401
        ? "Your session has expired. Please log in again."
        : failure.response?.status === 403 ? "You do not have permission to view staff orders."
          : failure.response?.data?.message || failure.message || "Failed to load orders.");
    } finally {
      if (id === requestId.current) setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    // Fetch on session changes; synchronous state marks the request as loading.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadOrders();
    return () => { requestId.current += 1; };
  }, [loadOrders]);

  const updateStatus = async (order) => {
    const next = nextStatuses[order.status];
    if (!next || saving.current) return;
    saving.current = true;
    setUpdatingId(order._id);
    setError("");
    setNotice("");
    try {
      await api.put(`/orders/${order._id}/status`, { status: next[0] }, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setOrders((current) => current.map((item) => item._id === order._id ? { ...item, status: next[0] } : item));
      setNotice(`${order.tokenNumber} marked ${next[0]}.`);
      await loadOrders();
    } catch (failure) {
      setError(failure.response?.data?.message || "Failed to update order status. Please try again.");
    } finally {
      saving.current = false;
      setUpdatingId(null);
    }
  };

  const visibleOrders = orders.filter((order) => filter === "all" || order.status === filter);
  return (
    <main className="staff-dashboard">
      <header className="staff-header">
        <div><p className="staff-eyebrow">BITELINE / KITCHEN OPERATIONS</p><h1>Staff Dashboard</h1><p>Welcome, {user?.name || "team"}. Keep every order moving.</p></div>
        <button onClick={loadOrders} disabled={loading || !!updatingId}>{loading ? "Refreshing…" : "Refresh orders"}</button>
      </header>
      <section className="staff-summary" aria-label="Order overview">
        {[ ["Total orders", orders.length], ["In progress", orders.filter((o) => nextStatuses[o.status]).length], ["Ready for pickup", orders.filter((o) => o.status === "ready").length], ["Completed", orders.filter((o) => o.status === "completed").length] ].map(([label, count]) => <div key={label}><span>{label}</span><strong>{count}</strong></div>)}
      </section>
      {error && <div className="staff-error" role="alert">{error} <button onClick={loadOrders} disabled={loading || !!updatingId}>Retry loading</button></div>}
      {notice && <p className="staff-notice" role="status">{notice}</p>}
      <div className="staff-toolbar">
        <label>Order status <select value={filter} onChange={(event) => setFilter(event.target.value)}><option value="all">All orders</option>{statuses.map((status) => <option key={status} value={status}>{status}</option>)}</select></label>
        <span>{updatedAt ? `Updated ${updatedAt.toLocaleTimeString()}` : "Awaiting orders"}</span>
      </div>
      <section className="staff-orders" aria-label="Customer orders" aria-busy={loading}>
        {loading && <p className="staff-empty" role="status">Loading orders…</p>}
        {!loading && !error && !visibleOrders.length && <div className="staff-empty"><h2>{orders.length ? "No matching orders" : "No orders yet"}</h2><p>Refresh to check for new customer orders.</p></div>}
        {visibleOrders.map((order) => <article className="staff-order" key={order._id}>
          <div className="staff-order-heading"><div><p className="staff-eyebrow">ORDER TOKEN</p><h2>{order.tokenNumber}</h2></div><span className={`staff-badge staff-badge-${order.status}`}>{order.status}</span></div>
          <div className="staff-customer"><strong>{order.user?.name || "Customer unavailable"}</strong><span>{order.user?.email || "No email available"}</span></div>
          <time dateTime={order.createdAt}>Ordered {new Date(order.createdAt).toLocaleString()}</time>
          <ul className="staff-items">{order.items.map((item, index) => <li key={`${item.menuItem}-${index}`}><span><b>{item.quantity} ×</b> {item.name}</span><span>{money(item.price * item.quantity)}</span></li>)}</ul>
          <div className="staff-total"><span>Total amount</span><strong>{money(order.totalAmount)}</strong></div>
          {nextStatuses[order.status] ? <button className="staff-action" onClick={() => updateStatus(order)} disabled={!!updatingId || loading}>{updatingId === order._id ? "Updating…" : nextStatuses[order.status][1]}</button> : <p className="staff-terminal">Order {order.status}</p>}
        </article>)}
      </section>
    </main>
  );
}

export default StaffDashboard;
