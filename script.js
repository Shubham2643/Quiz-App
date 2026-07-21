// ==========================================================================
// 🎵 WEB AUDIO SYNTHESIZER ENGINE (SFX)
// ==========================================================================

class SoundEngine {
    constructor() {
        this.ctx = null;
        this.isMuted = localStorage.getItem('quiz_muted') === 'true';
    }

    init() {
        if (!this.ctx) {
            this.ctx = new (window.AudioContext || window.webkitAudioContext)();
        }
        if (this.ctx.state === 'suspended') {
            this.ctx.resume();
        }
    }

    toggleMute() {
        this.isMuted = !this.isMuted;
        localStorage.setItem('quiz_muted', this.isMuted);
        return this.isMuted;
    }

    playClick() {
        if (this.isMuted) return;
        this.init();
        try {
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            osc.connect(gain);
            gain.connect(this.ctx.destination);

            osc.type = 'sine';
            osc.frequency.setValueAtTime(523.25, this.ctx.currentTime);
            osc.frequency.exponentialRampToValueAtTime(659.25, this.ctx.currentTime + 0.05);

            gain.gain.setValueAtTime(0.06, this.ctx.currentTime);
            gain.gain.linearRampToValueAtTime(0.001, this.ctx.currentTime + 0.05);

            osc.start();
            osc.stop(this.ctx.currentTime + 0.05);
        } catch (e) {
            console.warn('Audio Context failed to play sound:', e);
        }
    }

    playCorrect() {
        if (this.isMuted) return;
        this.init();
        try {
            const now = this.ctx.currentTime;
            this.playTone(523.25, 0.08, now); // C5
            this.playTone(659.25, 0.08, now + 0.06); // E5
            this.playTone(783.99, 0.15, now + 0.12); // G5
        } catch (e) {
            console.warn('Audio Context failed to play sound:', e);
        }
    }

    playIncorrect() {
        if (this.isMuted) return;
        this.init();
        try {
            const now = this.ctx.currentTime;
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            osc.connect(gain);
            gain.connect(this.ctx.destination);

            osc.type = 'sine';
            osc.frequency.setValueAtTime(180, now);
            osc.frequency.linearRampToValueAtTime(120, now + 0.22);

            gain.gain.setValueAtTime(0.08, now);
            gain.gain.linearRampToValueAtTime(0.001, now + 0.22);

            osc.start();
            osc.stop(now + 0.22);
        } catch (e) {
            console.warn('Audio Context failed to play sound:', e);
        }
    }

    playFanfare() {
        if (this.isMuted) return;
        this.init();
        try {
            const now = this.ctx.currentTime;
            this.playTone(523.25, 0.10, now); // C5
            this.playTone(659.25, 0.10, now + 0.10); // E5
            this.playTone(783.99, 0.10, now + 0.20); // G5
            this.playTone(1046.50, 0.25, now + 0.30); // C6
        } catch (e) {
            console.warn('Audio Context failed to play sound:', e);
        }
    }

    playTone(freq, duration, time) {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.connect(gain);
        gain.connect(this.ctx.destination);

        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, time);

        gain.gain.setValueAtTime(0.08, time);
        gain.gain.exponentialRampToValueAtTime(0.001, time + duration);

        osc.start(time);
        osc.stop(time + duration);
    }
}

// ==========================================================================
// ⚙️ INITIAL STATE & ELEMENT BINDINGS
// ==========================================================================

const setupContainer = document.getElementById('setup-container');
const loadingElement = document.getElementById('loading');
const errorElement = document.getElementById('error-message');
const questionContainer = document.getElementById('question-container');
const resultsContainer = document.getElementById('results-container');
const questionText = document.getElementById('question-text');
const optionsContainer = document.getElementById('options-container');
const categoryTag = document.getElementById('category-tag');
const difficultyTag = document.getElementById('difficulty-tag');
const typeTag = document.getElementById('type-tag');

const prevBtn = document.getElementById('prev-btn');
const nextBtn = document.getElementById('next-btn');
const submitBtn = document.getElementById('submit-btn');
const startBtn = document.getElementById('start-btn');
const retryBtn = document.getElementById('retry-btn');
const restartBtn = document.getElementById('restart-btn');
const clearScoresBtn = document.getElementById('clear-scores-btn');
const shareBtn = document.getElementById('share-btn');

const progressText = document.getElementById('progress-text');
const progressFill = document.getElementById('progress-fill');
const timerElement = document.getElementById('timer');
const scorePercent = document.getElementById('score-percent');
const correctAnswers = document.getElementById('correct-answers');
const timeTaken = document.getElementById('time-taken');
const resultsDetails = document.getElementById('results-details');
const categoryOptions = document.getElementById('category-options');
const categorySearch = document.getElementById('category-search');

const audioToggle = document.getElementById('audio-toggle');
const themeToggle = document.getElementById('theme-toggle');

const mobileSidebarToggle = document.getElementById('mobile-sidebar-toggle');
const headerSidebarToggle = document.getElementById('header-sidebar-toggle');
const closeSidebarBtn = document.getElementById('close-sidebar-btn');
const sidebarPane = document.getElementById('sidebar-pane');
const sidebarOverlay = document.getElementById('sidebar-overlay');

const countSlider = document.getElementById('question-count-slider');
const countValue = document.getElementById('count-value');
const customTimerWrapper = document.getElementById('custom-timer-wrapper');
const timeLimitInput = document.getElementById('time-limit-input');
const timerDec = document.getElementById('timer-dec');
const timerInc = document.getElementById('timer-inc');

