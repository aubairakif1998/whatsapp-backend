import mongoose from "mongoose";
// Conversation Schema
const conversationSchema = mongoose.Schema({
  participants: [{ participantId: String }],
  conversationId: String,
  channelName: String,
  messages: [
    {
      content: String,
      senderId: String,
      receiverId: String,
      mediaURL: String,
      isMediaAttached: { type: Boolean, default: false },
      sentAt: { type: Date, default: Date.now },
      seen: { type: Boolean, default: false },
      received: { type: Boolean, default: false },
      updatedAt: { type: Date, default: Date.now },
    },
  ],
  createdAt: { type: Date, default: Date.now },
});

export default mongoose.model("conversations", conversationSchema);
