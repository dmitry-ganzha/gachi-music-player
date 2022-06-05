"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const discord_js_1 = require("discord.js");
const Config_json_1 = __importDefault(require("../../DataBase/Config.json"));
class ShardManager extends discord_js_1.ShardingManager {
    constructor() {
        super("./src/Core/Client.js", { token: Config_json_1.default.Bot.token, mode: "process", respawn: true, totalShards: "auto" });
        this.on("shardCreate", (shard) => {
            shard.on("spawn", () => console.log(`[ShardManager]: [ShardID: ${shard.id}, Type: Create]`));
            shard.on("ready", () => console.log(`[ShardManager]: [ShardID: ${shard.id}, Type: Ready]`));
            shard.on("death", () => console.log(`[ShardManager]: [ShardID: ${shard.id}, Type: Kill]`));
        });
        this.spawn({ amount: "auto", delay: -1 }).catch((err) => console.log(`[ShardManager]: [Error]: ${err}`));
    }
    ;
}
new ShardManager();