// Initialize Sound Engine
const soundEngine = new SoundEngine();

// Quiz Core State
let currentQuestion = 0;
let userAnswers = [];
let quizQuestions = [];
let startTime;
let overallTimerInterval;
let overallElapsedTime = 0;

let questionTimerInterval;
let questionTimeRemaining = 0;
let questionTimeLimit = 0;
let questionStartTime = null;
let questionTimeSpentArray = [];

let apiCategories = [];
let sessionToken = localStorage.getItem('quiz_session_token') || null;
let isDarkTheme = localStorage.getItem('quiz_theme') !== 'light';

let quizSettings = {
    category: 0, // Default: Any category
    difficulty: 'any',
    type: 'any',
    questionCount: 10,
    quizMode: 'zen'
};

// ==========================================================================
// 🚀 APPLICATION LIFECYCLE
// ==========================================================================

async function initApp() {
    updateThemeUI();
    updateAudioUI();
    
    // Sync Profile Metrics and Badges
    updateProfileStatsDisplay();
    updateBadgesDisplay();

    // Load High Scores Leaderboard
    renderLeaderboard();

    // Fetch Categories
    await fetchCategories();
    
    // Wire UI settings controls
    setupOptionListeners();

    // Bind Core Control Buttons
    startBtn.addEventListener('click', startQuiz);
    retryBtn.addEventListener('click', startQuiz);
    prevBtn.addEventListener('click', prevQuestion);
    nextBtn.addEventListener('click', nextQuestion);
    submitBtn.addEventListener('click', submitQuiz);
    restartBtn.addEventListener('click', restartQuiz);
    clearScoresBtn.addEventListener('click', clearLeaderboard);
    
    // Bind Sidebar Drawer controls
    mobileSidebarToggle.addEventListener('click', openSidebarDrawer);
    if (headerSidebarToggle) {
        headerSidebarToggle.addEventListener('click', openSidebarDrawer);
    }
    closeSidebarBtn.addEventListener('click', closeSidebarDrawer);
    if (sidebarOverlay) {
        sidebarOverlay.addEventListener('click', closeSidebarDrawer);
    }

    // Bind Toolbar Toggles
    themeToggle.addEventListener('click', toggleTheme);
    audioToggle.addEventListener('click', toggleMute);

    // Bind slider & stepper settings
    countSlider.addEventListener('input', syncCountSlider);
    timerDec.addEventListener('click', decrementTimerLimit);
    timerInc.addEventListener('click', incrementTimerLimit);

    // Initial session token pull
    getSessionToken();
}

// ==========================================================================
// 🌓 THEME & SFX CONTROL SETTERS
// ==========================================================================

function updateThemeUI() {
    if (isDarkTheme) {
        document.body.classList.remove('light-theme');
        document.body.classList.add('dark-theme');
        themeToggle.innerHTML = '<i class="fas fa-sun"></i>';
        themeToggle.setAttribute('aria-label', 'Toggle Light Mode');
    } else {
        document.body.classList.remove('dark-theme');
        document.body.classList.add('light-theme');
        themeToggle.innerHTML = '<i class="fas fa-moon"></i>';
        themeToggle.setAttribute('aria-label', 'Toggle Dark Mode');
    }
}

function toggleTheme() {
    isDarkTheme = !isDarkTheme;
    localStorage.setItem('quiz_theme', isDarkTheme ? 'dark' : 'light');
    updateThemeUI();
    soundEngine.playClick();
}

function updateAudioUI() {
    if (soundEngine.isMuted) {
        audioToggle.innerHTML = '<i class="fas fa-volume-mute"></i>';
        audioToggle.setAttribute('aria-label', 'Unmute Sounds');
    } else {
        audioToggle.innerHTML = '<i class="fas fa-volume-up"></i>';
        audioToggle.setAttribute('aria-label', 'Mute Sounds');
    }
}

function toggleMute() {
    const muted = soundEngine.toggleMute();
    updateAudioUI();
    if (!muted) {
        soundEngine.playClick();
    }
}

// ==========================================================================
// 📱 SIDEBAR DRAWER CONTROLLER
// ==========================================================================

function openSidebarDrawer() {
    soundEngine.playClick();
    sidebarPane.classList.add('open');
    if (sidebarOverlay) {
        sidebarOverlay.classList.add('active');
    }
    document.body.style.overflow = 'hidden';
}

function closeSidebarDrawer() {
    soundEngine.playClick();
    sidebarPane.classList.remove('open');
    if (sidebarOverlay) {
        sidebarOverlay.classList.remove('active');
    }
    document.body.style.overflow = '';
}

// ==========================================================================
// 📂 API INTEGRATION (CATEGORIES, TOKENS, QUESTIONS)
// ==========================================================================

// Robust fetch wrapper with automatic retries for rate-limiting (429) & network drops
async function fetchWithRetry(url, options = {}, retries = 3, delay = 2000) {
    try {
        const res = await fetch(url, options);
        if (res.ok) return res;
        
        // Handle rate limiting (429) or transient server errors (500, 502, 503, 504)
        if ((res.status === 429 || res.status >= 500) && retries > 0) {
            console.warn(`API responded with status ${res.status}. Retrying in ${delay}ms... (${retries} retries left)`);
            await new Promise(resolve => setTimeout(resolve, delay));
            return fetchWithRetry(url, options, retries - 1, delay + 1000);
        }
        return res;
    } catch (err) {
        if (retries > 0) {
            console.warn(`Connection failed: ${err.message}. Retrying in ${delay}ms... (${retries} retries left)`);
            await new Promise(resolve => setTimeout(resolve, delay));
            return fetchWithRetry(url, options, retries - 1, delay + 1000);
        }
        throw err;
    }
}

