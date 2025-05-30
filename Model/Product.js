const mongoose = require("mongoose");

const productSchema = new mongoose.Schema({
  name: String,
  imageUrl: String,
  description: String,
  type: { type: String, enum: ["public", "duplicate"], required: true },
  stock: Boolean,
  price: Number,
  originalPrice: Number,
  discount: Number,
  summary: String,
  dailyPL: String,
  publicType: String,
  isPriced: Boolean,
  tradetronLink: String // ✅ New field
});

module.exports = mongoose.model("Product", productSchema);