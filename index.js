const wa = require("@open-wa/wa-automate");
const { create, decryptMedia, ev } = wa;
const { default: PQueue } = require("p-queue");
const fs = require("fs");
const express = require("express");
const axios = require("axios").default;

const helpOnInPM = ["hello", "hi", "hii", "hey", "heyy", "#help", "#menu"];
const helpOnInGroup = ["#help", "#menu"];

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

const helpText =
  process.env.HELP_TEXT ||
  `Commands:
#sticker: write in caption of a image/video/gif to turn it into sticker
#spam: tag everyone in a message in a group (only works in a group)
#join https://chat.whatsapp.com/shdkashdh: joing a group with invite link
#leave: i hope you dont use this (only works in a group if sent by an admin)
#help: to recive this same message
#menu: same as help but some people prefer it
#run languages: Returns all languages supported
#run {language}
{code}: Run some code in some language
eg.
'#run node
console.log('hello world');'
Add '#nospam' in group description to stop spam commands
All commands except #spam & #leave work in pm
Made by: pathetic_geek (https://github.com/patheticGeek)
`;

const leaveText =
  process.env.LEAVE_TEXT ||
  "Ab unko humshe rishta nhi rakhna hai\nto humari taraf se bhi koi zabardasti nhi hai";

/**
 * WA Client
 * @type {null | import("@open-wa/wa-automate").Client}
 */
let cl = null;

/**
 * Process the message
 * @param {import("@open-wa/wa-automate").Message} message
 */
async function procMess(message) {
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
const queue = new PQueue({
  concurrency: 2,
  autoStart: false,
});
/**
 * Add message to process queue
 */
const processMessage = (message) =>
  queue.add(async () => {
    try {
      await procMess(message);
    } catch (e) {
      console.log(e);
    }
  });

/**
 * Initialize client
 * @param {import("@open-wa/wa-automate").Client} client
 */
async function start(client) {
  cl = client;
  queue.start();
  const unreadMessages = await client.getAllUnreadMessages();
  unreadMessages.forEach(processMessage);
  client.onMessage(processMessage);
}

ev.on("qr.**", async (qrcode) => {
  const imageBuffer = Buffer.from(
    qrcode.replace("data:image/png;base64,", ""),
    "base64"
  );
  fs.writeFileSync("./public/qr_code.png", imageBuffer);
});

create({
  qrTimeout: 0,
  cacheEnabled: false,
}).then((client) => start(client));

server.use(express.static("public"));
server.listen(PORT, () => 
  console.log(`> Listining on http://localhost:${PORT}`)
);

process.on("exit", () => {
  if (fs.existsSync("./session.data.json")) {
    fs.unlinkSync("./session.data.json");
  }
});
