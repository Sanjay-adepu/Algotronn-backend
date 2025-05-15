// Model/Coupon.js
const mongoose = require('mongoose');

const couponSchema = new mongoose.Schema({
  code: { type: String, unique: true, required: true },
  discountPercentage: { type: Number, required: true }, // e.g., 10 for 10%
  expiresAt: { type: Date }, // Optional expiration
  isActive: { type: Boolean, default: true }
});

module.exports = mongoose.model('Coupon', couponSchema);