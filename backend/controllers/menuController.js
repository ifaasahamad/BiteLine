const MenuItem = require("../models/MenuItem");

const getMenuItems = async (req, res) => {
  try {
    const items = await MenuItem.find()
      .populate("category", "name description")
      .sort({ createdAt: -1 });

    res.status(200).json(items);
  } catch (error) {
    res.status(500).json({
      message: "Failed to fetch menu items",
      error: error.message,
    });
  }
};

const getMenuItemById = async (req, res) => {
  try {
    const item = await MenuItem.findById(req.params.id).populate(
      "category",
      "name description"
    );

    if (!item) {
      return res.status(404).json({
        message: "Menu item not found",
      });
    }

    res.status(200).json(item);
  } catch (error) {
    res.status(500).json({
      message: "Failed to fetch menu item",
      error: error.message,
    });
  }
};

const createMenuItem = async (req, res) => {
  try {
    const { name, description, price, category, image, available } = req.body;

    if (!name || price === undefined || !category) {
      return res.status(400).json({
        message: "Name, price and category are required",
      });
    }

    const item = await MenuItem.create({
      name,
      description,
      price,
      category,
      image,
      available,
    });

    const populatedItem = await item.populate(
      "category",
      "name description"
    );

    res.status(201).json({
      message: "Menu item created successfully",
      item: populatedItem,
    });
  } catch (error) {
    res.status(500).json({
      message: "Failed to create menu item",
      error: error.message,
    });
  }
};

const updateMenuItem = async (req, res) => {
  try {
    const item = await MenuItem.findById(req.params.id);

    if (!item) {
      return res.status(404).json({
        message: "Menu item not found",
      });
    }

    const fields = [
      "name",
      "description",
      "price",
      "category",
      "image",
      "available",
    ];

    fields.forEach((field) => {
      if (req.body[field] !== undefined) {
        item[field] = req.body[field];
      }
    });

    await item.save();

    const populatedItem = await item.populate(
      "category",
      "name description"
    );

    res.status(200).json({
      message: "Menu item updated successfully",
      item: populatedItem,
    });
  } catch (error) {
    res.status(500).json({
      message: "Failed to update menu item",
      error: error.message,
    });
  }
};

const deleteMenuItem = async (req, res) => {
  try {
    const item = await MenuItem.findById(req.params.id);

    if (!item) {
      return res.status(404).json({
        message: "Menu item not found",
      });
    }

    await item.deleteOne();

    res.status(200).json({
      message: "Menu item deleted successfully",
    });
  } catch (error) {
    res.status(500).json({
      message: "Failed to delete menu item",
      error: error.message,
    });
  }
};

module.exports = {
  getMenuItems,
  getMenuItemById,
  createMenuItem,
  updateMenuItem,
  deleteMenuItem,
};
