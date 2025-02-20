const mongoose = require('mongoose');

// Replace this with your MongoDB Atlas connection string
const uri = "mongodb+srv://dhanunjaysuppa:12345@cluster0.t97pt5y.mongodb.net/navispace_prac?retryWrites=true&w=majority&appName=Cluster0";

// Connect to MongoDB Atlas
mongoose.connect(uri, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => console.log('MongoDB connected successfully'))
  .catch(err => console.log('MongoDB connection error:', err));

module.exports = mongoose;
