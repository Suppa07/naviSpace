const mongoose = require("mongoose");

const FloorSchema = new mongoose.Schema(
  {
    company_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Company",
      required: true,
    },
    name: { type: String, required: true },
    layout_url: { type: String, default: "" }, // Floor plan image URL
    base_location: {
      latitude: { type: Number },
      longitude: { type: Number },
    },
    floor_number: { type: Number, required: true },
    realx: { type: Number, required: true }, // Real world x dimension of the floor
    realy: { type: Number, required: true }, // Real world y dimension of the floor
  },
  { timestamps: true }
);

module.exports = mongoose.model("Floor", FloorSchema);
