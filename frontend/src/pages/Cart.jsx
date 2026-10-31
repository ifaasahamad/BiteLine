import { useCart } from "../context/CartContext";
import { useState } from "react";
import api from "../services/api";
import { useNavigate } from "react-router-dom";

function Cart() {
  const navigate = useNavigate();
  const [message, setMessage] = useState("");
  const [placingOrder, setPlacingOrder] = useState(false);
  const {
    cartItems,
    increaseQuantity,
    decreaseQuantity,
    removeFromCart,
    clearCart,
    total,
  } = useCart();

  const handleCheckout = async () => {
    try {
      setPlacingOrder(true);
      setMessage("");

      const token = localStorage.getItem("token");

      const items = cartItems.map((item) => ({
        menuItem: item._id,
        quantity: item.quantity,
      }));

      const response = await api.post(
        "/orders",
        { items },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      const order = response.data.order;

      clearCart();

      navigate("/order-success", {
        state: {
          order,
        },
      });
    } catch (error) {
      setMessage(
        error.response?.data?.message ||
          "Failed to place order"
      );
    } finally {
      setPlacingOrder(false);
    }
  };

  return (
    <div>
      <h1>Your Cart</h1>
      {message && <p>{message}</p>}

      {cartItems.length === 0 && <p>Your cart is empty.</p>}

      {cartItems.map((item) => (
        <div key={item._id}>
          <h3>{item.name}</h3>

          <p>Price: Rs. {item.price}</p>

          <p>Quantity: {item.quantity}</p>

          <button onClick={() => decreaseQuantity(item._id)}>
            -
          </button>

          <button onClick={() => increaseQuantity(item._id)}>
            +
          </button>

          <button onClick={() => removeFromCart(item._id)}>
            Remove
          </button>

          <p>
            Subtotal: Rs. {item.price * item.quantity}
          </p>

          <hr />
        </div>
      ))}

      {cartItems.length > 0 && (
        <>
          <h2>Total: Rs. {total}</h2>

          <button onClick={clearCart}>
            Clear Cart
          </button>

          <button
            onClick={handleCheckout}
            disabled={placingOrder}
          >
            {placingOrder ? "Placing Order..." : "Proceed to Checkout"}
          </button>
        </>
      )}
    </div>
  );
}

export default Cart;
