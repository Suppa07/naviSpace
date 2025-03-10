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
    capacity: { type: Number, default: 1 },
    amenities: [{ type: String }],
    category: { type: String }, // For search categorization
    landmarks: [{ // Nearby landmarks for navigation
      name: String,
      direction: String, // e.g., "north", "left", etc.
      distance: Number
    }]
  },
  { timestamps: true }
);

// Index for location-based queries
ResourceSchema.index({ location: '2d' });

module.exports = mongoose.model("Resource", ResourceSchema);