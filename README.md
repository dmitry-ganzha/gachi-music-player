<div align="center">
	<p>
		<a href="https://discord.gg/qMf2Sv3"><img src="https://img.shields.io/discord/332947799605772289?color=5865F2&logo=discord&logoColor=white&style=flat-square" alt="Discord server" /></a>
		<a href=""><img src="https://img.shields.io/github/stars/SNIPPIK/WatKLOK?logo=github&style=flat-square" alt="Stars"/></a>
    	<a href=""><img src="https://img.shields.io/github/forks/SNIPPIK/WatKLOK?logo=github&style=flat-square" alt="Forks"/></a>
        <a href=""><img src="https://img.shields.io/github/watchers/SNIPPIK/WatKLOK?logo=github&style=flat-square" alt="Watchers"/></a>
    </p>
</div>

[<img align="right" alt="Avatar bot" width="240px" src="https://cdn.discordapp.com/avatars/678588856588697610/466d3d51e6d497541622085ed18a1ad1.webp?size=4096" />](https://discordapp.com/users/623170593268957214)

# WatKLOK
- Автор: [`SNIPPIK`](https://github.com/SNIPPIK)
- [Настройки](./DataBase/Config.json)
- [Все команды](./src/Commands) | `Slash + Standart`

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

| Платформы                             | Что доступно                     | Поток       |
|---------------------------------------|----------------------------------|-------------|
| [YouTube](https://www.youtube.com/)   | видео, плейлисты, поиск          | ✔           |
| [Spotify](https://open.spotify.com/)  | треки, плейлисты, поиск, альбомы | ✖ (YouTube) |
| [VK](https://vk.com/)                 | треки, плейлисты, поиск          | ✔           |
| [SoundCloud](https://soundcloud.com/) | треки, плейлисты, поиск, альбомы | ✔           |

## Требования к хостингу
- 2.4 ghz процессор [`Heroku`](http://heroku.com/)
   - `RAM`: 28-35 Мб в ожидании, +5-8 Мб за каждый новый плеер
   - `CPU`: 1-2% в ожидании, 1-3% поиск треков, все фильтры работают на FFmpeg'е
   - `FFmpeg`: 3-12 мб за каждый плеер
- 3.6 ghz процессор `R7 3700x`
   - `RAM`: 28-35 Мб в ожидании, +5-8 Мб за каждый новый плеер
   - `CPU`: 0.1% в ожидании, 0.6-3% поиск треков, все фильтры работают на FFmpeg'е
   - `FFmpeg`: 3-12 мб за каждый плеер

    
## Настройки
1. [`Cookie.json`](./DataBase/Cookie.json) | для прослушивания видео на youtube без ограничений (Авто-обновление)
    ```json5
   {   
      "Cookie": "КУКИ" 
   }
   ```
2. [`Config.json`](./DataBase/Config.json) | основные настройки
    ```json5
    {
      "Channels": {
        "Start": "", //Канал на который будет отправляться сообщение о запуске
        "SendErrors": "" //Канал на который будет отправляться сообщение об ошибке
      },
      "Bot": {
        "ignoreError": true, //Игнорировать критические ошибки
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
3. [`FFmpeg.json`](./DataBase/FFmpeg.json) | Можно теперь управлять FFmpeg'ом из конфига | [`FFmpeg Docs`](https://ffmpeg.org/ffmpeg.html)
  - При добавлении новых аргументов, которые влияют на скорость надо будет добавить [`сюда`](./src/Core/Player/FFmpeg/ConstructorStream.ts), в функцию `FFmpegTimer`
    ```json5
      {
        "Names": [], //Путь(и) к ffmpeg
        "Args": {}, //Аргументы для работы (не менять)
        "FilterConfigurator": { //Для создания кастомных фильтров
          "nameFilter": {
            "value": {       //Нужно использовать значение, указать false если оно не нужно
              "max": 200,      //Макс значение
              "min": 0       //Мин значение
            },
            "arg": "" //Сам аргумент
          }
        }
      }  
    ```