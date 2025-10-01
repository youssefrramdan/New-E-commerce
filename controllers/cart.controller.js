/* eslint-disable radix */
/* eslint-disable import/no-extraneous-dependencies */
import asyncHandler from "express-async-handler";
import ApiError from "../utils/apiError.js";
import Cart from "../models/cart.model.js";
import UserModel from "../models/user.model.js";
import couponModel from "../models/coupon.model.js";
import productModel from "../models/product.model.js";

// Cart business logic - moved from schema to controller
const zones = {
  zone1: { minDistance: 0, maxDistance: 5, fee: 15 },
  zone2: { minDistance: 5, maxDistance: 10, fee: 25 },
  zone3: { minDistance: 10, maxDistance: 15, fee: 35 },
  zone4: { minDistance: 15, maxDistance: 25, fee: 50 },
};

const storeLocation = { lat: 30.0444, lng: 31.2357 };

// Helper function to calculate distance (Haversine formula)
function getDistance(lat1, lng1, lat2, lng2) {
  const R = 6371; // Earth radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

// Helper function to calculate shipping fee
function calculateShippingFee(lat, lng) {
  // If no location provided, no shipping fee
  if (lat == null || lng == null) {
    return 0;
  }

  // Calculate distance from store
  const distance = getDistance(storeLocation.lat, storeLocation.lng, lat, lng);

  // Find appropriate zone
  if (distance < 5) return zones.zone1.fee;
  if (distance < 10) return zones.zone2.fee;
  if (distance < 15) return zones.zone3.fee;
  return zones.zone4.fee; // For distances 15km and above
}

// Helper function to calculate cart totals
function calculateCartTotals(cart) {
  // Calculate basic totals
  cart.totalItems = cart.items.reduce(
    (total, item) => total + item.quantity,
    0
  );
  cart.totalPrice = cart.items.reduce(
    (total, item) => total + ( item.priceAfterDiscount || item.price ) * item.quantity,
    0
  );

  // Calculate shipping fee
  cart.shippingFee = calculateShippingFee(cart.location.lat, cart.location.lng);

  // Calculate total discount
  cart.discount = cart.pointsUsed + cart.couponDiscount;

  // Calculate final total
  cart.finalTotal = Math.max(
    0,
    cart.totalPrice - cart.discount + cart.tips + cart.shippingFee
  );

  return cart;
}

// Helper function to add item to cart
function addItemToCart(cart, productData) {
  const existingItem = cart.items.find(
    (item) => item.productId.toString() === productData.productId.toString()
  );

  if (existingItem) {
    existingItem.quantity += productData.quantity;
  } else {
    cart.items.push(productData);
  }

  return calculateCartTotals(cart);
}

// Helper function to update item quantity
function updateCartItemQuantity(cart, productId, newQuantity) {
  const item = cart.items.find(
    (cartItem) => cartItem.productId.toString() === productId.toString()
  );

  if (!item) return false;

  if (newQuantity <= 0) {
    // Remove item
    cart.items = cart.items.filter(
      (cartItem) => cartItem.productId.toString() !== productId.toString()
    );
  } else {
    // Update quantity
    item.quantity = newQuantity;
  }

  calculateCartTotals(cart);
  return true;
}

// Helper function to remove item from cart
function removeItemFromCart(cart, productId) {
  const initialLength = cart.items.length;
  cart.items = cart.items.filter(
    (cartItem) => cartItem.productId.toString() !== productId.toString()
  );

  if (cart.items.length < initialLength) {
    calculateCartTotals(cart);
    return true;
  }
  return false;
}

// Helper function to clear cart
function clearCartItems(cart) {
  // Clear all cart data
  Object.assign(cart, {
    items: [],
    totalItems: 0,
    totalPrice: 0,
    tips: 0,
    pointsUsed: 0,
    discount: 0,
    couponCode: null,
    couponDiscount: 0,
    shippingFee: 0,
    finalTotal: 0,
  });
  return cart;
}

// Helper function to add tips
function addTipsToCart(cart, tipsAmount) {
  cart.tips = Math.max(0, tipsAmount || 0);
  return calculateCartTotals(cart);
}

// Helper function to apply points
function applyPointsToCart(cart, pointsToUse) {
  if (pointsToUse <= 0) {
    cart.pointsUsed = 0;
  } else {
    // 1 point = 1 EGP discount
    const maxAllowedDiscount = cart.totalPrice - cart.couponDiscount;
    cart.pointsUsed = Math.min(pointsToUse, Math.max(0, maxAllowedDiscount));
  }

  return calculateCartTotals(cart);
}

// Helper function to apply coupon
function applyCouponToCart(cart, couponCode, discountPercentage) {
  if (cart.couponCode) {
    throw new Error("Coupon already applied");
  }

  cart.couponCode = couponCode;
  cart.couponDiscount = Math.floor(
    (cart.totalPrice * discountPercentage) / 100
  );

  return calculateCartTotals(cart);
}

// Helper function to remove coupon
function removeCouponFromCart(cart) {
  cart.couponCode = null;
  cart.couponDiscount = 0;
  return calculateCartTotals(cart);
}

// Helper function to update address
function updateCartAddress(cart, address, lat, lng) {
  if (address) cart.address = address;
  cart.location.lat = lat;
  cart.location.lng = lng;
  return calculateCartTotals(cart);
}

/**
 * @desc    Add product to cart
 * @route   POST /api/cart/add
 * @access  Private (JWT-based)
 */
const addToCart = asyncHandler(async (req, res, next) => {
  const { productId, quantity = 1 } = req.body;
  const userId = req.user._id;

  // Validate quantity
  const qty = parseInt(quantity);
  if (qty <= 0) {
    return next(new ApiError("Quantity must be greater than 0", 400));
  }

  // Get product details
  const product = await productModel.findById(productId);
  if (!product) {
    return next(new ApiError("Product not found", 404));
  }

  // Check stock availability
  if (product.stock && product.stock < qty) {
    return next(
      new ApiError(`Only ${product.stock} items available in stock`, 400)
    );
  }

  // Find or create cart for this user
  const cart = await Cart.findOrCreateCart(userId);

  // Check if item already exists in cart
  const existingItem = cart.items.find(
    (item) => item.productId.toString() === productId
  );

  if (existingItem) {
    // Check total quantity doesn't exceed stock
    const newQuantity = existingItem.quantity + qty;
    if (product.stock && newQuantity > product.stock) {
      return next(
        new ApiError(
          `Cannot add ${qty} more items. Only ${
            product.stock - existingItem.quantity
          } items available`,
          400
        )
      );
    }
  }

  // Add item to cart using helper function
  addItemToCart(cart, {
    productId: product._id,
    name: product.name,
    price: product.price,
    quantity: qty,
    image: product.image || "",
  });

  // Save cart to database
  await cart.save();

  res.status(200).json({
    message: "success",
    data: {
      cart: cart.items,
      totalItems: cart.totalItems,
      totalPrice: cart.totalPrice,
      tips: cart.tips,
      pointsUsed: cart.pointsUsed,
      discount: cart.discount,
      couponCode: cart.couponCode,
      couponDiscount: cart.couponDiscount,
      shippingFee: cart.shippingFee,
      finalTotal: cart.finalTotal,
      address: cart.address,
      location: cart.location,
    },
  });
});

/**
 * @desc    Get cart items
 * @route   GET /api/cart
 * @access  Private (JWT-based)
 */
const getCart = asyncHandler(async (req, res, next) => {
  const userId = req.user._id;

  // Find cart for this user
  const cart = await Cart.findOrCreateCart(userId);

  res.status(200).json({
    message: "success",
    data: {
      cart: cart.items,
      totalItems: cart.totalItems,
      totalPrice: cart.totalPrice,
      tips: cart.tips,
      pointsUsed: cart.pointsUsed,
      discount: cart.discount,
      couponCode: cart.couponCode,
      couponDiscount: cart.couponDiscount,
      shippingFee: cart.shippingFee,
      finalTotal: cart.finalTotal,
      address: cart.address,
      location: cart.location,
    },
  });
});

/**
 * @desc    Update cart item quantity
 * @route   PUT /api/cart/update
 * @access  Private (JWT-based)
 */
const updateCartItem = asyncHandler(async (req, res, next) => {
  const { productId, quantity } = req.body;
  const userId = req.user._id;
  const qty = parseInt(quantity);

  if (qty < 0) {
    return next(new ApiError("Quantity cannot be negative", 400));
  }

  // Find cart for this user
  const cart = await Cart.findOrCreateCart(userId);

  // Find item in cart
  const existingItem = cart.items.find(
    (item) => item.productId.toString() === productId
  );

  if (!existingItem) {
    return next(new ApiError("Item not found in cart", 404));
  }

  // If quantity is 0, remove item
  if (qty === 0) {
    removeItemFromCart(cart, productId);
  } else {
    // Check stock availability
    const product = await Product.findById(productId);
    if (product && product.stock && qty > product.stock) {
      return next(
        new ApiError(`Only ${product.stock} items available in stock`, 400)
      );
    }

    // Update quantity using helper function
    updateCartItemQuantity(cart, productId, qty);
  }

  // Save cart
  await cart.save();

  res.status(200).json({
    message: "success",
    data: {
      cart: cart.items,
      totalItems: cart.totalItems,
      totalPrice: cart.totalPrice,
      tips: cart.tips,
      pointsUsed: cart.pointsUsed,
      discount: cart.discount,
      couponCode: cart.couponCode,
      couponDiscount: cart.couponDiscount,
      shippingFee: cart.shippingFee,
      finalTotal: cart.finalTotal,
      address: cart.address,
      location: cart.location,
    },
  });
});

/**
 * @desc    Remove item from cart
 * @route   DELETE /api/cart/remove/:productId
 * @access  Private (JWT-based)
 */
const removeFromCart = asyncHandler(async (req, res, next) => {
  const { productId } = req.params;
  const userId = req.user._id;

  // Find cart for this user
  const cart = await Cart.findOrCreateCart(userId);

  // Remove item from cart using helper function
  const removed = removeItemFromCart(cart, productId);

  if (!removed) {
    return next(new ApiError("Item not found in cart", 404));
  }

  // Save cart
  await cart.save();

  res.status(200).json({
    message: "success",
    data: {
      cart: cart.items,
      totalItems: cart.totalItems,
      totalPrice: cart.totalPrice,
      tips: cart.tips,
      pointsUsed: cart.pointsUsed,
      discount: cart.discount,
      couponCode: cart.couponCode,
      couponDiscount: cart.couponDiscount,
      shippingFee: cart.shippingFee,
      finalTotal: cart.finalTotal,
      address: cart.address,
      location: cart.location,
    },
  });
});

/**
 * @desc    Clear entire cart
 * @route   DELETE /api/cart/clear
 * @access  Private (JWT-based)
 */
const clearCart = asyncHandler(async (req, res, next) => {
  const userId = req.user._id;

  // Find cart for this user
  const cart = await Cart.findOrCreateCart(userId);

  // Clear cart using helper function
  clearCartItems(cart);
  await cart.save();

  res.status(200).json({
    message: "success",
    data: {
      cart: [],
      totalItems: 0,
      totalPrice: 0,
      tips: 0,
      pointsUsed: 0,
      discount: 0,
      couponCode: null,
      couponDiscount: 0,
      shippingFee: 0,
      finalTotal: 0,
      address: cart.address,
      location: cart.location,
    },
  });
});

/**
 * @desc    Get cart count only (for nav bar)
 * @route   GET /api/cart/count
 * @access  Private (JWT-based)
 */
const getCartCount = asyncHandler(async (req, res, next) => {
  const userId = req.user._id;

  // Find cart for this user
  const cart = await Cart.findOrCreateCart(userId);

  res.status(200).json({
    message: "success",
    data: {
      totalItems: cart.totalItems,
    },
  });
});

/**
 * @desc    Add tips to cart and calculate final total
 * @route   POST /api/cart/tips
 * @access  Private (JWT-based)
 */
const addTips = asyncHandler(async (req, res, next) => {
  const { tips } = req.body;
  const userId = req.user._id;

  // Validate tips amount
  const tipsAmount = parseFloat(tips);
  if (Number.isNaN(tipsAmount) || tipsAmount < 0) {
    return next(
      new ApiError("Tips amount must be a valid positive number", 400)
    );
  }

  // Find cart for this user
  const cart = await Cart.findOrCreateCart(userId);

  // Add tips using helper function
  addTipsToCart(cart, tipsAmount);
  await cart.save();

  res.status(200).json({
    message: "success",
    data: {
      cart: cart.items,
      totalItems: cart.totalItems,
      totalPrice: cart.totalPrice,
      tips: cart.tips,
      pointsUsed: cart.pointsUsed,
      discount: cart.discount,
      couponCode: cart.couponCode,
      couponDiscount: cart.couponDiscount,
      shippingFee: cart.shippingFee,
      finalTotal: cart.finalTotal,
      address: cart.address,
      location: cart.location,
    },
  });
});

/**
 * @desc    Apply points for discount
 * @route   POST /api/cart/apply-points
 * @access  Private (JWT-based)
 */
const applyPoints = asyncHandler(async (req, res, next) => {
  const { points } = req.body;
  const userId = req.user._id;

  // Validate points amount
  const pointsToUse = parseInt(points);
  if (Number.isNaN(pointsToUse) || pointsToUse < 0) {
    return next(new ApiError("Points must be a valid positive number", 400));
  }

  // Get user to check available points
  const user = await UserModel.findById(userId);
  if (!user) {
    return next(new ApiError("User not found", 404));
  }

  // Check if user has enough points
  if (pointsToUse > user.points) {
    return next(
      new ApiError(`You only have ${user.points} points available`, 400)
    );
  }

  // Find cart for this user
  const cart = await Cart.findOrCreateCart(userId);

  // Check if cart is empty
  if (!cart || cart.totalPrice <= 0 || cart.items.length === 0) {
    return next(new ApiError("You cannot apply points to an empty cart", 400));
  }

  // Apply points using helper function
  applyPointsToCart(cart, pointsToUse);
  await cart.save();

  // Update user points (deduct used points)
  user.points -= cart.pointsUsed;
  await user.save();

  res.status(200).json({
    message: "success",
    data: {
      cart: cart.items,
      totalItems: cart.totalItems,
      totalPrice: cart.totalPrice,
      tips: cart.tips,
      pointsUsed: cart.pointsUsed,
      discount: cart.discount,
      shippingFee: cart.shippingFee,
      finalTotal: cart.finalTotal,
      address: cart.address,
      location: cart.location,
      remainingPoints: user.points,
    },
  });
});

/**
 * @desc    Update address and location
 * @route   PUT /api/cart/address
 * @access  Private (JWT-based)
 */
const updateAddress = asyncHandler(async (req, res, next) => {
  const userId = req.user._id;
  const { address, lat, lng } = req.body;

  // Find or create cart
  const cart = await Cart.findOrCreateCart(userId);

  // Update address and location using helper function
  updateCartAddress(cart, address, lat, lng);

  // Save cart
  await cart.save();

  res.status(200).json({
    message: "Address updated successfully",
    data: {
      cart: cart.items,
      totalItems: cart.totalItems,
      totalPrice: cart.totalPrice,
      tips: cart.tips,
      pointsUsed: cart.pointsUsed,
      discount: cart.discount,
      shippingFee: cart.shippingFee,
      finalTotal: cart.finalTotal,
      address: cart.address,
      location: cart.location,
    },
  });
});

/**
 * @desc    Remove points discount
 * @route   DELETE /api/cart/remove-points
 * @access  Private (JWT-based)
 */
const removePointsDiscount = asyncHandler(async (req, res, next) => {
  const userId = req.user._id;

  // Get user to restore points
  const user = await UserModel.findById(userId);
  if (!user) {
    return next(new ApiError("User not found", 404));
  }

  // Find cart for this user
  const cart = await Cart.findOrCreateCart(userId);

  // Restore points to user
  user.points += cart.pointsUsed;
  await user.save();

  // Remove points discount from cart
  cart.pointsUsed = 0;
  cart.discount = 0;
  calculateCartTotals(cart);
  await cart.save();

  res.status(200).json({
    message: "success",
    data: {
      cart: cart.items,
      totalItems: cart.totalItems,
      totalPrice: cart.totalPrice,
      tips: cart.tips,
      pointsUsed: cart.pointsUsed,
      discount: cart.discount,
      shippingFee: cart.shippingFee,
      finalTotal: cart.finalTotal,
      address: cart.address,
      location: cart.location,
      remainingPoints: user.points,
    },
  });
});

/**
 * @desc    Get user points
 * @route   GET /api/cart/points
 * @access  Private (JWT-based)
 */
const getUserPoints = asyncHandler(async (req, res, next) => {
  const userId = req.user._id;

  // Get user points
  const user = await UserModel.findById(userId);
  if (!user) {
    return next(new ApiError("User not found", 404));
  }

  res.status(200).json({
    message: "success",
    data: {
      points: user.points,
    },
  });
});

/**
 * @desc    Apply coupon on cart
 * @route   POST /api/cart/applyCoupon
 * @access  Private (JWT-based)
 */
const applyCoupon = asyncHandler(async (req, res, next) => {
  const { code } = req.body;

  // Find coupon
  const coupon = await couponModel.findOne({
    code: code,
    expires: { $gte: Date.now() },
  });
  if (!coupon) {
    return next(new ApiError("Opps, coupon invalid or expired", 404));
  }

  // Find cart
  const cart = await Cart.findOrCreateCart(req.user._id);
  if (!cart || cart.totalPrice <= 0) {
    return next(new ApiError("Your cart is empty", 400));
  }

  // Check if coupon is already applied
  if (cart.couponCode) {
    return next(new ApiError("Coupon already applied", 400));
  }

  try {
    // Apply coupon using helper function
    applyCouponToCart(cart, coupon.code, coupon.discount);
    await cart.save();

    res.status(200).json({
      message: "Coupon applied successfully",
      data: {
        cart: cart.items,
        totalItems: cart.totalItems,
        totalPrice: cart.totalPrice,
        tips: cart.tips,
        pointsUsed: cart.pointsUsed,
        discount: cart.discount,
        couponCode: cart.couponCode,
        couponDiscount: cart.couponDiscount,
        shippingFee: cart.shippingFee,
        finalTotal: cart.finalTotal,
        address: cart.address,
        location: cart.location,
      },
    });
  } catch (error) {
    return next(new ApiError(error.message, 400));
  }
});

/**
 * @desc    Remove coupon from cart
 * @route   DELETE /api/cart/removeCoupon
 * @access  Private (JWT-based)
 */
const removeCoupon = asyncHandler(async (req, res, next) => {
  const userId = req.user._id;

  // Find cart
  const cart = await Cart.findOrCreateCart(userId);
  if (!cart) {
    return next(new ApiError("Cart not found", 404));
  }

  // Check if coupon is applied
  if (!cart.couponCode) {
    return next(new ApiError("No coupon applied", 400));
  }

  // Remove coupon using helper function
  removeCouponFromCart(cart);
  await cart.save();

  res.status(200).json({
    message: "Coupon removed successfully",
    data: {
      cart: cart.items,
      totalItems: cart.totalItems,
      totalPrice: cart.totalPrice,
      tips: cart.tips,
      pointsUsed: cart.pointsUsed,
      discount: cart.discount,
      couponCode: cart.couponCode,
      couponDiscount: cart.couponDiscount,
      shippingFee: cart.shippingFee,
      finalTotal: cart.finalTotal,
      address: cart.address,
      location: cart.location,
    },
  });
});

export {
  addToCart,
  getCart,
  updateCartItem,
  removeFromCart,
  clearCart,
  getCartCount,
  addTips,
  applyPoints,
  removePointsDiscount,
  getUserPoints,
  updateAddress,
  applyCoupon,
  removeCoupon,
};
