// importing
import express from "express";
import mongoose from "mongoose";
import Messages from "./dbMessages.js";
import User from "./users.js";
import Conversations from "./conversations.js";

import Pusher from "pusher";
import cors from "cors";

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
  .then(() => {})
  .catch((err) => {});
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

app.post("/users/new", (req, res) => {
  const userdetail = req.body;
  User.create(userdetail)
    .then((data) => {
      res.status(201).send(data);
    })
    .catch((err) => {
      res.status(500).send(err);
    });
});
app.get("/users/sync", (req, res) => {
  User.find()
    .then((data) => {
      res.status(201).json(data);
    })
    .catch((err) => {
      res.status(500).send(err);
    });
});

app.post("/users/uid/:id", (req, res) => {
  const userId = req.params.id;

  db.collections.users.findOne({ uid: userId }, (err, user) => {
    if (err) {
      console.error("Error fetching user from MongoDB:", err);
      res.status(500).json({ error: "Error fetching user" });
    } else if (user) {
      res.status(201).json(user);
    } else {
      res.status(404).send({ error: "User not found" });
    }
  });
});

app.post("/conversations/:conversationId", (req, res) => {
  const conversationDetails = req.body;
  const conversationId = req.params.conversationId;

  // Check if the conversationId already exists in the collection
  Conversations.findOne({ conversationId: conversationId })
    .then((existingConversation) => {
      if (existingConversation) {
        // Conversation with the same conversationId already exists
        res
          .status(409)
          .send(
            "Conversation with the provided conversationId already exists."
          );
      } else {
        // Conversation with the provided conversationId does not exist
        Conversations.create(conversationDetails)
          .then((data) => {
            res.status(201).send(data);
          })
          .catch((err) => {
            res.status(500).send(err);
          });
      }
    })
    .catch((err) => {
      res.status(500).send(err);
    });
});

// listen
app.listen(port, () => console.log(`Listening on localhost:${port}`));
