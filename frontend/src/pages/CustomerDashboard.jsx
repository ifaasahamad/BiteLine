import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useCart } from "../context/CartContext";
import PageHeader from "../components/PageHeader";
import StatusBadge from "../components/StatusBadge";
import api from "../services/api";
import "./CustomerPages.css";

function CustomerDashboard() {
  const { user, token } = useAuth();
  const { cartItems } = useCart();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [refresh, setRefresh] = useState(0);
  const cartCount = cartItems.reduce((sum, item) => sum + item.quantity, 0);

  useEffect(() => {
    const controller = new AbortController();
    const loadOrders = async () => {
      try {
        const response = await api.get("/orders/my-orders", {
          headers: { Authorization: `Bearer ${token}` },
          signal: controller.signal,
        });
        if (!Array.isArray(response.data)) throw new Error("Unexpected orders response");
        if (!controller.signal.aborted) setOrders(response.data);
      } catch (failure) {
        if (!controller.signal.aborted) setError(failure.response?.data?.message || "We couldn't load your orders. Please try again.");
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    };
    loadOrders();
    return () => controller.abort();
  }, [token, refresh]);

  const refreshOrders = () => { setLoading(true); setError(""); setRefresh((value) => value + 1); };
  const recentOrders = [...orders].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)).slice(0, 3);
  const activeOrders = orders.filter((order) => !["completed", "cancelled"].includes(order.status));

  return <main className="customer-page container">
    <PageHeader eyebrow="YOUR BITELINE" title={`Welcome back${user?.name ? `, ${user.name}` : ""}.`} description="A good meal starts with a little planning. What are you craving today?">
      <Link className="button button-primary" to="/menu">Explore the menu <span aria-hidden="true">↗</span></Link>
    </PageHeader>
    <section className="customer-quick-grid" aria-label="Quick access">
      {[
        ["01", "Menu", "Find your next favourite", "Browse available dishes and order ahead.", "/menu"],
        ["02", "Cart", cartCount ? `${cartCount} ${cartCount === 1 ? "item" : "items"} in your cart` : "Your next meal starts here", "Review your choices before placing an order.", "/cart"],
        ["03", "My Orders", "Keep an eye on your order", "Find your token and check preparation status.", "/orders"],
      ].map(([number, title, subtitle, description, to]) => <Link className="customer-quick-card card" key={to} to={to}><div className="customer-card-top"><span>{number}</span><span aria-hidden="true">↗</span></div><h2>{title}</h2><strong>{subtitle}</strong><p>{description}</p></Link>)}
    </section>
    <section className="customer-order-section" aria-labelledby="recent-orders-title">
      <div className="customer-section-heading"><div><p className="eyebrow">FROM THE KITCHEN TO YOU</p><h2 id="recent-orders-title">Your recent orders</h2></div><button type="button" disabled={loading} onClick={refreshOrders}>{loading ? "Refreshing…" : "Refresh status"}</button></div>
      {loading && <p className="loading-state" role="status">Loading your orders…</p>}
      {!loading && error && <div className="message message-error" role="alert">{error} <button onClick={refreshOrders}>Try again</button></div>}
      {!loading && !error && <>
        {orders.length > 0 && <p className="customer-order-note">{activeOrders.length ? `${activeOrders.length} ${activeOrders.length === 1 ? "order is" : "orders are"} in progress. Check My Orders for all your tokens.` : "You're all caught up. Ready for something delicious?"}</p>}
        {!recentOrders.length ? <div className="empty-state customer-empty"><h3>Your first bite is waiting.</h3><p>You haven't placed any orders yet. Explore the menu to get started.</p><Link className="button button-primary" to="/menu">Browse menu</Link></div> : <div className="customer-recent-grid">{recentOrders.map((order) => <article className="card customer-recent-order" key={order._id}><div className="customer-order-top"><div><p className="eyebrow">YOUR TOKEN</p><h3>{order.tokenNumber}</h3></div><StatusBadge status={order.status} /></div><p className="text-muted">{order.items.map((item) => `${item.quantity} × ${item.name}`).join(", ")}</p><div className="customer-order-bottom"><strong>Rs. {Number(order.totalAmount).toLocaleString("en-LK", { minimumFractionDigits: 2 })}</strong><time dateTime={order.createdAt}>{new Date(order.createdAt).toLocaleDateString()}</time></div><Link to="/orders">View order details →</Link></article>)}</div>}
        {!!orders.length && <Link className="customer-all-orders" to="/orders">View all orders →</Link>}
      </>}
    </section>
    <aside className="customer-tip"><strong>Your token is your collection number.</strong><p>Check My Orders for preparation updates. When your order is ready, collect it using your token.</p></aside>
  </main>;
}

export default CustomerDashboard;
