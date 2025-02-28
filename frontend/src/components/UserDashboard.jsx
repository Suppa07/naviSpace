import React, { useState, useEffect } from "react";
import axios from "axios";
import Modal from "react-modal";

const API_URL = `${import.meta.env.VITE_API_URL}`;

const UserDashboard = () => {
  const [resources, setResources] = useState([]);
  const [reservations, setReservations] = useState([]);
  const [favorites, setFavorites] = useState([]);
  const [resourceType, setResourceType] = useState("desk");
  const [resourceId, setResourceId] = useState("");
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [modalIsOpen, setModalIsOpen] = useState(false);

  useEffect(() => {
    fetchAvailability();
    fetchFavorites();
  }, [resourceType]);

  const fetchAvailability = async () => {
    try {
      console.log(resourceType);
      const response = await axios.get(
        `${API_URL}users/availability?resourceType=${resourceType}`,
        {
          withCredentials: true,
        }
      );
      setResources(response.data.resources);
      setReservations(response.data.reservations);
      // console.log(reservations)
    } catch (error) {
      console.error("Error fetching availability:", error);
    }
  };

  const fetchFavorites = async () => {
    try {
      const response = await axios.get(`${API_URL}users/favorites`, {
        withCredentials: true,
      });
      setFavorites(response.data);
    } catch (error) {
      console.error("Error fetching favorites:", error);
    }
  };

  const openModal = (resourceId) => {
    setResourceId(resourceId);
    setModalIsOpen(true);
  };

  const closeModal = () => {
    setModalIsOpen(false);
    setStartTime("");
    setEndTime("");
  };

  const bookResource = async () => {
    try {
      const response = await axios.post(
        `${API_URL}users/book`,
        {
          resourceId,
          startTime,
          endTime,
        },
        {
          withCredentials: true,
        }
      );
      alert(response.data.message);
      fetchAvailability();
      closeModal();
    } catch (error) {
      alert(error.response.data.error);
      console.error("Error booking resource:", error);
    }
  };

  const markFavorite = async (resourceId) => {
    try {
      const response = await axios.post(
        `${API_URL}users/favorite`,
        {
          resourceType,
          resourceId,
        },
        {
          withCredentials: true,
        }
      );
      alert(response.data.message);
      fetchFavorites();
    } catch (error) {
      console.error("Error marking favorite:", error);
    }
  };

  return (
    <div>
      <h1>User Dashboard</h1>
      <div>
        <label>
          Resource Type:
          <select
            value={resourceType}
            onChange={(e) => setResourceType(e.target.value)}
            className="form-select"
          >
            <option value="desk">Desk</option>
            <option value="parking spot">Parking spot</option>
            <option value="meeting room">meeting room</option>
          </select>
        </label>
      </div>
      <div>
        <h2>Available Resources</h2>
        <ul className="list-group">
          {resources.map((resource) => (
            <li key={resource._id} className="list-group-item">
              {resource.name} - {resource.location}
              <button
                className="btn btn-primary ms-2"
                onClick={() => openModal(resource._id)}
              >
                Book
              </button>
              <button
                className="btn btn-secondary ms-2"
                onClick={() => markFavorite(resource._id)}
              >
                Favorite
              </button>
            </li>
          ))}
        </ul>
      </div>
      <div>
        <h2>Reservations for today</h2>
        <ul className="list-group">
          {reservations.map((reservation) => (
            <li key={reservation._id} className="list-group-item">
              {/* {console.log(reservation)} */}
              {reservation.resource_id.name} - {reservation.start_time} to{" "}
              {reservation.end_time}
            </li>
          ))}
        </ul>
      </div>
      <div>
        <h2>Favorites</h2>
        <ul className="list-group">
          {favorites.map((favorite) => (
            <li key={favorite._id} className="list-group-item">
              {favorite.resource_id.name} - {favorite.resource_id.location}
              <button
                className="btn btn-primary ms-2"
                onClick={() => openModal(favorite.resource_id._id)}
              >
                Book
              </button>
            </li>
          ))}
        </ul>
      </div>
      <Modal
        isOpen={modalIsOpen}
        onRequestClose={closeModal}
        contentLabel="Book Resource"
      >
        <h2>Book Resource</h2>
        <label>
          Start Time:
          <input
            type="datetime-local"
            value={startTime}
            onChange={(e) => setStartTime(e.target.value)}
            className="form-control"
          />
        </label>
        <label>
          End Time:
          <input
            type="datetime-local"
            value={endTime}
            onChange={(e) => setEndTime(e.target.value)}
            className="form-control"
          />
        </label>
        <button className="btn btn-primary mt-2" onClick={bookResource}>
          Book
        </button>
        <button className="btn btn-secondary mt-2" onClick={closeModal}>
          Cancel
        </button>
      </Modal>
    </div>
  );
};

export default UserDashboard;
