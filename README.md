# TimeWarp – Control Time on Any Website

[![License: GPL v3](https://img.shields.io/badge/License-GPLv3-blue.svg)](https://www.gnu.org/licenses/gpl-3.0)
[![Userscript](https://img.shields.io/badge/userscript-install-green.svg)](https://raw.githubusercontent.com/YOUR_USERNAME/TimeWarp/main/TimeWarp.user.js)

> **TimeWarp** is a powerful userscript that lets you control the speed of JavaScript timers, animations, and video playback on any website. Skip ad timers, speed up tutorials, or slow down animations – all with a modern UI and keyboard shortcuts.

![Screenshot of TimeWarp UI](screenshot.png) *[Optional: add a screenshot]*

## ✨ Features

- ⏱️ **Timer speed control** – Hook `setTimeout`, `setInterval`, and `requestAnimationFrame` to accelerate or slow down any time‑based web logic.
- 🎬 **Video acceleration** – Override video playback rate on all `<video>` elements (works on YouTube, Netflix, etc.).
- ⌨️ **Keyboard shortcuts** – Use arrow keys, `Ctrl`/`Alt` + `=`, `-`, etc. for quick adjustments.
- 🎨 **Modern UI** – A sleek, draggable control panel with real‑time speed display and tooltips.
- 🔧 **Fully configurable** – Adjust speed limits, step sizes, UI appearance, and more via a simple `CONFIG` object at the top of the script.
- 🔄 **Auto‑detects new content** – Works on dynamically added videos and iframes.
- 🧩 **Shadow DOM support** – Also hooks into elements inside shadow roots.
- 💡 **Works on almost any website** – Because it hooks JavaScript at the core.

## 📦 Installation

1. Install a userscript manager like [Tampermonkey](https://www.tampermonkey.net/) or [Greasemonkey](https://www.greasespot.net/).
2. Click the following link to install **TimeWarp** directly:
   - [Install TimeWarp](https://raw.githubusercontent.com/YOUR_USERNAME/TimeWarp/main/TimeWarp.user.js) *(replace with actual raw link)*
3. After installation, you'll see a small control panel on the left side of the page (draggable). That's it – you're ready to warp time!

## 🎮 Usage

### UI Controls

| Button | Action |
|--------|--------|
| **x1.00** (display) | Shows current speed factor. Click to open a prompt for manual entry. |
| **+** / **-** | Increase/decrease speed by `BUTTON_STEP` (default 0.1). |
| **×2** / **÷2** | Multiply or divide current speed by `BUTTON_X2` / `BUTTON_HALF` (default 2 and 0.5). |
| **⟳** | Reset speed to 1.0 (normal). |

### Keyboard Shortcuts

| Keys | Action |
|------|--------|
| **↑** / **↓** | Increase/decrease speed by `ARROW_STEP` (default 0.1). |
| **Shift + ↑/↓** | Change speed by `ARROW_SHIFT_STEP` (default 1.0). |
| **Ctrl + ↑/↓** | Change speed by `ARROW_CTRL_STEP` (default 0.01). |
| **Ctrl + =** | Multiply speed by 2 (same as ×2 button). |
| **Ctrl + -** | Divide speed by 2 (same as ÷2 button). |
| **Ctrl + 0** | Reset speed to 1.0. |
| **Ctrl + 9** | Open prompt to enter custom speed. |

*Legacy shortcuts (`Alt` variants) are also available – see `CONFIG.ENABLE_LEGACY_SHORTCUTS`.*

## ⚙️ Configuration

The script is designed to be easy to customize. Open the script in your userscript manager and edit the `CONFIG` object at the very top. Here's what you can tweak:

```javascript
const CONFIG = {
    // Speed limits
    MIN_SPEED: 0.1,      // Minimum playback speed (10%)
    MAX_SPEED: 16,       // Maximum playback speed (1600%)

    // Default speed (1.0 = normal)
    DEFAULT_SPEED: 1.0,

    // Button steps (for UI buttons)
    BUTTON_STEP: 0.1,    // + / - buttons change speed by this amount
    BUTTON_X2: 2,        // Multiply by X2 button factor
    BUTTON_HALF: 0.5,    // Divide by 2 button factor

    // Keyboard arrow keys behavior
    ARROW_STEP: 0.1,     // Base step for arrow up/down
    ARROW_SHIFT_STEP: 1, // Step when Shift is held
    ARROW_CTRL_STEP: 0.01, // Step when Ctrl is held

    // Keyboard shortcuts (Ctrl/Alt + other keys)
    ENABLE_LEGACY_SHORTCUTS: true, // Enable Ctrl+Alt+[=/-/0/9] shortcuts

    // UI appearance
    UI_POSITION: { left: '20px', top: '20%' }, // Default position
    UI_BLUR: true,          // Enable backdrop blur
    UI_TRANSPARENCY: 0.85,  // Background opacity (0 to 1)
    UI_SHOW_TOOLTIPS: true, // Show tooltips on hover
    UI_FLASH_DURATION: 300, // Flash overlay duration (ms)

    // Video handling
    VIDEO_FORCE_RATE: true,  // Force video playbackRate to match speed
    VIDEO_OBSERVER: true,    // Watch for dynamically added videos

    // Timer hooking
    HOOK_TIMERS: true,       // Hook setTimeout/setInterval
    HOOK_RAF: true,          // Hook requestAnimationFrame
    HOOK_DATE: true,         // Hook Date constructor

    // Debug
    DEBUG: false,            // Log debug messages to console
};
