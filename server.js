// importing
import express from "express";
import mongoose from "mongoose";
import Messages from "./dbMessages.js";
import Pusher from "pusher";
import cors from "cors";
// app config
const app = express();
const port = process.env.PORT || 9000;
const pusher = new Pusher({
  appId: "1615869",
  key: "9be80fad10efd4fded17",
  secret: "213ac9c1e978640dfa52",
  cluster: "ap2",
  useTLS: true,
});
// Middleware
app.use(express.json());
// app.use((req, res, next) => {
//   res.setHeader("Access-Control-Allow-Origin", "*");
//   res.setHeader("Access-Control-Allow-Headers", "*");
//   next();
// });
app.use(cors());

// DB Config
const connection_url =
  "mongodb+srv://admin:1234567890@cluster0.fo6njqa.mongodb.net/whatsappdb?retryWrites=true&w=majority";

mongoose
  .connect(connection_url, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .then(() => {
    // console.log("Connected to MongoDB database...");
  })
  .catch((err) => {
    // console.error("Error connecting to MongoDB:", err);
  });
const db = mongoose.connection;
db.once("open", () => {
  console.log("DB connected - Mongo..");
  const msgCollection = db.collection("messagecontents");
  const changeStream = msgCollection.watch();
  changeStream.on("change", (change) => {
    console.log("Change Occured: ", change);
    if (change.operationType === "insert") {
      const messageDetails = change.fullDocument;
      pusher.trigger("messages", "insert", {
        name: messageDetails.name,
        message: messageDetails.message,
        timestamp: messageDetails.timestamp,
        received: messageDetails.received,
      });
    } else if (change.operationType === "delete") {
      console.log("deleted", change);
    } else {
      console.log("Error trigerring pusher.");
    }
  });
});

// api route
app.get("/", (req, res) => res.status(200).send("Hello, world!"));
app.get("/messages/sync", (req, res) => {
  Messages.find()
    .then((data) => {
      res.status(201).send(data);
    })
    .catch((err) => {
      res.status(500).send(err);
    });
});
app.post("/messages/new", (req, res) => {
  const dbMessage = req.body;
  Messages.create(dbMessage)
    .then((data) => {
      res.status(201).send(data);
    })
    .catch((err) => {
      res.status(500).send(err);
    });
});
// listen
app.listen(port, () => console.log(`Listening on localhost:${port}`));
