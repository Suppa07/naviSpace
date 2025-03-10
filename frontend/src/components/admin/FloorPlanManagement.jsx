import { useState, useEffect } from "react";
import axios from "axios";
import {
  Card,
  Button,
  Form,
  Alert,
  Modal,
  Image,
  ListGroup,
} from "react-bootstrap";

const FloorPlanManagement = () => {
  const [floorPlans, setFloorPlans] = useState([]);
  const [selectedFile, setSelectedFile] = useState(null);
  const [floorName, setFloorName] = useState("");
  const [floorNumber, setFloorNumber] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedFloorPlan, setSelectedFloorPlan] = useState(null);
  const [showBaseLocationModal, setShowBaseLocationModal] = useState(false);
  const [baseLocation, setBaseLocation] = useState({
    latitude: "",
    longitude: "",
  });
  const [locationType, setLocationType] = useState("manual");
  const [mapClickEnabled, setMapClickEnabled] = useState(false);
  const [selectedPoint, setSelectedPoint] = useState(null);
  const [userLocation, setUserLocation] = useState(null);
  const [showAddResourceModal, setShowAddResourceModal] = useState(false);
  const [realx, setrealx] = useState("");
  const [realy, setrealy] = useState("");
  const [newResource, setNewResource] = useState({
    name: "",
    resource_type: "desk",
    location: [0, 0],
    capacity: 1,
    amenities: [],
  });
  const [tempAmenity, setTempAmenity] = useState("");
  const [selectingLocation, setSelectingLocation] = useState(false);

  const API_URL = import.meta.env.VITE_API_URL;
  // const AWS_URL = import.meta.env.AWS_URL;
  // console.log(AWS_URL);
  useEffect(() => {
    fetchFloorPlans();
  }, []);

  const fetchFloorPlans = async () => {
    setLoading(true);
    try {
      const response = await axios.get(`${API_URL}admin/floorplans`, {
        withCredentials: true,
      });
      setFloorPlans(response.data);
      setError("");
    } catch (err) {
      console.error("Error fetching floor plans:", err);
      setError("Failed to load floor plans. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (file && file.type.startsWith("image/")) {
      setSelectedFile(file);
      setError("");
    } else {
      setError("Please select a valid image file.");
      setSelectedFile(null);
    }
  };

  const handleUpload = async (e) => {
    e.preventDefault();

    if (!selectedFile) {
      setError("Please select a file to upload.");
      return;
    }

    if (!floorName.trim()) {
      setError("Please enter a floor name.");
      return;
    }

    if (!floorNumber.trim()) {
      setError("Please enter a floor number.");
      return;
    }

    const formData = new FormData();
    formData.append("floorPlan", selectedFile);
    formData.append("name", floorName);
    formData.append("floor_number", floorNumber);
    formData.append("realx", realx);
    formData.append("realy", realy);
    try {
      await axios.post(`${API_URL}admin/floor-plan`, formData, {
        headers: { "Content-Type": "multipart/form-data" },
        withCredentials: true,
      });

      setSuccessMessage("Floor plan uploaded successfully!");
      setTimeout(() => setSuccessMessage(""), 3000);

      // Reset form
      setSelectedFile(null);
      setFloorName("");
      setFloorNumber("");
      setrealx("");
      setrealy("");
      // Refresh floor plans
      fetchFloorPlans();
    } catch (err) {
      console.error("Error uploading floor plan:", err);
      setError("Failed to upload floor plan. Please try again.");
    }
  };

  const openDeleteModal = (floorPlan) => {
    setSelectedFloorPlan(floorPlan);
    setShowDeleteModal(true);
  };

  const closeDeleteModal = () => {
    setShowDeleteModal(false);
    setSelectedFloorPlan(null);
  };

  const handleDeleteFloorPlan = async () => {
    if (!selectedFloorPlan) return;

    try {
      await axios.delete(`${API_URL}admin/floorplan/${selectedFloorPlan._id}`, {
        withCredentials: true,
      });

      setSuccessMessage("Floor plan deleted successfully!");
      setTimeout(() => setSuccessMessage(""), 3000);

      setFloorPlans(
        floorPlans.filter((fp) => fp._id !== selectedFloorPlan._id)
      );
      closeDeleteModal();
    } catch (error) {
      console.error("Error deleting floor plan:", error);
      setError("Failed to delete floor plan. Please try again.");
    }
  };

  const openBaseLocationModal = (floorPlan) => {
    setSelectedFloorPlan(floorPlan);
    setBaseLocation({
      latitude: floorPlan.base_location?.latitude || "",
      longitude: floorPlan.base_location?.longitude || "",
    });
    setLocationType("manual");
    setMapClickEnabled(false);
    setSelectedPoint(null);
    setShowBaseLocationModal(true);
  };

  const closeBaseLocationModal = () => {
    setShowBaseLocationModal(false);
    setSelectedFloorPlan(null);
    setBaseLocation({ latitude: "", longitude: "" });
    setLocationType("manual");
    setMapClickEnabled(false);
    setSelectedPoint(null);
  };

  const getCurrentLocation = () => {
    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setUserLocation({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
          });
          setBaseLocation({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
          });
        },
        (error) => {
          console.error("Error getting location:", error);
          setError("Failed to get current location. Please try manually.");
        },
        {
          enableHighAccuracy: true, // Forces GPS instead of WiFi/Cell tower
          timeout: 10000, // Wait up to 10 seconds for better accuracy
          maximumAge: 0, // Always fetch fresh data
        }
      );
    } else {
      setError("Geolocation is not supported by your browser.");
    }
  };

  const handleMapClick = (event) => {
    if (!mapClickEnabled && !selectingLocation) return;

    const image = event.target;
    const rect = image.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;

    // Convert to percentages
    const percentX = (x / rect.width) * 100;
    const percentY = (y / rect.height) * 100;

    if (selectingLocation) {
      setNewResource({
        ...newResource,
        location: [percentX, percentY],
      });
      setSelectingLocation(false);
    } else {
      setSelectedPoint({ x: percentX, y: percentY });

      if (userLocation) {
        const latDiff = (percentY - 50) / 100000;
        const lngDiff = (percentX - 50) / 100000;

        setBaseLocation({
          latitude: userLocation.latitude - latDiff,
          longitude: userLocation.longitude - lngDiff,
        });
      }
    }
  };

  const handleSetBaseLocation = async () => {
    if (!selectedFloorPlan) return;

    try {
      await axios.post(
        `${API_URL}admin/floor/base-location`,
        {
          floor_id: selectedFloorPlan._id,
          ...baseLocation,
          floor_number: selectedFloorPlan.floor_number,
        },
        { withCredentials: true }
      );

      setSuccessMessage("Base location set successfully!");
      setTimeout(() => setSuccessMessage(""), 3000);

      setFloorPlans(
        floorPlans.map((fp) =>
          fp._id === selectedFloorPlan._id
            ? { ...fp, base_location: baseLocation }
            : fp
        )
      );

      closeBaseLocationModal();
    } catch (error) {
      console.error("Error setting base location:", error);
      setError("Failed to set base location. Please try again.");
    }
  };

  const openAddResourceModal = (floorPlan) => {
    setSelectedFloorPlan(floorPlan);
    setNewResource({
      name: "",
      resource_type: "desk",
      location: [0, 0],
      capacity: 1,
      amenities: [],
    });
    setShowAddResourceModal(true);
  };

  const closeAddResourceModal = () => {
    setShowAddResourceModal(false);
    setSelectedFloorPlan(null);
    setNewResource({
      name: "",
      resource_type: "desk",
      location: [0, 0],
      capacity: 1,
      amenities: [],
    });
    setTempAmenity("");
    setSelectingLocation(false);
  };

  const handleAddAmenity = () => {
    if (tempAmenity.trim()) {
      setNewResource({
        ...newResource,
        amenities: [...newResource.amenities, tempAmenity.trim()],
      });
      setTempAmenity("");
    }
  };

  const removeAmenity = (index) => {
    setNewResource({
      ...newResource,
      amenities: newResource.amenities.filter((_, i) => i !== index),
    });
  };

  const handleAddResource = async () => {
    if (!selectedFloorPlan) return;

    try {
      await axios.post(
        `${API_URL}admin/resources`,
        {
          ...newResource,
          floor_id: selectedFloorPlan._id,
        },
        { withCredentials: true }
      );

      setSuccessMessage("Resource added successfully!");
      setTimeout(() => setSuccessMessage(""), 3000);
      closeAddResourceModal();
    } catch (error) {
      console.error("Error adding resource:", error);
      setError("Failed to add resource. Please try again.");
    }
  };

  return (
    <Card className="shadow-sm">
      <Card.Body>
        <div className="d-flex justify-content-between align-items-center mb-4">
          <h3 className="mb-0">Floor Plans</h3>
          <Button variant="outline-primary" onClick={() => fetchFloorPlans()}>
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

        <Card className="mb-4">
          <Card.Body>
            <h5 className="mb-3">Upload New Floor Plan</h5>
            <Form onSubmit={handleUpload}>
              <Form.Group className="mb-3">
                <Form.Label>Floor Name</Form.Label>
                <Form.Control
                  type="text"
                  value={floorName}
                  onChange={(e) => setFloorName(e.target.value)}
                  placeholder="e.g., Ground Floor, First Floor"
                  required
                />
              </Form.Group>

              <Form.Group className="mb-3">
                <Form.Label>Floor Number</Form.Label>
                <Form.Control
                  type="number"
                  value={floorNumber}
                  onChange={(e) => setFloorNumber(e.target.value)}
                  placeholder="e.g., 0 for ground floor, 1 for first floor"
                  required
                />
              </Form.Group>

              <Form.Group className="mb-3">
                <Form.Label>Real X Dimension (meters)</Form.Label>
                <Form.Control
                  type="number"
                  value={realx}
                  onChange={(e) => setrealx(e.target.value)}
                  placeholder="Enter real-world width of the floor"
                  required
                />
              </Form.Group>

              <Form.Group className="mb-3">
                <Form.Label>Real Y Dimension (meters)</Form.Label>
                <Form.Control
                  type="number"
                  value={realy}
                  onChange={(e) => setrealy(e.target.value)}
                  placeholder="Enter real-world height of the floor"
                  required
                />
              </Form.Group>

              <Form.Group className="mb-3">
                <Form.Label>Floor Plan Image</Form.Label>
                <Form.Control
                  type="file"
                  onChange={handleFileSelect}
                  accept="image/*"
                  required
                />
                <Form.Text className="text-muted">
                  Upload a clear image of the floor plan
                </Form.Text>
              </Form.Group>

              <Button
                type="submit"
                disabled={!selectedFile || !floorName || !realx || !realy}
              >
                Upload Floor Plan
              </Button>
            </Form>
          </Card.Body>
        </Card>

        {loading ? (
          <div className="text-center py-4">
            <div className="spinner-border text-primary" role="status">
              <span className="visually-hidden">Loading...</span>
            </div>
            <p className="mt-2">Loading floor plans...</p>
          </div>
        ) : floorPlans.length === 0 ? (
          <Alert variant="info">No floor plans have been uploaded yet.</Alert>
        ) : (
          <ListGroup>
            {floorPlans.map((floorPlan) => (
              <ListGroup.Item key={floorPlan._id} className="py-3">
                <div className="d-flex justify-content-between align-items-start">
                  <div>
                    <h5>{floorPlan.name}</h5>
                    <p className="text-muted mb-2">
                      Floor Number: {floorPlan.floor_number}
                    </p>
                    {floorPlan.base_location && (
                      <small className="text-muted d-block">
                        Base Location: {floorPlan.base_location.latitude},{" "}
                        {floorPlan.base_location.longitude}
                      </small>
                    )}
                  </div>
                  <div className="d-flex gap-2">
                    <Button
                      variant="success"
                      size="sm"
                      onClick={() => openAddResourceModal(floorPlan)}
                    >
                      <i className="bi bi-plus-circle me-1"></i> Add Resource
                    </Button>
                    <Button
                      variant="outline-primary"
                      size="sm"
                      onClick={() => openBaseLocationModal(floorPlan)}
                    >
                      <i className="bi bi-geo-alt me-1"></i> Set Location
                    </Button>
                    <Button
                      variant="outline-secondary"
                      size="sm"
                      onClick={() =>
                        window.open(
                          `${floorPlan.layout_url}`,
                          "_blank"
                        )
                      }
                    >
                      <i className="bi bi-eye me-1"></i> View
                    </Button>
                    <Button
                      variant="outline-danger"
                      size="sm"
                      onClick={() => openDeleteModal(floorPlan)}
                    >
                      <i className="bi bi-trash me-1"></i> Delete
                    </Button>
                  </div>
                </div>

                {floorPlan.layout_url && (
                  <div className="mt-3">
                    <Image
                      src={`${floorPlan.layout_url}`}
                      alt={floorPlan.name}
                      style={{ maxHeight: "200px" }}
                      className="img-thumbnail"
                    />
                  </div>
                )}
              </ListGroup.Item>
            ))}
          </ListGroup>
        )}
      </Card.Body>

      {/* Delete Confirmation Modal */}
      <Modal show={showDeleteModal} onHide={closeDeleteModal}>
        <Modal.Header closeButton>
          <Modal.Title>Delete Floor Plan</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {selectedFloorPlan && (
            <p>
              Are you sure you want to delete the floor plan for{" "}
              <strong>{selectedFloorPlan.name}</strong>? This action cannot be
              undone.
            </p>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={closeDeleteModal}>
            Cancel
          </Button>
          <Button variant="danger" onClick={handleDeleteFloorPlan}>
            Delete Floor Plan
          </Button>
        </Modal.Footer>
      </Modal>

      {/* Base Location Modal */}
      <Modal
        show={showBaseLocationModal}
        onHide={closeBaseLocationModal}
        size="lg"
      >
        <Modal.Header closeButton>
          <Modal.Title>Set Base Location</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {selectedFloorPlan && (
            <>
              <Form>
                <Form.Group className="mb-3">
                  <Form.Label>Location Setting Method</Form.Label>
                  <Form.Select
                    value={locationType}
                    onChange={(e) => {
                      setLocationType(e.target.value);
                      setMapClickEnabled(e.target.value === "current");
                      if (e.target.value === "current") {
                        getCurrentLocation();
                      }
                    }}
                  >
                    <option value="manual">Enter Coordinates Manually</option>
                    <option value="current">Use Current Location</option>
                  </Form.Select>
                </Form.Group>

                {locationType === "manual" ? (
                  <>
                    <Form.Group className="mb-3">
                      <Form.Label>Latitude</Form.Label>
                      <Form.Control
                        type="number"
                        step="any"
                        value={baseLocation.latitude}
                        onChange={(e) =>
                          setBaseLocation({
                            ...baseLocation,
                            latitude: e.target.value,
                          })
                        }
                        placeholder="Enter latitude"
                      />
                    </Form.Group>

                    <Form.Group className="mb-3">
                      <Form.Label>Longitude</Form.Label>
                      <Form.Control
                        type="number"
                        step="any"
                        value={baseLocation.longitude}
                        onChange={(e) =>
                          setBaseLocation({
                            ...baseLocation,
                            longitude: e.target.value,
                          })
                        }
                        placeholder="Enter longitude"
                      />
                    </Form.Group>
                  </>
                ) : (
                  <div className="mb-3">
                    <p className="mb-2">
                      Click on your current position in the floor plan:
                    </p>
                    <div className="position-relative">
                      <Image
                        src={`${selectedFloorPlan.layout_url}`}
                        alt={selectedFloorPlan.name}
                        fluid
                        style={{
                          cursor: mapClickEnabled ? "crosshair" : "default",
                        }}
                        onClick={handleMapClick}
                      />
                      {selectedPoint && (
                        <div
                          className="position-absolute"
                          style={{
                            left: `${selectedPoint.x}%`,
                            top: `${selectedPoint.y}%`,
                            transform: "translate(-50%, -50%)",
                            width: "20px",
                            height: "20px",
                            backgroundColor: "red",
                            borderRadius: "50%",
                            border: "2px solid white",
                            boxShadow: "0 0 5px rgba(0,0,0,0.5)",
                          }}
                        />
                      )}
                    </div>
                    {userLocation && (
                      <div className="mt-2">
                        <small className="text-muted">
                          Current Location: {userLocation.latitude},{" "}
                          {userLocation.longitude}
                        </small>
                      </div>
                    )}
                  </div>
                )}
              </Form>
            </>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={closeBaseLocationModal}>
            Cancel
          </Button>
          <Button
            variant="primary"
            onClick={handleSetBaseLocation}
            disabled={!baseLocation.latitude || !baseLocation.longitude}
          >
            Set Location
          </Button>
        </Modal.Footer>
      </Modal>

      {/* Add Resource Modal */}
      <Modal
        show={showAddResourceModal}
        onHide={closeAddResourceModal}
        size="lg"
      >
        <Modal.Header closeButton>
          <Modal.Title>Add Resource to {selectedFloorPlan?.name}</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form>
            <Form.Group className="mb-3">
              <Form.Label>Resource Name</Form.Label>
              <Form.Control
                type="text"
                value={newResource.name}
                onChange={(e) =>
                  setNewResource({ ...newResource, name: e.target.value })
                }
                placeholder="Enter resource name"
                required
              />
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Label>Resource Type</Form.Label>
              <Form.Select
                value={newResource.resource_type}
                onChange={(e) =>
                  setNewResource({
                    ...newResource,
                    resource_type: e.target.value,
                  })
                }
                required
              >
                <option value="desk">Desk</option>
                <option value="meeting room">Meeting Room</option>
                <option value="parking spot">Parking Spot</option>
              </Form.Select>
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Label>Location</Form.Label>
              <div className="position-relative mb-2">
                <Image
                  src={`${selectedFloorPlan?.layout_url}`}
                  alt={selectedFloorPlan?.name}
                  fluid
                  style={{
                    cursor: selectingLocation ? "crosshair" : "default",
                  }}
                  onClick={handleMapClick}
                />
                {newResource.location[0] !== 0 &&
                  newResource.location[1] !== 0 && (
                    <div
                      className="position-absolute"
                      style={{
                        left: `${newResource.location[0]}%`,
                        top: `${newResource.location[1]}%`,
                        transform: "translate(-50%, -50%)",
                        width: "20px",
                        height: "20px",
                        backgroundColor: "red",
                        borderRadius: "50%",
                        border: "2px solid white",
                        boxShadow: "0 0 5px rgba(0,0,0,0.5)",
                      }}
                    />
                  )}
              </div>
              <Button
                variant="outline-primary"
                onClick={() => setSelectingLocation(true)}
                className="w-100"
              >
                {newResource.location[0] === 0 && newResource.location[1] === 0
                  ? "Click to Set Location"
                  : "Change Location"}
              </Button>
              {selectingLocation && (
                <Alert variant="info" className="mt-2">
                  Click on the floor plan to set the resource location
                </Alert>
              )}
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Label>Capacity</Form.Label>
              <Form.Control
                type="number"
                value={newResource.capacity}
                onChange={(e) =>
                  setNewResource({
                    ...newResource,
                    capacity: parseInt(e.target.value),
                  })
                }
                min="1"
                required
              />
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Label>Amenities</Form.Label>
              <div className="d-flex gap-2 mb-2">
                <Form.Control
                  type="text"
                  value={tempAmenity}
                  onChange={(e) => setTempAmenity(e.target.value)}
                  placeholder="Add amenity"
                />
                <Button variant="outline-primary" onClick={handleAddAmenity}>
                  Add
                </Button>
              </div>
              {newResource.amenities.length > 0 && (
                <div className="d-flex flex-wrap gap-2 mt-2">
                  {newResource.amenities.map((amenity, index) => (
                    <Badge
                      key={index}
                      bg="light"
                      text="dark"
                      className="d-flex align-items-center"
                    >
                      {amenity}
                      <Button
                        variant="link"
                        className="p-0 ms-2"
                        onClick={() => removeAmenity(index)}
                      >
                        <i className="bi bi-x text-danger"></i>
                      </Button>
                    </Badge>
                  ))}
                </div>
              )}
            </Form.Group>
          </Form>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={closeAddResourceModal}>
            Cancel
          </Button>
          <Button
            variant="primary"
            onClick={handleAddResource}
            disabled={
              !newResource.name ||
              !newResource.resource_type ||
              (newResource.location[0] === 0 && newResource.location[1] === 0)
            }
          >
            Add Resource
          </Button>
        </Modal.Footer>
      </Modal>
    </Card>
  );
};

export default FloorPlanManagement;
