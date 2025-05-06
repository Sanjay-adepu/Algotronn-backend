const express = require('express');
const { OAuth2Client } = require('google-auth-library');
const bodyParser = require('body-parser');
const cors = require('cors');


// Initialize Express
const app = express();
app.use(bodyParser.json());

app.use(cors({
  origin: ["https://www.falconai.space", "http://localhost:5173"],
  methods: ["GET", "POST"]
}));

// Google OAuth Client
const client = new OAuth2Client("741240365062-r2te32gvukmekm4r55l4ishc0mhsk4f9.apps.googleusercontent.com");

// Google login endpoint
app.post('/api/google-login', async (req, res) => {
  const { token } = req.body;

  try {
    // Verify the Google ID token
    const ticket = await client.verifyIdToken({
      idToken: token,
      audience: "741240365062-r2te32gvukmekm4r55l4ishc0mhsk4f9.apps.googleusercontent.com", // Your client ID
    });

    // Get the payload from the verified ticket
    const payload = ticket.getPayload();

    // Send back the user information
    res.json({ success: true, user: payload });
  } catch (error) {
    console.error(error);
    res.status(401).json({ success: false, message: "Invalid Token" });
  }
});

// Vercel handler export
module.exports = app;