import { useState, useEffect, useRef } from "react";
import axios from "axios";
import { Card, Button, Form, Alert, Row, Col, Modal, Image } from 'react-bootstrap';

const FloorPlanManagement = () => {
  const [floorPlans, setFloorPlans] = useState([]);
  const [selectedFile, setSelectedFile] = useState(null);
  const [selectedFloor, setSelectedFloor] = useState(null);
  const [showResourceModal, setShowResourceModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [showMapSelector, setShowMapSelector] = useState(false);
  const [selectedPosition, setSelectedPosition] = useState({ x: null, y: null });
  const imageRef = useRef(null);
  
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
      
      if (!selectedPosition.x || !selectedPosition.y) {
        setError("Please select a location on the map");
        return;
      }
      
      const resourceData = {
        name: newResource.name,
        resource_type: newResource.type,
        floor_id: selectedFloor._id,
        location: [
          parseFloat(selectedPosition.x) || 0,
          parseFloat(selectedPosition.y) || 0,
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
      
      setSelectedPosition({ x: null, y: null });
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
    setSelectedPosition({ x: null, y: null });
    setShowMapSelector(false);
    setError("");
  };

  const openMapSelector = () => {
    setShowMapSelector(true);
  };

  const handleMapClick = (e) => {
    if (!imageRef.current) return;
    
    const rect = imageRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    // Calculate percentage positions (for responsive positioning)
    const xPercent = (x / rect.width) * 100;
    const yPercent = (y / rect.height) * 100;
    
    setSelectedPosition({ 
      x: xPercent.toFixed(2), 
      y: yPercent.toFixed(2) 
    });
    
    setNewResource({
      ...newResource,
      location: { 
        x: xPercent.toFixed(2), 
        y: yPercent.toFixed(2) 
      }
    });
  };

  const openDeleteModal = (floor) => {
    setSelectedFloor(floor);
    setShowDeleteModal(true);
  };

  const closeDeleteModal = () => {
    setShowDeleteModal(false);
    setSelectedFloor(null);
  };

  const handleDeleteFloorPlan = async () => {
    if (!selectedFloor) return;
    
    try {
      await axios.delete(`${API_URL}admin/floorplan/${selectedFloor._id}`, {
        withCredentials: true
      });
      
      setSuccessMessage("Floor plan deleted successfully!");
      setTimeout(() => setSuccessMessage(""), 3000);
      
      // Remove the deleted floor plan from the state
      setFloorPlans(floorPlans.filter(f => f._id !== selectedFloor._id));
      closeDeleteModal();
    } catch (error) {
      console.error("Error deleting floor plan:", error);
      setError("Failed to delete floor plan. Please try again.");
    }
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
                      <div className="d-flex mt-3 flex-wrap">
                        <Button 
                          variant="outline-primary" 
                          className="me-2 mb-2"
                          onClick={() => window.open(`${API_URL}${plan.layout_url}`, "_blank")}
                        >
                          <i className="bi bi-eye me-1"></i> View
                        </Button>
                        <Button 
                          variant="success"
                          className="me-2 mb-2"
                          onClick={() => openAddResourceModal(plan)}
                        >
                          <i className="bi bi-plus-circle me-1"></i> Add Resource
                        </Button>
                        <Button 
                          variant="danger"
                          className="mb-2"
                          onClick={() => openDeleteModal(plan)}
                        >
                          <i className="bi bi-trash me-1"></i> Delete
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
            
            <Form.Group className="mb-3">
              <Form.Label>Location on Floor Plan</Form.Label>
              <div className="d-flex align-items-center mb-2">
                {selectedPosition.x && selectedPosition.y ? (
                  <div className="me-3">
                    <span className="badge bg-success">
                      <i className="bi bi-geo-alt-fill me-1"></i>
                      Position selected: X: {selectedPosition.x}%, Y: {selectedPosition.y}%
                    </span>
                  </div>
                ) : (
                  <div className="text-muted me-3">No position selected</div>
                )}
                <Button 
                  variant="outline-primary" 
                  size="sm"
                  onClick={openMapSelector}
                >
                  {selectedPosition.x && selectedPosition.y ? 'Change Position' : 'Select Position on Map'}
                </Button>
              </div>
            </Form.Group>
            
            {showMapSelector && selectedFloor && (
              <div className="position-relative mb-4 border">
                <div style={{ maxHeight: '500px', overflow: 'auto' }}>
                  <Image 
                    src={`${API_URL}${selectedFloor.layout_url}`} 
                    alt={selectedFloor.name}
                    fluid
                    ref={imageRef}
                    onClick={handleMapClick}
                    style={{ cursor: 'crosshair' }}
                  />
                  
                  {/* Show marker at selected position */}
                  {selectedPosition.x && selectedPosition.y && (
                    <div 
                      className="position-absolute"
                      style={{
                        left: `${selectedPosition.x}%`,
                        top: `${selectedPosition.y}%`,
                        transform: 'translate(-50%, -50%)',
                        width: '20px',
                        height: '20px',
                        backgroundColor: 'red',
                        borderRadius: '50%',
                        border: '2px solid white',
                        boxShadow: '0 0 5px rgba(0,0,0,0.5)',
                        zIndex: 100
                      }}
                    />
                  )}
                </div>
                <div className="bg-light p-2 text-center">
                  <small className="text-muted">Click on the map to select the resource location</small>
                </div>
              </div>
            )}
          </Form>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={closeResourceModal}>
            Cancel
          </Button>
          <Button 
            variant="success" 
            onClick={handleAddResource}
            disabled={!selectedPosition.x || !selectedPosition.y}
          >
            Add Resource
          </Button>
        </Modal.Footer>
      </Modal>

      {/* Delete Floor Plan Modal */}
      <Modal show={showDeleteModal} onHide={closeDeleteModal}>
        <Modal.Header closeButton>
          <Modal.Title>Delete Floor Plan</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {selectedFloor && (
            <p>
              Are you sure you want to delete the floor plan <strong>{selectedFloor.name}</strong>?
              This will also delete all resources associated with this floor.
            </p>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={closeDeleteModal}>
            Cancel
          </Button>
          <Button variant="danger" onClick={handleDeleteFloorPlan}>
            Delete Floor Plan
          </Button>
        </Modal.Footer>
      </Modal>
    </>
  );
};

export default FloorPlanManagement;