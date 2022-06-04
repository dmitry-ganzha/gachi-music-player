import {Shard, ShardingManager} from "discord.js";
import cfg from "../../DataBase/Config.json";

class ShardManager extends ShardingManager {
    public constructor() {
        super("./src/Core/Client.js", {token: cfg.Bot.token, mode: "process", respawn: true, totalShards: "auto"});
        this.on("shardCreate", (shard: Shard) => {
            shard.on("spawn", () => console.log(`[ShardManager]: [ShardID: ${shard.id}, Type: Create]`));
            shard.on("ready", () => console.log(`[ShardManager]: [ShardID: ${shard.id}, Type: Ready]`));
            shard.on("death", () => console.log(`[ShardManager]: [ShardID: ${shard.id}, Type: Kill]`));
        });

        this.spawn({amount: "auto", delay: -1}).catch((err: Error) => console.log(`[ShardManager]: [Error]: ${err}`));
    };
}
new ShardManager();