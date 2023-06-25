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
  appId: "1624508",
  key: "b623a3c3694d8f48b21c",
  secret: "5eb4b8a1bffc71232a12",
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

// app.put(
//   "/users/:id/conversations/:conversationId/update/lastMessage",
//   (req, res) => {
//     const conversationId = req.params.conversationId;
//     const receiverId = req.body.receiverId;
//     const userId = req.params.id;
//     const lastMessage = req.body;
//     db.collection("users").updateOne(
//       { _id: userId, "conversations.conversationId": conversationId },
//       {
//         $set: { "conversations.$.lastMessage": lastMessage },
//       },
//       (err, result) => {
//         if (err) {
//           console.error("Failed to update sender user document:", err);
//           res.status(500).send("Internal Server Error");
//           return;
//         }

//         if (result.modifiedCount === 0) {
//           console.log("Conversation ID not found in sender user document");
//           res.status(404).send("Conversation not found");
//           return;
//         }
//         db.collection("users").updateOne(
//           { _id: receiverId, "conversations.conversationId": conversationId },
//           {
//             $set: { "conversations.$.lastMessage": lastMessage },
//           },
//           (err, result) => {
//             if (err) {
//               console.error("Failed to update receiver user document:", err);
//               res.status(500).send("Internal Server Error");
//               return;
//             }

//             if (result.modifiedCount === 0) {
//               console.log(
//                 "Conversation ID not found in receiver user document"
//               );
//               res.status(404).send("Conversation not found");
//               return;
//             }

//             res.status(200).send("Last message updated successfully");
//           }
//         );
//       }
//     );
//   }
// );
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

////////////////////////////////////
// check for user doc exis in mongo
app.post("/users/getuserinfo/:id", (req, res) => {
  const userdetail = req.body;
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
// update user name and picture and lastname
app.put("/users/update/uid/:id", (req, res) => {
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
app.post("/userUpdates/:uid/newupdate", (req, res) => {
  const userId = req.params.uid;
  LiveUserUpdates.create({ uid: userId })
    .then((createdUser) => {
      res.status(201).send(`Uid: ${createdUser.uid} update userUpdate`);
    })
    .catch((err) => {
      res.status(500).send(err);
    });
});

// create and fetch new conversation channel
app.post("/conversations/create/:conversationId", (req, res) => {
  const conversationDetails = req.body;
  const conversationId = req.params.conversationId;
  Conversations.findOne({ conversationId: conversationId })
    .then((existingConversation) => {
      if (existingConversation) {
        res.status(200).send(existingConversation);
      } else {
        Conversations.create(conversationDetails)
          .then((createdConversation) => {
            res.status(201).send(createdConversation);
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
//  fetch conversation channel on the base of conversationId
app.post("/conversations/fetch/:conversationId", (req, res) => {
  const conversationId = req.params.conversationId;
  Conversations.findOne({ conversationId: conversationId })
    .then((existingConversation) => {
      if (existingConversation) {
        res.status(200).send(existingConversation);
      } else {
        res.status(404).send("conversation not found!");
      }
    })
    .catch((err) => {
      res.status(500).send(err);
    });
});
// update users conversation list
app.put("/users/:id/update/conversations", (req, res) => {
  const conversationId = req.body.conversationId;
  const receiverId = req.body.receiverId;
  const senderId = req.body.senderId;

  // Check if conversationId already exists in sender's conversationList
  db.collection("users").findOne(
    { _id: senderId, "conversations.conversationId": conversationId },
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
        { _id: senderId },
        {
          $addToSet: {
            conversations: {
              conversationId: conversationId,
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
                res.status(200).send("Conversation already exists");
                return;
              }
              db.collection("users").updateOne(
                { _id: receiverId },
                {
                  $addToSet: {
                    conversations: {
                      conversationId: conversationId,
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
// Fetch user on uid base
app.post("/users/find/:uid", (req, res) => {
  const uidToFind = req.params.uid;
  User.findOne({ uid: uidToFind })
    .then((existingUser) => {
      if (existingUser) {
        res.status(200).send(existingUser);
      } else {
        res.status(404).send("User not found");
      }
    })
    .catch((err) => {
      res.status(500).send(err);
    });
});
// listen
app.listen(port, () => console.log(`Listening on localhost:${port}`));
