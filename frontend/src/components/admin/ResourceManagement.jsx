import { useState, useEffect } from "react";
import axios from "axios";
import { Card, Button, Table, Alert, Badge } from 'react-bootstrap';

const ResourceManagement = () => {
  const [resources, setResources] = useState([]);
  const [reservations, setReservations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const API_URL = import.meta.env.VITE_API_URL;

  useEffect(() => {
    fetchResources();
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

  return (
    <>
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
    </>
  );
};

export default ResourceManagement;