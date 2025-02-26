import { useState, useEffect } from "react";
import axios from "axios";

const Signup = () => {
  const [formData, setFormData] = useState({
    username: "",
    email_id: "",
    password: "",
    role: "user",
    company_name: "",
  });

  const [companies, setCompanies] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Fetch the list of existing companies
    axios
      .get(`${import.meta.env.VITE_API_URL}companies`)
      .then((res) => {
        console.log(res.data);
        setCompanies(res.data);
        setLoading(false);
      })
      .catch((err) => {
        console.error("Error fetching companies:", err);
        setLoading(false);
      });
  }, []);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      const res = await axios.post(
        `${import.meta.env.VITE_API_URL}users/signup`,
        formData,
        { withCredentials: true }
      );
      alert(res.data.message);
    } catch (err) {
      console.error(err);
      alert("Signup failed. Check console for details.");
    }
  };

  return (
    <div className="max-w-md mx-auto mt-10 p-6 bg-white shadow-lg rounded-lg">
      <h2 className="text-2xl font-bold mb-4 text-center">Signup</h2>

      <form onSubmit={handleSubmit}>
        <div className="mb-4">
          <label className="block font-semibold">Username:</label>
          <input
            type="text"
            name="username"
            value={formData.username}
            onChange={handleChange}
            className="w-full px-3 py-2 border rounded-lg"
            required
          />
        </div>

        <div className="mb-4">
          <label className="block font-semibold">Email:</label>
          <input
            type="email"
            name="email_id"
            value={formData.email_id}
            onChange={handleChange}
            className="w-full px-3 py-2 border rounded-lg"
            required
          />
        </div>

        <div className="mb-4">
          <label className="block font-semibold">Password:</label>
          <input
            type="password"
            name="password"
            value={formData.password}
            onChange={handleChange}
            className="w-full px-3 py-2 border rounded-lg"
            required
          />
        </div>

        <div className="mb-4">
          <label className="block font-semibold">Role:</label>
          <select
            name="role"
            value={formData.role}
            onChange={handleChange}
            className="w-full px-3 py-2 border rounded-lg"
            required
          >
            <option value="user">User</option>
            <option value="admin">Admin</option>
          </select>
        </div>

        {/* Show Company Selection Based on Role */}
        {formData.role === "admin" ? (
          <div className="mb-4">
            <label className="block font-semibold">Add Company:</label>
            <input
              type="text"
              name="company_name"
              value={formData.company_name}
              onChange={handleChange}
              className="w-full px-3 py-2 border rounded-lg"
              placeholder="Enter new company name"
              required
            />
          </div>
        ) : (
          <div className="mb-4">
            <label className="block font-semibold">Select Company:</label>
            {loading ? (
              <p>Loading companies...</p>
            ) : (
              <select
                name="company_name"
                value={formData.company_name}
                onChange={handleChange}
                className="w-full px-3 py-2 border rounded-lg"
                required
              >
                <option value="">-- Select a company --</option>
                {companies.map((company) => (
                  <option key={company._id} value={company.company_name}>
                    {company.company_name}
                  </option>
                ))}
              </select>
            )}
          </div>
        )}

        <button
          type="submit"
          className="w-full bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 transition"
        >
          Signup
        </button>
      </form>
    </div>
  );
};

export default Signup;
