import {SupportPlatforms, supportPlatforms, SupportType, FailRegisterPlatform} from "@Structures/SongSupport";
import {ClientMessage, EmbedConstructor} from "@Client/interactionCreate";
import {Command, ResolveData} from "@Structures/Handle/Command";
import {ReactionMenu} from "@Structures/ReactionMenu";
import {DurationUtils} from "@Managers/DurationUtils";
import {Colors} from "discord.js";

const ParsingTimeToString = DurationUtils.ParsingTimeToString;

export default class Status extends Command {
    public constructor() {
        super({
            name: "status",
            aliases: ["state", "platforms"],
            description: "Проверка работоспособности платформ!",

            isGuild: false,
            isSlash: true,
            isEnable: true,

            isCLD: 10
        });
    };

    public readonly run = (message: ClientMessage): ResolveData => {
        const {author, client} = message;
        const Platforms = Object.keys(SupportPlatforms) as supportPlatforms[];
        const parsePlatforms: string[] = [];

        //Собираем данные со всех доступных платформ
        for (let i in Platforms) {
            const platform = Platforms[i] as supportPlatforms;
            const types = Object.keys(SupportPlatforms[platform]) as SupportType[];
            let text = `Платформа [**${platform}**] | Кол-во доступных запросов [**${types.length}**]`;

            //Если нет данных авторизации для платформы
            if (FailRegisterPlatform.has(platform)) text+= "| **Нет данных авторизации**";
            text+="\n";

            //Собираем все доступные запросы для показа
            types.forEach((type) => text+= `
                    **❯** Запрос **${type}:** Доступен для использования`);
            parsePlatforms.push(text);
        }

        //Создаем embed data
        const embed: EmbedConstructor = { color: Colors.Yellow, description: parsePlatforms[0], timestamp: new Date() };
        embed.thumbnail = { url: client.user.displayAvatarURL() };
        embed.footer = {
            text: `${author.username} | Лист 1 из ${parsePlatforms.length} | Uptime: ${ParsingTimeToString(client.uptime / 1000)}`,
            iconURL: author.displayAvatarURL()
        };

        //Создаем интерактивное меню
        return {embed, callbacks: ReactionMenu.Callbacks(1, parsePlatforms, embed)}
    };
}