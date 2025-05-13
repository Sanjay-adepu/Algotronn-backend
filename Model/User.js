// User.js
const mongoose = require('mongoose');

const addressSchema = new mongoose.Schema({
  name: { type: String, required: true },
  mobile: { type: String, required: true },
  email: { type: String, required: true },
  address: { type: String, required: true },
  locality: { type: String, default: '' },
  landmark: { type: String, default: '' },
  pincode: { type: String, required: true },
  city: { type: String, required: true },
  state: { type: String, required: true },
}, { _id: false });  // Disable _id for subdocument if not needed

const userSchema = new mongoose.Schema({
  googleId: { type: String, required: true, unique: true },
  name: String,
  email: { type: String, required: true, unique: true },
  picture: String,
  address: addressSchema, // Embedded address
}, { timestamps: true });

module.exports = mongoose.models.User || mongoose.model('User', userSchema);