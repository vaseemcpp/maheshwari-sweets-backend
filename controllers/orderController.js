const asyncHandler = require("express-async-handler");
const Order = require("../models/orderModel");
const { calculateTotalPrice, updateProductQuantity } = require("../utils");
const Product = require("../models/productModel");
const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);
const axios = require("axios");
const User = require("../models/userModel");
const Transaction = require("../models/transactionModel");

const createOrder = asyncHandler(async (req, res) => {
    const {
      orderDate,
      orderTime,
      orderAmount,
      orderStatus,
      cartItems,
      shippingAddress,
      paymentMethod,
      coupon,
    } = req.body;

      //   Validation
  if (!cartItems || !orderStatus || !shippingAddress || !paymentMethod) {
    res.status(400);
    throw new Error("Order data missing!!!");
  }

   // Create Order
   await Order.create({
    user: req.user.id,
    orderDate,
    orderTime,
    orderAmount,
    orderStatus,
    cartItems,
    shippingAddress,
    paymentMethod,
    coupon,
  });
   
await updateProductQuantity(cartItems)
  res.status(201).json({ message: "Order Created" });
});


// Get all Orders
const getOrders = asyncHandler(async (req, res) => {
    let orders;
  
    if (req.user.role === "admin") {
      orders = await Order.find().sort("-createdAt");
      return res.status(200).json(orders);
    }
    orders = await Order.find({ user: req.user._id }).sort("-createdAt");
    res.status(200).json(orders);
  });
  
  // Get single Order
const getOrder = asyncHandler(async (req, res) => {
    const order = await Order.findById(req.params.id);
    // if product doesnt exist
    if (!order) {
      res.status(404);
      throw new Error("Order not found");
    }
    if (req.user.role === "admin") {
      return res.status(200).json(order);
    }
    // Match Order to its user
    if (order.user.toString() !== req.user._id.toString()) {
      res.status(401);
      throw new Error("User not authorized");
    }
    res.status(200).json(order);
  });

  // Update Order Status
const updateOrderStatus = asyncHandler(async (req, res) => {
    const { orderStatus } = req.body;
    const { id } = req.params;
  
    const order = await Order.findById(id);
  
    // if product doesnt exist
    if (!order) {
      res.status(404);
      throw new Error("Order not found");
    }
  
    // Update Product
    await Order.findByIdAndUpdate(
      { _id: id },
      {
        orderStatus: orderStatus,
      },
      {
        new: true,
        runValidators: true,
      }
    );
  
    res.status(200).json({ message: "Order status updated" });
  });

  // Pay with stripe
const payWithStripe = asyncHandler(async (req, res) => {
  const { items, shipping, description, coupon } = req.body;
  const products = await Product.find();

  let orderAmount;
  orderAmount = calculateTotalPrice(products, items);
  if (coupon !== null && coupon?.name !== "nil") {
    let totalAfterDiscount =
      orderAmount - (orderAmount * coupon.discount) / 100;
    orderAmount = totalAfterDiscount;
  }
  // Create a PaymentIntent with the order amount and currency
  const paymentIntent = await stripe.paymentIntents.create({
    amount: orderAmount,
    currency: "usd",
    automatic_payment_methods: {
      enabled: true,
    },
    description,
    shipping: {
      address: {
      //   line1: '510 Townsend St',
      //   postal_code: '98140',
      //   city: 'San Francisco',
      //   state: 'CA',
      //   country: 'US',
      // },
      // name: 'test',
      // phone: shipping.phone,

      line1: shipping.line1,
      line2: shipping.line2,
      city: shipping.city,
      country: shipping.country,
      postal_code: shipping.postal_code,
    },
    name: shipping.name,
    phone: shipping.phone,
    },
    // receipt_email: customerEmail
  });

  // console.log(paymentIntent);

  res.send({
    clientSecret: paymentIntent.client_secret,
  });
});

// Pay with Wallet
const payWithWallet = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id);
  const { items, cartItems, shippingAddress, coupon } = req.body;
  // console.log(coupon);
// console.log(cartItems);
// console.log(req.body);
  const products = await Product.find();
  const today = new Date();

  let orderAmount;
  orderAmount = calculateTotalPrice(products, cartItems);
  if (coupon !== null && coupon?.name !== "nil") {
    let totalAfterDiscount = orderAmount - (orderAmount * coupon.discount) / 100;
    orderAmount = totalAfterDiscount;
  }
  // console.log(orderAmount);
  // console.log(user.balance);

  if (user.balance < orderAmount) {
    res.status(400);
    throw new Error("Insufficient balance");
  }

  const newTransaction = await Transaction.create({
    amount: orderAmount,
    sender: user.email,
    receiver: "Shopito store",
    description: "Payment for products.",
    status: "success",
  });

  // decrease the sender's balance
  const newBalance = await User.findOneAndUpdate(
    { email: user.email },
    {
      $inc: { balance: -orderAmount },
    }
  );

  const newOrder = await Order.create({
    user: user._id,
    orderDate: today.toDateString(),
    orderTime: today.toLocaleTimeString(),
    orderAmount,
    orderStatus: "Order Placed...",
    cartItems,
    shippingAddress,
    paymentMethod: "Shopito Wallet",
    coupon,
  });
   // Update Product quantity
   const updatedProduct = await updateProductQuantity(cartItems);
   // console.log("updated product", updatedProduct);
 
   if (newTransaction && newBalance && newOrder) {
    return res.status(200).json({
      message: "Payment successful",
      url: `${process.env.FRONTEND_URL}/checkout-success`,
    });
  }
  res
    .status(400)
    .json({ message: "Something went wrong, please contact admin" });
});


// update product quantity
// await updateProductQuantity(cartItems)

module.exports = {
    createOrder,
    getOrders,
    getOrder,
    updateOrderStatus,
    payWithStripe,
    payWithWallet,
}