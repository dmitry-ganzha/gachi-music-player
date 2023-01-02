import {ShardingManager} from "discord.js";
import {env} from "@env"

//Используется для большого кол-ва серверов. Если у вас более 1к, тогда рекомендуется запускать ShardManager
class ShardManager extends ShardingManager {
    public constructor() {
        super("src/Core/Client/Client.js", {
            token: env.get("TOKEN"),
            mode: "process",
            respawn: true,
            totalShards: "auto",
            execArgv: ["-r src/Core/register"]
        });
        //Ивент создания дубликата
        this.on("shardCreate", (shard) => {
            shard.once("spawn", () => console.log(`[ShardManager]: [ShardID: ${shard.id}, Type: Create]`));
            shard.once("ready", () => console.log(`[ShardManager]: [ShardID: ${shard.id}, Type: Ready]`));
            shard.once("death", () => console.log(`[ShardManager]: [ShardID: ${shard.id}, Type: Kill]`));
        });

        //Создаем дубликат
        this.spawn({amount: "auto", delay: -1}).catch(() => null)//.catch((err: Error) => console.log(`[ShardManager]: [Error]: ${err}`));
    };
}
new ShardManager();