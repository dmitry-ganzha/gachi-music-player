import {Shard, ShardingManager} from "discord.js";
import * as cfg from "../../db/Config.json";
console.log(`
░██╗░░░░░░░██╗░█████╗░████████╗██╗░░██╗██╗░░░░░░█████╗░██╗░░██╗░░░░░░██████╗░░█████╗░████████╗
░██║░░██╗░░██║██╔══██╗╚══██╔══╝██║░██╔╝██║░░░░░██╔══██╗██║░██╔╝░░░░░░██╔══██╗██╔══██╗╚══██╔══╝
░╚██╗████╗██╔╝███████║░░░██║░░░█████═╝░██║░░░░░██║░░██║█████═╝░█████╗██████╦╝██║░░██║░░░██║░░░
░░████╔═████║░██╔══██║░░░██║░░░██╔═██╗░██║░░░░░██║░░██║██╔═██╗░╚════╝██╔══██╗██║░░██║░░░██║░░░
░░╚██╔╝░╚██╔╝░██║░░██║░░░██║░░░██║░╚██╗███████╗╚█████╔╝██║░╚██╗░░░░░░██████╦╝╚█████╔╝░░░██║░░░
░░░╚═╝░░░╚═╝░░╚═╝░░╚═╝░░░╚═╝░░░╚═╝░░╚═╝╚══════╝░╚════╝░╚═╝░░╚═╝░░░░░░╚═════╝░░╚════╝░░░░╚═╝░░░
`)

class ShardManager extends ShardingManager {
    constructor() {
        super('./Core/Client/Client.js', {token: cfg.Bot.token, mode: "process", respawn: true, totalShards: "auto", shardList: "auto"});
        this.on('shardCreate', (shard: Shard) => console.log(`[ShardManager]: [Create]: [ID: ${shard.id}]`));
        this.spawn().then();
    }
}
new ShardManager();