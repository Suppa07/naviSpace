const mongoose = require("mongoose");

const ReservationSchema = new mongoose.Schema(
  {
    resource_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Resource",
      required: true,
    },
    resource_type: { type: String, required: true },
    company_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Company",
      required: true,
    },
    start_time: { type: Date, required: true },
    end_time: { type: Date, required: true },
    participants: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
    is_fixed: { type: Boolean, default: false }, // True for assigned desks/parking
  },
  { timestamps: true }
);

module.exports = mongoose.model("Reservation", ReservationSchema);
