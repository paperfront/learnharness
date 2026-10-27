#!/bin/bash
set -euo pipefail
# Use only a disposable checkout: cap sync rewrites generated native assets.
export LH_IOS_SMOKE=1
node node_modules/vite/bin/vite.js build --config tests/mobile-fixture/vite.config.ts
cp mobile-fixture-dist/native.html mobile-fixture-dist/index.html
if [ ! -d ios/App/App.xcodeproj ]; then npx cap add ios; fi
npx cap sync ios
ruby tests/ios/prepare.rb
artifacts="${LH_IOS_ARTIFACTS:-${RUNNER_TEMP:-/tmp}/lh-ios-smoke}"
mkdir -p "$artifacts"
# Pick an installed iPhone simulator by UDID instead of guessing runner device names.
xcrun simctl list devices available --json > "$artifacts/devices.json"
device=$(node --input-type=module - "$artifacts/devices.json" <<'JS'
import {readFileSync} from 'node:fs';
const data=JSON.parse(readFileSync(process.argv[2], 'utf8'));
const entries=Object.entries(data.devices).filter(([runtime])=>runtime.includes('iOS')).sort(([a],[b])=>b.localeCompare(a,undefined,{numeric:true}));
const device=entries.flatMap(([,devices])=>devices).find(device=>device.isAvailable&&device.name.startsWith('iPhone'));
if(!device) throw new Error('No available iPhone simulator runtime');
console.log(device.udid);
JS
)
# Software keyboard must be shown even on hosts with a hardware keyboard.
defaults write com.apple.iphonesimulator ConnectHardwareKeyboard -bool NO
xcrun simctl boot "$device" || true
xcrun simctl bootstatus "$device" -b
xcrun simctl spawn "$device" defaults write com.apple.keyboard.preferences DidShowContinuousPathIntroduction -bool YES
xcodebuild test -project ios/App/App.xcodeproj -scheme MobileSmoke \
  -configuration Debug -destination "platform=iOS Simulator,id=$device" \
  -derivedDataPath "$artifacts/derived-data" -resultBundlePath "$artifacts/MobileSmoke.xcresult" \
  -parallel-testing-enabled NO CODE_SIGNING_ALLOWED=NO
