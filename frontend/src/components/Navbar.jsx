import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import axios from 'axios';
import { Navbar as BootstrapNavbar, Nav, Container, Button } from 'react-bootstrap';

const Navbar = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [user, setUser] = useState(null);

  useEffect(() => {
    // Check if user is logged in
    const checkAuth = async () => {
      try {
        const response = await axios.get(`${import.meta.env.VITE_API_URL}auth/protected`, {
          withCredentials: true
        });
        setUser(response.data);
      } catch (err) {
        setUser(null);
      }
    };
    
    checkAuth();
  }, [location.pathname]);

  const handleLogout = async () => {
    try {
      await axios.post(`${import.meta.env.VITE_API_URL}auth/logout`, {}, {
        withCredentials: true
      });
      setUser(null);
      navigate('/login');
    } catch (err) {
      console.error('Error logging out:', err);
    }
  };

  return (
    <BootstrapNavbar bg="primary" variant="dark" expand="lg">
      <Container>
        <BootstrapNavbar.Brand as={Link} to="/">
          <i className="bi bi-building me-2"></i>
          NaviSpace
        </BootstrapNavbar.Brand>
        <BootstrapNavbar.Toggle aria-controls="basic-navbar-nav" />
        <BootstrapNavbar.Collapse id="basic-navbar-nav">
          <Nav className="me-auto">
            <Nav.Link as={Link} to="/" active={location.pathname === '/'}>
              Home
            </Nav.Link>
            
            {user ? (
              // Show these links only when logged in
              <>
                {user.role === 'admin' ? (
                  <Nav.Link as={Link} to="/admin" active={location.pathname === '/admin'}>
                    Admin Dashboard
                  </Nav.Link>
                ) : (
                  <Nav.Link as={Link} to="/user" active={location.pathname === '/user'}>
                    User Dashboard
                  </Nav.Link>
                )}
              </>
            ) : (
              // Show these links when not logged in
              <>
                <Nav.Link as={Link} to="/login" active={location.pathname === '/login'}>
                  Login
                </Nav.Link>
                <Nav.Link as={Link} to="/signup" active={location.pathname === '/signup'}>
                  Signup
                </Nav.Link>
              </>
            )}
          </Nav>
          
          {user && (
            <Nav>
              <span className="navbar-text me-3 text-light">
                Welcome, {user.username}
              </span>
              <Button variant="outline-light" onClick={handleLogout}>
                Logout
              </Button>
            </Nav>
          )}
        </BootstrapNavbar.Collapse>
      </Container>
    </BootstrapNavbar>
  );
};

export default Navbar;