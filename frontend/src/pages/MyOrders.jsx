import { useEffect, useState } from "react";
import api from "../services/api";

function MyOrders() {
  const [orders, setOrders] = useState([]);
  const [message, setMessage] = useState("");

  const loadOrders = async () => {
    try {
      const token = localStorage.getItem("token");

      const response = await api.get("/orders/my-orders", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      setOrders(response.data);
    } catch (error) {
      setMessage(
        error.response?.data?.message || "Failed to load orders"
      );
    }
  };

  useEffect(() => {
    // Hydrate order history from the API on mount; manual refresh shares this loader.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadOrders();
  }, []);

  return (
    <div>
      <h1>My Orders</h1>

      <button onClick={loadOrders}>
        Refresh Status
      </button>

      {message && <p>{message}</p>}

      {orders.length === 0 && <p>No orders found.</p>}

      {orders.map((order) => (
        <div key={order._id}>
          <h2>{order.tokenNumber}</h2>

          <p>Status: {order.status}</p>
          <p>Total: Rs. {order.totalAmount}</p>

          <h3>Items</h3>

          {order.items.map((item, index) => (
            <div key={index}>
              <p>
                {item.name} × {item.quantity}
              </p>
            </div>
          ))}

          <p>
            Ordered at:{" "}
            {new Date(order.createdAt).toLocaleString()}
          </p>

          <hr />
        </div>
      ))}
    </div>
  );
}

export default MyOrders;
