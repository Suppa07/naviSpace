const mongoose = require("mongoose");

const UserSchema = new mongoose.Schema(
  {
    username: { type: String, required: true },
    email_id: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    company_id: { type: mongoose.Schema.Types.ObjectId, ref: "Company" },
    role: { type: String, enum: ["user", "admin"], default: "user" },
    pfp: { type: String, default: "" }, // Profile picture URL
    assigned_resource: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Resource",
      default: null,
    },
    email_verified: { type: Boolean, default: false }
  },
  { timestamps: true }
);

module.exports = mongoose.model("User", UserSchema);