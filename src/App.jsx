import React from "react";
import { Route, Routes, Navigate, useNavigate } from "react-router-dom";
import "./index.css";
import axios from "axios";
import { jwtDecode } from "jwt-decode";
import { useAuth } from "./store/auth";
import NotFound from "./pages/auth/404";
import Login from "./pages/auth/login";
import MainLayout from "./pages/MainLayout";

function App() {
  const navigate = useNavigate();
  axios.defaults.baseURL = import.meta.env.VITE_API_URL;

  const { loginResponse } = useAuth();
  let role;
  let decoded;

  if (loginResponse) {
    const token = loginResponse;

    axios.defaults.headers.common["Authorization"] = `Bearer ${token}`;

    decoded = jwtDecode(token);

    const currentTime = Date.now() / 1000;
    if (decoded.exp < currentTime) {
      localStorage.removeItem("ecoBot");
      setTimeout(() => {
        navigate("/");
        window.location.reload();
      }, 100);
    }
  }

  role = decoded?.role;

  if (role) {
    return (
      <>
        <Routes>
          <Route exact path="/" element={<MainLayout />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </>
    );
  }

  return (
    <>
      <Routes>
        <Route exact path="/" element={<Login />} />
        <Route path="/*" element={<NotFound />} />
      </Routes>
    </>
  );
}

export default App;
