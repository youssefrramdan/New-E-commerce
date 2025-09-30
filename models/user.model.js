import mongoose from "mongoose";
import bcrypt from "bcryptjs";

const userSchema = new mongoose.Schema(
  {
    firstName: {
      type: String,
      required: [true, "First name is required"],
      trim: true,
      minlength: [2, "First name must be at least 2 characters"],
      maxlength: [50, "First name cannot exceed 50 characters"],
    },
    lastName: {
      type: String,
      required: [true, "Last name is required"],
      trim: true,
      minlength: [2, "Last name must be at least 2 characters"],
      maxlength: [50, "Last name cannot exceed 50 characters"],
    },
    phone: {
      type: String,
      required: [true, "Phone number is required"],
      unique: true,
      trim: true,
      match: [
        /^(\+201|01|00201)[0-2,5]{1}[0-9]{8}$/,
        "Please provide a valid Egyptian phone number",
      ],
    },
    otp: {
      type: String,
      required: false,
    },
    // isVerified: {
    //   type: Boolean,
    //   default: false,
    // },
    role: {
      type: String,
      enum: ["user", "admin"],
      default: "user",
    },
    profileImage: {
      type: String,
    },
  },
  {
    timestamps: true,
  }
);

// step 1: generate OTP
userSchema.methods.generateOTP = function () {
  const otp = Math.floor(100000 + Math.random() * 900000).toString();
  this.otp = otp; // Store plain OTP, pre-save middleware will hash it
  return otp;
};

// step 2: compare OTP
userSchema.methods.compareOTP = async function (enteredOTP) {
  if (!this.otp) return false;
  return await bcrypt.compare(enteredOTP, this.otp);
};

// step 3: hash OTP if modified directly
userSchema.pre("save", async function (next) {
  if (!this.isModified("otp") || !this.otp) {
    return next();
  }
  this.otp = await bcrypt.hash(this.otp, 12);
  next();
});

export default mongoose.model("User", userSchema);
