"""Apply app metadata to the generated Capacitor project before building."""
import plistlib
from pathlib import Path
p = Path('ios/App/App/Info.plist')
info = plistlib.loads(p.read_bytes())
# Preserve the owner's existing App Store Connect declaration. The iOS client
# uses Apple's HTTPS and Keychain services, with no custom encryption implementation.
info['ITSAppUsesNonExemptEncryption'] = False
p.write_bytes(plistlib.dumps(info, sort_keys=False))
