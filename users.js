import mongoose from "mongoose";

// User Schema
const userSchema = mongoose.Schema({
  _id: String,
  uid: String,
  email: String,
  createdDate: { type: Date, default: Date.now },
  name: String,
  firstName: String,
  lastName: String,
  isOnline: Boolean,
  lastSeen: { type: Date, default: Date.now },
  phoneNumber: String,
  photoURL: { type: String, default: "" },
  conversations: [
    {
      conversationId: String,
    },
  ],
  profileSetupComplete: { type: Boolean, default: false },
});

export default mongoose.model("users", userSchema);

// import mongoose from "mongoose";

// // User Schema
// const userSchema = mongoose.Schema({
//   uid: String,
//   email: String,
//   createdDate: { type: Date, default: Date.now },
//   name: String,
//   firstName: String,
//   lastName: String,
//   isOnline: Boolean,
//   lastSeen: { type: Date, default: Date.now },
//   phoneNumber: String,
//   photoURL: { type: String, default: "" },
//   providedData: Array,
//   profileSetupComplete: { type: Boolean, default: false },
//   conversations: Array,
// });

// export default mongoose.model("users", userSchema);
