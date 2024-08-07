//models/bookingModel.js

const mongoose = require("mongoose");

const bookingSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    podId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Product",
      required: true,
    },
    bookingPurpose: {
      type: String,
      required: true,
    },
    // amount: { type: String, required: true },
    // currency: {
    //   type: String,
    //   required: true,
    // },
    // Payment_id: {
    //   type: String,
    //   required: true,
    // },
    // merchantId: {
    //   type: String,
    //   required: true,
    // },
    // status: {
    //   type: String,
    //   required: true,
    // },
    bookingPurpose: {
      type: String,
      required: true,
    },
    description: {
      type: String,
    },
    bookingDate: {
      type: Date,
      require: true,
    },
    startTime: {
      type: Date,
      required: true,
    },
    endTime: {
      type: Date,
      required: true,
    },
    timeSlotNumber: {
      type: String,
      required: true,
    },
    qrCodeData: {
      type: String,
      required: true,
    },
    status: {
      type: String,
      enum: [
        "Pending",
        "Confirmed",
        "Cancelled",
        "Processing",
        "Completed",
        "Rated",
      ],
      default: "Pending",
    },
    isBookingActive: {
      type: Boolean,
      default: true,
    },
    feedback: {
      rating: { type: Number },
      message: { type: String },
    },

    // totalCost: {
    //   type: Number,
    //   required: true,
    // },
    // totalAfterDiscountCost: {
    //   type: Number,
    // },
  },
  {
    timestamps: true,
  }
);
// bookingSchema.index({ date: 1 }, { unique: true }); // Ensure unique bookings per date (optional)
module.exports = mongoose.model("Booking", bookingSchema);
