import { useState, useEffect } from "react";
import axios from "axios";
import { Card, Button, Table, Alert, Badge, Modal, Form, InputGroup, Pagination } from 'react-bootstrap';

const ReservationManagement = () => {
  const [reservations, setReservations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedReservation, setSelectedReservation] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchTimeout, setSearchTimeout] = useState(null);

  const API_URL = import.meta.env.VITE_API_URL;
  const ITEMS_PER_PAGE = 10;

  useEffect(() => {
    fetchReservations();
  }, [currentPage]);

  useEffect(() => {
    if (searchTimeout) {
      clearTimeout(searchTimeout);
    }
    
    const timeout = setTimeout(() => {
      setCurrentPage(1);
      fetchReservations();
    }, 500);

    setSearchTimeout(timeout);

    return () => {
      if (searchTimeout) {
        clearTimeout(searchTimeout);
      }
    };
  }, [searchQuery]);

  const fetchReservations = async () => {
    setLoading(true);
    try {
      const response = await axios.get(`${API_URL}admin/reservations`, {
        params: {
          page: currentPage,
          limit: ITEMS_PER_PAGE,
          search: searchQuery
        },
        withCredentials: true,
      });
      setReservations(response.data.reservations);
      setTotalPages(response.data.pagination.pages);
      setError("");
    } catch (err) {
      console.error("Error fetching reservations:", err);
      setError("Failed to load reservations. Please try again.");
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

  const openDeleteModal = (reservation) => {
    setSelectedReservation(reservation);
    setShowDeleteModal(true);
  };

  const closeDeleteModal = () => {
    setShowDeleteModal(false);
    setSelectedReservation(null);
  };

  const handleDeleteReservation = async () => {
    if (!selectedReservation) return;
    
    try {
      await axios.delete(`${API_URL}admin/reservation/${selectedReservation._id}`, {
        withCredentials: true
      });
      
      setSuccessMessage("Reservation deleted successfully!");
      setTimeout(() => setSuccessMessage(""), 3000);
      
      fetchReservations();
      closeDeleteModal();
    } catch (error) {
      console.error("Error deleting reservation:", error);
      setError("Failed to delete reservation. Please try again.");
    }
  };

  const handlePageChange = (pageNumber) => {
    setCurrentPage(pageNumber);
    window.scrollTo(0, 0);
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

  const renderPagination = () => {
    if (totalPages <= 1) return null;

    let items = [];
    const maxVisiblePages = 5;
    let startPage = Math.max(1, currentPage - Math.floor(maxVisiblePages / 2));
    let endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);

    if (endPage - startPage + 1 < maxVisiblePages) {
      startPage = Math.max(1, endPage - maxVisiblePages + 1);
    }

    items.push(
      <Pagination.Prev
        key="prev"
        onClick={() => handlePageChange(currentPage - 1)}
        disabled={currentPage === 1}
      />
    );

    if (startPage > 1) {
      items.push(
        <Pagination.Item key={1} onClick={() => handlePageChange(1)}>
          1
        </Pagination.Item>
      );
      if (startPage > 2) {
        items.push(<Pagination.Ellipsis key="ellipsis1" />);
      }
    }

    for (let number = startPage; number <= endPage; number++) {
      items.push(
        <Pagination.Item
          key={number}
          active={number === currentPage}
          onClick={() => handlePageChange(number)}
        >
          {number}
        </Pagination.Item>
      );
    }

    if (endPage < totalPages) {
      if (endPage < totalPages - 1) {
        items.push(<Pagination.Ellipsis key="ellipsis2" />);
      }
      items.push(
        <Pagination.Item
          key={totalPages}
          onClick={() => handlePageChange(totalPages)}
        >
          {totalPages}
        </Pagination.Item>
      );
    }

    items.push(
      <Pagination.Next
        key="next"
        onClick={() => handlePageChange(currentPage + 1)}
        disabled={currentPage === totalPages}
      />
    );

    return <Pagination className="justify-content-center mt-4">{items}</Pagination>;
  };

  return (
    <Card className="shadow-sm">
      <Card.Body>
        <div className="d-flex justify-content-between align-items-center mb-4">
          <h3 className="mb-0">Current Reservations</h3>
          <Button variant="outline-primary" onClick={fetchReservations}>
            <i className="bi bi-arrow-clockwise me-1"></i> Refresh
          </Button>
        </div>

        {successMessage && (
          <Alert variant="success" className="mb-4" dismissible onClose={() => setSuccessMessage("")}>
            {successMessage}
          </Alert>
        )}

        {error && (
          <Alert variant="danger" className="mb-4" dismissible onClose={() => setError("")}>
            {error}
          </Alert>
        )}

        <Form className="mb-4">
          <InputGroup>
            <Form.Control
              type="text"
              placeholder="Search by resource name..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            {searchQuery && (
              <Button 
                variant="outline-secondary"
                onClick={() => setSearchQuery("")}
              >
                <i className="bi bi-x-lg"></i>
              </Button>
            )}
          </InputGroup>
        </Form>

        {loading ? (
          <div className="text-center py-4">
            <div className="spinner-border text-primary" role="status">
              <span className="visually-hidden">Loading...</span>
            </div>
            <p className="mt-2">Loading reservations...</p>
          </div>
        ) : reservations.length === 0 ? (
          <Alert variant="info">
            {searchQuery 
              ? `No reservations found matching "${searchQuery}"`
              : "No active reservations at the moment."
            }
          </Alert>
        ) : (
          <>
            <Table responsive hover>
              <thead>
                <tr>
                  <th>Resource</th>
                  <th>Type</th>
                  <th>Start Time</th>
                  <th>End Time</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {reservations.map((reservation) => (
                  <tr key={reservation._id}>
                    <td>
                      <div className="d-flex align-items-center">
                        {getResourceTypeIcon(reservation.resource_type)}
                        {reservation.resource_id?.name || "Unknown Resource"}
                      </div>
                    </td>
                    <td>{reservation.resource_type}</td>
                    <td>{formatDateTime(reservation.start_time)}</td>
                    <td>{formatDateTime(reservation.end_time)}</td>
                    <td>
                      <Badge bg="success">Active</Badge>
                    </td>
                    <td>
                      <Button 
                        variant="danger" 
                        size="sm"
                        onClick={() => openDeleteModal(reservation)}
                      >
                        <i className="bi bi-trash me-1"></i> Delete
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </Table>

            {renderPagination()}
          </>
        )}
      </Card.Body>

      {/* Delete Confirmation Modal */}
      <Modal show={showDeleteModal} onHide={closeDeleteModal}>
        <Modal.Header closeButton>
          <Modal.Title>Delete Reservation</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {selectedReservation && (
            <p>
              Are you sure you want to delete the reservation for{" "}
              <strong>{selectedReservation.resource_id?.name || "this resource"}</strong> on{" "}
              {formatDateTime(selectedReservation.start_time)}?
            </p>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={closeDeleteModal}>
            Cancel
          </Button>
          <Button variant="danger" onClick={handleDeleteReservation}>
            Delete Reservation
          </Button>
        </Modal.Footer>
      </Modal>
    </Card>
  );
};

export default ReservationManagement;