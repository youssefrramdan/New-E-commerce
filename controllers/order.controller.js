import asyncHandler from "express-async-handler";
import ApiError from "../utils/apiError.js";
import Stripe from "stripe";
import cartModel from "../models/cart.model.js";
import productModel from "../models/product.model.js";
import orderModel from "../models/order.model.js";
import dotenv from "dotenv";

dotenv.config({ path: "./config/config.env" });
const stripe = new Stripe(process.env.STRIPE_SECRET);

/**
 * @desc    Create CashOrder
 * @route   POST /api/orders/cash/:cartId
 * @access  Private (JWT-based)
 */
const createCashOrder = asyncHandler(async (req, res, next) => {
  const userId = req.user._id;
  const { cartId } = req.params;

  const cart = await cartModel.findById(cartId);
  if (!cart) return next(new ApiError("Cart not found", 404));
  if (cart.items.length === 0) return next(new ApiError("Cart is empty", 400));

  const totalPrice = cart.items.reduce(
    (sum, item) => sum + item.price * item.quantity,
    0
  );
  let finalTotal =
    totalPrice -
    (cart.discount || 0) -
    (cart.couponDiscount || 0) -
    (cart.pointsUsed || 0) +
    (cart.shippingFee || 0) +
    (cart.tips || 0);
  if (finalTotal < 0) finalTotal = 0;

  const { completedPayment, paymentMethod } = req.body;
  const isStripePayment = completedPayment && paymentMethod === "card";

  const order = new orderModel({
    userId,
    items: cart.items,
    shippingAddress: req.body.shippingAddress || { address: cart.address },
    totals: {
      totalItems: cart.items.reduce((sum, i) => sum + i.quantity, 0),
      totalPrice,
      discount: cart.discount || 0,
      couponCode: cart.couponCode || null,
      couponDiscount: cart.couponDiscount || 0,
      shippingFee: cart.shippingFee || 0,
      tips: cart.tips || 0,
      pointsUsed: cart.pointsUsed || 0,
      finalTotal,
    },
    paymentMethod: isStripePayment ? "card" : "cash",
    isPaid: isStripePayment,
    PaidAt: isStripePayment ? new Date() : undefined,
  });

  await order.save();

  const options = cart.items.map((item) => ({
    updateOne: {
      filter: { _id: item.productId },
      update: { $inc: { sold: item.quantity, quantity: -item.quantity } },
    },
  }));

  try {
    await productModel.bulkWrite(options);
    await cartModel.findByIdAndDelete(cart._id);
  } catch (error) {
    return next(new ApiError("Failed to update product stock", 500));
  }

  res.status(201).json({
    message: "success",
    order: {
      id: order._id,
      finalTotal: order.totals.finalTotal,
      paymentMethod: order.paymentMethod,
      isPaid: order.isPaid,
      usedPoints: cart.pointsUsed || 0,
      createdAt: order.createdAt,
    },
  });
});

/**
 * @desc    Get all orders (Admin)
 * @route   GET /api/orders
 * @access  Private/Admin
 */
const getAllOrders = asyncHandler(async (req, res, next) => {
  const orders = await orderModel.find().sort({ createdAt: -1 });

  res.status(200).json({
    status: "success",
    results: orders.length,
    data: orders,
  });
});

/**
 * @desc    Get specific order by ID
 * @route   GET /api/orders/:orderId
 * @access  Private/Admin
 */
const getSpecificOrder = asyncHandler(async (req, res, next) => {
  const { orderId } = req.params;
  const order = await orderModel.findById(orderId);

  if (!order) return next(new ApiError("Order not found", 404));

  res.status(200).json({
    status: "success",
    data: order,
  });
});

/**
 * @desc    Get orders of logged-in user
 * @route   GET /api/orders/my
 * @access  Private/User
 */
const getLoggedUserOrders = asyncHandler(async (req, res, next) => {
  const userId = req.user._id;
  const orders = await orderModel.find({ userId }).sort({ createdAt: -1 });

  if (!orders || orders.length === 0) {
    return res.status(200).json({
      status: "success",
      message: "No orders found for this user",
      data: [],
    });
  }

  res.status(200).json({
    status: "success",
    results: orders.length,
    data: orders,
  });
});

