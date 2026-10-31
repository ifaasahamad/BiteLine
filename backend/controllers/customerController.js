const User = require("../models/User");

const getCustomers = async (req, res) => {
  try {
    const customers = await User.find({ role: "customer" })
      .select("_id name email createdAt")
      .sort({ createdAt: -1 });
    res.status(200).json(customers);
  } catch {
    res.status(500).json({ message: "Failed to fetch customers" });
  }
};

module.exports = { getCustomers };
