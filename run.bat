@Echo off

:menu
Echo Main
Echo 1 - run Client
Echo 2 - run ShardManager
Echo 3 - Start build project
Echo Other
Echo 4 - Install requirements
Echo 5 - Delete audio cache
Set /p choice="Number: "

if "%choice%"=="1" goto Client
if "%choice%"=="2" goto ShardManager
if "%choice%"=="3" goto Builder
if "%choice%"=="4" goto Npm
if "%choice%"=="5" goto Clear
if choice gtr 5 goto Fail

:Client
    echo running Client...
    cd build
    node ./src/Core/Client/Client.js
    goto menu

:ShardManager
    echo running ShardManager...
    cd build
    node ./src/Core/Client/ShardManager.js
    goto menu

:Builder
    echo staring build project in watch mode...
    tsc --watch -p ./tsconfig.json
    goto menu

:Npm
    echo Install other modules
    start npm i
    cls
    goto menu

:Clear
    echo Deleting audio cache
    rmdir /s /q "./build/AudioCache"
    cls
    goto Menu

:Fail
    cls
    echo Error: %choice% is not 1-5
    goto menu