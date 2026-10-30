const express = require("express");

const {
  registerUser,
  loginUser,
  getCurrentUser,
} = require("../controllers/authController");

const {
  protect,
  authorizeRoles,
} = require("../middleware/authMiddleware");

const router = express.Router();

router.get(
  "/admin-test",
  protect,
  authorizeRoles("admin"),
  (req, res) => {
    res.status(200).json({
      message: "Admin access granted",
      user: req.user,
    });
  }
);

router.post("/register", registerUser);
router.post("/login", loginUser);
router.get("/me", protect, getCurrentUser);

module.exports = router;
