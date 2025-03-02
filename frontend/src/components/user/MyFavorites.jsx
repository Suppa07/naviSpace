import { useState, useEffect } from "react";
import axios from "axios";
import { Card, Row, Col, Button, Alert, Modal, Form } from "react-bootstrap";

const MyFavorites = () => {
  const [favorites, setFavorites] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedResource, setSelectedResource] = useState(null);
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");

  const API_URL = import.meta.env.VITE_API_URL;

  useEffect(() => {
    fetchFavorites();
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
      console.log(error)
      setError(
        error.response?.data?.error ||
          "Error booking resource. Please try again."
      );
    }
  };
  

  const openBookingModal = (resource) => {
    setSelectedResource(resource);
    console.log(resource);
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

                    <Button
                      variant="primary"
                      className="me-2"
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
    </Card>
  );
};

export default MyFavorites;
