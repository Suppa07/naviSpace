import { useState, useEffect } from 'react';
import { Card, Form, Button, Alert, Table, Row, Col, Badge, Spinner } from 'react-bootstrap';
import axios from 'axios';
import { format, startOfWeek, endOfWeek, startOfMonth, endOfMonth, parseISO } from 'date-fns';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer
} from 'recharts';

const Analytics = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [dateRange, setDateRange] = useState({
    start: format(startOfWeek(new Date()), 'yyyy-MM-dd'),
    end: format(endOfWeek(new Date()), 'yyyy-MM-dd')
  });
  const [attendanceData, setAttendanceData] = useState(null);
  const [dailyData, setDailyData] = useState(null);
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [employeeData, setEmployeeData] = useState(null);

  const API_URL = import.meta.env.VITE_API_URL;

  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8'];

  useEffect(() => {
    fetchAttendanceData();
    fetchDailyData();
  }, [dateRange]);

  const fetchAttendanceData = async () => {
    setLoading(true);
    try {
      const response = await axios.get(`${API_URL}admin/analytics/attendance`, {
        params: dateRange,
        withCredentials: true
      });

      // Process the data to count unique days per user
      const processedAttendance = response.data.attendance.map(employee => {
        const uniqueDays = new Set(
          employee.reservations.map(res => format(new Date(res.date), 'yyyy-MM-dd'))
        );
        return {
          ...employee,
          totalDays: uniqueDays.size
        };
      });

      setAttendanceData({
        ...response.data,
        attendance: processedAttendance
      });
      setError('');
    } catch (err) {
      console.error('Error fetching attendance data:', err);
      setError('Failed to load attendance data');
    } finally {
      setLoading(false);
    }
  };

  const fetchDailyData = async () => {
    try {
      const response = await axios.get(`${API_URL}admin/analytics/daily`, {
        params: { date: new Date().toISOString() },
        withCredentials: true
      });
      setDailyData(response.data);
    } catch (err) {
      console.error('Error fetching daily data:', err);
    }
  };

  const fetchEmployeeData = async (userId) => {
    try {
      const response = await axios.get(`${API_URL}admin/analytics/employee/${userId}`, {
        params: {
          startDate: format(startOfMonth(new Date()), 'yyyy-MM-dd'),
          endDate: format(endOfMonth(new Date()), 'yyyy-MM-dd')
        },
        withCredentials: true
      });

      // Process attendance data to count unique days
      const uniqueDays = new Set(
        response.data.attendance
          .filter(day => day.present)
          .map(day => format(parseISO(day.date), 'yyyy-MM-dd'))
      );

      response.data.totalDays = uniqueDays.size;
      setEmployeeData(response.data);
    } catch (err) {
      console.error('Error fetching employee data:', err);
      setError('Failed to load employee data');
    }
  };

  const handleDateRangeChange = (e) => {
    const { name, value } = e.target;
    setDateRange(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleEmployeeSelect = (userId) => {
    setSelectedEmployee(userId);
    fetchEmployeeData(userId);
  };

  const getResourceTypeData = () => {
    if (!attendanceData) return [];
    
    const resourceTypes = {};
    attendanceData.attendance.forEach(employee => {
      employee.reservations.forEach(res => {
        resourceTypes[res.resourceType] = (resourceTypes[res.resourceType] || 0) + 1;
      });
    });

    return Object.entries(resourceTypes).map(([type, count]) => ({
      name: type,
      value: count
    }));
  };

  const getDailyAttendanceData = () => {
    if (!dailyData?.hourlyAttendance) return [];
    
    return dailyData.hourlyAttendance.map((count, hour) => ({
      hour: `${hour}:00`,
      count
    }));
  };

  const getEmployeeAttendanceData = () => {
    if (!attendanceData) return [];
    
    return attendanceData.attendance.map(employee => ({
      name: employee.username,
      days: employee.totalDays
    }));
  };

  return (
    <Card className="shadow-sm">
      <Card.Body>
        <h3 className="mb-4">Attendance Analytics</h3>

        {error && (
          <Alert variant="danger" className="mb-4">
            {error}
          </Alert>
        )}

        <Row className="mb-4">
          <Col md={6}>
            <Form.Group>
              <Form.Label>Start Date</Form.Label>
              <Form.Control
                type="date"
                name="start"
                value={dateRange.start}
                onChange={handleDateRangeChange}
              />
            </Form.Group>
          </Col>
          <Col md={6}>
            <Form.Group>
              <Form.Label>End Date</Form.Label>
              <Form.Control
                type="date"
                name="end"
                value={dateRange.end}
                onChange={handleDateRangeChange}
              />
            </Form.Group>
          </Col>
        </Row>

        {loading ? (
          <div className="text-center py-4">
            <Spinner animation="border" role="status">
              <span className="visually-hidden">Loading...</span>
            </Spinner>
          </div>
        ) : (
          <>
            {/* Daily Overview */}
            {dailyData && (
              <Card className="mb-4">
                <Card.Body>
                  <h4>Today's Overview</h4>
                  <Row className="g-4">
                    <Col md={4}>
                      <div className="border rounded p-3 text-center">
                        <h5>Present Employees</h5>
                        <h2>{dailyData.presentEmployees}</h2>
                        <p className="text-muted mb-0">
                          out of {dailyData.totalEmployees}
                        </p>
                      </div>
                    </Col>
                    <Col md={4}>
                      <div className="border rounded p-3 text-center">
                        <h5>Attendance Rate</h5>
                        <h2>{dailyData.attendancePercentage.toFixed(1)}%</h2>
                        <p className="text-muted mb-0">Today's attendance</p>
                      </div>
                    </Col>
                    <Col md={4}>
                      <div className="border rounded p-3 text-center">
                        <h5>Peak Hour</h5>
                        <h2>
                          {dailyData.hourlyAttendance.indexOf(
                            Math.max(...dailyData.hourlyAttendance)
                          )}:00
                        </h2>
                        <p className="text-muted mb-0">Most employees present</p>
                      </div>
                    </Col>
                  </Row>

                  {/* Daily Attendance Chart */}
                  <div className="mt-4" style={{ height: '300px' }}>
                    <h5>Hourly Attendance Distribution</h5>
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={getDailyAttendanceData()}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="hour" />
                        <YAxis />
                        <Tooltip />
                        <Legend />
                        <Line type="monotone" dataKey="count" stroke="#8884d8" name="Employees Present" />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </Card.Body>
              </Card>
            )}

            {/* Resource Usage Distribution */}
            <Card className="mb-4">
              <Card.Body>
                <h4>Resource Usage Distribution</h4>
                <div style={{ height: '300px' }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={getResourceTypeData()}
                        dataKey="value"
                        nameKey="name"
                        cx="50%"
                        cy="50%"
                        outerRadius={100}
                        label
                      >
                        {getResourceTypeData().map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </Card.Body>
            </Card>

            {/* Employee Attendance Chart */}
            <Card className="mb-4">
              <Card.Body>
                <h4>Employee Attendance Overview</h4>
                <div style={{ height: '300px' }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={getEmployeeAttendanceData()}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" />
                      <YAxis />
                      <Tooltip />
                      <Legend />
                      <Bar dataKey="days" fill="#8884d8" name="Days Present" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </Card.Body>
            </Card>

            {/* Employee List */}
            {attendanceData && (
              <div className="mb-4">
                <h4>Employee Attendance Details</h4>
                <Table responsive hover>
                  <thead>
                    <tr>
                      <th>Employee</th>
                      <th>Email</th>
                      <th>Days Present</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {attendanceData.attendance.map((employee) => (
                      <tr key={employee.userId}>
                        <td>{employee.username}</td>
                        <td>{employee.email}</td>
                        <td>
                          <Badge bg="primary">{employee.totalDays} days</Badge>
                        </td>
                        <td>
                          <Button
                            variant="outline-primary"
                            size="sm"
                            onClick={() => handleEmployeeSelect(employee.userId)}
                          >
                            View Details
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </Table>
              </div>
            )}

            {/* Employee Details */}
            {employeeData && (
              <Card>
                <Card.Body>
                  <h4>Employee Details</h4>
                  <p className="mb-4">
                    <strong>{employeeData.user.username}</strong> ({employeeData.user.email})
                  </p>

                  <Row className="g-4 mb-4">
                    <Col md={6}>
                      <div className="border rounded p-3">
                        <h5>This Week</h5>
                        <h3>{employeeData.stats.weekly.total} days</h3>
                        <div>
                          {employeeData.stats.weekly.dates.map(date => (
                            <Badge key={date} bg="success" className="me-1">
                              {format(new Date(date), 'MMM d')}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    </Col>
                    <Col md={6}>
                      <div className="border rounded p-3">
                        <h5>This Month</h5>
                        <h3>{employeeData.stats.monthly.total} days</h3>
                        <p className="text-muted mb-0">
                          {((employeeData.stats.monthly.total / 20) * 100).toFixed(1)}% attendance rate
                        </p>
                      </div>
                    </Col>
                  </Row>

                  <h5>Attendance Calendar</h5>
                  <div className="d-flex flex-wrap gap-2">
                    {employeeData.attendance.map(day => (
                      <div
                        key={day.date}
                        className={`border rounded p-2 text-center ${
                          day.present ? 'bg-success text-white' : 'bg-light'
                        }`}
                        style={{ width: '40px' }}
                      >
                        {format(new Date(day.date), 'd')}
                      </div>
                    ))}
                  </div>
                </Card.Body>
              </Card>
            )}
          </>
        )}
      </Card.Body>
    </Card>
  );
};

export default Analytics;