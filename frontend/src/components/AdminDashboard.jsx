import { useState } from "react";
import { Container, Tab, Tabs, Alert } from 'react-bootstrap';
import ResourceManagement from "./admin/ResourceManagement";
import ReservationManagement from "./admin/ReservationManagement";
import UserManagement from "./admin/UserManagement";
import FloorPlanManagement from "./admin/FloorPlanManagement";

const AdminDashboard = () => {
  const [successMessage, setSuccessMessage] = useState("");
  const [error, setError] = useState("");

  return (
    <Container className="py-4">
      <h1 className="mb-4">Admin Dashboard</h1>
      
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
      
      <Tabs defaultActiveKey="resources" className="mb-4">
        <Tab eventKey="resources" title="Resources">
          <ResourceManagement />
        </Tab>

        <Tab eventKey="reservations" title="Reservations">
          <ReservationManagement />
        </Tab>
        
        <Tab eventKey="users" title="Users">
          <UserManagement />
        </Tab>
        
        <Tab eventKey="floorplans" title="Floor Plans">
          <FloorPlanManagement />
        </Tab>
      </Tabs>
    </Container>
  );
};

export default AdminDashboard;