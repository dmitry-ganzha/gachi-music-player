<div align="center">
	<p>
		<a href="https://discord.gg/qMf2Sv3"><img src="https://img.shields.io/discord/332947799605772289?color=5865F2&logo=discord&logoColor=white&style=flat-square" alt="Discord server" /></a>
		<a href=""><img src="https://img.shields.io/github/stars/SNIPPIK/WatKLOK?logo=github&style=flat-square" alt="Stars"/></a>
    	<a href=""><img src="https://img.shields.io/github/forks/SNIPPIK/WatKLOK?logo=github&style=flat-square" alt="Forks"/></a>
        <a href=""><img src="https://img.shields.io/github/repo-size/SNIPPIK/WatKLOK?logo=github&style=flat-square" alt="Watchers"/></a>
    </p>
</div>


[<img align="right" alt="Avatar bot" width="230px" src="https://cdn.discordapp.com/avatars/678588856588697610/466d3d51e6d497541622085ed18a1ad1.webp?size=4096" />](https://discordapp.com/users/623170593268957214)

# WatKLOK
- Автор: [`SNIPPIK`](https://github.com/SNIPPIK)
- Лицензия: [`MIT`](https://github.com/SNIPPIK/WatKLOK/blob/main/LICENSE)
- Перейти к [настройкам](DataBase/Config.json)
- Перейти ко [всем командам](src/Handler/Commands) | `Slash + Standart`
- Перейти к [плееру](src/AudioPlayer)
- Все сообщения удаляют автоматически через время

## Гайд по запуску
1. [`Node.js`](https://nodejs.org/ru/) 16-19
2. [`FFmpeg & FFprobe`](https://ffmpeg.org/) или npm install (ffmpeg-static и ffprobe-static)
3. Библиотеки шифрования (на выбор)
    - `sodium-native`: ^3.3.0 (рекомендуется)
    - `sodium`: ^3.0.2
    - `libsodium-wrappers`: ^0.7.9
4. Добавляем не публичные данные в [.env](.env) и меняем прочие настройки в [LocalBase](DataBase)
5. Запускаем [`run.bat`](run.bat)
   - Если нет папки `build` (выбираем 3)
   - Если менее 1к серверов (выбираем 1)
   - Если более 1к серверов (выбираем 2)

## Поддерживаемые платформы

| Платформы                                 | Что доступно                         | Аудио       |
|-------------------------------------------|--------------------------------------|-------------|
| [**YouTube**](https://www.youtube.com/)   | **видео, плейлисты, поиск, стримы**  | ✔           |
| [**Spotify**](https://open.spotify.com/)  | **треки, плейлисты, поиск, альбомы** | ✖ (YouTube) |
| [**VK**](https://vk.com/)                 | **треки, ~~плейлисты~~, поиск**      | ✔           |
| [**SoundCloud**](https://soundcloud.com/) | **треки, плейлисты, поиск, альбомы** | ✔           |
| [**Discord**](https://discord.com/)       | **ссылки, файлы**                    | ✔           |

## Настройки
1. [`.env`](.env) | для не публичных данных
   ```dotenv
    TOKEN="" #Discord bot token
    SPOTIFY_ID="" #Spotify client id
    SPOTIFY_SECRET="" #Spotify client secket
    SOUNDCLOUD="" #Soundcloud client id
    VK_TOKEN="" #Vk auth token (user token, not a bot token)
   ```
1. [`Cookie.json`](DataBase/Cookie.json) | необходим для видео 18+
    ```json5
   {
      "Cookie": "КУКИ"
   }
   ```
2. [`Config.json`](DataBase/Config.json) | основные настройки
   ```json5
      {
        "Channels": {
          "sendErrors": "" //ID канала на который будут отправляться ошибки
        },
        "Bot": {
          "ignoreErrors": true, //Игнорировать ошибки
          "prefix": "!", //Префикс
        },
        "CacheMusic": false, //Кешировать музыку? (Значительно ускоряет работу фильтров и seek, как уменьшает кол-во запросов на сервера)
        "Debug": false //Отправлять сообщение взаимодействий бота с discord
      }
      ```
3. [`Filters.json`](DataBase/Filters.json) | Можно добавлять свои фильтры в конфиг | [`FFmpeg Docs`](https://ffmpeg.org/ffmpeg.html)
    ```json5
   [
      {
         "names": ["name"], //Названия
         "description": "Типа описание", //Описание

         //Сам аргумент, если указывать args то необходимо что-бы в конце аргумента было =
         //Пример atempo=
         "filter": "Аргумент для FFmpeg",

         //Мин, макс - мин и макс аргументы для фильтра
         //Если аргумент не нужен, оставить false
         "args": [1, 3],

         //Ускоряется ли музыка, да то как (arg - ускоряется аргументом, 1.25 - ускоряется в 1.25)
         "speed": "arg"
      }
   ]
     ```