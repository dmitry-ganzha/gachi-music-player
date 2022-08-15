<div align="center">
	<p>
		<a href="https://discord.gg/qMf2Sv3"><img src="https://img.shields.io/discord/332947799605772289?color=5865F2&logo=discord&logoColor=white&style=flat-square" alt="Discord server" /></a>
		<a href=""><img src="https://img.shields.io/github/stars/SNIPPIK/WatKLOK?logo=github&style=flat-square" alt="Stars"/></a>
    	<a href=""><img src="https://img.shields.io/github/forks/SNIPPIK/WatKLOK?logo=github&style=flat-square" alt="Forks"/></a>
        <a href=""><img src="https://img.shields.io/github/repo-size/SNIPPIK/WatKLOK?logo=github&style=flat-square" alt="Watchers"/></a>
    </p>
</div>


[<img align="right" alt="Avatar bot" width="240px" src="https://cdn.discordapp.com/avatars/678588856588697610/466d3d51e6d497541622085ed18a1ad1.webp?size=4096" />](https://discordapp.com/users/623170593268957214)

# WatKLOK
- Автор: [`SNIPPIK`](https://github.com/SNIPPIK)
- Лицензия: [`MIT`](https://github.com/SNIPPIK/WatKLOK/blob/main/LICENSE)
- [Настройки](./DataBase/Config.json)
- [Все команды](./src/Commands) | `Slash + Standart`
- Все сообщения удаляют автоматически через время

## Гайд по запуску
1. [`Node.js`](https://nodejs.org/ru/) 18
2. [`FFmpeg & FFprobe`](https://ffmpeg.org/)
3. Библиотеки шифрования (на выбор)
    - `sodium-native`: ^3.3.0 (рекомендуется)
    - `sodium`: ^3.0.2
    - `libsodium-wrappers`: ^0.7.9
4. Запускаем `_tsBuild.bat` для Windows
5. Настраиваем бота [тут](./DataBase)
6. Запускаем [тут](./_Build), через командную строку
   - `node ./src/Core/Client.js` Для 1к серверов
   - `node ./src/Core/ShardManager.js` Для 1к и более серверов

## Поддерживаемые платформы

| Платформы                                 | Что доступно                         | Аудио       |
|-------------------------------------------|--------------------------------------|-------------|
| [**YouTube**](https://www.youtube.com/)   | **видео, плейлисты, поиск**          | ✔           |
| [**Spotify**](https://open.spotify.com/)  | **треки, плейлисты, поиск, альбомы** | ✖ (YouTube) |
| [**VK**](https://vk.com/)                 | **треки, плейлисты, поиск**          | ✔           |
| [**SoundCloud**](https://soundcloud.com/) | **треки, плейлисты, поиск, альбомы** | ✔           |

    
## Настройки
1. [`Cookie.json`](./DataBase/Cookie.json) | необходим для видео 18+
    ```json5
   {   
      "Cookie": "КУКИ" 
   }
   ```
2. [`Config.json`](./DataBase/Config.json) | основные настройки
    ```json5
    {
      "Debug": false, //Включение дебаг режима
      "Channels": {
        "sendErrors": "" //ID канала на который будут отправляться ошибки
      },
      "Bot": {
        "ignoreErrors": true, //Игнорировать ошибки
        "token": "", //Токен
        "prefix": "!", //Префикс
        "DiscordServer": "https://discord.gg/qMf2Sv3" //Твой дискорд сервер, можешь оставить мой)
      },
      "spotify": { //Тут и без комментариев все понятно
        "clientID": "",
        "clientSecret": ""
      },
      "vk": { //Необходим токен пользователя VK ADMIN (эта система еще сыровата)
        "token": ""
      }
    }
    ```
3. [`FFmpeg.json`](./DataBase/FFmpeg.json) | Можно управлять FFmpeg'ом из конфига | [`FFmpeg Docs`](https://ffmpeg.org/ffmpeg.html)
    ```json5
    {
      "Names": [], //Путь(и) к ffmpeg
      "Args": {}, //Аргументы для работы (не менять)
      "FilterConfigurator": { //Для создания кастомных фильтров
        "nameFilter": {
          "speedModification": 0, //Модификатор скорости, есть использовать value, то надо указать вместо 0, value
           "value": {       //Нужно использовать значение, указать false если оно не нужно
             "max": 200,      //Макс значение
             "min": 0       //Мин значение
           },
         "arg": "" //Сам аргумент
        }
      }
    }  
     ```
