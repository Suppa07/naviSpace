import { useState, useEffect } from "react";
import axios from "axios";
import { Card, Button, Table, Alert, Badge, Modal, Form, ListGroup } from 'react-bootstrap';

const ResourceManagement = () => {
  const [resources, setResources] = useState([]);
  const [reservations, setReservations] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [showReserveModal, setShowReserveModal] = useState(false);
  const [selectedResource, setSelectedResource] = useState(null);
  const [selectedUsers, setSelectedUsers] = useState([]);
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [userFilter, setUserFilter] = useState("");

  const API_URL = import.meta.env.VITE_API_URL;

  useEffect(() => {
    fetchResources();
    fetchUsers();
  }, []);

  const fetchResources = async () => {
    setLoading(true);
    try {
      const res = await axios.get(`${API_URL}admin/resources`, {
        withCredentials: true,
      });
      setResources(res.data.resources);
      setReservations(res.data.reservations);
      setError("");
    } catch (err) {
      console.error("Error fetching resources:", err);
      setError("Failed to load resources. Please try again.");
    } finally {
      setLoading(false);
    }
  };

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

  const openReserveModal = (resource) => {
    setSelectedResource(resource);
    setSelectedUsers([]);
    setUserFilter("");
    
    // Set default times (current time + 1 hour for end time)
    const now = new Date();
    const localStartTime = new Date(now.getTime() - now.getTimezoneOffset() * 60000)
      .toISOString()
      .slice(0, 16);
    
    const endDate = new Date(now.getTime() + 60 * 60000 - now.getTimezoneOffset() * 60000)
      .toISOString()
      .slice(0, 16);
    
    setStartTime(localStartTime);
    setEndTime(endDate);
    setShowReserveModal(true);
  };

  const closeReserveModal = () => {
    setShowReserveModal(false);
    setSelectedResource(null);
    setSelectedUsers([]);
    setStartTime("");
    setEndTime("");
    setError("");
  };

  const handleReserveResource = async () => {
    if (!startTime || !endTime) {
      setError("Please select both start and end times");
      return;
    }

    if (new Date(startTime) >= new Date(endTime)) {
      setError("End time must be after start time");
      return;
    }

    if (selectedUsers.length === 0) {
      setError("Please select at least one user");
      return;
    }

    if (selectedUsers.length > selectedResource.capacity) {
      setError(`You can only select up to ${selectedResource.capacity} users for this resource`);
      return;
    }

    try {
      // For each selected user, create a reservation
      for (const user_id of selectedUsers) {
        await axios.post(
          `${API_URL}admin/reserve`,
          {
            resource_id: selectedResource._id,
            user_id,
            start_time: startTime,
            end_time: endTime,
          },
          { withCredentials: true }
        );
      }
      
      setSuccessMessage("Resource reserved successfully for selected users!");
      setTimeout(() => setSuccessMessage(""), 3000);
      
      fetchResources();
      closeReserveModal();
    } catch (error) {
      setError(error.response?.data?.message || "Error reserving resource. Please try again.");
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

  const addUser = (userId) => {
    if (selectedUsers.includes(userId)) {
      return; // User already added
    }
    
    if (selectedUsers.length >= selectedResource.capacity) {
      setError(`You can only select up to ${selectedResource.capacity} users for this resource`);
      return;
    }
    
    setSelectedUsers([...selectedUsers, userId]);
  };

  const removeUser = (userId) => {
    setSelectedUsers(selectedUsers.filter(id => id !== userId));
  };

  const filteredUsers = users.filter(user => {
    const searchTerm = userFilter.toLowerCase();
    return (
      user.username.toLowerCase().includes(searchTerm) ||
      user.email_id.toLowerCase().includes(searchTerm)
    );
  });

  return (
    <>
      {successMessage && (
        <Alert variant="success" className="mb-4">
          {successMessage}
        </Alert>
      )}
      
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
                  <th>Actions</th>
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
                    <td>
                      <Button 
                        variant="primary" 
                        size="sm"
                        onClick={() => openReserveModal(resource)}
                      >
                        <i className="bi bi-calendar-plus me-1"></i> Reserve
                      </Button>
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

      {/* Reserve Modal */}
      <Modal show={showReserveModal} onHide={closeReserveModal} size="lg">
        <Modal.Header closeButton>
          <Modal.Title>
            {selectedResource && (
              <>
                Reserve {selectedResource.name}
                <div className="text-muted fs-6">
                  {selectedResource.resource_type} (Capacity: {selectedResource.capacity})
                </div>
              </>
            )}
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {error && <Alert variant="danger">{error}</Alert>}
          
          <Form>
            <Form.Group className="mb-3">
              <Form.Label>Start Time</Form.Label>
              <Form.Control
                type="datetime-local"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
              />
            </Form.Group>
            
            <Form.Group className="mb-3">
              <Form.Label>End Time</Form.Label>
              <Form.Control
                type="datetime-local"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
              />
            </Form.Group>
            
            <div className="mb-3">
              <Form.Label>Selected Users ({selectedUsers.length}/{selectedResource?.capacity})</Form.Label>
              {selectedUsers.length > 0 ? (
                <ListGroup className="mb-3">
                  {selectedUsers.map(userId => {
                    const user = users.find(u => u._id === userId);
                    return (
                      <ListGroup.Item key={userId} className="d-flex justify-content-between align-items-center">
                        <div>
                          <strong>{user?.username}</strong> ({user?.email_id})
                        </div>
                        <Button 
                          variant="outline-danger" 
                          size="sm"
                          onClick={() => removeUser(userId)}
                        >
                          <i className="bi bi-x-circle"></i> Remove
                        </Button>
                      </ListGroup.Item>
                    );
                  })}
                </ListGroup>
              ) : (
                <Alert variant="info">No users selected yet</Alert>
              )}
            </div>
            
            <Form.Group className="mb-3">
              <Form.Label>Add Users</Form.Label>
              <Form.Control
                type="text"
                placeholder="Search users by name or email"
                value={userFilter}
                onChange={(e) => setUserFilter(e.target.value)}
                className="mb-2"
              />
              
              <div style={{ maxHeight: '200px', overflowY: 'auto' }}>
                <Table hover size="sm">
                  <thead>
                    <tr>
                      <th>Username</th>
                      <th>Email</th>
                      <th>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredUsers.map(user => (
                      <tr key={user._id}>
                        <td>{user.username}</td>
                        <td>{user.email_id}</td>
                        <td>
                          <Button
                            variant="primary"
                            size="sm"
                            onClick={() => addUser(user._id)}
                            disabled={selectedUsers.includes(user._id)}
                          >
                            {selectedUsers.includes(user._id) ? 'Added' : 'Add'}
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </Table>
              </div>
            </Form.Group>
          </Form>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={closeReserveModal}>
            Cancel
          </Button>
          <Button 
            variant="primary" 
            onClick={handleReserveResource}
            disabled={selectedUsers.length === 0}
          >
            Reserve for {selectedUsers.length} User{selectedUsers.length !== 1 ? 's' : ''}
          </Button>
        </Modal.Footer>
      </Modal>
    </>
  );
};

export default ResourceManagement;