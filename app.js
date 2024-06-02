const express = require("express");
const http = require("http");
const socket = require("socket.io");
const { Chess } = require("chess.js");
const path = require("path");

const app = express();

const server = http.createServer(app);
const io = socket(server);

const chess = new Chess();

let players = {};
let spectators = [];

app.set("view engine", "ejs");
app.use(express.static(path.join(__dirname, "public")));

app.get("/", (req, res) => {
  res.render("index");
});

io.on("connection", (uniquesocket) => {
  console.log("connected");

  // Assign roles to new connections
  if (!players.white) {
    players.white = uniquesocket.id;
    uniquesocket.emit("playerRole", "w");
  } else if (!players.black) {
    players.black = uniquesocket.id;
    uniquesocket.emit("playerRole", "b");
  } else {
    spectators.push(uniquesocket.id);
    uniquesocket.emit("spectatorRole");
  }

  uniquesocket.emit("boardState", chess.fen());

  uniquesocket.on("disconnect", () => {
    if (uniquesocket.id === players.white) {
      players.white = null;
      if (spectators.length > 0) {
        players.white = spectators.shift();
        io.to(players.white).emit("playerRole", "w");
      }
    } else if (uniquesocket.id === players.black) {
      players.black = null;
      if (spectators.length > 0) {
        players.black = spectators.shift();
        io.to(players.black).emit("playerRole", "b");
      }
    } else {
      spectators = spectators.filter((id) => id !== uniquesocket.id);
    }
  });

  uniquesocket.on("move", (move) => {
    try {
      if (chess.turn() === "w" && uniquesocket.id !== players.white) return;
      if (chess.turn() === "b" && uniquesocket.id !== players.black) return;

      const result = chess.move(move);
      if (result) {
        io.emit("move", move);
        io.emit("boardState", chess.fen());
      } else {
        uniquesocket.emit("invalidMove", move);
      }
    } catch (error) {
      console.log(error);
    }
  });
});

server.listen(3000, () => {
  console.log("Server running on port 3000");
});
