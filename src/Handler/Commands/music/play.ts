import {FailRegisterPlatform, SearchPlatforms,supportPlatforms,SupportPlatforms,SupportType,TypePlatform} from "@Structures/SongSupport";
import {ClientInteractive, ClientMessage, UtilsMsg} from "@Client/interactionCreate";
import {Command, replacer, ResolveData} from "@Structures/Handle/Command";
import {ArraySort} from "@Handler/Modules/Object/ArraySort";
import {ApplicationCommandOptionType} from "discord.js";
import {InputPlaylist, InputTrack} from "@Queue/Song";
import {DurationUtils} from "@Managers/DurationUtils";
import {ReactionMenuSettings} from "@db/Config.json";
import {Queue} from "@Queue/Queue";
interface Options {
    platform?: supportPlatforms
    message: ClientInteractive
}

const UrlSrt = /^(https?:\/\/)/gi;
const emoji = ReactionMenuSettings.emojis.cancel;


export class Play extends Command {
    public constructor() {
        super({
            name: "play",
            aliases: ["p", "playing", "з"],
            description: "Включение музыки по ссылке или названию, можно прикрепить свой файл!",
            usage: "name song | url song | platform name song",

            permissions: {client: ["Speak", "Connect"], user: []},
            options: [
                {
                    name: "parameter",
                    description: "Название трека, ссылку на трек или тип yt, sp, sc, vk!",
                    required: true,
                    type: ApplicationCommandOptionType.String
                },
                {
                    name: "search",
                    description: "Прошлый аргумент должен быть тип, теперь укажи название трека!",
                    required: false,
                    type: ApplicationCommandOptionType.String
                }
            ],

            isEnable: true,
            isSlash: true,

            isCLD: 8
        });
    };

    public readonly run = (message: ClientMessage, args: string[]): ResolveData | Promise<ResolveData> => {
        const {author, member, guild, client} = message;
        const queue: Queue = client.queue.get(guild.id);
        const search: string = args.join(" ") ?? message.attachments?.last()?.url;
        const voiceChannel = member?.voice;

        //Если пользователь не подключен к голосовым каналам
        if (!voiceChannel?.channel || !voiceChannel) return { text: `${author}, Подключись к голосовому каналу!`, color: "DarkRed" };

        //Если есть очередь и пользователь не подключен к тому же голосовому каналу
        if (queue && queue.voice && voiceChannel?.channel?.id !== queue.voice.id) return {
            text: `${author}, Музыка уже играет в другом голосовом канале!\nМузыка включена тут <#${queue.voice.id}>`,
            color: "DarkRed"
        };

        //Если пользователь не указал аргумент
        if (!search) return { text: `${author}, Укажи ссылку, название или прикрепи файл!`, color: "DarkRed" };

        try {
            return getInfoForType(message, search);
        } catch (e) {
            return { text: `Произошла ошибка -> ${search}\n${e}`, color: "DarkRed", codeBlock: "css" };
        }
    };
}

/**
 * @description Получаем данные из базы по данным
 * @param message {ClientMessage} Сообщение с сервера
 * @param search {string} Что требует пользователь
 */
function getInfoForType(message: ClientMessage, search: string): Promise<ResolveData> | ResolveData {
    const {author, client} = message;
    const voiceChannel = message.member.voice;
    const type = IdentifyType.track(search); //Тип запроса
    const {platform, args} = IdentifyType.platform(search); //Платформа с которой будем взаимодействовать

    //Если нельзя получить данные с определенной платформы
    if (FailRegisterPlatform.has(platform)) return {
        text: `${author}, я не могу взять данные с этой платформы **${platform}**\n Причина: [**Authorization data not found**]`, color: "DarkRed", codeBlock: "css"
    };

    const findPlatform = SupportPlatforms[platform]; //Ищем в списке платформу
    const findType = (findPlatform as any)[type]; //Ищем тип запроса

    if (!findPlatform) return { text: `${author}, у меня нет поддержки такой платформы!\nПлатформа **${platform}**!`, color: "DarkRed" };
    else if (!findType) return { text: `${author}, у меня нет поддержки этого типа запроса!\nТип запроса **${type}**!`, color: "DarkRed" };

    const runCallback = findType(args) as Promise<InputTrack | InputPlaylist | InputTrack[]>;

    //Если выходит ошибка
    runCallback.catch((err) => UtilsMsg.createMessage({ text: `${author}, данные не были найдены!\nПричина: ${err}`, color: "DarkRed", message }));

    return runCallback.then((data: InputTrack | InputPlaylist | InputTrack[]): ResolveData => {
        if (!data) return {text: `${author}, данные не были найдены!`, color: "Yellow"};

        //Если пользователь ищет трек
        if (data instanceof Array) return SearchMessage.toSend(data, {message, platform});

        //Загружаем трек или плейлист в GuildQueue
        client.player.play(message as any, voiceChannel.channel, data);

        //Сообщаем что трек был найден
        if (type === "track") return { text: `Найден 🔍 | ${type}\n➜ ${data.title}`, color: "Yellow", codeBlock: "css" };
    });
}

