import { useState, useEffect } from "react";
import axios from "axios";

const AdminDashboard = () => {
  const [users, setUsers] = useState([]);
  const [resources, setResources] = useState([]);
  const [reservations, setReservations] = useState([]);
  const [floorPlans, setFloorPlans] = useState([]);
  const [selectedFile, setSelectedFile] = useState(null);
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
    <div className="container mt-4">
      <h1 className="text-center">Admin Dashboard</h1>

      <h2 className="mt-4">Users</h2>
      <ul className="list-group">
        {users.map((user) => (
          <li key={user._id}>
            {user.username} ({user.email})
            
          </li>
        ))}
      </ul>

      <h2 className="mt-4">Resources & Reservations</h2>
      <ul className="list-group">
        {resources.map((resource) => (
          <li key={resource._id}>
            {resource.name} ({resource.type})
          </li>
        ))}
      </ul>

      <h2 className="mt-4">Upload Floor Plan</h2>
      <div className="mb-3">
        <input type="file" className="form-control" onChange={(e) => setSelectedFile(e.target.files[0])} />
      </div>
      <button className="btn btn-primary" onClick={handleUploadFloorPlan}>Upload</button>

      <h2 className="mt-4">Floor Plans</h2>
      <ul className="list-group">
        {floorPlans.map((plan) => (
          <li key={plan._id}>
            <strong>{plan.name}</strong>
            <button className="btn btn-link"
              onClick={() =>
                window.open(`${API_URL}${plan.layout_url}`, "_blank")
              }
            >
              View Floor Plan
            </button>

            {/* Add Resource after each floor */}
            <h3 className="mt-4">Add Resource to {plan.name}</h3>
            <input
              type="text"
              className="form-control mb-2"
              placeholder="Resource Name"
              value={newResource.name}
              onChange={(e) =>
                setNewResource({ ...newResource, name: e.target.value })
              }
            />
            <input
              type="text"
              className="form-control mb-2"
              placeholder="Resource Type"
              value={newResource.type}
              onChange={(e) =>
                setNewResource({ ...newResource, type: e.target.value })
              }
            />
            <input
              type="number"
              className="form-control mb-2"
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
              className="form-control mb-2"
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
              className="form-control mb-2"
              placeholder="Capacity"
              value={newResource.capacity}
              onChange={(e) =>
                setNewResource({ ...newResource, capacity: e.target.value })
              }
            />
            <input
              type="text"
              className="form-control mb-2"
              placeholder="Amenities (comma-separated)"
              value={newResource.amenities}
              onChange={(e) =>
                setNewResource({ ...newResource, amenities: e.target.value })
              }
            />
            <button className="btn btn-success" onClick={() => handleAddResource(plan._id)}>Add</button>
          </li>
        ))}
      </ul>
    </div>
  );
};

export default AdminDashboard;
