import { useState, useEffect } from "react";
import axios from "axios";
import { Card, Row, Col, Button, Alert, Modal, Form } from "react-bootstrap";

const MyFavorites = () => {
  const [favorites, setFavorites] = useState([]);
  const [floorPlans, setFloorPlans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedResource, setSelectedResource] = useState(null);
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [showNavigationModal, setShowNavigationModal] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");
  const [selectedFloorPlan, setSelectedFloorPlan] = useState(null);
  const [resourceLocation, setResourceLocation] = useState(null);

  const API_URL = import.meta.env.VITE_API_URL;

  useEffect(() => {
    fetchFavorites();
    fetchFloorPlans();
  }, []);

  const fetchFavorites = async () => {
    setLoading(true);
    try {
      const response = await axios.get(`${API_URL}users/favorites`, {
        withCredentials: true,
      });
      setFavorites(response.data);
      setError("");
    } catch (error) {
      console.error("Error fetching favorites:", error);
      setError("Failed to load your favorites. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const fetchFloorPlans = async () => {
    try {
      const response = await axios.get(`${API_URL}users/floorplans`, {
        withCredentials: true,
      });
      setFloorPlans(response.data);
    } catch (error) {
      console.error("Error fetching floor plans:", error);
    }
  };

  const bookResource = async () => {
    if (!startTime || !endTime) {
      setError("Please select both start and end times");
      return;
    }
  
    if (new Date(startTime).getTime() >= new Date(endTime).getTime()) {
      setError("End time must be after start time");
      return;
    }
  
    if (!selectedResource || !selectedResource._id) {
      setError("Invalid resource selected.");
      return;
    }
  
    try {
      setError(""); // Clear any previous errors
      await axios.post(
        `${API_URL}users/book`,
        {
          resourceId: selectedResource._id,
          startTime,
          endTime,
        },
        { withCredentials: true }
      );
  
      setSuccessMessage("Resource booked successfully!");
      setError(""); // Ensure no error message is displayed
      setTimeout(() => setSuccessMessage(""), 3000);
      fetchFavorites(); // Refresh favorites to reflect booking
      closeModal();
    } catch (error) {
      console.log(error);
      setError(
        error.response?.data?.error ||
          "Error booking resource. Please try again."
      );
    }
  };
  
  const openBookingModal = (resource) => {
    setSelectedResource(resource);
    // Set default times (current time + 1 hour for end time)
    const now = new Date();
    const localStartTime = new Date(
      now.getTime() - now.getTimezoneOffset() * 60000
    )
      .toISOString()
      .slice(0, 16);

    const endDate = new Date(
      now.getTime() + 60 * 60000 - now.getTimezoneOffset() * 60000
    )
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

  const openNavigationModal = async (resource) => {
    setSelectedResource(resource);
    setError("");
    
    try {
      // Get detailed resource location information
      const response = await axios.get(`${API_URL}users/resource-location/${resource._id}`, {
        withCredentials: true
      });
      
      console.log("Resource location response:", response.data);
      
      const resourceData = response.data.resource;
      setResourceLocation(resourceData.location);
      
      // Find the floor plan for this resource
      const floorPlan = floorPlans.find(plan => plan._id === resourceData.floor._id);
      setSelectedFloorPlan(floorPlan);
      
      setShowNavigationModal(true);
    } catch (error) {
      console.error("Error fetching resource location:", error);
      setError("Failed to load resource location information.");
    }
  };

  const closeNavigationModal = () => {
    setShowNavigationModal(false);
    setSelectedResource(null);
    setSelectedFloorPlan(null);
    setResourceLocation(null);
  };

  const getResourceTypeIcon = (type) => {
    switch (type?.toLowerCase()) {
      case "desk":
        return <i className="bi bi-laptop me-2"></i>;
      case "meeting room":
        return <i className="bi bi-people me-2"></i>;
      case "parking spot":
        return <i className="bi bi-car-front me-2"></i>;
      default:
        return <i className="bi bi-building me-2"></i>;
    }
  };

  return (
    <Card className="shadow-sm">
      {successMessage && (
        <Alert variant="success" className="mb-4">
          {successMessage}
        </Alert>
      )}
      
      <Card.Body>
        <h3 className="mb-4">My Favorites</h3>

        {loading ? (
          <div className="text-center py-4">
            <div className="spinner-border text-primary" role="status">
              <span className="visually-hidden">Loading...</span>
            </div>
            <p className="mt-2">Loading your favorites...</p>
          </div>
        ) : error ? (
          <Alert variant="danger">{error}</Alert>
        ) : favorites.length === 0 ? (
          <Alert variant="info">You haven't saved any favorites yet.</Alert>
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

                    <div className="d-flex mt-3 flex-wrap">
                      <Button
                        variant="primary"
                        className="me-2 mb-2"
                        onClick={() => openBookingModal(favorite.resource_id)}
                      >
                        <i className="bi bi-calendar-plus me-1"></i> Book
                      </Button>
                      
                      <Button 
                        variant="outline-info"
                        className="mb-2"
                        onClick={() => openNavigationModal(favorite.resource_id)}
                      >
                        <i className="bi bi-geo-alt me-1"></i> Navigate
                      </Button>
                    </div>
                  </Card.Body>
                </Card>
              </Col>
            ))}
          </Row>
        )}
      </Card.Body>

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

      {/* Navigation Modal */}
      <Modal show={showNavigationModal} onHide={closeNavigationModal} size="lg">
        <Modal.Header closeButton>
          <Modal.Title>
            {selectedResource && (
              <>
                Navigate to {selectedResource.name}
                <div className="text-muted fs-6">
                  {selectedResource.resource_type}
                </div>
              </>
            )}
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {error && <Alert variant="danger">{error}</Alert>}
          
          {selectedFloorPlan && selectedResource && (
            <div className="position-relative">
              <img 
                src={`${API_URL}${selectedFloorPlan.layout_url}`} 
                alt={selectedFloorPlan.name}
                className="img-fluid"
              />
              
              {/* Show marker at resource position */}
              {resourceLocation && (
                <div 
                  className="position-absolute"
                  style={{
                    left: `${resourceLocation[0]}%`,
                    top: `${resourceLocation[1]}%`,
                    transform: 'translate(-50%, -50%)',
                    width: '30px',
                    height: '30px',
                    backgroundColor: 'red',
                    borderRadius: '50%',
                    border: '3px solid white',
                    boxShadow: '0 0 10px rgba(0,0,0,0.5)',
                    zIndex: 100,
                    animation: 'pulse 1.5s infinite'
                  }}
                />
              )}
              
              <style>
                {`
                  @keyframes pulse {
                    0% {
                      transform: translate(-50%, -50%) scale(1);
                      opacity: 1;
                    }
                    50% {
                      transform: translate(-50%, -50%) scale(1.2);
                      opacity: 0.8;
                    }
                    100% {
                      transform: translate(-50%, -50%) scale(1);
                      opacity: 1;
                    }
                  }
                `}
              </style>
            </div>
          )}
          
          <div className="mt-3">
            <h5>Location Details</h5>
            <p>
              <strong>Floor:</strong> {selectedFloorPlan?.name || 'Unknown'}
            </p>
            {selectedResource?.amenities && selectedResource.amenities.length > 0 && (
              <div>
                <strong>Amenities:</strong>
                <ul>
                  {selectedResource.amenities.map((amenity, index) => (
                    <li key={index}>{amenity}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="primary" onClick={closeNavigationModal}>
            Close
          </Button>
        </Modal.Footer>
      </Modal>
    </Card>
  );
};

export default MyFavorites;