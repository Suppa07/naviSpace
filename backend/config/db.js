require('dotenv').config();
const mongoose = require('mongoose');

// Skip MongoDB connection if running tests (Jest sets NODE_ENV to 'test')
if (process.env.NODE_ENV !== 'test') {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.error("MONGODB_URI is not defined. Check your .env file.");
    process.exit(1);
  }

  mongoose.connect(uri, { useNewUrlParser: true, useUnifiedTopology: true })
    .then(() => console.log('MongoDB connected successfully'))
    .catch(err => console.error('MongoDB connection error:', err));
}

module.exports = mongoose;