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
  providedData: Array,
  profileSetupComplete: { type: Boolean, default: false },
  conversations: [
    { type: mongoose.Schema.Types.ObjectId, ref: "conversations" },
  ],
  messages: [{ type: mongoose.Schema.Types.ObjectId, ref: "messages" }],
});

export default mongoose.model("users", userSchema);
