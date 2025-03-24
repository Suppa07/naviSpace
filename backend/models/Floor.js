const mongoose = require("mongoose");

const FloorSchema = new mongoose.Schema(
  {
    company_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Company",
      required: true,
    },
    name: { type: String, required: true },

    layout_url: {
      type: String,
      default: "",
      validate: (value) => value.endsWith(".png"),
    },

    base_location: {
      latitude: {
        type: Number,
        validate: {
          validator: (value) => value >= -90 && value <= 90,
          message: (props) => `${props.value} is not a valid latitude.`,
        },
      },
      longitude: {
        type: Number,
        validate: {
          validator: (value) => value >= -180 && value <= 180,
          message: (props) => `${props.value} is not a valid longitude.`,
        },
      },
    },

    floor_number: { type: Number, required: true },
    realx: { type: Number, required: true }, // Real world x dimension of the floor
    realy: { type: Number, required: true }, // Real world y dimension of the floor
  },
  { timestamps: true }
);

module.exports = mongoose.model("Floor", FloorSchema);