//Вспомогательные функции
namespace IdentifyType {
    /**
     * @description Независимо от платформы делаем проверку типа ссылки
     * @param search {string} Что там написал пользователь
     */
    export function track(search: string): SupportType {
        if (!search) return "track"; //Если нет search, значит пользователь прикрепил файл

        //Если ссылка, то это может быть плейлист, альбом или просто трек
        if (search.match(UrlSrt)) {
            if (search.match(/playlist/)) return "playlist";
            else if ((search.match(/album/) || search.match(/sets/)) && !search.match(/track/)) return "album";
            return "track";
        }
        return "search";
    }

    //====================== ====================== ====================== ======================
    /**
     * @description Получаем инициалы платформы
     * @param search {string} Что там написал пользователь
     */
    export function platform(search: string): { platform: supportPlatforms, args: string } {
        if (!search) return {platform: "DISCORD", args: search}; //Если нет search, значит пользователь прикрепил файл

        if (search.match(UrlSrt)) return {platform: TypePlatform(search), args: search};

        const spSearch = search.split(' '), pl = spSearch[0].toLowerCase();
        const platform = Object.entries(SearchPlatforms).find(([key, value]) => value.includes(pl) || key === pl);

        if (platform) {
            spSearch.splice(0, 1);

            return {platform: platform[0] as supportPlatforms, args: spSearch.join(" ")};
        }
        return {platform: "YOUTUBE", args: search};
    }
}

//Выводим список треков для выбора пользователем
namespace SearchMessage {
    /**
     * @description Отправляем сообщение о том что удалось найти
     * @param results {InputTrack[]} Результаты поиска
     * @param options {Options}
     * @requires {Reaction, deleteMessage}
     */
    export function toSend(results: InputTrack[], options: Options): ResolveData {
        const {message, platform} = options;
        const {author, client} = message;

        if (results.length < 1) return { text: `${author} | Я не смог найти музыку с таким названием. Попробуй другое название!`, color: "DarkRed" };

        const choice = `Выбери от 1 до ${results.length}`;
        const requester = `[Платформа: ${platform} | Запросил: ${author.username}]`;
        const songsList = ArraySort<InputTrack>(15, results, (track, index ) => {
            const Duration = platform === "YOUTUBE" ? track.duration.seconds : DurationUtils.ParsingTimeToString(parseInt(track.duration.seconds)); //Проверяем надо ли конвертировать время
            const NameTrack = `[${replacer.replaceText(track.title, 80, true)}]`; //Название трека
            const DurationTrack = `[${Duration ?? "LIVE"}]`; //Длительность трека
            const AuthorTrack = `[${replacer.replaceText(track.author.title, 12, true)}]`; //Автор трека

            return `${index+1} ➜ ${DurationTrack} | ${AuthorTrack} | ${NameTrack}`;
        });
        const callback = (msg: ClientMessage) => {
            //Создаем сборщик
            const collector = UtilsMsg.createCollector(msg.channel, (m) => {
                const messageNum = parseInt(m.content);
                return !isNaN(messageNum) && messageNum <= results.length && messageNum > 0 && m.author.id === author.id;
            });

            //Делаем что-бы при нажатии на эмодзи удалялся сборщик
            UtilsMsg.createReaction(msg, emoji,
                (reaction, user) => reaction.emoji.name === emoji && user.id !== client.user.id,
                () => {
                    UtilsMsg.deleteMessage(msg, 1e3); //Удаляем сообщение
                    collector?.stop();
                },
                30e3
            );

            //Если пользователь нечего не выбрал, то удаляем сборщик и сообщение через 30 сек
            setTimeout(() => {
                UtilsMsg.deleteMessage(msg, 1e3); //Удаляем сообщение
                collector?.stop();
            }, 30e3);

            //Что будет делать сборщик после нахождения числа
            collector.once("collect", (m: any): void => {
                setImmediate(() => {
                    [msg, m].forEach(UtilsMsg.deleteMessage); //Удаляем сообщения, бота и пользователя
                    collector?.stop(); //Уничтожаем сборщик

                    //Получаем ссылку на трек, затем включаем его
                    const url = results[parseInt(m.content) - 1].url;
                    return getInfoForType(message as any, url);
                });
            });
        };

        return {text: `${choice}\n${requester}\n\n${songsList}`, codeBlock: "css", notAttachEmbed: true, thenCallbacks: [callback]}
    }
}