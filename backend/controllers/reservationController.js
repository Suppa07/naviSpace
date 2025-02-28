const Reservation = require("../models/Reservation");

// Function to delete expired reservations
const deleteExpiredReservations = async () => {
  try {
    const now = new Date();
    const result = await Reservation.deleteMany({ endTime: { $lt: now } });
    console.log(`Deleted ${result.deletedCount} expired reservations`);
  } catch (error) {
    console.error("Error deleting expired reservations:", error);
  }
};

module.exports = { deleteExpiredReservations };
