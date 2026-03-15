import './style.css';

// --- Types ---
type AppState = 'answering' | 'keyEntry';
type Theme = 'light' | 'dark';

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
const STORAGE_SESSIONS_KEY = 'omr_sessions_v6';
const STORAGE_CURRENT_CONFIG = 'omr_current_config';
const STORAGE_THEME_KEY = 'omr_theme';

// --- State ---
let appState: AppState = 'answering';
let currentChoices = 4;
let currentQuestions: number[] = [];
let userAnswers: Record<number, string> = {};
let correctAnswers: Record<number, string> = {};
let sessions: Session[] = [];
let currentTheme: Theme = 'light';

// --- DOM Elements ---
const body = document.body;
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
const themeToggle = document.getElementById('theme-toggle')!;

// --- Initialization ---
function init() {
  loadSessions();
  loadTheme();
  renderHistory();
  
  themeToggle.addEventListener('click', toggleTheme);
  generateBtn.addEventListener('click', handleGenerateSheet);
  mainActionBtn.addEventListener('click', handleMainAction);
  editAnswersBtn.addEventListener('click', handleEditAnswers);
  clearBtn.addEventListener('click', handleClearAll);
  omrSheetDiv.addEventListener('click', handleBubbleClick);
  
  // Reload last config if exists
  const lastConfig = localStorage.getItem(STORAGE_CURRENT_CONFIG);
  if (lastConfig) {
    try {
        const { range, choices } = JSON.parse(lastConfig);
        questionInput.value = range || '';
        numChoicesSelect.value = (choices || 4).toString();
    } catch (e) {
        console.error("Config load failed", e);
    }
  }
}

// --- Theme Logic ---
function loadTheme() {
    const savedTheme = localStorage.getItem(STORAGE_THEME_KEY) as Theme;
    if (savedTheme) {
        setTheme(savedTheme);
    } else if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
        setTheme('dark');
    }
}

function setTheme(theme: Theme) {
    currentTheme = theme;
    body.setAttribute('data-theme', theme);
    localStorage.setItem(STORAGE_THEME_KEY, theme);
    // Update meta theme color
    const metaThemeColor = document.querySelector('meta[name="theme-color"]');
    if (metaThemeColor) {
        metaThemeColor.setAttribute('content', theme === 'dark' ? '#1e293b' : '#4f46e5');
    }
}

