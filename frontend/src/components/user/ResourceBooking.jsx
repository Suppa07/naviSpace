import { useState, useEffect, useRef } from "react";
import axios from "axios";
import {
  Card,
  Form,
  Button,
  Alert,
  Row,
  Col,
  Badge,
  Modal,
  Image,
  InputGroup,
  Pagination
} from "react-bootstrap";
import { Calendar, dateFnsLocalizer } from 'react-big-calendar';
import format from 'date-fns/format';
import parse from 'date-fns/parse';
import startOfWeek from 'date-fns/startOfWeek';
import getDay from 'date-fns/getDay';
import enUS from 'date-fns/locale/en-US';
import 'react-big-calendar/lib/css/react-big-calendar.css';
import * as PF from "pathfinding";

const locales = {
  'en-US': enUS,
};

const localizer = dateFnsLocalizer({
  format,
  parse,
  startOfWeek,
  getDay,
  locales,
});

const ResourceBooking = () => {
  const [resources, setResources] = useState([]);
  const [reservations, setReservations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [resourceType, setResourceType] = useState("desk");
  const [showBookingModal, setShowBookingModal] = useState(false);
  const [showNavigationModal, setShowNavigationModal] = useState(false);
  const [selectedResource, setSelectedResource] = useState(null);
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [resourceLocation, setResourceLocation] = useState(null);
  const [selectedFloorPlan, setSelectedFloorPlan] = useState(null);
  const [userLocation, setUserLocation] = useState(null);
  const [userRelativePosition, setUserRelativePosition] = useState(null);
  const [navigationPath, setNavigationPath] = useState(null);
  const canvasRef = useRef(null);
  const [imageLoaded, setImageLoaded] = useState(false);
  const [imageSize, setImageSize] = useState({ width: 0, height: 0 });
  const [calendarEvents, setCalendarEvents] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [searchTimeout, setSearchTimeout] = useState(null);

  const ITEMS_PER_PAGE = 9;
  const API_URL = import.meta.env.VITE_API_URL;

  useEffect(() => {
    fetchAvailability();
  }, [resourceType, currentPage]);

  useEffect(() => {
    if (searchTimeout) {
      clearTimeout(searchTimeout);
    }
    
    const timeout = setTimeout(() => {
      setCurrentPage(1);
      fetchAvailability();
    }, 500);

    setSearchTimeout(timeout);

    return () => {
      if (searchTimeout) {
        clearTimeout(searchTimeout);
      }
    };
  }, [searchQuery]);

  useEffect(() => {
    if (userLocation && selectedFloorPlan?.base_location) {
      calculateUserRelativePosition();
    }
  }, [userLocation, selectedFloorPlan]);

  useEffect(() => {
    if (
      userRelativePosition &&
      resourceLocation &&
      imageLoaded &&
      imageSize.width > 0 &&
      selectedFloorPlan?.realx &&
      selectedFloorPlan?.realy
    ) {
      calculatePath();
    }
  }, [userRelativePosition, resourceLocation, imageLoaded, imageSize]);

  useEffect(() => {
    if (selectedResource && reservations) {
      const events = reservations
        .filter(res => res.resource_id._id === selectedResource._id)
        .map(res => ({
          title: 'Reserved',
          start: new Date(res.start_time),
          end: new Date(res.end_time),
          allDay: false,
          resource: res.resource_id,
        }));
      setCalendarEvents(events);
    }
  }, [selectedResource, reservations]);

  const eventStyleGetter = (event) => {
    const style = {
      backgroundColor: '#dc3545',
      borderRadius: '5px',
      opacity: 0.8,
      color: 'white',
      border: 'none',
      display: 'block',
    };
    return { style };
  };

  const slotPropGetter = (date) => {
    const isReserved = calendarEvents.some(event => 
      date >= event.start && date <= event.end
    );
    
    return {
      className: isReserved ? 'reserved-slot' : 'available-slot',
      style: {
        backgroundColor: isReserved ? '#ffebee' : '#e8f5e9',
      }
    };
  };

  const handleSelectSlot = ({ start, end }) => {
    const now = new Date();
    if (start < now) {
      setError("Cannot book slots in the past");
      return;
    }

    const isSlotReserved = calendarEvents.some(event => 
      (start >= event.start && start < event.end) ||
      (end > event.start && end <= event.end)
    );

    if (isSlotReserved) {
      setError("This time slot is already reserved");
      return;
    }

    setStartTime(format(start, "yyyy-MM-dd'T'HH:mm"));
    setEndTime(format(end, "yyyy-MM-dd'T'HH:mm"));
  };

  const handleImageLoad = (event) => {
    setImageSize({
      width: event.target.naturalWidth,
      height: event.target.naturalHeight,
    });
    setImageLoaded(true);
  };

  const calculatePath = async () => {
    if (!canvasRef.current || !selectedFloorPlan) return;

    try {
      const img = document.createElement("img");
      img.crossOrigin = "anonymous";

      await new Promise((resolve, reject) => {
        img.onload = resolve;
        img.onerror = reject;
        img.src = selectedFloorPlan.layout_url;
      });

      const offscreenCanvas = document.createElement("canvas");
      const ctx = offscreenCanvas.getContext("2d");

      const GRID_SIZE = 100;
      offscreenCanvas.width = GRID_SIZE;
      offscreenCanvas.height = GRID_SIZE;

      ctx.drawImage(img, 0, 0, GRID_SIZE, GRID_SIZE);

      try {
        const imageData = ctx.getImageData(0, 0, GRID_SIZE, GRID_SIZE);
        const data = imageData.data;

        const grid = new PF.Grid(GRID_SIZE, GRID_SIZE);

        for (let y = 0; y < GRID_SIZE; y++) {
          for (let x = 0; x < GRID_SIZE; x++) {
            const idx = (y * GRID_SIZE + x) * 4;
            const isWalkable =
              data[idx] > 200 && data[idx + 1] > 200 && data[idx + 2] > 200;
            grid.setWalkableAt(x, y, isWalkable);
          }
        }

        const startX = Math.min(
          Math.max(Math.floor((userRelativePosition[0] / 100) * GRID_SIZE), 0),
          GRID_SIZE - 1
        );
        const startY = Math.min(
          Math.max(Math.floor((userRelativePosition[1] / 100) * GRID_SIZE), 0),
          GRID_SIZE - 1
        );
        const endX = Math.min(
          Math.max(Math.floor((resourceLocation[0] / 100) * GRID_SIZE), 0),
          GRID_SIZE - 1
        );
        const endY = Math.min(
          Math.max(Math.floor((resourceLocation[1] / 100) * GRID_SIZE), 0),
          GRID_SIZE - 1
        );

        grid.setWalkableAt(startX, startY, true);
        grid.setWalkableAt(endX, endY, true);

        const finder = new PF.AStarFinder({
          allowDiagonal: true,
          dontCrossCorners: true,
        });

        const path = finder.findPath(startX, startY, endX, endY, grid);

        if (path.length > 0) {
          const percentagePath = path.map(([x, y]) => [
            (x / GRID_SIZE) * 100,
            (y / GRID_SIZE) * 100,
          ]);

          setNavigationPath(percentagePath);
          drawPath(percentagePath);
        } else {
          setNavigationPath(null);
          drawPath([]);
          console.log("No valid path found between the points");
          setError("No valid path found between the points");
        }
      } catch (error) {
        console.error("Error processing image data:", error);
        setError("Failed to process floor plan for navigation");
      }
    } catch (error) {
      console.error("Error loading image:", error);
      setError("Failed to load floor plan for navigation");
    }
  };

  const drawPath = (path) => {
    if (!canvasRef.current) return;

    const canvas = canvasRef.current;
    const container = canvas.parentElement;

    canvas.width = container.offsetWidth;
    canvas.height = container.offsetHeight;

    const ctx = canvas.getContext("2d");
    const { width, height } = canvas;

    ctx.clearRect(0, 0, width, height);

    if (path.length > 0) {
      ctx.beginPath();
      ctx.strokeStyle = "#007bff";
      ctx.lineWidth = 3;

      path.forEach((point, index) => {
        const [x, y] = point;
        const canvasX = (x / 100) * width;
        const canvasY = (y / 100) * height;

        if (index === 0) {
          ctx.moveTo(canvasX, canvasY);
        } else {
          ctx.lineTo(canvasX, canvasY);
        }
      });

      ctx.stroke();
    }

    if (userRelativePosition) {
      drawMarker(ctx, userRelativePosition, "#28a745", "You are here");
    }
    if (resourceLocation) {
      drawMarker(ctx, resourceLocation, "#dc3545", "Destination");
    }
  };

  const drawMarker = (ctx, position, color, label) => {
    const [x, y] = position;
    const canvasX = (x / 100) * ctx.canvas.width;
    const canvasY = (y / 100) * ctx.canvas.height;

    ctx.beginPath();
    ctx.fillStyle = color;
    ctx.arc(canvasX, canvasY, 8, 0, Math.PI * 2);
    ctx.fill();

    ctx.beginPath();
    ctx.fillStyle = "white";
    ctx.arc(canvasX, canvasY, 4, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = "#000";
    ctx.font = "14px Arial";
    ctx.textAlign = "center";
    ctx.fillText(label, canvasX, canvasY - 15);
  };

  const getUserLocation = () => {
    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setUserLocation({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
          });
        },
        (error) => {
          console.error("Error getting location:", error);
          setError(
            "Failed to get your location. Please enable location services."
          );
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 0,
        }
      );
    } else {
      setError("Geolocation is not supported by your browser.");
    }
  };

  const calculateUserRelativePosition = () => {
    if (!userLocation || !selectedFloorPlan?.base_location) return;
    const baseLocation = selectedFloorPlan.base_location;

    const latDiff = userLocation.latitude - baseLocation.latitude;
    const lngDiff = userLocation.longitude - baseLocation.longitude;

    const metersPerLatDegree = 111111;
    const metersPerLngDegree =
      111111 * Math.cos(baseLocation.latitude * (Math.PI / 180));

    const yMeters = latDiff * metersPerLatDegree;
    const xMeters = lngDiff * metersPerLngDegree;

    const relativeX = (xMeters / selectedFloorPlan.realx) * 100 + 50;
    const relativeY = (yMeters / selectedFloorPlan.realy) * 100 + 50;

    const clampedX = Math.max(0, Math.min(100, relativeX));
    const clampedY = Math.max(0, Math.min(100, relativeY));

    console.log(
      "Real dimensions:",
      selectedFloorPlan.realx,
      selectedFloorPlan.realy
    );
    console.log("Calculated position:", clampedX, clampedY);

    setUserRelativePosition([clampedX, clampedY]);
  };

  const fetchAvailability = async () => {
    setLoading(true);
    try {
      const response = await axios.get(
        `${API_URL}users/availability`,
        {
          params: {
            resourceType,
            page: currentPage,
            limit: ITEMS_PER_PAGE,
            search: searchQuery
          },
          withCredentials: true
        }
      );
      
      setResources(response.data.resources);
      setReservations(response.data.reservations);
      setTotalPages(response.data.pagination.pages);
      setHasMore(response.data.pagination.hasMore);
      setError("");
    } catch (error) {
      console.error("Error fetching availability:", error);
      setError("Failed to load available resources. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleBookResource = async () => {
    if (!startTime || !endTime) {
      setError("Please select both start and end times");
      return;
    }

    if (new Date(startTime) >= new Date(endTime)) {
      setError("End time must be after start time");
      return;
    }

    try {
      await axios.post(
        `${API_URL}users/book`,
        {
          resourceId: selectedResource._id,
          startTime,
          endTime,
        },
        { withCredentials: true }
      );

      setSuccessMessage("Resource booked successfully!");
      setTimeout(() => setSuccessMessage(""), 3000);
      closeBookingModal();
      fetchAvailability();
    } catch (error) {
      setError(
        error.response?.data?.error ||
          "Error booking resource. Please try again."
      );
    }
  };

  const handleFavorite = async (resource) => {
    try {
      await axios.post(
        `${API_URL}users/favorite`,
        {
          resourceType: resource.resource_type,
          resourceId: resource._id,
        },
        { withCredentials: true }
      );

      setSuccessMessage("Resource added to favorites!");
      setTimeout(() => setSuccessMessage(""), 3000);
    } catch (error) {
      console.error("Error marking favorite:", error);
      setError("Failed to add to favorites. Please try again.");
    }
  };

  const openBookingModal = (resource) => {
    setSelectedResource(resource);
    const now = new Date();
    const localStartTime = new Date(
      now.getTime() - now.getTimezoneOffset() * 60000
    )
      .toISOString()
      .slice(0, 16);

    const endDate = new Date(
      now.getTime() + 60 * 60000 - now.getTimezoneOffset() * 60000
    )
      .toISOString()
      .slice(0, 16);

    setStartTime(localStartTime);
    setEndTime(endDate);
    setShowBookingModal(true);
  };

  const closeBookingModal = () => {
    setShowBookingModal(false);
    setSelectedResource(null);
    setStartTime("");
    setEndTime("");
    setError("");
  };

  const openNavigationModal = async (resource) => {
    setSelectedResource(resource);
    setError("");
    await getUserLocation();
    try {
      const response = await axios.get(
        `${API_URL}users/resource-location/${resource._id}`,
        {
          withCredentials: true,
        }
      );
      const resourceData = response.data.resource;
      setResourceLocation(resourceData.location);
      setSelectedFloorPlan(resourceData.floor);
      setShowNavigationModal(true);
    } catch (error) {
      console.error("Error fetching resource location:", error);
      setError("Failed to load resource location information.");
    }
  };

  const closeNavigationModal = () => {
    setShowNavigationModal(false);
    setSelectedResource(null);
    setSelectedFloorPlan(null);
    setResourceLocation(null);
    setUserRelativePosition(null);
    setImageLoaded(false);
  };

  const getResourceTypeIcon = (type) => {
    switch (type?.toLowerCase()) {
      case "desk":
        return <i className="bi bi-laptop me-2"></i>;
      case "meeting room":
        return <i className="bi bi-people me-2"></i>;
      case "parking spot":
        return <i className="bi bi-car-front me-2"></i>;
      default:
        return <i className="bi bi-building me-2"></i>;
    }
  };

  const isResourceAvailable = (resource) => {
    const now = new Date();
    const resourceReservations = reservations.filter(
      (r) => r.resource_id._id === resource._id
    );
    return !resourceReservations.some(
      (reservation) =>
        new Date(reservation.end_time) > now &&
        new Date(reservation.start_time) < now
    );
  };

  const handlePageChange = (pageNumber) => {
    setCurrentPage(pageNumber);
    window.scrollTo(0, 0);
  };

  const renderPagination = () => {
    if (totalPages <= 1) return null;

    let items = [];
    const maxVisiblePages = 5;
    let startPage = Math.max(1, currentPage - Math.floor(maxVisiblePages / 2));
    let endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);

    if (endPage - startPage + 1 < maxVisiblePages) {
      startPage = Math.max(1, endPage - maxVisiblePages + 1);
    }

    items.push(
      <Pagination.Prev
        key="prev"
        onClick={() => handlePageChange(currentPage - 1)}
        disabled={currentPage === 1}
      />
    );

    if (startPage > 1) {
      items.push(
        <Pagination.Item key={1} onClick={() => handlePageChange(1)}>
          1
        </Pagination.Item>
      );
      if (startPage > 2) {
        items.push(<Pagination.Ellipsis key="ellipsis1" />);
      }
    }

    for (let number = startPage; number <= endPage; number++) {
      items.push(
        <Pagination.Item
          key={number}
          active={number === currentPage}
          onClick={() => handlePageChange(number)}
        >
          {number}
        </Pagination.Item>
      );
    }

    if (endPage < totalPages) {
      if (endPage < totalPages - 1) {
        items.push(<Pagination.Ellipsis key="ellipsis2" />);
      }
      items.push(
        <Pagination.Item
          key={totalPages}
          onClick={() => handlePageChange(totalPages)}
        >
          {totalPages}
        </Pagination.Item>
      );
    }

    items.push(
      <Pagination.Next
        key="next"
        onClick={() => handlePageChange(currentPage + 1)}
        disabled={currentPage === totalPages}
      />
    );

    return <Pagination className="justify-content-center mt-4">{items}</Pagination>;
  };

  return (
    <Card className="shadow-sm">
      <Card.Body>
        <div className="d-flex justify-content-between align-items-center mb-4">
          <h3 className="mb-0">Available Resources</h3>
          <Button variant="outline-primary" onClick={fetchAvailability}>
            <i className="bi bi-arrow-clockwise me-1"></i> Refresh
          </Button>
        </div>

        {successMessage && (
          <Alert variant="success" className="mb-4">
            {successMessage}
          </Alert>
        )}

        {error && (
          <Alert variant="danger" className="mb-4">
            {error}
          </Alert>
        )}

        <div className="mb-4">
          <Row>
            <Col md={4}>
              <Form.Group>
                <Form.Label>Resource Type</Form.Label>
                <Form.Select
                  value={resourceType}
                  onChange={(e) => {
                    setResourceType(e.target.value);
                    setCurrentPage(1);
                  }}
                >
                  <option value="desk">Desks</option>
                  <option value="meeting room">Meeting Rooms</option>
                  <option value="parking spot">Parking Spots</option>
                </Form.Select>
              </Form.Group>
            </Col>
            <Col md={8}>
              <Form.Group>
                <Form.Label>Search</Form.Label>
                <InputGroup>
                  <Form.Control
                    type="text"
                    placeholder="Search by name or amenities..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                  {searchQuery && (
                    <Button 
                      variant="outline-secondary"
                      onClick={() => setSearchQuery("")}
                    >
                      <i className="bi bi-x-lg"></i>
                    </Button>
                  )}
                </InputGroup>
              </Form.Group>
            </Col>
          </Row>
        </div>

        {loading ? (
          <div className="text-center py-4">
            <div className="spinner-border text-primary" role="status">
              <span className="visually-hidden">Loading...</span>
            </div>
            <p className="mt-2">Loading resources...</p>
          </div>
        ) : resources.length === 0 ? (
          <Alert variant="info">
            {searchQuery 
              ? `No ${resourceType}s found matching "${searchQuery}"`
              : `No ${resourceType}s are available at the moment.`
            }
          </Alert>
        ) : (
          <>
            <Row xs={1} md={2} lg={3} className="g-4">
              {resources.map((resource) => (
                <Col key={resource._id}>
                  <Card className="h-100">
                    <Card.Body>
                      <Card.Title>
                        {getResourceTypeIcon(resource.resource_type)}
                        {resource.name}
                      </Card.Title>
                      <Card.Subtitle className="mb-2 text-muted">
                        Floor: {resource.floor_id?.name}
                      </Card.Subtitle>

                      <div className="mb-2">
                        {isResourceAvailable(resource) ? (
                          <Badge bg="success">Available</Badge>
                        ) : (
                          <Badge bg="danger">In Use</Badge>
                        )}
                        {resource.capacity > 1 && (
                          <Badge bg="info" className="ms-2">
                            Capacity: {resource.capacity}
                          </Badge>
                        )}
                      </div>

                      {resource.amenities && resource.amenities.length > 0 && (
                        <div className="mb-3">
                          {resource.amenities.map((amenity, index) => (
                            <Badge
                              bg="light"
                              text="dark"
                              className="me-1 mb-1"
                              key={index}
                            >
                              {amenity}
                            </Badge>
                          ))}
                        </div>
                      )}

                      <div className="d-flex mt-3 flex-wrap gap-2">
                        <Button
                          variant="primary"
                          onClick={() => openBookingModal(resource)}
                          disabled={!isResourceAvailable(resource)}
                        >
                          <i className="bi bi-calendar-plus me-1"></i> Book
                        </Button>
                        <Button
                          variant="outline-primary"
                          onClick={() => handleFavorite(resource)}
                        >
                          <i className="bi bi-star me-1"></i> Favorite
                        </Button>
                        <Button
                          variant="outline-info"
                          onClick={() => openNavigationModal(resource)}
                        >
                          <i className="bi bi-geo-alt me-1"></i> Navigate
                        </Button>
                      </div>
                    </Card.Body>
                  </Card>
                </Col>
              ))}
            </Row>

            {renderPagination()}
          </>
        )}

        <Modal show={showBookingModal} onHide={closeBookingModal} size="lg">
          <Modal.Header closeButton>
            <Modal.Title>
              {selectedResource && (
                <>
                  Book {selectedResource.name}
                  <div className="text-muted fs-6">
                    {selectedResource.resource_type}
                  </div>
                </>
              )}
            </Modal.Title>
          </Modal.Header>
          <Modal.Body>
            {error && <Alert variant="danger">{error}</Alert>}

            <div className="mb-4">
              <Calendar
                localizer={localizer}
                events={calendarEvents}
                startAccessor="start"
                endAccessor="end"
                style={{ height: 500 }}
                selectable
                onSelectSlot={handleSelectSlot}
                eventPropGetter={eventStyleGetter}
                slotPropGetter={slotPropGetter}
                defaultView="week"
                views={['week', 'day']}
                min={new Date(0, 0, 0, 8, 0, 0)}
                max={new Date(0, 0, 0, 20, 0, 0)}
                step={30}
              />
            </div>

            <Form>
              <Row>
                <Col md={6}>
                  <Form.Group className="mb-3">
                    <Form.Label>Start Time</Form.Label>
                    <Form.Control
                      type="datetime-local"
                      value={startTime}
                      onChange={(e) => setStartTime(e.target.value)}
                    />
                  </Form.Group>
                </Col>
                <Col md={6}>
                  <Form.Group className="mb-3">
                    <Form.Label>End Time</Form.Label>
                    <Form.Control
                      type="datetime-local"
                      value={endTime}
                      onChange={(e) => setEndTime(e.target.value)}
                    />
                  </Form.Group>
                </Col>
              </Row>
            </Form>
          </Modal.Body>
          <Modal.Footer>
            <Button variant="secondary" onClick={closeBookingModal}>
              Cancel
            </Button>
            <Button variant="primary" onClick={handleBookResource}>
              Confirm Booking
            </Button>
          </Modal.Footer>
        </Modal>

        <Modal
          show={showNavigationModal}
          onHide={closeNavigationModal}
          size="lg"
        >
          <Modal.Header closeButton>
            <Modal.Title>
              {selectedResource && (
                <>
                  Navigate to {selectedResource.name}
                  <div className="text-muted fs-6">
                    {selectedResource.resource_type}
                  </div>
                </>
              )}
            </Modal.Title>
          </Modal.Header>
          <Modal.Body>
            {error && <Alert variant="danger">{error}</Alert>}

            {userLocation && (
              <Alert variant="info" className="mb-3">
                <i className="bi bi-geo-alt me-2"></i>
                Your current location: {userLocation.latitude.toFixed(6)},{" "}
                {userLocation.longitude.toFixed(6)}
                <Button
                  variant="outline-primary"
                  size="sm"
                  className="ms-3"
                  onClick={getUserLocation}
                >
                  Update Location
                </Button>
              </Alert>
            )}

            {selectedFloorPlan && selectedResource && (
              <div className="position-relative">
                <Image
                  src={selectedFloorPlan.layout_url}
                  alt={selectedFloorPlan.name}
                  className="img-fluid"
                  crossOrigin="anonymous"
                  onLoad={handleImageLoad}
                />
                <canvas
                  ref={canvasRef}
                  className="position-absolute top-0 start-0 w-100 h-100"
                  style={{ pointerEvents: "none" }}
                />
              </div>
            )}

            <div className="mt-3">
              <h5>Location Details</h5>
              <p>
                <strong>Floor:</strong> {selectedFloorPlan?.name || "Unknown"}
              </p>
              {selectedFloorPlan?.base_location && (
                <p>
                  <strong>Base Location:</strong>{" "}
                  {selectedFloorPlan.base_location.latitude.toFixed(6)},{" "}
                  {selectedFloorPlan.base_location.longitude.toFixed(6)}
                </p>
              )}
              {selectedResource?.amenities &&
                selectedResource.amenities.length > 0 && (
                  <div>
                    <strong>Amenities:</strong>
                    <ul>
                      {selectedResource.amenities.map((amenity, index) => (
                        <li key={index}>{amenity}</li>
                      ))}
                    </ul>
                  </div>
                )}
            </div>
          </Modal.Body>
          <Modal.Footer>
            <Button variant="secondary" onClick={closeNavigationModal}>
              Close
            </Button>
          </Modal.Footer>
        </Modal>
      </Card.Body>

      <style>{`
        .reserved-slot {
          background-color: #ffebee !important;
        }
        .available-slot {
          background-color: #e8f5e9 !important;
        }
        .rbc-event {
          background-color: #dc3545 !important;
        }
        .rbc-today {
          background-color: #e3f2fd !important;
        }
      `}</style>
    </Card>
  );
};

export default ResourceBooking;