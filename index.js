const { executionAsyncResource } = require("async_hooks");
const { Client, GatewayIntentBits } = require("discord.js");
const ytdl = require("ytdl-core");
const { prefix, token } = require("./config.json");

/* const intentList = new IntentsBitField();
-- Need to do 
intentList.add(IntentBitField.Bitfields) 
to add more intents 

pass through intents: intentList
*/

const bot = new Client({ intents: [GatewayIntentBits.Guilds] });

bot.login(token);

bot.once("ready", () => {
  console.log("Application is ready!");
});

bot.once("reconnecting", () => {
  console.log("Reconnecting...");
});

bot.once("disconnect", () => {
  console.log("Disconnected");
});

// Messages

// Listen for Messages that start with prefix
bot.on("message", async (message) => {
  if (message.author.bot) return;
  if (!message.content.startsWith(prefix)) return;
  const serverQueue = queue.get(message.guild.id);
  // Find which prefix command user sent
  if (message.content.startsWith(`${prefix}play`)) {
    execute(message, serverQueue);
    return;
  } else if (message.content.startsWith(`${prefix}skip`)) {
    skip(message, serverQueue);
    return;
  } else if (message.content.startsWith(`${prefix}stop`)) {
    stop(message, serverQueue);
    return;
  } else {
    message.channel.send("You need to enter a valid command!");
  }
});

// Main Bot Commands
async function execute(message, serverQueue) {
  const args = message.content.split(" ");

  const voiceChannel = message.member.voice.channel;
  if (!voiceChannel) {
    return message.channel.send(
      "You must be in a voice channel to use this bot"
    );
  }

  const perms = voiceChannel.permissionFor(message.client.user);
  if (!perms.has("CONNECT") || !perms.has("SPEAK")) {
    return message.channel.send(
      "I require permissions to connect and speak!!!!!!!!"
    );
  }

  // Get Song Info using ytdl
  const songInfo = await ytdl.getInfo(args[1]);
  const song = {
    title: songInfo.title,
    url: songInfo.videostats_playback_base_url,
  };

  if (!serverQueue) {
    const queueConstruct = {
      textCh: message.channel,
      voiceChannel: voiceChannel,
      connection: null,
      songs: [],
      volume: 5,
      playing: true,
    };

    queue.set(message.guild.id, queueConstruct);

    queueConstruct.songs.push(song);

    try {
      var connection = await voiceChannel.join();
      queueConstruct.connection = connection;
      play(message.guild, queueConstruct.songs[0]);
    } catch (err) {
      console.log(err);
      queue.delete(message.guild.id);
      return message.channel.send(err);
    }
  } else {
    serverQueue.songs.push(song);
    return message.channel.send(`${song.title} is added to queue`);
  }
}

function skip(message, serverQueue) {
  if (!message.member.voice.channel) {
    return message.channel.send(
      "You have to be in voice channel to use commands"
    );
  }

  if (!serverQueue) {
    return message.channel.send("There are no songs left in the queue");
  }
  serverQueue.connection.dispatcher.end();
  function stop(message, serverQueue) {
    if (!message.member.voice.channel) {
      return message.channel.send(
        "You have to be in voice channel to use commands"
      );
    }
    if (!serverQueue) {
      return message.channel.send("There are no songs left in the queue");
    }

    serverQueue.songs = [];
    serverQueue.connection.dispatcher.end();
  }

  function play(guild, song) {
    const serverQueue = queue.get(guild.id);
    if (!song) {
      serverQueue.voiceChannel.leave();
      queue.delete(guild.id);
      return;
    }
  }
  const dispatcher = serverQueue.connection
    .play(ytdl(song.url))
    .on("finish", () => {
      serverQueue.songs.shift();
      play(guild, serverQueue.songs[0]);
    })
    .on("error", (error) => console.log(error));

  dispatcher.setVolumeLogarithmic(serverQueue.volume / 5);
  serverQueue.textChannel.send(`Playing: ${song.title}`);
}