function toggleTheme() {
    setTheme(currentTheme === 'light' ? 'dark' : 'light');
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
        // Cap at 200 for performance
        const count = end - start;
        if (count > 200) {
            alert("Range too large. Max 200 questions allowed.");
            return;
        }
        for (let i = start; i <= end; i++) numbers.add(i);
      }
    } else {
      const num = parseInt(trimmed);
      if (!isNaN(num)) numbers.add(num);
    }
  });
  
  return Array.from(numbers).sort((a, b) => a - b).slice(0, 500); // Safety limit
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
  
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function renderOMRSheet() {
  omrSheetDiv.innerHTML = '';
  
  currentQuestions.forEach((qNum, index) => {
    const row = document.createElement('div');
    row.className = 'question-row';
    row.dataset.questionNumber = qNum.toString();
    row.style.animationDelay = `${index * 0.05}s`;
    
    const numLabel = document.createElement('span');
    numLabel.className = 'question-number';
    numLabel.textContent = `${qNum}`;
    
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
    const isAlreadySelected = btn.classList.contains('selected');
    parent.querySelectorAll('.option-btn').forEach(b => b.classList.remove('selected'));
    
    if (isAlreadySelected) {
      delete userAnswers[qNum];
    } else {
      userAnswers[qNum] = val;
      btn.classList.add('selected');
    }
    // Haptic feedback if available
    if (window.navigator.vibrate) window.navigator.vibrate(10);
  } else if (type === 'key' && appState === 'keyEntry') {
    const parent = btn.parentElement!;
    const isAlreadySelected = btn.classList.contains('selected');
    parent.querySelectorAll('.option-btn').forEach(b => b.classList.remove('selected'));
    
    if (isAlreadySelected) {
      delete correctAnswers[qNum];
    } else {
      correctAnswers[qNum] = val;
      btn.classList.add('selected');
    }
    if (window.navigator.vibrate) window.navigator.vibrate(10);
  }
}

function handleMainAction() {
  if (appState === 'answering') {
    appState = 'keyEntry';
    updateUI();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  } else {
    calculateResults();
  }
}

function handleEditAnswers() {
  appState = 'answering';
  updateUI();
  window.scrollTo({ top: 0, behavior: 'smooth' });
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
    <div class="card" style="text-align: center; border-left: 4px solid var(--primary);">
        <h3 style="margin-bottom: 1rem;">Results</h3>
        <div style="font-size: 2rem; font-weight: 800; color: var(--primary); margin-bottom: 0.5rem;">
            ${correct} / ${attempted}
        </div>
        <p style="color: var(--text-light); margin-bottom: 1.5rem;">
            Accuracy: ${attempted > 0 ? Math.round((correct / attempted) * 100) : 0}%
        </p>
        <button id="save-session-btn" class="btn-primary" style="width: 100%;">Save Result</button>
    </div>
  `;
  reportArea.style.display = 'block';
  document.getElementById('save-session-btn')!.onclick = saveCurrentSession;
  
  // Scroll to results
  reportArea.scrollIntoView({ behavior: 'smooth' });
}

function updateUI() {
  const hasQuestions = currentQuestions.length > 0;
  controlsSection.style.display = hasQuestions ? 'none' : 'block';
  omrSheetContainer.style.display = hasQuestions ? 'block' : 'none';
  
  const userOpts = document.querySelectorAll('.options');
  const keyOpts = document.querySelectorAll('.key-entry-options');
  
  userOpts.forEach(el => (el as HTMLElement).style.display = appState === 'answering' ? 'flex' : 'none');
  keyOpts.forEach(el => (el as HTMLElement).style.display = appState === 'keyEntry' ? 'flex' : 'none');
  
  mainActionBtn.style.display = 'inline-block';
  mainActionBtn.textContent = appState === 'answering' ? 'Lock & Key' : 'Check';
  editAnswersBtn.style.display = appState === 'keyEntry' ? 'inline-block' : 'none';
  clearBtn.style.display = 'inline-block';
}

function handleClearAll() {
  if (confirm('Delete this sheet?')) {
    currentQuestions = [];
    userAnswers = {};
    correctAnswers = {};
    appState = 'answering';
    reportArea.style.display = 'none';
    sessionNameInput.value = '';
    updateUI();
  }
}

// --- Persistence ---
function saveCurrentSession() {
  const name = sessionNameInput.value.trim() || `Session ${new Date().toLocaleDateString()}`;
  const newSession: Session = {
    id: (typeof crypto !== 'undefined' && crypto.randomUUID) ? crypto.randomUUID() : Math.random().toString(16).substring(2),
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
  localStorage.setItem(STORAGE_SESSIONS_KEY, JSON.stringify(sessions.slice(0, 50))); // Keep last 50
  renderHistory();
  alert('Saved to history!');
}

function loadSessions() {
  const data = localStorage.getItem(STORAGE_SESSIONS_KEY);
  if (data) {
    try {
        sessions = JSON.parse(data);
    } catch(e) {
        sessions = [];
    }
  }
}

function renderHistory() {
  if (sessions.length === 0) {
    historyList.innerHTML = '<p class="empty-history" style="grid-column: 1/-1; text-align: center; padding: 2rem;">No saved sessions yet.</p>';
    return;
  }
  
  historyList.innerHTML = sessions.map(s => `
    <div class="history-item">
      <div>
        <h4>${s.name}</h4>
        <p>${new Date(s.timestamp).toLocaleDateString()}</p>
      </div>
      <button class="btn-secondary" style="padding: 0.5rem 1rem; width: 100%; border-radius: 8px;" onclick="window.loadSession('${s.id}')">View result</button>
    </div>
  `).join('');
}

// Global exposure for history clicks
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
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }
};

init();

// --- PWA Service Worker Registration ---
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('sw.js')
      .then(reg => console.log('SW Registered', reg))
      .catch(err => console.error('SW Registration failed', err));
  });
}
