# ⏳ TimeWarp – Control Time on Any Website

[![License: GPL v3](https://img.shields.io/badge/License-GPLv3-blue.svg)](https://www.gnu.org/licenses/gpl-3.0)
[![Userscript](https://img.shields.io/badge/Userscript-Install-green.svg)](https://raw.githubusercontent.com/YOUR_USERNAME/TimeWarp/main/TimeWarp.user.js) <!-- Replace with actual raw URL -->

> **TimeWarp** is a powerful userscript that lets you control the speed of JavaScript timers, animations, and video playback on any website.  
> Skip annoying ad timers, speed through tutorials, or slow down animations for learning – all with a modern, draggable UI and keyboard shortcuts.

---

## ✨ Features

- ⏱️ **Timer speed control** – Hooks `setTimeout`, `setInterval`, and `requestAnimationFrame` to accelerate or slow down any time‑based logic.
- 🎬 **Video acceleration** – Overrides `playbackRate` on all `<video>` elements (YouTube, Netflix, Vimeo, etc.).
- 👁️ **Hide / Show panel** – Toggle the main interface with a single click; a floating button appears when hidden. State is saved across page reloads.
- ⚙️ **Full settings panel** – Import/export configuration as JSON, reset to defaults, and change all options on the fly without editing the script.
- ⌨️ **Configurable keyboard shortcuts** – Arrow keys can be enabled/disabled (`USE_ARROWS`). Left/Right multiply/divide by 2; Up/Down add/subtract a step.
- 🎨 **Modern, draggable UI** – Blur effect, tooltips, landscape or portrait layout, and adjustable opacity.
- 🔄 **Auto-detects new content** – Works on dynamically added videos, iframes, and shadow DOM.
- 💾 **Persistent settings** – Position, hidden state, and configuration are saved in `localStorage`.

---

## 📦 Installation

1. Install a userscript manager:  
   - [Tampermonkey](https://www.tampermonkey.net/) (recommended)  
   - [Violentmonkey](https://violentmonkey.github.io/)  
   - [Greasemonkey](https://www.greasespot.net/) (limited support)

2. Click the install link below (or copy the script source into a new userscript):  
   **[Install TimeWarp](https://raw.githubusercontent.com/YOUR_USERNAME/TimeWarp/main/TimeWarp.user.js)**  
   *(Replace with your actual raw GitHub URL after uploading.)*

3. The script will automatically load on all pages (configurable via `@match`). After installation, you’ll see a draggable control panel – usually on the left side of the page.

> **Note**: TimeWarp depends on [Everything-Hook.js](https://greasyfork.org/scripts/372672-everything-hook). The `@require` directive automatically fetches it; no manual install is needed.

---

## 🎮 How to Use

### Main Control Panel

| UI Element | Action |
|------------|--------|
| **x1.00** (display) | Shows current speed factor. Click to open a prompt for manual speed entry. |
| **+** / **-** | Increase/decrease speed by `BUTTON_STEP` (default 0.1). |
| **×2** / **÷2** | Multiply or divide current speed by 2 (or your custom `BUTTON_X2` / `BUTTON_HALF`). |
| **⟳** | Reset speed to 1.0 (normal). |
| **⚙** | Open the settings panel (see below). |
| **👁** | Hide the main panel. A floating “▶ TimeWarp” button appears – click it to show the panel again. |

### Settings Panel

Click the **⚙** button to open a modal window where you can:

- Modify any `CONFIG` value (speed limits, step sizes, UI appearance, etc.).
- **Save** – applies changes immediately and closes the panel.
- **Import JSON** – load a previously exported configuration file.
- **Export JSON** – save your current settings to a `.json` file.
- **Reset Default** – revert all settings to the script’s built‑in defaults.

> All settings are also saved automatically (except for debug flags). The panel is fully resizable on touch / mouse.

### Keyboard Shortcuts

These can be enabled/disabled and tuned via the settings panel.

| Action | Default Keys |
|--------|---------------|
| **Increase speed** | `ArrowUp` (adds `ARROW_STEP`: 0.1) |
| **Decrease speed** | `ArrowDown` (subtracts `ARROW_STEP`) |
| **Multiply by 2** | `ArrowLeft` |
| **Divide by 2** | `ArrowRight` |
| **Legacy shortcuts** (Ctrl/Alt + key) | `Ctrl + =` (×2), `Ctrl + -` (÷2), `Ctrl + 0` (reset), `Ctrl + 9` (prompt) |

*Note: Arrow keys only work when `USE_ARROWS` is `true` (default `false` to avoid conflicts with page navigation).*

---

## ⚙️ Configuration (Editable)

Open the script in your userscript manager and edit the `CONFIG` object at the top.  
Alternatively, use the built‑in **Settings Panel** – changes made there override the static values.

```javascript
const CONFIG = {
    // Speed limits
    MIN_SPEED: 0.1,      // Minimum (10% speed)
    MAX_SPEED: 16,       // Maximum (1600% speed)

    // Default speed (1.0 = normal)
    DEFAULT_SPEED: 1.0,

    // Button steps
    BUTTON_STEP: 0.1,    // + / - buttons
    BUTTON_X2: 2,        // Multiply factor
    BUTTON_HALF: 0.5,    // Divide factor

    // Keyboard arrows (disabled by default)
    USE_ARROWS: false,   // Set to true to enable arrow keys
    ARROW_STEP: 0.1,     // Base step for up/down
    ARROW_SHIFT_STEP: 1, // Step when Shift is held
    ARROW_CTRL_STEP: 0.01, // Step when Ctrl is held

    // Legacy shortcuts (Ctrl+Alt+...)
    ENABLE_LEGACY_SHORTCUTS: true,

    // UI appearance
    UI_POSITION: { left: '20px', top: '20%' }, // Initial position
    UI_BLUR: true,          // Backdrop blur effect
    UI_TRANSPARENCY: 0.85,  // Background opacity
    UI_SHOW_TOOLTIPS: true, // Hover tooltips
    UI_FLASH_DURATION: 300,  // Millisecond flash when speed changes
    LANDSCAPE_MODE: true,    // Horizontal (true) or vertical (false) button layout

    // Video handling
    VIDEO_FORCE_RATE: true,  // Force video playbackRate
    VIDEO_OBSERVER: true,    // Watch for new videos

    // Timer hooking
    HOOK_TIMERS: true,       // setTimeout / setInterval
    HOOK_RAF: true,          // requestAnimationFrame
    HOOK_DATE: true,         // Date constructor

    // Debugging
    DEBUG: false,            // Console logs
};
