// Keep track of timer state
let timerState = {
    workTime: 25 * 60,
    shortBreak: 5 * 60,
    longBreak: 15 * 60,
    currentTime: 25 * 60,
    isRunning: false,
    isWorkSession: true,
    sessionCount: 1,
    totalSessions: 0,
    startTime: null
};

let timerInterval = null;

// Initialize state from storage
chrome.storage.local.get('pomodoroState', (data) => {
    if (data.pomodoroState) {
        timerState = { ...timerState, ...data.pomodoroState };
        
        // If timer was running when extension was closed, resume it
        if (timerState.isRunning && timerState.startTime) {
            const elapsed = Math.floor((Date.now() - timerState.startTime) / 1000);
            timerState.currentTime = Math.max(0, timerState.currentTime - elapsed);
            
            if (timerState.currentTime > 0) {
                startTimer();
            } else {
                completeSession();
            }
        }
        
        updateBadge();
    }
});

// Listen for messages from popup
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    switch (message.action) {
        case 'getState':
            sendResponse(timerState);
            break;
            
        case 'startTimer':
            if (!timerState.isRunning) {
                timerState.isRunning = true;
                timerState.startTime = Date.now();
                startTimer();
                saveState();
                updateBadge();
            }
            sendResponse(timerState);
            break;
            
        case 'pauseTimer':
            if (timerState.isRunning) {
                timerState.isRunning = false;
                timerState.startTime = null;
                stopTimer();
                saveState();
                updateBadge();
            }
            sendResponse(timerState);
            break;
            
        case 'resetTimer':
            resetTimer();
            sendResponse(timerState);
            break;
    }
});

function startTimer() {
    if (timerInterval) clearInterval(timerInterval);
    
    timerInterval = setInterval(() => {
        timerState.currentTime--;
        
        if (timerState.currentTime <= 0) {
            completeSession();
        } else {
            saveState();
            updateBadge();
        }
    }, 1000);
}

function stopTimer() {
    if (timerInterval) {
        clearInterval(timerInterval);
        timerInterval = null;
    }
}

function resetTimer() {
    stopTimer();
    timerState.isRunning = false;
    timerState.startTime = null;
    timerState.currentTime = timerState.isWorkSession ? timerState.workTime : 
                            (timerState.sessionCount % 4 === 0 ? timerState.longBreak : timerState.shortBreak);
    saveState();
    updateBadge();
}

function completeSession() {
    stopTimer();
    showNotification();
    
    if (timerState.isWorkSession) {
        timerState.totalSessions++;
        // Switch to break
        timerState.isWorkSession = false;
        timerState.currentTime = timerState.sessionCount % 4 === 0 ? timerState.longBreak : timerState.shortBreak;
    } else {
        // Switch to work
        timerState.isWorkSession = true;
        timerState.sessionCount++;
        timerState.currentTime = timerState.workTime;
    }
    
    timerState.isRunning = false;
    timerState.startTime = null;
    saveState();
    updateBadge();
}

function showNotification() {
    const title = 'Pomodoro Timer';
    const message = timerState.isWorkSession ? 'Break time! Take a rest.' : 'Work time! Get back to it.';
    
    chrome.notifications.create({
        type: 'basic',
        iconUrl: 'icons/icon48.png',
        title: title,
        message: message,
        priority: 2
    });
    
    // Also play a sound notification
    chrome.tabs.query({active: true, currentWindow: true}, (tabs) => {
        if (tabs[0]) {
            chrome.tabs.sendMessage(tabs[0].id, {action: 'playSound'}).catch(() => {
                // Tab might not have our content script, that's ok
            });
        }
    });
}

function saveState() {
    chrome.storage.local.set({ pomodoroState: timerState });
}

function updateBadge() {
    const minutes = Math.floor(timerState.currentTime / 60);
    const badgeText = timerState.isRunning ? minutes.toString() : '';
    const badgeColor = timerState.isWorkSession ? '#ff6b6b' : '#4ecdc4';
    
    chrome.action.setBadgeText({ text: badgeText });
    chrome.action.setBadgeBackgroundColor({ color: badgeColor });
}

// Update badge every minute when running
setInterval(() => {
    if (timerState.isRunning) {
        updateBadge();
    }
}, 60000);