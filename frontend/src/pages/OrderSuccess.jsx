import { Link, useLocation } from "react-router-dom";

function OrderSuccess() {
  const location = useLocation();
  const order = location.state?.order;

  if (!order) {
    return (
      <div>
        <h1>No order information found</h1>
        <Link to="/menu">Back to Menu</Link>
      </div>
    );
  }

  return (
    <div>
      <h1>Order Placed Successfully</h1>

      <h2>Your Token Number</h2>
      <h1>{order.tokenNumber}</h1>

      <p>Status: {order.status}</p>
      <p>Total: Rs. {order.totalAmount}</p>

      <Link to="/orders">View My Orders</Link>
    </div>
  );
}

export default OrderSuccess;
