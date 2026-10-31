import { Link, useLocation } from "react-router-dom";
import StatusBadge from "../components/StatusBadge";
import "./CustomerPages.css";
import "./OrderPages.css";

function OrderSuccess() {
  const location = useLocation();
  const order = location.state?.order;

  if (!order) return <main className="customer-page container"><section className="empty-state customer-empty"><h1>No order information found</h1><p>You can find your existing orders and collection tokens in My Orders.</p><div className="order-success-actions"><Link className="button button-primary" to="/orders">View My Orders</Link><Link className="button button-secondary" to="/menu">Back to Menu</Link></div></section></main>;

  return <main className="customer-page container order-success-page">
    <section className="card order-success-card" aria-labelledby="order-success-title"><span className="success-check" aria-hidden="true">✓</span><p className="eyebrow">THANK YOU FOR ORDERING WITH BITELINE</p><h1 id="order-success-title">Order Placed Successfully</h1><p className="text-muted">Your next good meal is in the queue.</p>
      <div className="order-token-panel"><p>Your Token Number</p><strong className="order-success-token">{order.tokenNumber}</strong><span>Keep this token handy for collection.</span></div>
      <div className="order-success-facts"><div><span>Status</span><StatusBadge status={order.status} /></div><div><span>Total amount</span><strong>Rs. {Number(order.totalAmount).toLocaleString("en-LK", { minimumFractionDigits: 2 })}</strong></div></div>
      <p className="order-success-note">Check My Orders for the latest preparation status. Collect your food with your token when it is ready.</p>
      <div className="order-success-actions"><Link className="button button-primary" to="/orders">View My Orders</Link><Link className="button button-secondary" to="/menu">Back to Menu</Link></div>
    </section>
  </main>;
}

export default OrderSuccess;
