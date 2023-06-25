import Messages from "./dbMessages.js";

export const syncMessages = (req, res) => {
  Messages.find()
    .then((data) => {
      res.status(201).send(data);
    })
    .catch((err) => {
      res.status(500).send(err);
    });
};
