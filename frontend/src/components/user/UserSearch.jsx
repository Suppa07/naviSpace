import { useState, useEffect, useRef } from 'react';
import { Card, Form, Button, Alert, ListGroup, Badge, Modal, Image } from 'react-bootstrap';
import axios from 'axios';
import * as PF from 'pathfinding';

const UserSearch = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [searchResults, setSearchResults] = useState(null);
  const [showNoReservation, setShowNoReservation] = useState(false);
  const [showNavigationModal, setShowNavigationModal] = useState(false);
  const [selectedResource, setSelectedResource] = useState(null);
  const [resourceLocation, setResourceLocation] = useState(null);
  const [selectedFloorPlan, setSelectedFloorPlan] = useState(null);
  const [userLocation, setUserLocation] = useState(null);
  const [userRelativePosition, setUserRelativePosition] = useState(null);
  const [navigationPath, setNavigationPath] = useState(null);
  const canvasRef = useRef(null);
  const [imageLoaded, setImageLoaded] = useState(false);
  const [imageSize, setImageSize] = useState({ width: 0, height: 0 });

  const API_URL = import.meta.env.VITE_API_URL;

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

    setUserRelativePosition([clampedX, clampedY]);
  };

  const handleSearch = async (e) => {
    e.preventDefault();
    if (!searchQuery.trim()) {
      setError('Please enter a search term');
      return;
    }

    setLoading(true);
    setError('');
    setSearchResults(null);
    setShowNoReservation(false);

    try {
      const response = await axios.get(`${API_URL}users/search-reservations`, {
        params: { query: searchQuery },
        withCredentials: true
      });

      if (response.data.reservation) {
        setSearchResults(response.data);
        setShowNoReservation(false);
      } else {
        setShowNoReservation(true);
      }
    } catch (err) {
      console.error('Error searching:', err);
      setError(err.response?.data?.error || 'Failed to search for user');
    } finally {
      setLoading(false);
    }
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
          setError("Failed to get your location. Please enable location services.");
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

  const openNavigationModal = async (resource) => {
    setSelectedResource(resource);
    setError("");
    await getUserLocation();
    try {
      const response = await axios.get(`${API_URL}users/resource-location/${resource._id}`, {
        withCredentials: true
      });
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
    setNavigationPath(null);
  };

  const getResourceTypeIcon = (type) => {
    switch(type?.toLowerCase()) {
      case 'desk':
        return <i className="bi bi-laptop me-2"></i>;
      case 'meeting room':
        return <i className="bi bi-people me-2"></i>;
      case 'parking spot':
        return <i className="bi bi-car-front me-2"></i>;
      default:
        return <i className="bi bi-building me-2"></i>;
    }
  };

  return (
    <Card className="shadow-sm">
      <Card.Body>
        <h3 className="mb-4">Search Users</h3>

        <Form onSubmit={handleSearch} className="mb-4">
          <Form.Group className="mb-3">
            <Form.Label>Search by username or email</Form.Label>
            <div className="d-flex gap-2">
              <Form.Control
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Enter username or email"
              />
              <Button 
                type="submit" 
                variant="primary"
                disabled={loading}
              >
                {loading ? (
                  <>
                    <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                    Searching...
                  </>
                ) : (
                  <>
                    <i className="bi bi-search me-2"></i>
                    Search
                  </>
                )}
              </Button>
            </div>
          </Form.Group>
        </Form>

        {error && (
          <Alert variant="danger" className="mb-4">
            {error}
          </Alert>
        )}

        {showNoReservation && (
          <Alert variant="info">
            No active reservations found for this user.
          </Alert>
        )}

        {searchResults && (
          <div>
            <h4 className="mb-3">Current Reservation</h4>
            <ListGroup>
              <ListGroup.Item>
                <div className="d-flex justify-content-between align-items-start">
                  <div>
                    <h5 className="mb-1">
                      {getResourceTypeIcon(searchResults.reservation.resource_type)}
                      {searchResults.resource.name}
                    </h5>
                    <p className="mb-1">
                      <strong>User:</strong> {searchResults.user.username} ({searchResults.user.email_id})
                    </p>
                    <p className="mb-1">
                      <strong>Floor:</strong> {searchResults.floor.name}
                    </p>
                    <div>
                      <Badge bg="info" className="me-2">
                        {searchResults.reservation.resource_type}
                      </Badge>
                      {searchResults.resource.capacity > 1 && (
                        <Badge bg="secondary">
                          Capacity: {searchResults.resource.capacity}
                        </Badge>
                      )}
                    </div>
                  </div>
                  <Button 
                    variant="primary"
                    onClick={() => openNavigationModal(searchResults.resource)}
                  >
                    <i className="bi bi-geo-alt me-2"></i>
                    Navigate
                  </Button>
                </div>
              </ListGroup.Item>
            </ListGroup>
          </div>
        )}

        {/* Navigation Modal */}
        <Modal show={showNavigationModal} onHide={closeNavigationModal} size="lg">
          <Modal.Header closeButton>
            <Modal.Title>
              {selectedResource && (
                <>
                  Navigate to {selectedResource.name}
                  <div className="text-muted fs-6">
                    {searchResults?.reservation.resource_type}
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
                Your current location: {userLocation.latitude.toFixed(6)}, {userLocation.longitude.toFixed(6)}
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
                  style={{ pointerEvents: 'none' }}
                />
              </div>
            )}

            <div className="mt-3">
              <h5>Location Details</h5>
              <p>
                <strong>Floor:</strong> {selectedFloorPlan?.name || 'Unknown'}
              </p>
              {selectedFloorPlan?.base_location && (
                <p>
                  <strong>Base Location:</strong>{' '}
                  {selectedFloorPlan.base_location.latitude.toFixed(6)},{' '}
                  {selectedFloorPlan.base_location.longitude.toFixed(6)}
                </p>
              )}
              {selectedResource?.amenities && selectedResource.amenities.length > 0 && (
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
    </Card>
  );
};

export default UserSearch;