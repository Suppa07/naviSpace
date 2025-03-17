import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Container, Card, Form, Button, Alert ,Row,Col} from 'react-bootstrap';
import axios from 'axios';

const OAuthProfileCompletion = () => {
  const [companies, setCompanies] = useState([]);
  const [formData, setFormData] = useState({
    company_name: '',
    role: 'user'
  });
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    fetchCompanies();
    checkProfileStatus();
  }, []);

  const fetchCompanies = async () => {
    try {
      const response = await axios.get(`${import.meta.env.VITE_API_URL}companies`, {
        withCredentials: true
      });
      setCompanies(response.data);
      setLoading(false);
    } catch (err) {
      setError('Failed to load companies. Please try again later.');
      setLoading(false);
    }
  };

  const checkProfileStatus = async () => {
    try {
      const response = await axios.get(`${import.meta.env.VITE_API_URL}auth/protected`, {
        withCredentials: true
      });
      
      // If user already has company info, redirect to appropriate dashboard
      if (response.data.company_id) {
        navigate(response.data.role === 'admin' ? '/admin' : '/user');
      }
    } catch (err) {
      setError('Authentication error. Please try logging in again.');
      navigate('/login');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);

    try {
      const response = await axios.post(
        `${import.meta.env.VITE_API_URL}auth/complete-profile`,
        formData,
        { withCredentials: true }
      );

      if (response.data.role === 'admin') {
        navigate('/admin');
      } else {
        navigate('/user');
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to update profile. Please try again.');
      setSubmitting(false);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  if (loading) {
    return (
      <Container className="py-5">
        <div className="text-center">
          <div className="spinner-border text-primary" role="status">
            <span className="visually-hidden">Loading...</span>
          </div>
          <p className="mt-2">Loading...</p>
        </div>
      </Container>
    );
  }

  return (
    <Container className="py-5">
      <Row className="justify-content-center">
        <Col md={8} lg={6}>
          <Card className="shadow">
            <Card.Body className="p-4">
              <div className="text-center mb-4">
                <h2 className="fw-bold">Complete Your Profile</h2>
                <p className="text-muted">Please provide your company information to continue</p>
              </div>

              {error && (
                <Alert variant="danger" className="mb-4">
                  {error}
                </Alert>
              )}

              <Form onSubmit={handleSubmit}>
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

                {formData.role === 'admin' ? (
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
                  </Form.Group>
                )}

                <div className="d-grid">
                  <Button
                    variant="primary"
                    type="submit"
                    size="lg"
                    disabled={submitting}
                  >
                    {submitting ? 'Saving...' : 'Complete Profile'}
                  </Button>
                </div>
              </Form>
            </Card.Body>
          </Card>
        </Col>
      </Row>
    </Container>
  );
};

export default OAuthProfileCompletion;