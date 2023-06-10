import mongoose from "mongoose";
const whatsappSchema = mongoose.Schema({
  message: String,
  name: String,
  timestamp: String,
  received: Boolean,
  sent: Boolean,
  seen: Boolean,
});
// refering to the collection of message content
export default mongoose.model("messagecontents", whatsappSchema);
