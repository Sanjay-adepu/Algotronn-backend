const express = require('express');
const { OAuth2Client } = require('google-auth-library');
const bodyParser = require('body-parser');
const cors = require('cors');
const mongoose = require('mongoose');
const User = require('./Model/User.js'); 
const Coupon = require('./Model/Coupon.js');
const nodemailer = require('nodemailer');
const Counter = require('./Model/Counter.js');



// Configure Cloudinary
cloudinary.config({
  cloud_name: "dppiuypop",
  api_key: "412712715735329",
  api_secret: "m04IUY0-awwtr4YoS-1xvxOOIzU"
});





mongoose.set('strictQuery', true);


// MongoDB connection
const MONGODB_URI = "mongodb+srv://Algotran:1234@cluster0.gum2tc7.mongodb.net/Algotran?retryWrites=true&w=majority";

const client = new OAuth2Client("741240365062-r2te32gvukmekm4r55l4ishc0mhsk4f9.apps.googleusercontent.com");

const app = express();
app.use(bodyParser.json());
app.use(cors({
  origin: ["https://algotronn.vercel.app", "http://localhost:5173","https://algo-admin-one.vercel.app"],
  methods: ["GET", "POST"]
}));

let isConnected = false;

async function connectDB() {
  if (isConnected) return;
  try {
    await mongoose.connect(MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    isConnected = true;
    console.log("MongoDB connected successfully");
  } catch (error) {
    console.error("MongoDB connection error:", error);
  }
}



// Mongoose Schema
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


// Multer setup (memory storage)
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadPath = "./uploads/";
    if (!fs.existsSync(uploadPath)) fs.mkdirSync(uploadPath);
    cb(null, uploadPath);
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + "-" + file.originalname);
  }
});
const upload = multer({ storage });

