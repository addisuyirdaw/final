import React, { useState } from "react";
import { Link } from "react-router-dom";
import { Eye, EyeOff, User, Lock, KeyRound } from "lucide-react";
import { useAuth } from "../../contexts/AuthContext";
import { motion } from "framer-motion";
import toast from "react-hot-toast";

export function LoginForm() {
  const [formData, setFormData] = useState({
    username: "",
    password: "",
  });
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [showRegister, setShowRegister] = useState(false);
  const [registerData, setRegisterData] = useState({
    username: "",
    password: "",
    confirmPassword: "",
    name: "",
    department: "",
    year: "",
    phoneNumber: "",
    email: "",
  });

  const { login, register } = useAuth();

  const validateUsername = (username) => {
    const regex = /^dbu\d{8}$/i;
    return regex.test(username);
  };

  const validatePassword = (password) => {
    const minLength = 8;
    const hasUpperCase = /[A-Z]/.test(password);
    const hasLowerCase = /[a-z]/.test(password);
    const hasNumbers = /\d/.test(password);
    const hasSymbols = /[!@#$%^&*(),.?":{}|<>]/.test(password);
    return (
      password.length >= minLength &&
      hasUpperCase &&
      hasLowerCase &&
      hasNumbers &&
      hasSymbols
    );
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      if (!validateUsername(formData.username)) {
        toast.error(
          "Username must start with 'dbu' followed by 8 digits (e.g., dbu10304058)"
        );
        setIsLoading(false);
        return;
      }

      // Don't validate password format during login - just check if it's not empty
      if (!formData.password || formData.password.length < 1) {
        toast.error("Please enter your password");
        setIsLoading(false);
        return;
      }

      const result = await login(formData.username, formData.password);

      if (result && result.isAdmin) {
        toast.success("Admin login successful");
      } else {
        toast.success("Login successful");
      }
      
      setTimeout(() => {
        window.location.href = "/";
      }, 500);
    } catch (error) {
      toast.error(error.message || "Invalid credentials");
    } finally {
      setIsLoading(false);
    }
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      if (!validateUsername(registerData.username)) {
        toast.error(
          "Username must start with 'dbu' followed by 8 digits (e.g., dbu10304058)"
        );
        setIsLoading(false);
        return;
      }

      if (!validatePassword(registerData.password)) {
        toast.error(
          "Password must be at least 8 characters with uppercase, lowercase, digit, and symbol"
        );
        setIsLoading(false);
        return;
      }

      if (registerData.password !== registerData.confirmPassword) {
        toast.error("Passwords do not match");
        setIsLoading(false);
        return;
      }

      if (!registerData.name || !registerData.department || !registerData.year) {
        toast.error("Please fill all required fields");
        setIsLoading(false);
        return;
      }

      await register({
        username: registerData.username,
        password: registerData.password,
        name: registerData.name,
        department: registerData.department,
        year: registerData.year,
        phoneNumber: registerData.phoneNumber,
        email: registerData.email,
      });
      toast.success("Registration successful");
      
      setTimeout(() => {
        window.location.href = "/";
      }, 500);
    } catch (error) {
      toast.error(error.message || "Registration failed");
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputChange = (e) => {
    let { name, value } = e.target;
    if (name === "username") {
      value = value.toLowerCase();
    }
    if (showRegister) {
      setRegisterData((prev) => ({ ...prev, [name]: value }));
    } else {
      setFormData((prev) => ({ ...prev, [name]: value }));
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-white to-blue-50 px-4 sm:px-6 lg:px-8">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="max-w-md w-full space-y-8"
      >
        {/* Header */}
        <div className="text-center">
          <motion.div
            initial={{ scale: 0.8 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
            className="mx-auto w-24 h-24 flex items-center justify-center mb-6"
          >
            <img
              src="/images/dblogo.png"
              alt="DBU Logo"
              className="w-full h-full object-contain rounded-2xl shadow-md hover:scale-105 transition-transform duration-300"
            />
          </motion.div>

          <div>
            <h2 className="text-3xl font-bold text-gray-900 mb-2">
              {showRegister ? "Register" : "Login"}
            </h2>
            <p className="text-gray-600">
              {showRegister
                ? "Create your account"
                : "Please enter your credentials"}
            </p>
          </div>
        </div>

        {/* Form */}
        <motion.form
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="space-y-6"
          onSubmit={showRegister ? handleRegister : handleSubmit}
        >
          {/* Username */}
          <div>
            <label
              htmlFor="username"
              className="block text-sm font-medium text-gray-700 mb-2"
            >
              Username
            </label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                id="username"
                name="username"
                type="text"
                required
                maxLength={11}
                value={showRegister ? registerData.username : formData.username}
                onChange={handleInputChange}
                className="pl-10 w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                placeholder={showRegister ? "dbuXXXXXXXX" : ""}
              />
            </div>
            <p className="mt-1 text-xs text-gray-500">
              Must start with 'dbu' followed by 8 digits
            </p>
          </div>

          {/* Extra Fields for Registration */}
          {showRegister && (
            <>
              <div>
                <label
                  htmlFor="name"
                  className="block text-sm font-medium text-gray-700 mb-2"
                >
                  Full Name *
                </label>
                <input
                  id="name"
                  name="name"
                  type="text"
                  required
                  value={registerData.name}
                  onChange={handleInputChange}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                  placeholder="Your full name"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label
                    htmlFor="department"
                    className="block text-sm font-medium text-gray-700 mb-2"
                  >
                    Department *
                  </label>
                  <input
                    id="department"
                    name="department"
                    type="text"
                    required
                    value={registerData.department}
                    onChange={handleInputChange}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                    placeholder="Enter your department"
                  />
                </div>

                <div>
                  <label
                    htmlFor="year"
                    className="block text-sm font-medium text-gray-700 mb-2"
                  >
                    Year *
                  </label>
                  <select
                    id="year"
                    name="year"
                    required
                    value={registerData.year}
                    onChange={handleInputChange}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                  >
                    <option value="">Select Year</option>
                    <option value="1st Year">1st Year</option>
                    <option value="2nd Year">2nd Year</option>
                    <option value="3rd Year">3rd Year</option>
                    <option value="4th Year">4th Year</option>
                    <option value="5th Year">5th Year</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label
                    htmlFor="phoneNumber"
                    className="block text-sm font-medium text-gray-700 mb-2"
                  >
                    Phone Number
                  </label>
                  <input
                    id="phoneNumber"
                    name="phoneNumber"
                    type="tel"
                    value={registerData.phoneNumber}
                    onChange={handleInputChange}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                    placeholder="+251-AAA-AAA-AAA"
                  />
                </div>

                <div>
                  <label
                    htmlFor="email"
                    className="block text-sm font-medium text-gray-700 mb-2"
                  >
                    Email
                  </label>
                  <input
                    id="email"
                    name="email"
                    type="email"
                    value={registerData.email}
                    onChange={handleInputChange}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                    placeholder="DBU.email@dbu.edu.et"
                  />
                </div>
              </div>
            </>
          )}

          {/* Password */}
          <div>
            <label
              htmlFor="password"
              className="block text-sm font-medium text-gray-700 mb-2"
            >
              Password
            </label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                id="password"
                name="password"
                type={showPassword ? "text" : "password"}
                required
                value={showRegister ? registerData.password : formData.password}
                onChange={handleInputChange}
                className="pl-10 pr-10 w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                placeholder="••••••••"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                {showPassword ? (
                  <EyeOff className="w-5 h-5" />
                ) : (
                  <Eye className="w-5 h-5" />
                )}
              </button>
            </div>
            <p className="mt-1 text-xs text-gray-500">
              At least 8 characters with uppercase, lowercase, digit, and symbol
            </p>
          </div>

          {/* Confirm Password */}
          {showRegister && (
            <div>
              <label
                htmlFor="confirmPassword"
                className="block text-sm font-medium text-gray-700 mb-2"
              >
                Confirm Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                  id="confirmPassword"
                  name="confirmPassword"
                  type="password"
                  required
                  value={registerData.confirmPassword}
                  onChange={handleInputChange}
                  className="pl-10 w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                  placeholder=" "
                />
              </div>
            </div>
          )}

          {/* Submit */}
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            type="submit"
            disabled={isLoading}
            className="w-full py-3 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? (
              <div className="flex items-center justify-center">
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                Loading...
              </div>
            ) : showRegister ? (
              "Register"
            ) : (
              "Login"
            )}
          </motion.button>

          {/* Footer */}
          <div className="flex items-center justify-between">
            {!showRegister && (
              <Link
                to="/forgot-password"
                className="text-sm text-blue-600 hover:text-blue-700 font-medium flex items-center"
              >
                <KeyRound className="w-4 h-4 mr-1" />
                Forgot Password?
              </Link>
            )}
            <button
              type="button"
              onClick={() => setShowRegister(!showRegister)}
              className="text-sm text-blue-600 hover:text-blue-700 font-medium ml-auto"
            >
              {showRegister
                ? "Already have an account? Login"
                : "Don't have an account? Register"}
            </button>
          </div>
        </motion.form>
      </motion.div>
    </div>
  );
}
