import { useCallback, useEffect, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import api from "../services/api";
import AdminMenu from "./AdminMenu";
import { customerOrders, dateKey, money, orderStatuses, summarizeOrders } from "./adminDashboardData";
import "./AdminDashboard.css";

function OrderDetails({ order }) {
  return <details className="admin-order"><summary><strong>{order.tokenNumber}</strong><span className={`admin-status status-${order.status}`}>{order.status}</span><span>{money(order.totalAmount)}</span></summary>
    <div className="admin-order-body"><p><strong>{order.user?.name || "Customer unavailable"}</strong> · {order.user?.email || "No email available"}</p><p>Ordered {new Date(order.createdAt).toLocaleString("en-LK", { timeZone: "Asia/Colombo" })}</p>
      <ul>{order.items.map((item, index) => <li key={index}><span>{item.quantity} × {item.name}</span><strong>{money(item.price * item.quantity)}</strong></li>)}</ul>
      <p>Last updated: {new Date(order.updatedAt || order.createdAt).toLocaleString("en-LK", { timeZone: "Asia/Colombo" })}</p>
    </div></details>;
}

function AdminDashboard() {
  const { token, user } = useAuth();
  const [params, setParams] = useSearchParams();
  const section = ["overview", "orders", "menu", "categories", "customers"].includes(params.get("section")) ? params.get("section") : "overview";
  const [orders, setOrders] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [customerSearch, setCustomerSearch] = useState("");
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [categoryId, setCategoryId] = useState(null);
  const [form, setForm] = useState({ name: "", description: "" });
  const requestId = useRef(0);
  const headers = { Authorization: `Bearer ${token}` };

  const loadData = useCallback(async () => {
    const id = ++requestId.current;
    setLoading(true);
    setError("");
    try {
      const config = { headers: { Authorization: `Bearer ${token}` } };
      const results = await Promise.all([api.get("/orders", config), api.get("/customers", config), api.get("/categories", config)]);
      if (results.some((result) => !Array.isArray(result.data))) throw new Error("Unexpected dashboard response");
      if (id === requestId.current) {
        setOrders(results[0].data); setCustomers(results[1].data); setCategories(results[2].data);
      }
    } catch (failure) {
      if (id === requestId.current) setError(failure.response?.status === 401 ? "Your session has expired. Please log in again." : failure.response?.data?.message || "Failed to load dashboard data. Please retry.");
    } finally { if (id === requestId.current) setLoading(false); }
  }, [token]);

  useEffect(() => {
    // Fetch current database data when the authenticated session changes.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadData();
    return () => { requestId.current += 1; };
  }, [loadData]);

  const saveCategory = async (event) => {
    event.preventDefault();
    if (saving) return;
    setSaving(true); setError(""); setNotice("");
    try {
      const payload = { name: form.name.trim(), description: form.description.trim() };
      if (!payload.name) throw new Error("Category name is required");
      if (categoryId) await api.put(`/categories/${categoryId}`, payload, { headers });
      else await api.post("/categories", payload, { headers });
      setForm({ name: "", description: "" }); setCategoryId(null);
      setNotice("Category saved successfully."); await loadData();
    } catch (failure) { setError(failure.response?.data?.message || failure.message || "Failed to save category"); }
    finally { setSaving(false); }
  };

  const deleteCategory = async (category) => {
    if (saving || !window.confirm(`Delete category "${category.name}"?`)) return;
    setSaving(true); setError(""); setNotice("");
    try {
      await api.delete(`/categories/${category._id}`, { headers });
      if (categoryId === category._id) { setCategoryId(null); setForm({ name: "", description: "" }); }
      setNotice("Category deleted."); await loadData();
    } catch (failure) { setError(failure.response?.data?.message || "Failed to delete category"); }
    finally { setSaving(false); }
  };

  const filteredOrders = orders.filter((order) => order.tokenNumber.toLowerCase().includes(search.toLowerCase()) && (!status || order.status === status));
  const history = selectedCustomer ? customerOrders(orders, selectedCustomer._id) : [];
  const days = Array.from({ length: 7 }, (_, index) => {
    const day = new Date(); day.setUTCDate(day.getUTCDate() - (6 - index));
    return { label: dateKey(day), count: orders.filter((order) => dateKey(order.createdAt) === dateKey(day)).length };
  });
  const maxCount = Math.max(1, ...days.map((day) => day.count));

  return <main className="admin-dashboard">
    <aside className="admin-sidebar"><div className="admin-brand">BiteLine<span>ADMIN WORKSPACE</span></div><nav aria-label="Admin sections">{["overview", "orders", "menu", "categories", "customers"].map((item) => <button key={item} aria-current={section === item ? "page" : undefined} onClick={() => setParams({ section: item })}>{item}</button>)}</nav><p>Signed in as<br /><strong>{user?.name || "Administrator"}</strong></p></aside>
    <div className="admin-content"><header className="admin-heading"><div><p className="admin-eyebrow">RESTAURANT MANAGEMENT</p><h1>{section === "overview" ? "Business overview" : section}</h1><p>Your restaurant, at a glance.</p></div><button onClick={loadData} disabled={loading || saving}>{loading ? "Refreshing…" : "Refresh data"}</button></header>
      {error && <div role="alert" className="admin-error">{error} <button onClick={loadData} disabled={loading}>Retry</button></div>}
      {notice && <p role="status" className="admin-notice">{notice}</p>}
      {loading && <p role="status">Loading dashboard data…</p>}
      {!loading && !error && section === "overview" && <>
        <section className="admin-stats" aria-label="Dashboard statistics">{Object.entries(summarizeOrders(orders, customers.length)).map(([label, value]) => <div key={label}><span>{label}</span><strong>{value}</strong></div>)}</section>
        <p className="admin-muted">Revenue includes completed orders. Dates use Asia/Colombo time.</p>
        <div className="admin-charts"><section className="admin-panel"><h2>Orders over the last 7 days</h2><div className="admin-chart" role="img" aria-label={days.map((day) => `${day.label}: ${day.count} orders`).join(", ")}>{days.map((day) => <div key={day.label}><strong>{day.count}</strong><div className="admin-bar" style={{ height: `${day.count / maxCount * 120}px` }} /><span>{day.label.slice(5)}</span></div>)}</div></section>
          <section className="admin-panel"><h2>Order status breakdown</h2>{orderStatuses.map((item) => <div className="admin-breakdown" key={item}><span>{item}</span><meter min="0" max={Math.max(orders.length, 1)} value={orders.filter((order) => order.status === item).length} aria-label={`${item} orders`} /><strong>{orders.filter((order) => order.status === item).length}</strong></div>)}</section></div>
        <section className="admin-panel"><h2>Latest orders</h2>{!orders.length && <p>No orders yet.</p>}{orders.slice(0, 5).map((order) => <OrderDetails key={order._id} order={order} />)}</section>
      </>}
      {section === "orders" && <section className="admin-panel"><h2>All orders & history</h2><div className="admin-filters"><label>Token number<input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search BL-…" /></label><label>Status<select value={status} onChange={(event) => setStatus(event.target.value)}><option value="">All statuses</option>{orderStatuses.map((item) => <option key={item}>{item}</option>)}</select></label></div>{!loading && !filteredOrders.length && <p>No matching orders.</p>}{filteredOrders.map((order) => <OrderDetails key={order._id} order={order} />)}</section>}
      {section === "menu" && <section className="admin-panel admin-menu"><AdminMenu /></section>}
      {section === "categories" && <section className="admin-panel"><h2>{categoryId ? "Edit category" : "Add category"}</h2><form className="admin-category-form" onSubmit={saveCategory}><label>Name<input required maxLength={100} value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} /></label><label>Description<input value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} /></label><button disabled={saving || loading}>{saving ? "Saving…" : "Save category"}</button>{categoryId && <button type="button" onClick={() => { setCategoryId(null); setForm({ name: "", description: "" }); }}>Cancel edit</button>}</form><h2>Categories</h2>{!loading && !categories.length && <p>No categories yet. Create your first category above.</p>}{categories.map((category) => <div className="admin-category" key={category._id}><div><strong>{category.name}</strong><p>{category.description}</p></div><div><button disabled={saving} onClick={() => { setCategoryId(category._id); setForm({ name: category.name, description: category.description || "" }); }}>Edit</button><button disabled={saving} onClick={() => deleteCategory(category)}>Delete</button></div></div>)}</section>}
      {section === "customers" && <section className="admin-panel"><h2>Registered customers</h2><label>Find a customer<input value={customerSearch} onChange={(event) => setCustomerSearch(event.target.value)} placeholder="Name or email" /></label>{!loading && !customers.filter((customer) => `${customer.name} ${customer.email}`.toLowerCase().includes(customerSearch.toLowerCase())).length && <p>No matching customers.</p>}{customers.filter((customer) => `${customer.name} ${customer.email}`.toLowerCase().includes(customerSearch.toLowerCase())).map((customer) => <div className="admin-category" key={customer._id}><div><strong>{customer.name}</strong><p>{customer.email}</p><small>Joined {new Date(customer.createdAt).toLocaleDateString()}</small></div><button onClick={() => setSelectedCustomer(customer)}>View order history ({customerOrders(orders, customer._id).length})</button></div>)}{selectedCustomer && <section className="admin-history"><h2>{selectedCustomer.name}'s orders</h2><button onClick={() => setSelectedCustomer(null)}>Close history</button>{!history.length && <p>This customer has no orders.</p>}{history.map((order) => <OrderDetails key={order._id} order={order} />)}</section>}</section>}
    </div>
  </main>;
}

export default AdminDashboard;
