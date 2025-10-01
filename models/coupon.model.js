import mongoose, { Types } from "mongoose";


const CouponSchema = mongoose.Schema({
    code:{
        type: String,
        unique: true,
        trim: true,
        required: true,
    },
    expires: Date,
    discount: {
        type: Number,
        required: true,
    },
},{timestamps: true , versionKey: false})

export default mongoose.model('coupon', CouponSchema);