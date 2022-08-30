"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Queue = void 0;
const AudioPlayer_1 = require("../../Player/AudioPlayer");
const PlayerManager_1 = require("../../Manager/PlayerManager");
class Queue {
    #Timer = null;
    #hasDestroying = false;
    #_player;
    #_channels;
    #_options = {
        random: false,
        loop: "off",
        stop: false,
    };
    audioFilters = [];
    songs = [];
    constructor(message, voice) {
        this.#_player = new AudioPlayer_1.AudioPlayer();
        this.#_channels = { message, voice, connection: null };
        this.player.on("idle", () => PlayerManager_1.PlayerEventsCallBacks.onIdlePlayer(this));
        this.player.on("buffering", () => PlayerManager_1.PlayerEventsCallBacks.onBufferingPlayer(this));
        this.player.on("error", (err) => PlayerManager_1.PlayerEventsCallBacks.onErrorPlayer(err, this));
    }
    ;
    swapSongs = (customNum) => {
        if (this.songs.length === 1)
            return this.player.stop();
        const SetNum = customNum ? customNum : this.songs.length - 1;
        const ArraySongs = this.songs;
        const hasChange = ArraySongs[SetNum];
        ArraySongs[SetNum] = ArraySongs[0];
        ArraySongs[0] = hasChange;
        this.player.stop();
        return;
    };
    get player() {
        return this.#_player;
    }
    ;
    get channels() {
        return this.#_channels;
    }
    ;
    get options() {
        return this.#_options;
    }
    ;
    cleanup = (sendDelQueue = true) => {
        const message = this.channels.message;
        const { client, guild } = this.channels.message;
        const Queue = client.queue.get(guild.id);
        if (!Queue)
            return;
        const { channels, player, options } = Queue;
        if (message?.deletable)
            message?.delete().catch(() => undefined);
        if (player) {
            player.unsubscribe({ connection: channels.connection });
            player.stop();
        }
        [Queue.songs, Queue.audioFilters].forEach(data => data = null);
        if (sendDelQueue) {
            if (options.stop)
                client.sendMessage({ text: "🎵 | Музыка была выключена", message, type: "css" });
            else
                client.sendMessage({ text: "🎵 | Музыка закончилась", message, type: "css" });
        }
        clearTimeout(this.#Timer);
        client.queue.delete(guild.id);
    };
    TimeDestroying = (state) => {
        const player = this.player;
        if (state === "start") {
            if (this.#hasDestroying)
                return;
            this.#Timer = setTimeout(() => this.cleanup(false), 30e3);
            this.#hasDestroying = true;
            player.pause();
        }
        else {
            if (!this.#hasDestroying)
                return;
            clearTimeout(this.#Timer);
            player.resume();
            this.#hasDestroying = false;
        }
    };
}
exports.Queue = Queue;
