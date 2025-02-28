import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Card, Button } from 'react-bootstrap';
import { Link } from 'react-router-dom';

const Home = () => {
  const [user, setUser] = useState(null);
  const backendUrl = `${import.meta.env.VITE_API_URL}`;

  useEffect(() => {
    const fetchProtectedData = async () => {
      try {
        const response = await fetch(`${backendUrl}auth/protected`, {
          method: "GET",
          credentials: "include",
        });

        if (response.ok) {
          const data = await response.json();
          setUser(data);
        }
      } catch (error) {
        console.error("Error fetching user data:", error);
      }
    };

    fetchProtectedData();
  }, []);

  return (
    <Container className="py-5">
      <Row className="justify-content-center mb-5">
        <Col md={8} className="text-center">
          <h1 className="display-4 mb-4">Welcome to NaviSpace</h1>
          <p className="lead">
            The smart solution for managing office resources, desk reservations, and parking spots.
          </p>
          {!user && (
            <div className="mt-4">
              <Link to="/login">
                <Button variant="primary" size="lg" className="me-3">
                  Login
                </Button>
              </Link>
              <Link to="/signup">
                <Button variant="outline-primary" size="lg">
                  Sign Up
                </Button>
              </Link>
            </div>
          )}
        </Col>
      </Row>

      <Row className="mb-5">
        <Col md={4} className="mb-4">
          <Card className="h-100 shadow-sm">
            <Card.Body className="text-center">
              <div className="mb-3">
                <i className="bi bi-calendar-check fs-1 text-primary"></i>
              </div>
              <Card.Title>Easy Booking</Card.Title>
              <Card.Text>
                Book desks and parking spots in advance with our intuitive interface.
              </Card.Text>
            </Card.Body>
          </Card>
        </Col>
        <Col md={4} className="mb-4">
          <Card className="h-100 shadow-sm">
            <Card.Body className="text-center">
              <div className="mb-3">
                <i className="bi bi-clock-history fs-1 text-primary"></i>
              </div>
              <Card.Title>Real-time Availability</Card.Title>
              <Card.Text>
                See what resources are available right now and plan accordingly.
              </Card.Text>
            </Card.Body>
          </Card>
        </Col>
        <Col md={4} className="mb-4">
          <Card className="h-100 shadow-sm">
            <Card.Body className="text-center">
              <div className="mb-3">
                <i className="bi bi-star fs-1 text-primary"></i>
              </div>
              <Card.Title>Favorites</Card.Title>
              <Card.Text>
                Save your preferred spots for quick and easy booking in the future.
              </Card.Text>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      {user && (
        <Row className="justify-content-center">
          <Col md={6} className="text-center">
            <Card className="shadow">
              <Card.Body>
                <Card.Title>Ready to get started?</Card.Title>
                <Link to={user.role === 'admin' ? '/admin' : '/user'}>
                  <Button variant="success" size="lg" className="mt-3">
                    Go to Dashboard
                  </Button>
                </Link>
              </Card.Body>
            </Card>
          </Col>
        </Row>
      )}
    </Container>
  );
};

export default Home;