const mongoose = require("mongoose");

const personSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  password: { type: String, required: true }, // plain text for now
});

module.exports = mongoose.model("Person", personSchema);