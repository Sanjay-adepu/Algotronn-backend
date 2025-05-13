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
  try {
    const { name, mobile, email, address, locality, landmark, pincode, city, state } = req.body;

    // Create new address entry
    const newAddress = new Address({
      name,
      mobile,
      email,
      address,
      locality,
      landmark,
      pincode,
      city,
      state,
    });

    // Save the address to the database
    await newAddress.save();

    // Respond with success message
    res.status(201).json({ message: 'Address added successfully', address: newAddress });
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

    if (!user) {
      user = new User({
        googleId: payload.sub,
        name: payload.name,
        email: payload.email,
        picture: payload.picture,
      });
      await user.save();
    }

    res.json({ success: true, user });
  } catch (error) {
    console.error("Login error:", error);
    res.status(401).json({ success: false, message: "Invalid Token" });
  }
});

// Required for Vercel deployment
module.exports = app;