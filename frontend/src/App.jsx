import { BrowserRouter, Routes, Route } from "react-router-dom";

import Register from "./pages/Register";
import Login from "./pages/Login";
import CustomerDashboard from "./pages/CustomerDashboard";
import StaffDashboard from "./pages/StaffDashboard";
import AdminDashboard from "./pages/AdminDashboard";
import AdminMenu from "./pages/AdminMenu";
import CustomerMenu from "./pages/CustomerMenu";
import Cart from "./pages/Cart";
import OrderSuccess from "./pages/OrderSuccess";
import MyOrders from "./pages/MyOrders";

import ProtectedRoute from "./components/ProtectedRoute";
import Navbar from "./components/Navbar";

function Home() {
  return (
    <div>
      <h1>BiteLine</h1>
      <p>Pre-order your food and track your queue without waiting in line.</p>
    </div>
  );
}

function App() {
  return (
    <BrowserRouter>
      <Navbar />
      <Routes>
        <Route path="/" element={<Home />} />

        <Route path="/register" element={<Register />} />
        <Route path="/login" element={<Login />} />

        <Route
          path="/customer"
          element={
            <ProtectedRoute roles={["customer"]}>
              <CustomerDashboard />
            </ProtectedRoute>
          }
        />

        <Route
          path="/staff"
          element={
            <ProtectedRoute roles={["staff"]}>
              <StaffDashboard />
            </ProtectedRoute>
          }
        />

        <Route
          path="/admin"
          element={
            <ProtectedRoute roles={["admin"]}>
              <AdminDashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/menu"
          element={
            <ProtectedRoute roles={["admin"]}>
              <AdminMenu />
            </ProtectedRoute>
          }
        />
        <Route
          path="/menu"
          element={
            <ProtectedRoute roles={["customer"]}>
              <CustomerMenu />
            </ProtectedRoute>
          }
        />
        <Route
          path="/cart"
          element={
            <ProtectedRoute roles={["customer"]}>
              <Cart />
            </ProtectedRoute>
          }
        />
        <Route
          path="/order-success"
          element={
            <ProtectedRoute roles={["customer"]}>
              <OrderSuccess />
            </ProtectedRoute>
          }
        />
        <Route
          path="/orders"
          element={
            <ProtectedRoute roles={["customer"]}>
              <MyOrders />
            </ProtectedRoute>
          }
        />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
