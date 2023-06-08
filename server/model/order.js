const mongoose = require("mongoose");

const orderSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "user_collection",
    required: true,
  },
  items: [
    {
      product: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "product",
        required: true,
      },
      quantity: {
        type: Number,
        required: true,
        min: 1,
      },
      price: {
        type: Number,
        required: true,
        min: 0,
      },
    },
  ],
  total: {
    type: Number,
    required: true,
    min: 0,
  },
  status: {
    type: String,
    enum: ["Pending", "Processing", "Returned" , "Shipped", "Delivered","cancelled"],
    default: "Pending",
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  payment_method:{
    type:String,
    required: true,
    enum: ['Razorpay', 'credit_card', 'COD','paypal']
 },
  shipping_charge: {
    type: Number,
    required: true,
  },
  address: {
    type: Object,
    required: true,
   
  },
});

const Order = mongoose.model("Order", orderSchema);

module.exports = Order;