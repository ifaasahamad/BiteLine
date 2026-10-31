export const orderStatuses = ["pending", "accepted", "preparing", "ready", "completed", "cancelled"];
export const money = (amount) => `Rs. ${Number(amount).toLocaleString("en-LK", { minimumFractionDigits: 2 })}`;
export const dateKey = (date) => new Date(date).toLocaleDateString("en-CA", { timeZone: "Asia/Colombo" });

export function summarizeOrders(orders, customerCount, now = new Date()) {
  return {
    "Total orders": orders.length,
    "Today's orders": orders.filter((order) => dateKey(order.createdAt) === dateKey(now)).length,
    "Pending orders": orders.filter((order) => order.status === "pending").length,
    "Completed orders": orders.filter((order) => order.status === "completed").length,
    "Total revenue": money(orders.filter((order) => order.status === "completed").reduce((sum, order) => sum + order.totalAmount, 0)),
    "Registered customers": customerCount,
  };
}

export function customerOrders(orders, customerId) {
  return orders.filter((order) => (order.user?._id || order.user) === customerId);
}
