const Category = require("../models/Category");

const getCategories = async (req, res) => {
  try {
    const categories = await Category.find().sort({ name: 1 });

    res.status(200).json(categories);
  } catch (error) {
    res.status(500).json({
      message: "Failed to fetch categories",
      error: error.message,
    });
  }
};

const createCategory = async (req, res) => {
  try {
    const { name, description } = req.body;

    if (typeof name !== "string" || !name.trim()) {
      return res.status(400).json({
        message: "Category name is required",
      });
    }

    const normalizedName = name.trim();
    const existingCategory = await Category.findOne({ name: normalizedName });

    if (existingCategory) {
      return res.status(400).json({
        message: "Category already exists",
      });
    }

    const category = await Category.create({
      name: normalizedName,
      description,
    });

    res.status(201).json({
      message: "Category created successfully",
      category,
    });
  } catch (error) {
    res.status(error.name === "ValidationError" || error.code === 11000 ? 400 : 500).json({
      message: error.code === 11000 ? "Category already exists" : "Failed to create category",
      error: error.message,
    });
  }
};

const updateCategory = async (req, res) => {
  try {
    const { name, description } = req.body;

    if (name !== undefined && (typeof name !== "string" || !name.trim())) {
      return res.status(400).json({ message: "Category name is required" });
    }

    const category = await Category.findById(req.params.id);

    if (!category) {
      return res.status(404).json({
        message: "Category not found",
      });
    }

    if (name !== undefined) {
      category.name = name.trim();
    }

    if (description !== undefined) {
      category.description = description;
    }

    await category.save();

    res.status(200).json({
      message: "Category updated successfully",
      category,
    });
  } catch (error) {
    res.status(error.name === "ValidationError" || error.name === "CastError" || error.code === 11000 ? 400 : 500).json({
      message: error.code === 11000 ? "Category already exists" : "Failed to update category",
      error: error.message,
    });
  }
};

const deleteCategory = async (req, res) => {
  try {
    const category = await Category.findById(req.params.id);

    if (!category) {
      return res.status(404).json({
        message: "Category not found",
      });
    }

    await category.deleteOne();

    res.status(200).json({
      message: "Category deleted successfully",
    });
  } catch (error) {
    res.status(500).json({
      message: "Failed to delete category",
      error: error.message,
    });
  }
};

module.exports = {
  getCategories,
  createCategory,
  updateCategory,
  deleteCategory,
};
