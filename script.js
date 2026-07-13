// DOM Elements
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
        const progressText = document.getElementById('progress-text');
        const progressFill = document.getElementById('progress-fill');
        const timerElement = document.getElementById('timer');
        const scoreCircle = document.getElementById('score-circle');
        const scorePercent = document.getElementById('score-percent');
        const scorePercentValue = document.getElementById('score-percent-value');
        const correctAnswers = document.getElementById('correct-answers');
        const timeTaken = document.getElementById('time-taken');
        const resultsDetails = document.getElementById('results-details');
        const categoryOptions = document.getElementById('category-options');

        // Quiz state variables
        let currentQuestion = 0;
        let userAnswers = [];
        let startTime;
        let timerInterval;
        let quizQuestions = [];
        let quizSettings = {
            category: 9, // General Knowledge by default
            difficulty: 'any',
            questionCount: 10
        };

        // Quiz categories from OpenTDB API
        const categories = [
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

        // Initialize the application
        function initApp() {
            // Populate category options
            populateCategories();
            
            // Set up event listeners for option selection
            setupOptionListeners();
            
            // Set up button event listeners
            startBtn.addEventListener('click', startQuiz);
            retryBtn.addEventListener('click', startQuiz);
            prevBtn.addEventListener('click', prevQuestion);
            nextBtn.addEventListener('click', nextQuestion);
            submitBtn.addEventListener('click', submitQuiz);
            restartBtn.addEventListener('click', restartQuiz);
        }

        // Populate category options
        function populateCategories() {
            categories.forEach(category => {
                const label = document.createElement('label');
                label.className = 'option-label';
                label.setAttribute('data-value', category.id);
                
                if (category.id === 9) {
                    label.classList.add('selected');
                }
                
                label.innerHTML = `
                    <input type="radio" name="category" value="${category.id}" ${category.id === 9 ? 'checked' : ''}>
                    <span>${category.name}</span>
                `;
                
                categoryOptions.appendChild(label);
            });
        }

        // Set up event listeners for option selection
        function setupOptionListeners() {
            // Category selection
            document.querySelectorAll('#category-options .option-label').forEach(label => {
                label.addEventListener('click', () => {
                    document.querySelectorAll('#category-options .option-label').forEach(l => l.classList.remove('selected'));
                    label.classList.add('selected');
                    quizSettings.category = parseInt(label.getAttribute('data-value'));
                });
            });
            
            // Difficulty selection
            document.querySelectorAll('#difficulty-options .option-label').forEach(label => {
                label.addEventListener('click', () => {
                    document.querySelectorAll('#difficulty-options .option-label').forEach(l => l.classList.remove('selected'));
                    label.classList.add('selected');
                    quizSettings.difficulty = label.getAttribute('data-value');
                });
            });
            
            // Question count selection
            document.querySelectorAll('input[name="questionCount"]').forEach(radio => {
                radio.addEventListener('change', () => {
                    quizSettings.questionCount = parseInt(radio.value);
                });
            });
        }

        // Start the quiz
        async function startQuiz() {
            // Show loading screen
            setupContainer.style.display = 'none';
            errorElement.style.display = 'none';
            loadingElement.style.display = 'block';
            
            try {
                // Fetch questions from API
                await fetchQuestions();
                
                // Initialize quiz state
                currentQuestion = 0;
                userAnswers = new Array(quizQuestions.length).fill(null);
                
                // Hide loading, show questions
                loadingElement.style.display = 'none';
                questionContainer.style.display = 'block';
                
                // Start timer and show first question
                startTime = new Date();
                startTimer();
                showQuestion();
                updateButtons();
                updateProgress();
            } catch (error) {
                console.error('Error fetching questions:', error);
                loadingElement.style.display = 'none';
                errorElement.style.display = 'block';
            }
        }

        // Fetch questions from OpenTDB API
        async function fetchQuestions() {
            // Build API URL based on settings
            let apiUrl = `https://opentdb.com/api.php?amount=${quizSettings.questionCount}&category=${quizSettings.category}`;
            
            if (quizSettings.difficulty !== 'any') {
                apiUrl += `&difficulty=${quizSettings.difficulty}`;
            }
            
            apiUrl += '&type=multiple&encode=url3986';
            
            const response = await fetch(apiUrl);
            
            if (!response.ok) {
                throw new Error('Failed to fetch questions');
            }
            
            const data = await response.json();
            
            if (data.response_code !== 0) {
                throw new Error('API returned an error');
            }
            
            // Process and store questions
            quizQuestions = data.results.map(q => {
                // Decode URL-encoded text
                const question = decodeURIComponent(q.question);
                const correctAnswer = decodeURIComponent(q.correct_answer);
                const incorrectAnswers = q.incorrect_answers.map(a => decodeURIComponent(a));
                
                // Combine and shuffle options
                const options = [...incorrectAnswers, correctAnswer];
                shuffleArray(options);
                
                // Find the index of the correct answer after shuffling
                const correctIndex = options.indexOf(correctAnswer);
                
                return {
                    question,
                    options,
                    correct: correctIndex,
                    category: decodeURIComponent(q.category),
                    difficulty: q.difficulty,
                    type: q.type
                };
            });
        }

        // Fisher-Yates shuffle algorithm
        function shuffleArray(array) {
            for (let i = array.length - 1; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1));
                [array[i], array[j]] = [array[j], array[i]];
            }
            return array;
        }

        // Start the timer
        function startTimer() {
            timerInterval = setInterval(() => {
                const now = new Date();
                const elapsedTime = Math.floor((now - startTime) / 1000);
                const minutes = Math.floor(elapsedTime / 60);
                const seconds = elapsedTime % 60;
                timerElement.textContent = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
            }, 1000);
        }

        // Display the current question
        function showQuestion() {
            const question = quizQuestions[currentQuestion];
            questionText.textContent = question.question;
            
            // Update meta tags
            categoryTag.textContent = question.category;
            difficultyTag.textContent = question.difficulty.charAt(0).toUpperCase() + question.difficulty.slice(1);
            typeTag.textContent = question.type === 'multiple' ? 'Multiple Choice' : 'True/False';
            
            // Clear previous options
            optionsContainer.innerHTML = '';
            
            // Create new options
            question.options.forEach((option, index) => {
                const optionElement = document.createElement('div');
                optionElement.classList.add('option');
                
                // Add option number
                const optionNumber = document.createElement('div');
                optionNumber.classList.add('option-number');
                optionNumber.textContent = String.fromCharCode(65 + index); // A, B, C, D
                
                // Add option text
                const optionText = document.createElement('div');
                optionText.textContent = option;
                
                optionElement.appendChild(optionNumber);
                optionElement.appendChild(optionText);
                
                if (userAnswers[currentQuestion] === index) {
                    optionElement.classList.add('selected');
                }
                
                optionElement.addEventListener('click', () => selectOption(index));
                optionsContainer.appendChild(optionElement);
            });
            
            // Update progress text
            progressText.textContent = `Question ${currentQuestion + 1} of ${quizQuestions.length}`;
        }

        // Update progress bar
        function updateProgress() {
            const progress = ((currentQuestion + 1) / quizQuestions.length) * 100;
            progressFill.style.width = `${progress}%`;
        }

        // Handle option selection
        function selectOption(optionIndex) {
            userAnswers[currentQuestion] = optionIndex;
            showQuestion();
            updateButtons();
        }

        // Update button states
        function updateButtons() {
            // Previous button
            prevBtn.disabled = currentQuestion === 0;
            
            // Next/Submit button
            if (currentQuestion === quizQuestions.length - 1) {
                nextBtn.style.display = 'none';
                submitBtn.style.display = 'flex';
            } else {
                nextBtn.style.display = 'flex';
                submitBtn.style.display = 'none';
            }
            
            // Enable/disable next button based on whether an answer is selected
            nextBtn.disabled = userAnswers[currentQuestion] === null;
            submitBtn.disabled = userAnswers[currentQuestion] === null;
        }

        // Navigate to previous question
        function prevQuestion() {
            if (currentQuestion > 0) {
                currentQuestion--;
                showQuestion();
                updateButtons();
                updateProgress();
            }
        }

        // Navigate to next question
        function nextQuestion() {
            if (currentQuestion < quizQuestions.length - 1) {
                currentQuestion++;
                showQuestion();
                updateButtons();
                updateProgress();
            }
        }

        // Submit the quiz and show results
        function submitQuiz() {
            clearInterval(timerInterval);
            
            // Calculate score
            let score = 0;
            quizQuestions.forEach((question, index) => {
                if (userAnswers[index] === question.correct) {
                    score++;
                }
            });
            
            // Calculate time taken
            const endTime = new Date();
            const timeElapsed = Math.floor((endTime - startTime) / 1000);
            const minutes = Math.floor(timeElapsed / 60);
            const seconds = timeElapsed % 60;
            const timeString = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
            
            // Update UI to show results
            questionContainer.style.display = 'none';
            resultsContainer.style.display = 'block';
            
            // Calculate and display score
            const percentage = Math.round((score / quizQuestions.length) * 100);
            correctAnswers.textContent = score;
            scorePercent.textContent = `${percentage}%`;
            scorePercentValue.textContent = `${percentage}%`;
            timeTaken.textContent = timeString;
            
            // Animate the score circle
            setTimeout(() => {
                scoreCircle.style.background = `conic-gradient(var(--success) ${percentage}%, #e0e0e0 0%)`;
            }, 100);
            
            // Show detailed results
            showDetailedResults(score);
            
            // Create confetti effect for good scores
            if (percentage >= 70) {
                createConfetti();
            }
        }

        // Create confetti effect
        function createConfetti() {
            const colors = ['#4361ee', '#4cc9f0', '#3a0ca3', '#4ade80', '#f43f5e'];
            const container = document.body;
            
            for (let i = 0; i < 100; i++) {
                const confetti = document.createElement('div');
                confetti.className = 'confetti';
                confetti.style.left = Math.random() * 100 + 'vw';
                confetti.style.top = '-10px';
                confetti.style.backgroundColor = colors[Math.floor(Math.random() * colors.length)];
                confetti.style.transform = `rotate(${Math.random() * 360}deg)`;
                container.appendChild(confetti);
                
                // Animate confetti
                const animation = confetti.animate([
                    { transform: `translateY(0) rotate(0deg)`, opacity: 1 },
                    { transform: `translateY(${window.innerHeight}px) rotate(${Math.random() * 360}deg)`, opacity: 0 }
                ], {
                    duration: 2000 + Math.random() * 3000,
                    easing: 'cubic-bezier(0.1, 0.8, 0.3, 1)'
                });
                
                // Remove confetti after animation
                animation.onfinish = () => confetti.remove();
            }
        }

        // Show detailed results for each question
        function showDetailedResults(score) {
            resultsDetails.innerHTML = '';
            
            quizQuestions.forEach((question, index) => {
                const resultItem = document.createElement('div');
                resultItem.classList.add('result-item');
                
                const isCorrect = userAnswers[index] === question.correct;
                resultItem.classList.add(isCorrect ? 'correct' : 'incorrect');
                
                const resultStatus = document.createElement('div');
                resultStatus.classList.add('result-status');
                resultStatus.innerHTML = isCorrect ? '<i class="fas fa-check"></i>' : '<i class="fas fa-times"></i>';
                
                const resultContent = document.createElement('div');
                resultContent.classList.add('result-content');
                
                resultContent.innerHTML = `
                    <p><strong>Question ${index + 1}:</strong> ${question.question}</p>
                    <p>Your answer: <span class="${isCorrect ? 'correct' : 'incorrect'}">${question.options[userAnswers[index]] || 'Not answered'}</span></p>
                    <p>Correct answer: <span class="correct">${question.options[question.correct]}</span></p>
                `;
                
                resultItem.appendChild(resultStatus);
                resultItem.appendChild(resultContent);
                resultsDetails.appendChild(resultItem);
            });
        }

        // Restart the quiz
        function restartQuiz() {
            resultsContainer.style.display = 'none';
            setupContainer.style.display = 'block';
            progressText.textContent = 'Select Quiz Options';
            progressFill.style.width = '0%';
            timerElement.textContent = '00:00';
        }

        // Initialize the application when the page loads
        window.addEventListener('DOMContentLoaded', initApp);