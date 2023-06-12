import mongoose from "mongoose";

// User Schema
const userSchema = mongoose.Schema({
  _id: String,
  uid: String,
  email: String,
  createdDate: { type: Date, default: Date.now },
  name: String,
  photoURL: { type: String, default: "" },
  providedData: Array,
  conversations: [
    { type: mongoose.Schema.Types.ObjectId, ref: "conversations" },
  ],
  messages: [{ type: mongoose.Schema.Types.ObjectId, ref: "messages" }],
});

export default mongoose.model("users", userSchema);
