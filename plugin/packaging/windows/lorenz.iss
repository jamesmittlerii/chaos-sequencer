#ifndef AppVersion
  #define AppVersion "1.0.0"
#endif

[Setup]
AppId={{B8E4C1A2-7F3D-4A61-9C0E-5D2A6F8B1E40}
AppName=Lorenz
AppVersion={#AppVersion}
AppPublisher=Lorenz
DefaultDirName={autopf}\Lorenz
DisableProgramGroupPage=yes
CreateAppDir=no
OutputDir=..\..\..\dist
OutputBaseFilename=Lorenz-{#AppVersion}-Windows
Compression=lzma2
SolidCompression=yes
ArchitecturesInstallIn64BitMode=x64
PrivilegesRequired=admin
LicenseFile=..\..\LICENSE
UninstallDisplayName=Lorenz MIDI effect

[Files]
Source: "staging\Lorenz.vst3\*"; DestDir: "{commoncf64}\VST3\Lorenz.vst3"; Flags: ignoreversion recursesubdirs createallsubdirs

[UninstallDelete]
Type: filesandordirs; Name: "{commoncf64}\VST3\Lorenz.vst3"
