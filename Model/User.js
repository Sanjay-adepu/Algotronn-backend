const mongoose = require('mongoose');
const Address = require('./addressModel.js');  // Import Address model

const userSchema = new mongoose.Schema({
  googleId: { type: String, required: true, unique: true },
  name: String,
  email: { type: String, required: true, unique: true },
  picture: String,
  address: { type: mongoose.Schema.Types.ObjectId, ref: 'Address' },  // Reference to Address model
}, { timestamps: true });

module.exports = mongoose.models.User || mongoose.model('User', userSchema);