async function fetchCategories() {
    try {
        const response = await fetchWithRetry('https://opentdb.com/api_category.php');
        if (!response.ok) throw new Error('Failed to load categories');
        const data = await response.json();
        apiCategories = data.trivia_categories;
    } catch (e) {
        console.warn('API category load failed, resolving with static fallbacks.', e);
        apiCategories = [
            { id: 9, name: "General Knowledge" },
            { id: 10, name: "Entertainment: Books" },
            { id: 11, name: "Entertainment: Film" },
            { id: 12, name: "Entertainment: Music" },
            { id: 13, name: "Entertainment: Musicals & Theatres" },
            { id: 14, name: "Entertainment: Television" },
            { id: 15, name: "Entertainment: Video Games" },
            { id: 16, name: "Entertainment: Board Games" },
            { id: 17, name: "Science & Nature" },
            { id: 18, name: "Science: Computers" },
            { id: 19, name: "Science: Mathematics" },
            { id: 20, name: "Mythology" },
            { id: 21, name: "Sports" },
            { id: 22, name: "Geography" },
            { id: 23, name: "History" },
            { id: 24, name: "Politics" },
            { id: 25, name: "Art" },
            { id: 26, name: "Celebrities" },
            { id: 27, name: "Animals" },
            { id: 28, name: "Vehicles" },
            { id: 29, name: "Entertainment: Comics" },
            { id: 30, name: "Science: Gadgets" },
            { id: 31, name: "Entertainment: Japanese Anime & Manga" },
            { id: 32, name: "Entertainment: Cartoon & Animations" }
        ];
    }
    
    // Add Mixed option at the top
    apiCategories.unshift({ id: 0, name: "Mixed Categories (Any)" });
    quizSettings.category = 0; // default Mixed
    renderCategories(apiCategories);
}

function renderCategories(list) {
    categoryOptions.innerHTML = '';
    
    if (list.length === 0) {
        categoryOptions.innerHTML = '<div class="no-results">No categories found</div>';
        return;
    }
    
    list.forEach(category => {
        const label = document.createElement('label');
        label.className = 'option-label';
        
        if (quizSettings.category === category.id) {
            label.classList.add('selected');
        }
        
        label.setAttribute('data-value', category.id);
        
        label.innerHTML = `
            <input type="radio" name="category" value="${category.id}" ${quizSettings.category === category.id ? 'checked' : ''} class="visually-hidden">
            <span class="custom-radio"></span>
            <span>${category.name}</span>
        `;
        
        label.addEventListener('click', () => {
            document.querySelectorAll('#category-options .option-label').forEach(l => l.classList.remove('selected'));
            label.classList.add('selected');
            quizSettings.category = category.id;
            soundEngine.playClick();
        });
        
        categoryOptions.appendChild(label);
    });
}

// Category filter
categorySearch.addEventListener('input', (e) => {
    const query = e.target.value.toLowerCase().trim();
    const filtered = apiCategories.filter(cat => cat.name.toLowerCase().includes(query));
    renderCategories(filtered);
});

// Session Token requests
async function getSessionToken() {
    if (sessionToken) return sessionToken;
    try {
        const res = await fetchWithRetry('https://opentdb.com/api_token.php?command=request');
        if (!res.ok) throw new Error('Token connection error');
        const data = await res.json();
        if (data.response_code === 0) {
            sessionToken = data.token;
            localStorage.setItem('quiz_session_token', sessionToken);
        }
    } catch (err) {
        console.warn('Failed to retrieve quiz session token:', err);
    }
    return sessionToken;
}

async function resetSessionToken() {
    if (!sessionToken) return await getSessionToken();
    try {
        const res = await fetchWithRetry(`https://opentdb.com/api_token.php?command=reset&token=${sessionToken}`);
        if (!res.ok) throw new Error('Token reset error');
        const data = await res.json();
        if (data.response_code === 0) {
            console.log('Session token reset successfully');
        } else {
            sessionToken = null;
            await getSessionToken();
        }
    } catch (err) {
        console.warn('Failed to reset session token:', err);
        sessionToken = null;
        await getSessionToken();
    }
    return sessionToken;
}

