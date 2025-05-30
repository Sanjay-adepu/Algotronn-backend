// Mongoose Schema for Product
const productSchema = new mongoose.Schema({
name: String,
imageUrl: String,
description: String,
type: { type: String, enum: ['public', 'duplicate'], required: true },
stock: Boolean,
// For 'duplicate'
price: Number,
originalPrice: Number,
discount: Number,
// For 'public'
summary: String,
dailyPL: String,
publicType: String 
});
const Product = mongoose.model("Product", productSchema);