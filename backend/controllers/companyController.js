const Company = require("../models/Company");

exports.getAllCompanies = async (req, res) => {
  try {
    const companies = await Company.find({}, "company_name");
    res.json(companies);
  } catch (err) {
    console.error("Error fetching companies:", err);
    res.status(500).json({ error: "Internal server error" });
  }
};