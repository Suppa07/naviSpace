import { useState, useEffect } from "react";
import axios from "axios";
import { Card, Button, Table, Alert, Badge, Modal, Form, ListGroup } from 'react-bootstrap';

const ResourceManagement = () => {
  const [resources, setResources] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedResource, setSelectedResource] = useState(null);
  const [showReserveModal, setShowReserveModal] = useState(false);
  const [users, setUsers] = useState([]);
  const [selectedUsers, setSelectedUsers] = useState([]);
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [userSearchQuery, setUserSearchQuery] = useState("");
  const [searchTimeout, setSearchTimeout] = useState(null);
  const [searchingUsers, setSearchingUsers] = useState(false);

  const API_URL = import.meta.env.VITE_API_URL;

  useEffect(() => {
    fetchResources();
  }, []);

  useEffect(() => {
    if (userSearchQuery.length >= 3) {
      if (searchTimeout) {
        clearTimeout(searchTimeout);
      }
      
      setSearchingUsers(true);
      const timeout = setTimeout(() => {
        searchUsers();
      }, 300);

      setSearchTimeout(timeout);
    } else {
      setUsers([]);
    }

    return () => {
      if (searchTimeout) {
        clearTimeout(searchTimeout);
      }
    };
  }, [userSearchQuery]);

  const searchUsers = async () => {
    try {
      const response = await axios.get(`${API_URL}admin/users`, {
        params: { search: userSearchQuery },
        withCredentials: true,
      });
      setUsers(response.data.users);
    } catch (error) {
      console.error("Error searching users:", error);
    } finally {
      setSearchingUsers(false);
    }
  };

  const fetchResources = async () => {
    setLoading(true);
    try {
      const response = await axios.get(`${API_URL}admin/resources`, {
        withCredentials: true,
      });
      setResources(response.data.resources);
      setError("");
    } catch (error) {
      console.error("Error fetching resources:", error);
      setError("Failed to load resources. Please try again.");
    } finally {
      setLoading(false);
    }
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

  const openReserveModal = (resource) => {
    setSelectedResource(resource);
    setSelectedUsers([]);
    setUserSearchQuery("");
    setUsers([]);
    
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
    setUserSearchQuery("");
    setUsers([]);
  };

  const openDeleteModal = (resource) => {
    setSelectedResource(resource);
    setShowDeleteModal(true);
  };

  const closeDeleteModal = () => {
    setShowDeleteModal(false);
    setSelectedResource(null);
  };

  const handleDeleteResource = async () => {
    if (!selectedResource) return;
    
    try {
      await axios.delete(`${API_URL}admin/resource/${selectedResource._id}`, {
        withCredentials: true
      });
      
      setSuccessMessage("Resource deleted successfully!");
      setTimeout(() => setSuccessMessage(""), 3000);
      
      setResources(resources.filter(r => r._id !== selectedResource._id));
      closeDeleteModal();
    } catch (error) {
      console.error("Error deleting resource:", error);
      setError("Failed to delete resource. Please try again.");
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
    <Card className="shadow-sm">
      <Card.Body>
        <div className="d-flex justify-content-between align-items-center mb-4">
          <h3 className="mb-0">Resources</h3>
          <Button variant="outline-primary" onClick={fetchResources}>
            <i className="bi bi-arrow-clockwise me-1"></i> Refresh
          </Button>
        </div>

        {successMessage && (
          <Alert variant="success" className="mb-4">
            {successMessage}
          </Alert>
        )}

        {error && (
          <Alert variant="danger" className="mb-4">
            {error}
          </Alert>
        )}

        {loading ? (
          <div className="text-center py-4">
            <div className="spinner-border text-primary" role="status">
              <span className="visually-hidden">Loading...</span>
            </div>
            <p className="mt-2">Loading resources...</p>
          </div>
        ) : resources.length === 0 ? (
          <Alert variant="info">No resources have been added yet.</Alert>
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
                      className="me-2"
                      onClick={() => openReserveModal(resource)}
                    >
                      <i className="bi bi-calendar-plus me-1"></i> Reserve
                    </Button>
                    <Button 
                      variant="danger" 
                      size="sm"
                      onClick={() => openDeleteModal(resource)}
                    >
                      <i className="bi bi-trash me-1"></i> Delete
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </Table>
        )}
      </Card.Body>

      {/* Delete Confirmation Modal */}
      <Modal show={showDeleteModal} onHide={closeDeleteModal}>
        <Modal.Header closeButton>
          <Modal.Title>Delete Resource</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {selectedResource && (
            <p>
              Are you sure you want to delete the resource <strong>{selectedResource.name}</strong>?
              This will also delete all reservations associated with this resource.
            </p>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={closeDeleteModal}>
            Cancel
          </Button>
          <Button variant="danger" onClick={handleDeleteResource}>
            Delete Resource
          </Button>
        </Modal.Footer>
      </Modal>

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
                    const user = users.find(u => u._id === userId) || 
                               { username: 'Loading...', email_id: 'Loading...' };
                    return (
                      <ListGroup.Item key={userId} className="d-flex justify-content-between align-items-center">
                        <div>
                          <strong>{user.username}</strong> ({user.email_id})
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
              <Form.Label>Search Users</Form.Label>
              <Form.Control
                type="text"
                placeholder="Type at least 3 characters to search..."
                value={userSearchQuery}
                onChange={(e) => setUserSearchQuery(e.target.value)}
                className="mb-2"
              />
              
              {searchingUsers && (
                <div className="text-center py-3">
                  <div className="spinner-border spinner-border-sm text-primary" role="status">
                    <span className="visually-hidden">Searching...</span>
                  </div>
                </div>
              )}
              
              {userSearchQuery.length > 0 && userSearchQuery.length < 3 && (
                <Alert variant="info">
                  Please enter at least 3 characters to search
                </Alert>
              )}
              
              {userSearchQuery.length >= 3 && users.length === 0 && !searchingUsers && (
                <Alert variant="warning">
                  No users found matching "{userSearchQuery}"
                </Alert>
              )}
              
              {users.length > 0 && (
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
                      {users.map(user => (
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
              )}
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
    </Card>
  );
};

export default ResourceManagement;