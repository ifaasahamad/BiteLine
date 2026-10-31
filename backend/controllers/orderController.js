const Order = require("../models/Order");
const MenuItem = require("../models/MenuItem");

const createOrder = async (req, res) => {
  try {
    const { items } = req.body;

    if (!items || items.length === 0) {
      return res.status(400).json({
        message: "Order must contain at least one item",
      });
    }

    const orderItems = [];
    let totalAmount = 0;

    for (const item of items) {
      const menuItem = await MenuItem.findById(item.menuItem);

      if (!menuItem) {
        return res.status(404).json({
          message: "Menu item not found",
        });
      }

      if (!menuItem.available) {
        return res.status(400).json({
          message: `${menuItem.name} is currently unavailable`,
        });
      }

      const quantity = Number(item.quantity);

      totalAmount += menuItem.price * quantity;

      orderItems.push({
        menuItem: menuItem._id,
        name: menuItem.name,
        price: menuItem.price,
        quantity,
      });
    }

    const tokenNumber = `BL-${Date.now()}`;

    const order = await Order.create({
      user: req.user._id,
      items: orderItems,
      totalAmount,
      tokenNumber,
    });

    res.status(201).json({
      message: "Order placed successfully",
      order,
    });
  } catch (error) {
    res.status(500).json({
      message: "Failed to create order",
      error: error.message,
    });
  }
};

const getMyOrders = async (req, res) => {
  try {
    const orders = await Order.find({
      user: req.user._id,
    }).sort({ createdAt: -1 });

    res.status(200).json(orders);
  } catch (error) {
    res.status(500).json({
      message: "Failed to fetch orders",
      error: error.message,
    });
  }
};

module.exports = {
  createOrder,
  getMyOrders,
};
