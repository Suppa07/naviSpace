import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";

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
      const response = await axios.post(
        `${import.meta.env.VITE_API_URL}auth/login`,
        { email_id: email, password },
        { withCredentials: true }
      );

      // Redirect based on role
      if (response.data.role === "admin") {
        navigate("/admin");
      } else {
        navigate("/user");
      }
    } catch (err) {
      console.error(err);
      setError("Invalid email or password.");
    }
  };

  return (
    <div className="max-w-md mx-auto mt-10 p-6 bg-white shadow-lg rounded-lg">
      <h2 className="text-2xl font-bold mb-4 text-center">Login</h2>
      {error && <div className="alert alert-danger">{error}</div>}
      <form onSubmit={handleSubmit}>
        <div className="mb-4">
          <label className="block font-semibold">Email:</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full px-3 py-2 border rounded-lg"
            required
          />
        </div>
        <div className="mb-4">
          <label className="block font-semibold">Password:</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full px-3 py-2 border rounded-lg"
            required
          />
        </div>
        <button type="submit" className="w-full bg-blue-500 text-white py-2 rounded-lg">
          Login
        </button>
      </form>
    </div>
  );
};

export default Login;
