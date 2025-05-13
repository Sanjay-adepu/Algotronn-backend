// addressModel.js
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
}, { timestamps: true });

const Address = mongoose.model('Address', addressSchema);

module.exports = Address;