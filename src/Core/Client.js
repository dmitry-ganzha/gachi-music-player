"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ClientInteraction = exports.ClientMessage = exports.WatKLOK = void 0;
const discord_js_1 = require("discord.js");
const FileSystem_1 = require("./FileSystem");
const execute_1 = require("./Player/execute");
const LiteUtils_1 = require("./Utils/LiteUtils");
const keepOverLimit = (value) => value.id !== value.client.user.id;
class WatKLOK extends discord_js_1.Client {
    constructor() {
        super({
            makeCache: discord_js_1.Options.cacheWithLimits({
                BaseGuildEmojiManager: 0,
                GuildBanManager: 0,
                GuildInviteManager: 0,
                GuildStickerManager: 0,
                GuildScheduledEventManager: 0,
                PresenceManager: 0,
                StageInstanceManager: 0,
                ThreadManager: 0,
                ThreadMemberManager: 0,
                UserManager: { keepOverLimit },
                GuildMemberManager: { keepOverLimit },
                VoiceStateManager: { keepOverLimit },
                MessageManager: { keepOverLimit },
                ReactionManager: { keepOverLimit },
                ReactionUserManager: { keepOverLimit },
                GuildEmojiManager: { keepOverLimit }
            }),
            intents: (Object.keys(discord_js_1.IntentsBitField.Flags)),
            ws: {
                properties: {
                    $browser: "Web"
                }
            },
            presence: {
                activities: [{
                        name: "music on youtube, spotify, soundcloud",
                        type: discord_js_1.ActivityType.Listening
                    }]
            }
        });
        this.commands = new LiteUtils_1.CollectionMap();
        this.aliases = new LiteUtils_1.CollectionMap();
        this.queue = new LiteUtils_1.CollectionMap();
        this.cfg = require('../../DataBase/Config.json');
        this.Send = LiteUtils_1.MessageChannelSend;
        this.ConvertedText = LiteUtils_1.ConvertedText;
        this.connections = LiteUtils_1.Connections;
        this.player = new execute_1.PlayerEmitter();
        this.ShardID = this.shard?.ids[0];
        this.console = (text) => {
            if (this.ShardID !== undefined)
                return (0, LiteUtils_1.ConsoleLog)(`[ShardID: ${this.ShardID}] -> ` + text);
            return (0, LiteUtils_1.ConsoleLog)(text);
        };
    }
    ;
}
exports.WatKLOK = WatKLOK;
class ClientMessage extends discord_js_1.Message {
}
exports.ClientMessage = ClientMessage;
class ClientInteraction extends discord_js_1.Interaction {
}
exports.ClientInteraction = ClientInteraction;
const client = new WatKLOK();
client.login(client.cfg.Bot.token).then(() => {
    Promise.all([(0, FileSystem_1.FileSystemLoad)(client)]).catch(console.error);
    if (client.cfg.Bot.ignoreError) {
        process.on('uncaughtException', (err) => {
            console.error(err);
            if (err.toString() === 'Error: connect ECONNREFUSED 127.0.0.1:443')
                return null;
            try {
                const channel = client.channels.cache.get(client.cfg.Channels.SendErrors);
                if (channel)
                    return channel.send(`${err.toString()}`);
                return null;
            }
            catch { }
        });
    }
});
