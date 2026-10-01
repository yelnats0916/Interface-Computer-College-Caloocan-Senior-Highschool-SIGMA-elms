/**
 * Sigma ELMS - Circular Time Picker Component
 * Lightweight, zero-dependency, standalone circular time picker.
 * Features:
 * - Clean Track with Micro Numbers (12, 3, 6, 9)
 * - Concentric Dual Rings (Outer: Hour, Inner: Minute)
 * - Zero Puck Overlap Clearance (R=70.5 Outer, R=53 Inner, R_knob=8.5)
 * - Touch and Pointer Dragging (Mobile and Desktop)
 * - AM / PM Toggle and Direct Editable Inputs
 */

(function (global) {
  'use strict';

  function getCurrentTimeDefaults() {
    const now = new Date();
    let rawH = now.getHours();
    let m = now.getMinutes();
    let p = rawH >= 12 ? 'PM' : 'AM';
    let h = rawH % 12 || 12;
    return { hour: h, minute: m, period: p };
  }

  function createCircularTimePicker(container, options = {}) {
    if (!container) return null;

    let {
      initialTime = null, // null defaults to current local time in dial without modifying input
      onChange = null,
      primaryColor = '#15803d',
      trackColor = '#f1f5f9',
      dashColor = '#cbd5e1'
    } = options;

    const nowDefaults = getCurrentTimeDefaults();
    let hour = nowDefaults.hour;
    let minute = nowDefaults.minute;
    let period = nowDefaults.period;

    // Parse initial time if provided and not placeholder
    if (initialTime && initialTime !== '--:-- --' && initialTime !== 'current') {
      const match = String(initialTime).match(/(\d{1,2})[:.](\d{2})(?:\s*([AP]M))?/i);
      if (match) {
        let h = parseInt(match[1], 10);
        let m = parseInt(match[2], 10);
        let p = match[3] ? match[3].toUpperCase() : null;

        if (!p) {
          if (h >= 12) {
            p = 'PM';
            if (h > 12) h -= 12;
          } else {
            p = 'AM';
            if (h === 0) h = 12;
          }
        }
        hour = h || 12;
        minute = isNaN(m) ? 0 : m;
        period = p || 'AM';
      }
    }

    const uniqueId = 'dial_' + Math.random().toString(36).substring(2, 9);

    container.innerHTML = `
      <div style="width: 100%; display: flex; flex-direction: column; align-items: center; user-select: none; -webkit-user-select: none; touch-action: none;">
        <!-- Dial Surface: 172px x 172px -->
        <div id="${uniqueId}_surface" style="position: relative; width: 172px; height: 172px; min-width: 172px; min-height: 172px; display: flex; align-items: center; justify-content: center; cursor: default; user-select: none; touch-action: none;">
          
          <!-- Center Hub (z-index 1: in the background with normal default cursor) -->
          <div id="${uniqueId}_hub" style="position: absolute; z-index: 1; display: flex; flex-direction: column; align-items: center; justify-content: center; width: 88px; height: 88px; border-radius: 9999px; background-color: #ffffff; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -2px rgba(0, 0, 0, 0.1); border: 1px solid rgba(226, 232, 240, 0.9); cursor: default;">
            <div style="display: flex; align-items: center; justify-content: center; height: 25px; margin-top: 1px; user-select: none;">
              <span id="${uniqueId}_disp_h" tabindex="0" role="spinbutton" aria-label="Hour" style="font-size: 15px; font-weight: 700; color: #000000; min-width: 21px; text-align: center; padding: 0.5px 2.5px; border-radius: 5px; border: 1px solid transparent; transition: all 0.15s ease; cursor: pointer; pointer-events: auto; outline: none;">${String(hour).padStart(2, '0')}</span>
              <span style="font-size: 15px; font-weight: 700; color: #000000; margin: 0 1px; padding-bottom: 2px; pointer-events: none;">:</span>
              <span id="${uniqueId}_disp_m" tabindex="0" role="spinbutton" aria-label="Minute" style="font-size: 15px; font-weight: 700; color: #000000; min-width: 21px; text-align: center; padding: 0.5px 2.5px; border-radius: 5px; border: 1px solid transparent; transition: all 0.15s ease; cursor: pointer; pointer-events: auto; outline: none;">${String(minute).padStart(2, '0')}</span>
            </div>

            <!-- AM/PM Toggle Pill (Green Segmented Tab) -->
            <div style="position: relative; z-index: 20; pointer-events: auto; display: flex; align-items: center; gap: 2px; padding: 2px; background-color: #f1f5f9; border-radius: 6px; margin-top: 2px; border: 1px solid #e2e8f0;">
              <button type="button" id="${uniqueId}_btn_am" style="min-width: 21px; padding: 1.5px 4px; border-radius: 4px; font-size: 8px; font-weight: 700; border: none; cursor: pointer; transition: all 0.15s ease; ${period === 'AM' ? 'background-color: #15803d; color: #ffffff; font-weight: 800; box-shadow: 0 1px 3px rgba(21, 128, 61, 0.25);' : 'background-color: transparent; color: rgba(0, 0, 0, 0.45); font-weight: 600; box-shadow: none;'}">
                AM
              </button>
              <button type="button" id="${uniqueId}_btn_pm" style="min-width: 21px; padding: 1.5px 4px; border-radius: 4px; font-size: 8px; font-weight: 700; border: none; cursor: pointer; transition: all 0.15s ease; ${period === 'PM' ? 'background-color: #15803d; color: #ffffff; font-weight: 800; box-shadow: 0 1px 3px rgba(21, 128, 61, 0.25);' : 'background-color: transparent; color: rgba(0, 0, 0, 0.45); font-weight: 600; box-shadow: none;'}">
                PM
              </button>
            </div>
          </div>

          <!-- SVG Dial Layer (z-index 10: Knobs and Micro numbers IN FRONT of hub) -->
          <svg style="position: absolute; inset: 0; width: 172px; height: 172px; min-width: 172px; min-height: 172px; pointer-events: none; z-index: 10;" viewBox="0 0 180 180">
            <defs>
              <filter id="${uniqueId}_shadow" x="-50%" y="-50%" width="200%" height="200%">
                <feDropShadow dx="0" dy="1.5" stdDeviation="2" flood-color="#0f172a" flood-opacity="0.22"/>
              </filter>
            </defs>

            <!-- Outer Dash Line -->
            <circle cx="90" cy="90" r="79.2" fill="none" stroke="${dashColor}" stroke-width="1" stroke-dasharray="2.5 2.5" />
            <!-- Middle Dash Line -->
            <circle cx="90" cy="90" r="61.8" fill="none" stroke="${dashColor}" stroke-width="1" stroke-dasharray="2.5 2.5" />

            <!-- Base Tracks -->
            <circle cx="90" cy="90" r="70.5" fill="none" stroke="${trackColor}" stroke-width="10" />
            <circle cx="90" cy="90" r="53" fill="none" stroke="${trackColor}" stroke-width="10" />

            <!-- Full 12 Hours (1 to 12) on Outer Hour Track (R=70.5) -->
            <text x="90" y="19.5" font-size="7.5" font-weight="700" fill="#475569" stroke="#ffffff" stroke-width="2.5" stroke-linejoin="round" paint-order="stroke fill" text-anchor="middle" dominant-baseline="central" font-family="'Inter', sans-serif">12</text>
            <text x="125.25" y="28.94" font-size="7.5" font-weight="700" fill="#475569" stroke="#ffffff" stroke-width="2.5" stroke-linejoin="round" paint-order="stroke fill" text-anchor="middle" dominant-baseline="central" font-family="'Inter', sans-serif">1</text>
            <text x="151.06" y="54.75" font-size="7.5" font-weight="700" fill="#475569" stroke="#ffffff" stroke-width="2.5" stroke-linejoin="round" paint-order="stroke fill" text-anchor="middle" dominant-baseline="central" font-family="'Inter', sans-serif">2</text>
            <text x="160.5" y="90" font-size="7.5" font-weight="700" fill="#475569" stroke="#ffffff" stroke-width="2.5" stroke-linejoin="round" paint-order="stroke fill" text-anchor="middle" dominant-baseline="central" font-family="'Inter', sans-serif">3</text>
            <text x="151.06" y="125.25" font-size="7.5" font-weight="700" fill="#475569" stroke="#ffffff" stroke-width="2.5" stroke-linejoin="round" paint-order="stroke fill" text-anchor="middle" dominant-baseline="central" font-family="'Inter', sans-serif">4</text>
            <text x="125.25" y="151.06" font-size="7.5" font-weight="700" fill="#475569" stroke="#ffffff" stroke-width="2.5" stroke-linejoin="round" paint-order="stroke fill" text-anchor="middle" dominant-baseline="central" font-family="'Inter', sans-serif">5</text>
            <text x="90" y="160.5" font-size="7.5" font-weight="700" fill="#475569" stroke="#ffffff" stroke-width="2.5" stroke-linejoin="round" paint-order="stroke fill" text-anchor="middle" dominant-baseline="central" font-family="'Inter', sans-serif">6</text>
            <text x="54.75" y="151.06" font-size="7.5" font-weight="700" fill="#475569" stroke="#ffffff" stroke-width="2.5" stroke-linejoin="round" paint-order="stroke fill" text-anchor="middle" dominant-baseline="central" font-family="'Inter', sans-serif">7</text>
            <text x="28.94" y="125.25" font-size="7.5" font-weight="700" fill="#475569" stroke="#ffffff" stroke-width="2.5" stroke-linejoin="round" paint-order="stroke fill" text-anchor="middle" dominant-baseline="central" font-family="'Inter', sans-serif">8</text>
            <text x="19.5" y="90" font-size="7.5" font-weight="700" fill="#475569" stroke="#ffffff" stroke-width="2.5" stroke-linejoin="round" paint-order="stroke fill" text-anchor="middle" dominant-baseline="central" font-family="'Inter', sans-serif">9</text>
            <text x="28.94" y="54.75" font-size="7.5" font-weight="700" fill="#475569" stroke="#ffffff" stroke-width="2.5" stroke-linejoin="round" paint-order="stroke fill" text-anchor="middle" dominant-baseline="central" font-family="'Inter', sans-serif">10</text>
            <text x="54.75" y="28.94" font-size="7.5" font-weight="700" fill="#475569" stroke="#ffffff" stroke-width="2.5" stroke-linejoin="round" paint-order="stroke fill" text-anchor="middle" dominant-baseline="central" font-family="'Inter', sans-serif">11</text>

            <!-- Full 12 Minutes (00 to 55) on Inner Minute Track (R=53) -->
            <text x="90" y="37" font-size="6.5" font-weight="700" fill="#64748b" stroke="#ffffff" stroke-width="2" stroke-linejoin="round" paint-order="stroke fill" text-anchor="middle" dominant-baseline="central" font-family="'Inter', sans-serif">00</text>
            <text x="116.5" y="44.1" font-size="6.5" font-weight="700" fill="#64748b" stroke="#ffffff" stroke-width="2" stroke-linejoin="round" paint-order="stroke fill" text-anchor="middle" dominant-baseline="central" font-family="'Inter', sans-serif">05</text>
            <text x="135.9" y="63.5" font-size="6.5" font-weight="700" fill="#64748b" stroke="#ffffff" stroke-width="2" stroke-linejoin="round" paint-order="stroke fill" text-anchor="middle" dominant-baseline="central" font-family="'Inter', sans-serif">10</text>
            <text x="143" y="90" font-size="6.5" font-weight="700" fill="#64748b" stroke="#ffffff" stroke-width="2" stroke-linejoin="round" paint-order="stroke fill" text-anchor="middle" dominant-baseline="central" font-family="'Inter', sans-serif">15</text>
            <text x="135.9" y="116.5" font-size="6.5" font-weight="700" fill="#64748b" stroke="#ffffff" stroke-width="2" stroke-linejoin="round" paint-order="stroke fill" text-anchor="middle" dominant-baseline="central" font-family="'Inter', sans-serif">20</text>
            <text x="116.5" y="135.9" font-size="6.5" font-weight="700" fill="#64748b" stroke="#ffffff" stroke-width="2" stroke-linejoin="round" paint-order="stroke fill" text-anchor="middle" dominant-baseline="central" font-family="'Inter', sans-serif">25</text>
            <text x="90" y="143" font-size="6.5" font-weight="700" fill="#64748b" stroke="#ffffff" stroke-width="2" stroke-linejoin="round" paint-order="stroke fill" text-anchor="middle" dominant-baseline="central" font-family="'Inter', sans-serif">30</text>
            <text x="63.5" y="135.9" font-size="6.5" font-weight="700" fill="#64748b" stroke="#ffffff" stroke-width="2" stroke-linejoin="round" paint-order="stroke fill" text-anchor="middle" dominant-baseline="central" font-family="'Inter', sans-serif">35</text>
            <text x="44.1" y="116.5" font-size="6.5" font-weight="700" fill="#64748b" stroke="#ffffff" stroke-width="2" stroke-linejoin="round" paint-order="stroke fill" text-anchor="middle" dominant-baseline="central" font-family="'Inter', sans-serif">40</text>
            <text x="37" y="90" font-size="6.5" font-weight="700" fill="#64748b" stroke="#ffffff" stroke-width="2" stroke-linejoin="round" paint-order="stroke fill" text-anchor="middle" dominant-baseline="central" font-family="'Inter', sans-serif">45</text>
            <text x="44.1" y="63.5" font-size="6.5" font-weight="700" fill="#64748b" stroke="#ffffff" stroke-width="2" stroke-linejoin="round" paint-order="stroke fill" text-anchor="middle" dominant-baseline="central" font-family="'Inter', sans-serif">50</text>
            <text x="63.5" y="44.1" font-size="6.5" font-weight="700" fill="#64748b" stroke="#ffffff" stroke-width="2" stroke-linejoin="round" paint-order="stroke fill" text-anchor="middle" dominant-baseline="central" font-family="'Inter', sans-serif">55</text>

            <!-- Outer Hour Knob (Pointer cursor & grey highlight on hover) -->
            <g id="${uniqueId}_group_h" filter="url(#${uniqueId}_shadow)" style="cursor: pointer; pointer-events: auto;">
              <circle id="${uniqueId}_knob_h" cx="90" cy="19.5" r="8.5" fill="#ffffff" stroke="#cbd5e1" stroke-width="1.2" style="cursor: pointer; transition: fill 0.15s ease, stroke 0.15s ease;" />
              <circle id="${uniqueId}_dot_h" cx="90" cy="19.5" r="3.2" fill="${primaryColor}" style="cursor: pointer;" />
            </g>

            <!-- Inner Minute Knob (Pointer cursor & grey highlight on hover) -->
            <g id="${uniqueId}_group_m" filter="url(#${uniqueId}_shadow)" style="cursor: pointer; pointer-events: auto;">
              <circle id="${uniqueId}_knob_m" cx="90" cy="37" r="8.5" fill="#ffffff" stroke="#cbd5e1" stroke-width="1.2" style="cursor: pointer; transition: fill 0.15s ease, stroke 0.15s ease;" />
              <circle id="${uniqueId}_dot_m" cx="90" cy="37" r="3.2" fill="${primaryColor}" style="cursor: pointer;" />
            </g>
          </svg>
        </div>
      </div>
    `;

    const surface = document.getElementById(`${uniqueId}_surface`);
    const dispH = document.getElementById(`${uniqueId}_disp_h`);
    const dispM = document.getElementById(`${uniqueId}_disp_m`);
    const btnAm = document.getElementById(`${uniqueId}_btn_am`);
    const btnPm = document.getElementById(`${uniqueId}_btn_pm`);
    const knobH = document.getElementById(`${uniqueId}_knob_h`);
    const dotH = document.getElementById(`${uniqueId}_dot_h`);
    const knobM = document.getElementById(`${uniqueId}_knob_m`);
    const dotM = document.getElementById(`${uniqueId}_dot_m`);
    const groupH = document.getElementById(`${uniqueId}_group_h`);
    const groupM = document.getElementById(`${uniqueId}_group_m`);

    let activeKnob = null;
    let hoveredKnob = null;
    let hoveredText = null;
    let hoveredPeriod = null;
    let selectedUnit = null; // 'hour', 'minute', or null (unselected)
    let isInitialized = false;

    function render() {
      const hRad = (((hour % 12) * 30) - 90) * (Math.PI / 180);
      const mRad = ((minute * 6) - 90) * (Math.PI / 180);

      const xH = 90 + 70.5 * Math.cos(hRad);
      const yH = 90 + 70.5 * Math.sin(hRad);
      const xM = 90 + 53 * Math.cos(mRad);
      const yM = 90 + 53 * Math.sin(mRad);

      knobH.setAttribute('cx', xH);
      knobH.setAttribute('cy', yH);
      dotH.setAttribute('cx', xH);
      dotH.setAttribute('cy', yH);

      knobM.setAttribute('cx', xM);
      knobM.setAttribute('cy', yM);
      dotM.setAttribute('cx', xM);
      dotM.setAttribute('cy', yM);

      const hStr = String(hour).padStart(2, '0');
      const mStr = String(minute).padStart(2, '0');

      if (dispH) dispH.textContent = hStr;
      if (dispM) dispM.textContent = mStr;

      const isAm = period === 'AM';
      btnAm.style.backgroundColor = isAm ? '#15803d' : (hoveredPeriod === 'AM' ? '#e2e8f0' : 'transparent');
      btnAm.style.color = isAm ? '#ffffff' : 'rgba(0, 0, 0, 0.45)';
      btnAm.style.boxShadow = isAm ? '0 1px 3px rgba(21, 128, 61, 0.25)' : 'none';
      btnAm.style.fontWeight = isAm ? '800' : '600';

      const isPm = period === 'PM';
      btnPm.style.backgroundColor = isPm ? '#15803d' : (hoveredPeriod === 'PM' ? '#e2e8f0' : 'transparent');
      btnPm.style.color = isPm ? '#ffffff' : 'rgba(0, 0, 0, 0.45)';
      btnPm.style.boxShadow = isPm ? '0 1px 3px rgba(21, 128, 61, 0.25)' : 'none';
      btnPm.style.fontWeight = isPm ? '800' : '600';

      updateKnobHighlight();

      if (isInitialized && typeof onChange === 'function') {
        let h24 = hour;
        if (period === 'AM') {
          if (h24 === 12) h24 = 0;
        } else {
          if (h24 < 12) h24 += 12;
        }
        const time24 = `${String(h24).padStart(2, '0')}:${mStr}`;
        const time12 = `${hStr}:${mStr} ${period}`;
        onChange({ hour, minute, period, time12, time24 });
      }
    }

    function updateKnobHighlight() {
      const isHourSelected = (activeKnob === 'hour') || (activeKnob === null && selectedUnit === 'hour');
      const isMinuteSelected = (activeKnob === 'minute') || (activeKnob === null && selectedUnit === 'minute');

      const isHourHovered = hoveredKnob === 'hour' || hoveredText === 'hour';
      const isMinuteHovered = hoveredKnob === 'minute' || hoveredText === 'minute';

      // Knobs Highlight (Selected: primary green tint; Hovered: light grey tint; Idle: white)
      if (isHourSelected) {
        knobH.setAttribute('fill', '#dcfce7');
        knobH.setAttribute('stroke', '#15803d');
        knobH.setAttribute('stroke-width', '1.5');
      } else if (isHourHovered) {
        knobH.setAttribute('fill', '#f1f5f9');
        knobH.setAttribute('stroke', '#cbd5e1');
        knobH.setAttribute('stroke-width', '1.2');
      } else {
        knobH.setAttribute('fill', '#ffffff');
        knobH.setAttribute('stroke', '#cbd5e1');
        knobH.setAttribute('stroke-width', '1.2');
      }

      if (isMinuteSelected) {
        knobM.setAttribute('fill', '#dcfce7');
        knobM.setAttribute('stroke', '#15803d');
        knobM.setAttribute('stroke-width', '1.5');
      } else if (isMinuteHovered) {
        knobM.setAttribute('fill', '#f1f5f9');
        knobM.setAttribute('stroke', '#cbd5e1');
        knobM.setAttribute('stroke-width', '1.2');
      } else {
        knobM.setAttribute('fill', '#ffffff');
        knobM.setAttribute('stroke', '#cbd5e1');
        knobM.setAttribute('stroke-width', '1.2');
      }

      // Digits in Center Hub (Selected: green tint badge with green border & black text; Hover: subtle grey badge; Idle: clean text)
      if (dispH) {
        if (isHourSelected) {
          dispH.style.backgroundColor = '#dcfce7';
          dispH.style.borderColor = '#15803d';
          dispH.style.fontWeight = '800';
          dispH.style.color = '#000000';
        } else if (isHourHovered) {
          dispH.style.backgroundColor = '#f1f5f9';
          dispH.style.borderColor = '#e2e8f0';
          dispH.style.fontWeight = '700';
          dispH.style.color = '#000000';
        } else {
          dispH.style.backgroundColor = 'transparent';
          dispH.style.borderColor = 'transparent';
          dispH.style.fontWeight = '700';
          dispH.style.color = '#000000';
        }
      }

      if (dispM) {
        if (isMinuteSelected) {
          dispM.style.backgroundColor = '#dcfce7';
          dispM.style.borderColor = '#15803d';
          dispM.style.fontWeight = '800';
          dispM.style.color = '#000000';
        } else if (isMinuteHovered) {
          dispM.style.backgroundColor = '#f1f5f9';
          dispM.style.borderColor = '#e2e8f0';
          dispM.style.fontWeight = '700';
          dispM.style.color = '#000000';
        } else {
          dispM.style.backgroundColor = 'transparent';
          dispM.style.borderColor = 'transparent';
          dispM.style.fontWeight = '700';
          dispM.style.color = '#000000';
        }
      }
    }

    let isPointerMoved = false;
    let startX = 0;
    let startY = 0;
    let prevSelectedOnDown = null;

    if (groupH) {
      groupH.addEventListener('pointerenter', () => { hoveredKnob = 'hour'; updateKnobHighlight(); });
      groupH.addEventListener('pointerleave', () => { if (hoveredKnob === 'hour') { hoveredKnob = null; updateKnobHighlight(); } });
    }

    if (groupM) {
      groupM.addEventListener('pointerenter', () => { hoveredKnob = 'minute'; updateKnobHighlight(); });
      groupM.addEventListener('pointerleave', () => { if (hoveredKnob === 'minute') { hoveredKnob = null; updateKnobHighlight(); } });
    }

    if (dispH) {
      dispH.addEventListener('click', (e) => {
        e.stopPropagation();
        selectedUnit = (selectedUnit === 'hour') ? null : 'hour';
        updateKnobHighlight();
        if (selectedUnit === 'hour') dispH.focus();
      });
      dispH.addEventListener('focus', () => {
        selectedUnit = 'hour';
        updateKnobHighlight();
      });
      dispH.addEventListener('pointerenter', () => { hoveredText = 'hour'; updateKnobHighlight(); });
      dispH.addEventListener('pointerleave', () => { if (hoveredText === 'hour') { hoveredText = null; updateKnobHighlight(); } });
    }

    if (dispM) {
      dispM.addEventListener('click', (e) => {
        e.stopPropagation();
        selectedUnit = (selectedUnit === 'minute') ? null : 'minute';
        updateKnobHighlight();
        if (selectedUnit === 'minute') dispM.focus();
      });
      dispM.addEventListener('focus', () => {
        selectedUnit = 'minute';
        updateKnobHighlight();
      });
      dispM.addEventListener('pointerenter', () => { hoveredText = 'minute'; updateKnobHighlight(); });
      dispM.addEventListener('pointerleave', () => { if (hoveredText === 'minute') { hoveredText = null; updateKnobHighlight(); } });
    }

    const hub = document.getElementById(`${uniqueId}_hub`);
    if (hub) {
      const stopPropagation = (e) => e.stopPropagation();
      hub.addEventListener('pointerdown', stopPropagation);
      hub.addEventListener('mousedown', stopPropagation);
      hub.addEventListener('touchstart', stopPropagation);
      hub.addEventListener('click', (e) => {
        if (e.target === hub) {
          selectedUnit = null;
          updateKnobHighlight();
        }
      });
    }

    function handlePointer(e) {
      if (activeKnob === 'outside' || activeKnob === 'hub') return;
      const rect = surface.getBoundingClientRect();
      const clientX = e.clientX || (e.touches && e.touches[0].clientX);
      const clientY = e.clientY || (e.touches && e.touches[0].clientY);
      if (clientX === undefined) return;

      const x = clientX - (rect.left + rect.width / 2);
      const y = clientY - (rect.top + rect.height / 2);
      const dist = Math.sqrt(x * x + y * y);

      const scale = rect.width / 180;
      const hubRadius = (88 / 2) * (rect.width / 172); // 44px on 172px surface (~46px in 180 SVG viewBox)
      const splitRadius = 61.75 * scale;
      const maxOuterRadius = 81 * scale; // Outer edge of dial track (dash is 79.2)

      if (!activeKnob) {
        if (dist < hubRadius) {
          activeKnob = 'hub';
          selectedUnit = null;
          updateKnobHighlight();
          return;
        }
        if (dist > maxOuterRadius) {
          activeKnob = 'outside';
          selectedUnit = null;
          updateKnobHighlight();
          return;
        }
        activeKnob = dist >= splitRadius ? 'hour' : 'minute';
        updateKnobHighlight();
      }

      let angle = Math.atan2(x, -y) * (180 / Math.PI);
      if (angle < 0) angle += 360;

      if (activeKnob === 'hour') {
        let h = Math.round(angle / 30);
        if (h === 0) h = 12;
        hour = h;
      } else if (activeKnob === 'minute') {
        let m = Math.round(angle / 6);
        if (m === 60) m = 0;
        minute = m;
      }
      render();
    }

    surface.addEventListener('pointerdown', (e) => {
      activeKnob = null;
      isPointerMoved = false;
      startX = e.clientX || (e.touches && e.touches[0].clientX) || 0;
      startY = e.clientY || (e.touches && e.touches[0].clientY) || 0;
      prevSelectedOnDown = selectedUnit;
      handlePointer(e);
      if (activeKnob && activeKnob !== 'hub' && activeKnob !== 'outside') {
        surface.style.cursor = 'pointer';
        surface.setPointerCapture(e.pointerId);
      }
    });

    surface.addEventListener('pointermove', (e) => {
      const currentX = e.clientX || (e.touches && e.touches[0].clientX) || 0;
      const currentY = e.clientY || (e.touches && e.touches[0].clientY) || 0;
      if (Math.hypot(currentX - startX, currentY - startY) > 4) {
        isPointerMoved = true;
      }
      if (e.buttons > 0 && activeKnob && activeKnob !== 'hub' && activeKnob !== 'outside') handlePointer(e);
    });

    const releaseKnob = () => {
      if (activeKnob) {
        if (activeKnob === 'outside' || activeKnob === 'hub') {
          selectedUnit = null;
        } else if (!isPointerMoved && prevSelectedOnDown === activeKnob) {
          // User clicked/tapped the already selected knob without dragging -> unselect!
          selectedUnit = null;
        } else {
          selectedUnit = activeKnob;
        }
        activeKnob = null;
        updateKnobHighlight();
      }
      surface.style.cursor = 'default';
    };

    surface.addEventListener('pointerup', releaseKnob);
    surface.addEventListener('pointercancel', releaseKnob);
    window.addEventListener('pointerup', releaseKnob);

    btnAm.addEventListener('click', (e) => { e.stopPropagation(); period = 'AM'; render(); });
    btnAm.addEventListener('pointerenter', () => { hoveredPeriod = 'AM'; render(); });
    btnAm.addEventListener('pointerleave', () => { if (hoveredPeriod === 'AM') { hoveredPeriod = null; render(); } });

    btnPm.addEventListener('click', (e) => { e.stopPropagation(); period = 'PM'; render(); });
    btnPm.addEventListener('pointerenter', () => { hoveredPeriod = 'PM'; render(); });
    btnPm.addEventListener('pointerleave', () => { if (hoveredPeriod === 'PM') { hoveredPeriod = null; render(); } });

    // Mouse Wheel Scroll Support with Smooth Step Throttling
    let wheelAccumulator = 0;
    let wheelTimer = null;
    const popoverEl = container.closest('[id$="-popover"]') || container.parentElement || container;

    const handleWheel = (e) => {
      // If time picker is hidden or detached, ignore
      if (!container.isConnected || container.offsetParent === null) return;

      const isInsidePopover = popoverEl && popoverEl.contains(e.target);

      // When a unit is selected (e.g. Minutes or Hours), allow scrolling anywhere on the whole browser screen!
      if (!isInsidePopover && !selectedUnit) return;

      e.preventDefault();
      e.stopPropagation();

      wheelAccumulator += e.deltaY;
      clearTimeout(wheelTimer);
      wheelTimer = setTimeout(() => { wheelAccumulator = 0; }, 180);

      const threshold = 30;
      if (Math.abs(wheelAccumulator) < threshold) return;

      const delta = wheelAccumulator < 0 ? 1 : -1;
      wheelAccumulator = 0;

      const rect = surface.getBoundingClientRect();
      const x = e.clientX - (rect.left + rect.width / 2);
      const y = e.clientY - (rect.top + rect.height / 2);
      const dist = Math.sqrt(x * x + y * y);
      const scale = rect.width / 180;
      const splitRadius = 61.75 * scale;

      // Prioritize actively selected unit (e.g. Minutes 47) when scrolling
      let target = selectedUnit || hoveredKnob || hoveredText;
      if (!target) {
        target = dist >= splitRadius ? 'hour' : 'minute';
      }
      selectedUnit = target;

      if (target === 'hour') {
        let nextH = hour + delta;
        if (nextH > 12) nextH = 1;
        if (nextH < 1) nextH = 12;
        hour = nextH;
      } else {
        let nextM = minute + delta;
        if (nextM >= 60) nextM = 0;
        if (nextM < 0) nextM = 59;
        minute = nextM;
      }
      render();
    };

    if (popoverEl) {
      popoverEl.addEventListener('wheel', handleWheel, { passive: false });
    }
    window.addEventListener('wheel', handleWheel, { passive: false });

    // Keyboard Typing and Navigation Support (0-9 digits, Arrows, AM/PM, Tab, Enter)
    let dialHourBuffer = '';
    let dialLastHourTime = 0;
    let dialMinuteBuffer = '';
    let dialLastMinuteTime = 0;

    const handleKeyDown = (e) => {
      if (!container.isConnected || container.offsetParent === null) return;

      // If active focus is in an input field outside this picker, let input handle it
      if (e.target && e.target.tagName === 'INPUT' && !container.contains(e.target) && (!popoverEl || !popoverEl.contains(e.target))) return;

      const isInsidePopover = popoverEl && popoverEl.contains(e.target);
      const isInsideContainer = container.contains(e.target) || (document.activeElement && container.contains(document.activeElement));
      if (!isInsidePopover && !isInsideContainer && !selectedUnit) return;

      const key = e.key;

      // 1. Arrow Left / Right & Tab: Switch between Hour, Minute, and Period
      if (key === 'ArrowRight' || (key === 'Tab' && !e.shiftKey)) {
        dialHourBuffer = '';
        dialMinuteBuffer = '';
        e.preventDefault();
        e.stopPropagation();
        if (selectedUnit === 'hour') {
          selectedUnit = 'minute';
          dispM?.focus();
        } else if (selectedUnit === 'minute') {
          selectedUnit = null;
          (period === 'AM' ? btnAm : btnPm)?.focus();
        } else {
          selectedUnit = 'hour';
          dispH?.focus();
        }
        updateKnobHighlight();
        return;
      }

      if (key === 'ArrowLeft' || (key === 'Tab' && e.shiftKey)) {
        dialHourBuffer = '';
        dialMinuteBuffer = '';
        e.preventDefault();
        e.stopPropagation();
        if (!selectedUnit) {
          selectedUnit = 'minute';
          dispM?.focus();
        } else if (selectedUnit === 'minute') {
          selectedUnit = 'hour';
          dispH?.focus();
        } else {
          selectedUnit = null;
          (period === 'PM' ? btnPm : btnAm)?.focus();
        }
        updateKnobHighlight();
        return;
      }

      // 2. Arrow Up / Down: Increment / Decrement
      if (key === 'ArrowUp' || key === 'ArrowDown') {
        dialHourBuffer = '';
        dialMinuteBuffer = '';
        e.preventDefault();
        e.stopPropagation();

        let target = selectedUnit || hoveredKnob || hoveredText || 'hour';
        const delta = key === 'ArrowUp' ? 1 : -1;
        if (target === 'hour') {
          let nextH = hour + delta;
          if (nextH > 12) nextH = 1;
          if (nextH < 1) nextH = 12;
          hour = nextH;
        } else {
          let nextM = minute + delta;
          if (nextM >= 60) nextM = 0;
          if (nextM < 0) nextM = 59;
          minute = nextM;
        }
        render();
        return;
      }

      // 3. Direct Number Typing (0-9)
      if (/^[0-9]$/.test(key)) {
        e.preventDefault();
        e.stopPropagation();
        const digit = parseInt(key, 10);
        const now = Date.now();
        let target = selectedUnit || 'hour';

        if (target === 'hour') {
          dialMinuteBuffer = '';
          const hasHourBuffer = (now - dialLastHourTime < 1500) && dialHourBuffer !== '';

          if (hasHourBuffer && dialHourBuffer === '1') {
            if (digit === 0) hour = 10;
            else if (digit === 1) hour = 11;
            else if (digit === 2) hour = 12;
            else hour = digit;
            dialHourBuffer = '';
            dialLastHourTime = 0;
            selectedUnit = 'minute';
            dispM?.focus();
          } else if (hasHourBuffer && dialHourBuffer === '0') {
            hour = digit === 0 ? 12 : digit;
            dialHourBuffer = '';
            dialLastHourTime = 0;
            selectedUnit = 'minute';
            dispM?.focus();
          } else {
            if (digit === 1) {
              hour = 1;
              dialHourBuffer = '1';
              dialLastHourTime = now;
              selectedUnit = 'hour';
              dispH?.focus();
            } else if (digit === 0) {
              hour = 12;
              dialHourBuffer = '0';
              dialLastHourTime = now;
              selectedUnit = 'hour';
              dispH?.focus();
            } else {
              hour = digit;
              dialHourBuffer = '';
              dialLastHourTime = 0;
              selectedUnit = 'minute';
              dispM?.focus();
            }
          }
        } else if (target === 'minute') {
          dialHourBuffer = '';
          const hasMinBuffer = (now - dialLastMinuteTime < 1500) && dialMinuteBuffer !== '';

          if (hasMinBuffer && dialMinuteBuffer.length === 1) {
            const tens = parseInt(dialMinuteBuffer, 10);
            let m = tens * 10 + digit;
            if (m > 59) m = digit;
            minute = m;
            dialMinuteBuffer = '';
            dialLastMinuteTime = 0;
            selectedUnit = null;
          } else {
            if (digit >= 6) {
              minute = digit;
              dialMinuteBuffer = '';
              dialLastMinuteTime = 0;
              selectedUnit = null;
            } else {
              minute = digit;
              dialMinuteBuffer = String(digit);
              dialLastMinuteTime = now;
              selectedUnit = 'minute';
              dispM?.focus();
            }
          }
        }

        render();
        return;
      }

      // 4. AM / PM Direct Typing ('a', 'A', 'p', 'P')
      if (/^[aApP]$/.test(key)) {
        dialHourBuffer = '';
        dialMinuteBuffer = '';
        e.preventDefault();
        e.stopPropagation();
        period = key.toUpperCase() === 'A' ? 'AM' : 'PM';
        render();
        return;
      }

      // 5. Enter Key: Confirm / Close
      if (key === 'Enter') {
        dialHourBuffer = '';
        dialMinuteBuffer = '';
        e.preventDefault();
        e.stopPropagation();
        selectedUnit = null;
        updateKnobHighlight();
        const doneBtn = popoverEl?.querySelector('button[onclick*="close"], button[onclick*="Close"]');
        if (doneBtn) doneBtn.click();
      }
    };

    window.addEventListener('keydown', handleKeyDown);

    // Initial render (does not fire onChange until user interacts)
    render();
    isInitialized = true;

    const unselect = () => {
      selectedUnit = null;
      activeKnob = null;
      updateKnobHighlight();
    };

    // If container/popover is hidden or closed, unselect
    const observer = new MutationObserver(() => {
      if (container.offsetParent === null || (popoverEl && popoverEl.style.display === 'none')) {
        unselect();
      }
    });
    if (popoverEl) {
      observer.observe(popoverEl, { attributes: true, attributeFilter: ['style', 'class'] });
    }

    return {
      unselect,
      selectUnit: (unit) => {
        selectedUnit = unit;
        updateKnobHighlight();
      },
      getTime: () => {
        let h24 = hour;
        if (period === 'AM') {
          if (h24 === 12) h24 = 0;
        } else {
          if (h24 < 12) h24 += 12;
        }
        return {
          hour,
          minute,
          period,
          time12: `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')} ${period}`,
          time24: `${String(h24).padStart(2, '0')}:${String(minute).padStart(2, '0')}`
        };
      },
      setTime: (h, m, p, silent = false) => {
        if (h !== undefined) hour = h;
        if (m !== undefined) minute = m;
        if (p !== undefined) period = p;
        if (silent) {
          const wasInit = isInitialized;
          isInitialized = false;
          render();
          isInitialized = wasInit;
        } else {
          render();
        }
      },
      reset: (defaultH, defaultM, defaultP) => {
        if (defaultH !== undefined && defaultM !== undefined && defaultP !== undefined) {
          hour = defaultH;
          minute = defaultM;
          period = defaultP;
        } else {
          const nowDef = getCurrentTimeDefaults();
          hour = nowDef.hour;
          minute = nowDef.minute;
          period = nowDef.period;
        }
        selectedUnit = null;
        activeKnob = null;
        const wasInit = isInitialized;
        isInitialized = false;
        render();
        isInitialized = wasInit;
        updateKnobHighlight();
      },
      destroy: () => {
        observer.disconnect();
        window.removeEventListener('wheel', handleWheel);
        window.removeEventListener('keydown', handleKeyDown);
      }
    };
  }

  function getSelectedSegment(input) {
    const start = input.selectionStart || 0;
    const end = input.selectionEnd || 0;
    if (start <= 2 && end <= 3) return 'hour';
    if (start >= 3 && start <= 5) return 'minute';
    if (start >= 6) return 'period';
    if (start <= 2) return 'hour';
    if (start <= 5) return 'minute';
    return 'period';
  }

  function setSegmentSelection(input, segment, getPickerInstance) {
    if (!input) return;
    const picker = typeof getPickerInstance === 'function' ? getPickerInstance() : getPickerInstance;
    if (segment === 'hour') {
      input.setSelectionRange(0, 2);
      if (picker?.selectUnit) picker.selectUnit('hour');
    } else if (segment === 'minute') {
      input.setSelectionRange(3, 5);
      if (picker?.selectUnit) picker.selectUnit('minute');
    } else if (segment === 'period') {
      input.setSelectionRange(6, 8);
      if (picker?.unselect) picker.unselect();
    }
  }

  function selectTimeSegmentAtCursor(input, e, getPickerInstance) {
    if (!input) return;
    input.dataset.hourBuffer = '';
    input.dataset.minuteBuffer = '';
    if (!input.value || input.value.trim() === '' || input.value === '--:-- --') {
      const now = getCurrentTimeDefaults();
      input.value = `${String(now.hour).padStart(2, '0')}:${String(now.minute).padStart(2, '0')} ${now.period}`;
      const picker = typeof getPickerInstance === 'function' ? getPickerInstance() : getPickerInstance;
      if (picker?.setTime) {
        picker.setTime(now.hour, now.minute, now.period);
      }
    }
    setTimeout(() => {
      let pos = (input.selectionStart !== null && input.selectionStart !== undefined) ? input.selectionStart : 0;
      if (e && e.clientX && e.target !== input) {
        const rect = input.getBoundingClientRect();
        const offsetX = e.clientX - rect.left;
        if (offsetX < 24) pos = 1;
        else if (offsetX < 50) pos = 4;
        else pos = 7;
      }
      if (pos <= 2) {
        setSegmentSelection(input, 'hour', getPickerInstance);
      } else if (pos <= 5) {
        setSegmentSelection(input, 'minute', getPickerInstance);
      } else {
        setSegmentSelection(input, 'period', getPickerInstance);
      }
    }, 15);
  }

  function handleSegmentedTimeKeydown(input, e, onTimeChange, getPickerInstance) {
    if (!input) return;
    const key = e.key;
    const segment = getSelectedSegment(input);
    const picker = typeof getPickerInstance === 'function' ? getPickerInstance() : getPickerInstance;
    const nowDef = getCurrentTimeDefaults();

    if (key === 'ArrowRight' || (key === 'Tab' && !e.shiftKey)) {
      input.dataset.hourBuffer = '';
      input.dataset.minuteBuffer = '';
      if (segment === 'hour') {
        e.preventDefault();
        setSegmentSelection(input, 'minute', getPickerInstance);
        return;
      } else if (segment === 'minute') {
        e.preventDefault();
        setSegmentSelection(input, 'period', getPickerInstance);
        return;
      }
    }

    if (key === 'ArrowLeft' || (key === 'Tab' && e.shiftKey)) {
      input.dataset.hourBuffer = '';
      input.dataset.minuteBuffer = '';
      if (segment === 'period') {
        e.preventDefault();
        setSegmentSelection(input, 'minute', getPickerInstance);
        return;
      } else if (segment === 'minute') {
        e.preventDefault();
        setSegmentSelection(input, 'hour', getPickerInstance);
        return;
      }
    }

    if (key === 'ArrowUp' || key === 'ArrowDown') {
      input.dataset.hourBuffer = '';
      input.dataset.minuteBuffer = '';
      e.preventDefault();
      const delta = key === 'ArrowUp' ? 1 : -1;
      let val = input.value.trim();
      const match = val.match(/(\d{1,2})[:.](\d{2})(?:\s*([AP]M))?/i);
      let h = match ? parseInt(match[1], 10) : nowDef.hour;
      let m = match ? parseInt(match[2], 10) : nowDef.minute;
      let p = match && match[3] ? match[3].toUpperCase() : nowDef.period;

      if (segment === 'hour') {
        h = h + delta;
        if (h > 12) h = 1;
        if (h < 1) h = 12;
      } else if (segment === 'minute') {
        m = m + delta;
        if (m >= 60) m = 0;
        if (m < 0) m = 59;
      } else if (segment === 'period') {
        p = p === 'AM' ? 'PM' : 'AM';
      }

      input.value = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')} ${p}`;
      setSegmentSelection(input, segment, getPickerInstance);
      if (picker?.setTime) {
        picker.setTime(h, m, p);
      }
      if (typeof onTimeChange === 'function') {
        onTimeChange({ hour: h, minute: m, period: p, time12: input.value });
      }
      return;
    }

    if (/^[0-9]$/.test(key)) {
      e.preventDefault();
      const digit = parseInt(key, 10);
      let val = input.value.trim();
      const match = val.match(/(\d{1,2})[:.](\d{2})(?:\s*([AP]M))?/i);
      let h = match ? parseInt(match[1], 10) : nowDef.hour;
      let m = match ? parseInt(match[2], 10) : nowDef.minute;
      let p = match && match[3] ? match[3].toUpperCase() : nowDef.period;
      const now = Date.now();

      if (segment === 'hour') {
        input.dataset.minuteBuffer = '';
        const lastHourTime = parseInt(input.dataset.lastHourTime || '0', 10);
        const hourBuffer = (now - lastHourTime < 1500) ? (input.dataset.hourBuffer || '') : '';

        if (hourBuffer === '1') {
          if (digit === 0) h = 10;
          else if (digit === 1) h = 11;
          else if (digit === 2) h = 12;
          else h = digit;
          input.dataset.hourBuffer = '';
          input.dataset.lastHourTime = '';
          input.value = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')} ${p}`;
          setSegmentSelection(input, 'minute', getPickerInstance);
        } else if (hourBuffer === '0') {
          if (digit === 0) h = 12;
          else h = digit;
          input.dataset.hourBuffer = '';
          input.dataset.lastHourTime = '';
          input.value = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')} ${p}`;
          setSegmentSelection(input, 'minute', getPickerInstance);
        } else {
          if (digit === 1) {
            h = 1;
            input.dataset.hourBuffer = '1';
            input.dataset.lastHourTime = String(now);
            input.value = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')} ${p}`;
            setSegmentSelection(input, 'hour', getPickerInstance);
          } else if (digit === 0) {
            h = 12;
            input.dataset.hourBuffer = '0';
            input.dataset.lastHourTime = String(now);
            input.value = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')} ${p}`;
            setSegmentSelection(input, 'hour', getPickerInstance);
          } else {
            h = digit;
            input.dataset.hourBuffer = '';
            input.dataset.lastHourTime = '';
            input.value = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')} ${p}`;
            setSegmentSelection(input, 'minute', getPickerInstance);
          }
        }
      } else if (segment === 'minute') {
        input.dataset.hourBuffer = '';
        const lastMinuteTime = parseInt(input.dataset.lastMinuteTime || '0', 10);
        const minuteBuffer = (now - lastMinuteTime < 1500) ? (input.dataset.minuteBuffer || '') : '';

        if (minuteBuffer.length === 1) {
          const tens = parseInt(minuteBuffer, 10);
          m = tens * 10 + digit;
          if (m > 59) m = digit;
          input.dataset.minuteBuffer = '';
          input.dataset.lastMinuteTime = '';
          input.value = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')} ${p}`;
          setSegmentSelection(input, 'period', getPickerInstance);
        } else {
          if (digit >= 6) {
            m = digit;
            input.dataset.minuteBuffer = '';
            input.dataset.lastMinuteTime = '';
            input.value = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')} ${p}`;
            setSegmentSelection(input, 'period', getPickerInstance);
          } else {
            m = digit;
            input.dataset.minuteBuffer = String(digit);
            input.dataset.lastMinuteTime = String(now);
            input.value = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')} ${p}`;
            setSegmentSelection(input, 'minute', getPickerInstance);
          }
        }
      }

      if (picker?.setTime) {
        picker.setTime(h, m, p);
      }
      if (typeof onTimeChange === 'function') {
        onTimeChange({ hour: h, minute: m, period: p, time12: input.value });
      }
      return;
    }

    if (/^[aApP]$/.test(key)) {
      input.dataset.hourBuffer = '';
      input.dataset.minuteBuffer = '';
      e.preventDefault();
      const p = key.toUpperCase() === 'A' ? 'AM' : 'PM';
      let val = input.value.trim();
      const match = val.match(/(\d{1,2})[:.](\d{2})(?:\s*([AP]M))?/i);
      let h = match ? parseInt(match[1], 10) : nowDef.hour;
      let m = match ? parseInt(match[2], 10) : nowDef.minute;
      input.value = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')} ${p}`;
      setSegmentSelection(input, 'period', getPickerInstance);
      if (picker?.setTime) {
        picker.setTime(h, m, p);
      }
      if (typeof onTimeChange === 'function') {
        onTimeChange({ hour: h, minute: m, period: p, time12: input.value });
      }
    }
  }

  global.createCircularTimePicker = createCircularTimePicker;
  global.selectTimeSegmentAtCursor = selectTimeSegmentAtCursor;
  global.handleSegmentedTimeKeydown = handleSegmentedTimeKeydown;
})(typeof window !== 'undefined' ? window : this);
