import { useState, useEffect } from "react";
import axios from "axios";
import { Card, ListGroup, Badge, Alert, Button, Modal } from 'react-bootstrap';

const MyReservations = () => {
  const [reservations, setReservations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [successMessage, setSuccessMessage] = useState("");
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [reservationToDelete, setReservationToDelete] = useState(null);

  const API_URL = import.meta.env.VITE_API_URL;

  useEffect(() => {
    fetchReservations();
  }, []);

  const fetchReservations = async () => {
    setLoading(true);
    try {
      const response = await axios.get(
        `${API_URL}users/reservations`,
        { withCredentials: true }
      );
      setReservations(response.data);
      setError(null);
    } catch (error) {
      console.error("Error fetching reservations:", error);
      setError("Failed to load your reservations. Please try again.");
    } finally {
      setLoading(false);
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

  const openDeleteModal = (reservation) => {
    setReservationToDelete(reservation);
    setShowDeleteModal(true);
  };

  const closeDeleteModal = () => {
    setShowDeleteModal(false);
    setReservationToDelete(null);
  };

  const handleDeleteReservation = async () => {
    if (!reservationToDelete) return;
    
    try {
      await axios.delete(`${API_URL}users/reservation/${reservationToDelete._id}`, {
        withCredentials: true
      });
      
      setSuccessMessage("Reservation cancelled successfully!");
      setTimeout(() => setSuccessMessage(""), 3000);
      
      // Remove the deleted reservation from the state
      setReservations(reservations.filter(r => r._id !== reservationToDelete._id));
      closeDeleteModal();
    } catch (error) {
      console.error("Error cancelling reservation:", error);
      setError("Failed to cancel reservation. Please try again.");
    }
  };

  return (
    <Card className="shadow-sm">
      <Card.Body>
        <h3 className="mb-4">My Reservations</h3>
        
        {successMessage && (
          <Alert variant="success" className="mb-4">
            {successMessage}
          </Alert>
        )}
        
        {loading ? (
          <div className="text-center py-4">
            <div className="spinner-border text-primary" role="status">
              <span className="visually-hidden">Loading...</span>
            </div>
            <p className="mt-2">Loading your reservations...</p>
          </div>
        ) : error !== null ? (
          <Alert variant="danger">{error}</Alert>
        ) : reservations.length === 0 ? (
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
                  <div>
                    <Badge bg="success" className="me-2">Confirmed</Badge>
                    <Button 
                      variant="outline-danger" 
                      size="sm"
                      onClick={() => openDeleteModal(reservation)}
                    >
                      <i className="bi bi-x-circle me-1"></i> Cancel
                    </Button>
                  </div>
                </div>
              </ListGroup.Item>
            ))}
          </ListGroup>
        )}
      </Card.Body>
      
      {/* Delete Confirmation Modal */}
      <Modal show={showDeleteModal} onHide={closeDeleteModal}>
        <Modal.Header closeButton>
          <Modal.Title>Cancel Reservation</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {reservationToDelete && (
            <p>
              Are you sure you want to cancel your reservation for{" "}
              <strong>{reservationToDelete.resource_id?.name || "this resource"}</strong> on{" "}
              {formatDateTime(reservationToDelete.start_time)}?
            </p>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={closeDeleteModal}>
            No, Keep It
          </Button>
          <Button variant="danger" onClick={handleDeleteReservation}>
            Yes, Cancel Reservation
          </Button>
        </Modal.Footer>
      </Modal>
    </Card>
  );
};

export default MyReservations;