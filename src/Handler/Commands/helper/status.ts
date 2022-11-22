import {Command} from "../../../Structures/Command";
import {ClientMessage, EmbedConstructor} from "../../Events/Activity/interactiveCreate";
import {SupportPlatforms, supportPlatforms, SupportType, FailRegisterPlatform} from "../../../AudioPlayer/Structures/SongSupport";
import {Colors} from "discord.js";
import {ReactionMenu} from "../../../Core/Utils/ReactionMenu";
import {DurationUtils} from "../../../AudioPlayer/Managers/DurationUtils";

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

    public readonly run = (message: ClientMessage): any => {
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
        embed.thumbnail = { url: message.client.user.displayAvatarURL() };
        embed.footer = {
            text: `${message.author.username} | Лист 1 из ${parsePlatforms.length} | Uptime: ${ParsingTimeToString(message.client.uptime / 1000)}`,
            iconURL: message.author.displayAvatarURL()
        };

        //Создаем интерактивное меню
        return new ReactionMenu(embed, message, ReactionMenu.Callbacks(1, parsePlatforms, embed));
    };
}