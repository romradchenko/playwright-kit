import React, { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

function setRole(role: string): void {
  window.localStorage.setItem("role", role);
}

export function Login(): React.ReactElement {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const roleFromEmail = useMemo(() => {
    const normalized = email.trim().toLowerCase();
    if (normalized.startsWith("admin")) return "admin";
    if (normalized.startsWith("user")) return "user";
    return "user";
  }, [email]);

  return (
    <div>
      <h1>Login</h1>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (!password) return;
          setRole(roleFromEmail);
          navigate(roleFromEmail === "admin" ? "/admin" : "/me");
        }}
        style={{ display: "grid", gap: 12, maxWidth: 320 }}
      >
        <label htmlFor="email">Email</label>
        <input
          id="email"
          name="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <label htmlFor="password">Password</label>
        <input
          id="password"
          name="password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        <button type="submit">Sign in</button>
      </form>
    </div>
  );
}

