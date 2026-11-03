#!/bin/bash
# Build a notarized macOS installer containing the Audio Unit and VST3.
# The keychain must already hold Developer ID Application and Developer ID Installer.

set -euo pipefail

version="${LORENZ_VERSION:?}"
app_id="${DEVELOPER_ID_APPLICATION:?}"
installer_id="${DEVELOPER_ID_INSTALLER:?}"
keychain="${KEYCHAIN_PATH:?}"
api_key="${APPLE_API_KEY_PATH:?}"
api_key_id="${APPLE_API_KEY_ID:?}"
api_issuer="${APPLE_API_ISSUER_ID:?}"

root="$(cd "$(dirname "$0")/../../.." && pwd)"
build="${LORENZ_BUILD_DIR:-$root/plugin/build}"
artefacts="$build/LorenzMIDI_artefacts/Release"
entitlements="$root/plugin/packaging/macos/entitlements.plist"
stage="$(mktemp -d)"
dist="$root/dist"
mkdir -p "$dist"

sign_bundle() {
  local bundle="$1"
  local executable
  executable="$(basename "$bundle")"
  executable="${executable%.*}"
  if [[ ! -f "$bundle/Contents/MacOS/$executable" ]]; then
    echo "missing executable in $bundle" >&2
    exit 1
  fi
  codesign --force --options runtime --timestamp \
    --keychain "$keychain" \
    --entitlements "$entitlements" \
    --sign "$app_id" \
    "$bundle/Contents/MacOS/$executable"
  codesign --force --options runtime --timestamp \
    --keychain "$keychain" \
    --entitlements "$entitlements" \
    --sign "$app_id" \
    "$bundle"
  codesign --verify --strict --verbose=2 "$bundle"
}

au_root="$stage/au"
vst3_root="$stage/vst3"
mkdir -p "$au_root" "$vst3_root"
cp -R "$artefacts/AU/Lorenz.component" "$au_root/"
cp -R "$artefacts/VST3/Lorenz.vst3" "$vst3_root/"
sign_bundle "$au_root/Lorenz.component"
sign_bundle "$vst3_root/Lorenz.vst3"

pkgbuild \
  --root "$au_root" \
  --identifier com.lorenz.midi.au \
  --version "$version" \
  --install-location "/Library/Audio/Plug-Ins/Components" \
  "$stage/Lorenz-AU.pkg"

pkgbuild \
  --root "$vst3_root" \
  --identifier com.lorenz.midi.vst3 \
  --version "$version" \
  --install-location "/Library/Audio/Plug-Ins/VST3" \
  "$stage/Lorenz-VST3.pkg"

cp "$root/plugin/LICENSE" "$stage/License.txt"
cat > "$stage/distribution.xml" << EOF
<?xml version="1.0" encoding="utf-8"?>
<installer-gui-script minSpecVersion="2">
    <title>Lorenz ${version}</title>
    <license file="License.txt"/>
    <options customize="never" require-scripts="false" hostArchitectures="arm64,x86_64"/>
    <domains enable_localSystem="true"/>
    <choices-outline>
        <line choice="au"/>
        <line choice="vst3"/>
    </choices-outline>
    <choice id="au" title="Audio Unit" description="MIDI effect for Logic and other Audio Unit hosts.">
        <pkg-ref id="com.lorenz.midi.au"/>
    </choice>
    <choice id="vst3" title="VST3" description="MIDI effect for Ableton Live and other VST3 hosts.">
        <pkg-ref id="com.lorenz.midi.vst3"/>
    </choice>
    <pkg-ref id="com.lorenz.midi.au" version="${version}" onConclusion="none">Lorenz-AU.pkg</pkg-ref>
    <pkg-ref id="com.lorenz.midi.vst3" version="${version}" onConclusion="none">Lorenz-VST3.pkg</pkg-ref>
</installer-gui-script>
EOF

pkg="$dist/Lorenz-${version}-macOS.pkg"
productbuild \
  --distribution "$stage/distribution.xml" \
  --package-path "$stage" \
  --resources "$stage" \
  --sign "$installer_id" \
  --timestamp \
  --keychain "$keychain" \
  "$pkg"

xcrun notarytool submit "$pkg" \
  --key "$api_key" \
  --key-id "$api_key_id" \
  --issuer "$api_issuer" \
  --wait
xcrun stapler staple "$pkg"
spctl --assess --type install -vv "$pkg"
echo "wrote $pkg"
