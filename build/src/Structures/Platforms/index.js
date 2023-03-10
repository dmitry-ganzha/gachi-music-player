"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.YandexMusic = exports.VK = exports.SoundCloud = exports.Spotify = exports.YouTube = void 0;
const YandexMusic_1 = require("./API/YandexMusic");
Object.defineProperty(exports, "YandexMusic", { enumerable: true, get: function () { return YandexMusic_1.YandexMusic; } });
const SoundCloud_1 = require("./API/SoundCloud");
Object.defineProperty(exports, "SoundCloud", { enumerable: true, get: function () { return SoundCloud_1.SoundCloud; } });
const YouTube_1 = require("./YouTube/YouTube");
Object.defineProperty(exports, "YouTube", { enumerable: true, get: function () { return YouTube_1.YouTube; } });
const Spotify_1 = require("./API/Spotify");
Object.defineProperty(exports, "Spotify", { enumerable: true, get: function () { return Spotify_1.Spotify; } });
const VK_1 = require("./API/VK");
Object.defineProperty(exports, "VK", { enumerable: true, get: function () { return VK_1.VK; } });
