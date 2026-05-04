// ==UserScript==
// @name            TimeWarp
// @version         2.7
// @description     Control timer speeds, skip video ads, speed up/down videos. Modern UI, arrow keys, fully configurable. Hook timer functions to change speed. Landscape/portrait, left/right multiply/divide by 2, settings panel with import/export/reset, tap outside to close, MAIN PANEL size adjustable via settings (no resize handle).
// @include         *
// @require         https://greasyfork.org/scripts/372672-everything-hook/code/Everything-Hook.js?version=881251
// @author          SihabX
// @match           http://*/*
// @run-at          document-start
// @grant           none
// @license         GPL-3.0-or-later
// ==/UserScript==

/**
 * ================= CONFIGURATION (Edit these values as you like) =================
 */
const CONFIG = {
    // Speed limits
    MIN_SPEED: 0.1,
    MAX_SPEED: 16,

    DEFAULT_SPEED: 1.0,

    BUTTON_STEP: 0.1,
    BUTTON_X2: 2,
    BUTTON_HALF: 0.5,

    USE_ARROWS: false,
    ARROW_STEP: 0.1,
    ARROW_SHIFT_STEP: 1,
    ARROW_CTRL_STEP: 0.01,

    ENABLE_LEGACY_SHORTCUTS: true,

    UI_POSITION: { left: '20px', top: '20%' },
    UI_BLUR: true,
    UI_TRANSPARENCY: 0.85,
    UI_SHOW_TOOLTIPS: true,
    UI_FLASH_DURATION: 300,
    LANDSCAPE_MODE: true,

    // Main panel size (width and height in pixels)
    UI_PANEL_WIDTH: 'auto',   // 'auto' means auto size based on content, or pixel value like '300px'
    UI_PANEL_HEIGHT: 'auto',  // 'auto' or pixel value

    VIDEO_FORCE_RATE: true,
    VIDEO_OBSERVER: true,

    HOOK_TIMERS: true,
    HOOK_RAF: true,
    HOOK_DATE: true,

    ENABLE_SETTINGS_PANEL: true,

    DEBUG: false,
};

// Base configuration backup (for reset)
const BASE_CONFIG = JSON.parse(JSON.stringify(CONFIG));

window.isDOMLoaded = false;
window.isDOMRendered = false;

document.addEventListener('readystatechange', function () {
    if (document.readyState === "interactive" || document.readyState === "complete") {
        window.isDOMLoaded = true;
    }
});

