// --- START OF app.js ---

document.addEventListener('DOMContentLoaded', () => {
    // --- DOM Elements ---
    const controlsSection = document.getElementById('controls');
    const omrSheetContainer = document.getElementById('omr-sheet-container');
    const userAnswersHeading = document.getElementById('user-answers-heading');
    const correctKeyHeading = document.getElementById('correct-key-heading');
    const questionInput = document.getElementById('question-numbers');
    const numChoicesSelect = document.getElementById('num-choices');
    const generateBtn = document.getElementById('generate-btn');
    const clearBtn = document.getElementById('clear-btn');
    const mainActionBtn = document.getElementById('main-action-btn');
    const editAnswersBtn = document.getElementById('edit-answers-btn');
    const omrSheetDiv = document.getElementById('omr-sheet');
    const reportArea = document.getElementById('report-area');
    const placeholderText = document.createElement('p');
    placeholderText.classList.add('placeholder');
    placeholderText.textContent = 'Enter question numbers and click "Generate OMR Sheet".';

    // --- State ---
    let appState = 'answering';
    let currentQuestions = [];
    let currentChoices = 4;
    let userAnswers = {};
    let correctAnswers = {};

    // --- Constants ---
    const LS_CONFIG_KEY = 'omrConfigV4';
    const LS_ANSWERS_KEY = 'omrUserAnswersV4';
    const LS_KEY_KEY = 'omrCorrectAnswersV4';
    const LS_STATE_KEY = 'omrAppStateV4';
    const LS_RESULT_DISPLAYED_KEY = 'omrResultDisplayedV4';

    // --- Initialization ---
    loadStateFromLocalStorage();
    renderOMRSheet();
    checkAndDisplaySavedResults();
    updateSectionVisibility();
    updateUIbasedOnState();

    // --- Event Listeners ---
    if (generateBtn) generateBtn.addEventListener('click', handleGenerateSheet);
    if (clearBtn) clearBtn.addEventListener('click', handleClearAll);
    if (mainActionBtn) mainActionBtn.addEventListener('click', handleMainAction);
    if (editAnswersBtn) editAnswersBtn.addEventListener('click', handleEditAnswers);
    if (omrSheetDiv) omrSheetDiv.addEventListener('click', handleBubbleClick);
    if (questionInput) {
        questionInput.addEventListener('change', saveConfigToLocalStorage);
        questionInput.addEventListener('keydown', handleInputEnterKey);
    }
    if (numChoicesSelect) numChoicesSelect.addEventListener('change', saveConfigToLocalStorage);

    // --- Functions ---

    // Removed beforeunload handler

    function updateSectionVisibility() {
        const questionsExist = hasQuestions();
        if (omrSheetContainer) omrSheetContainer.style.display = questionsExist ? 'block' : 'none';
        if (controlsSection) controlsSection.style.display = questionsExist ? 'none' : 'block';
    }

    function hasQuestions() { return currentQuestions.length > 0; }

    function removeSkippedStyles() {
        if (!omrSheetDiv) return;
        omrSheetDiv.querySelectorAll('.question-row.skipped-question').forEach(row => {
            row.classList.remove('skipped-question');
        });
    }

    function setAppState(newState) {
        appState = newState;
        localStorage.setItem(LS_STATE_KEY, appState);
        removeSkippedStyles(); // Remove skipped styles when state changes
        if (appState === 'keyEntry') {
            omrSheetDiv.querySelectorAll('.question-row').forEach(row => { const qNum = row.dataset.questionNumber; if (!(qNum in userAnswers)) { row.classList.add('skipped-question'); } });
            localStorage.removeItem(LS_RESULT_DISPLAYED_KEY); if(omrSheetDiv) omrSheetDiv.classList.remove('show-results');
        } else { localStorage.removeItem(LS_RESULT_DISPLAYED_KEY); if(omrSheetDiv) omrSheetDiv.classList.remove('show-results'); }
        updateUIbasedOnState();
    }

    function updateUIbasedOnState() {
        const requiredElements = [omrSheetDiv, reportArea, mainActionBtn, editAnswersBtn, clearBtn, controlsSection, omrSheetContainer, userAnswersHeading, correctKeyHeading];
        if (requiredElements.some(el => !el)) { console.error("State Update Aborted: Core UI elements missing!"); return; }
        const questionsExist = hasQuestions(); const resultsActive = localStorage.getItem(LS_RESULT_DISPLAYED_KEY) === 'true' && appState === 'keyEntry';
        updateSectionVisibility();
        omrSheetDiv.classList.toggle('key-entry-active', appState === 'keyEntry'); omrSheetDiv.classList.toggle('show-results', resultsActive);
        reportArea.style.display = resultsActive ? 'block' : 'none'; if (!resultsActive) removeResultStyles();
        userAnswersHeading.style.display = 'none'; correctKeyHeading.style.display = 'none';
        if (questionsExist) { if (resultsActive) { userAnswersHeading.style.display = 'block'; correctKeyHeading.style.display = 'block'; } else if (appState === 'answering') { userAnswersHeading.style.display = 'block'; } else if (appState === 'keyEntry') { correctKeyHeading.style.display = 'block'; } }
        if (appState === 'answering') { mainActionBtn.textContent = 'Submit Answers & Enter Key'; mainActionBtn.style.display = questionsExist ? 'inline-block' : 'none'; editAnswersBtn.style.display = 'none'; clearBtn.style.display = questionsExist ? 'inline-block' : 'none'; } else if (appState === 'keyEntry') { mainActionBtn.textContent = 'Check Answers'; mainActionBtn.style.display = questionsExist ? 'inline-block' : 'none'; editAnswersBtn.style.display = questionsExist ? 'inline-block' : 'none'; clearBtn.style.display = questionsExist ? 'inline-block' : 'none'; }
    }

    function loadStateFromLocalStorage() {
        const savedConfig = localStorage.getItem(LS_CONFIG_KEY); const savedUserAnswers = localStorage.getItem(LS_ANSWERS_KEY); const savedCorrectAnswers = localStorage.getItem(LS_KEY_KEY); const savedState = localStorage.getItem(LS_STATE_KEY);
        if (savedConfig) { try { const config = JSON.parse(savedConfig); if (questionInput) questionInput.value = config.questions || ''; if (numChoicesSelect) numChoicesSelect.value = config.choices || '4'; currentQuestions = parseQuestionNumbers(config.questions || ''); currentChoices = parseInt(config.choices || '4', 10); } catch (e) { console.error("Error parsing config:", e); localStorage.removeItem(LS_CONFIG_KEY); currentQuestions = []; currentChoices = 4; } } else { currentQuestions = []; currentChoices = 4; }
        try { userAnswers = savedUserAnswers ? JSON.parse(savedUserAnswers) : {}; } catch (e) { console.error("Error parsing user answers:", e); localStorage.removeItem(LS_ANSWERS_KEY); userAnswers = {}; }
        try { correctAnswers = savedCorrectAnswers ? JSON.parse(savedCorrectAnswers) : {}; } catch (e) { console.error("Error parsing correct answers:", e); localStorage.removeItem(LS_KEY_KEY); correctAnswers = {}; }
        appState = (savedState === 'keyEntry' && currentQuestions.length > 0) ? 'keyEntry' : 'answering';
    }

    function checkAndDisplaySavedResults() {
        const shouldShowResults = localStorage.getItem(LS_RESULT_DISPLAYED_KEY);
        if (shouldShowResults === 'true' && appState === 'keyEntry' && hasQuestions()) { console.log("Restoring previous results display."); checkAnswers(false); } else { if(omrSheetDiv) omrSheetDiv.classList.remove('show-results'); }
        updateUIbasedOnState();
    }

    function saveConfigToLocalStorage() { if (!questionInput || !numChoicesSelect) return; const config = { questions: questionInput.value, choices: numChoicesSelect.value }; localStorage.setItem(LS_CONFIG_KEY, JSON.stringify(config)); }
    function saveUserAnswersToLocalStorage() { localStorage.setItem(LS_ANSWERS_KEY, JSON.stringify(userAnswers)); }
    function saveCorrectAnswersToLocalStorage() { localStorage.setItem(LS_KEY_KEY, JSON.stringify(correctAnswers)); }
    function parseQuestionNumbers(inputString) { if (!inputString) return []; const numbers = new Set(); const parts = inputString.split(','); for (const part of parts) { const trimmedPart = part.trim(); if (!trimmedPart) continue; if (trimmedPart.includes('-')) { const range = trimmedPart.split('-'); if (range.length === 2) { const start = parseInt(range[0].trim(), 10); const end = parseInt(range[1].trim(), 10); if (!isNaN(start) && !isNaN(end) && start <= end) { for (let i = start; i <= end; i++) numbers.add(i); } else { console.warn(`Invalid range format: "${trimmedPart}"`); } } else { console.warn(`Invalid range format: "${trimmedPart}"`); } } else { const num = parseInt(trimmedPart, 10); if (!isNaN(num)) numbers.add(num); else { console.warn(`Invalid number format: "${trimmedPart}"`); } } } return Array.from(numbers).sort((a, b) => a - b); }

    function createQuestionRowElement(qNum, numChoices) {
        const choiceLabels = Array.from({ length: numChoices }, (_, i) => String.fromCharCode(65 + i)); const row = document.createElement('div'); row.classList.add('question-row'); row.dataset.questionNumber = qNum; const numberLabel = document.createElement('span'); numberLabel.classList.add('question-number'); numberLabel.textContent = `${qNum}.`; const optionsDiv = document.createElement('div'); optionsDiv.classList.add('options'); choiceLabels.forEach(label => { const optionBtn = document.createElement('button'); optionBtn.classList.add('option-btn'); optionBtn.dataset.optionValue = label; optionBtn.textContent = label; if (userAnswers[qNum] === label) optionBtn.classList.add('selected'); optionsDiv.appendChild(optionBtn); }); const keyEntryOptionsDiv = document.createElement('div'); keyEntryOptionsDiv.classList.add('key-entry-options'); choiceLabels.forEach(label => { const keyBtn = document.createElement('button'); keyBtn.classList.add('option-btn'); keyBtn.dataset.optionValue = label; keyBtn.textContent = label; if (correctAnswers[qNum] === label) keyBtn.classList.add('selected'); keyEntryOptionsDiv.appendChild(keyBtn); }); row.appendChild(numberLabel); row.appendChild(optionsDiv); row.appendChild(keyEntryOptionsDiv); return row;
    }

    function renderOMRSheet() {
        if (!omrSheetDiv || !omrSheetContainer) return;
        omrSheetDiv.innerHTML = ''; omrSheetDiv.classList.remove('show-results', 'key-entry-active');
        removeSkippedStyles();
        if (!hasQuestions()) { omrSheetDiv.appendChild(placeholderText); }
        else { const choiceLabels = Array.from({ length: currentChoices }, (_, i) => String.fromCharCode(65 + i)); currentQuestions.forEach(qNum => { const newRow = createQuestionRowElement(qNum, currentChoices); omrSheetDiv.appendChild(newRow); }); }
        updateSectionVisibility(); updateUIbasedOnState();
    }

    function handleGenerateSheet() {
        if (!questionInput || !numChoicesSelect || !omrSheetContainer) return;
        localStorage.removeItem(LS_RESULT_DISPLAYED_KEY);
        const inputString = questionInput.value; const numChoices = parseInt(numChoicesSelect.value, 10); const requestedNumbers = parseQuestionNumbers(inputString);
        if (inputString.trim() === '' || (requestedNumbers.length === 0 && inputString.trim() !== '')) { if (inputString.trim() !== '' && requestedNumbers.length === 0) { alert('No valid question numbers found...'); } handleClearAll(); return; }
        currentQuestions = requestedNumbers; currentChoices = numChoices; userAnswers = {}; correctAnswers = {};
        saveUserAnswersToLocalStorage(); saveCorrectAnswersToLocalStorage(); saveConfigToLocalStorage();
        setAppState('answering'); renderOMRSheet();
    }

    function handleInputEnterKey(event) { if (event.key === 'Enter') { event.preventDefault(); handleGenerateSheet(); } }

    // *** UPDATED handleBubbleClick function ***
    function handleBubbleClick(event) {
        const clickedButton = event.target;
        if (!clickedButton || !clickedButton.classList.contains('option-btn')) return; // Ignore clicks not on bubbles

        const questionRow = clickedButton.closest('.question-row');
        if (!questionRow || !questionRow.dataset.questionNumber) return; // Ignore clicks outside rows

        // Prevent interaction with skipped rows during key entry
        if (appState === 'keyEntry' && questionRow.classList.contains('skipped-question')) {
            console.log("Skipped question - key entry ignored.");
            return;
        }

        const qNum = questionRow.dataset.questionNumber;
        const selectedValue = clickedButton.dataset.optionValue;
        const isKeyEntryBubble = clickedButton.closest('.key-entry-options');

        // Clear results if shown when any bubble is clicked
        if (localStorage.getItem(LS_RESULT_DISPLAYED_KEY) === 'true') {
            localStorage.removeItem(LS_RESULT_DISPLAYED_KEY);
            if(omrSheetDiv) omrSheetDiv.classList.remove('show-results');
            if (reportArea) reportArea.style.display = 'none';
            removeResultStyles();
            updateUIbasedOnState(); // Refresh UI after clearing results
        }

        // --- Handle Key Entry ---
        if (isKeyEntryBubble && appState === 'keyEntry') {
            if (clickedButton.classList.contains('selected')) {
                // Clicked on already selected KEY bubble: Deselect it
                clickedButton.classList.remove('selected');
                delete correctAnswers[qNum]; // Remove from data
                saveCorrectAnswersToLocalStorage();
            } else {
                // Clicked on a new/different KEY bubble: Select it
                const optionsInKeyRow = questionRow.querySelectorAll('.key-entry-options .option-btn');
                optionsInKeyRow.forEach(btn => btn.classList.remove('selected')); // Deselect others
                clickedButton.classList.add('selected');
                correctAnswers[qNum] = selectedValue; // Update data
                saveCorrectAnswersToLocalStorage();
            }
        }
        // --- Handle User Answer Entry ---
        else if (!isKeyEntryBubble && appState === 'answering') {
             if (clickedButton.classList.contains('selected')) {
                // Clicked on already selected USER bubble: Deselect it
                clickedButton.classList.remove('selected');
                delete userAnswers[qNum]; // Remove from data
                saveUserAnswersToLocalStorage();
             } else {
                // Clicked on a new/different USER bubble: Select it
                const optionsInUserRow = questionRow.querySelectorAll('.options .option-btn');
                optionsInUserRow.forEach(btn => btn.classList.remove('selected')); // Deselect others
                clickedButton.classList.add('selected');
                userAnswers[qNum] = selectedValue; // Update data
                saveUserAnswersToLocalStorage();
             }
        }
        // Clicks are ignored if state doesn't match bubble type (e.g., clicking user bubble in keyEntry mode)
    }


     function handleMainAction() { if (appState === 'answering') { setAppState('keyEntry'); } else if (appState === 'keyEntry') { checkAnswers(); } }
     function handleEditAnswers() { if (appState === 'keyEntry') { localStorage.removeItem(LS_RESULT_DISPLAYED_KEY); if(omrSheetDiv) omrSheetDiv.classList.remove('show-results'); removeSkippedStyles(); setAppState('answering'); } }

     function handleClearAll() {
         if (!window.confirm("Are you sure you want to clear the current sheet and all selections?")) { return; }
         if (omrSheetDiv) { omrSheetDiv.querySelectorAll('.option-btn.selected').forEach(btn => btn.classList.remove('selected')); }
         userAnswers = {}; correctAnswers = {}; saveUserAnswersToLocalStorage(); saveCorrectAnswersToLocalStorage();
         localStorage.removeItem(LS_RESULT_DISPLAYED_KEY); localStorage.removeItem(LS_STATE_KEY);
         removeSkippedStyles(); if(omrSheetDiv) omrSheetDiv.classList.remove('show-results', 'key-entry-active');
         appState = 'answering'; currentQuestions = [];
         if (questionInput) questionInput.value = ''; if (numChoicesSelect) numChoicesSelect.value = '4'; currentChoices = 4;
         saveConfigToLocalStorage(); renderOMRSheet();
     }

     function removeResultStyles() { if (!omrSheetDiv) return; omrSheetDiv.querySelectorAll('.question-row.correct, .question-row.incorrect').forEach(row => { row.classList.remove('correct', 'incorrect'); }); }

    function checkAnswers(showAlerts = true) {
        if (!reportArea || !omrSheetDiv) return;
        removeSkippedStyles(); let correctCount = 0; let attemptedCount = 0; let keyProvidedCount = 0; const totalQuestionsInSheet = currentQuestions.length; removeResultStyles();
        currentQuestions.forEach(qNum => { const userAns = userAnswers[qNum]; const correctAns = correctAnswers[qNum]; const row = omrSheetDiv.querySelector(`.question-row[data-question-number="${qNum}"]`); if (!row) return; if (correctAns) keyProvidedCount++; if (userAns) { attemptedCount++; if (correctAns) { if (userAns === correctAns) { correctCount++; row.classList.add('correct'); } else { row.classList.add('incorrect'); } } } });
        if (keyProvidedCount === 0 && totalQuestionsInSheet > 0) { if (showAlerts) { alert("Please enter the correct answers..."); } localStorage.removeItem(LS_RESULT_DISPLAYED_KEY); omrSheetDiv.classList.remove('show-results'); return; }
        if (totalQuestionsInSheet === 0) { reportArea.style.display = 'none'; localStorage.removeItem(LS_RESULT_DISPLAYED_KEY); omrSheetDiv.classList.remove('show-results'); return; }
        reportArea.innerHTML = `<h3>Results</h3> <p>Score: <strong>${correctCount} / ${attemptedCount}</strong> (Attempted)</p> <p>Overall Correct: <strong>${correctCount} / ${totalQuestionsInSheet}</strong></p> <p>Attempted: ${attemptedCount} / ${totalQuestionsInSheet}</p> <p>Accuracy (on attempted): ${attemptedCount > 0 ? ((correctCount / attemptedCount) * 100).toFixed(1) + '%' : 'N/A'}</p> <p>Answer Key Provided For: ${keyProvidedCount} / ${totalQuestionsInSheet} questions</p>`;
        localStorage.setItem(LS_RESULT_DISPLAYED_KEY, 'true'); omrSheetDiv.classList.add('show-results'); updateUIbasedOnState();
    }

}); // End DOMContentLoaded

// --- END OF app.js ---
