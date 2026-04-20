#!/usr/bin/env bash
###############################################################################
# B.L.U.E.-J. — Repo Fixup Script
#
# Moves patch files from root to their correct src/ locations,
# integrates missing connections (store, main, HudHeader),
# and cleans up committed ZIP files.
#
# Run from the repo root:
#   chmod +x fix-repo.sh && ./fix-repo.sh
###############################################################################

set -euo pipefail

GREEN='\033[0;32m'
CYAN='\033[0;36m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

log()  { echo -e "${CYAN}[FIX]${NC} $1"; }
ok()   { echo -e "${GREEN}  ✓${NC} $1"; }
warn() { echo -e "${YELLOW}  ⚠${NC} $1"; }

if [ ! -f "package.json" ] || [ ! -d "src" ]; then
  echo -e "${RED}Run this from the B.L.U.E.-J. repo root.${NC}"
  exit 1
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  B.L.U.E.-J. — Repo Fixup"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

###############################################################################
# 1. Move patch components to src/components/
###############################################################################
log "Moving components to src/components/..."

move_file() {
  local src="$1"
  local dst="$2"
  if [ -f "$src" ]; then
    mv -f "$src" "$dst"
    ok "$(basename "$src") → $dst"
  fi
}

move_file "AIProviderSettings.tsx"  "src/components/AIProviderSettings.tsx"
move_file "BreakReminder.tsx"       "src/components/BreakReminder.tsx"
move_file "SelfCorrectPanel.tsx"    "src/components/SelfCorrectPanel.tsx"
move_file "WellnessPanel.tsx"       "src/components/WellnessPanel.tsx"

# HardwareStrip — REPLACE the old version with the portrait-fix version
if [ -f "HardwareStrip.tsx" ]; then
  mv -f "HardwareStrip.tsx" "src/components/HardwareStrip.tsx"
  ok "HardwareStrip.tsx → src/components/ (portrait fix applied)"
fi

echo ""

###############################################################################
# 2. Move patch libs to src/lib/
###############################################################################
log "Moving libs to src/lib/..."

move_file "ai-provider.ts"    "src/lib/ai-provider.ts"
move_file "self-correct.ts"   "src/lib/self-correct.ts"
move_file "wellness-store.ts" "src/lib/wellness-store.ts"

echo ""

###############################################################################
# 3. Move patch hooks to src/hooks/
###############################################################################
log "Moving hooks to src/hooks/..."

move_file "use-voice-chat.ts" "src/hooks/use-voice-chat.ts"

echo ""

###############################################################################
# 4. Move patched simulator.tsx to src/pages/
###############################################################################
log "Updating simulator page..."

if [ -f "simulator.tsx" ]; then
  mv -f "simulator.tsx" "src/pages/simulator.tsx"
  ok "simulator.tsx → src/pages/ (wellness + break reminders integrated)"
fi

echo ""

###############################################################################
# 5. Patch store.ts — add 'wellness' to activeTab type
###############################################################################
log "Patching store.ts — adding wellness tab..."

STORE_FILE="src/lib/store.ts"
if grep -q "'chat' | 'ide' | 'goals' | 'achievements'" "$STORE_FILE" && ! grep -q "'wellness'" "$STORE_FILE"; then
  sed -i "s/'chat' | 'ide' | 'goals' | 'achievements'/'chat' | 'ide' | 'goals' | 'achievements' | 'wellness'/g" "$STORE_FILE"
  ok "activeTab type extended with 'wellness'"
else
  warn "activeTab already has 'wellness' or pattern not found — skipping"
fi

echo ""

###############################################################################
# 6. Patch main.tsx — add error interceptor
###############################################################################
log "Patching main.tsx — adding error interceptor..."

MAIN_FILE="src/main.tsx"
if ! grep -q "installErrorInterceptor" "$MAIN_FILE"; then
  # Add import after the last import line
  sed -i '/^import.*"\.\/index\.css";/a\
import { installErrorInterceptor } from "@/lib/self-correct";' "$MAIN_FILE"

  # Add interceptor call before createRoot
  sed -i '/^createRoot/i\
// Install self-correction error interceptor\
installErrorInterceptor();' "$MAIN_FILE"
  ok "Error interceptor added to main.tsx"
else
  warn "Error interceptor already present — skipping"
