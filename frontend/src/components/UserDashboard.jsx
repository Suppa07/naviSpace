import { useState } from "react";
import { Container, Tab, Tabs, Alert } from 'react-bootstrap';
import ResourceBooking from "./user/ResourceBooking";
import MyReservations from "./user/MyReservations";
import MyFavorites from "./user/MyFavorites";

const UserDashboard = () => {
  const [successMessage, setSuccessMessage] = useState("");
  const [error, setError] = useState("");

  return (
    <Container className="py-4">
      <h1 className="mb-4">User Dashboard</h1>
      
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
      
      <Tabs defaultActiveKey="available" className="mb-4">
        <Tab eventKey="available" title="Available Resources">
          <ResourceBooking />
        </Tab>
        
        <Tab eventKey="reservations" title="My Reservations">
          <MyReservations />
        </Tab>
        
        <Tab eventKey="favorites" title="My Favorites">
          <MyFavorites />
        </Tab>
      </Tabs>
    </Container>
  );
};

export default UserDashboard;