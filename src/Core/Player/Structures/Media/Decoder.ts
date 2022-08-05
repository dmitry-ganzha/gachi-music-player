import JsonFFmpeg from "../../../../../DataBase/FFmpeg.json";
import {AudioFilters} from "../Queue/Queue";
import {opus} from "prism-media";
import {PassThrough} from "stream";
import {httpsClient} from "../../../httpsClient";
import {IncomingMessage} from "http";
import {FFmpeg} from "./FFmpeg";
import {YouTube} from "../../../Platforms";
import {InputTrack} from "../../../Utils/TypeHelper";

//Сюда после запуска файла будут записаны статичные фильтры. Статичные фильтры - фильтры в которых модификатор скорости записан и его не может указать пользователь
let FiltersStatic = {};

//Загружаем статичные фильтры
(() => {
    Object.entries(JsonFFmpeg.FilterConfigurator).forEach(([key, object]) => {
        if ("speedModification" in object) FiltersStatic = {...FiltersStatic, [key]: object.speedModification};
    });
})();

//Все доступные типы декодирования аудио
export namespace Decoder {
    /**
     * С помощью FFmpeg конвертирует любой формат в opus
     */
    export class All extends opus.OggDemuxer {
        readonly #FFmpeg: FFmpeg.FFmpeg;
        readonly #TimeFrame: number;
        #started = false;
        #playbackDuration = 0;