fi

echo ""

###############################################################################
# 7. Patch HudHeader.tsx — add Wellness tab button (Heart icon)
###############################################################################
log "Patching HudHeader.tsx — adding wellness tab..."

HUD_FILE="src/components/HudHeader.tsx"
if ! grep -q "wellness" "$HUD_FILE"; then
  # Add Heart to the lucide-react import (insert before Award)
  sed -i '/^  Award,$/i\  Heart,' "$HUD_FILE"

  # Add wellness tab button after the achievements button block
  # Use Python for reliable multi-line insertion
  python3 -c "
import re
with open('$HUD_FILE', 'r') as f:
    content = f.read()

# Find the achievements Tooltip closing tag in the mobile tab bar
# and insert the wellness button after it
wellness_btn = '''              <Tooltip content=\"Wellness & Health\" position=\"bottom\">
                <button
                  onClick={() => setActiveTab('wellness')}
                  className={\`rounded-sm px-2.5 py-1 text-xs font-hud transition-colors \${
                    activeTab === 'wellness' ? 'bg-primary/20 text-primary' : 'text-primary/50'
                  }\`}
                >
                  <Heart className=\"h-4 w-4\" />
                </button>
              </Tooltip>'''

# Insert after the achievements Award tooltip block
# Find: </Tooltip> that closes the Awards button, then </Tooltip> that closes outer
# Strategy: find the Award icon line, then the next </Tooltip>, insert after
parts = content.split('<Award className=\"h-4 w-4\" />')
if len(parts) == 2:
    # Find the closing </Tooltip> after the Award icon
    after = parts[1]
    close_idx = after.index('</Tooltip>')
    close_end = close_idx + len('</Tooltip>')
    new_after = after[:close_end] + '\n' + wellness_btn + after[close_end:]
    content = parts[0] + '<Award className=\"h-4 w-4\" />' + new_after

with open('$HUD_FILE', 'w') as f:
    f.write(content)
"
  ok "Wellness tab (Heart icon) added to HudHeader"
else
  warn "Wellness tab already present — skipping"
fi

echo ""

###############################################################################
# 8. Add "main" field to package.json (for Electron)
###############################################################################
log "Checking package.json for Electron main field..."

if ! grep -q '"main"' package.json; then
  sed -i '/"private": true,/a\  "main": "electron-main.js",' package.json
  ok "Added \"main\": \"electron-main.js\" to package.json"
else
  warn "\"main\" field already exists — skipping"
fi

echo ""

###############################################################################
# 9. Clean up — remove ZIP files and duplicates from repo
###############################################################################
log "Cleaning up committed artifacts..."

cleanup_file() {
  if [ -f "$1" ]; then
    rm -f "$1"
    ok "Removed $1"
  fi
}

cleanup_file "BLUE-J-PWA-1 (1).zip"
cleanup_file "bluej-cicd-pipeline.zip"
cleanup_file "bluej-patch-pack-v1.1.zip"
cleanup_file "SETUP-GUIDE.txt"

# Add ZIPs to .gitignore so they don't get committed again
if ! grep -q "*.zip" .gitignore 2>/dev/null; then
  echo -e "\n# Build artifacts\n*.zip\nrelease/\nandroid/\nnode_modules/" >> .gitignore
  ok "Updated .gitignore"
fi

echo ""

###############################################################################
# Done!
###############################################################################
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo -e "${GREEN}  FIXUP COMPLETE! Here's what changed:${NC}"
echo ""
echo "  📂 Moved 10 patch files to correct src/ locations"
echo "  🔧 store.ts — activeTab now includes 'wellness'"
echo "  🔧 main.tsx — error interceptor installed"  
echo "  🔧 HudHeader.tsx — wellness tab (Heart icon) added"
echo "  🔧 package.json — Electron main field added"
echo "  🗑️  Removed committed ZIP files"
echo ""
echo "  Now commit and push:"
echo ""
echo -e "    ${CYAN}git add -A${NC}"
echo -e "    ${CYAN}git commit -m \"fix: organize patches into src/ + integrate wellness/voice/self-correct\"${NC}"
echo -e "    ${CYAN}git push origin main${NC}"
echo ""
echo "  That push will trigger the CI/CD pipeline automatically. 🚀"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
