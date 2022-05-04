[<img align="right" alt="Node.js" width="260px" src="https://cdn.discordapp.com/attachments/860113484493881365/917337557841362944/Typescript_logo_2020.svg.png" />](https://nodejs.org/en/)

# WatKLOK
- Автор: [`SNIPPIK`](https://github.com/SNIPPIK)
- Язык бота: ru
- [Настройки](./DataBase/Config.json)
- [Все команды](./src/Commands)

## Гайд по запуску
1. [`Node.js`](https://nodejs.org/ru/) 16 или 17 версия
2. FFmpeg (на выбор)
    - [`FFmpeg`](https://ffmpeg.org/)
    - `ffmpeg-static`: ^4.2.7 (npm install)
3. Библиотеки шифрования (на выбор)
    - `sodium-native`: ^3.3.0
    - `sodium`: ^3.0.2
    - `libsodium-wrappers`: ^0.7.9
4. Запускаем `_tsBuild.bat` для Windows
5. Настраиваем бота [тут](./_Build/DataBase)
6. Запускаем [тут](./_Build), через командную строку
   - `node ./src/Core/Client.js` Для 1к серверов
   - `node ./src/Core/ShardManager.js` Для 1к и более серверов

## Поддерживаемые платформы
- [`YouTube`](https://www.youtube.com/) (Видео, плейлисты, поиск, стримы)
- [`Spotify`](https://open.spotify.com/) (треки, плейлисты, альбомы, поиск)
- [`VK`](https://vk.com/) (треки, плейлисты, поиск)
- [`SoundCloud`](https://soundcloud.com/) (треки, плейлисты, поиск, альбомы)
- [`RuTube`](https://rutube.ru/) (W.I.P)

## Требования к хостингу
- 2.4 ghz процессор [`Heroku`](http://heroku.com/)
   - `RAM`: 28-38 Мб в ожидании, +5-6 мб за каждый запущенный FFmpeg, при включении стрима до 12 Мб
   - `CPU`: 1-2% в ожидании, +2-5% поиск треков, все фильтры работают на FFmpeg'е
- 3.6 ghz процессор `R7 3700x`
   - `RAM`: 28-38 Мб в ожидании, +5-6 мб за каждый запущенный FFmpeg, при включении стрима до 12 Мб
   - `CPU`: 0-1% в ожидании, +0-1% поиск треков, все фильтры работают на FFmpeg'е

    
## Настройки
1. [`Cookie.json`](./DataBase/Cookie.json) | для прослушивания видео на youtube без ограничений (Авто-обновление)
    ```json5
   {   
      "Cookie": "КУКИ" 
   }
   ```
2. [`Config.json`](./DataBase/Config.json)
    ```json5
    {
      "Channels": {
        "Start": "", //Канал на который будет отправляться сообщение о запуске
        "SendErrors": "" //Канал нп который будет отправляться сообщение об ошибке
      },
      "Bot": {
        "ignoreError": true, //Игнорировать критические ошибки
        "token": "", //Токен
        "prefix": "!", // Префикс
        "DiscordServer": "https://discord.gg/qMf2Sv3" //Твой дискорд сервер, можешь оставить мой)
      },
      "spotify": { // Тут и без комментариев все понятно
        "clientID": "",
        "clientSecret": ""
      },
      "vk": { // Необходим токен пользователя VK ADMIN
        "token": ""
      }
    }
    ```
3. [`FFmpeg.json`](./DataBase/FFmpeg.json) | Можно теперь управлять FFmpeg из конфига | [`FFmpeg Docs`](https://ffmpeg.org/ffmpeg.html)
    ```json5
      {
        "Names": [], // Пути к ffmpeg
        "Args": {}, // Аргументы для работы (не менять)
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

<div align="left">
		<p>
		<a href="https://discord.gg/qMf2Sv3"><img src="https://img.shields.io/discord/332947799605772289?color=5865F2&logo=discord&logoColor=white" alt="Discord server" /></a>
	</p>
</div>
