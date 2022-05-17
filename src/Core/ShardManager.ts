import {Shard, ShardingManager} from "discord.js";
import cfg from "../../DataBase/Config.json";

class ShardManager extends ShardingManager {
    public constructor() {
        super('./src/Core/Client.js', {token: cfg.Bot.token, mode: "process", respawn: true, totalShards: "auto"});
        this.on('shardCreate', (shard: Shard) => {
            console.log(`[ShardManager]: [Create]: [ID: ${shard.id}]`);
        });

        this.spawn({amount: 1, delay: -1}).catch((err: Error) => console.log(`[ShardManager]: [Error]: ${err}`));
    };
}
new ShardManager();