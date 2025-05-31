const mongoose = require("mongoose");

const productSchema = new mongoose.Schema({
  id: { type: Number, unique: true }, // Auto-incremented ID
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
  tradetronLink: String,
  sorttype: String
});

module.exports = mongoose.model("Product", productSchema);