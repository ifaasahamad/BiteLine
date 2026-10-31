const express = require("express");

const {
  createOrder,
  getMyOrders,
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

module.exports = router;
