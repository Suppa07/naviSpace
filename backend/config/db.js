const mongoose = require('mongoose');

// Replace this with your MongoDB Atlas connection string
const uri = process.env.MONGODB_URI;
// Connect to MongoDB Atlas
mongoose.connect(uri, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => console.log('MongoDB connected successfully'))
  .catch(err => console.log('MongoDB connection error:', err));

module.exports = mongoose;
