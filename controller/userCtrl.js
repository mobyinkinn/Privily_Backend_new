const User = require("../models/userModel");
const Booking = require("../models/bookingModel");
const asyncHandler = require("express-async-handler");
const { generateToken } = require("../config/jwtToken");
const validateMongoDbId = require("../utils/validateMongodbId");
const { generateRefreshToken } = require("../config/refreshtoken");
const crypto = require("crypto");
const jwt = require("jsonwebtoken");
const { sendEmail } = require("./emailCtrl");
const twilio = require("twilio");
const MobileUserModel = require("../models/mobileUserModel");
const ProductAvailability = require("../models/productAvailability");
const { START_TIME, END_TIME } = require("./constants");
const Corporate = require("../models/corporateModel");
// const moment = require("moment-timezone");
const moment = require("moment");
const productModel = require("../models/productModel");
const registerstaff = require("../models/registerstaff");
const bcrypt = require("bcryptjs");
const { register } = require("module");
const PDFDocument = require("pdfkit");
const twilioClient = twilio(
  process.env.TWILIO_ACCOUNT_SID,
  process.env.TWILIO_AUTH_TOKEN
);

// Create a User
// const createUser = asyncHandler(async (req, res) => {
//   const email = req.body.email;
//   const findUser = await User.findOne({ email: email });

//   if (!findUser) {
//     const newUser = await User.create(req.body);
//     res.json(newUser);
//   } else {
//     throw new Error("User Already Exists");
//   }
// });
const createUser = asyncHandler(async (req, res) => { 
  const { email, phoneNumber, firstname, lastname } = req.body;
  if (!email || !phoneNumber || !firstname || !lastname) {
    return res.status(400).send("All fields are required");
  }

  const existingUser = await User.findOne({ email });
  if (existingUser) {
    return res.status(400).send("User already exists");
  }

  try {
    const newUser = new User({
      email,
      phoneNumber,
      firstname,
      lastname,
      // password field is not included
    });
    await newUser.save();
    const token = generateToken(newUser._id);
    res.json({
      message: "User registered successfully",
      token,
      userId: newUser._id,
    });
  } catch (error) {
    console.error(error);
    res.status(500).send("Failed to register user");
  }
});

// const addRoles = asyncHandler(async (req, res) => {
//   const { id, role } = req.body;

//   if (!id || !Array.isArray(role)) {
//     return res.status(400).send("Invalid request body");
//   }

//   try {
//     // Find the user by ID and update the auth_page field
//     const user = await User.findById(id);

//     if (!user) {
//       return res.status(404).send("User not found");
//     }

//     // Add new roles to auth_page field
//     user.auth_page = role

//     // Save the updated user document
//     await user.save();

//     res.status(200).send("Roles added successfully");
//   } catch (error) {
//     res.status(500).send("Server error");
//   }
// });

// const addRoles = asyncHandler(async (req, res) => {
//   const { id, role } = req.body;

//   console.log("Request body:", req.body); // Log the request body
//   try {
//     validateMongoDbId(id); // Validate the ID before proceeding
//   } catch (error) {
//     console.error("Validation error:", error.message); // Log the validation error
//     return res.status(400).send(error.message);
//   }

//   if (!id || !Array.isArray(role)) {
//     return res.status(400).send("Invalid request body");
//   }

//   try {
//     // Find the user by ID and update the auth_page field
//     const user = await User.findById(id);
//     console.log("User found:", user); // Log the found user

//     if (!user) {
//       return res.status(404).send("User not found");
//     }

//     // Add new roles to auth_page field
//     user.auth_page = role;

//     // Save the updated user document
//     await user.save();

//     res.status(200).send("Roles added successfully");
//   } catch (error) {
//     console.error("Server error:", error); // Log the server error
//     res.status(500).send("Server error");
//   }
// });
//new..

const registerAndAssignRoles = asyncHandler(async (req, res) => {
  const { firstname, lastname, email, phoneNumber, password, role, auth_page } =
    req.body;

  // Validate input
  if (
    !firstname ||
    !lastname ||
    !email ||
    !phoneNumber ||
    !password ||
    !role ||
    !auth_page
  ) {
    return res.status(400).send("All fields are required");
  }

  // Check if user already exists
  const existingUser = await registerstaff.findOne({ email });
  if (existingUser) {
    return res.status(400).send("User with this email already exists");
  }

  // Create new staff member
  const staffMember = new registerstaff({
    firstname,
    lastname,
    email,
    phoneNumber,
    password,
    role,
    auth_page,
  });

  // Save the new staff member
  await staffMember.save();

  res
    .status(201)
    .send("Staff member registered and roles assigned successfully");
});

// Login a user
// const loginUserCtrl = asyncHandler(async (req, res) => {
//   const { email, password } = req.body;

//   // check if user exists or not
//   const findUser = await registerstaff.findOne({ email });
//   if (findUser && (await findUser.isPasswordMatched(password))) {
//     const refreshToken = await generateRefreshToken(findUser?._id);
//     await registerstaff.findByIdAndUpdate(findUser._id, { refreshToken });
//     res.cookie("refreshToken", refreshToken, {
//       httpOnly: true,
//       maxAge: 72 * 60 * 60 * 1000,
//     });
//     res.json({
//       _id: findStaff._id,
//       firstname: findStaff.firstname,
//       lastname: findStaff.lastname,
//       email: findStaff.email,
//       mobile: findStaff.mobile,
//       role: findStaff.role,
//       auth_page: findStaff.auth_page,
//       token: generateToken(findStaff._id),
//     });
//   } else {
//     throw new Error("Invalid Credentials");
//   }
// });
const loginUserCtrl = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  // Check if staff exists
  const findStaff = await registerstaff.findOne({ email });
  if (findStaff && (await findStaff.isPasswordMatched(password))) {
    const refreshToken = generateRefreshToken(findStaff._id);
    await registerstaff.findByIdAndUpdate(findStaff._id, { refreshToken });
    res.cookie("refreshToken", refreshToken, {
      httpOnly: true,
      maxAge: 72 * 60 * 60 * 1000, // 3 days
    });
    res.json({
      _id: findStaff._id,
      firstname: findStaff.firstname,
      lastname: findStaff.lastname,
      email: findStaff.email,
      phoneNumber: findStaff.phoneNumber,
      role: findStaff.role,
      auth_page: findStaff.auth_page,
      token: generateToken(findStaff._id),
    });
  } else {
    res.status(401).json({
      message: "Invalid email or password. Please try again.",
      status: 400,
    });
  }
});

// const loginMobileUserCtrl = asyncHandler(async (req, res) => {
//   const { phoneNumber, user } = req.body;

//   if (!phoneNumber || !user) {
//     return res.status(400).send("Phone number and user ID are required");
//   }

//   // Check if the user ID exists in the User collection
//   const userExists = await User.findById(user);
//   if (!userExists) {
//     return res.status(400).send("Invalid user ID");
//   }

//   const otp = Math.floor(100000 + Math.random() * 900000).toString();
//   const otpExpires = new Date(Date.now() + 10 * 60 * 1000); // OTP valid for 10 minutes

//   try {
//     let mobileUser = await MobileUserModel.findOne({ phoneNumber });
//     if (!mobileUser) {
//       mobileUser = new MobileUserModel({ phoneNumber, user });
//     } else {
//       mobileUser.user = user; // Ensure the user field is updated if it already exists
//     }

//     mobileUser.otp = otp;
//     mobileUser.otpExpires = otpExpires;
//     await mobileUser.save();

//     await twilioClient.messages.create({
//       body: `Your OTP is ${otp}`,
//       from: process.env.TWILIO_PHONE_NUMBER,
//       to: phoneNumber,
//     });

//     res.send("OTP sent successfully");
//   } catch (error) {
//     console.error(error);
//     res.status(500).send("Failed to send OTP");
//   }
// });
// const loginMobileUserCtrl = asyncHandler(async (req, res) => {
//   const { phoneNumber } = req.body;
//   if (!phoneNumber) {
//     return res.status(400).send("Phone number is required");
//   }

//   const otp = Math.floor(100000 + Math.random() * 900000).toString();
//   const otpExpires = new Date(Date.now() + 10 * 60 * 1000); // OTP valid for 10 minutes

//   try {
//     let mobileUser = await MobileUserModel.findOne({ phoneNumber });
//     if (!mobileUser) {
//       mobileUser = new MobileUserModel({ phoneNumber });
//     }

//     mobileUser.otp = otp;
//     mobileUser.otpExpires = otpExpires;
//     await mobileUser.save();

//     await twilioClient.messages.create({
//       body: `Your OTP is ${otp}`,
//       from: process.env.TWILIO_PHONE_NUMBER,
//       to: phoneNumber,
//     });

//     // res.send("OTP sent successfully");

