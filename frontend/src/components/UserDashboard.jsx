import React, { useState, useEffect } from "react";
import axios from "axios";
import { Container, Row, Col, Card, Button, Form, Tab, Tabs, Badge, ListGroup, Modal, Alert } from 'react-bootstrap';

const API_URL = `${import.meta.env.VITE_API_URL}`;

const UserDashboard = () => {
  const [resources, setResources] = useState([]);
  const [reservations, setReservations] = useState([]);
  const [favorites, setFavorites] = useState([]);
  const [resourceType, setResourceType] = useState("desk");
  const [selectedResource, setSelectedResource] = useState(null);
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  useEffect(() => {
    fetchAvailability();
    fetchFavorites();
  }, [resourceType]);

  const fetchAvailability = async () => {
    setLoading(true);
    try {
      const response = await axios.get(
        `${API_URL}users/availability?resourceType=${resourceType}`,
        { withCredentials: true }
      );
      setResources(response.data.resources);
      setReservations(response.data.reservations);
      setError("");
    } catch (error) {
      console.error("Error fetching availability:", error);
      setError("Failed to load resources. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const fetchFavorites = async () => {
    try {
      const response = await axios.get(`${API_URL}users/favorites`, {
        withCredentials: true,
      });
      setFavorites(response.data);
    } catch (error) {
      console.error("Error fetching favorites:", error);
    }
  };

  const openBookingModal = (resource) => {
    setSelectedResource(resource);
    
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
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setSelectedResource(null);
    setStartTime("");
    setEndTime("");
    setError("");
  };

  const bookResource = async () => {
    if (!startTime || !endTime) {
      setError("Please select both start and end times");
      return;
    }

    if (new Date(startTime) >= new Date(endTime)) {
      setError("End time must be after start time");
      return;
    }

    try {
      const response = await axios.post(
        `${API_URL}users/book`,
        {
          resourceId: selectedResource._id,
          startTime,
          endTime,
        },
        { withCredentials: true }
      );
      
      setSuccessMessage("Resource booked successfully!");
      setTimeout(() => setSuccessMessage(""), 3000);
      
      fetchAvailability();
      closeModal();
    } catch (error) {
      setError(error.response?.data?.error || "Error booking resource. Please try again.");
    }
  };

  const markFavorite = async (resourceId) => {
    try {
      await axios.post(
        `${API_URL}users/favorite`,
        {
          resourceType,
          resourceId,
        },
        { withCredentials: true }
      );
      
      setSuccessMessage("Added to favorites!");
      setTimeout(() => setSuccessMessage(""), 3000);
      
      fetchFavorites();
    } catch (error) {
      console.error("Error marking favorite:", error);
      setError("Failed to add to favorites. Please try again.");
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

  const isResourceFavorited = (resourceId) => {
    return favorites.some(fav => fav.resource_id?._id === resourceId);
  };

  return (
    <Container className="py-4">
      {successMessage && (
        <Alert variant="success" className="mb-4">
          {successMessage}
        </Alert>
      )}
      
      <Card className="shadow-sm mb-4">
        <Card.Body>
          <Card.Title>Resource Booking</Card.Title>
          <Form.Group className="mb-3">
            <Form.Label>Resource Type</Form.Label>
            <Form.Select
              value={resourceType}
              onChange={(e) => setResourceType(e.target.value)}
            >
              <option value="desk">Desk</option>
              <option value="parking spot">Parking Spot</option>
              <option value="meeting room">Meeting Room</option>
            </Form.Select>
          </Form.Group>
        </Card.Body>
      </Card>

      <Tabs defaultActiveKey="available" className="mb-4">
        <Tab eventKey="available" title="Available Resources">
          <Card className="shadow-sm">
            <Card.Body>
              {loading ? (
                <div className="text-center py-4">
                  <div className="spinner-border text-primary" role="status">
                    <span className="visually-hidden">Loading...</span>
                  </div>
                  <p className="mt-2">Loading resources...</p>
                </div>
              ) : error ? (
                <Alert variant="danger">{error}</Alert>
              ) : resources.length === 0 ? (
                <Alert variant="info">
                  No {resourceType}s are currently available.
                </Alert>
              ) : (
                <Row xs={1} md={2} lg={3} className="g-4">
                  {resources.map((resource) => (
                    <Col key={resource._id}>
                      <Card className="h-100 resource-card">
                        <Card.Body>
                          <div className="d-flex justify-content-between align-items-start">
                            <div>
                              <Card.Title>
                                {getResourceTypeIcon(resource.resource_type)}
                                {resource.name}
                              </Card.Title>
                              <Card.Subtitle className="mb-2 text-muted">
                                Capacity: {resource.capacity}
                              </Card.Subtitle>
                            </div>
                            {isResourceFavorited(resource._id) && (
                              <Badge bg="warning" text="dark">
                                <i className="bi bi-star-fill me-1"></i> Favorite
                              </Badge>
                            )}
                          </div>
                          
                          {resource.amenities && resource.amenities.length > 0 && (
                            <div className="mb-3">
                              <small className="text-muted">Amenities:</small>
                              <div className="mt-1">
                                {resource.amenities.map((amenity, index) => (
                                  <Badge bg="light" text="dark" className="me-1 mb-1" key={index}>
                                    {amenity}
                                  </Badge>
                                ))}
                              </div>
                            </div>
                          )}
                          
                          <div className="d-flex mt-3">
                            <Button 
                              variant="primary" 
                              className="me-2"
                              onClick={() => openBookingModal(resource)}
                            >
                              <i className="bi bi-calendar-plus me-1"></i> Book
                            </Button>
                            
                            {!isResourceFavorited(resource._id) && (
                              <Button 
                                variant="outline-warning"
                                onClick={() => markFavorite(resource._id)}
                              >
                                <i className="bi bi-star me-1"></i> Favorite
                              </Button>
                            )}
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
        
        <Tab eventKey="reservations" title="My Reservations">
          <Card className="shadow-sm">
            <Card.Body>
              {reservations.length === 0 ? (
                <Alert variant="info">
                  You don't have any upcoming reservations.
                </Alert>
              ) : (
                <ListGroup variant="flush">
                  {reservations.map((reservation) => (
                    <ListGroup.Item key={reservation._id} className="py-3">
                      <div className="d-flex justify-content-between align-items-center">
                        <div>
                          <h5>
                            {getResourceTypeIcon(reservation.resource_type)}
                            {reservation.resource_id?.name || "Unknown Resource"}
                          </h5>
                          <div className="text-muted">
                            <div><i className="bi bi-clock me-2"></i> {formatDateTime(reservation.start_time)} - {formatDateTime(reservation.end_time)}</div>
                          </div>
                        </div>
                        <Badge bg="success">Confirmed</Badge>
                      </div>
                    </ListGroup.Item>
                  ))}
                </ListGroup>
              )}
            </Card.Body>
          </Card>
        </Tab>
        
        <Tab eventKey="favorites" title="My Favorites">
          <Card className="shadow-sm">
            <Card.Body>
              {favorites.length === 0 ? (
                <Alert variant="info">
                  You haven't saved any favorites yet.
                </Alert>
              ) : (
                <Row xs={1} md={2} lg={3} className="g-4">
                  {favorites.map((favorite) => (
                    <Col key={favorite._id}>
                      <Card className="h-100">
                        <Card.Body>
                          <Card.Title>
                            {getResourceTypeIcon(favorite.resource_type)}
                            {favorite.resource_id?.name || "Unknown Resource"}
                          </Card.Title>
                          <Card.Subtitle className="mb-2 text-muted">
                            Type: {favorite.resource_type}
                          </Card.Subtitle>
                          <Button 
                            variant="primary" 
                            className="mt-2"
                            onClick={() => openBookingModal(favorite.resource_id)}
                          >
                            <i className="bi bi-calendar-plus me-1"></i> Book
                          </Button>
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

      {/* Booking Modal */}
      <Modal show={showModal} onHide={closeModal}>
        <Modal.Header closeButton>
          <Modal.Title>
            {selectedResource && (
              <>
                Book {selectedResource.name}
                <div className="text-muted fs-6">
                  {selectedResource.resource_type}
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
          </Form>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={closeModal}>
            Cancel
          </Button>
          <Button variant="primary" onClick={bookResource}>
            Confirm Booking
          </Button>
        </Modal.Footer>
      </Modal>
    </Container>
  );
};

export default UserDashboard;