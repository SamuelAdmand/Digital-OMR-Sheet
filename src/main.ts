import './style.css';

// --- Types ---
type AppState = 'answering' | 'keyEntry';

interface Session {
  id: string;
  name: string;
  timestamp: number;
  config: {
    questionRange: string;
    numChoices: number;
  };
  userAnswers: Record<number, string>;
  correctAnswers: Record<number, string>;
}

// --- Constants ---
const STORAGE_SESSIONS_KEY = 'omr_sessions_v5';
const STORAGE_CURRENT_CONFIG = 'omr_current_config';

// --- State ---
let appState: AppState = 'answering';
let currentChoices = 4;
let currentQuestions: number[] = [];
let userAnswers: Record<number, string> = {};
let correctAnswers: Record<number, string> = {};
let sessions: Session[] = [];

// --- DOM Elements ---
const controlsSection = document.getElementById('controls')!;
const omrSheetContainer = document.getElementById('omr-sheet-container')!;
const omrSheetDiv = document.getElementById('omr-sheet')!;
const questionInput = document.getElementById('question-numbers') as HTMLInputElement;
const numChoicesSelect = document.getElementById('num-choices') as HTMLSelectElement;
const generateBtn = document.getElementById('generate-btn')!;
const mainActionBtn = document.getElementById('main-action-btn')!;
const editAnswersBtn = document.getElementById('edit-answers-btn')!;
const clearBtn = document.getElementById('clear-btn')!;
const reportArea = document.getElementById('report-area')!;
const historyList = document.getElementById('history-list')!;
const sessionNameInput = document.getElementById('session-name') as HTMLInputElement;

// --- Initialization ---
function init() {
  loadSessions();
  renderHistory();
  
  generateBtn.addEventListener('click', handleGenerateSheet);
  mainActionBtn.addEventListener('click', handleMainAction);
  editAnswersBtn.addEventListener('click', handleEditAnswers);
  clearBtn.addEventListener('click', handleClearAll);
  omrSheetDiv.addEventListener('click', handleBubbleClick);
  
  // Reload last config if exists
  const lastConfig = localStorage.getItem(STORAGE_CURRENT_CONFIG);
  if (lastConfig) {
    const { range, choices } = JSON.parse(lastConfig);
    questionInput.value = range;
    numChoicesSelect.value = choices.toString();
  }
}

// --- Core Logic ---
function parseQuestionNumbers(input: string): number[] {
  const numbers = new Set<number>();
  const parts = input.split(',');
  
  parts.forEach(part => {
    const trimmed = part.trim();
    if (!trimmed) return;
    
    if (trimmed.includes('-')) {
      const [startStr, endStr] = trimmed.split('-');
      const start = parseInt(startStr);
      const end = parseInt(endStr);
      if (!isNaN(start) && !isNaN(end) && start <= end) {
        for (let i = start; i <= end; i++) numbers.add(i);
      }
    } else {
      const num = parseInt(trimmed);
      if (!isNaN(num)) numbers.add(num);
    }
  });
  
  return Array.from(numbers).sort((a, b) => a - b);
}

function handleGenerateSheet() {
  const range = questionInput.value;
  const choices = parseInt(numChoicesSelect.value);
  const questions = parseQuestionNumbers(range);
  
  if (questions.length === 0) {
    alert('Please enter valid question numbers.');
    return;
  }
  
  currentQuestions = questions;
  currentChoices = choices;
  userAnswers = {};
  correctAnswers = {};
  appState = 'answering';
  
  localStorage.setItem(STORAGE_CURRENT_CONFIG, JSON.stringify({ range, choices }));
  
  renderOMRSheet();
  updateUI();
}

function renderOMRSheet() {
  omrSheetDiv.innerHTML = '';
  
  currentQuestions.forEach(qNum => {
    const row = document.createElement('div');
    row.className = 'question-row';
    row.dataset.questionNumber = qNum.toString();
    
    const numLabel = document.createElement('span');
    numLabel.className = 'question-number';
    numLabel.textContent = `${qNum}.`;
    
    const optionsDiv = document.createElement('div');
    optionsDiv.className = 'options';
    
    const keyOptionsDiv = document.createElement('div');
    keyOptionsDiv.className = 'key-entry-options';
    keyOptionsDiv.style.display = 'none';
    
    for (let i = 0; i < currentChoices; i++) {
      const label = String.fromCharCode(65 + i);
      
      const userBtn = createOptionBtn(label, 'user', qNum);
      optionsDiv.appendChild(userBtn);
      
      const keyBtn = createOptionBtn(label, 'key', qNum);
      keyOptionsDiv.appendChild(keyBtn);
    }
    
    row.appendChild(numLabel);
    row.appendChild(optionsDiv);
    row.appendChild(keyOptionsDiv);
    omrSheetDiv.appendChild(row);
  });
}

function createOptionBtn(label: string, type: 'user' | 'key', qNum: number): HTMLButtonElement {
  const btn = document.createElement('button');
  btn.className = 'option-btn';
  btn.textContent = label;
  btn.dataset.value = label;
  btn.dataset.type = type;
  
  if (type === 'user' && userAnswers[qNum] === label) btn.classList.add('selected');
  if (type === 'key' && correctAnswers[qNum] === label) btn.classList.add('selected');
  
  return btn;
}

