import mongoose from "mongoose";

const orderSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    items: [
      {
        productId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Product",
          required: true,
        },
        name: { type: String, required: true },
        price: { type: Number, required: true, min: 0 },
        quantity: { type: Number, required: true, min: 1 },
        image: { type: String, required: true },
      },
    ],
    shippingAddress: {
      address: { type: String, required: true },
      lat: { type: Number, default: null },
      lng: { type: Number, default: null },
    },
    totals: {
      totalItems: { type: Number, required: true },
      totalPrice: { type: Number, required: true },
      discount: { type: Number, default: 0 },
      couponCode: { type: String, default: null },
      couponDiscount: { type: Number, default: 0 },
      shippingFee: { type: Number, default: 0 },
      tips: { type: Number, default: 0 },
      finalTotal: { type: Number, required: true },
    },
    paymentMethod: {
      type: String,
      enum: ["cash", "card"],
      default: "cash",
    },
     status: {
      type: String,
      enum: ['pending','delivered', 'cancelled'],
      default: 'pending',
    },
    isPaid: {
      type: Boolean,
      default: false,
    },
    PaidAt: Date,
    isDelivered: {
      type: Boolean,
      default: false,
    },
    deliveredAt: Date,

  },
  { timestamps: true }
);

orderSchema.pre(/^find/, function (next) {
  this.populate("userId", "name number").populate("items.productId", "name price image");
  next();
});

export default mongoose.model("Order", orderSchema);