//     const refreshToken = await generateRefreshToken(mobileUser?.user?._id);
//     const updateuser = await User.findByIdAndUpdate(
//       mobileUser?.user?.id,
//       {
//         refreshToken: refreshToken,
//       },
//       { new: true }
//     );
//     res.cookie("refreshToken", refreshToken, {
//       httpOnly: true,
//       maxAge: 72 * 60 * 60 * 1000,
//     });
//     res.json({token: generateToken(mobileUser?.user?._id)})
//   } catch (error) {
//     console.error(error);
//     res.status(500).send("Failed to send OTP");
//   }
// });
const loginMobileUserCtrl = asyncHandler(async (req, res) => {
  const { phoneNumber } = req.body;
  if (!phoneNumber) {
    return res.status(400).send("Phone number is required");
  }

  const otp = Math.floor(100000 + Math.random() * 900000).toString();
  const otpExpires = new Date(Date.now() + 10 * 60 * 1000); // OTP valid for 10 minutes

  try {
    let mobileUser = await MobileUserModel.findOne({ phoneNumber });
    if (!mobileUser) {
      mobileUser = new MobileUserModel({ phoneNumber });
    }

    mobileUser.otp = otp;
    mobileUser.otpExpires = otpExpires;
    await mobileUser.save();

    // await twilioClient.messages.create({
    //   body: `Your Privily App One Time password is ${otp}`,
    //   from: process.env.TWILIO_PHONE_NUMBER,
    //   to: phoneNumber,
    // });

    await twilioClient.messages.create({
      body: `Your Privily App One Time password is ${otp}\n\nPrivilyApp <#>\nAqYx/FD1LBD`,
      from: process.env.TWILIO_PHONE_NUMBER,
      to: phoneNumber,
    });


    res.send("OTP sent successfully");
  } catch (error) {
    console.error(error);
    res.status(500).send("Failed to send OTP");
  }
});

// admin login
const loginAdmin = asyncHandler(async (req, res) => {
  const { email, password } = req.body;
  const findAdmin = await User.findOne({ email });
  if (findAdmin.role !== "admin") throw new Error("Not Authorised");
  if (findAdmin && (await findAdmin.isPasswordMatched(password))) {
    const refreshToken = await generateRefreshToken(findAdmin?._id);
    await User.findByIdAndUpdate(findAdmin._id, { refreshToken });
    res.cookie("refreshToken", refreshToken, {
      httpOnly: true,
      maxAge: 72 * 60 * 60 * 1000,
    });
    res.json({
      _id: findAdmin?._id,
      firstname: findAdmin?.firstname,
      lastname: findAdmin?.lastname,
      email: findAdmin?.email,
      phoneNumber: findAdmin?.phoneNumber,
      token: generateToken(findAdmin?._id),
    });
  } else {
    throw new Error("Invalid Credentials");
  }
});

// const verifyMobileOtp = asyncHandler(async (req, res) => {
//   const { phoneNumber, otp } = req.body;
//   console.log(phoneNumber, otp, "otp")
//   if (!phoneNumber || !otp) {
//     return res.status(400).send("Phone number and OTP are required");
//   }

//   try {
//     const user = await MobileUserModel.findOne({ phoneNumber });
//     if (!user) {
//       return res.status(400).send("User not found");
//     }

//     if (user.otp !== otp || new Date() > user.otpExpires) {
//       return res.status(400).send("Invalid or expired OTP");
//     }

//     user.otp = null;
//     user.otpExpires = null;
//     await user.save();

//     res.send("OTP verified successfully");
//   } catch (error) {
//     console.error(error);
//     res.status(500).send("Failed to verify OTP");
//   }
// });
const verifyMobileOtp = asyncHandler(async (req, res) => {
  const { phoneNumber, otp } = req.body;
  if (!phoneNumber || !otp) {
    return res.status(400).send("Phone number and OTP are required");
  }

  try {
    const mobileUser = await MobileUserModel.findOne({ phoneNumber });
    if (!mobileUser) {
      return res.status(400).send("User not found");
    }

    if (mobileUser.otp !== otp || new Date() > mobileUser.otpExpires) {
      return res.status(400).send("Invalid or expired OTP");
    }

    mobileUser.otp = null;
    mobileUser.otpExpires = null;
    await mobileUser.save();

    const existingUser = await User.findOne({ phoneNumber: phoneNumber });
    console.log("existingUser");
    console.log(existingUser);
    if (existingUser) {
      if (existingUser.isBlocked) {
        return res.status(403).json({ message: "User is blocked" });
      }
      const token = generateToken(existingUser._id);
      res.json({
        message: "OTP verified successfully",
        status: 0,
        token,
        userId: existingUser._id,
      });
    } else {
      res.json({ message: "OTP verified successfully", status: 1 });
    }
  } catch (error) {
    console.error(error);
    res.status(500).send("Failed to verify OTP");
  }
});

const verifyAuthPage = asyncHandler(async (req, res) => {
  const { id, auth_page } = req.body;

  if (!id || auth_page === undefined) {
    return res.status(400).send("Invalid request body");
  }

  try {
    // Find the user by ID
    const user = await registerstaff.findById(id);

    if (!user) {
      return res.status(404).send("User not found");
    }

    // Check if the auth_page array contains the specified page number
    const success = user.auth_page.includes(auth_page);

    // Return true if the user has access, otherwise false
    res.status(200).json({ success });
  } catch (error) {
    res.status(500).send("Server error");
  }
});

// handle refresh token
const handleRefreshToken = asyncHandler(async (req, res) => {
  const cookie = req.cookies;
  if (!cookie?.refreshToken) throw new Error("No Refresh Token in Cookies");
  const refreshToken = cookie.refreshToken;
  const user = await User.findOne({ refreshToken });
  if (!user) throw new Error(" No Refresh token present in db or not matched");
  jwt.verify(refreshToken, process.env.JWT_SECRET, (err, decoded) => {
    if (err || user.id.toString() !== decoded.id) {
      throw new Error("There is something wrong with refresh token");
    }
    const accessToken = generateToken(user?._id);
    res.json({ accessToken });
  });
});

// logout functionality
const logout = asyncHandler(async (req, res) => {
  const cookie = req.cookies;
  if (!cookie?.refreshToken) throw new Error("No Refresh Token in Cookies");
  const refreshToken = cookie.refreshToken;
  const user = await User.findOne({ refreshToken });
  if (!user) {
    res.clearCookie("refreshToken", {
      httpOnly: true,
      secure: true,
    });
    return res.sendStatus(204);
  }
  await User.findOneAndUpdate(refreshToken, {
    refreshToken: "",
  });
  res.clearCookie("refreshToken", {
    httpOnly: true,
    secure: true,
  });
  res.json({ message: "Logged Out Successfully", status: 200 });
});

// Update a user
const updatedUser = asyncHandler(async (req, res) => {
  const { _id } = req.user;
  validateMongoDbId(_id);

  try {
    const updatedUser = await User.findByIdAndUpdate(
      _id,
      {
        firstname: req?.body?.firstname,
        lastname: req?.body?.lastname,
        email: req?.body?.email,
        phoneNumber: req?.body?.phoneNumber,
      },
      {
        new: true,
      }
    );
    res.json(updatedUser);
  } catch (error) {
    throw new Error(error);
  }
});

// save user Address
const saveAddress = asyncHandler(async (req, res, next) => {
  const { _id } = req.user;
  validateMongoDbId(_id);

  try {
    const updatedUser = await User.findByIdAndUpdate(
      _id,
      {
        address: req?.body?.address,
      },
      {
        new: true,
      }
    );
    res.json(updatedUser);
  } catch (error) {
    throw new Error(error);
  }
});

// save user current location and visited location history in user model for future use in location based services and products recommendation etc.
const setCurrentLocation = asyncHandler(async (req, res, next) => {
  const { _id } = req.user;
  validateMongoDbId(_id);
  try {
    const { lng, lat } = req.body;
    const updatedUser = await User.findByIdAndUpdate(
      _id,
      {
        userCurrentLocation: { lng: lng, lat: lat },
      },
      {
        new: true,
      }
    );
    const updatedVisitedLocations = [
      ...updatedUser.userVisitedLocation,
      { lng: lng, lat: lat },
    ];
    await User.findByIdAndUpdate(_id, {
      userVisitedLocation: updatedVisitedLocations,
    });

    res.json(updatedUser);
  } catch (error) {
    throw new Error(error);
  }
});

