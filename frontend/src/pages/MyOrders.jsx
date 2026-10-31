import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import PageHeader from "../components/PageHeader";
import StatusBadge from "../components/StatusBadge";
import api from "../services/api";
import "./CustomerPages.css";
import "./OrderPages.css";

function MyOrders() {
  const { token } = useAuth();
  const [orders, setOrders] = useState([]);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [refresh, setRefresh] = useState(0);
  const [updatedAt, setUpdatedAt] = useState(null);

  useEffect(() => {
    const controller = new AbortController();
    const loadOrders = async () => {
      try {
        const response = await api.get("/orders/my-orders", {
          headers: { Authorization: `Bearer ${token}` }, signal: controller.signal,
        });
        if (!Array.isArray(response.data)) throw new Error("Unexpected orders response");
        if (!controller.signal.aborted) { setOrders(response.data); setUpdatedAt(new Date()); }
      } catch (error) {
        if (!controller.signal.aborted) setMessage(error.response?.data?.message || "Failed to load orders");
      } finally { if (!controller.signal.aborted) setLoading(false); }
    };
    loadOrders();
    return () => controller.abort();
  }, [token, refresh]);

  const loadOrders = () => { setLoading(true); setMessage(""); setRefresh((value) => value + 1); };
  const sortedOrders = [...orders].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  const active = sortedOrders.filter((order) => !["completed", "cancelled"].includes(order.status));
  const past = sortedOrders.filter((order) => ["completed", "cancelled"].includes(order.status));

  return <main className="customer-page container orders-page">
    <PageHeader eyebrow="FROM KITCHEN TO COLLECTION" title="My Orders" description="Your tokens, your meals, and the latest from the kitchen."><button type="button" onClick={loadOrders} disabled={loading}>{loading ? "Refreshing…" : "Refresh Status"}</button></PageHeader>
    <div className="orders-update-note"><p>Status updates appear when you refresh.</p>{updatedAt && <span>Last checked {updatedAt.toLocaleTimeString()}</span>}</div>
    {message && <div className="message message-error" role="alert">{message} <button onClick={loadOrders} disabled={loading}>Try again</button></div>}
    {loading && <p className="loading-state" role="status">Loading your orders…</p>}
    {!loading && !message && orders.length === 0 && <section className="empty-state customer-empty"><h2>No orders found.</h2><p>Your order history and collection tokens will appear here after checkout.</p><Link className="button button-primary" to="/menu">Browse menu</Link></section>}
    {[["Active orders", active, "active"], ["Order history", past, "history"]].map(([title, group, kind]) => group.length > 0 && <section className={`orders-section orders-${kind}`} key={kind} aria-label={title} aria-busy={loading}><div className="orders-section-heading"><h2>{title}</h2><span>{group.length} {group.length === 1 ? "order" : "orders"}</span></div><div className="order-history-grid">{group.map((order) => <article className={`card history-order history-order-${order.status}`} key={order._id}><div className="history-order-heading"><div><p className="eyebrow">COLLECTION TOKEN</p><h3>{order.tokenNumber}</h3></div><StatusBadge status={order.status} /></div>{order.status === "ready" && <p className="order-ready-note">Ready to collect. Show your token at the counter.</p>}<time dateTime={order.createdAt}>Ordered at: {new Date(order.createdAt).toLocaleString()}</time><h4>Ordered items</h4><ul>{order.items.map((item, index) => <li key={index}><span className="order-item-quantity">{item.quantity} ×</span><span>{item.name}</span></li>)}</ul><div className="history-order-total"><span>Total amount</span><strong>Rs. {Number(order.totalAmount).toLocaleString("en-LK", { minimumFractionDigits: 2 })}</strong></div></article>)}</div></section>)}
  </main>;
}

export default MyOrders;
