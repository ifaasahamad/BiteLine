import { useEffect, useState } from "react";
import api from "../services/api";
import { useAuth } from "../context/AuthContext";

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

  const { token } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const loadData = async () => {
    setLoading(true);
    try {
      const [categoriesResponse, menuResponse] = await Promise.all([
        api.get("/categories"),
        api.get("/menu"),
      ]);

      setCategories(categoriesResponse.data);
      setMenuItems(menuResponse.data);
    } catch {
      setMessage("Failed to load menu data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Load existing menu and category data on mount.
    // eslint-disable-next-line react-hooks/set-state-in-effect
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
    if (saving) return;
    setSaving(true);

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

      await loadData();
    } catch (error) {
      setMessage(
        error.response?.data?.message ||
          "Failed to save menu item"
      );
    } finally {
      setSaving(false);
    }
  };

  const handleToggleAvailability = async (item) => {
    if (saving) return;
    setSaving(true);
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

      await loadData();
    } catch (error) {
      setMessage(
        error.response?.data?.message ||
          "Failed to update availability"
      );
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    if (saving || !window.confirm("Delete this menu item?")) return;
    setSaving(true);
    try {
      await api.delete(`/menu/${id}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      setMessage("Menu item deleted successfully");
      await loadData();
    } catch (error) {
      setMessage(
        error.response?.data?.message || "Failed to delete menu item"
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <h1>Admin Menu Management</h1>

      <h2>{editingItemId ? "Edit Menu Item" : "Add Menu Item"}</h2>
      {loading && <p role="status">Loading menu data…</p>}

      <form onSubmit={handleSubmit}>
        <div>
          <label htmlFor="admin-menu-name">Name</label>
          <input
            id="admin-menu-name"
            name="name"
            value={formData.name}
            onChange={handleChange}
            required
          />
        </div>

        <div>
          <label htmlFor="admin-menu-description">Description</label>
          <input
            id="admin-menu-description"
            name="description"
            value={formData.description}
            onChange={handleChange}
          />
        </div>

        <div>
          <label htmlFor="admin-menu-price">Price</label>
          <input
            id="admin-menu-price"
            type="number"
            min="0"
            step="0.01"
            name="price"
            value={formData.price}
            onChange={handleChange}
            required
          />
        </div>

        <div>
          <label htmlFor="admin-menu-category">Category</label>
          <select
            id="admin-menu-category"
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
          <label htmlFor="admin-menu-image">Image URL</label>
          <input
            id="admin-menu-image"
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

        <button type="submit" disabled={saving || loading}>
          {editingItemId ? "Update Menu Item" : "Add Menu Item"}
        </button>
      </form>

      {message && <p role="status">{message}</p>}

      <hr />

      <h2>Current Menu</h2>
      {!loading && !menuItems.length && <p>No menu items yet.</p>}

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

          <button disabled={saving} onClick={() => handleEdit(item)}>
            Edit
          </button>

          <button disabled={saving} onClick={() => handleToggleAvailability(item)}>
            {item.available ? "Mark Unavailable" : "Mark Available"}
          </button>

          <button disabled={saving} onClick={() => handleDelete(item._id)}>
            Delete
          </button>

          <hr />
        </div>
      ))}
    </div>
  );
}

export default AdminMenu;
