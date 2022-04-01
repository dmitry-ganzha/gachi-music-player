import {Shard, ShardingManager} from "discord.js";
import cfg from "../../DataBase/Config.json";
console.log(`
░██╗░░░░░░░██╗░█████╗░████████╗██╗░░██╗██╗░░░░░░█████╗░██╗░░██╗░░░░░░██████╗░░█████╗░████████╗
░██║░░██╗░░██║██╔══██╗╚══██╔══╝██║░██╔╝██║░░░░░██╔══██╗██║░██╔╝░░░░░░██╔══██╗██╔══██╗╚══██╔══╝
░╚██╗████╗██╔╝███████║░░░██║░░░█████═╝░██║░░░░░██║░░██║█████═╝░█████╗██████╦╝██║░░██║░░░██║░░░
░░████╔═████║░██╔══██║░░░██║░░░██╔═██╗░██║░░░░░██║░░██║██╔═██╗░╚════╝██╔══██╗██║░░██║░░░██║░░░
░░╚██╔╝░╚██╔╝░██║░░██║░░░██║░░░██║░╚██╗███████╗╚█████╔╝██║░╚██╗░░░░░░██████╦╝╚█████╔╝░░░██║░░░
░░░╚═╝░░░╚═╝░░╚═╝░░╚═╝░░░╚═╝░░░╚═╝░░╚═╝╚══════╝░╚════╝░╚═╝░░╚═╝░░░░░░╚═════╝░░╚════╝░░░░╚═╝░░░
`);

class ShardManager extends ShardingManager {
    public constructor() {
        super('./Core/Client/Client.js', {token: cfg.Bot.token, mode: "worker", respawn: true, totalShards: "auto"});
        this.on('shardCreate', (shard: Shard) => {
            console.log(`[ShardManager]: [Create]: [ID: ${shard.id}]`);
        });
        this.AsyncSpawn().catch((err: Error) => console.log(`[ShardManager]: [Error]: ${err}`));
    };
    protected AsyncSpawn = () => this.spawn({amount: "auto"});
}
new ShardManager();