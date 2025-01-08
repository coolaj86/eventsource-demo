import http from "node:http";
import express from "express";

let app = express();
let router = express.Router();
let PORT = process.env.PORT || 3000;

/** @type {Object.<String, import('node:http').ServerResponse>} */
let streamsById = {};
let count = 0;

let intervalId = setInterval(function () {
  count += 1;
  let rnd = Math.random();
  let eventname = "event: banana\n";
  if (rnd > 0.75) {
    eventname = "event: pickle\n";
  } else if (rnd > 0.5) {
    eventname = "";
  } else if (rnd > 0.25) {
    eventname = "event: squash\n";
  }
  let data = JSON.stringify({
    message: "Hello from server!",
    special: eventname,
  });
  let msg = [
    `: this is a comment\n`,
    eventname,
    `ignoreme: yo yo yo\n`,
    `id: banana ${count}\n`,
    `data: ${data}\n`,
    `retry: 1000\n`,
    `\n`,
  ].join("");

  let streamIds = Object.keys(streamsById);
  for (let streamId of streamIds) {
    let res = streamsById[streamId];
    try {
      res.write(msg);
    } catch (e) {
      console.log(`closing ${streamId} due to error:`, e);
      res.close();
    }
    if (res.writableFinished) {
      console.log(`deleting ${streamId} due to close`);
      delete streamsById[streamId];
    }
  }
}, 500);

app.use("/", router);

// Endpoint: /api/hello
router.get("/api/hello", function (req, res) {
  res.json({ message: "hello" });
});

// Endpoint: /api/notify for Server-Sent Events
router.get("/api/notify", function (req, res) {
  res.setHeader("Content-Type", "text/event-stream"); // SSE connection
  res.setHeader("Cache-Control", "no-cache"); // SSE connection
  // res.setHeader("Connection", "keep-alive");

  // TODO res.query.uuidv7
  let id = `${res.socket?.remoteAddress}:${res.socket?.remotePort}`;
  streamsById[id] = res;

  req.on("close", function () {
    res.end();
  });
});

router.put("/api/notify", function (req, res) {
  // TODO replace metadata for existing connection
  throw new Error("not implemented");
});

router.post("/api/notify", function (req, res) {
  // TODO update metadata for existing connection
  throw new Error("not implemented");
});

router.delete("/api/notify", function (req, res) {
  let id = `${res.socket?.remoteAddress}:${res.socket?.remotePort}`;
  let stream = streamsById[id];
  delete streamsById[id];
  stream.end();

  res.json({ success: true });
});

router.delete("/api", function (req, res) {
  clearInterval(intervalId);
  res.json({ success: true });
});

router.use(
  "/api",
  /** @type {import('express').ErrorRequestHandler} */
  function (err, req, res, next) {
    res.statusCode = err.status || 500;
    res.json({
      error: {
        code: err.code || "E_UNKNOWN",
        message: err.message || "unknown error",
        status: res.statusCode,
      },
    });
  },
);

// Start the server
let httpServer = http.createServer(app);
httpServer.listen(PORT, function () {
  console.log(`Server is running on http://localhost:${PORT}`);
});