// Get all users
const getallUser = asyncHandler(async (req, res) => {
  try {
    const getUsers = await User.find();
    res.json(getUsers);
  } catch (error) {
    res.status(500).json({
      status: "fail",
      message: "An error occurred while fetching users.",
    });
  }
});
const getallstaff = asyncHandler(async (req, res) => {
  try {
    const getstaff = await registerstaff.find();
    res.json(getstaff);
  } catch (error) {
    res.status(500).json({
      status: "fail",
      message: "An error occurred while fetching users.",
    });
  }
});
const blockStaff = asyncHandler(async (req, res) => {
  const { id } = req.params;

  validateMongoDbId(id); // Make sure this function is correctly implemented

  try {
    const blockusr = await registerstaff.findByIdAndUpdate(
      id,
      { isBlocked: true },
      { new: true }
    );

    if (!blockusr) {
      return res.status(404).json({ message: "User not found" });
    }
    res.json({ message: "User blocked successfully" });
  } catch (error) {
    console.error("Error blocking user:", error); // Log the error
    res.status(500).json({ message: error.message });
  }
});
const unblockStaff = asyncHandler(async (req, res) => {
  const { id } = req.params;
  validateMongoDbId(id);
  try {
    const unblock = await registerstaff.findByIdAndUpdate(
      id,
      { isBlocked: false },
      { new: true }
    );
    if (!unblock) {
      return res.status(404).json({ message: "User not found" });
    }
    res.json({ message: "User unblocked successfully" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});
// const editStaff = asyncHandler(async (req, res) => {
//   const { id } = req.params;
//   const {
//     firstname,
//     lastname,
//     email,
//     mobile,
//     password,
//     role,
//     auth_page,
//     isBlocked,
//   } = req.body;

//   validateMongoDbId(id);

//   try {
//     const updatedData = {
//       firstname,
//       lastname,
//       email,
//       mobile,
//       role,
//       auth_page,
//       isBlocked,
//     };

//     // If password is provided, hash it before saving
//     if (password) {
//       const salt = await bcrypt.genSaltSync(10);
//       updatedData.password = await bcrypt.hash(password, salt);
//     }

//     const updatedStaff = await registerstaff.findByIdAndUpdate(
//       id,
//       updatedData,
//       {
//         new: true,
//         runValidators: true,
//       }
//     );

//     if (!updatedStaff) {
//       return res.status(404).json({ message: "Staff member not found" });
//     }

//     res.json({ message: "Staff member updated successfully", updatedStaff });
//   } catch (error) {
//     res.status(500).json({ message: error.message });
//   }
// });

const editStaff = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { firstname, lastname, email, phoneNumber, password, role, auth_page } =
    req.body;

  validateMongoDbId(id);

  try {
    const staffMember = await registerstaff.findById(id);
    if (!staffMember) {
      return res.status(404).json({ message: "Staff member not found" });
    }

    // Update fields
    staffMember.firstname = firstname || staffMember.firstname;
    staffMember.lastname = lastname || staffMember.lastname;
    staffMember.email = email || staffMember.email;
    staffMember.phoneNumber = phoneNumber || staffMember.phoneNumber;
    staffMember.role = role || staffMember.role;
    staffMember.auth_page = auth_page || staffMember.auth_page;

    // If password is provided, it will be hashed by the pre-save hook
    if (password) {
      staffMember.password = password;
    }

    await staffMember.save();

    res.json({ message: "Staff member updated successfully", staffMember });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

const deleteStaff = asyncHandler(async (req, res) => {
  const { id } = req.params;
  validateMongoDbId(id);
  try {
    const deleteaUser = await registerstaff.findByIdAndDelete(id);
    res.json({
      deleteaUser,
    });
  } catch (error) {
    throw new Error(error);
  }
});

// Get a single user
const getaUser = asyncHandler(async (req, res) => {
  const { id } = req.params;
  validateMongoDbId(id);
  try {
    const getaUser = await User.findById(id);
    res.json({
      getaUser,
    });
  } catch (error) {
    throw new Error(error);
  }
});

// Delete a single user
const deleteaUser = asyncHandler(async (req, res) => {
  const { id } = req.params;
  validateMongoDbId(id);
  try {
    const deleteaUser = await User.findByIdAndDelete(id);
    res.json({
      deleteaUser,
    });
  } catch (error) {
    throw new Error(error);
  }
});
const getUserByID = asyncHandler(async (req, res) => {
  try {
    const UserId = req.params.id;
    const user = await User.findById(UserId);

    if (!user) {
      return res.status(404).json({ message: "user not found" });
    }

    res.json(user);
  } catch (error) {
    console.error("Error fetching user:", error);
    res.status(500).json({ message: "Server error" });
  }
});

//block a user
// const blockUser = asyncHandler(async (req, res) => {
//   const { id } = req.params;
//   validateMongoDbId(id);
//   try {
//     const blockusr = await User.findByIdAndUpdate(
//       id,
//       { isBlocked: true },
//       { new: true }
//     );
//     if (!blockusr) {
//       return res.status(404).json({ message: "User not found" });
//     }
//     res.json({ message: "User blocked successfully" });
//   } catch (error) {
//     res.status(500).json({ message: error.message });
//   }
// });
const blockUser = asyncHandler(async (req, res) => {
  const { id } = req.params;

  validateMongoDbId(id); // Make sure this function is correctly implemented

  try {
    const blockusr = await User.findByIdAndUpdate(
      id,
      { isBlocked: true },
      { new: true }
    );

    if (!blockusr) {
      return res.status(404).json({ message: "User not found" });
    }
    res.json({ message: "User blocked successfully" });
  } catch (error) {
    console.error("Error blocking user:", error); // Log the error
    res.status(500).json({ message: error.message });
  }
});

const unblockUser = asyncHandler(async (req, res) => {
  const { id } = req.params;
  validateMongoDbId(id);
  try {
    const unblock = await User.findByIdAndUpdate(
      id,
      { isBlocked: false },
      { new: true }
    );
    if (!unblock) {
      return res.status(404).json({ message: "User not found" });
    }
    res.json({ message: "User unblocked successfully" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// update password after login
const updatePassword = asyncHandler(async (req, res) => {
  const { _id } = req.user;
  const { password } = req.body;
  validateMongoDbId(_id);
  const user = await User.findById(_id);
  if (password) {
    user.password = password;
    const updatedPassword = await user.save();
    res.json(updatedPassword);
  } else {
    res.json(user);
  }
});

// forgotPassword using token generation and sending email
const forgotPasswordToken = asyncHandler(async (req, res) => {
  const { email } = req.body;
  const user = await User.findOne({ email });
  if (!user) throw new Error("User not found with this email");
  try {
    const token = await user.createPasswordResetToken();
    await user.save();
    const resetURL = `Hi, Please follow this link to reset Your Password. This link is valid till 10 minutes from now. <a href='http://localhost:5000/api/user/reset-password/${token}'>Click Here</>`;
    const data = {
      to: email,
      subject: "Forgot Password Link",
      html: resetURL,
    };
    sendEmail(data.to, data.subject, data.html);
    res.json({ message: "Email sent successfully", token: token });
  } catch (error) {
    throw new Error(error);
  }
});

// reset password after forgot password token generation and email sending to user
const resetPassword = asyncHandler(async (req, res) => {
  const { password } = req.body;
  const { token } = req.params;
  const hashedToken = crypto.createHash("sha256").update(token).digest("hex");
  const user = await User.findOne({
    passwordResetToken: hashedToken,
    passwordResetExpires: { $gt: Date.now() },
  });
  if (!user) throw new Error(" Token Expired, Please try again later");
  user.password = password;
  user.passwordResetToken = undefined;
  user.passwordResetExpires = undefined;
  await user.save();
  res.json(user);
});

//get data of logged user
const getMe = async (req, res) => {
  res.json(req.user);
};

//Get data for corporate pods
const corporatePods = asyncHandler(async (req, res) => {
  const { companyName, email, phoneNumber } = req.body;

  const corporate = new Corporate({
    companyName,
    email,
    phoneNumber,
  });

  // Save the data to the database
  const savedData = await corporate.save();

  res.status(201).json({
    message: "Thanks for your Query",
    corporate: {
      _id: savedData._id,
      companyName: savedData.companyName,
      email: savedData.email,
      phoneNumber: savedData.phoneNumber,
    },
  });
});

// Apply Coupon on booking total amount
// const applyCoupon = asyncHandler(async (req, res) => {
//   const { coupon } = req.body;
//   const { _id } = req.user;
//   validateMongoDbId(_id);

//   const booking = await Booking.findOne({ _id });
//   if (!booking) {
//     throw new Error("Booking not found");
//   }
//   const validCoupon = await Coupon.findOne({ name: coupon });
//   if (!validCoupon) {
//     throw new Error("Invalid Coupon");
//   }
//   let { total } = booking;
//   const totalAfterDiscount = total - (total * validCoupon.discount) / 100;
//   booking.totalAfterDiscount = totalAfterDiscount;
//   await booking.save();

//   res.json({ totalAfterDiscount });
// });

// _______________________________________________________________________________________________

// Create availability
// start_time = 6 // 6 am
// end_time = 24 // till EOD
// indexes = (24-6)*60/15
// data = {
//   "product_id": id,
//   "slot_bookings": Array.from({ length: indexes }, () => false),
//   "available_slot":[]
// }
// ProductAvailability.create(data);

// Function to get slot index from time
function get_slot_index_from_time(time_obj, start_time) {
  console.log("Time object: ", time_obj);
  const hours = time_obj.getUTCHours();
  const minutes = time_obj.getUTCMinutes();
  console.log("time: ", hours, minutes);
  console.log("Index: ", (hours - start_time) * 4 + Math.floor(minutes / 15));
  return (hours - start_time) * 4 + Math.floor(minutes / 15);
}

// Create a booking for a user with podId, timeSlot and status as pending by default
// const createBooking = asyncHandler(async (req, res) => {
//   const { _id } = req.user;
//   const { podId } = req.params;
//   validateMongoDbId(_id);
//   validateMongoDbId(podId);
//   try {
//     const { bookingDate, startTime, endTime, timeSlotNumber, bookingPurpose, description } = req.body;

//     const user = await User.findById(_id);
//     if (!user) {
//       return res.status(404).json({ message: "User not found" });
//     }

//     // Convert bookingDate, startTime, and endTime to Date objects in IST

//     // Check for overlapping bookings
//     const existingBooking = await Booking.findOne({
//       podId,
//       status: { $ne: 'Cancelled' },
//       $or: [
//         {
//           $and: [
//             { startTime: { $lte: startTimeObj } },
//             { endTime: { $gte: endTimeObj } },
//           ],
//         }, // Check if new booking starts during existing booking
//         {
//           $and: [
//             { startTime: { $lte: endTimeObj } },
//             { endTime: { $gte: endTimeObj } },
//           ],
//         }, // Check if new booking ends during existing booking
//         {
//           $and: [
//             { startTime: { $gte: startTimeObj } },
//             { endTime: { $lte: endTimeObj } },
//           ],
//         }, // Check if new booking is completely within existing booking
//       ],
//     });
//     if (existingBooking) {
//       return res.status(400).json({ message: "Booking with the same date and time already exists" });
//     }

//     // Generate QR Code Data String
//     const startTimeStamp = Math.floor(startTimeObj.getTime() / 1000);
//     const endTimeStamp = Math.floor(endTimeObj.getTime() / 1000);

//     // // Calculate IST Unix timestamps by adding the offset (19800 seconds)
//     // const IST_OFFSET_SECONDS = 19800; // 5 hours and 30 minutes in seconds
//     // const startTimeIST = startTimeStamp + IST_OFFSET_SECONDS;
//     // const endTimeIST = endTimeStamp + IST_OFFSET_SECONDS;
//     const qrCodeDataString = `F2/${process.env.DEVICE_ID}/${process.env.USER_ID}/0/${endTimeStamp}/${startTimeStamp}`;

//     // Create new booking
//     const newBooking = await Booking.create({
//       user: user._id,
//       podId,
//       bookingDate: bookingDateObj,
//       startTime: startTimeObj,
//       endTime: endTimeObj,
//       timeSlotNumber,
//       bookingPurpose,
//       description: description || null ,
//       status: "Pending",
//       qrCodeData: qrCodeDataString,
//       feedback: {
//         message:null,
//         rating: null,
//       }
//     });

//     user.booking.push(newBooking._id);
//     await user.save();

//     // Create or update product availability entry
//     const productAvailability = await ProductAvailability.findOne({
//       product_id: podId,
//       booking_date: {
//         $gte: new Date(bookingDateObj.getFullYear(), bookingDateObj.getMonth(), bookingDateObj.getDate()),
//         $lt: new Date(bookingDateObj.getFullYear(), bookingDateObj.getMonth(), bookingDateObj.getDate() + 1)
//       }
//     });

//     if (productAvailability) {
//       // Update slot bookings
//       let updatedSlotBookings = productAvailability.slot_bookings;
//       const startingIndex = get_slot_index_from_time(startTimeObj, START_TIME);
//       const endingIndex = get_slot_index_from_time(endTimeObj, START_TIME);
//       for (let i = startingIndex; i < endingIndex; i++) {
//         updatedSlotBookings[i] = true;
//       }

//       await ProductAvailability.findOneAndUpdate({_id:productAvailability._id}, {slot_bookings: updatedSlotBookings}, { new: true });
//     } else {
//       // Create new product availability entry
//       const indexes = (END_TIME - START_TIME) * 4;
//       const slotBookings = Array.from({ length: indexes }, () => false);
//       const startingIndex = get_slot_index_from_time(startTimeObj, START_TIME);
//       const endingIndex = get_slot_index_from_time(endTimeObj, START_TIME);

//       for (let i = startingIndex; i < endingIndex; i++) {
//         slotBookings[i] = true;
//       }

//       const data = {
//         product_id: podId,
//         slot_bookings: slotBookings,
//         booking_date: bookingDateObj,
//       };
//       await ProductAvailability.create(data);
//     }

//     // Convert the new booking times to IST for the response
//     const responseBooking = {
//       ...newBooking._doc,
//     };

//     sendNotificationOnBooking(user, newBooking);
//     res.status(201).json({ message: "Booking created successfully", booking: responseBooking });
//   } catch (error) {
//     console.error(error);
//     res.status(500).json({ message: "Internal server error" });
//   }
// });
const createBooking = asyncHandler(async (req, res) => {
  const { _id } = req.user;
  const { podId } = req.params;
  validateMongoDbId(_id);
  validateMongoDbId(podId);
  try {
    const {
      bookingDate,
      startTime,
      endTime,
      timeSlotNumber,
      bookingPurpose,
      shortDescription,
      status,
    } = req.body;

    console.log("Booking creation started:", req.body);

    const user = await User.findById(_id);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const pod = await productModel.findById(podId);
    if (!pod) {
      return res.status(404).json({ message: "Pod not found" });
    }
    console.log("pod", pod);
    const podstitle = pod.title; // Retrieve the pod title
    const deviceId = pod.deviceId;
    const UserID = pod.UserId;
    const serial = pod.serial;
    const password = pod.password;
const hostemail= pod.email
    // const bookingDateObj = moment.tz(bookingDate, "Africa/Johannesburg").toDate();
    // const startTimeObj = moment.tz(startTime, "Africa/Johannesburg").toDate();
    // const endTimeObj = moment.tz(endTime, "Africa/Johannesburg").toDate();
    const bookingDateObj = moment(bookingDate).toDate();
    const startTimeObj = moment(startTime).toDate();
    const endTimeObj = moment(endTime).toDate();
    console.log("startTimeObj:", startTimeObj);
    console.log("endTimeObj:", endTimeObj);
    console.log("bookingDateObj:", bookingDateObj);

    console.log("START_TIME:", START_TIME);

    const existingBooking = await Booking.findOne({
      podId,
      status: { $ne: "Cancelled" },
      $or: [
        {
          $and: [
            { startTime: { $lte: startTimeObj } },
            { endTime: { $gte: endTimeObj } },
          ],
        },
        {
          $and: [
            { startTime: { $lte: endTimeObj } },
            { endTime: { $gte: endTimeObj } },
          ],
        },
        {
          $and: [
            { startTime: { $gte: startTimeObj } },
            { endTime: { $lte: endTimeObj } },
          ],
        },
      ],
    });

    if (existingBooking) {
      console.log("Duplicate booking detected:", existingBooking);
      return res.status(400).json({
        message: "Booking with the same date and time already exists",
      });
    }

    const startTimeStamp = Math.floor(startTimeObj.getTime() / 1000);
    const endTimeStamp = Math.floor(endTimeObj.getTime() / 1000);
    const qrCodeDataString = `F2/${deviceId}/${UserID}/0/${endTimeStamp}/${startTimeStamp}`;

    const newBooking = await Booking.create({
      user: user._id,
      podId,
      // podTitle:podTitle,
      podTitle:podstitle,
      serial: serial,
      password: password,
      Userid: UserID,
      bookingDate: bookingDateObj,
      startTime: startTimeObj,
      endTime: endTimeObj,
      timeSlotNumber,
      bookingPurpose,
      shortDescription: shortDescription || null,
      status: status,
      qrCodeData: qrCodeDataString,
      feedback: {
        message: null,
        rating: null,
      },
    });

    user.booking.push(newBooking._id);
    await user.save();

    const productAvailability = await ProductAvailability.findOne({
      product_id: podId,
      booking_date: {
        $gte: new Date(
          bookingDateObj.getFullYear(),
          bookingDateObj.getMonth(),
          bookingDateObj.getDate()
        ),
        $lt: new Date(
          bookingDateObj.getFullYear(),
          bookingDateObj.getMonth(),
          bookingDateObj.getDate() + 1
        ),
      },
    });

    console.log("Product availablity backend", productAvailability);

    if (productAvailability) {
      // console.log("times: ", startTimeObj, endTimeObj);
      let updatedSlotBookings = productAvailability.slot_bookings;
      const startingIndex = get_slot_index_from_time(startTimeObj, START_TIME);
      const endingIndex = get_slot_index_from_time(endTimeObj, START_TIME);
      console.log("Indices: ", startingIndex, endingIndex);
      for (let i = startingIndex; i < endingIndex; i++) {
        updatedSlotBookings[i] = true;
        console.log(`Slot ${i} marked as true`);
      }
      console.log(
        "Starting index:",
        startingIndex,
        "Ending index:",
        endingIndex
      );
      console.log("Before update:", updatedSlotBookings);

      const newAvailablity = await ProductAvailability.findOneAndUpdate(
        { _id: productAvailability._id },
        { slot_bookings: updatedSlotBookings },
        { new: true }
      );
      console.log("hg", newAvailablity);
    } else {
      const indexes = (END_TIME - START_TIME) * 4;
      const slotBookings = Array.from({ length: indexes }, () => false);
      const startingIndex = get_slot_index_from_time(startTimeObj, START_TIME);
      const endingIndex = get_slot_index_from_time(endTimeObj, START_TIME);
      for (let i = startingIndex; i < endingIndex; i++) {
        slotBookings[i] = true;
      }
      const data = {
        product_id: podId,
        slot_bookings: slotBookings,
        booking_date: bookingDateObj,
      };
      await ProductAvailability.create(data);
    }

    // const responseBooking = {
    //   ...newBooking._doc,
    //   bookingDate: moment(newBooking.bookingDate)
    //     // .tz("Africa/Johannesburg")
    //     .format(),
    //   startTime: moment(newBooking.startTime)
    //     // .tz("Africa/Johannesburg")
    //     .format(),
    //   endTime: moment(newBooking.endTime).format(),
    // };

    sendNotificationOnBooking(user, newBooking);
    sendNotificationOnHost(user, newBooking, hostemail);
    console.log("Booking created successfully:", newBooking._id);
    res.status(201).json({
      message: "Booking created successfully",
      booking: {
        ...newBooking.toObject(),
      },
    });
  } catch (error) {
    console.error("Error creating booking:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

const sendNotificationOnBooking = asyncHandler(
  async (user = null, booking, userId = null) => {
   console.log("bookingimp", booking)
    try {
      if (!user && !userId) {
        throw new Error("Any one of User or UserId is required");
      }
      if (!user) {
        user = await User.findById(userId);
      }
      if (!user) throw new Error("User not found");

      booking = booking.populate("podId");
      if (!booking) throw new Error("Booking not found");

      // Format booking date and times
      const formattedBookingDate = booking.bookingDate.toDateString();
      const formattedStartTime = moment(booking.startTime)
        // .tz("Africa/Johannesburg")
        .format("hh:mm A");
      const formattedEndTime = moment(booking.endTime)
        // .tz("Africa/Johannesburg")
        .format("hh:mm A");

      // Construct email content
      const emailContent = `
      <p>Hi ${user.firstname},</p>
      <p>Your booking details:</p>
      <ul>
        <li><strong>Booking ID:</strong> ${booking._id}</li>
        <li><strong>Booking Date:</strong> ${formattedBookingDate}</li>
        <li><strong>Start Time:</strong> ${formattedStartTime}</li>
        <li><strong>End Time:</strong> ${formattedEndTime}</li>
        <li><strong>Pod ID:</strong> ${booking.podId}</li>
        <li><strong>Pod Title:</strong> ${booking.podTitle}</li>
      </ul>
      <p>Thank you for booking with us!</p>
    `;

      // Send email
      const data = {
        to: user.email,
        subject: "Booking Notification",
        html: emailContent,
      };
      await sendEmail(data.to, data.subject, data.html);
      console.log("Email sent successfully.");
    } catch (error) {
      console.error("Error sending notification:", error.message);
      throw new Error("Failed to send notification");
    }
  }
);

const sendNotificationOnHost = asyncHandler(
  async (user = null, booking, hostemail) => {
    try {
      booking = booking.populate("podId");
      if (!booking) throw new Error("Booking not found");

      // Format booking date and times
      const formattedBookingDate = booking.bookingDate.toDateString();
      const formattedStartTime = moment(booking.startTime)
        // .tz("Africa/Johannesburg")
        .format("hh:mm A");
      const formattedEndTime = moment(booking.endTime)
        // .tz("Africa/Johannesburg")
        .format("hh:mm A");

      // Construct email content
      const emailContent = `
      <p>This booking is for ${user.firstname},</p>
      <p>His booking details are:</p>
      <ul>
        <li><strong>Booking ID:</strong> ${booking._id}</li>
        <li><strong>Booking Date:</strong> ${formattedBookingDate}</li>
        <li><strong>Start Time:</strong> ${formattedStartTime}</li>
        <li><strong>End Time:</strong> ${formattedEndTime}</li>
        <li><strong>Pod ID:</strong> ${booking.podId}</li>
        <li><strong>Pod ID:</strong> ${booking.podTitle}</li>
      </ul>
      <p>Thank you for booking with us!</p>
    `;

      // Send email
      const data = {
        to: hostemail,
        subject: "Booking Notification",
        html: emailContent,
      };
      await sendEmail(data.to, data.subject, data.html);
      console.log("Email sent successfully.");
    } catch (error) {
      console.error("Error sending notification:", error.message);
      throw new Error("Failed to send notification");
    }
  }
);
//extend booking time
const extendBooking = asyncHandler(async (req, res) => {
  const { bookingId } = req.params;
  const { extensionMinutes } = req.body; // Expecting the requested extension time in minutes

  validateMongoDbId(bookingId);

  try {
    const booking = await Booking.findById(bookingId);
    if (!booking) {
      return res.status(404).json({ message: "Booking not found" });
    }

    const podId = booking.podId;
    const endTimeObj = new Date(booking.endTime);

    // Fetch ProductAvailability for the given date
    const bookingDateObj = new Date(booking.bookingDate);
    let productAvailability = await ProductAvailability.findOne({
      product_id: podId,
      booking_date: {
        $gte: new Date(
          bookingDateObj.getFullYear(),
          bookingDateObj.getMonth(),
          bookingDateObj.getDate()
        ),
        $lt: new Date(
          bookingDateObj.getFullYear(),
          bookingDateObj.getMonth(),
          bookingDateObj.getDate() + 1
        ),
      },
    });

    if (!productAvailability) {
      const indexes = (END_TIME - START_TIME) * 4;
      const slotBookings = Array.from({ length: indexes }, () => false);
      productAvailability = new ProductAvailability({
        product_id: podId,
        slot_bookings: slotBookings,
        booking_date: bookingDateObj,
      });
      await productAvailability.save();
    }

    // Calculate the new end time
    const newEndTimeObj = new Date(
      endTimeObj.getTime() + extensionMinutes * 60000
    );
    const currentEndingIndex = get_slot_index_from_time(endTimeObj, START_TIME);
    const newEndingIndex = get_slot_index_from_time(newEndTimeObj, START_TIME);

    // Update slot bookings in ProductAvailability
    const slotBookings = productAvailability.slot_bookings;
    for (let i = currentEndingIndex; i < newEndingIndex; i++) {
      if (slotBookings[i]) {
        return res.status(400).json({
          message: "Slot not available for the requested extension time.",
        });
      }
      slotBookings[i] = true;
    }

    await ProductAvailability.findOneAndUpdate(
      { _id: productAvailability._id },
      { slot_bookings: slotBookings },
      { new: true }
    );

    // Update booking endTime
    booking.endTime = newEndTimeObj;
    booking.qrCodeData = `F2/33346/629039/0/${Math.floor(
      newEndTimeObj.getTime() / 1000
    )}/${Math.floor(new Date(booking.startTime).getTime() / 1000)}`;
    await booking.save();

    // Convert the updated booking times to IST for the response
    const responseBooking = {
      ...booking._doc,
      bookingDate: moment(booking.bookingDate).format(),
      startTime: moment(booking.startTime).format(),
      endTime: moment(booking.endTime).format(),
    };

    return res.status(200).json({
      message: "Booking extended successfully",
      booking: responseBooking,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Internal server error" });
  }
});

// get all bookings for a user
// const getBookingsByUser = asyncHandler(async (req, res) => {
//   const { _id } = req.user;
//   validateMongoDbId(_id);
//   try {
//     const user = await User.findById(_id).populate("booking");
//     if (!user) {
//       return res.status(404).json({ message: "User not found" });
//     }
//     const bookings = user.booking;
//     res.json(bookings);
//   } catch (error) {
//     console.error("Error fetching bookings by user:", error); // Log the error for debugging
//     res.status(500).json({
//       status: "fail",
//       message: "An error occurred while fetching bookings by user.",
//     });
//   }
// });
const getBookingsByUser = asyncHandler(async (req, res) => {
  const { _id } = req.user;
  validateMongoDbId(_id);
  try {
    // Call updateBookingStatusAutomatically function
    await updateBookingStatusAutomatically(req, res, async () => {});

    const user = await User.findById(_id).populate("booking");
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    const bookings = user.booking;
    console.log("bookings", bookings);
    res.json(bookings);
  } catch (error) {
    console.error("Error fetching bookings by user:", error); // Log the error for debugging
    res.status(500).json({
      status: "fail",
      message: "An error occurred while fetching bookings by user.",
    });
  }
});

// Get all bookings for admin to manage and update status of booking as per the status
// const getBookings = asyncHandler(async (req, res) => {
//   try {
//     const allBookings = await Booking.find();
//     res.json(allBookings);
//   } catch (error) {
//     throw new Error(error);
//   }
// });

const getBookings = asyncHandler(async (req, res) => {
  try {
    // Call updateBookingStatusAutomatically function
    await updateBookingStatusAutomatically(req, res, async () => {});

    const allBookings = await Booking.find();
    res.json(allBookings);
  } catch (error) {
    throw new Error(error);
  }
});

// Get a booking by ID for admin to manage and update status of booking as per the status
const getBookingById = asyncHandler(async (req, res) => {
  const { id } = req.params;
  validateMongoDbId(id);
  try {
    const booking = await Booking.findById(id).populate("user").exec();
    res.json(booking);
  } catch (error) {
    throw new Error(error);
  }
});
// Add this in your booking controller file:


// const generateInvoicePdfBuffer = (booking, user) => {
//   return new Promise((resolve, reject) => {
//     const doc = new PDFDocument();
//     const buffers = [];

//     doc.on("data", buffers.push.bind(buffers));
//     doc.on("end", () => {
//       const pdfData = Buffer.concat(buffers);
//       resolve(pdfData);
//     });

//     // Compose PDF content
//     doc.fontSize(20).text("Invoice for your Booking", { align: "center" });
//     doc.moveDown();

//     doc.fontSize(14).text(`Booking ID: ${booking._id}`);
//     doc.text(`Name: ${user.firstname} ${user.lastname}`);
//     doc.text(`Email: ${user.email}`);
//     doc.text(`Booking Date: ${booking.bookingDate.toDateString()}`);
//     doc.text(`Start Time: ${booking.startTime.toLocaleTimeString()}`);
//     doc.text(`End Time: ${booking.endTime.toLocaleTimeString()}`);
//     doc.text(`Purpose: ${booking.bookingPurpose || "N/A"}`);

//     // Add more invoice details like price, taxes, total etc.
//     doc.moveDown();
//     doc.text(`Total Amount: ZAR XXXX`); // You can calculate or fetch this from booking/payment info

//     doc.end();
//   });
// };


const generateInvoicePdfBuffer = (booking, user) => {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 50 });
    const buffers = [];

    doc.on("data", buffers.push.bind(buffers));
    doc.on("end", () => {
      const pdfData = Buffer.concat(buffers);
      resolve(pdfData);
    });

    // COMPANY HEADER
    doc.fontSize(16).text("Privily (Pty) Ltd", { align: "left" });
    doc.fontSize(10).text("Reg. No.: 2023/832609/07");
    doc.text("9 Mt. Orville, Midlands Estate, Midstream");
    doc.text("Vat No.: 4890315445");
    doc.text("Ph: (+27) 082 4412152 / (+27) 083 212 8647");
    doc.moveDown();

    // INVOICE METADATA
    doc.fontSize(14).text(`Tax Invoice # ${booking.invoiceNumber || "XXXX"}`, {
      align: "right",
    });
    doc.fontSize(10).text(`Invoice Date: ${new Date().toLocaleDateString()}`, {
      align: "right",
    });
    doc.text(
      `Due Date: ${
        booking.dueDate?.toLocaleDateString() || "10 days from invoice"
      }`,
      { align: "right" }
    );
    doc.text(`Invoice No.: ${booking.invoiceNumber || "0001"}`, {
      align: "right",
    });

    doc.moveDown();

    // BILL TO
    doc.fontSize(12).text("BILL TO:", { underline: true });
    doc.text(`${user.firstname} ${user.lastname}`);
    doc.text(user.email);
    if (user.company) doc.text(user.company);
    if (user.vatNumber) doc.text(`VAT No.: ${user.vatNumber}`);
    doc.moveDown();

    // TABLE HEADER
    doc.font("Helvetica-Bold");
    doc.text("DESCRIPTION", 50, doc.y, { continued: true });
    doc.text("UNIT", 250, doc.y, { continued: true });
    doc.text("QTY", 300, doc.y, { continued: true });
    doc.text("DURATION", 350, doc.y, { continued: true });
    doc.text("RATE", 420, doc.y, { continued: true });
    doc.text("TOTAL", 480, doc.y);
    doc.moveDown();
    doc.font("Helvetica");
    if (Array.isArray(booking.items) && booking.items.length > 0) {
      booking.items.forEach((item) => {
        doc.text(item.description, 50, doc.y, { continued: true });
        doc.text(item.unit, 250, doc.y, { continued: true });
        doc.text(item.qty.toString(), 300, doc.y, { continued: true });
        doc.text(item.duration, 350, doc.y, { continued: true });
        doc.text(`R ${item.rate.toLocaleString()}`, 420, doc.y, {
          continued: true,
        });
        doc.text(`R ${item.total.toLocaleString()}`, 480, doc.y);
        doc.moveDown();
      });
    } else {
      console.log("No items available in the booking.");
      doc.text("No items available.", 50, doc.y);
    }
    doc.moveDown();
    const subtotal = booking.subtotal || 24000;
    const vat = booking.vat || subtotal * 0.15;
    const total = subtotal + vat;

    doc.font("Helvetica-Bold");
    doc.text(`SUBTOTAL`, 420, doc.y, { continued: true });
    doc.text(`R ${subtotal.toLocaleString()}`, 480, doc.y);
    doc.text(`VAT`, 420, doc.y, { continued: true });
    doc.text(`R ${vat.toLocaleString()}`, 480, doc.y);
    doc.text(`TOTAL`, 420, doc.y, { continued: true });
    doc.text(`R ${total.toLocaleString()}`, 480, doc.y);
    doc.font("Helvetica");

    doc.moveDown();

    // BANK DETAILS
    doc.fontSize(10);
    doc.text("Bank Details:");
    doc.text("Privily (Pty) Ltd");
    doc.text("Standard Bank, Branch: 002645");
    doc.text("Account: 10 20 085 0707");
    doc.text("SWIFT: SBZAZAJJ");

    doc.moveDown();
    doc.text(
      `Event: Fame Week Africa - Soundproof Pods - ${
        booking.eventStartDate || "02 Sept 2024"
      } to ${booking.eventEndDate || "04 Sept 2024"}`
    );

    doc.end();
  });
};


const sendInvoiceEmailWithAttachment = async (booking, user) => {
  const pdfBuffer = await generateInvoicePdfBuffer(booking, user);

  const mailOptions = {
    to: user.email,
    subject: "Your Booking Invoice",
    html: `<p>Dear ${user.firstname},</p><p>Please find attached the invoice for your booking.</p>`,
    attachments: [
      {
        filename: `invoice_${booking._id}.pdf`,
        content: pdfBuffer,
        contentType: "application/pdf",
      },
    ],
  };

  await sendEmail(
    mailOptions.to,
    mailOptions.subject,
    mailOptions.html,
    mailOptions.attachments
  );
};
const sendInvoiceEmail = asyncHandler(async (req, res) => {
  const { bookingId } = req.params;
  validateMongoDbId(bookingId);

  const booking = await Booking.findById(bookingId).populate("user");
  if (!booking) {
    return res.status(404).json({ message: "Booking not found" });
  }

  const user = booking.user;
  if (!user) {
    return res.status(404).json({ message: "User not found" });
  }

  await sendInvoiceEmailWithAttachment(booking, user);

  res.json({ message: "Invoice PDF sent successfully" });
});


// const sendInvoiceEmail = asyncHandler(async (req, res) => {
//   const { bookingId } = req.params;
//   validateMongoDbId(bookingId);

//   const booking = await Booking.findById(bookingId).populate('user');
//   if (!booking) {
//     return res.status(404).json({ message: 'Booking not found' });
//   }

//   const user = booking.user;
//   if (!user) {
//     return res.status(404).json({ message: 'User not found' });
//   }

//   // Compose invoice email html (you can reuse your invoice generator)
//   const invoiceHtml = generateInvoiceHtml(booking, user);

//   await sendEmail(user.email, 'Your Booking Invoice - Privily', invoiceHtml);

//   res.json({ message: 'Invoice email sent successfully' });
// });

// update booking by id
const updateBookingById = asyncHandler(async (req, res) => {
  const { id } = req.params;
  validateMongoDbId(id);
  try {
    const updatedBooking = await Booking.findByIdAndUpdate(id, req.body, {
      new: true,
    });
    res.json(updatedBooking);
    sendNotificationOnUpdate(
      req.user._id, // Assuming req.user contains user information
      updatedBooking._id,
      Object.keys(req.body) // Pass updated fields to sendNotificationOnUpdate
    );
  } catch (error) {
    throw new Error(error);
  }
});

const sendNotificationOnUpdate = asyncHandler(
  async (userId, bookingId, updatedFields) => {
    validateMongoDbId(userId);
    validateMongoDbId(bookingId);

    try {
      const user = await User.findById(userId);
      if (!user) throw new Error("User not found");

      const booking = await Booking.findById(bookingId);
      if (!booking) throw new Error("Booking not found");

      let emailContent = "";

      // Check if relevant fields are updated
      if (updatedFields && updatedFields.length > 0) {
        const relevantFields = updatedFields.filter((field) => {
          // Add conditions here based on user preferences and booking fields
          return (
            field === "status" ||
            field === "bookingDate" ||
            field === "startTime" ||
            field === "endTime"
          );
        });

        if (relevantFields.length > 0) {
          // Construct notification message based on updated fields
          emailContent = `
          <p>Hi ${user.firstname},</p>
          <p>Your booking details have been updated. Here are the changes:</p>
          <ul>
            ${relevantFields
              .map(
                (field) =>
                  `<li><strong>${field}:</strong> ${booking[field]}</li>`
              )
              .join("\n")}
          </ul>
          <p>If you have any questions or concerns, please feel free to contact us.</p>
        `;
        }
      }

      // If email content exists, send email
      if (emailContent) {
        const data = {
          to: user.email,
          subject: "Booking Update Notification",
          html: emailContent,
        };
        await sendEmail(data.to, data.subject, data.html); // Send email
      }
    } catch (error) {
      console.error("Error sending update notification:", error.message);
      throw new Error("Failed to send update notification");
    }
  }
);
// cancle booking by id for user only if the booking status is pending and confirmed
const cancelBooking = asyncHandler(async (req, res) => {
  const { id } = req.params;
  validateMongoDbId(id);
  try {
    const booking = await Booking.findById(id);

    if (!booking) {
      return res.status(404).json({ message: "Booking not found" });
    }
    if (booking.status !== "Pending" && booking.status !== "Confirmed") {
      return res.status(403).json({
        message:
          "Cannot cancel booking with status other than Pending or Confirmed",
      });
    }
    // Check if booking's start time is within the last 5 minutes
    const fiveMinutesAgo = new Date(new Date() - 300 * 1000);
    if (booking.startTime < fiveMinutesAgo) {
      return res.status(403).json({
        message: "Cannot cancel booking Before 5 Minutes of start time",
      });
    }

    // If status is pending or confirmed, update status to "Cancelled"
    updatedStatus = "Cancelled";
    sendNotificationOnCancel(booking.user._id, booking._id);
    updatedIsBookingActive = false;
    try {
      // await booking.save();
      const updatedBooking = await Booking.findByIdAndUpdate(booking._id, {
        status: updatedStatus,
        isBookingActive: updatedIsBookingActive,
      }, {new:true});
    } catch (error) {
      console.log("booking save nahi ho rahi hai", error);
    }

    // Update product availability
    const productAvailability = await ProductAvailability.findOne({
      product_id: booking.podId,
      booking_date: {
        $gte: new Date(
          booking.bookingDate.getFullYear(),
          booking.bookingDate.getMonth(),
          booking.bookingDate.getDate()
        ),
        $lt: new Date(
          booking.bookingDate.getFullYear(),
          booking.bookingDate.getMonth(),
          booking.bookingDate.getDate() + 1
        ),
      },
    });

    if (productAvailability) {
      let updatedSlotBookings = productAvailability.slot_bookings;
      const startingIndex = get_slot_index_from_time(
        booking.startTime,
        START_TIME
      );
      const endingIndex = get_slot_index_from_time(booking.endTime, START_TIME);
      for (let i = startingIndex; i < endingIndex; i++) {
        updatedSlotBookings[i] = false;
      }

      await ProductAvailability.findOneAndUpdate(
        { _id: productAvailability._id },
        { slot_bookings: updatedSlotBookings },
        { new: true }
      );
    }

    res.json({ message: "Booking cancelled successfully", booking });
  } catch (error) {
    res.status(500).json({ message: "Internal server error" });
  }
});

// const cancelBooking = asyncHandler(async (req, res) => {
//   const { id } = req.params;
//   validateMongoDbId(id);
//   try {
//     const booking = await Booking.findById(id);

//     if (!booking) {
//       return res.status(404).json({ message: "Booking not found" });
//     }
//     if (booking.status !== "Pending" && booking.status !== "Confirmed") {
//       return res.status(403).json({
//         message:
//           "Cannot cancel booking with status other than Pending or Confirmed",
//       });
//     }
//     // Check if booking's start time is within the last 5 minutes
//     const fiveMinutesAgo = new Date(new Date() - 300 * 1000);
//     console.log(fiveMinutesAgo, 'timing')
//     console.log(booking.startTime, "start Time")
//     if (booking.startTime < fiveMinutesAgo) {
//       return res.status(403).json({
//         message: "Cannot cancel booking Before 5 Minutes of start time",
//       });
//     }

//     // If status is pending or confirmed, update status to "Cancelled"
//     booking.status = "Cancelled";
//     sendNotificationOnCancel(booking.user._id, booking._id);
//     booking.isBookingActive = false;
//     await booking.save();

//     res.json({ message: "Booking cancelled successfully", booking });
//   } catch (error) {
//     throw new Error(error);
//   }
// });

const bookingFeedback = asyncHandler(async (req, res) => {
  try {
    const booking_id = req.params.id;
    const { message, rating } = req.body;
    await Booking.findById(booking_id);
    const updatedBooking = await Booking.findByIdAndUpdate(
      booking_id,
      { "feedback.rating": rating, "feedback.message": message },
      {
        new: true,
      }
    );
    res.json(updatedBooking);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

const sendNotificationOnCancel = asyncHandler(async (userId, bookingId) => {
  validateMongoDbId(userId);
  validateMongoDbId(bookingId);

  try {
    const user = await User.findById(userId);
    if (!user) throw new Error("User not found");

    const booking = await Booking.findById(bookingId);
    if (!booking) throw new Error("Booking not found");

    let emailContent = "";

    // If booking status has changed, send notification
    if (booking.status == "Cancelled") {
      // Format booking date and times
      const formattedBookingDate = booking.bookingDate.toDateString();
      const formattedStartTime = booking.startTime.toLocaleTimeString("en-US", {
        hour12: true,
      });
      const formattedEndTime = booking.endTime.toLocaleTimeString("en-US", {
        hour12: true,
      });

      emailContent = `
        <p>Hi ${user.firstname},</p>
        <p>We regret to inform you that your booking has been cancelled.</p>
        <p>Here are the details of your booking:</p>
        <ul>
          <li><strong>Booking ID:</strong> ${booking._id}</li>
          <li><strong>Booking Date:</strong> ${formattedBookingDate}</li>
          <li><strong>Start Time:</strong> ${formattedStartTime}</li>
          <li><strong>End Time:</strong> ${formattedEndTime}</li>
          <li><strong>Pod ID:</strong> ${booking.podId}</li> <!-- Assuming 'podId' is the property for pod ID -->
          <!-- Include other necessary details -->
        </ul>
        <p>We apologize for any inconvenience caused.</p>
      `;
      user.lastBookingStatus = booking.status; // Update user's last booking status
    }
    // If email content exists, send email
    if (emailContent) {
      const data = {
        to: user.email,
        subject: "Booking Cancellation Notification",
        html: emailContent,
      };

      await sendEmail(data.to, data.subject, data.html); // Send email
    }

    await user.save(); // Save changes to user
  } catch (error) {
    console.error("Error sending cancellation notification:", error.message);
    throw new Error("Failed to send cancellation notification");
  }
});

//update booking auromatically when current time is equal to or greater than booking start time
// const updateBookingStatusAutomatically = asyncHandler(async (req, res) => {
//   const { _id } = req.user;
//   validateMongoDbId(_id);

//   try {
//     const now = new Date();

//     console.log("Current Time:", now);

//     // Find pending bookings
//     const pendingBookings = await Booking.find({
//       user: _id,
//       isBookingActive: true,
//       status: { $in: ["Pending", "Processing"], $nin: ["Rated", "Cancelled"] }, // Use $nin operator to exclude multiple statuses
//       endTime: { $lte: now }, // Find bookings where endTime is less than or equal to now
//     }).populate("user");

//     // console.log("Pending Bookings:", pendingBookings);
//     // Update completed bookings status to "Completed"
//     const updatedCompletedBookings = await Promise.all(
//       pendingBookings.map(async (booking) => {
//         console.log(booking.startTime);
//         console.log(booking.endTime);

//         if (booking.endTime <= now) {
//           // Use endTime directly for comparison
//           booking.status = "Completed";
//         }
//         if (booking.startTime <= now && now <= booking.endTime) {
//           // Check if now is within booking's start and end time
//           booking.status = "Processing";
//         }
//         return await booking.save();
//       })
//     );

//     // Send the response
//     res.json({
//       message: "Booking status updated successfully",
//       updatedCompletedBookings,
//     });
//   } catch (error) {
//     console.error("Error updating booking status:", error);
//     res.status(500).json({ message: "Failed to update booking status" });
//   }
// });
// const updateBookingStatusAutomatically = async (req, res, next) => {
//   const { _id } = req.user;
//   validateMongoDbId(_id);

//   try {
//     const now = new Date();

//     console.log("Current Time:", now);

//     // Find all active bookings
//     const bookings = await Booking.find({
//       user: _id,
//       isBookingActive: true,
//       status: { $in: ["Pending", "Processing"], $nin: ["Rated", "Cancelled"] },
//     }).populate("user");

//     // Update booking statuses
//     const updatedBookings = await Promise.all(
//       bookings.map(async (booking) => {
//         if (booking.startTime <= now && now < booking.endTime) {
//           // Check if now is within booking's start and end time
//           booking.status = "Processing";
//         } else if (now >= booking.endTime) {
//           // Check if now is past the booking's end time
//           booking.status = "Completed";
//           booking.isBookingActive = false; // Mark booking as inactive
//         }
//         return await booking.save();
//       })
//     );

//     if (next) {
//       next();
//     } else {
//       // Send the response
//       res.json({
//         message: "Booking status updated successfully",
//         updatedBookings,
//       });
//     }
//   } catch (error) {
//     console.error("Error updating booking status:", error);
//     if (next) {
//       next(error);
//     } else {
//       res.status(500).json({ message: "Failed to update booking status" });
//     }
//   }
// };

// const updateBookingStatusAutomatically = async (req, res, next) => {
//   const { _id } = req.user;
//   validateMongoDbId(_id);

//   try {
//     const now = new Date();

//     // Find all active bookings
//     const bookings = await Booking.find({
//       user: _id,
//       isBookingActive: true,
//       status: { $in: ["Pending", "Processing"], $nin: ["Rated", "Cancelled"] },
//     }).populate("user");

//     // Update booking statuses
//     const updatedBookings = await Promise.all(
//       bookings.map(async (booking) => {
//         if (booking.startTime <= now && now < booking.endTime) {
//           booking.status = "Processing";
//         } else if (now >= booking.endTime) {
//           booking.status = "Completed";
//           booking.isBookingActive = false;
//         }
//         return await booking.save();
//       })
//     );

//     if (next) {
//       next();
//     } else {
//       res.json({
//         message: "Booking status updated successfully",
//         updatedBookings,
//       });
//     }
//   } catch (error) {
//     console.error("Error updating booking status:", error);
//     if (next) {
//       next(error);
//     } else {
//       res.status(500).json({ message: "Failed to update booking status" });
//     }
//   }
// };
const updateBookingStatusAutomatically = async (req, res, next) => {
  const { _id } = req.user;
  validateMongoDbId(_id);

  try {
    // const now = new Date();
    // const updatedTime = new Date(now.setHours(now.getHours() + 2));
    const now = moment();
    const updatedTime = now.add(2, "hours");
    // Find all active bookings
    const bookings = await Booking.find({
      user: _id,
      isBookingActive: true,
      status: { $in: ["Pending", "Processing"], $nin: ["Rated", "Cancelled"] },
    }).populate("user");
    let updatedStatus = bookings.status;
    let updatedIsBookingActive = bookings.isBookingActive;
    let updatedBooking;
    // Update booking statuses
    const updatedBookings = await Promise.all(
      bookings.map(async (booking) => {
        console.log("bookingsimp", bookings.startTime <= updatedTime);
        console.log("bookingsimp11", booking);
        if (
          booking.startTime.isBefore(updatedTime) &&
          updatedTime.isBefore(booking.endTime)
        )
        
        {
          if(booking.status==="Cancelled"){
            updatedStatus = "Cancelled";
          }else{
          updatedStatus = "Processing";
          }
        } else if (updatedTime.isAfter(bookings.endTime)) {
          if (booking.status === "Cancelled") {
            updatedStatus = "Cancelled";
          } else {
            updatedStatus = "Completed";
          }
          updatedIsBookingActive = false;
        }
        try {
          // await booking.save();
          updatedBooking = await Booking.findByIdAndUpdate(booking._id, {
            status: updatedStatus,
            isBookingActive: updatedIsBookingActive,
          });
        } catch (error) {
          console.log("booking save nahi ho rahi hai", error);
        }
        return updatedBooking;
      })
    );

    if (next) {
      next();
    } else {
      res.json({
        message: "Booking status updated successfully",
        updatedBookings,
      });
    }
  } catch (error) {
    console.error("Error updating booking status:", error);
    if (next) {
      next(error);
    } else {
      res.status(500).json({ message: "Failed to update booking status" });
    }
  }
};

const updatebookingstatus = async (req, res) => {
  const { status } = req.body;

  const bookingId = req.params.id;

  const booking = await Booking.findById(bookingId);

  if (!booking) {
    return res.status(400).json({ message: "Booking not found !!!" });
  }

  const updatedBooking = await Booking.findByIdAndUpdate(
    bookingId,
    { $set: { status } },
    { new: true }
  );
  return res.status(200).json({ updatedBooking });
};
// rating a booking after completion of booking by user if status is Completed
// const rateBooking = asyncHandler(async (req, res) => {
//   const { id } = req.params;
//   validateMongoDbId(id);
//   try {
//     const booking = await Booking.findById(id)
//       .populate("user")
//       .populate("podId")
//       .exec();
//       console.log("booking", booking);
//     if (!booking) {
//       return res.status(404).json({ message: "Booking not found" });
//     }
//     if (booking.status !== "Completed") {
//       return res
//         .status(400)
//         .json({ message: "Booking must be completed to rate it." });
//     } else if (booking.isBookingActive === false) {
//       return res.status(400).json({ message: "Booking is already rated." });
//     }

//     const product = booking.podId;

//     if (!product) {
//       return res.status(404).json({ message: "Product not found" });
//     }

//     const { rating, message } = req.body;
//     booking.feedback = {
//       rating,
//       message,
//     };

//     if (!product.ratings) {
//       product.ratings = [];
//     }

//     const newRating = {
//       star: rating,
//       comment: message,
//       postedby: booking.user._id,
//     };
//     product.ratings.push(newRating);

//     let totalRating = 0;
//     product.ratings.forEach((rating) => {
//       totalRating += rating.star;
//     });
//     product.ratingCount = product.ratings.length;
//     product.totalRating = totalRating / product.ratingCount;

//     // Notify the user about the rating
//     sendNotification(req, res);

//     booking.status = "Rated";
//     booking.isBookingActive = false;
//     await booking.save();
//     await product.save();

//     res.json({ message: "Successfully Rated" });
//   } catch (error) {
//     res.status(500).json({ message: error.message });
//   }
// });

// const rateBooking = async (req, res) => {
//   try {
//     const { rating, message } = req.body;
//     const bookingId = req.params.id;

//     console.log("Received rating request for booking ID:", bookingId);
//     console.log("Rating:", rating, "Message:", message);

//     const booking = await Booking.findById(bookingId);

//     if (!booking) {
//       return res.status(404).json({ message: "Booking not found" });
//     }

//     if (booking.status !== "Completed") {
//       return res.status(400).json({ message: "Booking is not completed yet" });
//     }

//     booking.feedback = { rating, message };
//     booking.status = "Rated";

//     await booking.save();

//     res.status(200).json({ message: "Rating submitted successfully", booking });
//   } catch (error) {
//     res.status(500).json({ message: "Server error", error: error.message });
//   }
// };
const rateBooking = async (req, res) => {
  try {
    const { rating, message } = req.body;
    const bookingId = req.params.bookingId; // Assume the booking ID is passed in the URL
    const productId = req.params.productId; // Assume the product ID is also passed in the URL
    // const userId = req.user._id; // Assume user ID is available from authentication middleware

    console.log("Received rating request for booking ID:", bookingId);
    console.log("Rating:", rating, "Message:", message);

    // Find the booking by booking ID
    const booking = await Booking.findById(bookingId);

    if (!booking) {
      return res.status(404).json({ message: "Booking not found" });
    }

    if (booking.status !== "Completed") {
      return res.status(400).json({ message: "Booking is not completed yet" });
    }

    // Save feedback in Booking
    // booking.feedback = { rating, message };
    // booking.status = "Rated";
    // await Booking.findByIdAndUpdate(
    //   bookingId,
    //   { status: "Rated", feedback: { rating, message } },
    //   { new: true }
    // );
 const updatedratedBooking= await Booking.findByIdAndUpdate(
      bookingId,
      { $set: { status: "Rated", feedback: { rating, message } } },
      { new: true }
    );

    // Find the corresponding product by product ID
    const product = await productModel.findById(productId);

    if (!product) {
      return res.status(404).json({ message: "Product not found" });
    }

    // Add the rating to the product's ratings array
    product.ratings.push({
      star: rating,
      comment: message,
      // postedby: userId,
    });

    // Save the product with the updated ratings
    await product.save();

    // Send the response back with both booking and product
    res.status(200).json({
      message: "Rating submitted successfully for both booking and product",
      updatedratedBooking,
      product,
    });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// Update booking status as per the status provided by admin to manage booking status
const updateBookingStatusByAdmin = asyncHandler(async (req, res) => {
  const { status } = req.body;
  const { id } = req.params;
  validateMongoDbId(id);
  try {
    const updatedBooking = await Booking.findByIdAndUpdate(
      id,
      { status },
      { new: true }
    );
    res.json(updatedBooking);
  } catch (error) {
    throw new Error(error);
  }
});

const sendNotification = asyncHandler(async (req, res) => {
  const { _id } = req.user;
  validateMongoDbId(_id);

  try {
    const user = await User.findById(_id).exec();
    if (!user) throw new Error("User not found");

    const bookings = await Booking.find({ user: _id }).exec();

    for (const booking of bookings) {
      let emailContent = "";

      // If booking status has changed, send notification
      if (booking.status !== user.lastBookingStatus) {
        emailContent = `Hi ${user.firstname},\n\nYour booking with ID ${booking._id} has been updated to ${booking.status}.`;
        user.lastBookingStatus = booking.status; // Update user's last booking status
      }

      // If a new booking has been created, send booking details
      if (booking.status === "Pending" && !booking.isNotificationSent) {
        emailContent = `Hi ${user.firstname},\n\nThank you for choosing Privily! 
        You have successfully created a booking with us.
         Your booking details are as follows:\n\nStart Time: ${booking.startTime}\n
         End Time: ${booking.endTime}\nBooking Purpose: ${booking.bookingPurpose}`;
        booking.isNotificationSent = true; // Mark booking as notification sent
      }

      // If email content exists, send email
      if (emailContent) {
        const data = {
          to: user.email,
          subject: "Booking Notification",
          html: emailContent,
        };
        await sendEmail(data.to, data.subject, data.html); // Send email
        await booking.save(); // Save changes to booking
      }
    }

    await user.save(); // Save changes to user
    res.json({ message: "Notification sent successfully" });
  } catch (error) {
    res
      .status(500)
      .json({ message: "Error sending notification: " + error.message });
  }
});

const getAllNotification = asyncHandler(async (req, res) => {
  const user = req.user;
  await updateBookingStatusAutomatically(req, res, async () => {});
  const bookings = await Booking.find({
    user: user._id,
    status: "Completed",
  });
  result = { data: [] };
  bookings.forEach((booking) => {
    result["data"].push({
      message:
        "This is regarding your last booking on " +
        booking.bookingDate.toString(),
      booking_id: booking._id,
      podId: booking.podId,
      icon: "icon to send",
      type: "Rating", // as per this type, frontend will redirect to feedback mark page.
    });
  });
  res.json(result);
});

module.exports = {
  createUser,
  loginUserCtrl,
  loginMobileUserCtrl,
  verifyMobileOtp,
  verifyAuthPage,
  getallUser,
  getaUser,
  deleteaUser,
  updatedUser,
  blockUser,
  unblockUser,
  handleRefreshToken,
  logout,
  updatePassword,
  forgotPasswordToken,
  resetPassword,
  loginAdmin,
  saveAddress,
  // applyCoupon,
  createBooking,
  getBookings,
  cancelBooking,
  getBookingsByUser,
  getBookingById,
  updateBookingById,
  updateBookingStatusAutomatically,
  updateBookingStatusByAdmin,
  updatebookingstatus,
  setCurrentLocation,
  sendNotification,
  rateBooking,
  bookingFeedback,
  corporatePods,
  getAllNotification,
  getMe,
  extendBooking,
  registerAndAssignRoles,
  getallstaff,
  blockStaff,
  unblockStaff,
  deleteStaff,
  editStaff,
  sendInvoiceEmail,
  getUserByID
};