// POST route to add a product
app.post("/add-product", upload.single("image"), async (req, res) => {
  try {
    const {
      name, description, type, stock,
      price, originalPrice, discount,
      summary, dailyPL, publicType
    } = req.body;

    // Upload image to Cloudinary
    const imagePath = req.file.path;
    const cloudinaryResult = await cloudinary.uploader.upload(imagePath, {
      folder: "products"
    });

    const imageUrl = cloudinaryResult.secure_url;

    // Construct product object
    const baseProduct = {
      name,
      description,
      imageUrl,
      type,
      stock: stock === 'true' || stock === true
    };

    if (type === 'duplicate') {
      baseProduct.price = Number(price);
      baseProduct.originalPrice = Number(originalPrice);
      baseProduct.discount = Number(discount);
    } else if (type === 'public') {
      baseProduct.summary = summary;
      baseProduct.dailyPL = dailyPL;
      baseProduct.publicType = publicType;
    }

    const newProduct = new Product(baseProduct);
    await newProduct.save();

    // Remove uploaded file from local storage
    fs.unlinkSync(imagePath);

    res.status(201).json({ success: true, product: newProduct });
  } catch (error) {
    console.error("Error adding product:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
});







// POST /api/user/cart
app.post('/cart', async (req, res) => {
  await connectDB();

  try {
    const { googleId, cartItem } = req.body;

    if (!googleId || !cartItem || !cartItem.productId) {
      return res.status(400).json({ message: 'Invalid data' });
    }

    const user = await User.findOne({ googleId });

    if (!user) return res.status(404).json({ message: 'User not found' });

    // Ensure minimum quantity of 1
    const quantityToAdd = cartItem.quantity && cartItem.quantity > 0 ? cartItem.quantity : 1;

    // Check if item already exists in cart
    const existingItemIndex = user.cart.findIndex(
      item => item.productId === cartItem.productId
    );

    if (existingItemIndex !== -1) {
  // Replace quantity instead of adding
  user.cart[existingItemIndex].quantity = quantityToAdd;
} else {
  // Add new item with valid quantity
  user.cart.push({ ...cartItem, quantity: quantityToAdd });
}

    await user.save();
    res.status(200).json({ message: 'Cart updated', cart: user.cart });

  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});



// Route to update only the quantity of a cart item
app.post('/update-cart-quantity', async (req, res) => {
  await connectDB();

  const { googleId, productId, quantity } = req.body;

  if (!googleId || !productId || typeof quantity !== 'number' || quantity < 1) {
    return res.status(400).json({ success: false, message: 'Invalid input' });
  }

  try {
    const user = await User.findOne({ googleId });

    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    const itemIndex = user.cart.findIndex(item => item.productId === productId);

    if (itemIndex === -1) {
      return res.status(404).json({ success: false, message: 'Item not found in cart' });
    }

    user.cart[itemIndex].quantity = quantity;
    await user.save();

    res.status(200).json({ success: true, message: 'Quantity updated', cart: user.cart });
  } catch (error) {
    console.error('Error updating quantity:', error);
    res.status(500).json({ success: false, message: 'Server error', error });
  }
});






// Route to update or add address
app.post('/update-address', async (req, res) => {
  await connectDB();

  const { googleId, name, mobile, email, address, locality, landmark, pincode, city, state } = req.body;

  try {
    const user = await User.findOne({ googleId });
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    const isNewAddress = !user.address;
    user.address = { name, mobile, email, address, locality, landmark, pincode, city, state };
    await user.save();

    res.status(200).json({ 
      success: true,
      message: isNewAddress ? 'Address added successfully' : 'Address updated successfully',
      address: user.address 
    });
  } catch (error) {
    console.error('Error updating address:', error);
    res.status(500).json({ success: false, message: 'Server error', error });
  }
});

// Google login route
app.post('/api/google-login', async (req, res) => {
  await connectDB();

  const { token } = req.body;

  try {
    const ticket = await client.verifyIdToken({
      idToken: token,
      audience: "741240365062-r2te32gvukmekm4r55l4ishc0mhsk4f9.apps.googleusercontent.com",
    });

    const payload = ticket.getPayload();

    let user = await User.findOne({ googleId: payload.sub });

    let isNewUser = false;

    if (!user) {
      isNewUser = true;
      user = new User({
        googleId: payload.sub,
        name: payload.name,
        email: payload.email,
        picture: payload.picture,
      });
      await user.save();
      user = await User.findOne({ googleId: payload.sub }); // Ensures it's fully written
    }

    res.json({ success: true, user, isNewUser });
  } catch (error) {
    console.error("Login error:", error);
    res.status(401).json({ success: false, message: "Invalid Token" });
  }
});

// Route to fetch user's address
app.post('/get-address', async (req, res) => {
  await connectDB();
  const { googleId } = req.body;

  try {
    const user = await User.findOne({ googleId });

    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    res.status(200).json({
      success: true,
      address: user.address || null,
      message: user.address ? 'Address found' : 'No address found for this user',
    });
  } catch (error) {
    console.error('Error fetching address:', error);
    res.status(500).json({ success: false, message: 'Server error', error });
  }
});


// Route to get cart items by googleId
app.post('/get-cart', async (req, res) => {
  await connectDB();
  const { googleId } = req.body;

  try {
    const user = await User.findOne({ googleId });

    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    // Fix cart items with zero quantity
    user.cart = user.cart.map(item => ({
      ...item,
      quantity: item.quantity > 0 ? item.quantity : 1
    }));

    await user.save(); // persist fix if needed

    res.status(200).json({ success: true, cart: user.cart });
  } catch (error) {
    console.error('Error fetching cart:', error);
    res.status(500).json({ success: false, message: 'Server error', error });
  }
});






// Route to remove an item from cart by googleId and productId
app.post('/remove-cart-item', async (req, res) => {
  await connectDB();
  const { googleId, productId } = req.body;

  if (!googleId || !productId) {
    return res.status(400).json({ success: false, message: 'Missing data' });
  }

  try {
    const user = await User.findOne({ googleId });

    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    user.cart = user.cart.filter(item => item.productId !== productId);
    await user.save();

    res.status(200).json({ success: true, message: 'Item removed', cart: user.cart });
  } catch (error) {
    console.error('Error removing item:', error);
    res.status(500).json({ success: false, message: 'Server error', error });
  }
});



app.post('/apply-coupon', async (req, res) => {
  await connectDB();
  const { googleId, couponCode } = req.body;

  try {
    const user = await User.findOne({ googleId });
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });

    const coupon = await Coupon.findOne({ code: couponCode, isActive: true });
    if (!coupon || (coupon.expiresAt && new Date() > coupon.expiresAt)) {
      return res.status(400).json({ success: false, message: 'Invalid or expired coupon' });
    }

    const discountPercentage = coupon.discountPercentage;

    let updatedCart = [];
    let cartTotalBeforeCoupon = 0;
    let cartTotalAfterCoupon = 0;

    user.cart.forEach(item => {
      const priceAfterAdminDiscount = item.price;  // already discounted price
      const quantity = item.quantity || 1;

      // Coupon discount applied on the already discounted price
      const priceAfterCoupon = parseFloat((priceAfterAdminDiscount * (1 - discountPercentage / 100)).toFixed(2));

      cartTotalBeforeCoupon += priceAfterAdminDiscount * quantity;
      cartTotalAfterCoupon += priceAfterCoupon * quantity;

      updatedCart.push({
        ...item._doc,
        price: priceAfterCoupon,
        discount: discountPercentage  // coupon discount percentage
      });
    });

    // Update cart with new discounted prices
    user.cart = updatedCart;
    await user.save();

    return res.json({
      success: true,
      message: `Coupon applied: ${discountPercentage}% off on discounted prices`,
      originalTotal: parseFloat(cartTotalBeforeCoupon.toFixed(2)),  // before coupon
      finalTotal: parseFloat(cartTotalAfterCoupon.toFixed(2)),      // after coupon
      discount: parseFloat((cartTotalBeforeCoupon - cartTotalAfterCoupon).toFixed(2)),
      updatedCart: user.cart,
      couponCode: coupon.code
    });

  } catch (err) {
    console.error('Apply coupon error:', err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
});







app.post('/create-coupon', async (req, res) => {
  const { code, discountPercentage, expiresAt } = req.body;
  try {
    const newCoupon = new Coupon({ code, discountPercentage, expiresAt });
    await newCoupon.save();
    res.status(201).json({ success: true, message: 'Coupon created' });
  } catch (err) {
    res.status(400).json({ success: false, message: 'Error creating coupon', error: err.message });
  }
});



app.post('/place-order', async (req, res) => {
  await connectDB();
  const { googleId } = req.body;

  try {
    const user = await User.findOne({ googleId });

    if (!user) return res.status(404).json({ success: false, message: 'User not found' });
    if (!user.cart || user.cart.length === 0) return res.status(400).json({ success: false, message: 'Cart is empty' });
    if (!user.address) return res.status(400).json({ success: false, message: 'Address not found' });

  
    // Get next unique orderId from global counter
const counter = await Counter.findOneAndUpdate(
  { name: 'orderId' },
  { $inc: { value: 1 } },
  { new: true, upsert: true }
);

// Ensure orderId is at least 5 digits with "ORD-" prefix
const nextOrderId = `ORD${counter.value.toString().padStart(5, '0')}`;


    const totalAmount = user.cart.reduce((sum, item) => sum + item.price * item.quantity, 0);

    const newOrder = {
      orderId: nextOrderId,
      items: user.cart,
      totalAmount,
      status: 'Pending',
      address: user.address,
    };

    user.orders.push(newOrder);
    user.cart = [];
    await user.save();

    // Email config
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user:"algotronn.team@gmail.com",
        pass:"iktzeopoezjvdmcp"
      }
    });

    const plainTextItems = newOrder.items.map(item =>
      `${item.name} - ₹${item.price} x ${item.quantity}`
    ).join('\n');

    const plainTextBody = `
Order Confirmation - ${newOrder.orderId}

Total Amount: ₹${newOrder.totalAmount}

Items:
${plainTextItems}

Shipping Address:
${newOrder.address.name}
${newOrder.address.address}, ${newOrder.address.locality}
${newOrder.address.landmark}
${newOrder.address.city}, ${newOrder.address.state} - ${newOrder.address.pincode}
Mobile: ${newOrder.address.mobile}
Email: ${newOrder.address.email}
    `;

    const mailOptions = {
      from: 'algotronn.team@gmail.com',
      to: 'algotronn.team@gmail.com',
      subject: `Order Confirmation - ${newOrder.orderId} | AlgoTRONN`,
      text: plainTextBody,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; border: 1px solid #e0e0e0; border-radius: 8px; overflow: hidden;">
          <div style="background-color: #0e1a35; color: white; padding: 20px; text-align: center;">
            <h2>AlgoTRONN</h2>
            <p style="margin: 0;">Order Confirmation</p>
          </div>

          <div style="padding: 20px;">
            <h3 style="color: #333;">Order ID: ${newOrder.orderId}</h3>
            <p><strong>Total Amount:</strong> ₹${newOrder.totalAmount}</p>

            <h3 style="color: #333; margin-top: 30px;">Items Ordered</h3>
            ${newOrder.items.map(item => `
              <div style="display: flex; align-items: center; margin-bottom: 15px; border-bottom: 1px solid #e0e0e0; padding-bottom: 10px;">
                <img src="${item.imageUrl}" alt="${item.name}" style="width: 100px; height: auto; border-radius: 4px; margin-right: 15px;" />
                <div>
                  <p style="margin: 0; font-weight: bold;">${item.name}</p>
                  <p style="margin: 0;">Price: ₹${item.price} x ${item.quantity}</p>
                </div>
              </div>
            `).join('')}

            <h3 style="color: #333; margin-top: 30px;">Shipping Address</h3>
            <p style="margin: 0;">
              ${newOrder.address.name}<br/>
              ${newOrder.address.address}, ${newOrder.address.locality}<br/>
              ${newOrder.address.landmark}<br/>
              ${newOrder.address.city}, ${newOrder.address.state} - ${newOrder.address.pincode}<br/>
              <strong>Mobile:</strong> ${newOrder.address.mobile}<br/>
              <strong>Email:</strong> ${newOrder.address.email}
            </p>

            <a href="https://algotronn-backend.vercel.app/mark-delivered/${newOrder.orderId}" 
              style="display:inline-block; padding:10px 20px; background-color:#28a745; color:white; text-decoration:none; border-radius:5px; margin-top:20px;">
              Mark as Delivered
            </a>
          </div>

          <div style="background-color: #f2f2f2; padding: 15px; text-align: center;">
            <p style="margin: 0; font-size: 13px;">AlgoTRONN Admin Panel</p>
          </div>
        </div>
      `
    };

    await transporter.sendMail(mailOptions);

    res.status(200).json({ success: true, message: 'Order placed', order: newOrder });

  } catch (error) {
    console.error('Order placement error:', error);
    res.status(500).json({ success: false, message: 'Server error', error });
  }
});






app.post('/update-cart-pricing', async (req, res) => {
  await connectDB();

  const { googleId, productId, discount, price } = req.body;

  if (!googleId || !productId) {
    return res.status(400).json({ success: false, message: 'Missing googleId or productId' });
  }

  if (typeof discount !== 'number' && typeof price !== 'number') {
    return res.status(400).json({ success: false, message: 'Provide at least one of discount or price' });
  }

  try {
    const user = await User.findOne({ googleId });

    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    const itemIndex = user.cart.findIndex(item => item.productId === productId);

    if (itemIndex === -1) {
      return res.status(404).json({ success: false, message: 'Item not found in cart' });
    }

    if (typeof discount === 'number') {
      user.cart[itemIndex].discount = discount;
    }

    if (typeof price === 'number') {
      user.cart[itemIndex].price = price;
    }

    await user.save();

    res.status(200).json({ success: true, message: 'Discount/Price updated', cart: user.cart });
  } catch (error) {
    console.error('Error updating discount/price:', error);
    res.status(500).json({ success: false, message: 'Server error', error });
  }
});


app.post('/get-orders', async (req, res) => {
  await connectDB();
  const { googleId } = req.body;

  if (!googleId) {
    return res.status(400).json({ success: false, message: 'Missing googleId' });
  }

  try {
    const user = await User.findOne({ googleId });

    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    const orders = user.orders || [];

    res.status(200).json({
      success: true,
      orders,
      message: orders.length ? 'Orders fetched successfully' : 'No orders found'
    });
  } catch (error) {
    console.error('Error fetching orders:', error);
    res.status(500).json({ success: false, message: 'Server error', error });
  }
});


app.get('/mark-delivered/:orderId', async (req, res) => {
  await connectDB();
  const { orderId } = req.params;

  try {
    const user = await User.findOne({ "orders.orderId": orderId });
    if (!user) return res.status(404).send('User with this order not found');

    const order = user.orders.find(o => o.orderId === orderId);
    if (!order) return res.status(404).send('Order not found');

    order.status = 'Completed';
    await user.save();

    res.send(`Order ${orderId} has been marked as Delivered successfully.`);
  } catch (err) {
    console.error('Mark Delivered Error:', err);
    res.status(500).send('Server error');
  }
});


app.get('/mark-cancelled/:orderId', async (req, res) => {
  await connectDB();
  const { orderId } = req.params;

  try {
    const user = await User.findOne({ "orders.orderId": orderId });
    if (!user) return res.status(404).send('User with this order not found');

    const order = user.orders.find(o => o.orderId === orderId);
    if (!order) return res.status(404).send('Order not found');

    if (order.status === 'Completed') {
      return res.status(400).send('Cannot cancel a completed order');
    }
    if (order.status === 'Cancelled') {
      return res.status(400).send('Order is already cancelled');
    }

    order.status = 'Cancelled';
    await user.save();

    // Send cancellation email
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user:"algotronn.team@gmail.com",
        pass:"iktzeopoezjvdmcp"
      }
    });

    const itemList = order.items.map(item => `${item.name} - ₹${item.price} x ${item.quantity}`).join('\n');

    const htmlItems = order.items.map(item => `
      <div style="display: flex; align-items: center; margin-bottom: 15px; border-bottom: 1px solid #e0e0e0; padding-bottom: 10px;">
        <img src="${item.imageUrl}" alt="${item.name}" style="width: 100px; height: auto; border-radius: 4px; margin-right: 15px;" />
        <div>
          <p style="margin: 0; font-weight: bold;">${item.name}</p>
          <p style="margin: 0;">Price: ₹${item.price} x ${item.quantity}</p>
        </div>
      </div>
    `).join('');

    const mailOptions = {
      from: 'algotronn.team@gmail.com',
      to: 'algotronn.team@gmail.com',
      subject: `Order Cancelled - ${order.orderId} | AlgoTRONN`,
      text: `Order ${order.orderId} has been cancelled.\n\nItems:\n${itemList}\n\nTotal: ₹${order.totalAmount}\n`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; border: 1px solid #e0e0e0; border-radius: 8px; overflow: hidden;">
          <div style="background-color: #8b0000; color: white; padding: 20px; text-align: center;">
            <h2>AlgoTRONN</h2>
            <p style="margin: 0;">Order Cancelled</p>
          </div>

          <div style="padding: 20px;">
            <h3 style="color: #333;">Order ID: ${order.orderId}</h3>
            <p><strong>Total Amount:</strong> ₹${order.totalAmount}</p>

            <h3 style="color: #333; margin-top: 30px;">Items Ordered</h3>
            ${htmlItems}

            <h3 style="color: #333; margin-top: 30px;">Shipping Address</h3>
            <p style="margin: 0;">
              ${order.address.name}<br/>
              ${order.address.address}, ${order.address.locality}<br/>
              ${order.address.landmark}<br/>
              ${order.address.city}, ${order.address.state} - ${order.address.pincode}<br/>
              <strong>Mobile:</strong> ${order.address.mobile}<br/>
              <strong>Email:</strong> ${order.address.email}
            </p>
          </div>

          <div style="background-color: #f2f2f2; padding: 15px; text-align: center;">
            <p style="margin: 0; font-size: 13px;">AlgoTRONN Admin Panel</p>
          </div>
        </div>
      `
    };

    await transporter.sendMail(mailOptions);

    res.send(`Order ${orderId} has been marked as Cancelled and email sent successfully.`);
  } catch (err) {
    console.error('Mark Cancelled Error:', err);
    res.status(500).send('Server error');
  }
});

