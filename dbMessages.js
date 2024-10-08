import mongoose from "mongoose";
const whatsappSchema = mongoose.Schema({
  conversationId: String,
  content: String,
  senderId: String,
  receiverId: String,
  sentAt: String,
  seen: Boolean,
  received: Boolean,
  mediaURL: String,
  isMediaAttached: { type: Boolean, default: false },
  updatedAt: String,
});
// refering to the collection of message content
export default mongoose.model("chatstreams", whatsappSchema);
