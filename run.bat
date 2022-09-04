@Echo off

:menu
cls
Echo Choice number
Echo 1 - run Client
Echo 2 - run ShardManager
Echo 3 - run Builder

echo.
Set /p choice="Num: "

if "%choice%"=="1" (
    echo running Client...
    cd _Build
    node ./src/Core/Client/Client.js
) else if "%choice%"=="2" (
    echo running ShardManager...
	cd _Build
	node ./src/Core/Client/ShardManager.js
) else if "%choice%"=="3"  (
	echo running builder...
	tsc -p ./tsconfig.json
) else (
    echo %choice% is not 1-3
)

goto menu
pause