/**
 * @desc    Update order to paid
 * @route   PUT /api/orders/:id/pay
 * @access  Private/Admin
 */
const updateOrderToPaid = asyncHandler(async (req, res, next) => {
  const { id } = req.params;

  const order = await orderModel.findById(id);
  if (!order) {
    return next(new ApiError("Order not found", 404));
  }

  order.isPaid = true;
  order.PaidAt = Date.now();

  await order.save();

  res.status(200).json({
    status: "success",
    message: "Order marked as paid",
    data: order,
  });
});

/**
 * @desc    Update order to delivered
 * @route   PUT /api/orders/:id/deliver
 * @access  Private/Admin
 */
const updateOrderToDelivered = asyncHandler(async (req, res, next) => {
  const { id } = req.params;

  const order = await orderModel.findById(id);
  if (!order) {
    return next(new ApiError("Order not found", 404));
  }

  order.isDelivered = true;
  order.deliveredAt = Date.now();

  await order.save();

  res.status(200).json({
    status: "success",
    message: "Order marked as delivered",
    data: order,
  });
});

/**
 * @desc    get checkout session from stripe and send it as response
 * @route   GET /api/orders/checkout_session/:cartId
 * @access  Private (user)
 */
const checkoutSession = asyncHandler(async (req, res, next) => {
  const { cartId } = req.params;
  const { shippingAddress } = req.body;

  const cart = await cartModel.findById(cartId);
  if (!cart) return next(new ApiError("Cart not found", 404));

  const session = await stripe.checkout.sessions.create({
    line_items: cart.items.map((item) => ({
      price_data: {
        currency: "egp",
        unit_amount: item.price * 100,
        product_data: { name: item.name },
      },
      quantity: item.quantity,
    })),
    mode: "payment",
     success_url: `${req.protocol}://${req.get('host')}/orders`,
        cancel_url: `${req.protocol}://${req.get('host')}/cart`,
    customer_email: req.user.email,
    client_reference_id: cartId,
    metadata: {
      userId: req.user._id.toString(),
      shippingAddress: JSON.stringify(shippingAddress),
    },
  });

  res.status(200).json({ message: "success", session });
});

const createCardOrder = async (session) => {
  const cartId = session.client_reference_id;
  const cart = await cartModel.findById(cartId);
  if (!cart) throw new Error("Cart not found");

  const orderPrice = session.amount_total / 100;

  const order = await orderModel.create({
    userId: session.metadata.userId,
    items: cart.items,
    shippingAddress: JSON.parse(session.metadata.shippingAddress),
    totals: {
      totalItems: cart.items.reduce((sum, i) => sum + i.quantity, 0),
      totalPrice: cart.totalPrice,
      discount: cart.discount || 0,
      couponCode: cart.couponCode || null,
      couponDiscount: cart.couponDiscount || 0,
      shippingFee: cart.shippingFee || 0,
      tips: cart.tips || 0,
      finalTotal: orderPrice,
    },
    paymentMethod: "card",
    isPaid: true,
    PaidAt: Date.now(),
  });

  // update stock
  const bulkUpdate = cart.items.map((item) => ({
    updateOne: {
      filter: { _id: item.productId },
      update: {
        $inc: {
          quantity: -item.quantity,
          sold: item.quantity,
        },
      },
    },
  }));
  await productModel.bulkWrite(bulkUpdate);

  await cartModel.findByIdAndDelete(cartId);

  return order;
};

const webhookCheckout = asyncHandler(async (req, res, next) => {
  const sig = req.headers["stripe-signature"];
  let event;

  try {
    event = stripe.webhooks.constructEvent(
      req.body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET
    );
  } catch (err) {
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  if (event.type === "checkout.session.completed") {
    await createCardOrder(event.data.object);
  }

  res.status(200).json({ received: true });
});

export {
  createCashOrder,
  getAllOrders,
  getSpecificOrder,
  getLoggedUserOrders,
  updateOrderToPaid,
  updateOrderToDelivered,
  checkoutSession,
  webhookCheckout,
};