// API questions load
async function fetchQuestions() {
    const token = await getSessionToken();
    const amount = quizSettings.questionCount;
    const cat = quizSettings.category;
    const diff = quizSettings.difficulty;
    const type = quizSettings.type;
    
    let apiUrl = `https://opentdb.com/api.php?amount=${amount}&encode=url3986`;
    if (cat !== 0 && cat !== 'any') apiUrl += `&category=${cat}`;
    if (diff !== 'any') apiUrl += `&difficulty=${diff}`;
    if (type !== 'any') apiUrl += `&type=${type}`;
    if (token) apiUrl += `&token=${token}`;
    
    let res;
    try {
        res = await fetchWithRetry(apiUrl);
    } catch (netErr) {
        throw new Error('NetworkError');
    }
    
    if (!res.ok) throw new Error('HTTPError');
    
    const data = await res.json();
    
    if (data.response_code === 0) {
        processQuestions(data.results);
    } else if (data.response_code === 1) {
        throw new Error('NoResults');
    } else if (data.response_code === 3 || data.response_code === 4) {
        const freshToken = await resetSessionToken();
        const retryUrl = apiUrl.replace(/&token=[^&]*/, freshToken ? `&token=${freshToken}` : '');
        let retryRes;
        try {
            retryRes = await fetchWithRetry(retryUrl);
        } catch (netErr) {
            throw new Error('NetworkError');
        }
        if (!retryRes.ok) throw new Error('HTTPError');
        const retryData = await retryRes.json();
        if (retryData.response_code === 0) {
            processQuestions(retryData.results);
        } else if (retryData.response_code === 1) {
            throw new Error('NoResults');
        } else {
            throw new Error('APIFailure');
        }
    } else if (data.response_code === 5) {
        await new Promise(resolve => setTimeout(resolve, 2000));
        return await fetchQuestions();
    } else {
        throw new Error('APIFailure');
    }
}

function processQuestions(results) {
    quizQuestions = results.map(q => {
        const question = decodeURIComponent(q.question);
        const correctAnswer = decodeURIComponent(q.correct_answer);
        const incorrectAnswers = q.incorrect_answers.map(ans => decodeURIComponent(ans));
        
        let options = [];
        let correctIdx = 0;
        
        if (q.type === 'boolean') {
            options = ["True", "False"];
            correctIdx = options.indexOf(correctAnswer);
        } else {
            options = [...incorrectAnswers, correctAnswer];
            shuffleArray(options);
            correctIdx = options.indexOf(correctAnswer);
        }
        
        return {
            question,
            options,
            correct: correctIdx,
            category: decodeURIComponent(q.category),
            difficulty: q.difficulty,
            type: q.type
        };
    });
}

function shuffleArray(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
}

// ==========================================================================
// 🛠️ SETUP SETTINGS CONTROLLER (SLIDERS, STEPPERS)
// ==========================================================================

function syncCountSlider() {
    countValue.textContent = `${countSlider.value} Questions`;
    quizSettings.questionCount = parseInt(countSlider.value);
}

function decrementTimerLimit() {
    soundEngine.playClick();
    let val = parseInt(timeLimitInput.value);
    if (val > 5) {
        val -= 5;
        timeLimitInput.value = val;
        if (quizSettings.quizMode !== 'zen') {
            quizSettings.quizMode = val;
        }
    }
}

function incrementTimerLimit() {
    soundEngine.playClick();
    let val = parseInt(timeLimitInput.value);
    if (val < 60) {
        val += 5;
        timeLimitInput.value = val;
        if (quizSettings.quizMode !== 'zen') {
            quizSettings.quizMode = val;
        }
    }
}

function setupOptionListeners() {
    const bindRadioGroup = (name, key, isNumeric = false) => {
        const radios = document.querySelectorAll(`input[name="${name}"]`);
        radios.forEach(radio => {
            radio.addEventListener('change', () => {
                soundEngine.playClick();
                
                // Clear sibling parent option selected states
                document.querySelectorAll(`input[name="${name}"]`).forEach(r => {
                    r.closest('.option-label').classList.remove('selected');
                });
                
                // Select active label
                const label = radio.closest('.option-label');
                label.classList.add('selected');
                
                let value = radio.value;
                if (isNumeric && value !== 'any') {
                    value = parseInt(value);
                }
                quizSettings[key] = value;
            });
        });
    };

    bindRadioGroup('difficulty', 'difficulty');
    bindRadioGroup('type', 'type');
    
    // Handle Quiz Mode toggle specifically (showing stepper if Timed is checked)
    const modeRadios = document.querySelectorAll('input[name="quizMode"]');
    modeRadios.forEach(radio => {
        radio.addEventListener('change', () => {
            soundEngine.playClick();
            document.querySelectorAll('input[name="quizMode"]').forEach(r => {
                r.closest('.option-label').classList.remove('selected');
            });
            radio.closest('.option-label').classList.add('selected');
            
            if (radio.value === 'timed') {
                customTimerWrapper.style.display = 'flex';
                quizSettings.quizMode = parseInt(timeLimitInput.value);
            } else {
                customTimerWrapper.style.display = 'none';
                quizSettings.quizMode = 'zen';
            }
        });
    });
}

// ==========================================================================
// ⏰ TIMERS ENGINE & COUNTDOWNS
// ==========================================================================

function startOverallTimer() {
    clearInterval(overallTimerInterval);
    overallElapsedTime = 0;
    timerElement.textContent = '00:00';
    
    startTime = Date.now();
    overallTimerInterval = setInterval(() => {
        overallElapsedTime = Math.floor((Date.now() - startTime) / 1000);
        const minutes = Math.floor(overallElapsedTime / 60);
        const seconds = overallElapsedTime % 60;
        timerElement.textContent = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    }, 1000);
}

function stopOverallTimer() {
    clearInterval(overallTimerInterval);
}

