// importing
import express from "express";
import mongoose from "mongoose";
import Messages from "./dbMessages.js";
import User from "./users.js";
import Conversations from "./conversations.js";
import LiveUserUpdates from "./dbUserupdates.js";
import Pusher from "pusher";
import cors from "cors";
// import cors from "cors";

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
  const convCollection = db.collection("chatstreams");
  const changeStream = convCollection.watch();
  const convCollectionliveUserupdates = db.collection("userupdates");
  const changeStreamliveUserupdates = convCollectionliveUserupdates.watch();

  changeStream.on("change", (change) => {
    console.log("change", change);
    if (change.operationType === "insert") {
      console.log("\ninserted doc info", change);

      const conversationDetails = change.fullDocument;
      console.log("inserted doc info", conversationDetails);
      pusher.trigger(
        conversationDetails.conversationId,
        "insert",
        conversationDetails
      );
    } else {
      console.log("Error triggering Pusher.");
    }
  });
  changeStreamliveUserupdates.on("change", (change) => {
    console.log(`\nLive Update- Uid: `, change);
    if (change.operationType === "insert") {
      const userDetails = change.fullDocument;

      User.findOne({ uid: userDetails.uid })
        .then((existingUser) => {
          if (existingUser) {
            pusher.trigger(existingUser.uid, "insert", existingUser);
          }
        })
        .catch((err) => {
          res.status(500).send(err);
        });
    } else {
      console.log("Error triggering Pusher.");
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
app.post("/chatstream/:conversationId/message/new", (req, res) => {
  const dbMessage = req.body;
  Messages.create(dbMessage)
    .then((data) => {
      res.status(201).send(data);
    })
    .catch((err) => {
      res.status(500).send(err);
    });
});
app.post("/userUpdate/:uid/user/newupdate", (req, res) => {
  const userId = req.params.uid;
  LiveUserUpdates.create({ uid: userId })
    .then((createdUser) => {
      res.status(201).send(`Uid: ${createdUser.uid} update userUpdate`);
    })
    .catch((err) => {
      res.status(500).send(err);
    });
});
app.post("/users/uid/:id", (req, res) => {
  const authUser = req.body;
  const userdetail = {
    _id: authUser.uid,
    uid: authUser.uid,
    email: authUser.email,
    createdDate: new Date(),
    name: "",
    photoURL: "",
    providedData: authUser.providerData,
    conversations: [],
    isOnline: true,
    lastSeen: new Date(),
    firstName: "",
    lastName: "",
    phoneNumber: "",
    profileSetupComplete: false,
    messages: [],
  };

  User.findOne({ uid: userdetail.uid })
    .then((existingUser) => {
      if (existingUser) {
        User.findOneAndUpdate(
          { uid: userdetail.uid },
          {
            $set: {
              isOnline: true,
              lastSeen: new Date().toUTCString(),
            },
          },
          { upsert: true }
        )
          .then((updatedUser) => {
            res.status(200).send(updatedUser);
          })
          .catch((err) => {
            res.status(500).send(err);
          });
      } else {
        User.create(userdetail)
          .then((newUser) => {
            res.status(201).send(newUser);
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
app.post("/users/uid/:id/signout", (req, res) => {
  const userdetail = req.body;
  User.findOneAndUpdate(
    { uid: userdetail.uid },
    {
      $set: {
        isOnline: false,
        lastSeen: new Date().toUTCString(),
      },
    },
    { upsert: true }
  )
    .then((updatedUser) => {
      res.status(200).send("User signed out");
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

app.post("/conversations/create/:conversationId", (req, res) => {
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
app.put("/users/:id/conversations", (req, res) => {
  const conversationId = req.body.conversationId;
  const receiverId = req.body.receiverId;
  const userId = req.body.senderId;

  // Check if conversationId already exists in sender's conversationList
  db.collection("users").findOne(
    { _id: userId, "conversations.conversationId": conversationId },
    (err, result) => {
      if (err) {
        console.error("Failed to query sender user document:", err);
        res.status(500).send("Internal Server Error");
        return;
      }

      if (result) {
        console.log("Conversation ID already exists in sender user document");
        res.status(200).send("Conversation already exists");
        return;
      }

      // Update sender's conversationList
      db.collection("users").updateOne(
        { _id: userId },
        {
          $addToSet: {
            conversations: {
              conversationId: conversationId,
              chatWithUserId: receiverId,
              lastMessage: req.body.lastMessage,
            },
          },
        },
        (err, result) => {
          if (err) {
            console.error("Failed to update sender user document:", err);
            res.status(500).send("Internal Server Error");
            return;
          }

          if (result.modifiedCount === 0) {
            console.log("Failed to add conversation to sender user document");
            res.status(500).send("Failed to add conversation");
            return;
          }

          // Check if conversationId already exists in receiver's conversationList
          db.collection("users").findOne(
            { _id: receiverId, "conversations.conversationId": conversationId },
            (err, result) => {
              if (err) {
                console.error("Failed to query receiver user document:", err);
                res.status(500).send("Internal Server Error");
                return;
              }

              if (result) {
                console.log(
                  "Conversation ID already exists in receiver user document"
                );
                res.status(200).send("Conversation already exists");
                return;
              }

              // Update receiver's conversationList
              db.collection("users").updateOne(
                { _id: receiverId },
                {
                  $addToSet: {
                    conversations: {
                      conversationId: conversationId,
                      chatWithUserId: userId,
                      lastMessage: req.body.lastMessage,
                    },
                  },
                },
                (err, result) => {
                  if (err) {
                    console.error(
                      "Failed to update receiver user document:",
                      err
                    );
                    res.status(500).send("Internal Server Error");
                    return;
                  }

                  if (result.modifiedCount === 0) {
                    console.log(
                      "Failed to add conversation to receiver user document"
                    );
                    res.status(500).send("Failed to add conversation");
                    return;
                  }

                  res
                    .status(200)
                    .send("Conversation added to the user documents");
                }
              );
            }
          );
        }
      );
    }
  );
});
app.put(
  "/users/:id/conversations/:conversationId/update/lastMessage",
  (req, res) => {
    const conversationId = req.params.conversationId;
    const receiverId = req.body.receiverId;
    const userId = req.params.id;
    const lastMessage = req.body;
    db.collection("users").updateOne(
      { _id: userId, "conversations.conversationId": conversationId },
      {
        $set: { "conversations.$.lastMessage": lastMessage },
      },
      (err, result) => {
        if (err) {
          console.error("Failed to update sender user document:", err);
          res.status(500).send("Internal Server Error");
          return;
        }

        if (result.modifiedCount === 0) {
          console.log("Conversation ID not found in sender user document");
          res.status(404).send("Conversation not found");
          return;
        }
        db.collection("users").updateOne(
          { _id: receiverId, "conversations.conversationId": conversationId },
          {
            $set: { "conversations.$.lastMessage": lastMessage },
          },
          (err, result) => {
            if (err) {
              console.error("Failed to update receiver user document:", err);
              res.status(500).send("Internal Server Error");
              return;
            }

            if (result.modifiedCount === 0) {
              console.log(
                "Conversation ID not found in receiver user document"
              );
              res.status(404).send("Conversation not found");
              return;
            }

            res.status(200).send("Last message updated successfully");
          }
        );
      }
    );
  }
);
app.get("/conversations/:conversationId/messages", (req, res) => {
  const conversationId = req.params.conversationId;

  db.collection("conversations").findOne(
    { conversationId },
    (err, conversation) => {
      if (err) {
        console.error("Failed to find conversation:", err);
        res.status(500).send("Internal Server Error");
        return;
      }

      if (!conversation) {
        console.log("Conversation not found");
        res.status(404).send("Conversation not found");
        return;
      }

      const messages = conversation.messages;
      res.status(200).json(messages);
    }
  );
});

app.post("/conversations/:conversationId/messages/new", (req, res) => {
  const conversationId = req.params.conversationId;
  const message = req.body;
  Conversations.findOneAndUpdate(
    { conversationId: conversationId },
    { $push: { messages: message } },
    { new: true, upsert: true }
  )
    .then((updatedConversation) => {
      res.status(201).send(updatedConversation);
    })
    .catch((err) => {
      res.status(500).send(err);
    });
});
app.put("/users/update/:id", (req, res) => {
  const { id } = req.params;
  const { phoneNumber, photoURL, firstName, lastName, profileSetupComplete } =
    req.body;

  db.collection("users").findOneAndUpdate(
    { uid: id },
    {
      $set: {
        phoneNumber: phoneNumber,
        photoURL: photoURL,
        firstName: firstName,
        lastName: lastName,
        profileSetupComplete: profileSetupComplete,
      },
    },
    { returnOriginal: false },
    (err, result) => {
      if (err) {
        console.error("Failed to update user document:", err);
        res.status(500).send("Internal Server Error");
        return;
      }

      if (!result.value) {
        console.log("No user found with the provided ID");
        res.status(404).send("User not found");
        return;
      }
      res.status(200).json(result.value);
    }
  );
});

// listen
app.listen(port, () => console.log(`Listening on localhost:${port}`));
