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
    const LS_CONFIG_KEY = 'omrConfigV2';
    const LS_ANSWERS_KEY = 'omrUserAnswersV2';
    const LS_KEY_KEY = 'omrCorrectAnswersV2';
    const LS_STATE_KEY = 'omrAppStateV2';
    const LS_RESULT_DISPLAYED_KEY = 'omrResultDisplayedV2';

    // --- Initialization ---
    loadStateFromLocalStorage();
    renderOMRSheet();
    checkAndDisplaySavedResults();
    if (omrSheetContainer) omrSheetContainer.style.display = currentQuestions.length > 0 ? 'block' : 'none';
    if (controlsSection) controlsSection.style.display = currentQuestions.length > 0 ? 'none' : 'block';

    // --- Event Listeners ---
    if (generateBtn) generateBtn.addEventListener('click', handleGenerateSheet);
    if (clearBtn) clearBtn.addEventListener('click', handleClearAll);
    if (mainActionBtn) mainActionBtn.addEventListener('click', handleMainAction);
    if (editAnswersBtn) editAnswersBtn.addEventListener('click', handleEditAnswers);
    if (omrSheetDiv) omrSheetDiv.addEventListener('click', handleBubbleClick);
    if (questionInput) questionInput.addEventListener('change', saveConfigToLocalStorage);
    if (numChoicesSelect) numChoicesSelect.addEventListener('change', saveConfigToLocalStorage);

    // --- Functions ---
    function setAppState(newState) {
        appState = newState;
        localStorage.setItem(LS_STATE_KEY, appState);
        if (appState !== 'keyEntry') {
            localStorage.removeItem(LS_RESULT_DISPLAYED_KEY);
            if(omrSheetDiv) omrSheetDiv.classList.remove('show-results');
        }
        updateUIbasedOnState();
    }

    function updateUIbasedOnState() {
        const requiredElements = [omrSheetDiv, reportArea, mainActionBtn, editAnswersBtn, clearBtn, controlsSection, omrSheetContainer, userAnswersHeading, correctKeyHeading];
        if (requiredElements.some(el => !el)) { console.error("State Update Aborted: Core UI elements missing!"); return; }
        const hasQuestions = currentQuestions.length > 0;
        const resultsActive = localStorage.getItem(LS_RESULT_DISPLAYED_KEY) === 'true' && appState === 'keyEntry';
        controlsSection.style.display = hasQuestions ? 'none' : 'block';
        omrSheetContainer.style.display = hasQuestions ? 'block' : 'none';
        omrSheetDiv.classList.toggle('key-entry-active', appState === 'keyEntry');
        omrSheetDiv.classList.toggle('show-results', resultsActive);
        reportArea.style.display = resultsActive ? 'block' : 'none';
        if (!resultsActive) removeResultStyles();
        userAnswersHeading.style.display = 'none'; correctKeyHeading.style.display = 'none';
        if (hasQuestions) { if (resultsActive) { userAnswersHeading.style.display = 'block'; correctKeyHeading.style.display = 'block'; } else if (appState === 'answering') { userAnswersHeading.style.display = 'block'; } else if (appState === 'keyEntry') { correctKeyHeading.style.display = 'block'; } }
        if (appState === 'answering') { mainActionBtn.textContent = 'Submit Answers & Enter Key'; mainActionBtn.style.display = hasQuestions ? 'inline-block' : 'none'; editAnswersBtn.style.display = 'none'; clearBtn.style.display = hasQuestions ? 'inline-block' : 'none'; } else if (appState === 'keyEntry') { mainActionBtn.textContent = 'Check Answers'; mainActionBtn.style.display = hasQuestions ? 'inline-block' : 'none'; editAnswersBtn.style.display = hasQuestions ? 'inline-block' : 'none'; clearBtn.style.display = hasQuestions ? 'inline-block' : 'none'; }
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
        if (shouldShowResults === 'true' && appState === 'keyEntry' && currentQuestions.length > 0) { console.log("Restoring previous results display."); checkAnswers(false); } else { if(omrSheetDiv) omrSheetDiv.classList.remove('show-results'); }
        updateUIbasedOnState();
    }

    function saveConfigToLocalStorage() { if (!questionInput || !numChoicesSelect) return; const config = { questions: questionInput.value, choices: numChoicesSelect.value }; localStorage.setItem(LS_CONFIG_KEY, JSON.stringify(config)); }
    function saveUserAnswersToLocalStorage() { localStorage.setItem(LS_ANSWERS_KEY, JSON.stringify(userAnswers)); }
    function saveCorrectAnswersToLocalStorage() { localStorage.setItem(LS_KEY_KEY, JSON.stringify(correctAnswers)); }
    function parseQuestionNumbers(inputString) { if (!inputString) return []; const numbers = new Set(); const parts = inputString.split(','); for (const part of parts) { const trimmedPart = part.trim(); if (!trimmedPart) continue; if (trimmedPart.includes('-')) { const range = trimmedPart.split('-'); if (range.length === 2) { const start = parseInt(range[0].trim(), 10); const end = parseInt(range[1].trim(), 10); if (!isNaN(start) && !isNaN(end) && start <= end) { for (let i = start; i <= end; i++) numbers.add(i); } else { console.warn(`Invalid range format: "${trimmedPart}"`); } } else { console.warn(`Invalid range format: "${trimmedPart}"`); } } else { const num = parseInt(trimmedPart, 10); if (!isNaN(num)) numbers.add(num); else { console.warn(`Invalid number format: "${trimmedPart}"`); } } } return Array.from(numbers).sort((a, b) => a - b); }

    function renderOMRSheet() {
        if (!omrSheetDiv || !omrSheetContainer) return;
        omrSheetDiv.innerHTML = ''; omrSheetDiv.classList.remove('show-results', 'key-entry-active');
        if (currentQuestions.length === 0) { omrSheetDiv.appendChild(placeholderText); omrSheetContainer.style.display = 'none'; if (controlsSection) controlsSection.style.display = 'block'; updateUIbasedOnState(); return; }
        omrSheetContainer.style.display = 'block'; if (controlsSection) controlsSection.style.display = 'none';
        const choiceLabels = Array.from({ length: currentChoices }, (_, i) => String.fromCharCode(65 + i));
        currentQuestions.forEach(qNum => { const row = document.createElement('div'); row.classList.add('question-row'); row.dataset.questionNumber = qNum; const numberLabel = document.createElement('span'); numberLabel.classList.add('question-number'); numberLabel.textContent = `${qNum}.`; const optionsDiv = document.createElement('div'); optionsDiv.classList.add('options'); choiceLabels.forEach(label => { const optionBtn = document.createElement('button'); optionBtn.classList.add('option-btn'); optionBtn.dataset.optionValue = label; optionBtn.textContent = label; if (userAnswers[qNum] === label) optionBtn.classList.add('selected'); optionsDiv.appendChild(optionBtn); }); const keyEntryOptionsDiv = document.createElement('div'); keyEntryOptionsDiv.classList.add('key-entry-options'); choiceLabels.forEach(label => { const keyBtn = document.createElement('button'); keyBtn.classList.add('option-btn'); keyBtn.dataset.optionValue = label; keyBtn.textContent = label; if (correctAnswers[qNum] === label) keyBtn.classList.add('selected'); keyEntryOptionsDiv.appendChild(keyBtn); }); row.appendChild(numberLabel); row.appendChild(optionsDiv); row.appendChild(keyEntryOptionsDiv); omrSheetDiv.appendChild(row); });
        updateUIbasedOnState();
    }

    function handleGenerateSheet() {
        if (!questionInput || !numChoicesSelect || !omrSheetContainer) return;
        localStorage.removeItem(LS_RESULT_DISPLAYED_KEY); if(omrSheetDiv) omrSheetDiv.classList.remove('show-results');
        const inputString = questionInput.value; const numChoices = parseInt(numChoicesSelect.value, 10); const parsedNumbers = parseQuestionNumbers(inputString);
        if (inputString.trim() === '' || (parsedNumbers.length === 0 && inputString.trim() !== '')) { if (inputString.trim() !== '' && parsedNumbers.length === 0) { alert('No valid question numbers found...'); } currentQuestions = []; currentChoices = 4; if(numChoicesSelect) numChoicesSelect.value = '4'; if(questionInput) questionInput.value = ''; handleClearAll(); return; }
        currentQuestions = parsedNumbers; currentChoices = numChoices; userAnswers = {}; correctAnswers = {};
        saveUserAnswersToLocalStorage(); saveCorrectAnswersToLocalStorage(); saveConfigToLocalStorage();
        setAppState('answering'); renderOMRSheet();
    }

    function handleBubbleClick(event) {
        const clickedButton = event.target; if (!clickedButton || !clickedButton.classList.contains('option-btn')) return;
        const questionRow = clickedButton.closest('.question-row'); if (!questionRow || !questionRow.dataset.questionNumber) return;
        const qNum = questionRow.dataset.questionNumber; const selectedValue = clickedButton.dataset.optionValue; const isKeyEntryBubble = clickedButton.closest('.key-entry-options');
        if (localStorage.getItem(LS_RESULT_DISPLAYED_KEY) === 'true') { localStorage.removeItem(LS_RESULT_DISPLAYED_KEY); if(omrSheetDiv) omrSheetDiv.classList.remove('show-results'); if (reportArea) reportArea.style.display = 'none'; removeResultStyles(); updateUIbasedOnState(); }
        if (isKeyEntryBubble && appState === 'keyEntry') { if (correctAnswers[qNum] !== selectedValue) { const optionsInKeyRow = questionRow.querySelectorAll('.key-entry-options .option-btn'); optionsInKeyRow.forEach(btn => btn.classList.remove('selected')); clickedButton.classList.add('selected'); correctAnswers[qNum] = selectedValue; saveCorrectAnswersToLocalStorage(); } } else if (!isKeyEntryBubble && appState === 'answering') { if (userAnswers[qNum] !== selectedValue) { const optionsInUserRow = questionRow.querySelectorAll('.options .option-btn'); optionsInUserRow.forEach(btn => btn.classList.remove('selected')); clickedButton.classList.add('selected'); userAnswers[qNum] = selectedValue; saveUserAnswersToLocalStorage(); } }
    }

     function handleMainAction() { if (appState === 'answering') { setAppState('keyEntry'); } else if (appState === 'keyEntry') { checkAnswers(); } }
     function handleEditAnswers() { if (appState === 'keyEntry') { localStorage.removeItem(LS_RESULT_DISPLAYED_KEY); if(omrSheetDiv) omrSheetDiv.classList.remove('show-results'); setAppState('answering'); } }
     function handleClearAll() { if (omrSheetDiv) { omrSheetDiv.querySelectorAll('.option-btn.selected').forEach(btn => btn.classList.remove('selected')); } userAnswers = {}; correctAnswers = {}; saveUserAnswersToLocalStorage(); saveCorrectAnswersToLocalStorage(); localStorage.removeItem(LS_RESULT_DISPLAYED_KEY); localStorage.removeItem(LS_STATE_KEY); if(omrSheetDiv) omrSheetDiv.classList.remove('show-results', 'key-entry-active'); appState = 'answering'; currentQuestions = []; renderOMRSheet(); if (controlsSection) controlsSection.style.display = 'block'; if (omrSheetContainer) omrSheetContainer.style.display = 'none'; if (questionInput) questionInput.value = ''; if (numChoicesSelect) numChoicesSelect.value = '4'; saveConfigToLocalStorage(); }
     function removeResultStyles() { if (!omrSheetDiv) return; omrSheetDiv.querySelectorAll('.question-row.correct, .question-row.incorrect').forEach(row => { row.classList.remove('correct', 'incorrect'); }); }

    function checkAnswers(showAlerts = true) {
        if (!reportArea || !omrSheetDiv) return; let correctCount = 0; let attemptedCount = 0; let keyProvidedCount = 0; const totalQuestionsInSheet = currentQuestions.length; removeResultStyles();
        currentQuestions.forEach(qNum => { const userAns = userAnswers[qNum]; const correctAns = correctAnswers[qNum]; const row = omrSheetDiv.querySelector(`.question-row[data-question-number="${qNum}"]`); if (!row) return; if (correctAns) keyProvidedCount++; if (userAns) { attemptedCount++; if (correctAns) { if (userAns === correctAns) { correctCount++; row.classList.add('correct'); } else { row.classList.add('incorrect'); } } } });
        if (keyProvidedCount === 0 && totalQuestionsInSheet > 0) { if (showAlerts) { alert("Please enter the correct answers..."); } localStorage.removeItem(LS_RESULT_DISPLAYED_KEY); omrSheetDiv.classList.remove('show-results'); return; }
        if (totalQuestionsInSheet === 0) { reportArea.style.display = 'none'; localStorage.removeItem(LS_RESULT_DISPLAYED_KEY); omrSheetDiv.classList.remove('show-results'); return; }
        reportArea.innerHTML = `<h3>Results</h3> <p>Score: <strong>${correctCount} / ${attemptedCount}</strong> (Attempted)</p> <p>Overall Correct: <strong>${correctCount} / ${totalQuestionsInSheet}</strong></p> <p>Attempted: ${attemptedCount} / ${totalQuestionsInSheet}</p> <p>Accuracy (on attempted): ${attemptedCount > 0 ? ((correctCount / attemptedCount) * 100).toFixed(1) + '%' : 'N/A'}</p> <p>Answer Key Provided For: ${keyProvidedCount} / ${totalQuestionsInSheet} questions</p>`;
        localStorage.setItem(LS_RESULT_DISPLAYED_KEY, 'true'); omrSheetDiv.classList.add('show-results'); updateUIbasedOnState();
    }

}); // End DOMContentLoaded

// --- END OF app.js ---