function startQuestionTimer() {
    clearInterval(questionTimerInterval);
    
    const timerBar = document.getElementById('question-timer-bar');
    const timerFill = document.getElementById('question-timer-fill');
    
    if (quizSettings.quizMode === 'zen') {
        timerBar.style.display = 'none';
        return;
    }
    
    questionTimeLimit = parseInt(quizSettings.quizMode);
    questionTimeRemaining = questionTimeLimit;
    
    timerBar.style.display = 'block';
    timerFill.style.width = '100%';
    timerFill.classList.remove('timer-critical');
    
    questionTimerInterval = setInterval(() => {
        questionTimeRemaining -= 0.1;
        const percentage = (questionTimeRemaining / questionTimeLimit) * 100;
        timerFill.style.width = `${percentage}%`;
        
        if (questionTimeRemaining <= 5) {
            timerFill.classList.add('timer-critical');
        }
        
        if (questionTimeRemaining <= 0) {
            clearInterval(questionTimerInterval);
            handleQuestionTimeout();
        }
    }, 100);
}

function handleQuestionTimeout() {
    soundEngine.playIncorrect();
    showToast("Time's up!");
    
    userAnswers[currentQuestion] = null;
    questionTimeSpentArray[currentQuestion] = questionTimeLimit;
    
    // Reveal correct/incorrect indicators
    const options = document.querySelectorAll('#options-container .option');
    const correctIndex = quizQuestions[currentQuestion].correct;
    options.forEach((opt, idx) => {
        opt.style.pointerEvents = 'none';
        if (idx === correctIndex) {
            opt.classList.add('correct');
        } else {
            opt.classList.add('incorrect');
        }
    });

    setTimeout(() => {
        if (currentQuestion < quizQuestions.length - 1) {
            currentQuestion++;
            showQuestion();
            updateButtons();
            updateProgress();
        } else {
            submitQuiz();
        }
    }, 1300);
}

// ==========================================================================
// 🎯 QUIZ RUNNER & GAMEPLAY STATE CONTROL
// ==========================================================================

async function startQuiz() {
    setupContainer.style.display = 'none';
    errorElement.style.display = 'none';
    loadingElement.style.display = 'block';
    
    try {
        await fetchQuestions();
        
        // Reset states
        currentQuestion = 0;
        userAnswers = new Array(quizQuestions.length).fill(null);
        questionTimeSpentArray = new Array(quizQuestions.length).fill(0);
        
        loadingElement.style.display = 'none';
        questionContainer.style.display = 'block';
        document.querySelector('.quiz-progress-section').style.display = 'block';
        document.getElementById('question-nav-grid').style.display = 'flex';
        document.getElementById('quiz-footer').style.display = 'flex';
        
        startOverallTimer();
        showQuestion();
        updateButtons();
        updateProgress();
    } catch (err) {
        console.error('Quiz start error:', err);
        showError(err.message);
    }
}

function showQuestion() {
    const question = quizQuestions[currentQuestion];
    questionText.textContent = question.question;
    
    categoryTag.innerHTML = `<i class="fas fa-tag"></i> ${question.category}`;
    difficultyTag.innerHTML = `<i class="fas fa-signal"></i> ${question.difficulty.charAt(0).toUpperCase() + question.difficulty.slice(1)}`;
    typeTag.innerHTML = `<i class="fas fa-list-ul"></i> ${question.type === 'multiple' ? 'Multiple Choice' : 'True/False'}`;
    
    optionsContainer.innerHTML = '';
    
    question.options.forEach((option, index) => {
        const optionCard = document.createElement('div');
        optionCard.className = 'option';
        optionCard.setAttribute('role', 'radio');
        optionCard.setAttribute('aria-checked', userAnswers[currentQuestion] === index ? 'true' : 'false');
        optionCard.setAttribute('tabindex', '0');
        
        const badge = document.createElement('div');
        badge.className = 'option-letter-badge';
        badge.textContent = String.fromCharCode(65 + index);
        
        const optText = document.createElement('div');
        optText.textContent = option;
        
        optionCard.appendChild(badge);
        optionCard.appendChild(optText);
        
        if (userAnswers[currentQuestion] === index) {
            optionCard.classList.add('selected');
        }
        
        const select = () => selectOption(index);
        
        optionCard.addEventListener('click', select);
        optionCard.addEventListener('keydown', (e) => {
            if (e.key === ' ' || e.key === 'Enter') {
                e.preventDefault();
                select();
            }
        });
        
        optionsContainer.appendChild(optionCard);
    });
    
    progressText.textContent = `Question ${currentQuestion + 1} of ${quizQuestions.length}`;
    updateQuestionMap();
    
    questionStartTime = Date.now();
    startQuestionTimer();
}

function selectOption(optionIndex) {
    const elapsed = (Date.now() - questionStartTime) / 1000;
    questionTimeSpentArray[currentQuestion] = elapsed;

    // Badge speed check: speed demon unlock
    if (quizSettings.quizMode !== 'zen' && elapsed < 3.0) {
        unlockBadge('speed');
    }

    const isCorrectChoice = optionIndex === quizQuestions[currentQuestion].correct;
    
    if (isCorrectChoice) {
        soundEngine.playCorrect();
    } else {
        soundEngine.playIncorrect();
    }
    
    userAnswers[currentQuestion] = optionIndex;
    clearInterval(questionTimerInterval); // pause clock
    
    showQuestion();
    updateButtons();
    updateProgress();
}

function updateProgress() {
    const progress = ((currentQuestion + 1) / quizQuestions.length) * 100;
    progressFill.style.width = `${progress}%`;
}

