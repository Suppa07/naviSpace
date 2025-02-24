const express = require("express");
const router = express.Router();
const Company = require("../models/Company");

// GET: Fetch all companies
router.get("/", async (req, res) => {
  try {
    const companies = await Company.find({}, "company_name");
    res.json(companies);
  } catch (err) {
    console.error("Error fetching companies:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

module.exports = router;


















// // POST: Add a new company (Admin only)
// router.post("/", async (req, res) => {
//   const { company_name } = req.body;

//   if (!company_name) {
//     return res.status(400).json({ error: "Company name is required" });
//   }

//   try {
//     let company = await Company.findOne({ company_name });

//     if (company) {
//       return res.status(400).json({ error: "Company already exists" });
//     }

//     company = new Company({ company_name });
//     await company.save();

//     res.status(201).json({ message: "Company added successfully", company });
//   } catch (err) {
//     console.error("Error adding company:", err);
//     res.status(500).json({ error: "Internal server error" });
//   }
// });

// module.exports = router;
