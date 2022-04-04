[<img align="right" alt="Node.js" width="260px" src="https://cdn.discordapp.com/attachments/860113484493881365/917337557841362944/Typescript_logo_2020.svg.png" />](https://nodejs.org/en/)

# WatKLOK
- Автор: [SNIPPIK](https://github.com/SNIPPIK)
- Язык бота: ru
- [Настройки](./DataBase/Config.json)
- [Все команды](./src/Commands)

## Поддерживаемые платформы
- [YouTube](https://www.youtube.com/) (Видео, плейлисты, поиск, стримы)
- [Spotify](https://open.spotify.com/) (Треки, плейлисты, альбомы, поиск)
- [VK](https://vk.com/) (Треки, плейлисты, поиск)
- [RuTube](https://rutube.ru/) (W.I.P)

## Требования к хостингу
- 2.4 ghz процессор ([Heroku](http://heroku.com/))
   - RAM: 28-35 Мб в ожидании, +5-6 мб за каждый запущенный FFmpeg, при включении стрима до 12 Мб
   - CPU: 1-2% в ожидании, +7-12% поиск треков, все фильтры работают на FFmpeg'е
   - MEM: Рекомендуется 100-150 Мб
- 3.6 ghz процессор ([My host]())
   - RAM: 28-35 Мб в ожидании, +5-6 мб за каждый запущенный FFmpeg, при включении стрима до 12 Мб
   - CPU: 0-1% в ожидании, +0-1% поиск треков, все фильтры работают на FFmpeg'е


## Гайд по запуску
1. Установить [Node.js](https://nodejs.org/en/)
2. Установить [FFmpeg](https://ffmpeg.org/download.html) если будет не понятно просто гляньте видео на youtube
3. npm i -g typescript (если нету)
4. Выбираем какую lib-sodium установить
    - npm i sodium
    - npm i libsodium-wrappers
5. Запускаем _tsBuild.bat
6. Открываем только что созданную папку "_JavaScript"
7. Настраиваем...
8. Открываем консоль и пишем -> node .


## Настройки
1. Cookie.json для прослушивания видео на youtube без ограничений (Авто-обновление)
    ```json
    { "Cookie": "КУКИ" }
   ```
2. Config.json
    ```json 
    {
      "Channels": {
        "Start": "", //Канал на который будет отправлятся сообщение о запуске
        "SendErrors": "" //Канал нп который будет отправлятся сообщение об ошибке
      },
      "Bot": {
        "ignoreError": true, //Игнорировать критические ошибки
        "token": "", //Токен
        "prefix": "!", // Префикс
        "DiscordServer": "https://discord.gg/qMf2Sv3" //Твой дискорд сервер, можешь оставить мой)
      },
      "spotify": { // Тут и без коментариев все понятно
        "clientID": "",
        "clientSecret": ""
      },
      "vk": { // Необходим токен пользователя залогиненого через VK ADMIN, чтобы не было ограничений
        "token": ""
      }
    }
    ```