        //Общее время проигрывание текущего ресурса
        public get duration() {
            return this.#playbackDuration;
        };
        public set duration(duration: number) {
            this.#playbackDuration = duration;
        };
        //====================== ====================== ====================== ======================
        /**
         * @description Проверяем можно ли читать поток
         */
        public get hasStarted() {
            return this.#started;
        };
        //====================== ====================== ====================== ======================
        /**
         * @description Декодируем в opus
         * @param parameters {Options}
         * @requires {DecoderUtils}
         */
        public constructor(parameters: {url: string | Decoder.Dash, seek?: number, Filters?: AudioFilters}) {
            super({autoDestroy: true});
            if (parameters.url instanceof Decoder.Dash) {
                //Даем FFmpeg'у, ссылку с которой надо скачать поток
                this.#FFmpeg = new FFmpeg.FFmpeg(DecoderUtils.CreateArguments(null, null, 0));
                parameters.url.pipe(this.#FFmpeg);
            } else {
                //Даем FFmpeg'у, ссылку с которой надо скачать поток
                this.#FFmpeg = new FFmpeg.FFmpeg(DecoderUtils.CreateArguments(parameters.url, parameters?.Filters, parameters?.seek));
            }
            this.#FFmpeg.pipe(this); //Загружаем из FFmpeg'a в opus.OggDemuxer

            //Проверяем сколько времени длится пакет
            this.#TimeFrame = parameters?.Filters.length > 0 ? DecoderUtils.timeFrame(parameters?.Filters) : 20;

            //Когда можно будет читать поток записываем его в <this.#started>
            this.once("readable", () => (this.#started = true));
            //Если в <this.playStream> будет один из этих статусов, чистим память!
            ["end", "close", "error"].forEach((event) => this.once(event, this.destroy));
        };
        //====================== ====================== ====================== ======================
        /**
         * @description Получаем пакет и проверяем не пустой ли он если не пустой к таймеру добавляем 20 мс
         */
        public readonly read = (): Buffer | null => {
            const packet: Buffer = super.read();

            if (packet) this.duration += this.#TimeFrame;

            return packet;
        };
        //====================== ====================== ====================== ======================
        /**
         * @description Чистим память!
         */
        public readonly _destroy = (): void => {
            if (this.#FFmpeg) this.#FFmpeg?.destroy();
            if (!super.destroyed) super.destroy();

            //Удаляем с задержкой (чтоб убрать некоторые ошибки)
            setTimeout(() => {
                if (this && !this?.destroyed) {
                    super.destroy();
                    this?.removeAllListeners();
                    this?.destroy();
                }
            }, 125);
        };
    }
    //====================== ====================== ====================== ======================
    /**
     * @description Загружаем стрим для дальнейшей расшифровки
     */
    export class Dash extends PassThrough {
        #request: IncomingMessage; //httpsClient<Request>
        #NumberUrl: number = 0; //Номер ссылки

        readonly #precache: number = 3; //Буфер
        readonly #urls: {
            dash: string; //Dash ссылка
            base: string; //Ссылка на домен
            video: string; //Ссылка на видео
        }
        //====================== ====================== ====================== ======================
        /**
         * @description Для начала нужна dash ссылка (работает только с youtube)
         * @param dash {string} Ссылка на dash файл
         * @param video {string} Ссылка на видео
         */
        public constructor(dash: string, video: string) {
            super({highWaterMark: 5 * 1000 * 1000, autoDestroy: true});
            this.#urls = {
                dash, base: "", video
            };

            this.#DecodeDashManifest().catch((err) => console.log(err));
            this.once("end", this.destroy);
        };
        //====================== ====================== ====================== ======================
        /**
         * @description Расшифровывает DashManifest, требуется сделать только один раз
         * @private
         */
        readonly #DecodeDashManifest = async () => {
            const req = await httpsClient.parseBody(this.#urls.dash);
            const audioFormat = req.split('<AdaptationSet id="0"')[1].split('</AdaptationSet>')[0].split('</Representation>');

            if (audioFormat[audioFormat.length - 1] === '') audioFormat.pop();

            //Записываем домен с которого будет скачивать поток
            this.#urls.base = audioFormat[audioFormat.length - 1].split('<BaseURL>')[1].split('</BaseURL>')[0];

            //Просим домен сгенерировать ссылки для дальнейшей загрузки потока
            await httpsClient.Request(`https://${new URL(this.#urls.base).host}/generate_204`);

            //Если нет определенного номера для старта
            if (this.#NumberUrl === 0) {
                //Получаем лист ссылками
                const list = audioFormat[audioFormat.length - 1].split('<SegmentList>')[1].split('</SegmentList>')[0]
                    .replaceAll('<SegmentURL media="', '').split('"/>');

                //Если последняя ссылка не является ссылкой, убираем
                if (list[list.length - 1] === '') list.pop();
                if (list.length > this.#precache) list.splice(0, list.length - this.#precache);

                //Записываем номер ссылки с которой надо начать
                this.#NumberUrl = Number(list[0].split('sq/')[1].split('/')[0]);
                await this.#PipeData();
            }
        };
        //====================== ====================== ====================== ======================
        /**
         * @description Загружаем фрагменты в класс
         * @private
         */
        readonly #PipeData = () => {
            return new Promise(async (resolve) => {
                const request = await httpsClient.Request(`${this.#urls.base}sq/${this.#NumberUrl}`).catch((err: Error) => err);

                if (this.destroyed) return;

                //Если Request является ошибкой
                if (request instanceof Error) {
                    this.#UpdateYouTubeDash().then(this.#DecodeDashManifest);
                    return;
                }
                //Записываем request в this.#request
                this.#request = request;

                //Записываем данные в текущий класс
                request.on('data', (c) => {
                    this.push(c);
                });
                //Если выгружать больше нечего, запускаем по новой
                request.on('end', () => {
                    this.#NumberUrl++;
                    return resolve(this.#PipeData())
                });
                //Если произошла ошибка
                request.once('error', (err) => {
                    this.emit('error', err);
                });
            });
        };

        readonly #UpdateYouTubeDash = () => YouTube.getVideo(this.#urls.video).then((video: InputTrack) => (this.#urls.dash = video.format.url));
        //Удаляем request
        readonly _destroy = () => {
            super.destroy();
            this.#request?.removeAllListeners();
            this.#request?.destroy();
        };
    }
}

//Вспомогательные функции Decoder'а
namespace DecoderUtils {
    /**
     * @description Создаем аргументы для FFmpeg
     * @param AudioFilters {AudioFilters} Аудио фильтры которые включил пользователь
     * @param url {string} Ссылка
     * @param seek {number} Пропуск музыки до 00:00:00
     * @constructor
     */
    export function CreateArguments (url: string, AudioFilters: AudioFilters, seek: number): any[] {
        let thisArgs = [...JsonFFmpeg.Args.Reconnect, "-vn", ...JsonFFmpeg.Args.Seek, seek ?? 0];
        if (url) thisArgs = [...thisArgs, "-i", url];

        //Всегда есть один фильтр <AudioFade>
        return [...thisArgs, "-af", CreateFilters(AudioFilters), ...JsonFFmpeg.Args.OggOpus, ...JsonFFmpeg.Args.DecoderPreset, "-shortest"];
    }
    //====================== ====================== ====================== ======================
    /**
     * @description Получаем множитель времени для правильного отображения. При добавлении новых аргументов в FFmpeg.json<FilterConfigurator>, их нужно тоже добавить сюда!
     * @param AudioFilters {AudioFilters} Аудио фильтры которые включил пользователь
     * @constructor
     */
    export function timeFrame(AudioFilters: AudioFilters) {
        let NumberDuration = 20;

        if (AudioFilters) AudioFilters.forEach((filter: string | number) => {
            //Если filter число, пропускаем!
            if (typeof filter === "number") return;

            // @ts-ignore
            const StaticFilter = FiltersStatic[filter];

            //Проверяем есть ли такой модификатор
            if (StaticFilter) {
                //Если уже указан модификатор скорости
                if (typeof StaticFilter === "number") {
                    NumberDuration *= Number(StaticFilter);
                } else { //Если модификатор надо указывать пользователю
                    const Index = AudioFilters.indexOf(filter) + 1; //Позиция <filter> в AudioFilters
                    const number = AudioFilters.slice(Index); //Получаем то что указал пользователь

                    NumberDuration *= Number(number);
                }
            }
        });

        return NumberDuration;
    }
    //====================== ====================== ====================== ======================
    /**
     * @description Создаем фильтры для FFmpeg
     * @param AudioFilters {AudioFilters} Аудио фильтры которые включил пользователь
     * @constructor
     */
    function CreateFilters(AudioFilters: AudioFilters): string {
        const response: Array<string> = [];

        if (AudioFilters) AudioFilters.forEach((name: string | number) => {
            if (typeof name === "number") return;
            //@ts-ignore
            const Filter = JsonFFmpeg.FilterConfigurator[name];

            if (Filter) {
                //Если у <Filter.value> указано false (Аргументы не нужны)
                if (Filter.value === false) return response.push(Filter.arg);

                //Получаем номер фильтра
                const IndexFilter = AudioFilters.indexOf(name);
                //Добавляем в response, фильтр + аргумент
                response.push(`${Filter.arg}${AudioFilters.slice(IndexFilter + 1)[0]}`);
            }
        });

        //Более плавное включение музыки
        response.push(JsonFFmpeg.Args.Filters.AudioFade);

        return response.join(",");
    }
}