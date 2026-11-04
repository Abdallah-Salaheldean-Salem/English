@echo off
rem Builds EnglishWritingRecovery.exe with the C# compiler that ships with Windows (.NET Framework 4.8). No downloads.
rem Run "python build.py" in the folder above first if you changed anything in src\ (it regenerates app.html).
setlocal
cd /d "%~dp0"
set CSC=%WINDIR%\Microsoft.NET\Framework64\v4.0.30319\csc.exe
if not exist "%CSC%" set CSC=%WINDIR%\Microsoft.NET\Framework\v4.0.30319\csc.exe
if not exist "%CSC%" (echo The .NET Framework 4 C# compiler was not found. & exit /b 1)
"%CSC%" /nologo /target:winexe /optimize+ /platform:anycpu /out:EnglishWritingRecovery.exe /win32icon:icon.ico ^
  /resource:app.html,app.html /r:System.dll /r:System.Security.dll /r:System.Windows.Forms.dll Launcher.cs
if errorlevel 1 exit /b 1
echo Built %~dp0EnglishWritingRecovery.exe
