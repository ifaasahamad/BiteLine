import { useEffect, useMemo, useState } from "react";
import api from "../services/api";
import { useCart } from "../context/CartContext";

function CustomerMenu() {
  const { addToCart } = useCart();
  const [message, setMessage] = useState("");
  const [menuItems, setMenuItems] = useState([]);
  const [categories, setCategories] = useState([]);
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("");

  useEffect(() => {
    const loadData = async () => {
      try {
        const [menuResponse, categoryResponse] = await Promise.all([
          api.get("/menu"),
          api.get("/categories"),
        ]);

        setMenuItems(menuResponse.data);
        setCategories(categoryResponse.data);
      } catch (error) {
        console.error("Failed to load menu", error);
      }
    };

    loadData();
  }, []);

  const filteredItems = useMemo(() => {
    return menuItems.filter((item) => {
      const matchesSearch = item.name
        .toLowerCase()
        .includes(search.toLowerCase());

      const matchesCategory =
        !selectedCategory ||
        item.category?._id === selectedCategory;

      return matchesSearch && matchesCategory;
    });
  }, [menuItems, search, selectedCategory]);

  return (
    <div>
      <h1>Browse Menu</h1>
      {message && <p role="status">{message}</p>}

      <div>
        <input
          type="text"
          placeholder="Search food..."
          value={search}
          onChange={(event) => setSearch(event.target.value)}
        />

        <select
          value={selectedCategory}
          onChange={(event) => setSelectedCategory(event.target.value)}
        >
          <option value="">All Categories</option>

          {categories.map((category) => (
            <option key={category._id} value={category._id}>
              {category.name}
            </option>
          ))}
        </select>
      </div>

      <hr />

      {filteredItems.length === 0 && <p>No menu items found.</p>}

      {filteredItems.map((item) => (
        <div key={item._id}>
          {item.image && (
            <img
              src={item.image}
              alt={item.name}
              width="200"
            />
          )}

          <h2>{item.name}</h2>

          <p>{item.description}</p>

          <p>Category: {item.category?.name}</p>

          <p>Price: Rs. {item.price}</p>

          <p>
            Status:{" "}
            {item.available ? "Available" : "Unavailable"}
          </p>

          <button
            type="button"
            disabled={!item.available}
            onClick={() => {
              addToCart(item);
              setMessage(`${item.name} added to cart`);
            }}
          >
            {item.available ? "Add to Cart" : "Unavailable"}
          </button>

          <hr />
        </div>
      ))}
    </div>
  );
}

export default CustomerMenu;
