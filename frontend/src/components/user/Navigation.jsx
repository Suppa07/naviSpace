import { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { Card, Form, Button, Alert, Modal } from 'react-bootstrap';
import { GoogleMap, LoadScript, Marker } from '@react-google-maps/api';
import * as PathFinding from 'pathfinding';
import * as turf from '@turf/turf';

const Navigation = () => {
  const [floors, setFloors] = useState([]);
  const [selectedFloor, setSelectedFloor] = useState(null);
  const [startPoint, setStartPoint] = useState(null);
  const [endPoint, setEndPoint] = useState(null);
  const [path, setPath] = useState(null);
  const [instructions, setInstructions] = useState([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [userLocation, setUserLocation] = useState(null);
  const [userRelativePosition, setUserRelativePosition] = useState(null);
  const canvasRef = useRef(null);
  const mapRef = useRef(null);

  const API_URL = import.meta.env.VITE_API_URL;
  const GOOGLE_MAPS_API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;

  const mapContainerStyle = {
    width: '100%',
    height: '400px',
    marginBottom: '20px'
  };

  const defaultCenter = {
    lat: 0,
    lng: 0
  };

  useEffect(() => {
    fetchFloors();
  }, []);

  useEffect(() => {
    if (searchQuery.trim()) {
      searchDestinations();
    } else {
      setSearchResults([]);
    }
  }, [searchQuery]);

  useEffect(() => {
    if (userLocation && selectedFloor?.base_location) {
      calculateUserRelativePosition();
    }
  }, [userLocation, selectedFloor]);

  const calculateUserRelativePosition = () => {
    if (!userLocation || !selectedFloor?.base_location) return;

    const baseLocation = selectedFloor.base_location;
    
    // Calculate relative position using real-world dimensions
    const metersPerLatDegree = 111111;
    const metersPerLngDegree = 111111 * Math.cos(baseLocation.latitude * (Math.PI / 180));

    const latDiff = userLocation.lat - baseLocation.latitude;
    const lngDiff = userLocation.lng - baseLocation.longitude;

    const yMeters = latDiff * metersPerLatDegree;
    const xMeters = lngDiff * metersPerLngDegree;

    // Convert to percentage based on floor's real dimensions
    const relativeX = (xMeters / selectedFloor.realx) * 100 + 50;
    const relativeY = (yMeters / selectedFloor.realy) * 100 + 50;

    const clampedX = Math.max(0, Math.min(100, relativeX));
    const clampedY = Math.max(0, Math.min(100, relativeY));

    setUserRelativePosition([clampedX, clampedY]);
    setStartPoint([clampedX, clampedY]);
  };

  const onMapLoad = (map) => {
    mapRef.current = map;
  };

  const onMapClick = (event) => {
    const newLocation = {
      lat: event.latLng.lat(),
      lng: event.latLng.lng()
    };
    setUserLocation(newLocation);
  };

  const fetchFloors = async () => {
    try {
      const response = await axios.get(`${API_URL}users/floorplans`, {
        withCredentials: true
      });
      setFloors(response.data);
      if (response.data.length > 0) {
        setSelectedFloor(response.data[0]);
        
        // Center map on first floor's base location
        if (mapRef.current && response.data[0].base_location) {
          const { latitude, longitude } = response.data[0].base_location;
          mapRef.current.panTo({ lat: latitude, lng: longitude });
        }
      }
    } catch (error) {
      console.error('Error fetching floors:', error);
      setError('Failed to load floor plans');
    }
  };

  const searchDestinations = async () => {
    try {
      const response = await axios.get(`${API_URL}users/navigation/search`, {
        params: { query: searchQuery },
        withCredentials: true
      });
      setSearchResults(response.data);
    } catch (error) {
      console.error('Error searching destinations:', error);
    }
  };

  const handleFloorSelect = (floor) => {
    setSelectedFloor(floor);
    setEndPoint(null);
    setPath(null);
    setInstructions([]);
    
    // Center map on selected floor's base location
    if (mapRef.current && floor.base_location) {
      const { latitude, longitude } = floor.base_location;
      mapRef.current.panTo({ lat: latitude, lng: longitude });
    }
    
    if (userLocation) {
      calculateUserRelativePosition();
    }
  };

  const handleDestinationSelect = (resource) => {
    if (!selectedFloor || resource.floor_id._id !== selectedFloor._id) {
      const resourceFloor = floors.find(f => f._id === resource.floor_id._id);
      if (resourceFloor) {
        setSelectedFloor(resourceFloor);
      }
    }
    setEndPoint(resource.location);
    findPath(resource.location);
  };

  const findPath = async (end) => {
    if (!startPoint || !selectedFloor) return;

    setLoading(true);
    try {
      const response = await axios.post(
        `${API_URL}users/navigation/find-path`,
        {
          start_point: startPoint,
          end_point: end,
          start_floor: selectedFloor.floor_number,
          end_floor: selectedFloor.floor_number
        },
        { withCredentials: true }
      );

      setPath(response.data.path);
      setInstructions(response.data.instructions);
      drawPath(response.data.path);
    } catch (error) {
      console.error('Error finding path:', error);
      setError('Failed to calculate path');
    } finally {
      setLoading(false);
    }
  };

  const drawPath = (pathPoints) => {
    if (!canvasRef.current || !pathPoints?.length) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const { width, height } = canvas;

    ctx.clearRect(0, 0, width, height);

    ctx.beginPath();
    ctx.strokeStyle = '#007bff';
    ctx.lineWidth = 3;

    pathPoints.forEach((point, index) => {
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

    if (userRelativePosition) {
      drawPoint(ctx, userRelativePosition, '#28a745', 'You are here');
    }
    
    if (endPoint) {
      drawPoint(ctx, endPoint, '#dc3545', 'Destination');
    }
  };

  const drawPoint = (ctx, point, color, label) => {
    const [x, y] = point;
    const canvasX = (x / 100) * ctx.canvas.width;
    const canvasY = (y / 100) * ctx.canvas.height;

    ctx.beginPath();
    ctx.fillStyle = color;
    ctx.arc(canvasX, canvasY, 8, 0, Math.PI * 2);
    ctx.fill();

    ctx.beginPath();
    ctx.fillStyle = 'white';
    ctx.arc(canvasX, canvasY, 4, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#000';
    ctx.font = '14px Arial';
    ctx.textAlign = 'center';
    ctx.fillText(label, canvasX, canvasY - 15);
  };

  return (
    <Card className="shadow-sm">
      <Card.Body>
        <h3 className="mb-4">Indoor Navigation</h3>

        <LoadScript googleMapsApiKey={GOOGLE_MAPS_API_KEY}>
          <GoogleMap
            mapContainerStyle={mapContainerStyle}
            center={defaultCenter}
            zoom={15}
            onLoad={onMapLoad}
            onClick={onMapClick}
          >
            {userLocation && (
              <Marker
                position={userLocation}
                title="Your Location"
              />
            )}
            {selectedFloor?.base_location && (
              <Marker
                position={{
                  lat: selectedFloor.base_location.latitude,
                  lng: selectedFloor.base_location.longitude
                }}
                title={`${selectedFloor.name} Base Location`}
                icon={{
                  url: 'http://maps.google.com/mapfiles/ms/icons/blue-dot.png'
                }}
              />
            )}
          </GoogleMap>
        </LoadScript>

        <Form className="mb-4">
          <Form.Group className="mb-3">
            <Form.Label>Search Destination</Form.Label>
            <Form.Control
              type="text"
              placeholder="Search for rooms, facilities, or resources..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </Form.Group>

          {searchResults.length > 0 && (
            <div className="mb-3">
              <h6>Search Results:</h6>
              <div className="list-group">
                {searchResults.map(result => (
                  <Button
                    key={result._id}
                    variant="outline-primary"
                    className="list-group-item list-group-item-action"
                    onClick={() => handleDestinationSelect(result)}
                  >
                    {result.name} - {result.resource_type}
                  </Button>
                ))}
              </div>
            </div>
          )}

          <Form.Group className="mb-3">
            <Form.Label>Select Floor</Form.Label>
            <Form.Select
              value={selectedFloor?._id || ''}
              onChange={(e) => {
                const floor = floors.find(f => f._id === e.target.value);
                handleFloorSelect(floor);
              }}
            >
              {floors.map(floor => (
                <option key={floor._id} value={floor._id}>
                  {floor.name}
                </option>
              ))}
            </Form.Select>
          </Form.Group>
        </Form>

        {error && <Alert variant="danger">{error}</Alert>}

        {selectedFloor && (
          <div className="position-relative mb-4">
            <img
              src={selectedFloor.layout_url}
              alt={selectedFloor.name}
              className="img-fluid"
              style={{ width: '100%' }}
            />
            <canvas
              ref={canvasRef}
              className="position-absolute top-0 start-0 w-100 h-100"
              style={{ pointerEvents: 'none' }}
            />
          </div>
        )}

        {instructions.length > 0 && (
          <Card className="mt-4">
            <Card.Body>
              <h5>Navigation Instructions</h5>
              <ol className="mb-0">
                {instructions.map((instruction, index) => (
                  <li key={index} className="mb-2">
                    {instruction.action === 'move' ? (
                      <>
                        Go {instruction.direction} for {Math.round(instruction.distance)} steps
                        {instruction.landmark && (
                          <span className="text-muted">
                            {' '}(past {instruction.landmark.name})
                          </span>
                        )}
                      </>
                    ) : (
                      <>
                        Take the {instruction.type} from floor {instruction.from_floor} to floor {instruction.to_floor}
                      </>
                    )}
                  </li>
                ))}
              </ol>
            </Card.Body>
          </Card>
        )}
      </Card.Body>
    </Card>
  );
};

export default Navigation;