function updateQuestionMap() {
    const navGrid = document.getElementById('question-nav-grid');
    navGrid.innerHTML = '';
    
    quizQuestions.forEach((_, idx) => {
        const dot = document.createElement('button');
        dot.className = 'nav-dot';
        dot.textContent = idx + 1;
        dot.setAttribute('aria-label', `Navigate to Question ${idx + 1}`);
        
        if (idx === currentQuestion) {
            dot.classList.add('current');
        }
        
        if (userAnswers[idx] !== null) {
            dot.classList.add('answered');
        } else if (idx < currentQuestion) {
            dot.classList.add('visited');
        }
        
        dot.addEventListener('click', () => {
            soundEngine.playClick();
            currentQuestion = idx;
            clearInterval(questionTimerInterval);
            showQuestion();
            updateButtons();
            updateProgress();
        });
        
        navGrid.appendChild(dot);
    });
}

function updateButtons() {
    prevBtn.disabled = currentQuestion === 0;
    
    if (currentQuestion === quizQuestions.length - 1) {
        nextBtn.style.display = 'none';
        submitBtn.style.display = 'inline-flex';
    } else {
        nextBtn.style.display = 'inline-flex';
        submitBtn.style.display = 'none';
    }
}

function prevQuestion() {
    if (currentQuestion > 0) {
        soundEngine.playClick();
        currentQuestion--;
        clearInterval(questionTimerInterval);
        showQuestion();
        updateButtons();
        updateProgress();
    }
}

function nextQuestion() {
    if (currentQuestion < quizQuestions.length - 1) {
        soundEngine.playClick();
        currentQuestion++;
        clearInterval(questionTimerInterval);
        showQuestion();
        updateButtons();
        updateProgress();
    }
}

// ==========================================================================
// 📊 SCORE COMPUTATION & COMPLETIONS
// ==========================================================================

function calculateMaxStreak() {
    let max = 0;
    let current = 0;
    
    quizQuestions.forEach((q, idx) => {
        if (userAnswers[idx] === q.correct) {
            current++;
            if (current > max) max = current;
        } else {
            current = 0;
        }
    });
    return max;
}

function submitQuiz() {
    stopOverallTimer();
    clearInterval(questionTimerInterval);
    
    let score = 0;
    quizQuestions.forEach((q, idx) => {
        if (userAnswers[idx] === q.correct) {
            score++;
        }
    });
    
    // Hide active question layouts
    questionContainer.style.display = 'none';
    document.getElementById('question-nav-grid').style.display = 'none';
    document.getElementById('quiz-footer').style.display = 'none';
    document.querySelector('.quiz-progress-section').style.display = 'none';
    
    // Display results panels
    resultsContainer.style.display = 'block';
    
    const percentage = Math.round((score / quizQuestions.length) * 100);
    correctAnswers.textContent = score;
    scorePercent.textContent = `${percentage}%`;
    
    const timeTakenStr = timerElement.textContent;
    timeTaken.textContent = timeTakenStr;
    
    const streak = calculateMaxStreak();
    document.getElementById('streak-value').textContent = streak;
    
    // SVG circle radial animations
    const circleFill = document.getElementById('score-circle-fill');
    const circumference = 2 * Math.PI * 54;
    const offset = circumference - (percentage / 100) * circumference;
    
    circleFill.style.strokeDashoffset = circumference;
    setTimeout(() => {
        circleFill.style.strokeDashoffset = offset;
    }, 150);
    
    // Print detailed accordions
    showDetailedResults();
    
    // Play complete fanfare
    if (percentage >= 60) {
        soundEngine.playFanfare();
        createConfetti();
    } else {
        soundEngine.playIncorrect();
    }
    
    // Save to leaderboard
    saveScoreToLeaderboard(score, quizQuestions.length, timeTakenStr);

    // Save profile cumulative stats
    saveProfileStats(score, quizQuestions.length);

    // Achievements evaluations
    evaluateQuizAchievements(score, quizQuestions.length, streak);
}

function showDetailedResults() {
    resultsDetails.innerHTML = '';
    
    quizQuestions.forEach((question, index) => {
        const item = document.createElement('div');
        item.className = 'result-item';
        
        const isCorrect = userAnswers[index] === question.correct;
        item.classList.add(isCorrect ? 'correct' : 'incorrect');
        
        const timeSpent = questionTimeSpentArray[index] || 0;
        const timeText = timeSpent > 0 ? `${timeSpent.toFixed(1)}s` : 'N/A';
        
        const userChoice = userAnswers[index] !== null 
            ? question.options[userAnswers[index]] 
            : 'Unanswered (Timed Out)';
        const correctChoice = question.options[question.correct];
        
        item.innerHTML = `
            <div class="result-header-row">
                <div class="result-status">
                    ${isCorrect ? '<i class="fas fa-check"></i>' : '<i class="fas fa-times"></i>'}
                </div>
                <span class="result-title-text">Question ${index + 1}: ${question.question}</span>
                <i class="fas fa-chevron-down accordion-arrow"></i>
            </div>
            <div class="result-content-expanded">
                <p><strong>Full Question:</strong> ${escapeHtml(question.question)}</p>
                <p>Your Answer: <span class="badge-inline ${isCorrect ? 'correct' : 'incorrect'}">${escapeHtml(userChoice)}</span></p>
                ${!isCorrect ? `<p>Correct Answer: <span class="badge-inline correct">${escapeHtml(correctChoice)}</span></p>` : ''}
                <p>Time Spent: <strong>${timeText}</strong></p>
                <div class="review-actions-row">
                    <button type="button" class="copy-question-btn" data-index="${index}">
                        <i class="fas fa-copy"></i> Copy Question
                    </button>
                    <a href="https://www.google.com/search?q=${encodeURIComponent('explain: ' + question.question)}" target="_blank" class="search-explanation-link" rel="noopener noreferrer">
                        <i class="fas fa-search"></i> Explanation Search
                    </a>
                </div>
            </div>
        `;
        
        // Accordion click bindings
        item.addEventListener('click', (e) => {
            if (e.target.closest('.review-actions-row') || e.target.closest('a') || e.target.closest('button')) {
                return;
            }
            soundEngine.playClick();
            item.classList.toggle('expanded');
        });
        
        // Copy question binding
        const copyBtn = item.querySelector('.copy-question-btn');
        copyBtn.addEventListener('click', () => {
            soundEngine.playClick();
            navigator.clipboard.writeText(question.question).then(() => {
                showToast('Question text copied!');
            });
        });
        
        resultsDetails.appendChild(item);
    });
}

