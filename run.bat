@Echo off

:menu
Echo Choice number
Echo 1 - run Client
Echo 2 - run ShardManager
Echo 3 - Start build project
Set /p choice="Number: "

if "%choice%"=="1" goto Client
if "%choice%"=="2" goto ShardManager
if "%choice%"=="3" goto Builder
if choice gtr 3 goto Fail
pause

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

:Fail
    cls
    echo Error: %choice% is not 1-3
    goto menu