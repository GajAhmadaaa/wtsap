const { create, decryptMedia, ev } = require("@open-wa/wa-automate");
const { default: PQueue } = require("p-queue");
const fs = require("fs");
const express = require("express");
const axios = require("axios").default;

const configObject = {
  sessionId: "SAD_CLIENT",
  authTimeout: 0,
  autoRefresh: true,
  cacheEnabled: false,
  chromiumArgs: ["--no-sandbox"],
  disableSpins: true,
  headless: true,
  qrRefreshS: 20,
  qrTimeout: 0,
};

const startBot = async () => {
 try {
    const Handler = require("./handler");
    const Client = await create(configObject);

    await Client.onStateChanged(async (state) => {
      if (state === "TIMEOUT" || state === "CONFLICT" || state === "UNLAUNCHED") await Client.forceRefocus();
      console.log("State Changed >", state);
    });

    await Client.onMessage((message) => {
      Handler.messageHandler(Client, message);
    });

    await Client.onGlobalParicipantsChanged((event) => {
      Handler.globalParticipantsChanged(Client, event);
    });

    await Client.onAddedToGroup((event) => {
      Handler.addedToGroup(Client, event);
    });
  }
}

const server = express();
const PORT = parseInt(process.env.PORT) || 3000;

/**
 * Initialize client
 * @param {import("@open-wa/wa-automate").Client} client
 */

ev.on("qr.**", async (qrcode) => {
  const imageBuffer = Buffer.from(
    qrcode.replace("data:image/png;base64,", ""),
    "base64"
  );
  fs.writeFileSync("./public/qr_code.png", imageBuffer);
});

server.use(express.static("public"));
server.listen(PORT, () => 
  console.log(`> Listining on http://localhost:${PORT}`)
);

process.on("exit", () => {
  if (fs.existsSync("./session.data.json")) {
    fs.unlinkSync("./session.data.json");
  }
});

startBot();
