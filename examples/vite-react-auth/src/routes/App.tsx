import React from "react";
import { Link, Route, Routes } from "react-router-dom";

import { Admin } from "./Admin";
import { Home } from "./Home";
import { Login } from "./Login";
import { Me } from "./Me";

export function App(): React.ReactElement {
  return (
    <div style={{ fontFamily: "system-ui", padding: 24 }}>
      <nav style={{ display: "flex", gap: 12, marginBottom: 16 }}>
        <Link to="/">Home</Link>
        <Link to="/login">Login</Link>
        <Link to="/me">Me</Link>
        <Link to="/admin">Admin</Link>
      </nav>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/login" element={<Login />} />
        <Route path="/me" element={<Me />} />
        <Route path="/admin" element={<Admin />} />
      </Routes>
    </div>
  );
}