~function (global) {

    const debug = CONFIG.DEBUG ? (...args) => console.log('[TimerHooker]', ...args) : () => {};

    var extraElements = [];

    var helper = function (eHookContext, timerContext, util) {
        const RATE_SYM = Symbol('timerhooker_rate');
        let currentUIContainer = null;
        let currentStyleNode = null;
        let currentNode = null;

        function rebuildUI() {
            if (currentNode && currentNode.parentNode) {
                currentNode.parentNode.removeChild(currentNode);
            }
            if (currentStyleNode && currentStyleNode.parentNode) {
                currentStyleNode.parentNode.removeChild(currentStyleNode);
            }
            applyUI();
        }

        function applyUI() {
            var blur = CONFIG.UI_BLUR ? 'backdrop-filter: blur(12px);' : '';
            var opacity = CONFIG.UI_TRANSPARENCY;
            var tooltipStyle = CONFIG.UI_SHOW_TOOLTIPS ? `
                .th-tooltip {
                    position: relative;
                }
                .th-tooltip::after {
                    content: attr(data-tooltip);
                    position: absolute;
                    bottom: 100%;
                    left: 50%;
                    transform: translateX(-50%);
                    background: #000;
                    color: #fff;
                    padding: 4px 8px;
                    border-radius: 8px;
                    font-size: 12px;
                    white-space: nowrap;
                    opacity: 0;
                    pointer-events: none;
                    transition: opacity 0.2s;
                    margin-bottom: 8px;
                }
                .th-tooltip:hover::after {
                    opacity: 1;
                }
            ` : '';

            var orientationStyle = CONFIG.LANDSCAPE_MODE ?
                'flex-direction: row; gap: 12px; align-items: center;' :
                'flex-direction: column; gap: 8px; align-items: center; padding: 12px;';

            // Apply custom width/height if not 'auto'
            var widthStyle = '';
            var heightStyle = '';
            if (CONFIG.UI_PANEL_WIDTH !== 'auto') {
                widthStyle = `width: ${CONFIG.UI_PANEL_WIDTH};`;
            }
            if (CONFIG.UI_PANEL_HEIGHT !== 'auto') {
                heightStyle = `height: ${CONFIG.UI_PANEL_HEIGHT};`;
            }

            var style = `
                .th-modern-container {
                    position: fixed;
                    z-index: 100000;
                    font-family: 'Segoe UI', 'Roboto', system-ui, sans-serif;
                    background: rgba(30, 30, 40, ${opacity});
                    ${blur}
                    border-radius: 40px;
                    padding: 8px 16px;
                    box-shadow: 0 4px 20px rgba(0,0,0,0.3);
                    border: 1px solid rgba(255,255,255,0.2);
                    user-select: none;
                    cursor: grab;
                    transition: box-shadow 0.2s;
                    display: flex;
                    ${orientationStyle}
                    ${widthStyle}
                    ${heightStyle}
                    min-width: 100px;
                    min-height: 40px;
                }
                .th-modern-container.dragging {
                    cursor: grabbing;
                    opacity: 0.9;
                }
                .th-modern-container:hover {
                    box-shadow: 0 6px 24px rgba(0,0,0,0.4);
                }
                .th-speed-display {
                    background: rgba(0,0,0,0.6);
                    border-radius: 32px;
                    padding: 6px 14px;
                    color: #fff;
                    font-weight: 600;
                    font-size: 1.2rem;
                    letter-spacing: 1px;
                    min-width: 80px;
                    text-align: center;
                    backdrop-filter: blur(4px);
                }
                .th-btn {
                    background: rgba(255,255,255,0.15);
                    border: none;
                    border-radius: 32px;
                    width: 36px;
                    height: 36px;
                    display: inline-flex;
                    align-items: center;
                    justify-content: center;
                    cursor: pointer;
                    color: white;
                    font-size: 1.2rem;
                    font-weight: bold;
                    transition: all 0.2s;
                    backdrop-filter: blur(4px);
                }
                .th-btn:hover {
                    background: rgba(255,255,255,0.3);
                    transform: scale(1.05);
                }
                .th-btn:active {
                    transform: scale(0.95);
                }
                .th-reset {
                    background: rgba(255,100,100,0.3);
                }
                .th-reset:hover {
                    background: rgba(255,100,100,0.6);
                }
                .th-settings {
                    background: rgba(100,100,255,0.3);
                }
                .th-settings:hover {
                    background: rgba(100,100,255,0.6);
                }
                ${tooltipStyle}
                .th-cover {
                    position: fixed;
                    top: 0;
                    left: 0;
                    width: 100%;
                    height: 100%;
                    background: rgba(0,0,0,0.6);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    z-index: 99999;
                    opacity: 0;
                    pointer-events: none;
                    transition: opacity ${CONFIG.UI_FLASH_DURATION}ms;
                }
                .th-cover.show {
                    opacity: 1;
                    pointer-events: none;
                }
                .th-cover span {
                    background: #fff;
                    color: #000;
                    font-size: 3rem;
                    font-weight: bold;
                    padding: 24px 48px;
                    border-radius: 60px;
                    box-shadow: 0 8px 24px rgba(0,0,0,0.3);
                }
                .th-settings-modal {
                    position: fixed;
                    top: 0;
                    left: 0;
                    width: 100%;
                    height: 100%;
                    background: rgba(0,0,0,0.8);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    z-index: 100002;
                    font-family: 'Segoe UI', 'Roboto', sans-serif;
                    backdrop-filter: blur(4px);
                }
                .th-settings-panel {
                    background: rgba(30,30,40,0.95);
                    backdrop-filter: blur(12px);
                    border-radius: 24px;
                    width: 90%;
                    max-width: 550px;
                    max-height: 85%;
                    color: white;
                    border: 1px solid rgba(255,255,255,0.2);
                    box-shadow: 0 8px 32px rgba(0,0,0,0.4);
                    display: flex;
                    flex-direction: column;
                    overflow: hidden;
                }
                .th-settings-header {
                    padding: 16px 20px;
                    border-bottom: 1px solid rgba(255,255,255,0.2);
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    font-weight: bold;
                    background: rgba(30,30,40,0.95);
                    backdrop-filter: blur(12px);
                    flex-shrink: 0;
                }
                .th-settings-header h3 {
                    margin: 0;
                    font-size: 1.4rem;
                }
                .th-settings-close {
                    background: #ff4444;
                    color: white;
                    border: none;
                    border-radius: 50%;
                    width: 32px;
                    height: 32px;
                    font-size: 18px;
                    cursor: pointer;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    transition: 0.2s;
                }
                .th-settings-close:hover {
                    background: #ff0000;
                    transform: scale(1.1);
                }
                .th-settings-content {
                    flex: 1;
                    overflow-y: auto;
                    padding: 20px;
                }
                .th-settings-footer {
                    padding: 12px 20px;
                    border-top: 1px solid rgba(255,255,255,0.2);
                    display: flex;
                    flex-wrap: wrap;
                    justify-content: flex-start;
                    gap: 10px;
                    background: rgba(30,30,40,0.95);
                    backdrop-filter: blur(12px);
                    flex-shrink: 0;
                }
                .th-settings-panel label {
                    display: block;
                    margin-top: 12px;
                    font-size: 0.9rem;
                }
                .th-settings-panel input, .th-settings-panel select {
                    width: 100%;
                    padding: 8px;
                    margin-top: 4px;
                    border-radius: 12px;
                    border: none;
                    background: rgba(255,255,255,0.2);
                    color: white;
                    font-size: 0.9rem;
                    box-sizing: border-box;
                }
                .th-settings-panel button {
                    padding: 8px 16px;
                    border-radius: 40px;
                    border: none;
                    background: rgba(255,255,255,0.2);
                    color: white;
                    cursor: pointer;
                    font-size: 0.9rem;
                }
                .th-settings-panel button:hover {
                    background: rgba(255,255,255,0.4);
                }
                @media (max-width: 600px) {
                    .th-settings-panel {
                        width: 95%;
                    }
                    .th-btn {
                        width: 32px;
                        height: 32px;
                        font-size: 1rem;
                    }
                    .th-speed-display {
                        min-width: 60px;
                        font-size: 1rem;
                        padding: 4px 10px;
                    }
                    .th-modern-container {
                        padding: 6px 12px;
                    }
                    .th-settings-footer button {
                        padding: 6px 12px;
                        font-size: 0.8rem;
                    }
                }
            `;

            var displayNum = (1 / timerContext._percentage).toFixed(2);
            var speed = displayNum;

            var settingsBtnHtml = CONFIG.ENABLE_SETTINGS_PANEL ? `
                <div class="th-btn th-settings th-tooltip" data-tooltip="Settings" id="th-settings">⚙</div>
            ` : '';

            var html = `
                <div class="th-modern-container" id="th-container">
                    <div class="th-speed-display" id="th-speed">x${speed}</div>
                    <div class="th-btn th-tooltip" data-tooltip="Speed up (+${CONFIG.BUTTON_STEP})" id="th-up">+</div>
                    <div class="th-btn th-tooltip" data-tooltip="Slow down (-${CONFIG.BUTTON_STEP})" id="th-down">-</div>
                    <div class="th-btn th-tooltip" data-tooltip="Multiply by ${CONFIG.BUTTON_X2}" id="th-x2">×${CONFIG.BUTTON_X2}</div>
                    <div class="th-btn th-tooltip" data-tooltip="Divide by ${1/CONFIG.BUTTON_HALF}" id="th-half">÷${1/CONFIG.BUTTON_HALF}</div>
                    <div class="th-btn th-reset th-tooltip" data-tooltip="Reset to 1x" id="th-reset">⟳</div>
                    ${settingsBtnHtml}
                </div>
                <div class="th-cover" id="th-cover">
                    <span id="th-cover-text">x${speed}</span>
                </div>
            `;

            var stylenode = document.createElement('style');
            stylenode.setAttribute("type", "text/css");
            if (stylenode.styleSheet) {
                stylenode.styleSheet.cssText = style;
            } else {
                var cssText = document.createTextNode(style);
                stylenode.appendChild(cssText);
            }

            var node = document.createElement('div');
            node.innerHTML = html;

            var container = node.querySelector('#th-container');
            var speedDisplay = node.querySelector('#th-speed');
            var cover = node.querySelector('#th-cover');
            var coverText = node.querySelector('#th-cover-text');

            // No resize handle - size is controlled via settings

            // Restore saved size from config (if not auto)
            if (CONFIG.UI_PANEL_WIDTH !== 'auto') {
                container.style.width = CONFIG.UI_PANEL_WIDTH;
            }
            if (CONFIG.UI_PANEL_HEIGHT !== 'auto') {
                container.style.height = CONFIG.UI_PANEL_HEIGHT;
            }

            // --- Draggable (only when not clicking on buttons) ---
            var isDragging = false, dragStartX, dragStartY, startLeft, startTop;
            var savedPos = localStorage.getItem('timerHookerPos');
            if (savedPos) {
                var pos = JSON.parse(savedPos);
                container.style.left = pos.left + 'px';
                container.style.top = pos.top + 'px';
                container.style.right = 'auto';
            } else {
                container.style.left = CONFIG.UI_POSITION.left;
                container.style.top = CONFIG.UI_POSITION.top;
            }

            container.addEventListener('mousedown', function (e) {
                // If any button is clicked, do not drag
                if (e.target.closest('.th-btn')) return;
                
                isDragging = true;
                container.classList.add('dragging');
                dragStartX = e.clientX;
                dragStartY = e.clientY;
                startLeft = parseInt(container.style.left) || 20;
                startTop = parseInt(container.style.top) || (window.innerHeight * 0.2);
                e.preventDefault();
            });
            window.addEventListener('mousemove', function (e) {
                if (!isDragging) return;
                var newLeft = startLeft + (e.clientX - dragStartX);
                var newTop = startTop + (e.clientY - dragStartY);
                container.style.left = newLeft + 'px';
                container.style.top = newTop + 'px';
                container.style.right = 'auto';
            });
            window.addEventListener('mouseup', function () {
                if (isDragging) {
                    isDragging = false;
                    container.classList.remove('dragging');
                    localStorage.setItem('timerHookerPos', JSON.stringify({
                        left: parseInt(container.style.left),
                        top: parseInt(container.style.top)
                    }));
                }
            });

            // Update UI function
            function updateUI(percentage) {
                var newSpeed = (1 / percentage).toFixed(2);
                speedDisplay.textContent = `x${newSpeed}`;
                coverText.textContent = `x${newSpeed}`;
                cover.classList.add('show');
                setTimeout(() => cover.classList.remove('show'), CONFIG.UI_FLASH_DURATION);
            }

            function changeTime(operation, value) {
                var current = 1 / timerContext._percentage;
                var newSpeed;
                switch (operation) {
                    case 'add':
                        newSpeed = Math.max(CONFIG.MIN_SPEED, Math.min(CONFIG.MAX_SPEED, current + value));
                        break;
                    case 'multiply':
                        newSpeed = Math.max(CONFIG.MIN_SPEED, Math.min(CONFIG.MAX_SPEED, current * value));
                        break;
                    case 'reset':
                        newSpeed = CONFIG.DEFAULT_SPEED;
                        break;
                    default: return;
                }
                timerContext.change(1 / newSpeed);
            }

            node.querySelector('#th-up').onclick = () => changeTime('add', CONFIG.BUTTON_STEP);
            node.querySelector('#th-down').onclick = () => changeTime('add', -CONFIG.BUTTON_STEP);
            node.querySelector('#th-x2').onclick = () => changeTime('multiply', CONFIG.BUTTON_X2);
            node.querySelector('#th-half').onclick = () => changeTime('multiply', CONFIG.BUTTON_HALF);
            node.querySelector('#th-reset').onclick = () => changeTime('reset');

            if (CONFIG.ENABLE_SETTINGS_PANEL) {
                node.querySelector('#th-settings').onclick = () => showSettingsModal(rebuildUI);
            }

            timerContext._uiUpdate = updateUI;

            currentUIContainer = container;
            currentNode = node;
            currentStyleNode = stylenode;

            if (!global.isDOMLoaded) {
                document.addEventListener('readystatechange', function () {
                    if ((document.readyState === "interactive" || document.readyState === "complete") && !global.isDOMRendered) {
                        document.head.appendChild(stylenode);
                        document.body.appendChild(node);
                        global.isDOMRendered = true;
                        debug('Timer Hooker loaded');
                    }
                });
            } else {
                document.head.appendChild(stylenode);
                document.body.appendChild(node);
                global.isDOMRendered = true;
                debug('Timer Hooker loaded');
            }
        }

        // Settings modal with panel size controls
        function showSettingsModal(onSaveCallback) {
            const modal = document.createElement('div');
            modal.className = 'th-settings-modal';
            const panel = document.createElement('div');
            panel.className = 'th-settings-panel';

            const header = document.createElement('div');
            header.className = 'th-settings-header';
            header.innerHTML = '<h3>⚙ TimeWarp Settings</h3>';
            const closeBtn = document.createElement('button');
            closeBtn.innerHTML = '✕';
            closeBtn.className = 'th-settings-close';
            closeBtn.onclick = () => modal.remove();
            header.appendChild(closeBtn);

            const content = document.createElement('div');
            content.className = 'th-settings-content';
            let formHtml = '';
            for (let [key, value] of Object.entries(CONFIG)) {
                if (typeof value === 'function') continue;
                if (key === 'ENABLE_SETTINGS_PANEL') continue;
                let inputType = 'text';
                if (typeof value === 'boolean') inputType = 'checkbox';
                if (typeof value === 'number') inputType = 'number';
                if (key === 'UI_POSITION') {
                    formHtml += `<label>${key} (JSON)<input type="text" id="cfg_${key}" value='${JSON.stringify(value)}'></label>`;
                    continue;
                }
                if (key === 'UI_PANEL_WIDTH' || key === 'UI_PANEL_HEIGHT') {
                    formHtml += `<label>${key} (pixels e.g. "300px" or "auto")<input type="text" id="cfg_${key}" value="${value}"></label>`;
                    continue;
                }
                if (inputType === 'checkbox') {
                    formHtml += `<label><input type="checkbox" id="cfg_${key}" ${value ? 'checked' : ''}> ${key}</label>`;
                } else {
                    formHtml += `<label>${key}<input type="${inputType}" id="cfg_${key}" value="${value}" step="any"></label>`;
                }
            }
            content.innerHTML = formHtml;

            const footer = document.createElement('div');
            footer.className = 'th-settings-footer';
            const saveBtn = document.createElement('button');
            saveBtn.textContent = '💾 Save';
            saveBtn.style.background = '#4CAF50';
            const exportBtn = document.createElement('button');
            exportBtn.textContent = '📤 Export JSON';
            const importBtn = document.createElement('button');
            importBtn.textContent = '📂 Import JSON';
            const resetBtn = document.createElement('button');
            resetBtn.textContent = '⟳ Reset Default';
            resetBtn.style.background = 'rgba(255,100,100,0.5)';
            footer.appendChild(saveBtn);
            footer.appendChild(exportBtn);
            footer.appendChild(importBtn);
            footer.appendChild(resetBtn);

            panel.appendChild(header);
            panel.appendChild(content);
            panel.appendChild(footer);
            modal.appendChild(panel);
            document.body.appendChild(modal);

            modal.addEventListener('click', (e) => { if (e.target === modal) modal.remove(); });

            function saveSettings() {
                for (let [key, value] of Object.entries(CONFIG)) {
                    if (typeof value === 'function') continue;
                    if (key === 'ENABLE_SETTINGS_PANEL') continue;
                    const input = document.getElementById(`cfg_${key}`);
                    if (!input) continue;
                    let newVal;
                    if (input.type === 'checkbox') newVal = input.checked;
                    else if (input.type === 'number') newVal = parseFloat(input.value);
                    else {
                        if (key === 'UI_POSITION') {
                            try { newVal = JSON.parse(input.value); } catch(e) { newVal = CONFIG.UI_POSITION; }
                        } else {
                            newVal = input.value;
                            // For width/height, ensure it's a valid string (pixels or 'auto')
                            if (key === 'UI_PANEL_WIDTH' || key === 'UI_PANEL_HEIGHT') {
                                if (newVal !== 'auto' && !/^\d+(px)?$/.test(newVal)) {
                                    newVal = 'auto';
                                }
                            }
                        }
                    }
                    CONFIG[key] = newVal;
                }
                if (timerContext.changeVideoSpeed) timerContext.changeVideoSpeed(true);
                if (onSaveCallback) onSaveCallback();
            }

            function resetToBase() {
                for (let key of Object.keys(BASE_CONFIG)) {
                    if (typeof CONFIG[key] !== 'function') CONFIG[key] = JSON.parse(JSON.stringify(BASE_CONFIG[key]));
                }
                for (let [key, value] of Object.entries(CONFIG)) {
                    if (key === 'ENABLE_SETTINGS_PANEL') continue;
                    const inp = document.getElementById(`cfg_${key}`);
                    if (inp) {
                        if (inp.type === 'checkbox') inp.checked = value;
                        else if (key === 'UI_POSITION') inp.value = JSON.stringify(value);
                        else inp.value = value;
                    }
                }
                alert('Reset to base. Click Save.');
            }

            function importJSON() {
                const input = document.createElement('input');
                input.type = 'file';
                input.accept = 'application/json';
                input.onchange = e => {
                    const file = e.target.files[0];
                    if (!file) return;
                    const reader = new FileReader();
                    reader.onload = ev => {
                        try {
                            const imported = JSON.parse(ev.target.result);
                            for (let key of Object.keys(imported)) {
                                if (CONFIG.hasOwnProperty(key) && key !== 'ENABLE_SETTINGS_PANEL') CONFIG[key] = imported[key];
                            }
                            for (let [key, value] of Object.entries(CONFIG)) {
                                if (key === 'ENABLE_SETTINGS_PANEL') continue;
                                const inp = document.getElementById(`cfg_${key}`);
                                if (inp) {
                                    if (inp.type === 'checkbox') inp.checked = value;
                                    else if (key === 'UI_POSITION') inp.value = JSON.stringify(value);
                                    else inp.value = value;
                                }
                            }
                            alert('Imported. Click Save.');
                        } catch(err) { alert('Invalid JSON'); }
                    };
                    reader.readAsText(file);
                };
                input.click();
            }

            function exportJSON() {
                const exportConfig = {};
                for (let key in CONFIG) {
                    if (typeof CONFIG[key] !== 'function' && key !== 'ENABLE_SETTINGS_PANEL') exportConfig[key] = CONFIG[key];
                }
                const dataStr = JSON.stringify(exportConfig, null, 2);
                const blob = new Blob([dataStr], {type: 'application/json'});
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = 'timewarp_config.json';
                a.click();
                URL.revokeObjectURL(url);
            }

            saveBtn.onclick = () => { saveSettings(); modal.remove(); };
            importBtn.onclick = importJSON;
            exportBtn.onclick = exportJSON;
            resetBtn.onclick = resetToBase;
        }

        return {
            applyUI,
            applyGlobalAction: function (timer) {
                timer.changeTime = function (anum, cnum, isa, isr) {
                    if (isr) { global.timer.change(1); return; }
                    if (!global.timer) return;
                    var result;
                    if (!anum && !cnum) {
                        var t = prompt("Speed factor: " + (1 / timerContext._percentage).toFixed(2));
                        if (t == null) return;
                        if (isNaN(parseFloat(t))) { alert("Invalid"); timer.changeTime(); return; }
                        if (parseFloat(t) <= 0) { alert(">0"); timer.changeTime(); return; }
                        result = 1 / parseFloat(t);
                    } else {
                        if (isa && anum) {
                            if (1 / timerContext._percentage <= 1 && anum < 0) return;
                            result = 1 / (1 / timerContext._percentage + anum);
                        } else {
                            if (cnum <= 0) cnum = 1 / -cnum;
                            result = 1 / ((1 / timerContext._percentage) * cnum);
                        }
                    }
                    timer.change(result);
                };
                global.changeTime = timer.changeTime;
            },
            applyHooking: function () { 
                var _this = this;
                if (CONFIG.HOOK_TIMERS) {
                    eHookContext.hookReplace(window, 'setInterval', function (setInterval) {
                        return _this.getHookedTimerFunction('interval', setInterval);
                    });
                    eHookContext.hookReplace(window, 'setTimeout', function (setTimeout) {
                        return _this.getHookedTimerFunction('timeout', setTimeout);
                    });
                    eHookContext.hookBefore(window, 'clearInterval', function (method, args) {
                        _this.redirectNewestId(args);
                    });
                    eHookContext.hookBefore(window, 'clearTimeout', function (method, args) {
                        _this.redirectNewestId(args);
                    });
                }

                if (CONFIG.HOOK_RAF) {
                    var originalRAF = window.requestAnimationFrame;
                    var originalCAF = window.cancelAnimationFrame;
                    var rafCallbacks = new Map();
                    var rafIdCounter = 0;
                    window.requestAnimationFrame = function (callback) {
                        var id = ++rafIdCounter;
                        var lastTime = timerContext._Date.now();
                        var desiredDelay = 16 / timerContext._percentage;
                        var nextTime = lastTime + desiredDelay;
                        var wrapped = function (timestamp) {
                            var now = timerContext._Date.now();
                            if (now >= nextTime) {
                                callback(timestamp);
                                lastTime = now;
                                nextTime = now + desiredDelay;
                            } else {
                                rafCallbacks.set(id, requestAnimationFrame(wrapped));
                            }
                        };
                        var actualId = originalRAF.call(window, wrapped);
                        rafCallbacks.set(id, actualId);
                        return id;
                    };
                    window.cancelAnimationFrame = function (id) {
                        var actualId = rafCallbacks.get(id);
                        if (actualId) {
                            originalCAF.call(window, actualId);
                            rafCallbacks.delete(id);
                        }
                    };
                    eHookContext.hookedToString(originalRAF, window.requestAnimationFrame);
                    eHookContext.hookedToString(originalCAF, window.cancelAnimationFrame);
                }

                if (CONFIG.HOOK_DATE) {
                    var newFunc = this.getHookedDateConstructor();
                    eHookContext.hookClass(window, 'Date', newFunc, '_innerDate', ['now']);
                    Date.now = function () {
                        return new Date().getTime();
                    };
                    eHookContext.hookedToString(timerContext._Date.now, Date.now);

                    var objToString = Object.prototype.toString;
                    Object.prototype.toString = function toString() {
                        if (this instanceof timerContext._mDate) {
                            return '[object Date]';
                        }
                        return objToString.call(this);
                    };
                    eHookContext.hookedToString(objToString, Object.prototype.toString);
                }

                eHookContext.hookedToString(timerContext._setInterval, setInterval);
                eHookContext.hookedToString(timerContext._setTimeout, setTimeout);
                eHookContext.hookedToString(timerContext._clearInterval, clearInterval);
                timerContext._mDate = window.Date;
                this.hookShadowRoot();
            },
            getHookedDateConstructor: function () { 
                return function () {
                    if (arguments.length === 1) {
                        Object.defineProperty(this, '_innerDate', {
                            configurable: false, enumerable: false,
                            value: new timerContext._Date(arguments[0]), writable: false
                        });
                        return;
                    } else if (arguments.length > 1) {
                        var definedValue;
                        switch (arguments.length) {
                            case 2: definedValue = new timerContext._Date(arguments[0], arguments[1]); break;
                            case 3: definedValue = new timerContext._Date(arguments[0], arguments[1], arguments[2]); break;
                            case 4: definedValue = new timerContext._Date(arguments[0], arguments[1], arguments[2], arguments[3]); break;
                            case 5: definedValue = new timerContext._Date(arguments[0], arguments[1], arguments[2], arguments[3], arguments[4]); break;
                            case 6: definedValue = new timerContext._Date(arguments[0], arguments[1], arguments[2], arguments[3], arguments[4], arguments[5]); break;
                            default: definedValue = new timerContext._Date(arguments[0], arguments[1], arguments[2], arguments[3], arguments[4], arguments[5], arguments[6]); break;
                        }
                        Object.defineProperty(this, '_innerDate', { configurable: false, enumerable: false, value: definedValue, writable: false });
                        return;
                    }
                    var now = timerContext._Date.now();
                    var passTime = now - timerContext.__lastDatetime;
                    var hookPassTime = passTime * (1 / timerContext._percentage);
                    Object.defineProperty(this, '_innerDate', { configurable: false, enumerable: false, value: new timerContext._Date(timerContext.__lastMDatetime + hookPassTime), writable: false });
                };
            },
            getHookedTimerFunction: function (type, timer) {
                var property = '_' + type + 'Ids';
                return function () {
                    var uniqueId = timerContext.genUniqueId();
                    var callback = arguments[0];
                    if (typeof callback === 'string') {
                        callback += ';timer.notifyExec(' + uniqueId + ')';
                        arguments[0] = callback;
                    }
                    if (typeof callback === 'function') {
                        arguments[0] = function () {
                            var returnValue = callback.apply(this, arguments);
                            timerContext.notifyExec(uniqueId);
                            return returnValue;
                        }
                    }
                    var originMS = arguments[1];
                    arguments[1] *= timerContext._percentage;
                    var resultId = timer.apply(window, arguments);
                    timerContext[property][resultId] = {
                        args: arguments, originMS: originMS, originId: resultId, nowId: resultId,
                        uniqueId: uniqueId, oldPercentage: timerContext._percentage,
                        exceptNextFireTime: timerContext._Date.now() + originMS
                    };
                    return resultId;
                };
            },
            redirectNewestId: function (args) {
                var id = args[0];
                if (timerContext._intervalIds[id]) {
                    args[0] = timerContext._intervalIds[id].nowId;
                    delete timerContext._intervalIds[id];
                }
                if (timerContext._timeoutIds[id]) {
                    args[0] = timerContext._timeoutIds[id].nowId;
                    delete timerContext._timeoutIds[id];
                }
            },
            registerShortcutKeys: function (timer) {
                addEventListener('keydown', function (e) {
                    if (CONFIG.USE_ARROWS && (e.target === document.body || e.target === document.documentElement || e.target.tagName !== 'INPUT')) {
                        let step = CONFIG.ARROW_STEP;
                        if (e.shiftKey) step = CONFIG.ARROW_SHIFT_STEP;
                        if (e.ctrlKey) step = CONFIG.ARROW_CTRL_STEP;
                        if (e.key === 'ArrowUp') {
                            e.preventDefault();
                            var current = 1 / timerContext._percentage;
                            var newSpeed = Math.max(CONFIG.MIN_SPEED, Math.min(CONFIG.MAX_SPEED, current + step));
                            timer.change(1 / newSpeed);
                        } else if (e.key === 'ArrowDown') {
                            e.preventDefault();
                            var current = 1 / timerContext._percentage;
                            var newSpeed = Math.max(CONFIG.MIN_SPEED, Math.min(CONFIG.MAX_SPEED, current - step));
                            timer.change(1 / newSpeed);
                        } else if (e.key === 'ArrowLeft') {
                            e.preventDefault();
                            var current = 1 / timerContext._percentage;
                            var newSpeed = Math.max(CONFIG.MIN_SPEED, Math.min(CONFIG.MAX_SPEED, current * 2));
                            timer.change(1 / newSpeed);
                        } else if (e.key === 'ArrowRight') {
                            e.preventDefault();
                            var current = 1 / timerContext._percentage;
                            var newSpeed = Math.max(CONFIG.MIN_SPEED, Math.min(CONFIG.MAX_SPEED, current / 2));
                            timer.change(1 / newSpeed);
                        }
                    }
                    if (CONFIG.ENABLE_LEGACY_SHORTCUTS && (e.ctrlKey || e.altKey)) {
                        const key = e.key;
                        switch (key) {
                            case '9': case '0':
                                if (key === '9' && (e.ctrlKey || e.altKey)) timer.changeTime();
                                if (key === '0' && (e.ctrlKey || e.altKey)) timer.changeTime(0, 0, false, true);
                                break;
                            case '=': case '+':
                                if (e.ctrlKey) timer.changeTime(2, 0, true);
                                else if (e.altKey) timer.changeTime(0, 2);
                                break;
                            case '-': case '_':
                                if (e.ctrlKey) timer.changeTime(-2, 0, true);
                                else if (e.altKey) timer.changeTime(0, -2);
                                break;
                        }
                    }
                });
            },
            percentageChangeHandler: function (percentage) {
                if (CONFIG.HOOK_TIMERS) {
                    for (var id in timerContext._intervalIds) {
                        var idObj = timerContext._intervalIds[id];
                        idObj.args[1] = Math.floor((idObj.originMS || 1) * percentage);
                        timerContext._clearInterval.call(window, idObj.nowId);
                        idObj.nowId = timerContext._setInterval.apply(window, idObj.args);
                    }
                    for (var id in timerContext._timeoutIds) {
                        var idObj = timerContext._timeoutIds[id];
                        var now = timerContext._Date.now();
                        var exceptTime = idObj.exceptNextFireTime;
                        var oldPercentage = idObj.oldPercentage;
                        var time = exceptTime - now;
                        if (time < 0) time = 0;
                        var changedTime = Math.floor(percentage / oldPercentage * time);
                        idObj.args[1] = changedTime;
                        idObj.exceptNextFireTime = now + changedTime;
                        idObj.oldPercentage = percentage;
                        timerContext._clearTimeout.call(window, idObj.nowId);
                        idObj.nowId = timerContext._setTimeout.apply(window, idObj.args);
                    }
                }
                if (timerContext._uiUpdate) timerContext._uiUpdate(percentage);
            },
            hookShadowRoot: function () {
                var origin = Element.prototype.attachShadow;
                eHookContext.hookAfter(Element.prototype, 'attachShadow', function (m, args, result) {
                    extraElements.push(result);
                    return result;
                }, false);
                eHookContext.hookedToString(origin, Element.prototype.attachShadow);
            },
            hookDefine: function () {
                const _this = this;
                eHookContext.hookBefore(Object, 'defineProperty', function (m, args) {
                    var option = args[2];
                    var ele = args[0];
                    var key = args[1];
                    var afterArgs = _this.hookDefineDetails(ele, key, option);
                    afterArgs.forEach((arg, i) => { args[i] = arg; });
                });
                eHookContext.hookBefore(Object, 'defineProperties', function (m, args) {
                    var option = args[1];
                    var ele = args[0];
                    if (ele && ele instanceof Element) {
                        Object.keys(option).forEach(key => {
                            var o = option[key];
                            var afterArgs = _this.hookDefineDetails(ele, key, o);
                            args[0] = afterArgs[0];
                            delete option[key];
                            option[afterArgs[1]] = afterArgs[2];
                        });
                    }
                });
            },
            hookDefineDetails: function (target, key, option) {
                if (option && target && target instanceof Element && typeof key === 'string' && key.indexOf('on') >= 0) {
                    option.configurable = true;
                }
                if (target instanceof HTMLVideoElement && key === 'playbackRate' && CONFIG.VIDEO_FORCE_RATE) {
                    option.configurable = true;
                    debug('Overriding video playbackRate');
                    key = 'playbackRate_hooked';
                }
                return [target, key, option];
            },
            changePlaybackRate: function (ele, rate) {
                if (!CONFIG.VIDEO_FORCE_RATE) return;
                var descriptor = Object.getOwnPropertyDescriptor(ele, 'playbackRate');
                if (descriptor && descriptor.configurable && descriptor.set === this.noopSetter) {
                    delete ele.playbackRate;
                }
                ele.playbackRate = rate;
                ele[RATE_SYM] = rate;
                Object.defineProperty(ele, 'playbackRate', {
                    configurable: true,
                    get: function() { return this[RATE_SYM] ?? 1; },
                    set: this.noopSetter
                });
            },
            noopSetter: function() {},
            watchForVideos: function() {
                if (!CONFIG.VIDEO_OBSERVER) return;
                var observer = new MutationObserver(function(mutations) {
                    for (var mutation of mutations) {
                        for (var node of mutation.addedNodes) {
                            if (node.nodeType === Node.ELEMENT_NODE) {
                                if (node.matches && node.matches('video')) {
                                    timerContext.changeVideoSpeed(true);
                                }
                                if (node.querySelectorAll) {
                                    var videos = node.querySelectorAll('video');
                                    if (videos.length) timerContext.changeVideoSpeed(true);
                                }
                                if (node.tagName === 'IFRAME' || node.tagName === 'FRAME') {
                                    try {
                                        var iframeDoc = node.contentDocument || node.contentWindow.document;
                                        if (iframeDoc) {
                                            observer.observe(iframeDoc, { childList: true, subtree: true });
                                        }
                                    } catch(e) {}
                                }
                            }
                        }
                    }
                });
                observer.observe(document, { childList: true, subtree: true });
                observer.observe(document.documentElement, { childList: true, subtree: true });
            }
        }
    };

    var normalUtil = {
        isInIframe: function () {
            let is = global.parent !== global;
            try { is = is && global.parent.document.body.tagName !== 'FRAMESET'; } catch(e) {}
            return is;
        },
        listenParentEvent: function (handler) {
            global.addEventListener('message', function (e) {
                var data = e.data;
                if (data.type === 'changePercentage') handler(data.percentage);
            });
        },
        sendChangesToIframe: function (percentage) {
            var iframes = document.querySelectorAll('iframe, frame');
            for (var i = 0; i < iframes.length; i++) {
                try { iframes[i].contentWindow.postMessage({ type: 'changePercentage', percentage: percentage }, '*'); } catch(e) {}
            }
        }
    };

    var querySelectorAll = function (ele, selector, includeExtra) {
        var elements = ele.querySelectorAll(selector);
        elements = Array.prototype.slice.call(elements || []);
        if (includeExtra) {
            extraElements.forEach(function (element) {
                elements = elements.concat(querySelectorAll(element, selector, false));
            });
        }
        return elements;
    };

    var generate = function () {
        return function (util) {
            var eHookContext = this;
            var timerHooker = {
                _intervalIds: {}, _timeoutIds: {}, _auoUniqueId: 1,
                __percentage: 1 / CONFIG.DEFAULT_SPEED,
                _setInterval: window['setInterval'], _clearInterval: window['clearInterval'],
                _clearTimeout: window['clearTimeout'], _setTimeout: window['setTimeout'],
                _Date: window['Date'],
                __lastDatetime: new Date().getTime(), __lastMDatetime: new Date().getTime(),
                genUniqueId: function () { return this._auoUniqueId++; },
                notifyExec: function (uniqueId) {
                    if (uniqueId) {
                        for (var id in this._timeoutIds) {
                            if (this._timeoutIds[id].uniqueId === uniqueId) {
                                this._clearTimeout.call(window, this._timeoutIds[id].nowId);
                                delete this._timeoutIds[id];
                            }
                        }
                    }
                },
                init: function () {
                    var timerContext = this;
                    var h = helper(eHookContext, timerContext, util);
                    h.hookDefine();
                    h.applyHooking();
                    h.watchForVideos();
                    Object.defineProperty(timerContext, '_percentage', {
                        get: () => timerContext.__percentage,
                        set: function(percentage) {
                            if (percentage === timerContext.__percentage) return percentage;
                            h.percentageChangeHandler(percentage);
                            timerContext.__percentage = percentage;
                            return percentage;
                        }
                    });
                    if (!normalUtil.isInIframe()) {
                        h.applyUI();
                        h.applyGlobalAction(timerContext);
                        h.registerShortcutKeys(timerContext);
                    } else {
                        normalUtil.listenParentEvent(function (percentage) { this.change(percentage); }.bind(this));
                    }
                },
                change: function (percentage) {
                    this.__lastMDatetime = this._mDate.now();
                    this.__lastDatetime = this._Date.now();
                    this._percentage = percentage;
                    this.changeVideoSpeed();
                    normalUtil.sendChangesToIframe(percentage);
                },
                changeVideoSpeed: function (forceAll = false) {
                    var h = helper(eHookContext, this, util);
                    var rate = 1 / this._percentage;
                    rate = Math.min(CONFIG.MAX_SPEED, Math.max(CONFIG.MIN_SPEED, rate));
                    var videos = querySelectorAll(document, 'video', true);
                    for (var i = 0; i < videos.length; i++) h.changePlaybackRate(videos[i], rate);
                }
            };
            timerHooker.init();
            return timerHooker;
        }
    };

    if (global.eHook) {
        global.eHook.plugins({ name: 'timer', mount: generate() });
    }
}(window);
