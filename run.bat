@Echo off

cls
:menu
Echo Choice number
Echo 1 - run Client
Echo 2 - run ShardManager
Echo 3 - Start build project
Echo 4 - Start build project + watch mode
Set /p choice="Num: "

if "%choice%"=="1" goto Client
if "%choice%"=="2" goto ShardManager
if "%choice%"=="3" goto Builder
if "%choice%"=="4" goto BuilderWatch
goto Fail
pause

:Client
    echo running Client...
    cd build
    node ./src/Core/Client/Client.js
:ShardManager
    echo running ShardManager...
  	cd build
  	node ./src/Core/Client/ShardManager.js
:Builder
  	echo staring build project...
  	tsc -p ./tsconfig.json
:BuilderWatch
	echo staring build project in watch mode...
    tsc --watch -p ./tsconfig.json
:Fail
    echo.
    echo Error: %choice% is not 1-4
    echo.
    goto menu