app.post('/get-all-orders-by-date', async (req, res) => {
await connectDB();
const { date } = req.body; // expected format: "2025-05-16"

if (!date) return res.status(400).json({ success: false, message: 'Date is required' });

try {
const users = await User.find({}, 'orders googleId name email'); // only fetch necessary fields

const targetDate = new Date(date);    
const filteredOrders = [];    

users.forEach(user => {    
  user.orders.forEach(order => {    
    const orderDate = new Date(order.createdAt);    
    const isSameDate =    
      orderDate.getFullYear() === targetDate.getFullYear() &&    
      orderDate.getMonth() === targetDate.getMonth() &&    
      orderDate.getDate() === targetDate.getDate();    

    if (isSameDate) {    
      filteredOrders.push({    
        ...order.toObject(),    
        userName: user.name,    
        userEmail: user.email,    
        googleId: user.googleId    
      });    
    }    
  });    
});    

res.status(200).json({ success: true, count: filteredOrders.length, orders: filteredOrders });

} catch (error) {
console.error('Get orders by date error:', error);
res.status(500).json({ success: false, message: 'Server error', error });
}
});

app.post('/get-orders-by-date', async (req, res) => {
await connectDB();

const { date, status } = req.body;

if (!date || !status) {
return res.status(400).json({ success: false, message: 'Date and status are required' });
}

try {
// Convert the input date to start and end of the day
const targetDate = new Date(date);
const startOfDay = new Date(targetDate.setHours(0, 0, 0, 0));
const endOfDay = new Date(targetDate.setHours(23, 59, 59, 999));

// Find users with orders matching the status and date    
const users = await User.find({    
  "orders": {    
    $elemMatch: {    
      status: status,    
      createdAt: { $gte: startOfDay, $lte: endOfDay }    
    }    
  }    
}, {    
  googleId: 1,    
  name: 1,    
  orders: {    
    $filter: {    
      input: "$orders",    
      as: "order",    
      cond: {    
        $and: [    
          { $eq: ["$$order.status", status] },    
          { $gte: ["$$order.createdAt", startOfDay] },    
          { $lte: ["$$order.createdAt", endOfDay] }    
        ]    
      }    
    }    
  }    
});    

res.json({ success: true, users });

} catch (error) {
console.error('Error fetching orders by date:', error);
res.status(500).json({ success: false, message: 'Server error' });
}
});


