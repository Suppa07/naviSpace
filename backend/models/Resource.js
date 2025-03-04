const mongoose = require("mongoose");

const ResourceSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    resource_type: { type: String, enum: ["desk", "meeting room", "parking spot"], required: true },
    floor_id: { type: mongoose.Schema.Types.ObjectId, ref: "Floor", required: true },
    company_id: { type: mongoose.Schema.Types.ObjectId, ref: "Company", required: true },
    location: { 
      type: [Number], 
      required: true, 
      validate: {
        validator: function(v) {
          return v.length === 2 && !isNaN(v[0]) && !isNaN(v[1]);
        },
        message: props => `${props.value} is not a valid location! Expected [x, y] coordinates.`
      }
    },
    capacity: { type: Number, default: 1 }, // Default 1 (for desks, parking)
    amenities: [{ type: String }], // Array of amenities (e.g., "Projector", "Whiteboard")
  },
  { timestamps: true }
);

module.exports = mongoose.model("Resource", ResourceSchema);