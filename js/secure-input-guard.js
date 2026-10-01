/**
 * ==============================================================================
 * SIGMA ELMS — Secure Input Guard (Modular Plugin)
 * ==============================================================================
 * Provides word-per-word encryption (1 word = 1 compact glyph block), cursor-based
 * active word auto-reveal, drag-selection decryption, and safe uncorrupted clipboard handling.
 * 
 * Target Fields:
 * - Login: School ID / Email (#schoolId, #modalSchoolId) & Password (#password, #modalPassword)
 * - Security Modals: Current Password, New Password, Retype/Confirm Password
 * ==============================================================================
 */

(function (window, document) {
    'use strict';

    const COMPACT_GLYPHS = ['▪', '▫', '◼', '◽'];

    /**
     * Sanitizes strings to prevent XSS.
     */
    function escapeHtml(str) {
        if (!str) return '';
        if (str === ' ') return '&nbsp;';
        return str
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;');
    }

    /**
     * Hashes a word string to a deterministic glyph index.
     */
    function hashWord(word) {
        let hash = 0;
        for (let i = 0; i < word.length; i++) {
            hash = ((hash << 5) - hash) + word.charCodeAt(i);
            hash |= 0;
        }
        return Math.abs(hash) % COMPACT_GLYPHS.length;
    }

    /**
     * Returns 1 single compact block for a given word.
     */
    function getWordBlock(word, index = 0) {
        const glyphIdx = (hashWord(word) + index) % COMPACT_GLYPHS.length;
        return COMPACT_GLYPHS[glyphIdx];
    }

    /**
     * Splits a text string into word and whitespace tokens with character spans.
     */
    function tokenizeWords(text) {
        const str = String(text || '');
        const tokens = [];
        const regex = /([^\s\-_.,@#:/\\+]+)|([\s\-_.,@#:/\\+]+)/g;
        let match;
        let wordIndex = 0;
        const MAX_SAFE_TOKENS = 2500; // Anti-freeze safety guard

        while ((match = regex.exec(str)) !== null) {
            const rawToken = match[0];
            const start = match.index;
            const end = start + rawToken.length;
            const isWord = Boolean(match[1]);

            tokens.push({
                text: rawToken,
                start,
                end,
                isWord,
                wordIndex: isWord ? wordIndex++ : -1,
                glyph: isWord ? getWordBlock(rawToken, wordIndex) : rawToken
            });

            if (tokens.length >= MAX_SAFE_TOKENS) break;
        }

        return tokens;
    }

    /**
     * Encrypts a full text string into word-by-word glyph blocks (1 word = 1 block).
     */
    function encryptWords(text) {
        const tokens = tokenizeWords(text);
        return tokens.map(t => t.isWord ? t.glyph : t.text).join('');
    }

    /**
     * Attaches the Secure Guard to a designated text or password input.
     * @param {HTMLInputElement|string} target - Input element or selector
     * @param {Object} options - Configuration options
     */
    function attachSecureGuard(target, options = {}) {
        const input = typeof target === 'string' ? document.querySelector(target) : target;
        if (!input || input.__secureGuardActive) return null;
        input.__secureGuardActive = true;

        const config = {
            mode: options.mode || 'word', // 'word' (1 word = 1 block) | 'char' (1 char = 1 block)
            enableClipboardBypass: options.enableClipboardBypass !== false,
            onSync: options.onSync || null,
            ...options
        };

        let dragStartX = 0;
        let revealDirection = 'ltr';

        /**
         * Computes the word-level masked projection of current input value.
         */
        function computeProjection() {
            const raw = input.value || '';
            const cursorStart = input.selectionStart || 0;
            const cursorEnd = input.selectionEnd || 0;
            const hasSelection = cursorStart !== cursorEnd;

            const tokens = tokenizeWords(raw);

            const projection = tokens.map(token => {
                if (!token.isWord) {
                    return {
                        ...token,
                        isRevealed: true,
                        display: token.text
                    };
                }

                // Word is revealed if cursor is inside it or if it overlaps selection
                const isSelected = hasSelection && (token.end > cursorStart && token.start < cursorEnd);
                const isCursorInside = !hasSelection && (cursorStart >= token.start && cursorStart <= token.end);
                const isRevealed = isSelected || isCursorInside;

                return {
                    ...token,
                    isRevealed,
                    display: isRevealed ? token.text : token.glyph // 1 word = 1 single glyph block
                };
            });

            const maskedText = projection.map(p => p.display).join('');

            if (typeof config.onSync === 'function') {
                config.onSync({
                    rawText: raw,
                    maskedText,
                    wordCount: tokens.filter(t => t.isWord).length,
                    cursorStart,
                    cursorEnd,
                    hasSelection,
                    revealDirection,
                    projection
                });
            }
        }

        // --- Event Listeners ---
        input.addEventListener('input', computeProjection);
        input.addEventListener('keyup', computeProjection);
        input.addEventListener('click', computeProjection);
        input.addEventListener('select', computeProjection);

        input.addEventListener('keydown', (e) => {
            // Instant reaction for Arrow keys, Home, and End
            if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Home', 'End'].includes(e.key)) {
                setTimeout(computeProjection, 10);
            }
        });

        // Mouse drag direction detection
        input.addEventListener('mousedown', (e) => {
            dragStartX = e.clientX;
        });

        input.addEventListener('mouseup', (e) => {
            const diff = e.clientX - dragStartX;
            if (Math.abs(diff) > 15) {
                revealDirection = diff < 0 ? 'rtl' : 'ltr';
                computeProjection();
            }
        });

        // Safe Copy Handler: always puts pure uncorrupted text onto the clipboard
        if (config.enableClipboardBypass) {
            input.addEventListener('copy', (e) => {
                const start = input.selectionStart || 0;
                const end = input.selectionEnd || 0;
                if (start !== end) {
                    const selectedText = input.value.substring(start, end);
                    if (e.clipboardData) {
                        e.clipboardData.setData('text/plain', selectedText);
                        e.preventDefault();
                    }
                }
            });
        }

        // Initial projection computation
        computeProjection();

        return {
            input,
            computeProjection,
            getValue: () => input.value,
            setValue: (val) => {
                input.value = val;
                computeProjection();
            },
            encryptWords: () => encryptWords(input.value)
        };
    }

    /**
     * Automatically initializes all sensitive credential inputs across pages and modals
     */
    function autoInit() {
        const selectors = [
            'input[type="password"]',
            '#schoolId',
            '#modalSchoolId',
            '[name="schoolId"]',
            '#loginEmail',
            '#loginId',
            'input[data-secure-guard="true"]'
        ];

        selectors.forEach(sel => {
            document.querySelectorAll(sel).forEach(el => {
                attachSecureGuard(el, { mode: 'word' });
            });
        });

        // Watch for dynamically inserted modals/inputs in Single-Page dashboard views
        if (window.MutationObserver && !window.__secureInputObserverAttached) {
            window.__secureInputObserverAttached = true;
            const observer = new MutationObserver((mutations) => {
                mutations.forEach(m => {
                    m.addedNodes.forEach(node => {
                        if (node.nodeType === 1) {
                            selectors.forEach(sel => {
                                if (node.matches && node.matches(sel)) attachSecureGuard(node, { mode: 'word' });
                                if (node.querySelectorAll) node.querySelectorAll(sel).forEach(el => attachSecureGuard(el, { mode: 'word' }));
                            });
                        }
                    });
                });
            });
            observer.observe(document.body, { childList: true, subtree: true });
        }
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', autoInit);
    } else {
        autoInit();
    }

    // Export module to global scope
    window.SecureInputGuard = {
        attach: attachSecureGuard,
        autoInit: autoInit,
        tokenizeWords: tokenizeWords,
        encryptWords: encryptWords,
        getWordBlock: getWordBlock,
        escapeHtml: escapeHtml
    };

})(window, document);
