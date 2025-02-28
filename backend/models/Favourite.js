const mongoose = require("mongoose");

const FavouriteSchema = new mongoose.Schema({
  user_id: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  resource_id: { type: mongoose.Schema.Types.ObjectId, ref: "Resource", required: true },
  resource_type: { type: String, required: true },
});

module.exports = mongoose.model("Favourite", FavouriteSchema);