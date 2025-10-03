import dotenv from "dotenv";
import Stripe from "stripe";
import asyncHandler from "express-async-handler";
import ApiError from "../utils/apiError.js";
import cartModel from "../models/cart.model.js";
import productModel from "../models/product.model.js";
import orderModel from "../models/order.model.js";
import userModel from "../models/user.model.js";

dotenv.config({ path: "./config/config.env" });
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

// Award 10 points for every 100 EGP paid
const addPointsForOrder = async (userId, amountPaid) => {
  const pointsToAdd = Math.floor((amountPaid || 0) / 100) * 10;
  if (pointsToAdd <= 0) return;
  await userModel.findByIdAndUpdate(
    userId,
    { $inc: { points: pointsToAdd } },
    { new: true }
  );
};

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

  const order = await orderModel.create({
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

  // If paid (Stripe card payment flow completed in this endpoint), award points now
  if (order.isPaid) {
    await addPointsForOrder(userId, order.totals.finalTotal);
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

  // Award points when order is marked as paid (cash orders)
  await addPointsForOrder(order.userId, order.totals?.finalTotal || 0);

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

  // Calculate final total as in cart logic
  const totalPrice = cart.items.reduce(
    (sum, item) => sum + item.price * item.quantity,
    0
  );
  const discount =
    (cart.discount || 0) + (cart.couponDiscount || 0) + (cart.pointsUsed || 0);
  const shippingFee = cart.shippingFee || 0;
  const tips = cart.tips || 0;
  const finalTotal = Math.max(0, totalPrice - discount + shippingFee + tips);

  const session = await stripe.checkout.sessions.create({
    mode: "payment",
    line_items: [
      {
        price_data: {
          currency: "egp",
          unit_amount: Math.round(finalTotal * 100),
          product_data: { name: "Order total" },
        },
        quantity: 1,
      },
    ],
    success_url: `${req.protocol}://${req.get("host")}/api/v1/orders/card/success?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${req.protocol}://${req.get("host")}/cart`,
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

  // Award points for successful card payment
  await addPointsForOrder(session.metadata.userId, orderPrice);

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

// Fallback confirmation endpoint in case webhooks are not configured/reachable
const confirmCardPayment = asyncHandler(async (req, res, next) => {
  const { session_id: sessionId } = req.query;
  if (!sessionId) return next(new ApiError("Missing session_id", 400));

  const session = await stripe.checkout.sessions.retrieve(sessionId);
  if (!session || session.payment_status !== "paid") {
    return next(new ApiError("Payment not completed", 400));
  }

  try {
    await createCardOrder(session);
  } catch (err) {
    // If cart already deleted (webhook processed), consider it success
    if (String(err.message).includes("Cart not found")) {
      return res.status(200).json({ message: "success" });
    }
    return next(new ApiError("Failed to create order", 500));
  }

  res.status(200).json({ message: "success" });
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
  confirmCardPayment,
};
