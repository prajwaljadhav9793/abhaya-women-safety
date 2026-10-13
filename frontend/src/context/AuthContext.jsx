import React, { createContext, useContext, useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { api, tok } from "../api.js";

export const AuthContext = createContext(null);

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    return {
      user: null,
      setUser: () => {},
      login: () => {},
      logout: () => {},
      ready: true
    };
  }
  return ctx;
};

export const Tag = ({ s }) => (
  <span className={"badge b-" + (s || "default")}>
    {String(s || "").replace(/_/g, " ")}
  </span>
);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [ready, setReady] = useState(!tok());
  const navigate = useNavigate();

  useEffect(() => {
    if (tok()) {
      api("/auth/me")
        .then(d => setUser(d.user))
        .catch(() => {
          localStorage.removeItem("abhaya_token");
          setUser(null);
        })
        .finally(() => setReady(true));
    } else {
      setReady(true);
    }
  }, []);

  const login = (token, userData, redirectPath) => {
    localStorage.setItem("abhaya_token", token);
    setUser(userData);
    if (redirectPath) {
      navigate(redirectPath);
    } else if (userData?.role === "admin") {
      navigate("/admin");
    } else {
      navigate("/dashboard");
    }
  };

  const logout = () => {
    localStorage.removeItem("abhaya_token");
    setUser(null);
    navigate("/");
  };

  return (
    <AuthContext.Provider value={{ user, setUser, login, logout, ready }}>
      {children}
    </AuthContext.Provider>
  );
}

