import { useState, useEffect } from "react";
import axios from "axios";
import { Card, ListGroup, Badge, Alert, Button, Modal } from 'react-bootstrap';

const MyReservations = () => {
  const [currentReservations, setCurrentReservations] = useState([]);
  const [pastReservations, setPastReservations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState(null);
  const [successMessage, setSuccessMessage] = useState("");
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [reservationToDelete, setReservationToDelete] = useState(null);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);

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
      setCurrentReservations(response.data);
      await fetchPastReservations(1, true);
      setError(null);
    } catch (error) {
      console.error("Error fetching reservations:", error);
      setError("Failed to load your reservations. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const fetchPastReservations = async (pageNum, isInitial = false) => {
    if (isInitial) {
      setLoadingMore(false);
    } else {
      setLoadingMore(true);
    }

    try {
      const response = await axios.get(
        `${API_URL}users/past-reservations?page=${pageNum}`,
        { withCredentials: true }
      );

      if (isInitial) {
        setPastReservations(response.data.reservations);
      } else {
        setPastReservations(prev => [...prev, ...response.data.reservations]);
      }

      setHasMore(response.data.hasMore);
      setPage(pageNum);
      setError(null);
    } catch (error) {
      console.error("Error fetching past reservations:", error);
      setError("Failed to load past reservations. Please try again.");
    } finally {
      setLoadingMore(false);
    }
  };

  const loadMorePastReservations = () => {
    fetchPastReservations(page + 1);
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
      
      setCurrentReservations(currentReservations.filter(r => r._id !== reservationToDelete._id));
      closeDeleteModal();
    } catch (error) {
      console.error("Error cancelling reservation:", error);
      setError("Failed to cancel reservation. Please try again.");
    }
  };

  const ReservationItem = ({ reservation, isPast }) => (
    <ListGroup.Item key={reservation._id} className="py-3">
      <div className="d-flex justify-content-between align-items-center">
        <div>
          <h5>
            {getResourceTypeIcon(reservation.resource_type)}
            {reservation.resource_id?.name || "Unknown Resource"}
          </h5>
          <div className="text-muted">
            <div>
              <i className="bi bi-clock me-2"></i> 
              {formatDateTime(reservation.start_time)} - {formatDateTime(reservation.end_time)}
            </div>
          </div>
        </div>
        <div>
          <Badge bg={isPast ? "secondary" : "success"} className="me-2">
            {isPast ? "Past" : "Active"}
          </Badge>
          {!isPast && (
            <Button 
              variant="outline-danger" 
              size="sm"
              onClick={() => openDeleteModal(reservation)}
            >
              <i className="bi bi-x-circle me-1"></i> Cancel
            </Button>
          )}
        </div>
      </div>
    </ListGroup.Item>
  );

  return (
    <Card className="shadow-sm">
      <Card.Body>
        <h3 className="mb-4">My Reservations</h3>
        
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

        {/* Current Reservations */}
        <h4 className="mb-3">Current Reservations</h4>
        {loading ? (
          <div className="text-center py-4">
            <div className="spinner-border text-primary" role="status">
              <span className="visually-hidden">Loading...</span>
            </div>
            <p className="mt-2">Loading your reservations...</p>
          </div>
        ) : currentReservations.length === 0 ? (
          <Alert variant="info" className="mb-4">
            You don't have any upcoming reservations.
          </Alert>
        ) : (
          <ListGroup className="mb-4">
            {currentReservations.map((reservation) => (
              <ReservationItem 
                key={reservation._id} 
                reservation={reservation} 
                isPast={false}
              />
            ))}
          </ListGroup>
        )}

        {/* Past Reservations */}
        <h4 className="mb-3">Past Reservations</h4>
        {loading ? (
          <div className="text-center py-4">
            <div className="spinner-border text-primary" role="status">
              <span className="visually-hidden">Loading...</span>
            </div>
          </div>
        ) : pastReservations.length === 0 ? (
          <Alert variant="info">
            No past reservations found.
          </Alert>
        ) : (
          <>
            <ListGroup className="mb-3">
              {pastReservations.map((reservation) => (
                <ReservationItem 
                  key={reservation._id} 
                  reservation={reservation} 
                  isPast={true}
                />
              ))}
            </ListGroup>

            {hasMore && (
              <div className="text-center">
                <Button
                  variant="outline-primary"
                  onClick={loadMorePastReservations}
                  disabled={loadingMore}
                >
                  {loadingMore ? (
                    <>
                      <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                      Loading...
                    </>
                  ) : (
                    <>
                      <i className="bi bi-clock-history me-2"></i>
                      Load Older Reservations
                    </>
                  )}
                </Button>
              </div>
            )}
          </>
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