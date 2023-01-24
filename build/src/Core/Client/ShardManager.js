"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const discord_js_1 = require("discord.js");
const _env_1 = require("@env");
class ShardManager extends discord_js_1.ShardingManager {
    constructor() {
        super("./src/Core/Client/Client.js", { token: _env_1.env.get("TOKEN"), mode: "process", respawn: true, totalShards: "auto", execArgv: ["-r", "tsconfig-paths/register"] });
        this.on("shardCreate", (shard) => {
            shard.once("spawn", () => console.log(`[ShardManager]: [ShardID: ${shard.id}, Type: Create]`));
            shard.once("ready", () => console.log(`[ShardManager]: [ShardID: ${shard.id}, Type: Ready]`));
            shard.once("death", () => console.log(`[ShardManager]: [ShardID: ${shard.id}, Type: Kill]`));
        });
        this.spawn({ amount: "auto", delay: -1 }).catch((err) => console.log(`[ShardManager]: [Error]: ${err}`));
    }
    ;
}
new ShardManager();
