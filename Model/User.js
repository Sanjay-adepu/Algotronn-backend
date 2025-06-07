const mongoose = require('mongoose');

// Address Schema
const addressSchema = new mongoose.Schema({
  name: { type: String, required: false },
  email: { type: String,  required: false },
  mobile: { type: String, required: false },
  address: { type: String, required: true },
  locality: { type: String, default: '' },
  landmark: { type: String, default: '' },
  pincode: { type: String, required: true },
  city: { type: String, required: true },
  state: { type: String, required: true }
}, { _id: false });


// Cart Item Schema
const cartItemSchema = new mongoose.Schema({
productId: { type: Number, required: true },
name: { type: String, required: true },
price: { type: Number, required: true },       // discounted price
originalPrice: { type: Number },               // for discount calc
discount: { type: Number },                    // e.g., 38
quantity: { type: Number, default: 1 },
imageUrl: { type: String },
inStock: { type: Boolean, default: true },
}, { _id: false });

// Order Schema
const orderSchema = new mongoose.Schema({
orderId: { type: String, required: true },
items: [cartItemSchema],
totalAmount: { type: Number, required: true },
status: {
type: String,
enum: ['Pending', 'Completed', 'Cancelled'],
default: 'Pending'
},
createdAt: { type: Date, default: Date.now },
address: addressSchema
}, { _id: false });


// User Schema
const userSchema = new mongoose.Schema({
  googleId: { type: String, unique: true, sparse: true },
  name: String,
  email: { type: String, unique: true, sparse: true },
  mobile: { type: String },
  picture: String,
  address: addressSchema,
  cart: [cartItemSchema],
  orders: [orderSchema],
  username: { type: String, unique: true, sparse: true }, // <-- Added username
  password: { type: String }, // <-- Added password
}, { timestamps: true });


// Index for faster queries on createdAt
userSchema.index({ createdAt: 1 });

const User = mongoose.models.User || mongoose.model('User', userSchema);

module.exports = User;

