import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import api from "../services/api";
import { useCart } from "../context/CartContext";
import PageHeader from "../components/PageHeader";
import "./CustomerPages.css";

function FoodImage({ image, name }) {
  const [failedImage, setFailedImage] = useState(null);
  return <div className="food-image-area">{image && failedImage !== image
    ? <img src={image} alt={name} loading="lazy" onError={() => setFailedImage(image)} />
    : <div className="food-image-placeholder"><span aria-hidden="true">◉</span><span>Photo coming soon</span></div>}</div>;
}

function CustomerMenu() {
  const { addToCart, cartItems } = useCart();
  const [message, setMessage] = useState("");
  const [menuItems, setMenuItems] = useState([]);
  const [categories, setCategories] = useState([]);
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [retry, setRetry] = useState(0);
  const cartCount = cartItems.reduce((sum, item) => sum + item.quantity, 0);

  useEffect(() => {
    const controller = new AbortController();
    const loadData = async () => {
      try {
        const [menuResponse, categoryResponse] = await Promise.all([
          api.get("/menu", { signal: controller.signal }),
          api.get("/categories", { signal: controller.signal }),
        ]);
        if (!Array.isArray(menuResponse.data) || !Array.isArray(categoryResponse.data)) throw new Error("Unexpected menu response");
        if (!controller.signal.aborted) {
          setMenuItems(menuResponse.data);
          setCategories(categoryResponse.data);
        }
      } catch (failure) {
        if (!controller.signal.aborted) setError(failure.response?.data?.message || "We couldn't load the menu. Please try again.");
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    };
    loadData();
    return () => controller.abort();
  }, [retry]);

  const filteredItems = useMemo(() => menuItems.filter((item) => {
    const matchesSearch = item.name.toLowerCase().includes(search.toLowerCase());
    const matchesCategory = !selectedCategory || item.category?._id === selectedCategory;
    return matchesSearch && matchesCategory;
  }), [menuItems, search, selectedCategory]);

  const clearFilters = () => { setSearch(""); setSelectedCategory(""); };

  return <main className="customer-page container">
    <PageHeader eyebrow="SOMETHING GOOD IS COOKING" title="Browse Menu" description="Find your favourites. Order ahead. Make the most of your break.">
      <Link className="button button-secondary" to="/cart">View cart ({cartCount}) <span aria-hidden="true">↗</span></Link>
    </PageHeader>
    <section className="customer-menu-filters card" aria-label="Find food">
      <div><label htmlFor="food-search">Search the menu</label><input id="food-search" type="search" placeholder="Search food..." value={search} onChange={(event) => setSearch(event.target.value)} /></div>
      <div><label htmlFor="food-category">Category</label><select id="food-category" value={selectedCategory} onChange={(event) => setSelectedCategory(event.target.value)}><option value="">All Categories</option>{categories.map((category) => <option key={category._id} value={category._id}>{category.name}</option>)}</select></div>
    </section>
    <div className="customer-menu-meta"><p>{loading ? "Finding your next bite…" : error ? "Menu currently unavailable" : `${filteredItems.length} ${filteredItems.length === 1 ? "dish" : "dishes"} to explore`}</p>{(search || selectedCategory) && <button type="button" onClick={clearFilters}>Clear filters</button>}</div>
    <div className="customer-menu-announcement" role="status" aria-live="polite">{message && <p className="message message-success">{message} <Link to="/cart">View cart →</Link></p>}</div>
    {loading && <div className="loading-state" role="status">Loading menu…</div>}
    {!loading && error && <div className="message message-error" role="alert"><p>{error}</p><button type="button" onClick={() => { setLoading(true); setError(""); setRetry((value) => value + 1); }}>Try again</button></div>}
    {!loading && !error && <>
      {!filteredItems.length && <div className="empty-state customer-empty"><h2>{menuItems.length ? "No menu items found." : "The menu is on its way."}</h2><p>{menuItems.length ? "Try another search or category to find something you love." : "Please check back soon for available dishes."}</p>{(search || selectedCategory) && <button onClick={clearFilters}>Clear filters</button>}</div>}
      <section className="customer-food-grid" aria-label="Menu items">{filteredItems.map((item) => <article className={`food-card${!item.available ? " food-card-unavailable" : ""}`} key={item._id}>
        <div className="food-visual"><FoodImage image={item.image} name={item.name} /><span className={`food-availability ${item.available ? "is-available" : "is-unavailable"}`}>{item.available ? "Available" : "Unavailable"}</span></div>
        <div className="food-card-body"><p className="food-category">{item.category?.name || "Uncategorised"}</p><h2>{item.name}</h2><p className="food-description">{item.description || "Ask the restaurant for more details about this dish."}</p><div className="food-card-footer"><strong className="food-price">Rs. {Number(item.price).toLocaleString("en-LK", { minimumFractionDigits: 2 })}</strong><button className="food-add" type="button" disabled={!item.available} aria-label={item.available ? `Add ${item.name} to cart` : `${item.name} is unavailable`} onClick={() => { addToCart(item); setMessage(`${item.name} added to cart`); }}>{item.available ? "Add to Cart" : "Unavailable"}</button></div></div>
      </article>)}</section>
    </>}
  </main>;
}

export default CustomerMenu;
