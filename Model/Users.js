const mongoose = require("mongoose");

const userSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  password: { type: String, required: true }, // plain text (not secure in production)
});

module.exports = mongoose.model("Usersdata", userSchema);