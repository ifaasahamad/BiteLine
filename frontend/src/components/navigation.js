export function dashboardPath(role) {
  if (role === "admin") return "/admin";
  if (role === "staff") return "/staff";
  return "/customer";
}

export function navigationLinks(role) {
  const home = { to: "/", label: "Home", end: true };
  if (role === "customer") return [home,
    { to: "/customer", label: "Dashboard" },
    { to: "/menu", label: "Menu" },
    { to: "/cart", label: "Cart" },
    { to: "/orders", label: "My Orders" },
  ];
  if (role === "staff") return [home, { to: "/staff", label: "Staff Dashboard" }];
  if (role === "admin") return [home,
    { to: "/admin", label: "Admin Dashboard", end: true },
    { to: "/admin/menu", label: "Manage Menu" },
  ];
  return [home, { to: "/login", label: "Login" }, { to: "/register", label: "Register" }];
}
