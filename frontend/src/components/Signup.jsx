import { useState, useEffect } from "react";
import axios from "axios";
import { useNavigate, Link } from "react-router-dom";
import { Container, Row, Col, Form, Button, Card, Alert, Spinner } from 'react-bootstrap';

const Signup = () => {
  const [formData, setFormData] = useState({
    username: "",
    email_id: "",
    password: "",
    role: "user",
    company_name: "",
  });
  const [companies, setCompanies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const navigate = useNavigate();

  useEffect(() => {
    // Fetch the list of existing companies
    axios
      .get(`${import.meta.env.VITE_API_URL}companies`)
      .then((res) => {
        setCompanies(res.data);
        setLoading(false);
      })
      .catch((err) => {
        setError("Failed to load companies. Please try again later.");
        setLoading(false);
      });
  }, []);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSubmitting(true);

    // Validation
    if (!formData.username || !formData.email_id || !formData.password) {
      setError("Please fill in all required fields");
      setSubmitting(false);
      return;
    }

    if (formData.role === "user" && !formData.company_name) {
      setError("Please select a company");
      setSubmitting(false);
      return;
    }

    try {
      const res = await axios.post(
        `${import.meta.env.VITE_API_URL}auth/signup`,
        formData,
        { withCredentials: true }
      );
      
      if (formData.role === "admin") {
        navigate("/admin");
      } else if (formData.role === "user") {
        navigate("/user");
      }
    } catch (err) {
      setError(err.response?.data?.message || "Signup failed. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Container className="py-5">
      <Row className="justify-content-center">
        <Col md={8} lg={6}>
          <Card className="shadow">
            <Card.Body className="p-4">
              <div className="text-center mb-4">
                <h2 className="fw-bold">Create an Account</h2>
                <p className="text-muted">Join NaviSpace to manage office resources</p>
              </div>
              
              {error && <Alert variant="danger">{error}</Alert>}
              
              <Form onSubmit={handleSubmit}>
                <Form.Group className="mb-3">
                  <Form.Label>Username</Form.Label>
                  <Form.Control
                    type="text"
                    name="username"
                    value={formData.username}
                    onChange={handleChange}
                    placeholder="Enter your username"
                    required
                  />
                </Form.Group>

                <Form.Group className="mb-3">
                  <Form.Label>Email Address</Form.Label>
                  <Form.Control
                    type="email"
                    name="email_id"
                    value={formData.email_id}
                    onChange={handleChange}
                    placeholder="Enter your email"
                    required
                  />
                </Form.Group>

                <Form.Group className="mb-3">
                  <Form.Label>Password</Form.Label>
                  <Form.Control
                    type="password"
                    name="password"
                    value={formData.password}
                    onChange={handleChange}
                    placeholder="Create a password"
                    required
                  />
                </Form.Group>

                <Form.Group className="mb-3">
                  <Form.Label>Role</Form.Label>
                  <Form.Select
                    name="role"
                    value={formData.role}
                    onChange={handleChange}
                    required
                  >
                    <option value="user">User</option>
                    <option value="admin">Admin</option>
                  </Form.Select>
                </Form.Group>

                {formData.role === "admin" ? (
                  <Form.Group className="mb-4">
                    <Form.Label>Company Name</Form.Label>
                    <Form.Control
                      type="text"
                      name="company_name"
                      value={formData.company_name}
                      onChange={handleChange}
                      placeholder="Enter new company name"
                      required
                    />
                    <Form.Text className="text-muted">
                      As an admin, you'll create a new company.
                    </Form.Text>
                  </Form.Group>
                ) : (
                  <Form.Group className="mb-4">
                    <Form.Label>Select Company</Form.Label>
                    {loading ? (
                      <div className="text-center py-3">
                        <Spinner animation="border" variant="primary" />
                        <p className="mt-2">Loading companies...</p>
                      </div>
                    ) : (
                      <Form.Select
                        name="company_name"
                        value={formData.company_name}
                        onChange={handleChange}
                        required
                      >
                        <option value="">-- Select a company --</option>
                        {companies.map((company) => (
                          <option key={company._id} value={company.company_name}>
                            {company.company_name}
                          </option>
                        ))}
                      </Form.Select>
                    )}
                  </Form.Group>
                )}

                <div className="d-grid">
                  <Button 
                    variant="primary" 
                    type="submit" 
                    size="lg"
                    disabled={submitting}
                  >
                    {submitting ? 'Creating Account...' : 'Sign Up'}
                  </Button>
                </div>
              </Form>
              
              <div className="text-center mt-4">
                <p>
                  Already have an account? <Link to="/login">Sign in</Link>
                </p>
              </div>
            </Card.Body>
          </Card>
        </Col>
      </Row>
    </Container>
  );
};

export default Signup;