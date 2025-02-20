require('dotenv').config(); // Load environment variables

const mongoose = require('mongoose');

const uri = process.env.MONGODB_URI; // Check if this prints correctly
if (!uri) {
  console.error("MONGODB_URI is not defined. Check your .env file.");
  process.exit(1); // Stop execution if missing
}

mongoose.connect(uri, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => console.log('MongoDB connected successfully'))
  .catch(err => console.error('MongoDB connection error:', err));

module.exports = mongoose;
