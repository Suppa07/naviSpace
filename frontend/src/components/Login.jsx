// src/components/Login.jsx
import React, { useState } from "react";
import { useNavigate } from "react-router-dom";

const Login = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const navigate = useNavigate(); // React Router hook for navigation

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Add validation (ensure email and password are provided)
    if (!email || !password) {
      setError("Please fill in both fields.");
      return;
    }

    try {
      const response = await fetch(
        `${import.meta.env.VITE_API_URL}users/login`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ email, password }),
          credentials: "include", 
        }
      );

      const data = await response.json();

      if (response.ok) {
        // Success: Navigate to the dashboard or home page
        if (response.ok) {
          // localStorage.setItem("token", data.token);
          
          navigate("/contact");
        }
      } else {
        // Error: Show error message
        setError(data.message || "Login failed");
      }
    } catch (err) {
      console.error("Login failed", err);
      setError("An error occurred during login.");
    }
  };

  return (
    <div className="login-container">
      <h2>Login</h2>
      {error && <p className="error-message">{error}</p>}
      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label htmlFor="email">Email:</label>
          <input
            type="email"
            id="email"
            name="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </div>
        <div className="form-group">
          <label htmlFor="password">Password:</label>
          <input
            type="password"
            id="password"
            name="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </div>
        <button type="submit">Login</button>
      </form>
    </div>
  );
};

export default Login;
