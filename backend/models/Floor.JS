const mongoose = require("mongoose");

const FloorSchema = new mongoose.Schema(
  {
    company_id: { type: mongoose.Schema.Types.ObjectId, ref: "Company", required: true },
    name: { type: String, required: true },
    layout_url: { type: String, default: "" }, // Floor plan image URL
  },
  { timestamps: true }
);

module.exports = mongoose.model("Floor", FloorSchema);
