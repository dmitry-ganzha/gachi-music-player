"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.WatKLOK = exports.consoleTime = void 0;
const discord_js_1 = require("discord.js");
const DurationUtils_1 = require("@AudioPlayer/Managers/DurationUtils");
const Config_json_1 = require("@db/Config.json");
const index_1 = require("@AudioPlayer/index");
const _FileSystem_1 = require("@FileSystem");
const _env_1 = require("@env");
function consoleTime(data) {
    const date = new Date();
    const reformatDate = [date.getHours(), date.getMinutes(), date.getSeconds()].map(DurationUtils_1.DurationUtils.toFixed0);
    return console.log(`[${reformatDate.join(":")}.${date.getMilliseconds()}] ${data}`);
}
exports.consoleTime = consoleTime;
class CollectionMap extends Map {
    get Array() {
        const db = [];
        for (const [, value] of this.entries())
            db.push(value);
        return db;
    }
    ;
}
function DefaultKeepOverLimit(value) {
    return discord_js_1.SnowflakeUtil.timestampFrom(value.channelId) < Date.now() - 25e5;
}
class WatKLOK extends discord_js_1.Client {
    _queue = new CollectionMap();
    _commands = new CollectionMap();
    _player = index_1.Player;
    _ShardID = this.shard?.ids[0] ?? undefined;
    get commands() { return this._commands; }
    ;
    get queue() { return this._queue; }
    ;
    get player() { return this._player; }
    ;
    get ShardID() { return this._ShardID; }
    ;
    constructor() {
        super({
            sweepers: { ...discord_js_1.Options.DefaultSweeperSettings,
                messages: {
                    interval: 1800,
                    lifetime: 900
                }
            },
            makeCache: discord_js_1.Options.cacheWithLimits({
                ...discord_js_1.Options.DefaultMakeCacheSettings,
                AutoModerationRuleManager: 0,
                PresenceManager: 0,
                GuildStickerManager: 0,
                GuildBanManager: 0,
                GuildForumThreadManager: 0,
                StageInstanceManager: 0,
                GuildInviteManager: 0,
                GuildScheduledEventManager: 0,
                VoiceStateManager: {
                    maxSize: Infinity,
                    keepOverLimit: DefaultKeepOverLimit
                },
                MessageManager: {
                    maxSize: Infinity,
                    keepOverLimit: DefaultKeepOverLimit
                },
                ReactionManager: {
                    maxSize: Infinity,
                    keepOverLimit: DefaultKeepOverLimit
                },
                ReactionUserManager: {
                    maxSize: Infinity,
                    keepOverLimit: DefaultKeepOverLimit
                },
                GuildEmojiManager: {
                    maxSize: Infinity,
                    keepOverLimit: DefaultKeepOverLimit
                },
                BaseGuildEmojiManager: {
                    maxSize: Infinity,
                    keepOverLimit: DefaultKeepOverLimit
                }
            }),
            intents: [
                discord_js_1.IntentsBitField.Flags.GuildMessages,
                discord_js_1.IntentsBitField.Flags.DirectMessages,
                discord_js_1.IntentsBitField.Flags.GuildMessageReactions,
                discord_js_1.IntentsBitField.Flags.DirectMessageReactions,
                discord_js_1.IntentsBitField.Flags.GuildEmojisAndStickers,
                discord_js_1.IntentsBitField.Flags.GuildIntegrations,
                discord_js_1.IntentsBitField.Flags.MessageContent,
                discord_js_1.IntentsBitField.Flags.GuildVoiceStates,
                discord_js_1.IntentsBitField.Flags.Guilds,
            ],
            ws: { properties: { browser: "Web" } },
            presence: {
                activities: [{
                        name: "музыку в youtube, spotify, soundcloud, vk",
                        type: discord_js_1.ActivityType.Listening
                    }]
            }
        });
    }
    ;
    login(token = _env_1.env.get("TOKEN")) {
        (0, _FileSystem_1.LoadFiles)(this);
        return super.login("MTA2NzEzOTUyNDM0MzM2OTgwOQ.Gn1i2E.BFvQnbkMx1_wLbEj5h_si2YmwZJyOt0YgLXiUA");
    }
    ;
}
exports.WatKLOK = WatKLOK;
const client = new WatKLOK();
client.login().then(() => {
    if (Config_json_1.Bot.ignoreErrors)
        process.on("uncaughtException", (err) => {
            consoleTime(`[IgnoreError]: ${err.name} | ${err.message}\n${err.stack}`);
            try {
                const channel = client.channels.cache.get(Config_json_1.Channels.sendErrors);
                if (channel)
                    channel.send({ content: `\`\`\`ts\nError: ${err.message}\nType: ${err.name}\n\nFull Error: ${err.stack}\n\`\`\`` }).catch(() => null);
            }
            catch { }
        });
});
