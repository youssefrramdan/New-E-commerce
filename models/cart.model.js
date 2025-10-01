import mongoose from "mongoose";

// Cart schema - simplified to data-only structure
const cartSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "user",
      required: true,
      unique: true,
      index: true,
    },
    items: [
      {
        productId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Product",
          required: true,
        },
        name: {
          type: String,
          required: true,
        },
        price: {
          type: Number,
          required: true,
          min: 0,
        },
        quantity: {
          type: Number,
          required: true,
          min: 1,
          default: 1,
        },
        image: {
          type: String,
          required: true,
        },
      },
    ],
    totalItems: {
      type: Number,
      default: 0,
    },
    totalPrice: {
      type: Number,
      default: 0,
    },
    address: { type: String, default: "default" },
    location: {
      lat: { type: Number, default: null },
      lng: { type: Number, default: null },
    },
    shippingFee: { type: Number, default: 0 },
    tips: {
      type: Number,
      default: 0,
      min: 0,
    },
    pointsUsed: {
      type: Number,
      default: 0,
      min: 0,
    },
    discount: {
      type: Number,
      default: 0,
      min: 0,
    },
    couponCode: {
      type: String,
      default: null,
    },
    couponDiscount: {
      type: Number,
      default: 0,
      min: 0,
    },
    finalTotal: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
  }
);

// Only keep essential database-related static methods
cartSchema.statics.findOrCreateCart = async function (userId) {
  let cart = await this.findOne({ userId });

  if (!cart) {
    cart = new this({
      userId,
      items: [],
      totalItems: 0,
      totalPrice: 0,
      tips: 0,
      pointsUsed: 0,
      discount: 0,
      couponCode: null,
      couponDiscount: 0,
      finalTotal: 0,
    });
    await cart.save();
  }

  return cart;
};

export default mongoose.model("Cart", cartSchema);
