import React, { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import axios from "axios";
import {
  Container,
  Row,
  Col,
  Form,
  Button,
  Card,
  Alert,
  Modal,
} from "react-bootstrap";

const Login = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showVerificationModal, setShowVerificationModal] = useState(false);
  const [showResetModal, setShowResetModal] = useState(false);
  const [resetEmail, setResetEmail] = useState("");
  const [resetPassword, setResetPassword] = useState("");
  const [resetToken, setResetToken] = useState("");
  const [verificationEmail, setVerificationEmail] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const navigate = useNavigate();

  useEffect(() => {
    // Load Google Sign-In script
    const script = document.createElement('script');
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.defer = true;
    document.body.appendChild(script);

    return () => {
      document.body.removeChild(script);
    };
  }, []);

  const handleGoogleCallback = async (response) => {
    try {
      const res = await axios.post(
        `${import.meta.env.VITE_API_URL}auth/google`,
        { token: response.credential },
        { withCredentials: true }
      );

      if (res.data.needsProfileCompletion) {
        navigate("/complete-profile");
      } else if (res.data.role === "admin") {
        navigate("/admin");
      } else {
        navigate("/user");
      }
    } catch (err) {
      console.error("Google login error:", err);
      setError("Failed to login with Google. Please try again.");
    }
  };

  useEffect(() => {
    if (window.google) {
      window.google.accounts.id.initialize({
        client_id: import.meta.env.VITE_GOOGLE_CLIENT_ID,
        callback: handleGoogleCallback,
      });

      window.google.accounts.id.renderButton(
        document.getElementById("googleSignIn"),
        { theme: "outline", size: "large", width: "100%" }
      );
    }
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    if (!email || !password) {
      setError("Please fill in both fields.");
      setLoading(false);
      return;
    }
    if (
      !email ||
      !password ||
      !/^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(email)
    ) {
      setError("Please fill in both fields with a valid email address.");
      setLoading(false);
      return;
    }
    try {
      const response = await axios.post(
        `${import.meta.env.VITE_API_URL}auth/login`,
        { email_id: email, password },
        { withCredentials: true }
      );

      if (response.data.role === "admin") {
        navigate("/admin");
      } else {
        navigate("/user");
      }
    } catch (err) {
      if (err.response?.data?.needsVerification) {
        setVerificationEmail(email);
        setShowVerificationModal(true);
      } else {
        setError(err.response?.data?.error || "Invalid email or password.");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleResendVerification = async () => {
    try {
      await axios.post(
        `${import.meta.env.VITE_API_URL}auth/resend-verification`,
        { email: verificationEmail }
      );
      setSuccessMessage("Verification email sent successfully!");
      setTimeout(() => setShowVerificationModal(false), 2000);
    } catch (err) {
      setError(err.response?.data?.error || "Failed to resend verification email.");
    }
  };

  const handleRequestPasswordReset = async () => {
    try {
      await axios.post(
        `${import.meta.env.VITE_API_URL}auth/request-password-reset`,
        { email: resetEmail }
      );
      setSuccessMessage("Password reset email sent successfully!");
      setShowResetModal(true);
    } catch (err) {
      setError(err.response?.data?.error || "Failed to send reset email.");
    }
  };

  const handlePasswordReset = async () => {
    try {
      await axios.post(
        `${import.meta.env.VITE_API_URL}auth/reset-password`,
        {
          email: resetEmail,
          password: resetPassword,
          token: resetToken,
        }
      );
      setSuccessMessage("Password reset successfully! Please login with your new password.");
      setShowResetModal(false);
      setResetEmail("");
      setResetPassword("");
      setResetToken("");
    } catch (err) {
      setError(err.response?.data?.error || "Failed to reset password.");
    }
  };

  return (
    <Container className="py-5">
      <Row className="justify-content-center">
        <Col md={6} lg={5}>
          <Card className="shadow">
            <Card.Body className="p-4">
              <div className="text-center mb-4">
                <h2 className="fw-bold">Welcome Back</h2>
                <p className="text-muted">Sign in to your account</p>
              </div>

              {error && <Alert variant="danger">{error}</Alert>}
              {successMessage && <Alert variant="success">{successMessage}</Alert>}

              <Form onSubmit={handleSubmit} className="mb-4">
                <Form.Group className="mb-3">
                  <Form.Label>Email Address</Form.Label>
                  <Form.Control
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Enter your email"
                    required
                  />
                </Form.Group>

                <Form.Group className="mb-4">
                  <div className="d-flex justify-content-between align-items-center">
                    <Form.Label>Password</Form.Label>
                    <Button
                      variant="link"
                      className="p-0"
                      onClick={() => setShowResetModal(true)}
                    >
                      Forgot Password?
                    </Button>
                  </div>
                  <Form.Control
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter your password"
                    required
                  />
                </Form.Group>

                <div className="d-grid">
                  <Button
                    variant="primary"
                    type="submit"
                    size="lg"
                    disabled={loading}
                  >
                    {loading ? "Signing in..." : "Sign In"}
                  </Button>
                </div>
              </Form>

              <div className="position-relative mb-4">
                <hr className="text-muted" />
                <div 
                  className="position-absolute top-50 start-50 translate-middle px-3 bg-white"
                  style={{ marginTop: "-1px" }}
                >
                  or
                </div>
              </div>

              <div id="googleSignIn" className="d-grid mb-4"></div>

              <div className="text-center">
                <p className="mb-0">
                  Don't have an account? <Link to="/signup">Sign up</Link>
                </p>
              </div>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      {/* Email Verification Modal */}
      <Modal show={showVerificationModal} onHide={() => setShowVerificationModal(false)}>
        <Modal.Header closeButton>
          <Modal.Title>Email Verification Required</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <p>Your email address needs to be verified before you can login.</p>
          <p>Would you like us to resend the verification email to {verificationEmail}?</p>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowVerificationModal(false)}>
            Close
          </Button>
          <Button variant="primary" onClick={handleResendVerification}>
            Resend Verification
          </Button>
        </Modal.Footer>
      </Modal>

      {/* Password Reset Modal */}
      <Modal show={showResetModal} onHide={() => setShowResetModal(false)}>
        <Modal.Header closeButton>
          <Modal.Title>Reset Password</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form>
            <Form.Group className="mb-3">
              <Form.Label>Email Address</Form.Label>
              <Form.Control
                type="email"
                value={resetEmail}
                onChange={(e) => setResetEmail(e.target.value)}
                placeholder="Enter your email"
              />
            </Form.Group>

            {resetToken && (
              <>
                <Form.Group className="mb-3">
                  <Form.Label>Reset Token</Form.Label>
                  <Form.Control
                    type="text"
                    value={resetToken}
                    onChange={(e) => setResetToken(e.target.value)}
                    placeholder="Enter reset token from email"
                  />
                </Form.Group>

                <Form.Group className="mb-3">
                  <Form.Label>New Password</Form.Label>
                  <Form.Control
                    type="password"
                    value={resetPassword}
                    onChange={(e) => setResetPassword(e.target.value)}
                    placeholder="Enter new password"
                  />
                </Form.Group>
              </>
            )}
          </Form>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowResetModal(false)}>
            Close
          </Button>
          {resetToken ? (
            <Button variant="primary" onClick={handlePasswordReset}>
              Reset Password
            </Button>
          ) : (
            <Button variant="primary" onClick={handleRequestPasswordReset}>
              Send Reset Email
            </Button>
          )}
        </Modal.Footer>
      </Modal>
    </Container>
  );
};

export default Login;