import mongoose from "mongoose";
// Message Schema
const messageSchema = mongoose.Schema({
  conversationId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "conversations",
  },
  senderId: { type: mongoose.Schema.Types.ObjectId, ref: "users" },
  receiverId: { type: mongoose.Schema.Types.ObjectId, ref: "users" },
  content: String,
  sent: { type: Boolean, default: false },
  seen: { type: Boolean, default: false },
  received: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

export default mongoose.model("messages", messageSchema);
