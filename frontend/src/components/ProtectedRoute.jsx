import { Navigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import axios from 'axios';
import { Spinner, Container, Alert } from 'react-bootstrap';

const ProtectedRoute = ({ children, allowedRoles }) => {
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const response = await axios.get(`${import.meta.env.VITE_API_URL}auth/protected`, {
          withCredentials: true
        });
        setUser(response.data);
        setLoading(false);
      } catch (err) {
        console.error('Authentication error:', err);
        setError('You must be logged in to access this page');
        setLoading(false);
      }
    };

    checkAuth();
  }, []);

  if (loading) {
    return (
      <Container className="d-flex justify-content-center align-items-center" style={{ minHeight: '70vh' }}>
        <div className="text-center">
          <Spinner animation="border" role="status" variant="primary" />
          <p className="mt-3">Verifying your access...</p>
        </div>
      </Container>
    );
  }

  if (error || !user) {
    return <Navigate to="/login" replace />;
  }

  // Check if user has the required role
  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return (
      <Container className="py-5">
        <Alert variant="danger">
          <Alert.Heading>Access Denied</Alert.Heading>
          <p>
            You don't have permission to access this page. This area is restricted to {allowedRoles.join(' or ')} users.
          </p>
          <hr />
          <div className="d-flex justify-content-end">
            <a href="/" className="btn btn-outline-danger">
              Return to Home
            </a>
          </div>
        </Alert>
      </Container>
    );
  }

  return children;
};

export default ProtectedRoute;