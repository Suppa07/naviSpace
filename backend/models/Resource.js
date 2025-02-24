const mongoose = require("mongoose");

const ResourceSchema = new mongoose.Schema(
  {
    resource_type: { type: String, required: true }, // e.g., desk, meeting room, parking spot
    floor_id: { type: mongoose.Schema.Types.ObjectId, ref: "Floor", required: true },
    location: { type: String, required: true },
    name: { type: String, required: true },
    capacity: { type: Number, default: 1 }, // Default 1 (for desks, parking)
    amenities: [{ type: String }], // Array of amenities (e.g., "Projector", "Whiteboard")
  },
  { timestamps: true }
);

module.exports = mongoose.model("Resource", ResourceSchema);