function handleBubbleClick(e: MouseEvent) {
  const btn = (e.target as HTMLElement).closest('.option-btn') as HTMLButtonElement;
  if (!btn) return;
  
  const row = btn.closest('.question-row') as HTMLElement;
  const qNum = parseInt(row.dataset.questionNumber!);
  const val = btn.dataset.value!;
  const type = btn.dataset.type as 'user' | 'key';
  
  if (type === 'user' && appState === 'answering') {
    const parent = btn.parentElement!;
    parent.querySelectorAll('.option-btn').forEach(b => b.classList.remove('selected'));
    
    if (userAnswers[qNum] === val) {
      delete userAnswers[qNum];
    } else {
      userAnswers[qNum] = val;
      btn.classList.add('selected');
    }
  } else if (type === 'key' && appState === 'keyEntry') {
    const parent = btn.parentElement!;
    parent.querySelectorAll('.option-btn').forEach(b => b.classList.remove('selected'));
    
    if (correctAnswers[qNum] === val) {
      delete correctAnswers[qNum];
    } else {
      correctAnswers[qNum] = val;
      btn.classList.add('selected');
    }
  }
}

function handleMainAction() {
  if (appState === 'answering') {
    appState = 'keyEntry';
    updateUI();
  } else {
    calculateResults();
  }
}

function handleEditAnswers() {
  appState = 'answering';
  updateUI();
}

function calculateResults() {
  let correct = 0;
  let attempted = Object.keys(userAnswers).length;
  
  currentQuestions.forEach(qNum => {
    if (userAnswers[qNum] && userAnswers[qNum] === correctAnswers[qNum]) {
      correct++;
    }
  });
  
  reportArea.innerHTML = `
    <h3>Results</h3>
    <div class="result-stats">
      <p>Score: <strong>${correct} / ${attempted}</strong></p>
      <p>Accuracy: <strong>${attempted > 0 ? Math.round((correct / attempted) * 100) : 0}%</strong></p>
    </div>
    <button id="save-session-btn" class="btn-primary" style="margin-top: 1rem;">Save Session</button>
  `;
  reportArea.style.display = 'block';
  document.getElementById('save-session-btn')!.onclick = saveCurrentSession;
}

function updateUI() {
  controlsSection.style.display = currentQuestions.length > 0 ? 'none' : 'block';
  omrSheetContainer.style.display = currentQuestions.length > 0 ? 'block' : 'none';
  
  const userOpts = document.querySelectorAll('.options');
  const keyOpts = document.querySelectorAll('.key-entry-options');
  
  userOpts.forEach(el => (el as HTMLElement).style.display = appState === 'answering' ? 'flex' : 'none');
  keyOpts.forEach(el => (el as HTMLElement).style.display = appState === 'keyEntry' ? 'flex' : 'none');
  
  mainActionBtn.style.display = 'inline-block';
  mainActionBtn.textContent = appState === 'answering' ? 'Submit & Enter Key' : 'Show Results';
  editAnswersBtn.style.display = appState === 'keyEntry' ? 'inline-block' : 'none';
  clearBtn.style.display = 'inline-block';
}

function handleClearAll() {
  if (confirm('Clear everything?')) {
    currentQuestions = [];
    userAnswers = {};
    correctAnswers = {};
    appState = 'answering';
    reportArea.style.display = 'none';
    updateUI();
  }
}

// --- Persistence ---
function saveCurrentSession() {
  const name = sessionNameInput.value.trim() || `Session ${new Date().toLocaleString()}`;
  const newSession: Session = {
    id: crypto.randomUUID(),
    name,
    timestamp: Date.now(),
    config: {
      questionRange: questionInput.value,
      numChoices: currentChoices
    },
    userAnswers: { ...userAnswers },
    correctAnswers: { ...correctAnswers }
  };
  
  sessions.unshift(newSession);
  localStorage.setItem(STORAGE_SESSIONS_KEY, JSON.stringify(sessions));
  renderHistory();
  alert('Session saved!');
}

function loadSessions() {
  const data = localStorage.getItem(STORAGE_SESSIONS_KEY);
  if (data) sessions = JSON.parse(data);
}

function renderHistory() {
  if (sessions.length === 0) {
    historyList.innerHTML = '<p class="empty-history">No saved sessions yet.</p>';
    return;
  }
  
  historyList.innerHTML = sessions.map(s => `
    <div class="history-item">
      <h4>${s.name}</h4>
      <p>${new Date(s.timestamp).toLocaleDateString()}</p>
      <button class="btn-secondary btn-sm" onclick="window.loadSession('${s.id}')">View</button>
    </div>
  `).join('');
}

// Global exposure for history clicks (simplest for now)
(window as any).loadSession = (id: string) => {
  const session = sessions.find(s => s.id === id);
  if (session) {
    currentQuestions = parseQuestionNumbers(session.config.questionRange);
    currentChoices = session.config.numChoices;
    userAnswers = session.userAnswers;
    correctAnswers = session.correctAnswers;
    appState = 'keyEntry';
    renderOMRSheet();
    updateUI();
    calculateResults();
  }
};

init();

// --- PWA Service Worker Registration ---
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js')
      .then(reg => console.log('SW Registered', reg))
      .catch(err => console.error('SW Registration failed', err));
  });
}
