"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.swapPositions = exports.Queue = void 0;
const Messages_1 = require("@Managers/Players/Messages");
const Events_1 = require("@Managers/Players/Events");
const AudioPlayer_1 = require("../AudioPlayer");
const Client_1 = require("@Client/Client");
const Config_json_1 = require("@db/Config.json");
class Queue {
    Timer = null;
    hasDestroying = false;
    _songs = [];
    get songs() { return this._songs; }
    ;
    set songs(songs) { this._songs = songs; }
    ;
    get song() {
        if (this._songs?.length < 1)
            return null;
        return this.songs[0];
    }
    ;
    _player = new AudioPlayer_1.AudioPlayer();
    get player() { return this._player; }
    ;
    channels;
    get voice() { return this.channels.voice; }
    ;
    set voice(voiceChannel) { this.channels.voice = voiceChannel; }
    ;
    get message() { return this.channels.message; }
    ;
    set message(message) { this.channels.message = message; }
    ;
    get guild() { return this.message.guild; }
    ;
    _options = {
        random: false,
        loop: "off",
        radioMode: false
    };
    get options() { return this._options; }
    ;
    _filters = [];
    get filters() { return this._filters; }
    ;
    constructor(message, voice) {
        this.channels = { message, voice };
        this.player.on("idle", () => Events_1.PlayerEvents.onIdlePlayer(this));
        this.player.on("error", (err, isSkip) => Events_1.PlayerEvents.onErrorPlayer(err, this, isSkip));
    }
    ;
    push = (song, sendMessage = false) => {
        if (sendMessage)
            Messages_1.MessagePlayer.toPushSong(this, song);
        this.songs.push(song);
    };
    play = (seek = 0) => {
        if (!this.song)
            return this.cleanup();
        this.song.resource(seek)
            .then((url) => this.player.readStream(url, { seek, filters: this.song.isLive ? [] : this.filters }))
            .catch((err) => this.player.emit("error", new Error(err), true));
        if (!seek)
            Messages_1.MessagePlayer.toPlay(this.message);
        if (Config_json_1.Debug)
            (0, Client_1.consoleTime)(`[Debug] -> Play: ${this.guild.id}: ${this.song.title}`);
    };
    swapSongs = (num) => {
        if (this.songs.length === 1)
            return this.player.stop();
        swapPositions(this.songs, num ?? this.songs.length - 1);
        this.player.stop();
    };
    cleanup = () => {
        const message = this.message;
        const { client, guild } = message;
        if (message && message?.deletable)
            message?.delete().catch(() => undefined);
        clearTimeout(this.Timer);
        if (this._player) {
            this.player.destroy();
            delete this._player;
        }
        delete this._songs;
        delete this._filters;
        delete this._options;
        delete this.channels;
        delete this.Timer;
        delete this.hasDestroying;
        client.queue.delete(guild.id);
    };
    TimeDestroying = (state) => {
        const player = this.player;
        if (state === "start" && this.hasDestroying) {
            this.Timer = setTimeout(this.cleanup, 20e3);
            player.pause();
            this.hasDestroying = true;
        }
        else {
            clearTimeout(this.Timer);
            this.hasDestroying = false;
            player.resume();
        }
    };
}
exports.Queue = Queue;
function swapPositions(array, position) {
    const first = array[0];
    array[0] = array[position];
    array[position] = first;
}
exports.swapPositions = swapPositions;
