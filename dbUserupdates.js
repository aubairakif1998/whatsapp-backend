import mongoose from "mongoose";

// User Schema
const userupdatesSchema = mongoose.Schema({
  uid: String,
});

export default mongoose.model("userupdates", userupdatesSchema);
