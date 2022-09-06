import {Transform, TransformOptions} from "node:stream";

const OGG_PAGE_HEADER_SIZE = 26;
const STREAM_STRUCTURE_VERSION = 0;
const charCode = (x: string) => x.charCodeAt(0);
const OGGs_HEADER = Buffer.from([...'OggS'].map(charCode));
const OPUS_HEAD = Buffer.from([...'OpusHead'].map(charCode));
const OPUS_TAGS = Buffer.from([...'OpusTags'].map(charCode));

type TransformDone = (error?: Error) => void;

export namespace Opus {
    export class Ogg extends Transform {
        readonly #segment: {bit: number, head: boolean, chunk: Buffer} = {bit: null, head: null, chunk: null};
        public constructor(options: TransformOptions = {}) {
            super({ highWaterMark: 12, readableObjectMode: true, ...options });
        };

        readonly _destroy = (): void => {
            delete this.#segment.bit;
            delete this.#segment.head;
            delete this.#segment.chunk;
            super.destroy();
        };

        readonly _transform = (chunk: Buffer, encoding: string, done: TransformDone): void => {
            if (this.#segment.chunk && !chunk.subarray(0, 4).equals(OGGs_HEADER)) { //Если шаблон не совпадает добавляем фрагмент из прошлого куска
                chunk = Buffer.concat([this.#segment.chunk, chunk]);
                this.#segment.chunk = null;
            }

            while (chunk) {
                const result = this.#ReadBufferStream(chunk);

                if (result) chunk = result;
                else break;
            }

            this.#segment.chunk = chunk;
            return done();
        };

        /**
         * @description Определяем где нужно взять фрагмент
         * @param chunk {Buffer} Фрагмент потока
         */
        readonly #ReadBufferStream = (chunk: Buffer): null | Buffer => {
            if (chunk.length < OGG_PAGE_HEADER_SIZE) return null;
            //if (!chunk.subarray(0, 4).equals(OGGs_HEADER)) throw Error(`Шаблон захвата не совпадает с ${OGGs_HEADER}`);
            if (chunk.readUInt8(4) !== STREAM_STRUCTURE_VERSION) throw Error(`Структура потока не совпадает с ${STREAM_STRUCTURE_VERSION}`);

            if (chunk.length < 27) return null;

            const pageSegments: number = chunk.readUInt8(26); //Считывает 8-битное целое число(26) из буфера
            if (chunk.length < 27 + pageSegments) return null;
            const table: Buffer = chunk.subarray(27, 27 + pageSegments); //Возвращает новый буфер, который ссылается на ту же память, что и оригинал, но смещен и обрезан по начальному и конечному индексам.
            const bitstream: number = chunk.readUInt32BE(14); //Считывает 32-битное целое число(14) из буфера
            const sizes: Array<number> = [];
            let totalSize: number = 0;

            //Собираем читаемые сегменты вместе
            for (let i = 0; i < pageSegments;) {
                let size = 0, x = 255;

                //Создаем цикл пока x не будет равен 255
                while (x === 255) {
                    if (i >= table.length) return null;
                    x = table.readUInt8(i);
                    i++;
                    size += x;
                }

                sizes.push(size);
                totalSize += size;
            }

            if (chunk.length < 27 + pageSegments + totalSize) return null;
            let start: number = 27 + pageSegments;

            //Начинаем запись сегментов в текущий класс
            for (let size of sizes) {
                const segment = chunk.subarray(start, start + size); //Получаем нужный сегмент
                const header = segment.subarray(0, 8); //Обрезаем сегмент для определения

                //Если есть this.#segment.head
                if (this.#segment.head) {
                    if (header.equals(OPUS_TAGS)) this.emit('tags', segment);
                    else if (this.#segment.bit === bitstream) this.push(segment);
                } else if (header.equals(OPUS_HEAD)) { //Если находим в header, фрагменты OPUS_HEAD
                    this.emit('head', segment);
                    this.#segment.head = true;
                    this.#segment.bit = bitstream;
                } else this.emit('unknownSegment', segment); //Если больше нечего делать с сегментом

                start += size;
            }

            //Выдаем обрезанный сегмент
            return chunk.subarray(start);
        };
    }
}