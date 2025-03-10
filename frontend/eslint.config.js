import React, { useState } from 'react';
import axios from 'axios';

const FloorPlanManagement = () => {
  const [selectedFile, setSelectedFile] = useState(null);
  const [floorName, setFloorName] = useState("");
  const [floorNumber, setFloorNumber] = useState("");
  const [realx, setRealx] = useState("");
  const [realy, setRealy] = useState("");
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!floorNumber.trim()) {
      setError("Please enter a floor number.");
      return;
    }

    const formData = new FormData();
    formData.append("floorPlan", selectedFile);
    formData.append("name", floorName);
    formData.append("floor_number", floorNumber);
    formData.append("realx", realx);
    formData.append("realy", realy);
    try {
      await axios.post(`${API_URL}admin/floor-plan`, formData, {
        headers: { "Content-Type": "multipart/form-data" },
        withCredentials: true,
      });

      setSuccessMessage("Floor plan uploaded successfully!");
      setTimeout(() => setSuccessMessage(""), 3000);
      
      // Reset form
      setSelectedFile(null);
      setFloorName("");
      setFloorNumber("");
      setRealx("");
      setRealy("");
    } catch (error) {
      setError("Failed to upload floor plan.");
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <input type="file" onChange={(e) => setSelectedFile(e.target.files[0])} />
      <input type="text" value={floorName} onChange={(e) => setFloorName(e.target.value)} placeholder="Floor Name" />
      <input type="text" value={floorNumber} onChange={(e) => setFloorNumber(e.target.value)} placeholder="Floor Number" />
      <input type="text" value={realx} onChange={(e) => setRealx(e.target.value)} placeholder="Real X" />
      <input type="text" value={realy} onChange={(e) => setRealy(e.target.value)} placeholder="Real Y" />
      <button type="submit">Upload Floor Plan</button>
      {error && <p>{error}</p>}
      {successMessage && <p>{successMessage}</p>}
    </form>
  );
};

export default FloorPlanManagement;