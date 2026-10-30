import { useEffect, useState } from "react";
import api from "../services/api";

function AdminMenu() {
  const [categories, setCategories] = useState([]);
  const [menuItems, setMenuItems] = useState([]);
  const [editingItemId, setEditingItemId] = useState(null);

  const [formData, setFormData] = useState({
    name: "",
    description: "",
    price: "",
    category: "",
    image: "",
    available: true,
  });

  const [message, setMessage] = useState("");

  const token = localStorage.getItem("token");

  const loadData = async () => {
    try {
      const [categoriesResponse, menuResponse] = await Promise.all([
        api.get("/categories"),
        api.get("/menu"),
      ]);

      setCategories(categoriesResponse.data);
      setMenuItems(menuResponse.data);
    } catch (error) {
      setMessage("Failed to load menu data");
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleChange = (event) => {
    const { name, value, type, checked } = event.target;

    setFormData({
      ...formData,
      [name]: type === "checkbox" ? checked : value,
    });
  };

  const handleEdit = (item) => {
    setEditingItemId(item._id);

    setFormData({
      name: item.name,
      description: item.description || "",
      price: item.price,
      category: item.category?._id || "",
      image: item.image || "",
      available: item.available,
    });
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    try {
      const payload = {
        ...formData,
        price: Number(formData.price),
      };

      if (editingItemId) {
        await api.put(
          `/menu/${editingItemId}`,
          payload,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );

        setMessage("Menu item updated successfully");
      } else {
        await api.post(
          "/menu",
          payload,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );

        setMessage("Menu item added successfully");
      }

      setFormData({
        name: "",
        description: "",
        price: "",
        category: "",
        image: "",
        available: true,
      });

      setEditingItemId(null);

      loadData();
    } catch (error) {
      setMessage(
        error.response?.data?.message ||
          "Failed to save menu item"
      );
    }
  };

  const handleToggleAvailability = async (item) => {
    try {
      await api.put(
        `/menu/${item._id}`,
        {
          available: !item.available,
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      loadData();
    } catch (error) {
      setMessage(
        error.response?.data?.message ||
          "Failed to update availability"
      );
    }
  };

  const handleDelete = async (id) => {
    try {
      await api.delete(`/menu/${id}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      setMessage("Menu item deleted successfully");
      loadData();
    } catch (error) {
      setMessage(
        error.response?.data?.message || "Failed to delete menu item"
      );
    }
  };

  return (
    <div>
      <h1>Admin Menu Management</h1>

      <h2>Add Menu Item</h2>

      <form onSubmit={handleSubmit}>
        <div>
          <label>Name</label>
          <input
            name="name"
            value={formData.name}
            onChange={handleChange}
            required
          />
        </div>

        <div>
          <label>Description</label>
          <input
            name="description"
            value={formData.description}
            onChange={handleChange}
          />
        </div>

        <div>
          <label>Price</label>
          <input
            type="number"
            name="price"
            value={formData.price}
            onChange={handleChange}
            required
          />
        </div>

        <div>
          <label>Category</label>
          <select
            name="category"
            value={formData.category}
            onChange={handleChange}
            required
          >
            <option value="">Select category</option>

            {categories.map((category) => (
              <option key={category._id} value={category._id}>
                {category.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label>Image URL</label>
          <input
            name="image"
            value={formData.image}
            onChange={handleChange}
          />
        </div>

        <div>
          <label>
            <input
              type="checkbox"
              name="available"
              checked={formData.available}
              onChange={handleChange}
            />
            Available
          </label>
        </div>

        <button type="submit">
          {editingItemId ? "Update Menu Item" : "Add Menu Item"}
        </button>
      </form>

      {message && <p>{message}</p>}

      <hr />

      <h2>Current Menu</h2>

      {menuItems.map((item) => (
        <div key={item._id}>
          <h3>{item.name}</h3>

          <p>{item.description}</p>

          <p>Price: Rs. {item.price}</p>

          <p>
            Category:
            {" "}
            {item.category?.name || "No category"}
          </p>

          <p>
            Status: {item.available ? "Available" : "Unavailable"}
          </p>

          <button onClick={() => handleEdit(item)}>
            Edit
          </button>

          <button onClick={() => handleToggleAvailability(item)}>
            {item.available ? "Mark Unavailable" : "Mark Available"}
          </button>

          <button onClick={() => handleDelete(item._id)}>
            Delete
          </button>

          <hr />
        </div>
      ))}
    </div>
  );
}

export default AdminMenu;
