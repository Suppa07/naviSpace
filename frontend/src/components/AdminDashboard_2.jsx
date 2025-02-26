import { useState, useEffect } from "react";
import axios from "axios";

const AdminDashboard = () => {
  const [users, setUsers] = useState([]);
  const [resources, setResources] = useState([]);
  const [reservations, setReservations] = useState([]);
  const [floorPlans, setFloorPlans] = useState([]);
  const [selectedFile, setSelectedFile] = useState(null);
  const [selectedUsers, setSelectedUsers] = useState([]); // State for selected users

  const [newResource, setNewResource] = useState({
    name: "",
    type: "",
    location: "",
    capacity: "",
    amenities: "",
  });

  const API_URL = import.meta.env.VITE_API_URL;

  useEffect(() => {
    fetchUsers();
    fetchResources();
    fetchFloorPlans();
  }, []);

  useEffect(() => {
    fetchUsers();
    fetchResources();
  }, []);

  const fetchUsers = async () => {
    try {
      const res = await axios.get(`${API_URL}admin/users`, {
        withCredentials: true,
      });
      setUsers(res.data);
    } catch (err) {
      console.error("Error fetching users:", err);
    }
  };

  const fetchResources = async () => {
    try {
      const res = await axios.get(`${API_URL}admin/resources`, {
        withCredentials: true,
      });
      setResources(res.data.resources);
      setReservations(res.data.reservations);
    } catch (err) {
      console.error("Error fetching resources:", err);
    }
  };

  const fetchFloorPlans = async () => {
    try {
      const res = await axios.get(`${API_URL}admin/floorplans`, {
        withCredentials: true,
      });
      setFloorPlans(res.data);
    } catch (err) {
      console.error("Error fetching floor plans:", err);
    }
  };

  const handleReserveResource = async (resourceId) => {
    if (selectedUsers.length === 0) {
      alert("Please select at least one user.");
      return;
    }

    try {
      await axios.post(
        `${API_URL}admin/reserve`,
        { resourceId, userIds: selectedUsers },
        { withCredentials: true }
      );

      alert("Resource reserved successfully");
      fetchResources();
    } catch (err) {
      console.error("Error reserving resource:", err);
      alert("Failed to reserve resource.");
    }
  };

  const handleAddResource = async (floorId) => {
    try {
      const resourceData = {
        name: newResource.name,
        resource_type: newResource.type,
        floor_id: floorId,
        location: [
          parseFloat(newResource.location.x),
          parseFloat(newResource.location.y),
        ], // Ensure tuple format
        capacity: parseInt(newResource.capacity, 10),
        amenities: newResource.amenities
          ? newResource.amenities.split(",").map((item) => item.trim())
          : [],
      };

      await axios.post(`${API_URL}admin/resources`, resourceData, {
        withCredentials: true,
      });

      alert("Resource added successfully");
      setNewResource({
        name: "",
        type: "",
        location: { x: "", y: "" },
        capacity: "",
        amenities: "",
      });

      fetchResources();
    } catch (err) {
      console.error("Error adding resource:", err);
    }
  };

  const handleRemoveUser = async (userId) => {
    try {
      await axios.delete(`${API_URL}admin/users/${userId}`, {
        withCredentials: true,
      });
      alert("User removed successfully");
      fetchUsers();
    } catch (err) {
      console.error("Error removing user:", err);
    }
  };

  const handleUploadFloorPlan = async () => {
    const formData = new FormData();
    formData.append("floorPlan", selectedFile);
    formData.append("name", selectedFile.name);
    try {
      await axios.post(`${API_URL}admin/floor-plan`, formData, {
        headers: { "Content-Type": "multipart/form-data" },
        withCredentials: true,
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
            {/* Multi-select dropdown for users */}
            <select
              multiple
              value={selectedUsers}
              onChange={(e) =>
                setSelectedUsers(
                  [...e.target.selectedOptions].map((o) => o.value)
                )
              }
            >
              {users.map((user) => (
                <option key={user._id} value={user._id}>
                  {user.username} ({user.email})
                </option>
              ))}
            </select>
            <button onClick={() => handleReserveResource(resource._id)}>
              Reserve
            </button>
          </li>
        ))}
      </ul>

      <h2>Upload Floor Plan</h2>
      <input type="file" onChange={(e) => setSelectedFile(e.target.files[0])} />
      <button onClick={handleUploadFloorPlan}>Upload</button>

      <h2>Floor Plans</h2>
      <ul>
        {floorPlans.map((plan) => (
          <li key={plan._id}>
            <strong>{plan.name}</strong>
            <button
              onClick={() =>
                window.open(`${API_URL}${plan.layout_url}`, "_blank")
              }
            >
              View Floor Plan
            </button>

            {/* Add Resource after each floor */}
            <h3>Add Resource to {plan.name}</h3>
            <input
              type="text"
              placeholder="Resource Name"
              value={newResource.name}
              onChange={(e) =>
                setNewResource({ ...newResource, name: e.target.value })
              }
            />
            <input
              type="text"
              placeholder="Resource Type"
              value={newResource.type}
              onChange={(e) =>
                setNewResource({ ...newResource, type: e.target.value })
              }
            />
            <input
              type="number"
              placeholder="X Coordinate"
              value={newResource.location.x}
              onChange={(e) =>
                setNewResource({
                  ...newResource,
                  location: { ...newResource.location, x: e.target.value },
                })
              }
            />
            <input
              type="number"
              placeholder="Y Coordinate"
              value={newResource.location.y}
              onChange={(e) =>
                setNewResource({
                  ...newResource,
                  location: { ...newResource.location, y: e.target.value },
                })
              }
            />
            <input
              type="number"
              placeholder="Capacity"
              value={newResource.capacity}
              onChange={(e) =>
                setNewResource({ ...newResource, capacity: e.target.value })
              }
            />
            <input
              type="text"
              placeholder="Amenities (comma-separated)"
              value={newResource.amenities}
              onChange={(e) =>
                setNewResource({ ...newResource, amenities: e.target.value })
              }
            />
            <button onClick={() => handleAddResource(plan._id)}>Add</button>
          </li>
        ))}
      </ul>
    </div>
  );
};

export default AdminDashboard;
