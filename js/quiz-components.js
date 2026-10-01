/**
 * SIGMA ELMS - Canonical Shared Quiz Components & UI Renderers (js/quiz-components.js)
 * 
 * Reusable UI component templates and canonical renderers for Quiz Creator,
 * Course Material Builder, Teacher Assessment Manager, and Student Assessment views.
 */

window.SigmaQuizComponents = {
    // 1. Question Type Selector
    renderTypeSelect: function (idx, currentType) {
        const isMC = currentType === 'Multiple Choice' || !currentType;
        const isTF = currentType === 'True or False';
        const isSA = currentType === 'Short Answer';
        const isEssay = currentType === 'Essay';
        const isMatch = currentType === 'Matching Type';
        const isEnum = currentType === 'Enumeration';

        return `
            <div class="sigma-select-wrapper min-w-[260px] w-[260px]">
                <select onchange="window.updateQuestionType(${idx}, this.value)"
                    class="sigma-select !h-[42px] !py-0 !pl-4 !pr-9 !text-sm !font-semibold !text-black !bg-white !border-slate-200 !rounded-xl focus:!border-black transition-all cursor-pointer">
                    <option value="Multiple Choice" ${isMC ? 'selected' : ''}>Multiple Choice</option>
                    <option value="True or False" ${isTF ? 'selected' : ''}>True or False</option>
                    <option value="Short Answer" ${isSA ? 'selected' : ''}>Short Answer / Identification</option>
                    <option value="Essay" ${isEssay ? 'selected' : ''}>Essay / Paragraph</option>
                    <option value="Matching Type" ${isMatch ? 'selected' : ''}>Matching Type</option>
                    <option value="Enumeration" ${isEnum ? 'selected' : ''}>Enumeration</option>
                </select>
                <i class="fa-solid fa-chevron-down sigma-select-icon !right-3.5 !text-xs !text-black-fade pointer-events-none"></i>
            </div>
        `;
    },

    // 2. Answer Key Button
    renderAnswerKeyButton: function (idx, isAnswerKeyOpen) {
        return `
            <button type="button" onclick="window.toggleAnswerKey(${idx})"
                class="min-w-[126px] h-10 px-3.5 py-1.5 rounded-xl border transition-all cursor-pointer flex items-center justify-center gap-2 shrink-0 whitespace-nowrap ${isAnswerKeyOpen ? 'border-amber-300 bg-amber-50/70 text-[#b45309]' : 'border-slate-200 bg-slate-50 hover:bg-slate-100 text-black'} text-sm font-semibold"
                title="Click to view/edit Answer Key & Points">
                <i class="fa-solid fa-key text-xs shrink-0 ${isAnswerKeyOpen ? 'text-[#d97706]' : 'text-black-fade'}"></i>
                <span class="whitespace-nowrap">Answer Key</span>
            </button>
        `;
    },

    // 3. Points Control (Static Star Badge when closed, Interactive Counter when open)
    renderPointsControl: function (idx, points, isAnswerKeyOpen) {
        const pts = (points !== undefined && !isNaN(parseInt(points))) ? parseInt(points) : 0;
        if (isAnswerKeyOpen) {
            return `
                <div class="w-[145px] flex items-center justify-between bg-slate-50 h-10 px-3 py-1 rounded-xl border border-slate-200 text-sm font-normal text-black shrink-0">
                    <div class="flex items-center gap-1.5 shrink-0">
                        <i class="fa-solid fa-star text-amber-400 text-xs"></i>
                        <span class="text-black-fade text-sm font-normal">Points:</span>
                    </div>
                    <input type="number" id="question-pts-input-${idx}" min="0" max="999" value="${pts}"
                        onkeydown="if(['e','E','+','-','.',' '].includes(event.key)) event.preventDefault();"
                        oninput="this.value = this.value.replace(/[^0-9]/g, ''); let v = parseInt(this.value); if (v > 999) { v = 999; this.value = 999; } if (questions && questions[${idx}]) { questions[${idx}].points = (!isNaN(v) && v >= 0) ? v : 0; } if (typeof window.updateStats === 'function') window.updateStats(); if (typeof window.updateThumbnailPoints === 'function') window.updateThumbnailPoints(${idx});"
                        onblur="let v = parseInt(this.value); if (isNaN(v) || v < 0) { this.value = 0; if (questions && questions[${idx}]) { questions[${idx}].points = 0; } if (typeof window.updateStats === 'function') window.updateStats(); if (typeof window.updateThumbnailPoints === 'function') window.updateThumbnailPoints(${idx}); }"
                        class="w-14 bg-transparent text-center font-normal text-black outline-none text-sm">
                </div>
            `;
        }
        return `
            <div class="w-[145px] flex items-center gap-1.5 px-3 text-black text-sm font-normal select-none h-10 shrink-0">
                <i class="fa-solid fa-star text-amber-400 text-xs"></i>
                <span id="active-question-points-badge-${idx}">${pts} ${pts === 1 ? 'Point' : 'Points'}</span>
            </div>
        `;
    },

    // 4. Question Action Buttons (Shuffle Choices, Image, Duplicate, Delete)
    renderActionButtons: function (idx, q) {
        const canShuffle = q.type === 'Multiple Choice' || q.type === 'Matching Type' || !q.type;
        return `
            ${canShuffle ? `
                <!-- Shuffle Choices Toggle -->
                <button type="button" onclick="window.toggleQuestionShuffleChoices(${idx})"
                    class="w-10 h-10 rounded-xl shrink-0 ${q.shuffleChoices ? 'bg-amber-100 text-amber-900 border border-amber-300 font-bold shadow-2xs' : 'text-black-fade hover:text-black hover:bg-slate-200/80'} transition-all flex items-center justify-center cursor-pointer"
                    title="${q.shuffleChoices ? 'Shuffle Choices: ON (Choices randomized for each student)' : 'Shuffle Choices: OFF (Click to randomize choices for students)'}">
                    <i class="fa-solid fa-shuffle text-sm"></i>
                </button>
            ` : ''}

            <!-- Add / Change Question Image Button -->
            <button type="button" onclick="document.getElementById('question-image-file-${idx}').click()"
                class="w-10 h-10 rounded-xl shrink-0 ${q.image ? 'bg-emerald-50 text-emerald-700 font-bold' : 'text-black-fade hover:text-black hover:bg-slate-200/80'} transition-all flex items-center justify-center cursor-pointer"
                title="${q.image ? 'Change Question Image' : 'Add Image to Question'}">
                <i class="fa-regular fa-image text-base"></i>
            </button>
            <input type="file" id="question-image-file-${idx}" accept="image/*" class="hidden"
                onchange="window.handleQuestionImageUpload(event, ${idx})">

            <button type="button" onclick="window.duplicateQuestion(${idx})"
                class="w-10 h-10 rounded-xl shrink-0 text-black-fade hover:text-black hover:bg-slate-200/80 transition-all flex items-center justify-center cursor-pointer" title="Duplicate Question">
                <i class="fa-regular fa-copy text-base"></i>
            </button>

            <button type="button" onclick="window.removeQuestion(${idx})"
                class="w-10 h-10 rounded-xl shrink-0 text-black-fade hover:text-black hover:bg-slate-200/80 transition-all flex items-center justify-center cursor-pointer" title="Delete Question">
                <i class="fa-regular fa-trash-can text-base"></i>
            </button>
        `;
    },

    // 5. Question Header    // 1. Header with Type Selector, Answer Key, Points & Actions
    renderQuestionHeader: function (q, idx, isAnswerKeyOpen, isNewlyAdded = false) {
        const qNum = idx + 1;
        let titleText = 'Correct answer:';
        if (q.type === 'Short Answer') titleText = 'Accepted answer:';
        else if (q.type === 'Enumeration') titleText = 'Required items:';
        else if (q.type === 'Matching Type') titleText = 'Correct matching pairs:';
        else if (q.type === 'Essay') titleText = 'Grading rubric / guide notes:';

        const isMatching = q.type === 'Matching Type';
        const isEnum = q.type === 'Enumeration';

        return `
            <div class="flex items-center justify-between gap-3 border-b border-slate-200 pb-3">
                <div class="flex items-center gap-3">
                    ${isAnswerKeyOpen ? `
                        <div class="flex items-center gap-2.5 text-base md:text-lg font-normal text-black-fade select-none h-10">
                            <i class="fa-regular fa-circle-check text-black-fade text-lg md:text-xl"></i>
                            <span>${titleText}</span>
                        </div>
                    ` : `
                        <span class="w-9 h-9 rounded-xl bg-[#15803d] text-white text-xs font-black flex items-center justify-center shadow-xs ${isNewlyAdded ? 'badge-new-pop' : ''}">
                            ${qNum}
                        </span>
                        ${this.renderTypeSelect(idx, q.type)}
                    `}
                </div>

                <div class="flex items-center gap-2.5 shrink-0">
                    ${this.renderAnswerKeyButton(idx, isAnswerKeyOpen)}
                    ${((isMatching || isEnum) && isAnswerKeyOpen) ? '<div class="w-[145px] h-10 shrink-0 invisible pointer-events-none select-none"></div>' : this.renderPointsControl(idx, q.points, isAnswerKeyOpen)}
                    <div class="flex items-center gap-2.5 shrink-0 ${isAnswerKeyOpen ? 'invisible pointer-events-none select-none' : ''}">
                        ${this.renderActionButtons(idx, q)}
                    </div>
                </div>
            </div>
        `;
    },

    // 6. Question Prompt Underline Textarea / Text Display
    renderPromptTextarea: function (q, idx, isAnswerKeyOpen) {
        const escaped = (window.escapeHtml || function (s) { return s || ''; })(q.question || '');
        if (isAnswerKeyOpen) {
            return `
                <div class="pt-0.5">
                    <div class="w-full text-base font-normal text-black font-['Inter'] leading-normal min-h-[28px] px-2 py-0.5 select-none">
                        ${escaped ? escaped : ''}
                    </div>
                </div>
            `;
        }
        return `
            <div class="pt-0.5">
                <textarea id="question-prompt-input-${idx}"
                    rows="1"
                    placeholder="Question"
                    data-min-height="40"
                    oninput="window.autoExpandTextarea(this, 2); questions[${idx}].question = this.value; window.syncThumbPrompt(${idx}, this.value);"
                    onblur="questions[${idx}].question = this.value; window.syncThumbPrompt(${idx}, this.value);"
                    onchange="questions[${idx}].question = this.value; window.syncThumbPrompt(${idx}, this.value);"
                    class="sigma-one-border-textarea w-full bg-slate-50 border-b-2 border-black/40 rounded-none px-3.5 py-2.5 text-base font-normal text-black outline-none hover:bg-slate-100 hover:border-black/70 focus:bg-slate-100 focus:border-black transition-all placeholder:text-black/40 font-['Inter'] shadow-none resize-none leading-normal overflow-hidden block">${escaped}</textarea>
            </div>
        `;
    },

    // 7. Question Image Preview
    renderImagePreview: function (q, idx) {
        if (!q.image) return '';
        const escapeFn = window.escapeHtml || function (s) { return s || ''; };
        const escapedImg = escapeFn(q.image);
        return `
            <div class="flex flex-col items-center w-full my-3 space-y-2">
                <!-- Image Title / Caption Input -->
                <div class="w-full max-w-[560px]">
                    <input type="text" placeholder="Image Title (Optional)"
                        maxlength="150"
                        value="${escapeFn(q.imageTitle || '')}"
                        oninput="questions[${idx}].imageTitle = this.value;"
                        class="w-full bg-slate-50 border-b-2 border-black/35 hover:bg-slate-100 hover:border-black/60 focus:bg-slate-100 focus:border-black px-4 py-3 min-h-[46px] text-sm font-semibold text-black outline-none placeholder:text-black-fade placeholder:font-normal placeholder:opacity-80 transition-all rounded-t-lg">
                </div>

                <div onclick="window.openImageFullscreen('${escapedImg}', '${escapeFn(q.imageTitle || '').replace(/'/g, "\\'")}')"
                    class="relative group/qimg w-full max-w-[560px] h-[260px] sm:h-[300px] md:h-[320px] rounded-2xl overflow-hidden bg-black border border-slate-300 flex items-center justify-center p-0 shadow-2xs cursor-zoom-in">
                    <img src="${escapedImg}" alt="${escapeFn(q.imageTitle || 'Question Image')}" class="max-w-full max-h-full object-contain pointer-events-none">
                    
                    <!-- Top Left: Click to Enlarge Hint -->
                    <div class="absolute top-3 left-3 z-10 opacity-0 group-hover/qimg:opacity-100 transition-opacity pointer-events-none">
                        <span class="px-2.5 py-1 rounded-xl bg-black/60 text-white text-[11px] font-semibold flex items-center gap-1.5 shadow-md backdrop-blur-xs">
                            <i class="fa-solid fa-expand text-[10px]"></i>
                            <span>Click to enlarge</span>
                        </span>
                    </div>

                    <!-- Top Right: Change & Remove Buttons -->
                    <div class="absolute top-3 right-3 z-10 flex items-center gap-2 opacity-0 group-hover/qimg:opacity-100 transition-opacity" onclick="event.stopPropagation()">
                        <!-- Change Image Button -->
                        <button type="button" onclick="document.getElementById('question-image-file-${idx}').click()"
                            class="px-3 py-1.5 rounded-xl bg-white/95 hover:bg-slate-100 text-black text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer shadow-md border border-slate-200/90 group/btn" title="Change Image">
                            <i class="fa-solid fa-arrow-up-from-bracket text-xs text-black"></i>
                            <span class="text-black">Change</span>
                        </button>
                        
                        <!-- Remove Image Button -->
                        <button type="button" onclick="window.removeQuestionImage(${idx})"
                            class="px-3 py-1.5 rounded-xl bg-white/95 hover:bg-slate-100 text-black hover:text-red-600 text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer shadow-md border border-slate-200/90 group/btn" title="Remove Image">
                            <i class="fa-solid fa-trash-can text-xs text-black group-hover/btn:text-red-600 transition-colors"></i>
                            <span class="transition-colors">Remove</span>
                        </button>
                    </div>
                </div>
            </div>
        `;
    },

    // 7b. Reusable Shared Draggable Option / Item Slot
    renderOptionSlot: function (opts) {
        const escapeFn = window.escapeHtml || function (s) { return s || ''; };
        const {
            draggable = false,
            dragStart = '',
            dragOver = '',
            drop = '',
            leadingHtml = '',
            value = '',
            placeholder = 'Option',
            oninput = '',
            extraClasses = '',
            actionsHtml = '',
            showGrabHandle = true,
            maxLength = 100
        } = opts;

        const baseStyle = 'bg-slate-50 border-black/35 hover:bg-slate-100 hover:border-black/60 focus-within:bg-slate-100 focus-within:border-black';

        return `
            <div ${draggable ? `draggable="true" ondragstart="${dragStart}" ondragover="${dragOver}" ondrop="${drop}"` : ''}
                class="flex items-start gap-2.5 border-b-2 ${baseStyle} ${extraClasses} px-3.5 py-2.5 min-h-[50px] transition-all group/opt overflow-hidden min-w-0">
                ${showGrabHandle ? `
                    <!-- Grab Handle Icon (Visible on Hover) -->
                    <div class="cursor-grab active:cursor-grabbing text-black-fade hover:text-black transition-opacity opacity-0 group-hover/opt:opacity-100 w-5 h-5 flex items-center justify-center shrink-0 mt-1" title="Drag to reorder">
                        <i class="fa-solid fa-grip-vertical text-xs"></i>
                    </div>
                ` : ''}
                ${leadingHtml || ''}
                <textarea rows="1" maxlength="${maxLength}" placeholder="${escapeFn(placeholder)}"
                    oninput="${oninput}"
                    class="sigma-underline-item-textarea flex-1 bg-transparent text-sm font-normal text-black outline-none placeholder:text-black/40 py-1 leading-normal resize-none break-words min-w-0">${escapeFn(value)}</textarea>
                ${actionsHtml || ''}
            </div>
        `;
    },

    // 8. Multiple Choice Options Grid
    renderMultipleChoice: function (q, idx, isAnswerKeyOpen) {
        const escapeFn = window.escapeHtml || function (s) { return s || ''; };
        return `
            <div class="space-y-2 pt-1">
                <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    ${(q.choices || []).map((choice, cIdx) => {
                        const fallbackText = 'Option ' + (cIdx + 1);
                        const isCorrect = q.answerIndex !== undefined
                            ? q.answerIndex === cIdx
                            : Boolean(q.answer && q.answer.trim() !== '' && q.answer === choice);

                        if (isAnswerKeyOpen) {
                            return `
                                <div onclick="window.setCorrectAnswer(${idx}, questions[${idx}].choices[${cIdx}] || 'Option ${cIdx + 1}', ${cIdx})"
                                    class="${isCorrect ? 'flex items-center gap-3 px-3 py-2 rounded-xl bg-emerald-50 text-black font-normal border border-emerald-200/80 cursor-pointer transition-all select-none' : 'flex items-center gap-3 px-3 py-2 rounded-xl hover:bg-slate-50 text-black font-normal transition-all cursor-pointer select-none'}">
                                    <div class="w-5 h-5 rounded-full border ${isCorrect ? 'border-[#15803d] flex items-center justify-center' : 'border-slate-300'} shrink-0 transition-all">
                                        ${isCorrect ? '<div class="w-2.5 h-2.5 rounded-full bg-[#15803d]"></div>' : ''}
                                    </div>
                                    <span class="flex-1 text-sm py-0.5 leading-normal select-none text-black font-normal">
                                        ${escapeFn(choice) || fallbackText}
                                    </span>
                                    ${isCorrect ? `
                                        <i class="fa-solid fa-check text-emerald-600 font-bold text-sm ml-auto shrink-0" title="Correct Answer"></i>
                                    ` : ''}
                                </div>
                            `;
                        }

                        return window.SigmaQuizComponents.renderOptionSlot({
                            draggable: true,
                            dragStart: `window.handleChoiceDragStart(event, ${idx}, ${cIdx})`,
                            dragOver: 'window.handleChoiceDragOver(event)',
                            drop: `window.handleChoiceDrop(event, ${idx}, ${cIdx})`,
                            value: choice,
                            placeholder: fallbackText,
                            oninput: `window.autoExpandTextarea(this, 4); questions[${idx}].choices[${cIdx}] = this.value; if (questions[${idx}].answerIndex === ${cIdx}) { questions[${idx}].answer = this.value; }`,
                            extraClasses: isCorrect ? 'bg-emerald-50/70 border-[#15803d] hover:bg-emerald-50 focus-within:bg-emerald-50 focus-within:border-[#15803d]' : 'bg-slate-50 border-black/35 hover:bg-slate-100 hover:border-black/60 focus-within:bg-slate-100 focus-within:border-black',
                            maxLength: 1000,
                            actionsHtml: `
                                ${(q.choices || []).length > 1 ? `
                                    <button type="button" onclick="event.stopPropagation(); window.swapChoiceWithNext(${idx}, ${cIdx})"
                                        class="w-6 h-6 rounded text-black-fade hover:text-black hover:bg-slate-200/60 opacity-0 group-hover/opt:opacity-100 flex items-center justify-center transition-all cursor-pointer shrink-0" title="Swap with next option">
                                        <i class="fa-solid fa-arrow-right-arrow-left text-xs"></i>
                                    </button>
                                ` : ''}
                                ${isCorrect ? `
                                    <div class="w-6 h-6 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0" title="Selected Answer">
                                        <i class="fa-solid fa-check text-xs"></i>
                                    </div>
                                ` : ''}
                                ${(q.choices || []).length > 2 ? `
                                    <button type="button" onclick="window.removeChoice(${idx}, ${cIdx})" class="w-8 h-8 rounded-lg text-black-fade hover:text-black hover:bg-slate-200/60 flex items-center justify-center transition-colors cursor-pointer shrink-0" title="Remove Option">
                                        <i class="fa-solid fa-xmark text-sm"></i>
                                    </button>
                                ` : ''}
                            `
                        });
                    }).join('')}

                    ${!isAnswerKeyOpen ? `
                        <!-- Add Option Grid Slot -->
                        <button type="button" onclick="window.addChoice(${idx})"
                            class="flex items-center justify-center gap-2 bg-slate-50/70 hover:bg-slate-100/90 border-b-2 border-dashed border-black/30 hover:border-black px-4 py-2 min-h-[50px] transition-all cursor-pointer group/add-opt text-black-fade hover:text-black">
                            <i class="fa-solid fa-plus text-xs group-hover/add-opt:scale-110 transition-transform"></i>
                            <span class="text-sm font-medium">Add Option</span>
                        </button>
                    ` : ''}
                </div>
            </div>
        `;
    },

    // 9. True / False Radio Options
    renderTrueFalse: function (q, idx, isAnswerKeyOpen) {
        const isTrueSelected = q.answer === 'True';
        const isFalseSelected = q.answer === 'False';

        if (isAnswerKeyOpen) {
            return `
                <div class="pt-1">
                    <div class="flex items-center gap-3">
                        <div onclick="window.setCorrectAnswer(${idx}, 'True')"
                            class="flex items-center gap-2.5 px-3.5 py-2 rounded-xl cursor-pointer transition-all select-none ${isTrueSelected ? 'bg-emerald-50 text-black font-normal border border-emerald-200/80 shadow-2xs' : 'hover:bg-slate-50 text-black font-normal border border-transparent'}">
                            <div class="w-5 h-5 rounded-full border ${isTrueSelected ? 'border-[#15803d] flex items-center justify-center bg-white' : 'border-slate-300'} shrink-0 transition-all">
                                ${isTrueSelected ? '<div class="w-2.5 h-2.5 rounded-full bg-[#15803d]"></div>' : ''}
                            </div>
                            <span class="text-sm font-normal text-black">True</span>
                            ${isTrueSelected ? '<i class="fa-solid fa-check text-emerald-600 font-bold text-sm ml-auto shrink-0"></i>' : ''}
                        </div>
                        <div onclick="window.setCorrectAnswer(${idx}, 'False')"
                            class="flex items-center gap-2.5 px-3.5 py-2 rounded-xl cursor-pointer transition-all select-none ${isFalseSelected ? 'bg-emerald-50 text-black font-normal border border-emerald-200/80 shadow-2xs' : 'hover:bg-slate-50 text-black font-normal border border-transparent'}">
                            <div class="w-5 h-5 rounded-full border ${isFalseSelected ? 'border-[#15803d] flex items-center justify-center bg-white' : 'border-slate-300'} shrink-0 transition-all">
                                ${isFalseSelected ? '<div class="w-2.5 h-2.5 rounded-full bg-[#15803d]"></div>' : ''}
                            </div>
                            <span class="text-sm font-normal text-black">False</span>
                            ${isFalseSelected ? '<i class="fa-solid fa-check text-emerald-600 font-bold text-sm ml-auto shrink-0"></i>' : ''}
                        </div>
                    </div>
                </div>
            `;
        }

        return `
            <div class="pt-1">
                <div class="flex items-center gap-3">
                    <div class="flex items-center gap-2.5 px-3.5 py-2 rounded-xl select-none transition-all ${isTrueSelected ? 'bg-emerald-50 text-black font-normal border border-emerald-200/80 shadow-2xs' : 'bg-slate-50 border border-slate-200 text-black font-normal'}">
                        <div class="w-5 h-5 rounded-full border ${isTrueSelected ? 'border-[#15803d] flex items-center justify-center bg-white' : 'border-slate-300'} shrink-0 transition-all">
                            ${isTrueSelected ? '<div class="w-2.5 h-2.5 rounded-full bg-[#15803d]"></div>' : ''}
                        </div>
                        <span class="text-sm font-normal text-black">True</span>
                        ${isTrueSelected ? '<i class="fa-solid fa-check text-emerald-600 font-bold text-sm ml-auto shrink-0"></i>' : ''}
                    </div>
                    <div class="flex items-center gap-2.5 px-3.5 py-2 rounded-xl select-none transition-all ${isFalseSelected ? 'bg-emerald-50 text-black font-normal border border-emerald-200/80 shadow-2xs' : 'bg-slate-50 border border-slate-200 text-black font-normal'}">
                        <div class="w-5 h-5 rounded-full border ${isFalseSelected ? 'border-[#15803d] flex items-center justify-center bg-white' : 'border-slate-300'} shrink-0 transition-all">
                            ${isFalseSelected ? '<div class="w-2.5 h-2.5 rounded-full bg-[#15803d]"></div>' : ''}
                        </div>
                        <span class="text-sm font-normal text-black">False</span>
                        ${isFalseSelected ? '<i class="fa-solid fa-check text-emerald-600 font-bold text-sm ml-auto shrink-0"></i>' : ''}
                    </div>
                </div>
            </div>
        `;
    },

    // 10. Short Answer / Identification
    renderShortAnswer: function (q, idx, isAnswerKeyOpen) {
        const escapeFn = window.escapeHtml || function (s) { return s || ''; };
        if (isAnswerKeyOpen) {
            if (!Array.isArray(q.answers) || q.answers.length === 0) {
                q.answers = q.answer ? [q.answer] : [''];
            }
            return `
                <div class="space-y-3 pt-2">
                    <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        ${q.answers.map((ans, aIdx) => window.SigmaQuizComponents.renderOptionSlot({
                            draggable: false,
                            value: ans,
                            placeholder: 'Accepted answer',
                            oninput: `window.autoExpandTextarea(this, 4); questions[${idx}].answers[${aIdx}] = this.value; questions[${idx}].answer = questions[${idx}].answers[0] || '';`,
                            showGrabHandle: false,
                            actionsHtml: `
                                ${q.answers.length > 1 ? `
                                    <button type="button" onclick="window.removeAcceptedAnswer(${idx}, ${aIdx})" class="w-8 h-8 rounded-lg text-black-fade hover:text-black hover:bg-slate-200/60 flex items-center justify-center transition-colors cursor-pointer shrink-0 mt-0.5" title="Remove Answer">
                                        <i class="fa-solid fa-xmark text-sm"></i>
                                    </button>
                                ` : ''}
                            `
                        })).join('')}

                        <!-- Add Acceptable Answer Slot -->
                        <button type="button" onclick="window.addAcceptedAnswer(${idx})"
                            class="flex items-center justify-center gap-2 bg-slate-50/70 hover:bg-slate-100/90 border-b-2 border-dashed border-black/30 hover:border-black px-4 py-2 min-h-[50px] transition-all cursor-pointer group/add-opt text-black-fade hover:text-black">
                            <i class="fa-solid fa-plus text-xs group-hover/add-opt:scale-110 transition-transform"></i>
                            <span class="text-sm font-medium">Add acceptable answer</span>
                        </button>
                    </div>

                    <!-- Automatic casing acceptance note -->
                    <div class="pt-2">
                        <span class="text-xs text-black font-normal">Answers are automatically accepted regardless of letter casing (lowercase, UPPERCASE, and Title Case).</span>
                    </div>
                </div>
            `;
        }
        const answersList = Array.isArray(q.answers) ? q.answers.filter(a => a && a.trim() !== '') : (q.answer && q.answer.trim() !== '' ? [q.answer] : []);
        const formattedAnswers = answersList.map(ans => escapeFn(ans)).join(', ');
        return `
            <div class="pt-2 pb-1 space-y-2">
                <div class="border-b border-dashed border-slate-300 py-3 text-sm text-black-fade select-none font-normal">
                    Short answer text
                </div>
                ${answersList.length > 0 ? `
                    <div class="text-xs pt-0.5 animate-in fade-in duration-150 leading-relaxed">
                        <span class="text-black-fade font-normal">Accepted answers:</span>
                        <span class="text-emerald-700 font-semibold ml-1">${formattedAnswers}</span>
                    </div>
                ` : ''}
            </div>
        `;
    },

    // 11. Enumeration Items
    renderEnumeration: function (q, idx, isAnswerKeyOpen) {
        const escapeFn = window.escapeHtml || function (s) { return s || ''; };
        const itemsList = Array.isArray(q.items) && q.items.length > 0 ? q.items : ['', '', ''];
        q.items = itemsList;

        // Initialize requiredCount (number of student answer text boxes)
        if (q.requiredCount === undefined || q.requiredCount === null || isNaN(parseInt(q.requiredCount)) || parseInt(q.requiredCount) <= 0) {
            q.requiredCount = (Array.isArray(q.slots) && q.slots.length > 0) ? q.slots.length : q.items.length;
        }

        if (!Array.isArray(q.itemPoints)) {
            if (q.points && q.points > 0 && q.items.length > 0) {
                const perItem = Math.floor(q.points / q.items.length);
                const remainder = q.points % q.items.length;
                q.itemPoints = q.items.map((_, i) => perItem + (i === 0 ? remainder : 0));
            } else {
                q.itemPoints = q.items.map(() => 0);
            }
        } else {
            while (q.itemPoints.length < q.items.length) {
                q.itemPoints.push(0);
            }
        }
        q.points = q.itemPoints.reduce((sum, p) => sum + (parseInt(p) || 0), 0);

        if (isAnswerKeyOpen) {
            if (!Array.isArray(q.itemAlternatives)) {
                q.itemAlternatives = q.items.map((it) => (typeof it === 'object' && Array.isArray(it?.alternatives)) ? it.alternatives : []);
            }
            while (q.itemAlternatives.length < q.items.length) {
                q.itemAlternatives.push([]);
            }

            return `
                <div class="space-y-3 pt-2">
                    <div class="space-y-3">
                        ${q.items.map((item, iIdx) => {
                            const itemVal = typeof item === 'object' && item ? (item.text || '') : (item || '');
                            const itemPts = (Array.isArray(q.itemPoints) && q.itemPoints[iIdx] !== undefined && !isNaN(parseInt(q.itemPoints[iIdx])))
                                ? parseInt(q.itemPoints[iIdx])
                                : (typeof item === 'object' && item && item.points !== undefined && !isNaN(parseInt(item.points)) ? parseInt(item.points) : 0);
                            const itemAlts = (Array.isArray(q.itemAlternatives) && Array.isArray(q.itemAlternatives[iIdx]))
                                ? q.itemAlternatives[iIdx]
                                : [];

                            return `
                                <div class="space-y-1.5 group/enum-block">
                                    <div class="flex flex-wrap sm:flex-nowrap items-center gap-2 sm:gap-3 group/enum-row border-b border-slate-100 sm:border-0 pb-2.5 sm:pb-0">
                                        <!-- Points Counter: floated right on mobile, on the right on desktop -->
                                        <div class="order-1 sm:order-2 ml-auto sm:ml-0 w-[130px] sm:w-[145px] flex items-center justify-between bg-slate-50 h-9 sm:h-10 px-2.5 sm:px-3 py-1 rounded-xl border border-slate-200 text-xs sm:text-sm font-normal text-black shrink-0">
                                            <div class="flex items-center gap-1.5 shrink-0">
                                                <i class="fa-solid fa-star text-amber-400 text-xs"></i>
                                                <span class="text-black-fade text-xs sm:text-sm font-normal">Points:</span>
                                            </div>
                                            <input type="number" id="enum-item-pts-input-${idx}-${iIdx}" min="0" max="999" value="${itemPts}"
                                                onkeydown="if(['e','E','+','-','.',' '].includes(event.key)) event.preventDefault();"
                                                oninput="this.value = this.value.replace(/[^0-9]/g, ''); let v = parseInt(this.value); if (v > 999) { v = 999; this.value = 999; } if (typeof window.updateEnumItemPoints === 'function') window.updateEnumItemPoints(${idx}, ${iIdx}, v);"
                                                onblur="let v = parseInt(this.value); if (isNaN(v) || v < 0) { this.value = 0; v = 0; } if (typeof window.updateEnumItemPoints === 'function') window.updateEnumItemPoints(${idx}, ${iIdx}, v);"
                                                class="w-12 sm:w-14 bg-transparent text-center font-normal text-black outline-none text-xs sm:text-sm">
                                        </div>
                                        <!-- Left Text Box with Grab, Remove inside renderOptionSlot -->
                                        <div class="order-2 sm:order-1 w-full sm:w-auto sm:flex-1 sm:max-w-lg min-w-0">
                                            ${window.SigmaQuizComponents.renderOptionSlot({
                                                draggable: true,
                                                dragStart: `window.handleEnumDragStart(event, ${idx}, ${iIdx})`,
                                                dragOver: 'window.handleEnumDragOver(event)',
                                                drop: `window.handleEnumDrop(event, ${idx}, ${iIdx})`,
                                                leadingHtml: '',
                                                value: itemVal,
                                                placeholder: 'Accepted answer',
                                                oninput: `window.autoExpandTextarea(this, 2); questions[${idx}].items[${iIdx}] = this.value;`,
                                                extraClasses: 'w-full min-h-[46px] py-1',
                                                maxLength: 1000,
                                                actionsHtml: `
                                                    ${q.items.length > 1 ? `
                                                        <button type="button" onclick="window.removeEnumItem(${idx}, ${iIdx})"
                                                             class="w-6 h-6 rounded text-black-fade hover:text-black hover:bg-slate-200/60 flex items-center justify-center transition-colors cursor-pointer shrink-0 mt-0.5" title="Remove Item">
                                                            <i class="fa-solid fa-xmark text-sm"></i>
                                                        </button>
                                                    ` : ''}
                                                `
                                            })}
                                        </div>
                                    </div>

                                    <!-- Alternative Answers List & Add Alternative Button below the Main Text Box -->
                                    <div class="max-w-lg space-y-1.5 pl-4 sm:pl-5">
                                        ${itemAlts.map((altVal, altIdx) => `
                                            <div class="flex items-center gap-2 group/enum-alt">
                                                <i class="fa-solid fa-turn-up rotate-90 text-[10px] text-black-fade/60 shrink-0"></i>
                                                <div class="flex-1 flex items-center bg-slate-50/80 hover:bg-slate-100/90 border-b-2 border-dashed border-black/25 focus-within:border-black px-3 py-1 min-h-[38px] transition-all">
                                                    <input type="text" id="enum-alt-input-${idx}-${iIdx}-${altIdx}" value="${escapeFn(altVal)}" placeholder="Alternative / acceptable answer"
                                                        oninput="window.updateEnumAlternative(${idx}, ${iIdx}, ${altIdx}, this.value)"
                                                        class="flex-1 bg-transparent text-xs sm:text-sm font-normal text-black outline-none placeholder:text-black/40 min-w-0">
                                                    <button type="button" onclick="window.removeEnumAlternative(${idx}, ${iIdx}, ${altIdx})"
                                                        class="w-5 h-5 rounded text-black-fade hover:text-black hover:bg-slate-200/60 flex items-center justify-center transition-colors cursor-pointer shrink-0 ml-1" title="Remove Alternative">
                                                        <i class="fa-solid fa-xmark text-xs"></i>
                                                    </button>
                                                </div>
                                            </div>
                                        `).join('')}
                                        <div>
                                            <button type="button" onclick="window.addEnumAlternative(${idx}, ${iIdx})"
                                                class="inline-flex items-center gap-1.5 text-xs text-black-fade hover:text-black font-medium py-1 px-2 rounded hover:bg-slate-100 transition-colors cursor-pointer group/add-alt">
                                                <i class="fa-solid fa-plus text-[10px] text-black-fade group-hover/add-alt:text-black"></i>
                                                <span>Add alternative answer</span>
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            `;
                        }).join('')}
                    </div>

                    <!-- Add Acceptable Answer Slot (Aligned with inputs) -->
                    <div class="pt-1 flex items-center gap-3">
                        <button type="button" onclick="window.addEnumItem(${idx})"
                            class="inline-flex items-center justify-center gap-2 bg-slate-50/70 hover:bg-slate-100/90 border-b-2 border-dashed border-black/30 hover:border-black px-4 py-2 min-h-[46px] transition-all cursor-pointer group/add-opt text-black-fade hover:text-black">
                            <i class="fa-solid fa-plus text-xs text-black-fade group-hover/add-opt:text-black transition-colors"></i>
                            <span class="text-sm font-medium text-black-fade group-hover/add-opt:text-black transition-colors">Add acceptable answer</span>
                        </button>
                    </div>

                    <!-- Automatic casing and ordering acceptance note -->
                    <div class="pt-2">
                        <span class="text-xs text-black font-normal">Answers are automatically accepted in any order and casing (lowercase, UPPERCASE, and Title Case).</span>
                    </div>
                </div>
            `;
        }

        const validAnswers = q.items.filter(a => (typeof a === 'string' ? a : (a?.text || '')).trim() !== '');
        const slotCount = Math.max(1, parseInt(q.requiredCount) || q.items.length || 3);
        const slotIndices = Array.from({ length: slotCount }, (_, i) => i);

        return `
            <div class="space-y-3 pt-2 pb-1">
                <div class="space-y-2">
                    ${slotIndices.map((sIdx) => `
                        <div class="flex items-center gap-3 group/enum-slot">
                            <span class="w-5 text-center text-sm font-normal text-black-fade shrink-0">${sIdx + 1}.</span>
                            <div class="flex-1 border-b border-dashed border-slate-300 py-2.5 text-sm text-black-fade select-none font-normal">
                                Short answer text
                            </div>
                            ${slotCount > 1 ? `
                                <button type="button" onclick="window.removeEnumSlot(${idx}, ${sIdx})" class="w-8 h-8 rounded-lg text-black-fade hover:text-black hover:bg-slate-100 flex items-center justify-center transition-colors cursor-pointer shrink-0 opacity-0 group-hover/enum-slot:opacity-100" title="Remove slot">
                                    <i class="fa-solid fa-xmark text-sm"></i>
                                </button>
                            ` : ''}
                        </div>
                    `).join('')}

                    <!-- Add Option Slot in main question editor (Only adds student slot, does NOT add to Answer Key) -->
                    <div class="pt-1 flex items-center gap-3">
                        <span class="w-5 shrink-0"></span>
                        <button type="button" onclick="window.addEnumSlot(${idx})"
                            class="inline-flex items-center justify-center gap-2 bg-slate-50/70 hover:bg-slate-100/90 border-b-2 border-dashed border-black/30 hover:border-black px-4 py-2 min-h-[46px] transition-all cursor-pointer group/add-opt text-black-fade hover:text-black">
                            <i class="fa-solid fa-plus text-xs text-black-fade group-hover/add-opt:text-black transition-colors"></i>
                            <span class="text-sm font-medium text-black-fade group-hover/add-opt:text-black transition-colors">Add Option</span>
                        </button>
                    </div>
                </div>

                ${validAnswers.length > 0 ? `
                    <div class="text-xs pt-1 animate-in fade-in duration-150 leading-relaxed">
                        <span class="text-black-fade font-normal">Accepted answers:</span>
                        <div class="mt-1.5 flex flex-wrap gap-2">
                            ${q.items.map((it, iIdx) => {
                                const itText = typeof it === 'string' ? it : (it?.text || '');
                                if (!itText || itText.trim() === '') return '';
                                const itPts = (Array.isArray(q.itemPoints) && q.itemPoints[iIdx] !== undefined && !isNaN(parseInt(q.itemPoints[iIdx])))
                                    ? parseInt(q.itemPoints[iIdx])
                                    : (typeof it === 'object' && it && it.points !== undefined && !isNaN(parseInt(it.points)) ? parseInt(it.points) : 0);
                                const alts = (Array.isArray(q.itemAlternatives) && Array.isArray(q.itemAlternatives[iIdx]))
                                    ? q.itemAlternatives[iIdx].filter(a => a && a.trim() !== '')
                                    : [];
                                return `
                                    <span class="inline-flex items-center gap-1.5 bg-emerald-50 border border-emerald-200/80 px-2.5 py-1 rounded-lg text-xs select-none max-w-full overflow-hidden">
                                        <span class="text-emerald-700 font-normal shrink-0">${iIdx + 1}.</span>
                                        <span class="text-black font-normal break-words min-w-0">${escapeFn(itText)}${alts.length > 0 ? ` <span class="text-emerald-800/80 font-normal text-[11px]">(or ${alts.map(a => escapeFn(a)).join(', ')})</span>` : ''}</span>
                                        <span class="text-emerald-800/60 text-[10px] font-medium ml-0.5 shrink-0">(${itPts} ${itPts === 1 ? 'pt' : 'pts'})</span>
                                    </span>
                                `;
                            }).join('')}
                        </div>
                    </div>
                ` : ''}
            </div>
        `;
    },

    // 12. Matching Type Pairs
    renderMatching: function (q, idx, isAnswerKeyOpen) {
        const escapeFn = window.escapeHtml || function (s) { return s || ''; };
        const pairsList = Array.isArray(q.pairs) && q.pairs.length > 0 ? q.pairs : [{ premise: '', target: '', points: 0 }, { premise: '', target: '', points: 0 }];
        q.pairs = pairsList;

        // Ensure each pair has points initialized, and sync total points
        const hasPointsDefined = q.pairs.some(p => p.points !== undefined && !isNaN(parseInt(p.points)) && parseInt(p.points) > 0);
        if (!hasPointsDefined && q.points && q.points > 0 && q.pairs.length > 0) {
            const perPair = Math.floor(q.points / q.pairs.length);
            const remainder = q.points % q.pairs.length;
            q.pairs.forEach((p, pIdx) => {
                p.points = perPair + (pIdx === 0 ? remainder : 0);
            });
        } else {
            q.pairs.forEach(p => {
                if (p.points === undefined || isNaN(parseInt(p.points))) {
                    p.points = 0;
                } else {
                    p.points = parseInt(p.points);
                }
            });
        }
        q.points = q.pairs.reduce((sum, p) => sum + (parseInt(p.points) || 0), 0);

        if (isAnswerKeyOpen) {
            return `
                <div class="space-y-3 pt-2">
                    <div class="space-y-2.5">
                        ${q.pairs.map((pair, pIdx) => {
                            const pairPts = (pair.points !== undefined && !isNaN(parseInt(pair.points))) ? parseInt(pair.points) : 0;
                            return `
                                <div class="flex flex-wrap sm:flex-nowrap items-center gap-2 sm:gap-3 group/pair border-b border-slate-100 sm:border-0 pb-3 sm:pb-0">
                                    <!-- Row and Number Only on the Left -->
                                    <div class="order-1 flex items-center shrink-0 min-w-[50px]">
                                        <span class="text-sm font-semibold sm:font-normal text-black-fade select-none">
                                            Row ${pIdx + 1}
                                        </span>
                                    </div>
                                    <!-- Beside each text box row: Individual Points Counter -->
                                    <div class="order-2 ml-auto sm:ml-0 sm:order-3 w-[130px] sm:w-[145px] flex items-center justify-between bg-slate-50 h-9 sm:h-10 px-2.5 sm:px-3 py-1 rounded-xl border border-slate-200 text-xs sm:text-sm font-normal text-black shrink-0">
                                        <div class="flex items-center gap-1.5 shrink-0">
                                            <i class="fa-solid fa-star text-amber-400 text-xs"></i>
                                            <span class="text-black-fade text-xs sm:text-sm font-normal">Points:</span>
                                        </div>
                                        <input type="number" id="matching-pair-pts-input-${idx}-${pIdx}" min="0" max="999" value="${pairPts}"
                                            onkeydown="if(['e','E','+','-','.',' '].includes(event.key)) event.preventDefault();"
                                            oninput="this.value = this.value.replace(/[^0-9]/g, ''); let v = parseInt(this.value); if (v > 999) { v = 999; this.value = 999; } if (typeof window.updateMatchingPairPoints === 'function') window.updateMatchingPairPoints(${idx}, ${pIdx}, v);"
                                            onblur="let v = parseInt(this.value); if (isNaN(v) || v < 0) { this.value = 0; v = 0; } if (typeof window.updateMatchingPairPoints === 'function') window.updateMatchingPairPoints(${idx}, ${pIdx}, v);"
                                            class="w-12 sm:w-14 bg-transparent text-center font-normal text-black outline-none text-xs sm:text-sm">
                                    </div>
                                    <!-- Column B Textbox with Grab and Swap inside via shared renderOptionSlot -->
                                    <div class="order-3 sm:order-2 w-full sm:w-auto sm:flex-1 sm:max-w-lg min-w-0">
                                        ${window.SigmaQuizComponents.renderOptionSlot({
                                            draggable: true,
                                            dragStart: `window.handlePairDragStart(event, ${idx}, ${pIdx})`,
                                            dragOver: 'window.handlePairDragOver(event)',
                                            drop: `window.handlePairDrop(event, ${idx}, ${pIdx})`,
                                            value: pair.target || '',
                                            placeholder: 'Column B: Matching Target / Answer',
                                            oninput: `window.autoExpandTextarea(this, 2); questions[${idx}].pairs[${pIdx}].target = this.value;`,
                                            extraClasses: 'w-full min-h-[46px] py-1',
                                            maxLength: 1000,
                                            actionsHtml: `
                                                ${q.pairs.length > 1 ? `
                                                    <button type="button" onclick="window.swapMatchingTargetWithNext(${idx}, ${pIdx})"
                                                        class="w-6 h-6 rounded text-black-fade hover:text-black hover:bg-slate-200/60 opacity-0 group-hover/opt:opacity-100 flex items-center justify-center transition-all cursor-pointer shrink-0" title="Swap with next row">
                                                        <i class="fa-solid fa-arrow-right-arrow-left text-xs"></i>
                                                    </button>
                                                ` : ''}
                                            `
                                        })}
                                    </div>
                                </div>
                            `;
                        }).join('')}
                    </div>
                </div>
            `;
        }

        const validMatches = q.pairs.filter(p => p.target && p.target.trim() !== '');

        return `
            <div class="space-y-2 pt-1">
                <div class="space-y-2.5">
                    ${q.pairs.map((pair, pIdx) => window.SigmaQuizComponents.renderOptionSlot({
                        draggable: true,
                        dragStart: `window.handlePairDragStart(event, ${idx}, ${pIdx})`,
                        dragOver: 'window.handlePairDragOver(event)',
                        drop: `window.handlePairDrop(event, ${idx}, ${pIdx})`,
                        leadingHtml: `<span class="w-5 text-center text-sm font-normal text-black-fade shrink-0 pt-0.5">${pIdx + 1}.</span>`,
                        value: pair.premise || '',
                        placeholder: 'Column A: Premise / Question Row',
                        oninput: `window.autoExpandTextarea(this, 2); questions[${idx}].pairs[${pIdx}].premise = this.value;`,
                        extraClasses: 'flex-1 min-h-[46px] py-1',
                        maxLength: 1000,
                        actionsHtml: `
                            ${q.pairs.length > 1 ? `
                                <button type="button" onclick="window.removeMatchingPair(${idx}, ${pIdx})" class="w-8 h-8 rounded-lg text-black-fade hover:text-black hover:bg-slate-100 flex items-center justify-center transition-colors cursor-pointer shrink-0 mt-0.5" title="Remove Row">
                                    <i class="fa-solid fa-xmark text-sm"></i>
                                </button>
                            ` : `<div class="w-8 shrink-0"></div>`}
                        `
                    })).join('')}
                </div>

                <!-- Add Option / Row Slot (Aligned with inputs) -->
                <div class="pt-1 flex items-center gap-3">
                    <span class="w-7 shrink-0"></span>
                    <button type="button" onclick="window.addMatchingPair(${idx})"
                        class="inline-flex items-center justify-center gap-2 bg-slate-50/70 hover:bg-slate-100/90 border-b-2 border-dashed border-black/30 hover:border-black px-4 py-2 min-h-[46px] transition-all cursor-pointer group/add-opt text-black-fade hover:text-black">
                        <i class="fa-solid fa-plus text-xs text-black-fade group-hover/add-opt:text-black transition-colors"></i>
                        <span class="text-sm font-medium text-black-fade group-hover/add-opt:text-black transition-colors">Add Option</span>
                    </button>
                </div>

                ${validMatches.length > 0 ? `
                    <div class="text-xs pt-2 animate-in fade-in duration-150 leading-relaxed border-t border-slate-100 mt-2">
                        <span class="text-black-fade font-normal">Accepted matches:</span>
                        <div class="mt-1.5 flex flex-wrap gap-2">
                            ${q.pairs.map((p, pIdx) => {
                                if (!p.target || p.target.trim() === '') return '';
                                const pairPts = (p.points !== undefined && !isNaN(parseInt(p.points))) ? parseInt(p.points) : 1;
                                return `
                                    <span class="inline-flex items-center gap-1.5 bg-emerald-50 border border-emerald-200/80 px-2.5 py-1 rounded-lg text-xs select-none max-w-full overflow-hidden">
                                        <span class="text-emerald-700 font-normal shrink-0">Row ${pIdx + 1}</span>
                                        <i class="fa-solid fa-arrow-right text-[10px] text-emerald-600/70 shrink-0"></i>
                                        <span class="text-black font-normal break-words min-w-0">${escapeFn(p.target)}</span>
                                        <span class="text-emerald-800/60 text-[10px] font-medium ml-0.5 shrink-0">(${pairPts} ${pairPts === 1 ? 'pt' : 'pts'})</span>
                                    </span>
                                `;
                            }).join('')}
                        </div>
                    </div>
                ` : ''}
            </div>
        `;
    },

    // 12b. Essay / Paragraph
    renderEssay: function (q, idx, isAnswerKeyOpen) {
        const escapeFn = window.escapeHtml || function (s) { return s || ''; };

        if (isAnswerKeyOpen) {
            return `
                <div class="space-y-4 pt-2">
                    <!-- Grading Criteria / Key Points / Sample Notes -->
                    <div class="space-y-2">
                        <div class="flex items-center gap-2 text-xs font-bold text-black">
                            <i class="fa-solid fa-file-pen text-[#15803d]"></i>
                            <span>Grading Criteria / Key Points / Sample Notes:</span>
                        </div>
                        <div class="bg-slate-50 border-b-2 border-black/35 hover:bg-slate-100 hover:border-black/60 focus-within:bg-slate-100 focus-within:border-black px-4 py-3 min-h-[85px] transition-all rounded-t-lg">
                            <textarea rows="3" maxlength="2000" placeholder="Enter key points or grading criteria for this essay question..."
                                oninput="window.autoExpandTextarea(this, 8); questions[${idx}].rubric = this.value;"
                                class="w-full bg-transparent text-sm font-normal text-black outline-none placeholder:text-black/40 resize-none leading-relaxed break-words min-w-0">${escapeFn(q.rubric || '')}</textarea>
                        </div>
                    </div>
                </div>
            `;
        }

        return `
            <div class="space-y-3 pt-2 pb-1">
                <div class="border-b-2 border-dashed border-slate-300 py-3.5 text-sm text-black-fade select-none font-normal">
                    Long-form text response
                </div>
                ${q.rubric ? `
                    <div class="flex flex-wrap items-center gap-2 pt-1 text-xs animate-in fade-in duration-150">
                        <span class="text-black-fade font-normal">Notes: <span class="text-emerald-700 font-semibold">${escapeFn(q.rubric)}</span></span>
                    </div>
                ` : ''}
            </div>
        `;
    },

    // 13. Full Question Card Container
    renderQuestionCard: function (q, idx, isAnswerKeyOpen, isNewlyAdded = false) {
        let bodyHtml = '';
        if (q.type === 'Multiple Choice' || !q.type) {
            bodyHtml = this.renderMultipleChoice(q, idx, isAnswerKeyOpen);
        } else if (q.type === 'True or False') {
            bodyHtml = this.renderTrueFalse(q, idx, isAnswerKeyOpen);
        } else if (q.type === 'Short Answer') {
            bodyHtml = this.renderShortAnswer(q, idx, isAnswerKeyOpen);
        } else if (q.type === 'Essay') {
            bodyHtml = this.renderEssay(q, idx, isAnswerKeyOpen);
        } else if (q.type === 'Matching Type') {
            bodyHtml = this.renderMatching(q, idx, isAnswerKeyOpen);
        } else if (q.type === 'Enumeration') {
            bodyHtml = this.renderEnumeration(q, idx, isAnswerKeyOpen);
        }

        const animClass = isNewlyAdded ? 'question-card-new-glow' : 'question-card-entrance';

        return `
            <div id="active-question-card-inner" class="active-question-card relative overflow-hidden bg-white rounded-2xl border border-slate-300 standard-panel-shadow p-6 md:p-7 space-y-4 ${animClass} transition-all">
                ${isNewlyAdded ? '<div class="absolute top-0 left-0 right-0 h-1.5 aurora-beam z-10"></div>' : ''}
                ${this.renderQuestionHeader(q, idx, isAnswerKeyOpen, isNewlyAdded)}
                ${this.renderPromptTextarea(q, idx, isAnswerKeyOpen)}
                ${this.renderImagePreview(q, idx)}
                ${bodyHtml}
            </div>
        `;
    },

    // 14. Sidebar Overview Thumbnail Card
    renderOverviewThumbnail: function (q, idx, isActive, isNew = false) {
        const qNum = idx + 1;
        const escapeFn = window.escapeHtml || function (s) { return s || ''; };
        const escapedPrompt = escapeFn(q.question ? q.question : '(Untitled question prompt...)');
        const animClass = isNew ? 'deck-card-entrance' : '';
        const pts = (q.points !== undefined && !isNaN(parseInt(q.points))) ? parseInt(q.points) : 0;

        if (isActive) {
            return `
                <div data-q-idx="${idx}"
                    class="deck-thumbnail-card deck-editing-card ${animClass} w-full py-4 px-5 rounded-2xl border-2 border-dashed border-[#FFD000] flex items-center justify-center gap-2.5 select-none cursor-default shadow-2xs font-['Inter']"
                    style="background-color: rgba(255, 208, 0, 0.08) !important; border-color: #FFD000 !important;"
                    title="Currently Editing Question ${qNum}">
                    <span class="w-6 h-6 rounded-md bg-[#FFD000] text-black text-xs font-bold flex items-center justify-center shrink-0 shadow-2xs">
                        ${qNum}
                    </span>
                    <span class="text-xs sm:text-sm font-bold text-black flex items-center gap-1.5">
                        <i class="fa-solid fa-pencil text-xs text-amber-500"></i>
                        <span>Editing</span>
                    </span>
                </div>
            `;
        }

        return `
            <div data-q-idx="${idx}" onclick="window.selectActiveQuestion(${idx})"
                class="deck-thumbnail-card ${animClass} w-full p-4 rounded-2xl border border-slate-300 bg-white hover:border-[#FFD000] hover:bg-amber-50/20 hover:shadow-xs transition-all cursor-pointer text-left group select-none overflow-hidden space-y-2.5 shadow-2xs font-['Inter']"
                title="Click to edit Question ${qNum}">
                <div class="flex items-center justify-between gap-2">
                    <div class="flex items-center gap-2 min-w-0">
                        <!-- Grab Handle -->
                        <div class="deck-drag-handle cursor-grab active:cursor-grabbing text-black transition-opacity opacity-0 group-hover:opacity-100 w-5 h-5 -ml-1 flex items-center justify-center shrink-0 hover:bg-slate-100 rounded-md" onclick="event.stopPropagation()" title="Drag to reorder question">
                            <i class="fa-solid fa-grip-vertical text-xs pointer-events-none"></i>
                        </div>
                        <span class="w-5 h-5 rounded-md bg-[#15803d] text-white text-[10px] font-black flex items-center justify-center shrink-0 shadow-2xs">
                            ${qNum}
                        </span>
                        <span id="thumb-type-${idx}" class="text-xs font-semibold text-black truncate">
                            ${q.type || 'Multiple Choice'}
                        </span>
                    </div>
                    <div class="flex items-center gap-2.5 shrink-0">
                        ${q.image ? '<span class="text-xs text-black" title="Has attached image"><i class="fa-regular fa-image"></i></span>' : ''}
                        <span id="thumb-points-wrap-${idx}" class="text-xs font-normal text-black flex items-center gap-1">
                            <i class="fa-solid fa-star text-amber-400 text-[10px]"></i>
                            <span id="thumb-points-val-${idx}">${pts}</span> Points
                        </span>
                        <button type="button" onclick="event.stopPropagation(); window.removeQuestion(${idx})"
                            class="w-7 h-7 rounded-lg hover:bg-slate-200/80 text-black-fade hover:text-black flex items-center justify-center transition-all cursor-pointer" title="Delete">
                            <i class="fa-solid fa-trash-can text-xs"></i>
                        </button>
                    </div>
                </div>
                <p id="thumb-prompt-${idx}" class="text-xs text-black font-normal line-clamp-2 leading-relaxed break-words min-w-0">
                    ${escapedPrompt}
                </p>
            </div>
        `;
    },

    // 15. Ghost Active Slot for fallback
    renderGhostActiveThumbnail: function (q, idx) {
        return this.renderOverviewThumbnail(q, idx, true, false);
    }
};
