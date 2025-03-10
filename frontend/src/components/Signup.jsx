import { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate, Link } from 'react-router-dom';
import {
  Container,
  Row,
  Col,
  Form,
  Button,
  Card,
  Alert,
  Spinner,
} from 'react-bootstrap';
import { z } from 'zod';

// Define the validation schema
const signupSchema = z.object({
  username: z
    .string()
    .min(3, 'Username must be at least 3 characters')
    .max(50, 'Username cannot exceed 50 characters'),
  email_id: z
    .string()
    .email('Invalid email address')
    .min(1, 'Email is required'),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .regex(
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
      'Password must contain at least one uppercase letter, one lowercase letter, and one number'
    ),
  role: z.enum(['user', 'admin']),
  company_name: z.string().min(1, 'Company name is required'),
});

const Signup = () => {
  const [formData, setFormData] = useState({
    username: '',
    email_id: '',
    password: '',
    role: 'user',
    company_name: '',
  });
  const [companies, setCompanies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [validationErrors, setValidationErrors] = useState({});
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
        setError('Failed to load companies. Please try again later.');
        setLoading(false);
      });
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    // Clear validation error for the field being changed
    setValidationErrors((prev) => ({ ...prev, [name]: undefined }));
  };

  const validateForm = () => {
    try {
      signupSchema.parse(formData);
      setValidationErrors({});
      return true;
    } catch (err) {
      if (err instanceof z.ZodError) {
        const errors = {};
        err.errors.forEach((error) => {
          const field = error.path[0];
          errors[field] = error.message;
        });
        setValidationErrors(errors);
      }
      return false;
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    
    // Validate form
    if (!validateForm()) {
      return;
    }

    setSubmitting(true);

    try {
      const res = await axios.post(
        `${import.meta.env.VITE_API_URL}auth/signup`,
        formData,
        { withCredentials: true }
      );

      if (formData.role === 'admin') {
        navigate('/admin');
      } else if (formData.role === 'user') {
        navigate('/user');
      }
    } catch (err) {
      setError(
        err.response?.data?.message || 'Signup failed. Please try again.'
      );
    } finally {
      setSubmitting(false);
    }
  };

  const getFieldError = (fieldName) => {
    return validationErrors[fieldName] ? (
      <Form.Text className="text-danger">
        {validationErrors[fieldName]}
      </Form.Text>
    ) : null;
  };

  return (
    <Container className="py-5">
      <Row className="justify-content-center">
        <Col md={8} lg={6}>
          <Card className="shadow">
            <Card.Body className="p-4">
              <div className="text-center mb-4">
                <h2 className="fw-bold">Create an Account</h2>
                <p className="text-muted">
                  Join NaviSpace to manage office resources
                </p>
              </div>

              {error && <Alert variant="danger">{error}</Alert>}

              <Form onSubmit={handleSubmit} noValidate>
                <Form.Group className="mb-3">
                  <Form.Label>Username</Form.Label>
                  <Form.Control
                    type="text"
                    name="username"
                    value={formData.username}
                    onChange={handleChange}
                    placeholder="Enter your username"
                    isInvalid={!!validationErrors.username}
                    required
                  />
                  {getFieldError('username')}
                </Form.Group>

                <Form.Group className="mb-3">
                  <Form.Label>Email Address</Form.Label>
                  <Form.Control
                    type="email"
                    name="email_id"
                    value={formData.email_id}
                    onChange={handleChange}
                    placeholder="Enter your email"
                    isInvalid={!!validationErrors.email_id}
                    required
                  />
                  {getFieldError('email_id')}
                </Form.Group>

                <Form.Group className="mb-3">
                  <Form.Label>Password</Form.Label>
                  <Form.Control
                    type="password"
                    name="password"
                    value={formData.password}
                    onChange={handleChange}
                    placeholder="Create a password"
                    isInvalid={!!validationErrors.password}
                    required
                  />
                  {getFieldError('password')}
                </Form.Group>

                <Form.Group className="mb-3">
                  <Form.Label>Role</Form.Label>
                  <Form.Select
                    name="role"
                    value={formData.role}
                    onChange={handleChange}
                    isInvalid={!!validationErrors.role}
                    required
                  >
                    <option value="user">User</option>
                    <option value="admin">Admin</option>
                  </Form.Select>
                  {getFieldError('role')}
                </Form.Group>

                {formData.role === 'admin' ? (
                  <Form.Group className="mb-4">
                    <Form.Label>Company Name</Form.Label>
                    <Form.Control
                      type="text"
                      name="company_name"
                      value={formData.company_name}
                      onChange={handleChange}
                      placeholder="Enter new company name"
                      isInvalid={!!validationErrors.company_name}
                      required
                    />
                    <Form.Text className="text-muted">
                      As an admin, you'll create a new company.
                    </Form.Text>
                    {getFieldError('company_name')}
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
                        isInvalid={!!validationErrors.company_name}
                        required
                      >
                        <option value="">-- Select a company --</option>
                        {companies.map((company) => (
                          <option
                            key={company._id}
                            value={company.company_name}
                          >
                            {company.company_name}
                          </option>
                        ))}
                      </Form.Select>
                    )}
                    {getFieldError('company_name')}
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