function escapeHtml(str) {
    return str
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

function restartQuiz() {
    resultsContainer.style.display = 'none';
    setupContainer.style.display = 'block';
    
    document.querySelector('.quiz-progress-section').style.display = 'none';
    
    progressText.textContent = 'Select Quiz Options';
    progressFill.style.width = '0%';
    timerElement.textContent = '00:00';
    document.getElementById('question-timer-bar').style.display = 'none';
    
    renderLeaderboard();
}

// ==========================================================================
// 🏆 PERSISTENT STATS & GAMIFIED ACHIEVEMENTS (LOCAL STORAGE)
// ==========================================================================

function getCategoryName(id) {
    if (id === 0 || id === '0' || id === 'any') return 'Mixed Categories';
    const found = apiCategories.find(c => c.id === parseInt(id));
    return found ? found.name : 'Unknown Category';
}

// Save cumulative profile metrics
function saveProfileStats(correctCount, totalCount) {
    const stats = JSON.parse(localStorage.getItem('quiz_profile_stats')) || { played: 0, totalCorrect: 0, totalQuestions: 0, completedCategories: [] };
    
    stats.played += 1;
    stats.totalCorrect += correctCount;
    stats.totalQuestions += totalCount;
    
    const catId = quizSettings.category;
    if (!stats.completedCategories.includes(catId)) {
        stats.completedCategories.push(catId);
    }
    
    localStorage.setItem('quiz_profile_stats', JSON.stringify(stats));
    updateProfileStatsDisplay();
}

function updateProfileStatsDisplay() {
    const stats = JSON.parse(localStorage.getItem('quiz_profile_stats')) || { played: 0, totalCorrect: 0, totalQuestions: 0 };
    document.getElementById('stats-played').textContent = stats.played;
    
    const pct = stats.totalQuestions > 0 ? Math.round((stats.totalCorrect / stats.totalQuestions) * 100) : 0;
    document.getElementById('stats-accuracy').textContent = `${pct}%`;
}

// Badges Engine
function evaluateQuizAchievements(score, total, maxStreak) {
    const stats = JSON.parse(localStorage.getItem('quiz_profile_stats')) || { played: 0, completedCategories: [] };
    
    // Bullseye check
    if (score === total) {
        unlockBadge('perfect');
    }
    
    // Streak Master check
    if (maxStreak >= 7) {
        unlockBadge('streak');
    }
    
    // Polymath check (Quizzes in 3+ categories)
    if (stats.completedCategories && stats.completedCategories.length >= 3) {
        unlockBadge('polymath');
    }
    
    // Veteran check (10 quizzes completed)
    if (stats.played >= 10) {
        unlockBadge('veteran');
    }
}

function unlockBadge(key) {
    const badges = JSON.parse(localStorage.getItem('quiz_unlocked_badges')) || { speed: false, perfect: false, streak: false, polymath: false, veteran: false };
    if (!badges[key]) {
        badges[key] = true;
        localStorage.setItem('quiz_unlocked_badges', JSON.stringify(badges));
        updateBadgesDisplay();
        showToast(`🏆 Medal Unlocked: ${getBadgeName(key)}!`);
        soundEngine.playFanfare();
    }
}

function getBadgeName(key) {
    const names = { speed: 'Speed Demon', perfect: 'Bullseye', streak: 'Streak Master', polymath: 'Polymath', veteran: 'Veteran' };
    return names[key] || key;
}

function updateBadgesDisplay() {
    const badges = JSON.parse(localStorage.getItem('quiz_unlocked_badges')) || { speed: false, perfect: false, streak: false, polymath: false, veteran: false };
    for (const key in badges) {
        const item = document.getElementById(`badge-${key}`);
        if (item) {
            if (badges[key]) {
                item.classList.remove('locked');
                item.classList.add('unlocked');
            } else {
                item.classList.add('locked');
                item.classList.remove('unlocked');
            }
        }
    }
}

// Save attempts to Leaderboard
function saveScoreToLeaderboard(score, total, timeStr) {
    const list = JSON.parse(localStorage.getItem('quiz_leaderboard')) || [];
    
    const catName = getCategoryName(quizSettings.category);
    const diffName = quizSettings.difficulty === 'any' ? 'Any' : quizSettings.difficulty.charAt(0).toUpperCase() + quizSettings.difficulty.slice(1);
    const pct = Math.round((score / total) * 100);
    
    const entry = {
        score,
        total,
        percentage: pct,
        category: catName,
        difficulty: diffName,
        time: timeStr,
        date: new Date().toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
    };
    
    list.push(entry);
    
    list.sort((a, b) => {
        if (b.percentage !== a.percentage) return b.percentage - a.percentage;
        return a.time.localeCompare(b.time);
    });
    
    const topScores = list.slice(0, 5);
    localStorage.setItem('quiz_leaderboard', JSON.stringify(topScores));
}

function renderLeaderboard() {
    const body = document.getElementById('leaderboard-body');
    const list = JSON.parse(localStorage.getItem('quiz_leaderboard')) || [];
    
    body.innerHTML = '';
    
    if (list.length === 0) {
        body.innerHTML = `
            <tr>
                <td colspan="4" class="no-scores">No scores yet. Complete a quiz to rank!</td>
            </tr>
        `;
        clearScoresBtn.style.display = 'none';
        return;
    }
    
    clearScoresBtn.style.display = 'inline-flex';
    
    list.forEach((entry, index) => {
        const row = document.createElement('tr');
        
        let rankBadge = 'rank-other';
        if (index === 0) rankBadge = 'rank-1';
        else if (index === 1) rankBadge = 'rank-2';
        else if (index === 2) rankBadge = 'rank-3';
        
        row.innerHTML = `
            <td><span class="rank-badge ${rankBadge}">${index + 1}</span></td>
            <td>${entry.category}</td>
            <td>${entry.difficulty}</td>
            <td><strong>${entry.score}/${entry.total}</strong> (${entry.percentage}%)</td>
        `;
        body.appendChild(row);
    });
}

function clearLeaderboard() {
    soundEngine.playClick();
    if (confirm('Are you sure you want to clear your high score board?')) {
        localStorage.removeItem('quiz_leaderboard');
        renderLeaderboard();
        showToast('Leaderboard cleared.');
    }
}

// ==========================================================================
// 🚀 UTILITY LIBRARIES & VISUAL FX
// ==========================================================================

function showToast(message) {
    const toast = document.getElementById('toast');
    toast.innerHTML = `<i class="fas fa-bell"></i> ${message}`;
    toast.classList.add('show');
    
    setTimeout(() => {
        toast.classList.remove('show');
    }, 2800);
}

function showError(errorType) {
    loadingElement.style.display = 'none';
    errorElement.style.display = 'block';
    
    const title = document.getElementById('error-title');
    const desc = document.getElementById('error-desc');
    
    if (errorType === 'NoResults') {
        title.textContent = 'No Trivia Found';
        desc.textContent = 'OpenTDB does not contain enough questions with your current settings. Try changing difficulty, type, category, or reducing question counts!';
    } else if (errorType === 'NetworkError') {
        title.textContent = 'Connection Interrupted';
        desc.textContent = 'We could not reach the database servers. Please verify your internet connection and select Try Again.';
    } else {
        title.textContent = 'Database System Error';
        desc.textContent = 'The trivia database failed to process this combination of configurations. Please retry in a moment.';
    }
}

// Share score scorecard generator
shareBtn.addEventListener('click', () => {
    soundEngine.playClick();
    
    const correct = correctAnswers.textContent;
    const total = quizQuestions.length;
    const pct = scorePercent.textContent;
    const elapsed = timeTaken.textContent;
    const cat = getCategoryName(quizSettings.category);
    
    const text = `🏆 I scored ${correct}/${total} (${pct}) in "${cat}" on the BrainWave Quiz!\n⏱️ Time Taken: ${elapsed}\nTry it out now and unlock medals!`;
    
    if (navigator.clipboard) {
        navigator.clipboard.writeText(text)
            .then(() => showToast('Score card copied to clipboard!'))
            .catch(() => showToast('Failed to copy scorecard.'));
    } else {
        showToast('Clipboard not supported.');
    }
});

// Canvas-free lightweight Confetti animation
function createConfetti() {
    const colors = ['#6366f1', '#38bdf8', '#10b981', '#fbbf24', '#f43f5e'];
    const container = document.body;
    const fragment = document.createDocumentFragment();
    const count = 65;
    
    for (let i = 0; i < count; i++) {
        const confetti = document.createElement('div');
        confetti.className = 'confetti';
        confetti.style.left = Math.random() * 100 + 'vw';
        confetti.style.top = '-15px';
        confetti.style.backgroundColor = colors[Math.floor(Math.random() * colors.length)];
        confetti.style.width = (Math.random() * 8 + 6) + 'px';
        confetti.style.height = (Math.random() * 8 + 6) + 'px';
        confetti.style.borderRadius = Math.random() > 0.5 ? '50%' : '0%';
        
        fragment.appendChild(confetti);
        
        const duration = 2000 + Math.random() * 2000;
        const animation = confetti.animate([
            { transform: 'translateY(0) rotate(0deg)', opacity: 1 },
            { transform: `translateY(${window.innerHeight + 25}px) rotate(${Math.random() * 360 + 360}deg)`, opacity: 0 }
        ], {
            duration: duration,
            easing: 'cubic-bezier(0.1, 0.8, 0.3, 1)'
        });
        
        animation.onfinish = () => confetti.remove();
    }
    
    container.appendChild(fragment);
}

// Initial binding trigger
window.addEventListener('DOMContentLoaded', initApp);