// Route to fetch order details by orderId
app.post('/get-order-details', async (req, res) => {
  await connectDB();
  const { orderId } = req.body;

  if (!orderId) {
    return res.status(400).json({ success: false, message: 'orderId is required' });
  }

  try {
    // Search for the user who has the order
    const user = await User.findOne({ 'orders.orderId': orderId });

    if (!user) {
      return res.status(404).json({ success: false, message: 'Order not found' });
    }

    // Find the specific order from the user's orders
    const order = user.orders.find(o => o.orderId === orderId);

    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found in user record' });
    }

    res.status(200).json({
      success: true,
      message: 'Order details fetched successfully',
      order,
    });
  } catch (error) {
    console.error('Error fetching order:', error);
    res.status(500).json({ success: false, message: 'Server error', error });
  }
});


app.get('/users', async (req, res) => {
  await connectDB();

  try {
    const oneWeekAgo = new Date(Date.now() - 7*24*60*60*1000);

    const newUsers = await User.find({ createdAt: { $gte: oneWeekAgo } });
    const oldUsers = await User.find({ createdAt: { $lt: oneWeekAgo } });

    res.json({
      newUserCount: newUsers.length,
      oldUserCount: oldUsers.length,
      newUsers: newUsers.map(u => ({ name: u.name, email: u.email, mobile: u.address?.mobile })),
      oldUsers: oldUsers.map(u => ({ name: u.name, email: u.email, mobile: u.address?.mobile }))
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});





// Required for Vercel deployment
module.exports = app;