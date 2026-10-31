const express = require("express");

const {
  createOrder,
  getMyOrders,
  getAllOrders,
  updateOrderStatus,
} = require("../controllers/orderController");

const {
  protect,
  authorizeRoles,
} = require("../middleware/authMiddleware");

const router = express.Router();

router.post(
  "/",
  protect,
  authorizeRoles("customer"),
  createOrder
);

router.get(
  "/my-orders",
  protect,
  authorizeRoles("customer"),
  getMyOrders
);

router.get(
  "/",
  protect,
  authorizeRoles("staff", "admin"),
  getAllOrders
);

router.put(
  "/:id/status",
  protect,
  authorizeRoles("staff", "admin"),
  updateOrderStatus
);

module.exports = router;
