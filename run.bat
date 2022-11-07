@Echo off

:menu
Echo Main
Echo 1 - run Client
Echo 2 - run ShardManager
Echo 3 - Start build project
Echo Other
Echo 4 - Install requirements
Echo 5 - Install libSodium
Echo 6 - Delete audio cache
Set /p choice="Number: "

if "%choice%"=="1" goto Client
if "%choice%"=="2" goto ShardManager
if "%choice%"=="3" goto Builder
if "%choice%"=="4" goto Npm
if "%choice%"=="5" goto Sodium
if "%choice%"=="6" goto Clear
if choice gtr 6 goto Fail

:: Запускаем клиент
:Client
    echo running Client...
    cd build
    node ./src/Core/Client/Client.js
    goto menu

:: Запускаем ShardManager
:ShardManager
    echo running ShardManager...
    cd build
    node ./src/Core/Client/ShardManager.js
    goto menu

:: Запускаем билдер из typescript в javascript
:Builder
    echo staring build project in watch mode...
    tsc --watch -p ./tsconfig.json
    goto menu

:: Удаляем аудио кеш
:Clear
    echo Deleting audio cache
    rmdir /s /q "./build/AudioCache"
    cls
    goto Menu

:: Выводим ошибку
:Fail
    cls
    echo Error: %choice% is not 1-5
    goto menu


:: Выбираем libSodium
:Sodium
    cls
    echo 1 - sodium-native (recommended)
    echo 2 - sodium
    echo 3 - libsodium-wrappers

    Set /p SodiumLib="Number: "

    if "%SodiumLib%"=="1" goto Install_Sodium_native
    if "%SodiumLib%"=="2" goto Install_Sodium
    if "%SodiumLib%"=="3" goto Install_Sodium_wrappers
    if choice gtr 3 {
        echo Error: %SodiumLib% is not 1-3
        goto Sodium
    }

:: Устанавливаем библиотеку sodium-native
:Install_Sodium_native
    echo Install sodium-native
    npm i sodium-native@latest
    goto menu

:: Устанавливаем библиотеку sodium
:Install_Sodium
    echo Install sodium
    npm i sodium@latest
    goto menu

:: Устанавливаем библиотеку libsodium-wrappers
:Install_Sodium_wrappers
    echo Install libsodium-wrappers
    npm i libsodium-wrappers@latest
    goto menu

:: Устанавливаем все необходимые зависимости
:Npm
    echo Install other modules
    start npm i
    cls
    goto menu