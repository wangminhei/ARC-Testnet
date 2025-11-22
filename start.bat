@echo off
title ARC-Testnet
color 0A

cd %~dp0

echo Configuration files checked.

echo Checking dependencies...
if exist "..\node_modules" (
    echo Using node_modules from parent directory...
    cd ..
    CALL npm install ethers dotenv https-proxy-agent readline
    cd %~dp0
) else (
    echo Installing dependencies in current directory...
    CALL npm install ethers dotenv https-proxy-agent readline
)
echo Dependencies installation completed!
title ARC-Testnet
echo Starting the bot...
node index.js

pause
exit
