import { useState, useEffect } from "react";
import axios from "axios";
import { Container, Row, Col, Card, Button, Form, Tab, Tabs, Badge, Modal, Alert, Table } from 'react-bootstrap';

const AdminDashboard = () => {
  const [users, setUsers] = useState([]);
  const [resources, setResources] = useState([]);
  const [reservations, setReservations] = useState([]);
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
      setError("Failed to load users. Please try again.");
    }
  };

  const fetchResources = async () => {
    setLoading(true);
    try {
      const res = await axios.get(`${API_URL}admin/resources`, {
        withCredentials: true,
      });
      setResources(res.data.resources);
      setReservations(res.data.reservations);
    } catch (err) {
      console.error("Error fetching resources:", err);
      setError("Failed to load resources. Please try again.");
    } finally {
      setLoading(false);
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
      setError("Failed to load floor plans. Please try again.");
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
      fetchResources();
    } catch (err) {
      console.error("Error adding resource:", err);
      setError("Failed to add resource. Please try again.");
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
  
  const formatDateTime = (dateString) => {
    try {
      const date = new Date(dateString);
      return date.toLocaleString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: 'numeric',
        minute: 'numeric',
        hour12: true
      });
    } catch (error) {
      return dateString;
    }
  };
  
  const getResourceTypeIcon = (type) => {
    switch(type?.toLowerCase()) {
      case 'desk':
        return <i className="bi bi-laptop me-2"></i>;
      case 'meeting room':
        return <i className="bi bi-people me-2"></i>;
      case 'parking spot':
        return <i className="bi bi-car-front me-2"></i>;
      default:
        return <i className="bi bi-building me-2"></i>;
    }
  };

  return (
    <Container className="py-4">
      <h1 className="mb-4">Admin Dashboard</h1>
      
      {successMessage && (
        <Alert variant="success" className="mb-4">
          {successMessage}
        </Alert>
      )}
      
      {error && (
        <Alert variant="danger" className="mb-4" dismissible onClose={() => setError("")}>
          {error}
        </Alert>
      )}
      
      <Tabs defaultActiveKey="resources" className="mb-4">
        <Tab eventKey="resources" title="Resources & Reservations">
          <Card className="shadow-sm mb-4">
            <Card.Body>
              <div className="d-flex justify-content-between align-items-center mb-4">
                <h3 className="mb-0">Resources</h3>
                <div className="d-flex">
                  <Button variant="outline-primary" onClick={() => fetchResources()}>
                    <i className="bi bi-arrow-clockwise me-1"></i> Refresh
                  </Button>
                </div>
              </div>
              
              {loading ? (
                <div className="text-center py-4">
                  <div className="spinner-border text-primary" role="status">
                    <span className="visually-hidden">Loading...</span>
                  </div>
                  <p className="mt-2">Loading resources...</p>
                </div>
              ) : resources.length === 0 ? (
                <Alert variant="info">
                  No resources have been added yet. Add a floor plan and then add resources to it.
                </Alert>
              ) : (
                <Table responsive hover>
                  <thead>
                    <tr>
                      <th>Name</th>
                      <th>Type</th>
                      <th>Capacity</th>
                      <th>Amenities</th>
                      <th>Location</th>
                    </tr>
                  </thead>
                  <tbody>
                    {resources.map((resource) => (
                      <tr key={resource._id}>
                        <td>
                          <div className="d-flex align-items-center">
                            {getResourceTypeIcon(resource.resource_type)}
                            {resource.name}
                          </div>
                        </td>
                        <td>{resource.resource_type}</td>
                        <td>{resource.capacity}</td>
                        <td>
                          {resource.amenities && resource.amenities.length > 0 ? (
                            resource.amenities.map((amenity, index) => (
                              <Badge bg="light" text="dark" className="me-1 mb-1" key={index}>
                                {amenity}
                              </Badge>
                            ))
                          ) : (
                            <span className="text-muted">None</span>
                          )}
                        </td>
                        <td>
                          {resource.location ? (
                            <small>X: {resource.location[0]}, Y: {resource.location[1]}</small>
                          ) : (
                            <span className="text-muted">Not set</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </Table>
              )}
            </Card.Body>
          </Card>
          
          <Card className="shadow-sm">
            <Card.Body>
              <h3 className="mb-4">Current Reservations</h3>
              
              {reservations.length === 0 ? (
                <Alert variant="info">
                  No active reservations at the moment.
                </Alert>
              ) : (
                <Table responsive hover>
                  <thead>
                    <tr>
                      <th>Resource</th>
                      <th>Type</th>
                      <th>Start Time</th>
                      <th>End Time</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {console.log(reservations)}
                    {reservations.map((reservation) => (
                      
                      <tr key={reservation._id}>
                        <td>
                          {reservation.resource_id?.name || "Unknown Resource"}
                        </td>
                        <td>{reservation.resource_type}</td>
                        <td>{formatDateTime(reservation.start_time)}</td>
                        <td>{formatDateTime(reservation.end_time)}</td>
                        <td>
                          <Badge bg="success">Active</Badge>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </Table>
              )}
            </Card.Body>
          </Card>
        </Tab>
        
        <Tab eventKey="users" title="Users">
          <Card className="shadow-sm">
            <Card.Body>
              <div className="d-flex justify-content-between align-items-center mb-4">
                <h3 className="mb-0">Company Users</h3>
                <Button variant="outline-primary" onClick={() => fetchUsers()}>
                  <i className="bi bi-arrow-clockwise me-1"></i> Refresh
                </Button>
              </div>
              
              {users.length === 0 ? (
                <Alert variant="info">
                  No users have been added to your company yet.
                </Alert>
              ) : (
                <Table responsive hover>
                  <thead>
                    <tr>
                      <th>Username</th>
                      <th>Email</th>
                      <th>Role</th>
                      <th>Joined</th>
                    </tr>
                  </thead>
                  <tbody>
                    {users.map((user) => (
                      <tr key={user._id}>
                        <td>{user.username}</td>
                        <td>{user.email_id}</td>
                        <td>
                          <Badge bg={user.role === 'admin' ? 'danger' : 'primary'}>
                            {user.role}
                          </Badge>
                        </td>
                        <td>
                          {user.createdAt ? formatDateTime(user.createdAt) : 'N/A'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </Table>
              )}
            </Card.Body>
          </Card>
        </Tab>
        
        <Tab eventKey="floorplans" title="Floor Plans">
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
              
              {floorPlans.length === 0 ? (
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
        </Tab>
      </Tabs>
      
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
    </Container>
  );
};

export default AdminDashboard;