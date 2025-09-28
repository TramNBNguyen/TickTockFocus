class PomodoroTimer {
    constructor() {
        this.workTime = 25 * 60; // 25 minutes in seconds
        this.shortBreak = 5 * 60; // 5 minutes
        this.longBreak = 15 * 60; // 15 minutes
        this.currentTime = this.workTime;
        this.isRunning = false;
        this.isWorkSession = true;
        this.sessionCount = 1;
        this.totalSessions = 0;
        this.interval = null;
        
        this.initializeElements();
        this.loadState();
        this.updateDisplay();
        this.addEventListeners();
    }
    
    initializeElements() {
        this.timeDisplay = document.getElementById('time-display');
        this.progressBar = document.getElementById('progress-bar');
        this.startBtn = document.getElementById('start-btn');
        this.pauseBtn = document.getElementById('pause-btn');
        this.resetBtn = document.getElementById('reset-btn');
        this.sessionType = document.getElementById('session-type');
        this.sessionCountDisplay = document.getElementById('session-count');
    }
    
    addEventListeners() {
        this.startBtn.addEventListener('click', () => this.start());
        this.pauseBtn.addEventListener('click', () => this.pause());
        this.resetBtn.addEventListener('click', () => this.reset());
    }
    
    start() {
        if (this.isRunning) return;
        
        this.isRunning = true;
        this.startBtn.disabled = true;
        this.pauseBtn.disabled = false;
        
        this.interval = setInterval(() => {
            this.currentTime--;
            this.updateDisplay();
            this.saveState();
            
            if (this.currentTime <= 0) {
                this.completeSession();
            }
        }, 1000);
    }
    
    pause() {
        if (!this.isRunning) return;
        
        this.isRunning = false;
        this.startBtn.disabled = false;
        this.pauseBtn.disabled = true;
        
        clearInterval(this.interval);
        this.saveState();
    }
    
    reset() {
        this.pause();
        this.currentTime = this.isWorkSession ? this.workTime : 
                          (this.sessionCount % 4 === 0 ? this.longBreak : this.shortBreak);
        this.updateDisplay();
        this.saveState();
    }
    
    completeSession() {
        this.pause();
        this.playNotification();
        
        if (this.isWorkSession) {
            this.totalSessions++;
            // Switch to break
            this.isWorkSession = false;
            this.currentTime = this.sessionCount % 4 === 0 ? this.longBreak : this.shortBreak;
        } else {
            // Switch to work
            this.isWorkSession = true;
            this.sessionCount++;
            this.currentTime = this.workTime;
        }
        
        this.updateDisplay();
        this.saveState();
    }
    
    updateDisplay() {
        // Update time display
        const minutes = Math.floor(this.currentTime / 60);
        const seconds = this.currentTime % 60;
        this.timeDisplay.textContent = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
        
        // Update progress bar
        const totalTime = this.isWorkSession ? this.workTime : 
                         (this.sessionCount % 4 === 0 ? this.longBreak : this.shortBreak);
        const progress = ((totalTime - this.currentTime) / totalTime) * 100;
        this.progressBar.style.width = `${progress}%`;
        
        // Update session info
        this.sessionType.textContent = this.isWorkSession ? 'Work Session' : 
                                      (this.sessionCount % 4 === 0 ? 'Long Break' : 'Short Break');
        this.sessionCountDisplay.textContent = `Session ${this.sessionCount}`;
        
        // Update button states
        if (!this.isRunning) {
            this.startBtn.disabled = false;
            this.pauseBtn.disabled = true;
        }
    }
    
    playNotification() {
        // Create audio notification
        const audio = new Audio();
        audio.src = 'data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhBzGY3Oq+diMFl';
        audio.play().catch(() => {
            // Fallback: show browser notification
            if (Notification.permission === 'granted') {
                new Notification('Pomodoro Timer', {
                    body: this.isWorkSession ? 'Break time!' : 'Time to work!',
                    icon: 'icons/icon48.png'
                });
            }
        });
    }
    
    saveState() {
        const state = {
            currentTime: this.currentTime,
            isRunning: this.isRunning,
            isWorkSession: this.isWorkSession,
            sessionCount: this.sessionCount,
            totalSessions: this.totalSessions
        };
        chrome.storage.local.set({ pomodoroState: state });
    }
    
    loadState() {
        chrome.storage.local.get('pomodoroState', (data) => {
            if (data.pomodoroState) {
                const state = data.pomodoroState;
                this.currentTime = state.currentTime || this.workTime;
                this.isWorkSession = state.isWorkSession !== undefined ? state.isWorkSession : true;
                this.sessionCount = state.sessionCount || 1;
                this.totalSessions = state.totalSessions || 0;
                this.updateDisplay();
            }
        });
    }
}

// Initialize timer when popup opens
document.addEventListener('DOMContentLoaded', () => {
    const timeDisplay = document.getElementById('time-display');
    const progressBar = document.getElementById('progress-bar');
    const startBtn = document.getElementById('start-btn');
    const pauseBtn = document.getElementById('pause-btn');
    const resetBtn = document.getElementById('reset-btn');
    const sessionType = document.getElementById('session-type');
    const sessionCountDisplay = document.getElementById('session-count');

    function updateUI(state) {
        const minutes = Math.floor(state.currentTime / 60);
        const seconds = state.currentTime % 60;
        timeDisplay.textContent = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;

        const totalTime = state.isWorkSession ? state.workTime :
                         (state.sessionCount % 4 === 0 ? state.longBreak : state.shortBreak);
        const progress = ((totalTime - state.currentTime) / totalTime) * 100;
        progressBar.style.width = `${progress}%`;

        sessionType.textContent = state.isWorkSession ? 'Work Session' :
                                  (state.sessionCount % 4 === 0 ? 'Long Break' : 'Short Break');
        sessionCountDisplay.textContent = `Session ${state.sessionCount}`;

        startBtn.disabled = state.isRunning;
        pauseBtn.disabled = !state.isRunning;
    }

    function getState() {
        chrome.runtime.sendMessage({ action: 'getState' }, (state) => {
            if (state) updateUI(state);
        });
    }

    startBtn.addEventListener('click', () => {
        chrome.runtime.sendMessage({ action: 'startTimer' }, getState);
    });

    pauseBtn.addEventListener('click', () => {
        chrome.runtime.sendMessage({ action: 'pauseTimer' }, getState);
    });

    resetBtn.addEventListener('click', () => {
        chrome.runtime.sendMessage({ action: 'resetTimer' }, getState);
    });

    // Refresh UI every second while popup is open
    setInterval(getState, 1000);

    // Initial load
    getState();

    // Ask notification permission
    if (Notification.permission === 'default') {
        Notification.requestPermission();
    }
});



