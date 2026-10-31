const express = require("express");
const { getCustomers } = require("../controllers/customerController");
const { protect, authorizeRoles } = require("../middleware/authMiddleware");

const router = express.Router();
router.get("/", protect, authorizeRoles("admin"), getCustomers);

module.exports = router;
