import mongoose, { Types } from "mongoose";

const ProductSchema = mongoose.Schema(
    {
    name: {
        type: String,
        unique: [true, "name is required"],
        trim: true,
        required: true,
        minlength: [3, "too short product name"],
        maxLength: [200, "too long product name"],
    },
    slug: {
        type: String,
        lowercase: true,
        required: true,
    },
    description: {
        type: String,
        required: [true, "Product description is required"],
        minlength: [20, "Too short product description"],
    },
    quantity:{
        type: Number,
        required: [true, "Product quantity is required"],

    },
    sold: {
        type: Number,
        default: 0,

    },
    price: {
        type: Number,
        required: [true, "Product price is required"],
        trim: true,
        min: 0,
    },
    priceAfterDiscount: {
        type: Number,
    },
    image: {
        type: String,
        required: [true, "Product image is required"],
    },

    },
    { timestamps: true }
);


export default mongoose.model("Product", ProductSchema);
