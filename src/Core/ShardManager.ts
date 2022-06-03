import {Shard, ShardingManager} from "discord.js";
import cfg from "../../DataBase/Config.json";

class ShardManager extends ShardingManager {
    public constructor() {
        super("./src/Core/Client.js", {token: cfg.Bot.token, mode: "process", respawn: true, totalShards: "auto"});
        this.on("shardCreate", (shard: Shard) => {
            shard.on("spawn", () => console.log(`[ShardManager]: [Create]: [ID: ${shard.id}]`));
            shard.on("ready", () => console.log(`[ShardManager]: [Ready]: [ID: ${shard.id}]`));
            shard.on("death", () => console.log(`[ShardManager]: [Kill]: [ID: ${shard.id}]`));
        });

        this.spawn({amount: 1, delay: -1}).catch((err: Error) => console.log(`[ShardManager]: [Error]: ${err}`));
    };
}
new ShardManager();
