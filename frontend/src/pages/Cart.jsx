import { useCart } from "../context/CartContext";
import { useRef, useState } from "react";
import api from "../services/api";
import { Link, useNavigate } from "react-router-dom";
import PageHeader from "../components/PageHeader";
import "./CustomerPages.css";
import "./OrderPages.css";

const money = (amount) => `Rs. ${Number(amount).toLocaleString("en-LK", { minimumFractionDigits: 2 })}`;

function Cart() {
  const navigate = useNavigate();
  const [message, setMessage] = useState("");
  const [placingOrder, setPlacingOrder] = useState(false);
  const submitting = useRef(false);
  const { cartItems, increaseQuantity, decreaseQuantity, removeFromCart, clearCart, total } = useCart();
  const itemCount = cartItems.reduce((sum, item) => sum + item.quantity, 0);

  const handleCheckout = async () => {
    if (submitting.current || !cartItems.length) return;
    submitting.current = true;
    try {
      setPlacingOrder(true);
      setMessage("");
      const token = localStorage.getItem("token");
      const items = cartItems.map((item) => ({ menuItem: item._id, quantity: item.quantity }));
      const response = await api.post("/orders", { items }, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const order = response.data.order;
      clearCart();
      navigate("/order-success", { state: { order } });
    } catch (error) {
      setMessage(error.response?.data?.message || "Failed to place order");
    } finally {
      submitting.current = false;
      setPlacingOrder(false);
    }
  };

  return <main className="customer-page container cart-page">
    <PageHeader eyebrow="YOUR NEXT GOOD MEAL" title="Your Cart" description="Review your choices. We'll take care of the cooking.">
      {!placingOrder && <Link className="button button-secondary" to="/menu">Continue browsing ↗</Link>}
    </PageHeader>
    {message && <div className="message message-error" role="alert">{message}</div>}
    {!cartItems.length ? <section className="empty-state customer-empty"><span className="order-empty-icon" aria-hidden="true">＋</span><h2>Your cart is empty.</h2><p>Something delicious is waiting on the menu. Find your favourites to start an order.</p><Link className="button button-primary" to="/menu">Explore the menu</Link></section> :
      <div className="cart-layout" aria-busy={placingOrder}>
        <section aria-label="Cart items" className="cart-item-list">
          {cartItems.map((item) => <article className="card cart-item" key={item._id}>
            <div className="cart-item-heading"><div><h2>{item.name}</h2><p className="text-muted">Price: {money(item.price)} each</p></div><button className="cart-remove" type="button" disabled={placingOrder} onClick={() => removeFromCart(item._id)} aria-label={`Remove ${item.name}`}>Remove</button></div>
            <div className="cart-item-bottom"><div className="cart-quantity"><span id={`quantity-${item._id}`}>Quantity</span><div role="group" aria-labelledby={`quantity-${item._id}`}><button disabled={placingOrder} type="button" onClick={() => decreaseQuantity(item._id)} aria-label={`Decrease quantity of ${item.name}`}>−</button><span className="quantity-value" aria-live="polite">{item.quantity}</span><button disabled={placingOrder} type="button" onClick={() => increaseQuantity(item._id)} aria-label={`Increase quantity of ${item.name}`}>+</button></div></div><div className="cart-subtotal"><span>Subtotal</span><strong>{money(item.price * item.quantity)}</strong></div></div>
          </article>)}
          <button className="cart-clear" type="button" disabled={placingOrder} onClick={clearCart}>Clear Cart</button>
        </section>
        <aside className="card cart-summary" aria-label="Order summary"><p className="eyebrow">ALMOST LUNCHTIME</p><h2>Order summary</h2><div className="cart-summary-line"><span>{itemCount} {itemCount === 1 ? "item" : "items"}</span><span>{money(total)}</span></div><div className="cart-grand-total"><span>Total</span><strong>{money(total)}</strong></div><button className="checkout-button" type="button" onClick={handleCheckout} disabled={placingOrder}>{placingOrder ? "Placing Order..." : "Proceed to Checkout"}</button><p className="cart-summary-note" role={placingOrder ? "status" : undefined}>{placingOrder ? "Please wait while we place your order. Your cart is locked during checkout." : "Place your order to receive your collection token. Track preparation in My Orders."}</p></aside>
      </div>}
  </main>;
}

export default Cart;
