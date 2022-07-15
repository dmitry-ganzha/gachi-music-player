import {Command} from "../Constructor";
import {
    ApplicationCommandOptionType,
    StageChannel,
    VoiceChannel
} from "discord.js";
import {ClientMessage} from "../../Core/Client";
import {Queue} from "../../Core/Player/Structures/Queue/Queue";
import {FindTrackInfo} from "../../Core/Player/Audio/FindResource";

const youtubeStr = /^(https?:\/\/)?(www\.)?(m\.)?(music\.)?( )?(youtube\.com|youtu\.?be)\/.+$/gi;
const spotifySrt = /^(https?:\/\/)?(open\.)?(m\.)?(spotify\.com|spotify\.?ru)\/.+$/gi;
const SoundCloudSrt = /^(?:(https?):\/\/)?(?:(?:www|m)\.)?(api\.soundcloud\.com|soundcloud\.com|snd\.sc)\/(.*)$/;
const UrlSrt = /^(https?:\/\/)/gi;
const {getSoundCloud, getVk, getSpotify, getYouTube, getDiscord} = FindTrackInfo;

export class CommandPlay extends Command {
    public constructor() {
        super({
            name: "play",
            aliases: ["p", "playing", "з"],
            description: "Включение музыки по ссылке или названию, можно прикрепить свой файл!",

            permissions: {client: ["Speak", "Connect"], user: []},
            options: [
                {
                    name: "url-name-type",
                    description: "Укажи что нужно, ссылку, название или тип поиска и название",
                    required: true,
                    type: ApplicationCommandOptionType.String
                },
                {
                    name: "search",
                    description: "Прошлый аргумент, тип? Если да, тут название трека!",
                    required: false,
                    type: ApplicationCommandOptionType.String
                }
            ],
            enable: true,
            slash: true,
            CoolDown: 8
        })
    };

    public readonly run = (message: ClientMessage, args: string[]): void => {
        const voiceChannel: VoiceChannel | StageChannel = message.member.voice.channel;
        const queue: Queue = message.client.queue.get(message.guild.id);
        const search: string = args.join(" ");

        //Если есть очередь и пользователь не подключен к тому же голосовому каналу
        if (queue && queue.channels.voice && message.member.voice.channel.id !== queue.channels.voice.id) return message.client.Send({
            text: `${message.author}, Музыка уже играет в другом голосовом канале!\nМузыка включена тут <#${queue.channels.voice.id}>`,
            message,
            color: "RED"
        });

        //Если пользователь не подключен к голосовым каналам
        if (!voiceChannel || !message.member.voice) return message.client.Send({
            text: `${message.author}, Подключись к голосовому каналу!`,
            message,
            color: "RED"
        });

        //Если пользователь не указал аргумент
        if (!search && !message.attachments) return message.client.Send({
            text: `${message.author}, Укажи ссылку, название или прикрепи файл!`,
            message,
            color: "RED"
        });

        try {
            //Отправляем сообщение о поиске трека
            message.client.Send({
                text: `🔍 | Поиск -> ${search}`,
                message,
                color: "RED",
                type: "css"
            });

            return this.#getInfoPlatform(search, message, voiceChannel);
        } catch (e) {
            console.log(`[Command: Play]: ${e}`);
            return message.client.Send({
                text: `${message.author.username} | Произошла ошибка: ${e}`,
                message,
                color: "RED",
                type: "css"
            });
        }
    };
    //Выбираем платформу
    readonly #getInfoPlatform = (search: string, message: ClientMessage, voiceChannel: VoiceChannel | StageChannel): void => {
        if (search.match(UrlSrt)) {
            const TypeSearch = this.#typeSong(search);

            if (search.match(youtubeStr)) return getYouTube(TypeSearch, search, message, voiceChannel);
            else if (search.match(spotifySrt)) return getSpotify(TypeSearch, search, message, voiceChannel);
            else if (search.match(/vk.com/)) return getVk(TypeSearch, search, message, voiceChannel);
            else if (search.match(SoundCloudSrt)) return getSoundCloud(TypeSearch, search, message, voiceChannel);
            else if (search.match(/cdn.discordapp.com/) || message.attachments?.last()?.url) return getDiscord(TypeSearch, search, message, voiceChannel);
        }
        const SplitSearch = search.split(' ');
        const SearchType = SplitSearch[0].toLowerCase();

        //Ищем если аргумент не ссылка
        switch (SearchType) {
            case "sp": { //Ищем в Spotify
                delete SplitSearch[0];
                return getSpotify("search", SplitSearch.join(' '), message, voiceChannel);
            }
            case "vk": { //Ищем в VK
                delete SplitSearch[0];
                return getVk("search", SplitSearch.join(' '), message, voiceChannel);
            }
            case "sc": { //Ищем на SoundCloud
                delete SplitSearch[0];
                return getSoundCloud("search", SplitSearch.join(' '), message, voiceChannel);
            }
            default: {
                //Ищем на YouTube
                return getYouTube("search", SplitSearch.join(' '), message, voiceChannel);
            }
        }
    };

    /**
     * @description Независимо от платформы делаем проверку типа ссылки
     * @param search
     * @private
     */
    readonly #typeSong = (search: string) => {
        if (search.match(/v=/) && search.match(/list=/)) return "change";
        else if (search.match(/playlist/)) return "playlist";
        else if (search.match(/album/) || search.match(/sets/)) return "album";
        return "track";
    };
}