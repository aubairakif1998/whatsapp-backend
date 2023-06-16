import mongoose from "mongoose";

// User Schema
const userSchema = mongoose.Schema({
  uid: String,
});

export default mongoose.model("liveUserupdates", userSchema);
