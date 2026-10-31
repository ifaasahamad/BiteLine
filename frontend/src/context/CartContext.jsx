import { createContext, useContext, useEffect, useState } from "react";

const CartContext = createContext();

export function CartProvider({ children }) {
  const [cartItems, setCartItems] = useState(() => {
    try {
      const saved = JSON.parse(sessionStorage.getItem("biteline-cart") || "[]");
      return Array.isArray(saved)
        ? saved.filter((item) => item && item._id && item.quantity > 0)
        : [];
    } catch {
      return [];
    }
  });

  useEffect(() => {
    try {
      sessionStorage.setItem("biteline-cart", JSON.stringify(cartItems));
    } catch {
      // Keep the cart usable when browser storage is unavailable.
    }
  }, [cartItems]);

  const addToCart = (item) => {
    setCartItems((currentItems) => {
      const existingItem = currentItems.find(
        (cartItem) => cartItem._id === item._id
      );

      if (existingItem) {
        return currentItems.map((cartItem) =>
          cartItem._id === item._id
            ? { ...cartItem, quantity: cartItem.quantity + 1 }
            : cartItem
        );
      }

      return [...currentItems, { ...item, quantity: 1 }];
    });
  };

  const increaseQuantity = (id) => {
    setCartItems((currentItems) =>
      currentItems.map((item) =>
        item._id === id
          ? { ...item, quantity: item.quantity + 1 }
          : item
      )
    );
  };

  const decreaseQuantity = (id) => {
    setCartItems((currentItems) =>
      currentItems
        .map((item) =>
          item._id === id
            ? { ...item, quantity: item.quantity - 1 }
            : item
        )
        .filter((item) => item.quantity > 0)
    );
  };

  const removeFromCart = (id) => {
    setCartItems((currentItems) =>
      currentItems.filter((item) => item._id !== id)
    );
  };

  const clearCart = () => {
    setCartItems([]);
  };

  const total = cartItems.reduce(
    (sum, item) => sum + item.price * item.quantity,
    0
  );

  return (
    <CartContext.Provider
      value={{
        cartItems,
        addToCart,
        increaseQuantity,
        decreaseQuantity,
        removeFromCart,
        clearCart,
        total,
      }}
    >
      {children}
    </CartContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useCart() {
  return useContext(CartContext);
}
