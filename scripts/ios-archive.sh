#!/usr/bin/env bash
# Uses the same automatic-signing flow as paperfront/poker_settle.
set -euo pipefail
: "${ASC_KEY_ID:?}" "${ASC_ISSUER_ID:?}" "${APPLE_TEAM_ID:?}" "${LH_IOS_APP_ID:?}"
: "${RUNNER_TEMP:?}" "${GITHUB_RUN_NUMBER:?}" "${GITHUB_RUN_ATTEMPT:?}"
key="$HOME/.appstoreconnect/private_keys/AuthKey_${ASC_KEY_ID}.p8"
[[ -s "$key" ]] || { echo 'Missing App Store Connect private key file'; exit 1; }
# A rerun needs a fresh build number too. Apple's dotted build syntax accepts this.
build_number="${GITHUB_RUN_NUMBER}.${GITHUB_RUN_ATTEMPT}"
version="$(node -p 'JSON.parse(require("fs").readFileSync("package.json","utf8")).version')"
auth=(-allowProvisioningUpdates -authenticationKeyPath "$key" -authenticationKeyID "$ASC_KEY_ID" -authenticationKeyIssuerID "$ASC_ISSUER_ID")
xcodebuild archive -project ios/App/App.xcodeproj -scheme App \
  -configuration Release -destination 'generic/platform=iOS' \
  -archivePath "$RUNNER_TEMP/LearnHarness.xcarchive" "${auth[@]}" \
  DEVELOPMENT_TEAM="$APPLE_TEAM_ID" CODE_SIGN_STYLE=Automatic \
  PRODUCT_BUNDLE_IDENTIFIER="$LH_IOS_APP_ID" MARKETING_VERSION="$version" CURRENT_PROJECT_VERSION="$build_number"
python3 - <<'PYTHON'
import os, plistlib
from pathlib import Path
p=Path(os.environ['RUNNER_TEMP'])/'ExportOptions.plist'
p.write_bytes(plistlib.dumps({'method':'app-store-connect','destination':'export',
 'teamID':os.environ['APPLE_TEAM_ID'],'signingStyle':'automatic',
 'manageAppVersionAndBuildNumber':False,'uploadSymbols':True}))
PYTHON
xcodebuild -exportArchive -archivePath "$RUNNER_TEMP/LearnHarness.xcarchive" \
  -exportOptionsPlist "$RUNNER_TEMP/ExportOptions.plist" -exportPath "$RUNNER_TEMP/ipa" "${auth[@]}"
