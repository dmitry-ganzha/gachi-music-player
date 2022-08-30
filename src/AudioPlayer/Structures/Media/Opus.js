"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Opus = void 0;
const node_stream_1 = require("node:stream");
const OGG_PAGE_HEADER_SIZE = 26;
const STREAM_STRUCTURE_VERSION = 0;
const charCode = (x) => x.charCodeAt(0);
const OGGs_HEADER = Buffer.from([...'OggS'].map(charCode));
const OPUS_HEAD = Buffer.from([...'OpusHead'].map(charCode));
const OPUS_TAGS = Buffer.from([...'OpusTags'].map(charCode));
var Opus;
(function (Opus) {
    class Ogg extends node_stream_1.Transform {
        #segment = { bit: null, head: null, chunk: null };
        constructor(options = {}) {
            super({ highWaterMark: 12, readableObjectMode: true, ...options });
        }
        ;
        _destroy = (error, callback) => {
            if (error)
                console.log(error);
            if (callback)
                callback(error);
            delete this.#segment.bit;
            delete this.#segment.head;
            delete this.#segment.chunk;
            super.destroy();
        };
        _transform = (chunk, encoding, done) => {
            if (this.#segment.chunk && !chunk.subarray(0, 4).equals(OGGs_HEADER)) {
                chunk = Buffer.concat([this.#segment.chunk, chunk]);
                this.#segment.chunk = null;
            }
            while (chunk) {
                const result = this.#ReadBufferStream(chunk);
                if (result)
                    chunk = result;
                else
                    break;
            }
            this.#segment.chunk = chunk;
            return done();
        };
        #ReadBufferStream = (chunk) => {
            if (chunk.length < OGG_PAGE_HEADER_SIZE)
                return null;
            if (chunk.readUInt8(4) !== STREAM_STRUCTURE_VERSION)
                throw Error(`Структура потока не совпадает с ${STREAM_STRUCTURE_VERSION}`);
            if (chunk.length < 27)
                return null;
            const pageSegments = chunk.readUInt8(26);
            if (chunk.length < 27 + pageSegments)
                return null;
            const table = chunk.subarray(27, 27 + pageSegments);
            const bitstream = chunk.readUInt32BE(14);
            const sizes = [];
            let totalSize = 0;
            for (let i = 0; i < pageSegments;) {
                let size = 0, x = 255;
                while (x === 255) {
                    if (i >= table.length)
                        return null;
                    x = table.readUInt8(i);
                    i++;
                    size += x;
                }
                sizes.push(size);
                totalSize += size;
            }
            if (chunk.length < 27 + pageSegments + totalSize)
                return null;
            let start = 27 + pageSegments;
            for (const size of sizes) {
                const segment = chunk.subarray(start, start + size);
                const header = segment.subarray(0, 8);
                if (this.#segment.head) {
                    if (header.equals(OPUS_TAGS))
                        this.emit('tags', segment);
                    else if (this.#segment.bit === bitstream)
                        this.push(segment);
                }
                else if (header.equals(OPUS_HEAD)) {
                    this.emit('head', segment);
                    this.#segment.head = true;
                    this.#segment.bit = bitstream;
                }
                else
                    this.emit('unknownSegment', segment);
                start += size;
            }
            return chunk.subarray(start);
        };
    }
    Opus.Ogg = Ogg;
})(Opus = exports.Opus || (exports.Opus = {}));
