const cron = require("node-cron");
const { deleteExpiredReservations } = require("../controllers/reservationController");

// Schedule the task to run every day at midnight (server time)
cron.schedule("0 0 * * *", async () => {
  console.log("Running scheduled cleanup of expired reservations...");
  await deleteExpiredReservations();
});

console.log("Scheduled job for deleting expired reservations initialized.");
