[<img align="right" alt="Avatar bot" width="200px" src="https://cdn.discordapp.com/avatars/678588856588697610/466d3d51e6d497541622085ed18a1ad1.webp?size=4096" />](https://discordapp.com/users/623170593268957214)

# WatKLOK
- Автор: [`SNIPPIK`](https://github.com/SNIPPIK)
- Лицензия: [`WatKLOK LICENSE`](LICENSE.md)
- Перейти к [`настройкам`](db/Config.json)
- Перейти к [`командам`](src/Handler/Commands) | `Slash + Standart`
- Перейти к [`плееру`](src/AudioPlayer)
- Перейди к [`демонстрации`](https://www.youtube.com/watch?v=ncvpyWaxycw)
- Все сообщения удаляются автоматически через время
- Для удаления аудио кеша `запустить run и выбрать 6`

[<img align="center" alt="PGI Settings" width="1000px" src="https://github.com/SNIPPIK/WatKLOK/blob/v2/.github/resource/PGI.png?raw=true" />](https://github.com/SNIPPIK/WatKLOK/blob/v2/.github/resource/PGI.png?raw=true)


## Гайд по запуску
1. [`Node.js`](https://nodejs.org/ru/) 17-19
2. [`FFmpeg & FFprobe`](https://ffmpeg.org/) или npm install (ffmpeg-static и ffprobe-static)
3. Указываем данные в [`.env`](.env)
4. Запускаем [`run`](run.bat)
   - Если нет [`libSodium`](https://github.com/discordjs/discord.js/tree/main/packages/voice#dependencies) (выбираем 5)
   - Если нет папки [`node_modules`](node_modules) (выбираем 4)
   - Если нет папки [`build`](build) (выбираем 3)
5. Запуск бота `повторяем 4 шаг, но выбираем 1` | Если возникли ошибки повторите шаги заново

## Поддерживаемые платформы
[Можно добавить поддержку иных платформ](src/AudioPlayer/Structures/SongSupport.ts)

| Платформы                                    | Что доступно                         | Аудио       |
|----------------------------------------------|--------------------------------------|-------------|
| [**YouTube**](https://www.youtube.com/)      | **видео, плейлисты, поиск, стримы**  | ✔           |
| [**Spotify**](https://open.spotify.com/)     | **треки, плейлисты, поиск, альбомы** | ✖ (YouTube) |
| [**Yandex Music**](https://music.yandex.ru/) | **треки, альбомы**                   | ✖ (YouTube) |
| [**VK**](https://vk.com/)                    | **треки, ~~плейлисты~~, поиск**      | ✔           |
| [**SoundCloud**](https://soundcloud.com/)    | **треки, плейлисты, поиск, альбомы** | ✔           |
| [**Discord**](https://discord.com/)          | **ссылки, файлы**                    | ✔           |

## Настройки
1. [`.env`](.env) | для не публичных данных
   ```dotenv
    TOKEN="" #Discord bot token
    SPOTIFY_ID="" #Spotify client id
    SPOTIFY_SECRET="" #Spotify client secket
    SOUNDCLOUD="" #Soundcloud client id
    VK_TOKEN="" #Vk auth token (user token, not a bot token)
   ```
1. [`Cookie.json`](db/Cookie.json) | необходим для видео 18+ (**YouTube**)
    ```json5
   {
      "Cookie": ""
   }
   ```
2. [`Config.json`](db/Config.json) | основные настройки
   ```json5
   {
      "Channels": {
        "sendErrors": "", //ID канала на который будут отображаться ошибки
        "removeUser": ""  //ID канала на котором будут отображаться пользователи ливнувшие с сервера
      },
      "Bot": {
         "ignoreErrors": true, //Игнорировать ошибки
         "prefix": "!", //Префикс
         "OwnerIDs": [] //Пользователи у которых есть доступ к разделу Owner
      },
      "Debug": false, //Отправлять сообщение взаимодействий бота с discord

      //Настройки музыки
      "Music": {
         "CacheMusic": false, //Кешировать музыку? (Значительно ускоряет работу фильтров и seek, как уменьшает кол-во запросов на сервера)
         "CacheDir": "AudioCache", //Путь, где будет сохраниться кеш музыки

         //Настройки плеера
         "AudioPlayer": {
            "sendDuration": 20 //Задержка до начала отправления пакетов
         },
          //Прогресс бар текущего трека
         "ProgressBar": {
            "enable": true, //Состояние (отображать или не отображать)
            "empty": "─", //После точки будет идти empty
            "full": "─", //До точки будет идти full
            "button": "⚪" //Сама точка
         },
         //Настройки аудио
         "Audio": {
            "bitrate": "256k" //Битрейт аудио
         }
      },

      //Настройка меню
      "ReactionMenuSettings": {
         "emojis": {
            "back": "⬅️", //Кнопка назад
            "next": "➡️", //Кнопка вперед
            "cancel": "❌" //Удаление меню
         }
      }
   }
   ```
3. [`Filters.json`](db/Filters.json) | Можно добавлять свои фильтры в конфиг | [`FFmpeg Docs`](https://ffmpeg.org/ffmpeg.html)
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
