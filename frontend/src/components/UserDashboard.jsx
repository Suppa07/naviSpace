import { useState, useEffect } from "react";
import { Container, Tab, Tabs, Alert } from 'react-bootstrap';
import { useLocation } from 'react-router-dom';
import ResourceBooking from "./user/ResourceBooking";
import MyReservations from "./user/MyReservations";
import MyFavorites from "./user/MyFavorites";
import UserSearch from "./user/UserSearch";

const UserDashboard = () => {
  const [successMessage, setSuccessMessage] = useState("");
  const [error, setError] = useState("");
  const [activeTab, setActiveTab] = useState("available");
  const location = useLocation();

  useEffect(() => {
    // Parse URL parameters
    const searchParams = new URLSearchParams(location.search);
    const tab = searchParams.get('tab');
    if (tab) {
      setActiveTab(tab);
    }
  }, [location]);

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
      
      <Tabs 
        activeKey={activeTab} 
        onSelect={(k) => setActiveTab(k)} 
        className="mb-4"
      >
        <Tab eventKey="available" title="Available Resources">
          <ResourceBooking />
        </Tab>
        
        <Tab eventKey="reservations" title="My Reservations">
          <MyReservations />
        </Tab>
        
        <Tab eventKey="favorites" title="My Favorites">
          <MyFavorites />
        </Tab>

        <Tab eventKey="search" title="Search Users">
          <UserSearch />
        </Tab>
      </Tabs>
    </Container>
  );
};

export default UserDashboard;