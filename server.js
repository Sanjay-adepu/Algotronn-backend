const express = require('express');
const { OAuth2Client } = require('google-auth-library');
const bodyParser = require('body-parser');
const cors = require('cors');
const mongoose = require('mongoose');
const User = require('./Model/User.js'); 
const Address = require('./Model/addressModel.js'); 

mongoose.set('strictQuery', true);

// MongoDB connection
const MONGODB_URI = "mongodb+srv://Algotran:1234@cluster0.gum2tc7.mongodb.net/Algotran?retryWrites=true&w=majority";

const client = new OAuth2Client("741240365062-r2te32gvukmekm4r55l4ishc0mhsk4f9.apps.googleusercontent.com");

const app = express();
app.use(bodyParser.json());
app.use(cors({
  origin: ["https://www.falconai.space", "http://localhost:5173"],
  methods: ["GET", "POST"]
}));

let isConnected = false;

async function connectDB() {
  if (isConnected) return;
  try {
    await mongoose.connect(MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    isConnected = true;
    console.log("MongoDB connected successfully");
  } catch (error) {
    console.error("MongoDB connection error:", error);
  }
}


// Post route for adding a new address
app.post('/add-address', async (req, res) => {
  await connectDB();

  const { googleId, name, mobile, email, address, locality, landmark, pincode, city, state } = req.body;

  try {
    const user = await User.findOne({ googleId });
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    user.address = { name, mobile, email, address, locality, landmark, pincode, city, state };
    await user.save();

    res.status(201).json({ message: 'Address added successfully', address: user.address });
  } catch (error) {
    console.error('Error adding address:', error);
    res.status(500).json({ message: 'Server error', error });
  }
});




app.post('/api/google-login', async (req, res) => {
  await connectDB();

  const { token } = req.body;

  try {
    const ticket = await client.verifyIdToken({
      idToken: token,
      audience: "741240365062-r2te32gvukmekm4r55l4ishc0mhsk4f9.apps.googleusercontent.com",
    });

    const payload = ticket.getPayload();

    let user = await User.findOne({ googleId: payload.sub });

    let isNewUser = false;

    if (!user) {
      isNewUser = true;
      user = new User({
        googleId: payload.sub,
        name: payload.name,
        email: payload.email,
        picture: payload.picture,
      });
      await user.save();
    }

    res.json({ success: true, user, isNewUser });
  } catch (error) {
    console.error("Login error:", error);
    res.status(401).json({ success: false, message: "Invalid Token" });
  }
});


// Route to fetch user's address by email
app.post('/get-address', async (req, res) => {
  await connectDB();
  const { googleId } = req.body;

  try {
    const user = await User.findOne({ googleId });

    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    res.status(200).json({
      success: true,
      address: user.address || null,
      message: user.address ? 'Address found' : 'No address found for this user',
    });
  } catch (error) {
    console.error('Error fetching address:', error);
    res.status(500).json({ success: false, message: 'Server error', error });
  }
});



// Required for Vercel deployment
module.exports = app;