const mongoose = require("mongoose");

const CompanySchema = new mongoose.Schema({
  company_name: { type: String, required: true, unique: true },
});

module.exports = mongoose.model("Company", CompanySchema);
