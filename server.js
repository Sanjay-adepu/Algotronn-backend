const express = require('express');
const { OAuth2Client } = require('google-auth-library');
const bodyParser = require('body-parser');
const cors = require('cors');
const mongoose = require('mongoose');
const User = require('./Model/User.js'); 
const Coupon = require('./Model/Coupon.js');

app.post('/apply-coupon', async (req, res) => {
  await connectDB();
  const { googleId, couponCode } = req.body;

  try {
    const user = await User.findOne({ googleId });
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });

    const coupon = await Coupon.findOne({ code: couponCode, isActive: true });
    if (!coupon || (coupon.expiresAt && new Date() > coupon.expiresAt)) {
      return res.status(400).json({ success: false, message: 'Invalid or expired coupon' });
    }

    const cartTotal = user.cart.reduce((acc, item) => acc + item.price * item.quantity, 0);
    const discount = (coupon.discountPercentage / 100) * cartTotal;
    const finalTotal = cartTotal - discount;

    return res.json({
      success: true,
      discount,
      finalTotal,
      originalTotal: cartTotal,
      couponCode: coupon.code,
      message: `Coupon applied: ${coupon.discountPercentage}% off`
    });
  } catch (err) {
    console.error('Apply coupon error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});



app.post('/create-coupon', async (req, res) => {
  const { code, discountPercentage, expiresAt } = req.body;
  try {
    const newCoupon = new Coupon({ code, discountPercentage, expiresAt });
    await newCoupon.save();
    res.status(201).json({ success: true, message: 'Coupon created' });
  } catch (err) {
    res.status(400).json({ success: false, message: 'Error creating coupon', error: err.message });
  }
});




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


// POST /api/user/cart
app.post('/cart', async (req, res) => {
  try {
    const { googleId, cartItem } = req.body;

    if (!googleId || !cartItem || !cartItem.productId) {
      return res.status(400).json({ message: 'Invalid data' });
    }

    const user = await User.findOne({ googleId });

    if (!user) return res.status(404).json({ message: 'User not found' });

    // Check if item already exists in cart
    const existingItemIndex = user.cart.findIndex(
      item => item.productId === cartItem.productId
    );

    if (existingItemIndex !== -1) {
      // If item exists, update quantity
      user.cart[existingItemIndex].quantity += cartItem.quantity || 1;
    } else {
      // Add new item
      user.cart.push(cartItem);
    }

    await user.save();
    res.status(200).json({ message: 'Cart updated', cart: user.cart });

  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});



// Route to update or add address
app.post('/update-address', async (req, res) => {
  await connectDB();

  const { googleId, name, mobile, email, address, locality, landmark, pincode, city, state } = req.body;

  try {
    const user = await User.findOne({ googleId });
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    const isNewAddress = !user.address;
    user.address = { name, mobile, email, address, locality, landmark, pincode, city, state };
    await user.save();

    res.status(200).json({ 
      success: true,
      message: isNewAddress ? 'Address added successfully' : 'Address updated successfully',
      address: user.address 
    });
  } catch (error) {
    console.error('Error updating address:', error);
    res.status(500).json({ success: false, message: 'Server error', error });
  }
});

// Google login route
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
      user = await User.findOne({ googleId: payload.sub }); // Ensures it's fully written
    }

    res.json({ success: true, user, isNewUser });
  } catch (error) {
    console.error("Login error:", error);
    res.status(401).json({ success: false, message: "Invalid Token" });
  }
});

// Route to fetch user's address
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


// Route to get cart items by googleId
app.post('/get-cart', async (req, res) => {
  await connectDB();
  const { googleId } = req.body;

  try {
    const user = await User.findOne({ googleId });

    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    res.status(200).json({ success: true, cart: user.cart || [] });
  } catch (error) {
    console.error('Error fetching cart:', error);
    res.status(500).json({ success: false, message: 'Server error', error });
  }
});



// Route to remove an item from cart by googleId and productId
app.post('/remove-cart-item', async (req, res) => {
  await connectDB();
  const { googleId, productId } = req.body;

  if (!googleId || !productId) {
    return res.status(400).json({ success: false, message: 'Missing data' });
  }

  try {
    const user = await User.findOne({ googleId });

    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    user.cart = user.cart.filter(item => item.productId !== productId);
    await user.save();

    res.status(200).json({ success: true, message: 'Item removed', cart: user.cart });
  } catch (error) {
    console.error('Error removing item:', error);
    res.status(500).json({ success: false, message: 'Server error', error });
  }
});




// Required for Vercel deployment
module.exports = app;