import { useState, useEffect } from "react";
import axios from "axios";
import { Card, Button, Form, Alert, Row, Col, Modal } from 'react-bootstrap';

const FloorPlanManagement = () => {
  const [floorPlans, setFloorPlans] = useState([]);
  const [selectedFile, setSelectedFile] = useState(null);
  const [selectedFloor, setSelectedFloor] = useState(null);
  const [showResourceModal, setShowResourceModal] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  
  const [newResource, setNewResource] = useState({
    name: "",
    type: "",
    location: { x: "", y: "" },
    capacity: "",
    amenities: "",
  });

  const API_URL = import.meta.env.VITE_API_URL;

  useEffect(() => {
    fetchFloorPlans();
  }, []);

  const fetchFloorPlans = async () => {
    setLoading(true);
    try {
      const res = await axios.get(`${API_URL}admin/floorplans`, {
        withCredentials: true,
      });
      setFloorPlans(res.data);
      setError("");
    } catch (err) {
      console.error("Error fetching floor plans:", err);
      setError("Failed to load floor plans. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleUploadFloorPlan = async () => {
    if (!selectedFile) {
      setError("Please select a file first");
      return;
    }
    
    const formData = new FormData();
    formData.append("floorPlan", selectedFile);
    formData.append("name", selectedFile.name.split('.')[0]);
    
    try {
      await axios.post(`${API_URL}admin/floor-plan`, formData, {
        headers: { "Content-Type": "multipart/form-data" },
        withCredentials: true,
      });
      
      setSuccessMessage("Floor plan uploaded successfully!");
      setTimeout(() => setSuccessMessage(""), 3000);
      
      setSelectedFile(null);
      fetchFloorPlans();
    } catch (err) {
      console.error("Error uploading floor plan:", err);
      setError("Failed to upload floor plan. Please try again.");
    }
  };

  const handleAddResource = async () => {
    try {
      if (!selectedFloor) {
        setError("Please select a floor first");
        return;
      }
      
      if (!newResource.name || !newResource.type) {
        setError("Name and type are required");
        return;
      }
      
      const resourceData = {
        name: newResource.name,
        resource_type: newResource.type,
        floor_id: selectedFloor._id,
        location: [
          parseFloat(newResource.location.x) || 0,
          parseFloat(newResource.location.y) || 0,
        ],
        capacity: parseInt(newResource.capacity, 10) || 1,
        amenities: newResource.amenities
          ? newResource.amenities.split(",").map((item) => item.trim())
          : [],
      };

      await axios.post(`${API_URL}admin/resources`, resourceData, {
        withCredentials: true,
      });

      setSuccessMessage("Resource added successfully!");
      setTimeout(() => setSuccessMessage(""), 3000);
      
      setNewResource({
        name: "",
        type: "",
        location: { x: "", y: "" },
        capacity: "",
        amenities: "",
      });
      
      setShowResourceModal(false);
    } catch (err) {
      console.error("Error adding resource:", err);
      setError("Failed to add resource. Please try again.");
    }
  };
  
  const openAddResourceModal = (floor) => {
    setSelectedFloor(floor);
    setShowResourceModal(true);
  };
  
  const closeResourceModal = () => {
    setShowResourceModal(false);
    setSelectedFloor(null);
    setNewResource({
      name: "",
      type: "",
      location: { x: "", y: "" },
      capacity: "",
      amenities: "",
    });
    setError("");
  };

  return (
    <>
      {successMessage && (
        <Alert variant="success" className="mb-4">
          {successMessage}
        </Alert>
      )}
      
      <Card className="shadow-sm mb-4">
        <Card.Body>
          <h3 className="mb-4">Upload New Floor Plan</h3>
          <Form>
            <Form.Group controlId="formFile" className="mb-3">
              <Form.Label>Select floor plan image</Form.Label>
              <Form.Control 
                type="file" 
                onChange={(e) => setSelectedFile(e.target.files[0])} 
                accept="image/*"
              />
              <Form.Text className="text-muted">
                Upload a PNG or JPG image of your floor plan.
              </Form.Text>
            </Form.Group>
            <Button 
              variant="primary" 
              onClick={handleUploadFloorPlan}
              disabled={!selectedFile}
            >
              <i className="bi bi-cloud-upload me-1"></i> Upload Floor Plan
            </Button>
          </Form>
        </Card.Body>
      </Card>
      
      <Card className="shadow-sm">
        <Card.Body>
          <h3 className="mb-4">Existing Floor Plans</h3>
          
          {loading ? (
            <div className="text-center py-4">
              <div className="spinner-border text-primary" role="status">
                <span className="visually-hidden">Loading...</span>
              </div>
              <p className="mt-2">Loading floor plans...</p>
            </div>
          ) : error ? (
            <Alert variant="danger">{error}</Alert>
          ) : floorPlans.length === 0 ? (
            <Alert variant="info">
              No floor plans have been uploaded yet.
            </Alert>
          ) : (
            <Row xs={1} md={2} lg={3} className="g-4">
              {floorPlans.map((plan) => (
                <Col key={plan._id}>
                  <Card className="h-100">
                    <Card.Img 
                      variant="top" 
                      src={`${API_URL}${plan.layout_url}`} 
                      alt={plan.name}
                      style={{ height: '180px', objectFit: 'cover' }}
                    />
                    <Card.Body>
                      <Card.Title>{plan.name}</Card.Title>
                      <div className="d-flex mt-3">
                        <Button 
                          variant="outline-primary" 
                          className="me-2"
                          onClick={() => window.open(`${API_URL}${plan.layout_url}`, "_blank")}
                        >
                          <i className="bi bi-eye me-1"></i> View
                        </Button>
                        <Button 
                          variant="success"
                          onClick={() => openAddResourceModal(plan)}
                        >
                          <i className="bi bi-plus-circle me-1"></i> Add Resource
                        </Button>
                      </div>
                    </Card.Body>
                  </Card>
                </Col>
              ))}
            </Row>
          )}
        </Card.Body>
      </Card>
      
      {/* Add Resource Modal */}
      <Modal show={showResourceModal} onHide={closeResourceModal} size="lg">
        <Modal.Header closeButton>
          <Modal.Title>
            Add Resource to {selectedFloor?.name}
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {error && <Alert variant="danger">{error}</Alert>}
          
          <Form>
            <Row>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Resource Name</Form.Label>
                  <Form.Control
                    type="text"
                    placeholder="e.g., Desk A1, Meeting Room 3"
                    value={newResource.name}
                    onChange={(e) => setNewResource({ ...newResource, name: e.target.value })}
                    required
                  />
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Resource Type</Form.Label>
                  <Form.Select
                    value={newResource.type}
                    onChange={(e) => setNewResource({ ...newResource, type: e.target.value })}
                    required
                  >
                    <option value="">Select type</option>
                    <option value="desk">Desk</option>
                    <option value="meeting room">Meeting Room</option>
                    <option value="parking spot">Parking Spot</option>
                  </Form.Select>
                </Form.Group>
              </Col>
            </Row>
            
            <Row>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Capacity</Form.Label>
                  <Form.Control
                    type="number"
                    placeholder="Number of people"
                    value={newResource.capacity}
                    onChange={(e) => setNewResource({ ...newResource, capacity: e.target.value })}
                    min="1"
                  />
                  <Form.Text className="text-muted">
                    For desks, typically 1. For meeting rooms, the number of seats.
                  </Form.Text>
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Amenities (comma-separated)</Form.Label>
                  <Form.Control
                    type="text"
                    placeholder="e.g., Projector, Whiteboard, Monitor"
                    value={newResource.amenities}
                    onChange={(e) => setNewResource({ ...newResource, amenities: e.target.value })}
                  />
                </Form.Group>
              </Col>
            </Row>
            
            <Row>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>X Coordinate</Form.Label>
                  <Form.Control
                    type="number"
                    placeholder="X position on floor plan"
                    value={newResource.location.x}
                    onChange={(e) => setNewResource({
                      ...newResource,
                      location: { ...newResource.location, x: e.target.value },
                    })}
                  />
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Y Coordinate</Form.Label>
                  <Form.Control
                    type="number"
                    placeholder="Y position on floor plan"
                    value={newResource.location.y}
                    onChange={(e) => setNewResource({
                      ...newResource,
                      location: { ...newResource.location, y: e.target.value },
                    })}
                  />
                </Form.Group>
              </Col>
            </Row>
          </Form>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={closeResourceModal}>
            Cancel
          </Button>
          <Button variant="success" onClick={handleAddResource}>
            Add Resource
          </Button>
        </Modal.Footer>
      </Modal>
    </>
  );
};

export default FloorPlanManagement;