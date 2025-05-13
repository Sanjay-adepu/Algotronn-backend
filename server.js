const express = require('express');
const { OAuth2Client } = require('google-auth-library');
const bodyParser = require('body-parser');
const cors = require('cors');
const mongoose = require('mongoose');
const User = require('./Model/User.js'); // Adjust path if needed

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