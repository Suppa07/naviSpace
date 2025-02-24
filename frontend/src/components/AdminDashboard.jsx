import { useState, useEffect } from "react";
import axios from "axios";

const AdminDashboard = () => {
  const [users, setUsers] = useState([]);
  const [resources, setResources] = useState([]);
  const [reservations, setReservations] = useState([]);
  const [floorPlans, setFloorPlans] = useState([]);
  const [selectedFile, setSelectedFile] = useState(null);
  const [newResource, setNewResource] = useState({ name: "", type: "" });
  
  const API_URL = import.meta.env.VITE_API_URL;

  useEffect(() => {
    fetchUsers();
    fetchResources();
    fetchFloorPlans();
  }, []);

  const fetchUsers = async () => {
    try {
      const res = await axios.get(`${API_URL}/admin/users`);
      setUsers(res.data);
    } catch (err) {
      console.error("Error fetching users:", err);
    }
  };

  const fetchResources = async () => {
    try {
      const res = await axios.get(`${API_URL}/admin/resources`);
      setResources(res.data.resources);
      setReservations(res.data.reservations);
    } catch (err) {
      console.error("Error fetching resources:", err);
    }
  };

  const fetchFloorPlans = async () => {
    try {
      const res = await axios.get(`${API_URL}/admin/floorplans`);
      setFloorPlans(res.data);
    } catch (err) {
      console.error("Error fetching floor plans:", err);
    }
  };

  const handleReserveResource = async (resourceId, userId) => {
    try {
      await axios.post(`${API_URL}/admin/reserve`, { resourceId, userId });
      alert("Resource reserved successfully");
      fetchResources();
    } catch (err) {
      console.error("Error reserving resource:", err);
    }
  };

  const handleAddResource = async () => {
    try {
      await axios.post(`${API_URL}/admin/resources`, newResource);
      alert("Resource added successfully");
      setNewResource({ name: "", type: "" });
      fetchResources();
    } catch (err) {
      console.error("Error adding resource:", err);
    }
  };

  const handleRemoveUser = async (userId) => {
    try {
      await axios.delete(`${API_URL}/admin/users/${userId}`);
      alert("User removed successfully");
      fetchUsers();
    } catch (err) {
      console.error("Error removing user:", err);
    }
  };

  const handleUploadFloorPlan = async () => {
    const formData = new FormData();
    formData.append("floorPlan", selectedFile);
    try {
      await axios.post(`${API_URL}/admin/floorplans`, formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      alert("Floor plan uploaded successfully");
      fetchFloorPlans();
    } catch (err) {
      console.error("Error uploading floor plan:", err);
    }
  };

  return (
    <div>
      <h1>Admin Dashboard</h1>
      <h2>Users</h2>
      <ul>
        {users.map((user) => (
          <li key={user._id}>
            {user.username} ({user.email})
            <button onClick={() => handleRemoveUser(user._id)}>Remove</button>
          </li>
        ))}
      </ul>

      <h2>Resources & Reservations</h2>
      <ul>
        {resources.map((resource) => (
          <li key={resource._id}>
            {resource.name} ({resource.type})
            <button onClick={() => handleReserveResource(resource._id, users[0]?._id)}>Reserve</button>
          </li>
        ))}
      </ul>

      <h2>Add Resource</h2>
      <input
        type="text"
        placeholder="Resource Name"
        value={newResource.name}
        onChange={(e) => setNewResource({ ...newResource, name: e.target.value })}
      />
      <input
        type="text"
        placeholder="Resource Type"
        value={newResource.type}
        onChange={(e) => setNewResource({ ...newResource, type: e.target.value })}
      />
      <button onClick={handleAddResource}>Add</button>

      <h2>Upload Floor Plan</h2>
      <input type="file" onChange={(e) => setSelectedFile(e.target.files[0])} />
      <button onClick={handleUploadFloorPlan}>Upload</button>

      <h2>Floor Plans</h2>
      <ul>
        {floorPlans.map((plan) => (
          <li key={plan._id}>
            <img src={plan.url} alt="Floor Plan" width={200} />
          </li>
        ))}
      </ul>
    </div>
  );
};

export default AdminDashboard;
