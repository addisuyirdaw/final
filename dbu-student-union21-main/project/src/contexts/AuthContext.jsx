import React, { createContext, useContext, useState, useEffect } from "react";
import { apiService } from "../services/api";
import toast from "react-hot-toast";

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};

const isTokenExpired = (token) => {
  try {
    if (!token) return true;
    const parts = token.split('.');
    if (parts.length !== 3) return true;
    let base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    while (base64.length % 4) {
      base64 += '=';
    }
    const payload = JSON.parse(atob(base64));
    if (!payload.exp) return false;
    const currentTime = Math.floor(Date.now() / 1000);
    return payload.exp < currentTime;
  } catch (err) {
    return true;
  }
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // 1. Initial user session load (runs once on mount)
    try {
      const savedUser = localStorage.getItem("user");
      if (savedUser) {
        const userData = JSON.parse(savedUser);
        if (userData.token && isTokenExpired(userData.token)) {
          // Clean up expired session
          localStorage.removeItem("user");
          localStorage.removeItem("token");
          sessionStorage.clear();
        } else {
          setUser(userData);
        }
      }
    } catch {
      localStorage.removeItem("user");
      localStorage.removeItem("token");
      sessionStorage.clear();
    }
    setLoading(false);

    // 2. Snappy auto-logout check (runs every 5 seconds without triggering state updates if valid)
    const interval = setInterval(() => {
      try {
        const token = localStorage.getItem("token");
        if (token && isTokenExpired(token)) {
          console.warn("Session expired - auto logging out");
          setUser(null);
          localStorage.removeItem("user");
          localStorage.removeItem("token");
          sessionStorage.removeItem("user");
          sessionStorage.removeItem("token");
          sessionStorage.clear();
          if (!window.location.pathname.includes('/login')) {
            window.location.href = "/login";
          }
        }
      } catch (err) {
        console.error("Auto-logout check error:", err);
      }
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  const login = async (username, password) => {
    try {
      setLoading(true);
      const response = await apiService.login({ username, password });

      const studentUser = {
        ...response.user,
        token: response.token,
        isAdmin: response.user.role === "admin" || response.user.isAdmin,
      };

      localStorage.setItem("user", JSON.stringify(studentUser));
      localStorage.setItem("token", response.token);
      setUser(studentUser);

      // If the backend says this user is restricted, redirect immediately
      if (studentUser.isRestricted) {
        window.location.href = "/blocked";
        return;
      }

      return studentUser;
    } catch (error) {
      // Handle restricted account — blocked at login
      if (error.response?.data?.isRestricted || error.status === 403) {
        const reason = error.response?.data?.reason || "Violation of community guidelines";
        // Store minimal info for the blocked page to display the reason
        localStorage.setItem("user", JSON.stringify({ isRestricted: true, restrictionReason: reason }));
        window.location.href = "/blocked";
        return;
      }
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const adminLogin = async (username, password) => {
    try {
      setLoading(true);
      const response = await apiService.adminLogin({ username, password });

      if (!response.user.isAdmin && response.user.role !== "admin") {
        throw new Error("You do not have admin privileges");
      }

      const adminUser = {
        ...response.user,
        token: response.token,
        isAdmin: true,
      };

      localStorage.setItem("user", JSON.stringify(adminUser));
      localStorage.setItem("token", response.token);
      setUser(adminUser);

      return adminUser;
    } catch (error) {
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const register = async (userData) => {
    try {
      setLoading(true);
      const response = await apiService.register(userData);

      const newUser = {
        ...response.user,
        token: response.token,
        isAdmin: false,
      };

      localStorage.setItem("user", JSON.stringify(newUser));
      localStorage.setItem("token", response.token);
      setUser(newUser);

      return newUser;
    } catch (error) {
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem("user");
    localStorage.removeItem("token");
    toast.success("Logged out successfully");
  };

  const updateUserSession = (updatedFields) => {
    try {
      const savedUser = localStorage.getItem("user");
      if (savedUser) {
        const userData = JSON.parse(savedUser);
        const newUserData = { ...userData, ...updatedFields };
        localStorage.setItem("user", JSON.stringify(newUserData));
        setUser(newUserData);
      }
    } catch (err) {
      console.error("Failed to update user session:", err);
    }
  };

  const value = {
    user,
    loading,
    login,
    adminLogin,
    register,
    logout,
    updateUserSession,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
