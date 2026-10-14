// ==========================================
// 1. AUTHENTICATION & USER MANAGEMENT
// ==========================================
let currentUser = null;
let completedModules = new Set();
let watchedVideos = { 1: new Set(), 2: new Set(), 3: new Set() };
let currentLanguage = 'en';
let authMode = 'login';
let currentAiTargetWord = "Doctor";

function initAuth() {
  const session = localStorage.getItem('signlingo_user');
  if (session) {
    currentUser = JSON.parse(session);
    document.getElementById('auth-modal').classList.add('auth-hidden');
    document.getElementById('header-user-name').innerText = currentUser.name.split(' ')[0];
    loadUserProgress();
  } else {
    document.getElementById('auth-modal').classList.remove('auth-hidden');
  }
  const savedTheme = localStorage.getItem('signlingo_theme');
  if (savedTheme === 'dark') {
    document.body.classList.add('dark-mode');
  }
}

function toggleAuthMode(mode) {
  authMode = mode;
  const isSignup = mode === 'signup';
  document.getElementById('tab-login-btn').classList.toggle('active', !isSignup);
  document.getElementById('tab-signup-btn').classList.toggle('active', isSignup);
  document.getElementById('signup-extra-fields').style.display = isSignup ? 'block' : 'none';
  const t = translations[currentLanguage];
  document.getElementById('auth-submit-btn').innerText = isSignup ? t.authCreateBtn : t.authSignInBtn;
  document.getElementById('auth-subtitle').innerText = isSignup ? t.authSubtitleSignup : t.authSubtitleLogin;
  document.getElementById('auth-error-msg').style.display = 'none';
}

function handleAuthSubmit(e) {
  e.preventDefault();
  const email = document.getElementById('auth-email').value.trim().toLowerCase();
  const password = document.getElementById('auth-password').value.trim();
  const errorBox = document.getElementById('auth-error-msg');
  errorBox.style.display = 'none';
  let users = JSON.parse(localStorage.getItem('signlingo_registered_users') || '{}');

  if (authMode === 'signup') {
    const name = document.getElementById('auth-name').value.trim() || 'Student';
    if (users[email]) {
      errorBox.innerText = 'Account with this email already exists.';
      errorBox.style.display = 'block';
      return;
    }
    users[email] = { name, email, password, modules: [], watched: { 1: [], 2: [], 3: [] } };
    localStorage.setItem('signlingo_registered_users', JSON.stringify(users));
    currentUser = { name, email };
    localStorage.setItem('signlingo_user', JSON.stringify(currentUser));
    document.getElementById('auth-modal').classList.add('auth-hidden');
    document.getElementById('header-user-name').innerText = name.split(' ')[0];
    loadUserProgress();
  } else {
    if (!users[email] || users[email].password !== password) {
      errorBox.innerText = 'Invalid email or password.';
      errorBox.style.display = 'block';
      return;
    }
    currentUser = { name: users[email].name, email };
    localStorage.setItem('signlingo_user', JSON.stringify(currentUser));
    document.getElementById('auth-modal').classList.add('auth-hidden');
    document.getElementById('header-user-name').innerText = currentUser.name.split(' ')[0];
    loadUserProgress();
  }
}

function logoutUser() {
  if (confirm("Do you want to log out?")) {
    localStorage.removeItem('signlingo_user');
    location.reload();
  }
}

function loadUserProgress() {
  if (!currentUser) return;
  const users = JSON.parse(localStorage.getItem('signlingo_registered_users') || '{}');
  const record = users[currentUser.email];
  if (record) {
    if (record.modules) completedModules = new Set(record.modules);
    if (record.watched) {
      watchedVideos[1] = new Set(record.watched[1] || []);
      watchedVideos[2] = new Set(record.watched[2] || []);
      watchedVideos[3] = new Set(record.watched[3] || []);
      restoreWatchCheckboxes();
      updateProgressUI();
    }
  }
}

function saveUserProgress() {
  if (!currentUser) return;
  let users = JSON.parse(localStorage.getItem('signlingo_registered_users') || '{}');
  if (users[currentUser.email]) {
    users[currentUser.email].modules = Array.from(completedModules);
    users[currentUser.email].watched = {
      1: Array.from(watchedVideos[1]),
      2: Array.from(watchedVideos[2]),
      3: Array.from(watchedVideos[3])
    };
    localStorage.setItem('signlingo_registered_users', JSON.stringify(users));
  }
}

function restoreWatchCheckboxes() {
  for (let m = 1; m <= 3; m++) {
    for (let v = 1; v <= 3; v++) {
      const el = document.getElementById(`watch-m${m}-v${v}`);
      if (el) el.checked = watchedVideos[m].has(v);
      checkModuleVideos(m, false);
    }
  }
}

function checkModuleVideos(modNum, shouldSave = true) {
  const v1 = document.getElementById(`watch-m${modNum}-v1`)?.checked;
  const v2 = document.getElementById(`watch-m${modNum}-v2`)?.checked;
  const v3 = document.getElementById(`watch-m${modNum}-v3`)?.checked;
  watchedVideos[modNum].clear();
  if (v1) watchedVideos[modNum].add(1);
  if (v2) watchedVideos[modNum].add(2);
  if (v3) watchedVideos[modNum].add(3);
  const allWatched = v1 && v2 && v3;
  const testBtn = document.getElementById(`mod${modNum}-test-btn`);
  const lockBanner = document.getElementById(`mod${modNum}-lock-banner`);
  if (testBtn) testBtn.disabled = !allWatched;
  if (lockBanner) lockBanner.style.display = allWatched ? 'none' : 'flex';
  if (shouldSave) saveUserProgress();
}

// ==========================================
// 2. DAILY STREAK & NAVIGATION
// ==========================================
function initStreak() {
  const today = new Date().toDateString();
  const lastLogin = localStorage.getItem('isl_last_login');
  let streak = parseInt(localStorage.getItem('isl_streak') || '1', 10);
  if (lastLogin) {
    const yesterday = new Date(Date.now() - 86400000).toDateString();
    if (lastLogin === yesterday) {
      streak += 1;
      localStorage.setItem('isl_streak', streak);
    } else if (lastLogin !== today) {
      streak = 1;
      localStorage.setItem('isl_streak', '1');
    }
  }
  localStorage.setItem('isl_last_login', today);
  const badge = document.getElementById('streak-days');
  if (badge) badge.innerText = streak;
}

function switchView(viewId) {
  document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
  const target = document.getElementById(viewId);
  if (target) target.classList.add('active');
  document.querySelectorAll('.top-nav-tabs .tab-btn').forEach(btn => {
    btn.classList.remove('active');
  });
  const navMap = {
    'dashboard': 'nav-modules-btn',
    'triage-terminal-view': 'nav-triage-btn',
    'ai-practice-view': 'nav-camera-btn',
    'drill-view': 'nav-drill-btn',
    'game-view': 'nav-game-btn',
    'dictionary-view': 'nav-dict-btn',
    'flashcard-view': 'nav-flash-btn',
    'exam-section': 'nav-exam-btn',
    'result-view': 'nav-cert-btn',
    'verify-view': 'nav-verify-btn'
  };
  if (navMap[viewId]) {
    const activeBtn = document.getElementById(navMap[viewId]);
    if (activeBtn) activeBtn.classList.add('active');
  }
  window.scrollTo(0, 0);
}

function openModule(viewId) { switchView(viewId); }

function updateProgressUI() {
  const count = completedModules.size;
  const percentage = Math.round((count / 3) * 100);
  const fill = document.getElementById('main-progress-fill');
  if (fill) fill.style.width = percentage + '%';
  const progressContainer = document.querySelector('.progress-bar-container');
  if (progressContainer) progressContainer.setAttribute('aria-valuenow', percentage);
  const t = translations[currentLanguage];
  const compText = document.getElementById('modules-completed-text');
  if (compText) compText.innerText = `${count} ${t.modulesPassedCount}`;
  const highProg = document.getElementById('highlight-prog');
  if (highProg) highProg.innerText = `${percentage}% ${t.progressText}`;

  for (let m = 1; m <= 3; m++) {
    const pill = document.getElementById(`mod${m}-status-pill`);
    const badge = document.getElementById(`mod${m}-badge`);
    if (completedModules.has(m)) {
      if (pill) { pill.innerText = t.passedStatus; pill.style.background = "#c6f6d5"; pill.style.color = "#22543d"; }
      if (badge) { badge.innerHTML = "✓"; badge.style.background = "#38a169"; badge.style.color = "#ffffff"; }
    } else {
      if (pill) { pill.innerText = t.startBtn; }
    }
  }

  const examBtn = document.getElementById('exam-card-btn');
  const examDesc = document.getElementById('exam-card-status-desc');
  if (count === 3) {
    if (examBtn) { examBtn.innerText = t.unlockedStatus; examBtn.style.background = "#38a169"; }
    if (examDesc) examDesc.innerText = t.examUnlockedDesc;
  } else {
    if (examBtn) { examBtn.innerText = t.lockedStatus; examBtn.style.background = "#feebc8"; }
    if (examDesc) examDesc.innerText = `${t.examLockedDesc} (${count}/3)`;
  }
}

function toggleSlowMo(iframeId, speed) {
  const iframe = document.getElementById(iframeId);
  if (iframe && iframe.contentWindow) {
    iframe.contentWindow.postMessage(JSON.stringify({ event: 'command', func: 'setPlaybackRate', args: [speed] }), '*');
  }
}

function replayTenSeconds(iframeId) {
  const iframe = document.getElementById(iframeId);
  if (iframe && iframe.contentWindow) {
    iframe.contentWindow.postMessage(JSON.stringify({ event: 'command', func: 'seekTo', args: [-10, false] }), '*');
  }
}

// ==========================================
// 3. MULTI-SIGN AI RECOGNITION MATRIX
// ==========================================
let camera = null;
let hands = null;
const motionTrajectoryBuffer = [];
const BUFFER_CAPACITY = 20;

function dist(p1, p2) {
  return Math.sqrt(Math.pow(p1.x - p2.x, 2) + Math.pow(p1.y - p2.y, 2));
}

function analyzeDynamicMotionTrajectory(wristLandmark) {
  motionTrajectoryBuffer.push({ x: wristLandmark.x, y: wristLandmark.y, t: performance.now() });
  if (motionTrajectoryBuffer.length > BUFFER_CAPACITY) motionTrajectoryBuffer.shift();
  if (motionTrajectoryBuffer.length === BUFFER_CAPACITY) {
    const deltaY = motionTrajectoryBuffer[BUFFER_CAPACITY - 1].y - motionTrajectoryBuffer[0].y;
    const deltaX = motionTrajectoryBuffer[BUFFER_CAPACITY - 1].x - motionTrajectoryBuffer[0].x;
    if (deltaY < -0.10 && Math.abs(deltaX) < 0.12) return "Upward Lift Trajectory";
    if (Math.abs(deltaX) > 0.12) return "Lateral Oscillating Wave";
    return null;
  }
}

function evaluateSpecificSign(targetWord, multiHandLandmarks) {
  if (!multiHandLandmarks || multiHandLandmarks.length === 0) {
    return { name: "No Hands Detected", status: "Please position your hands in view.", score: 0, valid: false };
  }
  const handCount = multiHandLandmarks.length;
  const handA = multiHandLandmarks[0];
  const handB = multiHandLandmarks[1] || null;
  const wristA = handA[0];
  const thumbTipA = handA[4];
  const indexTipA = handA[8];
  const middleTipA = handA[12];
  const ringTipA = handA[16];
  const pinkyTipA = handA[20];
  const indexPipA = handA[6];
  const middlePipA = handA[10];
  const ringPipA = handA[14];
  const pinkyPipA = handA[18];
  const isIndexExtA = dist(indexTipA, wristA) > dist(indexPipA, wristA) * 1.15;
  const isMiddleExtA = dist(middleTipA, wristA) > dist(middlePipA, wristA) * 1.15;
  const isRingExtA = dist(ringTipA, wristA) > dist(ringPipA, wristA) * 1.15;
  const isPinkyExtA = dist(pinkyTipA, wristA) > dist(pinkyPipA, wristA) * 1.15;
  const isThumbUpA = thumbTipA.y < handA[3].y && thumbTipA.y < indexPipA.y;
  const motionA = analyzeDynamicMotionTrajectory(wristA);
  const cleanTarget = targetWord.toLowerCase().trim();

  // Two-Hand Gestures
  if (cleanTarget.includes("doctor") || cleanTarget.includes("pulse") || cleanTarget.includes("डॉक्टर")) {
    if (handCount < 2) return { name: "Doctor", status: "Place both hands in frame. Use dominant index & middle to tap inner wrist.", score: 40, valid: false };
    const indexToWrist = Math.min(dist(handA[8], handB[0]), dist(handB[8], handA[0]));
    if (indexToWrist < 0.20) {
      return { name: "Doctor (Verified)", status: "Pulse point tap verified!", score: 100, valid: true };
    }
    return { name: "Doctor", status: "Bring tapping fingers closer to opposite inner wrist.", score: 65, valid: false };
  }

  if (cleanTarget.includes("help") || cleanTarget.includes("मदत") || cleanTarget.includes("मदद")) {
    if (handCount < 2) return { name: "Help", status: "Place thumb-up fist on flat palm and lift upward together.", score: 35, valid: false };
    const palmToPalm = dist(handA[9], handB[9]);
    if (palmToPalm < 0.25) {
      if (motionA === "Upward Lift Trajectory") {
        return { name: "Help (Kinetic Execution)", status: "Upward lift movement verified!", score: 100, valid: true };
      }
      return { name: "Help", status: "Now lift both hands upward smoothly together.", score: 75, valid: false };
    }
    return { name: "Help", status: "Place fist on flat opposite palm.", score: 50, valid: false };
  }

  if (cleanTarget.includes("emergency") || cleanTarget.includes("आपातकाल") || cleanTarget.includes("आणीबाणी")) {
    if (motionA === "Lateral Oscillating Wave") {
      return { name: "Emergency (Verified)", status: "Dynamic oscillating twist verified!", score: 100, valid: true };
    }
    return { name: "Emergency", status: "Twist your hand rapidly side-to-side across the chest.", score: 60, valid: false };
  }

  if (cleanTarget.includes("hospital") || cleanTarget.includes("अस्पताल") || cleanTarget.includes("रुग्णालय")) {
    if (isIndexExtA && !isMiddleExtA && !isRingExtA && !isPinkyExtA) {
      return { name: "Hospital (Tracing Cross)", status: "Index shape detected! Trace cross on upper shoulder/arm.", score: 95, valid: true };
    }
    return { name: "Hospital", status: "Extend index finger to draw cross on upper shoulder/arm.", score: 55, valid: false };
  }

  if (cleanTarget.includes("water") || cleanTarget.includes("पानी") || cleanTarget.includes("पाणी")) {
    if (isIndexExtA && isMiddleExtA && isRingExtA && !isPinkyExtA) {
      return { name: "Water (W-Shape)", status: "W-Handshape verified near chin!", score: 100, valid: true };
    }
    return { name: "Water", status: "Form 'W' shape (extend index, middle, ring) and tap near chin.", score: 60, valid: false };
  }

  if (cleanTarget.includes("pain") || cleanTarget.includes("दर्द") || cleanTarget.includes("वेदना")) {
    if (isIndexExtA) {
      return { name: "Pain (Twist Index)", status: "Index shape detected! Point toward affected body area and twist.", score: 90, valid: true };
    }
    return { name: "Pain", status: "Extend index fingers and twist toward the affected area.", score: 50, valid: false };
  }

  if (cleanTarget.includes("heart attack") || cleanTarget.includes("cardiac") || cleanTarget.includes("हृदयविकार")) {
    if (!isIndexExtA && !isMiddleExtA && !isRingExtA && !isPinkyExtA) {
      return { name: "Heart Attack", status: "Clenched fist over left chest verified!", score: 100, valid: true };
    }
    return { name: "Heart Attack", status: "Clench fist tightly over left chest area.", score: 60, valid: false };
  }

  if (cleanTarget.includes("fever") || cleanTarget.includes("ताप") || cleanTarget.includes("बुखार")) {
    if (isIndexExtA && isMiddleExtA && isRingExtA && isPinkyExtA) {
      return { name: "Fever Check", status: "Flat palm on forehead gesture verified!", score: 95, valid: true };
    }
    return { name: "Fever", status: "Place back of open flat hand against forehead.", score: 55, valid: false };
  }

  if (cleanTarget.includes("stomach ache") || cleanTarget.includes("पोटदुखी") || cleanTarget.includes("पेट दर्द")) {
    if (isIndexExtA && isMiddleExtA && isRingExtA && isPinkyExtA) {
      return { name: "Stomach Ache", status: "Flat open hand detected! Rub clockwise over abdomen.", score: 95, valid: true };
    }
    return { name: "Stomach Ache", status: "Open palm flat and rotate over stomach area.", score: 50, valid: false };
  }

  if (cleanTarget.includes("blood pressure")) {
    if (handCount >= 1) {
      return { name: "Blood Pressure", status: "Squeeze and pump upper arm cuff motion.", score: 85, valid: true };
    }
  }

  if (isIndexExtA && isMiddleExtA && isRingExtA && isPinkyExtA) {
    return { name: `${targetWord} (Open Form)`, status: "Clean open hand formation verified.", score: 90, valid: true };
  }
  if (isThumbUpA && !isIndexExtA && !isMiddleExtA && !isRingExtA && !isPinkyExtA) {
    return { name: `${targetWord} (Thumb Base)`, status: "Thumbs-up foundation recognized.", score: 85, valid: true };
  }
  if (isIndexExtA && !isMiddleExtA && !isRingExtA && !isPinkyExtA) {
    return { name: `${targetWord} (Locator Form)`, status: "Index extension trajectory verified.", score: 85, valid: true };
  }
  if (isIndexExtA && isMiddleExtA && !isRingExtA && !isPinkyExtA) {
    return { name: `${targetWord} (V/Two Form)`, status: "Two-finger V separation verified.", score: 85, valid: true };
  }
  if (!isIndexExtA && !isMiddleExtA && !isRingExtA && !isPinkyExtA) {
    return { name: `${targetWord} (Closed Form)`, status: "Closed fist structure verified.", score: 85, valid: true };
  }

  return { name: "Tracking Hand...", status: "Refining landmarks for target gesture...", score: 35, valid: false };
}

function populateAiSignSelector() {
  const selector = document.getElementById('ai-sign-selector');
  if (!selector) return;
  const list = islDictionaryData[currentLanguage] || islDictionaryData['en'];
  selector.innerHTML = list.map(item => `
    <option value="${item.word}">${item.word} (${item.category})</option>
  `).join('');
  selector.value = currentAiTargetWord;
  updateAiTargetCard();
}

function changeAiTargetSign(word) {
  currentAiTargetWord = word;
  updateAiTargetCard();
}

function pickRandomAiTarget() {
  const list = islDictionaryData[currentLanguage] || islDictionaryData['en'];
  const randomItem = list[Math.floor(Math.random() * list.length)];
  currentAiTargetWord = randomItem.word;
  const selector = document.getElementById('ai-sign-selector');
  if (selector) selector.value = currentAiTargetWord;
  updateAiTargetCard();
}

function updateAiTargetCard() {
  const list = islDictionaryData[currentLanguage] || islDictionaryData['en'];
  const item = list.find(w => w.word.toLowerCase() === currentAiTargetWord.toLowerCase()) || list[0];
  if (!item) return;
  const titleEl = document.getElementById('ai-target-word-title');
  const catEl = document.getElementById('ai-target-cat-badge');
  const instEl = document.getElementById('ai-target-instruction-text');
  if (titleEl) titleEl.innerText = item.word;
  if (catEl) catEl.innerText = item.category;
  if (instEl) instEl.innerHTML = `<strong>Instructions:</strong> ${item.desc}`;
}

function practiceSpecificSignFromDict(word) {
  currentAiTargetWord = word;
  switchView('ai-practice-view');
  populateAiSignSelector();
  startCamera();
}

function startCamera() {
  const videoElement = document.getElementById('webcam-input');
  const canvasElement = document.getElementById('camera-output-canvas');
  if (!videoElement || !canvasElement) return;
  const canvasCtx = canvasElement.getContext('2d');
  const feedbackBadge = document.getElementById('ai-feedback-badge');
  const detailsBadge = document.getElementById('ai-detected-details');
  const scoreText = document.getElementById('ai-match-score-text');
  const scoreBar = document.getElementById('ai-score-bar-fill');

  if (!hands) {
    hands = new Hands({
      locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`
    });
    hands.setOptions({
      maxNumHands: 2,
      modelComplexity: 1,
      minDetectionConfidence: 0.55,
      minTrackingConfidence: 0.55
    });
  }

  hands.onResults((results) => {
    canvasCtx.save();
    canvasCtx.clearRect(0, 0, canvasElement.width, canvasElement.height);
    canvasElement.width = videoElement.videoWidth || 520;
    canvasElement.height = videoElement.videoHeight || 390;

    if (results.multiHandLandmarks && results.multiHandLandmarks.length > 0) {
      const evaluation = evaluateSpecificSign(currentAiTargetWord, results.multiHandLandmarks);
      feedbackBadge.innerText = evaluation.name;
      feedbackBadge.className = evaluation.valid ? 'feedback-detected' : 'feedback-neutral';
      detailsBadge.innerHTML = `<strong>Pose Evaluation:</strong> ${evaluation.status}`;
      if (scoreText) scoreText.innerText = `${evaluation.score}%`;
      if (scoreBar) {
        scoreBar.style.width = `${evaluation.score}%`;
        scoreBar.style.background = evaluation.valid ? '#38a169' : '#3182ce';
      }
      for (const handLandmarks of results.multiHandLandmarks) {
        if (window.drawConnectors && window.HAND_CONNECTIONS) {
          drawConnectors(canvasCtx, handLandmarks, HAND_CONNECTIONS, { color: '#00FF88', lineWidth: 3 });
        }
        if (window.drawLandmarks) {
          drawLandmarks(canvasCtx, handLandmarks, { color: '#FF3366', lineWidth: 1, radius: 4 });
        }
      }
    } else {
      feedbackBadge.innerText = 'Searching for hand gestures...';
      feedbackBadge.className = 'feedback-neutral';
      detailsBadge.innerText = `Perform sign for "${currentAiTargetWord}".`;
      if (scoreText) scoreText.innerText = `0%`;
      if (scoreBar) scoreBar.style.width = `0%`;
    }
    canvasCtx.restore();
  });

  if (!camera) {
    camera = new Camera(videoElement, {
      onFrame: async () => {
        if (hands) await hands.send({ image: videoElement });
      },
      width: 520,
      height: 390
    });
    camera.start();
  }
}

function stopCamera() {
  if (camera) {
    camera.stop();
    camera = null;
  }
}

// ==========================================
// 4. BEAT-THE-CLOCK SPEED DRILL
// ==========================================
const drillSignDatabase = [
  { name: "Doctor", svg: `<svg width="90" height="90" viewBox="0 0 120 120"><rect x="15" y="65" width="85" height="28" rx="8" fill="#e2e8f0" stroke="#718096" stroke-width="2"/><circle cx="45" cy="79" r="6" fill="#feb2b2" stroke="#e53e3e" stroke-width="1.5"/><path d="M 40 20 L 40 70 M 50 20 L 50 70 M 58 45 L 68 55" stroke="#2b6cb0" stroke-width="6" stroke-linecap="round"/></svg>`, distractors: ["Hospital", "Pharmacy", "Ambulance"] },
  { name: "Hospital", svg: `<svg width="90" height="90" viewBox="0 0 120 120"><path d="M 25 30 Q 55 15 95 30 L 85 95 Q 55 105 25 95 Z" fill="#ebf8ff" stroke="#3182ce" stroke-width="2"/><line x1="60" y1="35" x2="60" y2="85" stroke="#e53e3e" stroke-width="6" stroke-linecap="round"/><line x1="38" y1="58" x2="82" y2="58" stroke="#e53e3e" stroke-width="6" stroke-linecap="round"/></svg>`, distractors: ["Clinic", "Doctor", "Ward"] },
  { name: "Help", svg: `<svg width="90" height="90" viewBox="0 0 120 120"><rect x="20" y="80" width="80" height="14" rx="7" fill="#cbd5e0" stroke="#4a5568" stroke-width="2"/><rect x="42" y="48" width="36" height="32" rx="6" fill="#feebc8" stroke="#dd6b20" stroke-width="2"/><path d="M 50 48 L 50 25 Q 50 18 57 18 Q 64 18 64 25 L 64 48" fill="#feebc8" stroke="#dd6b20" stroke-width="2"/></svg>`, distractors: ["Emergency", "Pain", "Discharge"] },
  { name: "Emergency", svg: `<svg width="90" height="90" viewBox="0 0 120 120"><rect x="35" y="30" width="48" height="50" rx="8" fill="#fed7d7" stroke="#c53030" stroke-width="2"/><line x1="38" y1="42" x2="72" y2="42" stroke="#c53030" stroke-width="4" stroke-linecap="round"/><line x1="38" y1="54" x2="72" y2="54" stroke="#c53030" stroke-width="4" stroke-linecap="round"/><line x1="38" y1="66" x2="72" y2="66" stroke="#c53030" stroke-width="4" stroke-linecap="round"/></svg>`, distractors: ["Fever", "Accident", "Help"] },
  { name: "Water", svg: `<svg width="90" height="90" viewBox="0 0 120 120"><path d="M 20 20 Q 20 75 60 85 Q 85 85 95 65" fill="none" stroke="#a0aec0" stroke-width="2" stroke-dasharray="4,4"/><line x1="45" y1="75" x2="40" y2="25" stroke="#3182ce" stroke-width="5" stroke-linecap="round"/><line x1="55" y1="75" x2="55" y2="20" stroke="#3182ce" stroke-width="5" stroke-linecap="round"/><line x1="65" y1="75" x2="70" y2="25" stroke="#3182ce" stroke-width="5" stroke-linecap="round"/></svg>`, distractors: ["Food", "Glucose", "Syrup"] },
  { name: "Pain", svg: `<svg width="90" height="90" viewBox="0 0 120 120"><path d="M 15 60 L 45 60" stroke="#c53030" stroke-width="6" stroke-linecap="round"/><path d="M 105 60 L 75 60" stroke="#c53030" stroke-width="6" stroke-linecap="round"/><circle cx="60" cy="60" r="4" fill="#c53030"/></svg>`, distractors: ["Headache", "Swelling", "Fracture"] },
  { name: "Ambulance", svg: `<svg width="90" height="90" viewBox="0 0 120 120"><rect x="20" y="45" width="80" height="40" rx="8" fill="#ebf8ff" stroke="#3182ce" stroke-width="3"/><path d="M 50 20 L 70 45 M 70 20 L 50 45" stroke="#e53e3e" stroke-width="5" stroke-linecap="round"/><circle cx="40" cy="90" r="10" fill="#4a5568"/><circle cx="80" cy="90" r="10" fill="#4a5568"/></svg>`, distractors: ["Stretcher", "Wheelchair", "Emergency"] },
  { name: "Blood Pressure", svg: `<svg width="90" height="90" viewBox="0 0 120 120"><rect x="30" y="35" width="60" height="50" rx="10" fill="#fed7d7" stroke="#e53e3e" stroke-width="3"/><path d="M 60 20 L 60 35 M 40 60 L 80 60" stroke="#c53030" stroke-width="4"/><circle cx="60" cy="60" r="14" fill="#ffffff" stroke="#c53030" stroke-width="2"/></svg>`, distractors: ["Heart Attack", "Pulse", "Anemia"] },
  { name: "Fever", svg: `<svg width="90" height="90" viewBox="0 0 120 120"><circle cx="60" cy="50" r="30" fill="#feebc8" stroke="#dd6b20" stroke-width="2"/><path d="M 40 45 Q 60 25 80 45" stroke="#dd6b20" stroke-width="4" fill="none"/><rect x="52" y="85" width="16" height="25" rx="8" fill="#e53e3e"/></svg>`, distractors: ["Headache", "Cold", "Burn"] },
  { name: "Stomach Ache", svg: `<svg width="90" height="90" viewBox="0 0 120 120"><circle cx="60" cy="60" r="38" fill="#faf5ff" stroke="#805ad5" stroke-width="3"/><path d="M 45 60 A 15 15 0 1 1 75 60 A 15 15 0 1 1 45 60" stroke="#805ad5" stroke-width="4" fill="none" stroke-dasharray="6,4"/></svg>`, distractors: ["Acidity", "Ulcer", "Constipation"] }
];

let drillTimerInterval = null;
let drillTimeLeft = 60;
let drillCurrentScore = 0;
let currentDrillTarget = null;
let availableDrillIndices = [];

function initSpeedDrill() {
  drillCurrentScore = 0;
  drillTimeLeft = 60;
  const highScore = localStorage.getItem('signlingo_drill_high') || 0;
  document.getElementById('drill-high-score').innerText = highScore;
  document.getElementById('drill-score').innerText = drillCurrentScore;
  document.getElementById('drill-timer').innerText = drillTimeLeft;
  startSpeedDrill();
}

function startSpeedDrill() {
  clearInterval(drillTimerInterval);
  drillCurrentScore = 0;
  drillTimeLeft = 60;
  availableDrillIndices = Array.from({ length: drillSignDatabase.length }, (_, i) => i);
  document.getElementById('drill-score').innerText = 0;
  document.getElementById('drill-timer').innerText = 60;
  document.getElementById('drill-active-box').style.display = 'block';
  document.getElementById('drill-gameover-box').style.display = 'none';
  renderNextDrillQuestion();
  drillTimerInterval = setInterval(() => {
    drillTimeLeft--;
    document.getElementById('drill-timer').innerText = drillTimeLeft;
    if (drillTimeLeft <= 0) {
      endSpeedDrill();
    }
  }, 1000);
}

function stopSpeedDrill() {
  clearInterval(drillTimerInterval);
}

function renderNextDrillQuestion() {
  if (availableDrillIndices.length === 0) {
    availableDrillIndices = Array.from({ length: drillSignDatabase.length }, (_, i) => i);
  }
  const randomPick = Math.floor(Math.random() * availableDrillIndices.length);
  const selectedIdx = availableDrillIndices.splice(randomPick, 1)[0];
  currentDrillTarget = drillSignDatabase[selectedIdx];
  document.getElementById('drill-svg-container').innerHTML = currentDrillTarget.svg;
  const allOptions = [currentDrillTarget.name, ...currentDrillTarget.distractors].sort(() => 0.5 - Math.random());
  const optionsGrid = document.getElementById('drill-options-grid');
  optionsGrid.innerHTML = allOptions.map(opt => `
    <button class="drill-opt-btn" onclick="submitDrillAnswer('${opt}')">${opt}</button>
  `).join('');
}

function submitDrillAnswer(selectedAnswer) {
  if (drillTimeLeft <= 0) return;
  if (selectedAnswer === currentDrillTarget.name) {
    drillCurrentScore += 10;
  } else {
    drillCurrentScore = Math.max(0, drillCurrentScore - 5);
  }
  document.getElementById('drill-score').innerText = drillCurrentScore;
  renderNextDrillQuestion();
}

function endSpeedDrill() {
  clearInterval(drillTimerInterval);
  document.getElementById('drill-active-box').style.display = 'none';
  document.getElementById('drill-gameover-box').style.display = 'block';
  const t = translations[currentLanguage];
  document.getElementById('drill-final-score-text').innerText = `${t.earnedScoreText} ${drillCurrentScore} ${t.pointsText}!`;
  const savedHigh = parseInt(localStorage.getItem('signlingo_drill_high') || '0', 10);
  if (drillCurrentScore > savedHigh) {
    localStorage.setItem('signlingo_drill_high', drillCurrentScore);
    document.getElementById('drill-high-score').innerText = drillCurrentScore;
    if (typeof confetti === 'function') confetti({ particleCount: 120, spread: 80, origin: { y: 0.6 } });
  }
}

// ==========================================
// 5. CLINICAL SCENARIOS
// ==========================================
const clinicalScenarios = [
  {
    id: 1,
    title: "Triage Scenario 1: Acute Chest Pain",
    patientSigns: "Patient points to left chest area, shows clenched fist, and gasps for breath with strained facial expression.",
    options: [
      { text: "Heart Attack / Cardiac Emergency (Call Cardiologist)", correct: true },
      { text: "Minor Headache (Dispense Paracetamol)", correct: false },
      { text: "Routine Eye Checkup (Schedule Cataract Test)", correct: false }
    ],
    explanation: "Clenching fist over the left chest accompanied by severe Non-Manual Markers (NMMs) indicates a cardiac emergency in ISL medical protocol."
  },
  {
    id: 2,
    title: "Triage Scenario 2: Trauma Case",
    patientSigns: "Patient crosses fingers rapidly like flashing lights and points to an open bleeding wound on forearm.",
    options: [
      { text: "Emergency Ambulance & Sterile Bandage Incision Care", correct: true },
      { text: "Schedule Routine Dental Appointment", correct: false },
      { text: "Check Blood Glucose with Sweet Solution", correct: false }
    ],
    explanation: "Crossing index fingers over head denotes Emergency/Ambulance, requiring immediate trauma intervention."
  }
];

let currentScenarioIndex = 0;

function renderClinicalSimulations() {
  const container = document.getElementById('clinical-sim-container');
  if (!container) return;
  const sim = clinicalScenarios[currentScenarioIndex];
  const t = translations[currentLanguage];
  container.innerHTML = `
    <div style="margin-bottom: 0.5rem;">
      <h3 style="color: #2b6cb0; margin: 0;">${sim.title}</h3>
    </div>
    <div style="background: #ebf8ff; border-left: 4px solid #3182ce; padding: 1rem; border-radius: 8px; margin-bottom: 1rem;">
      <strong>${t.observedSignLabel}:</strong><br>${sim.patientSigns}
    </div>
    <p style="font-weight: 600; margin-bottom: 0.75rem;">${t.selectResponsePrompt}:</p>
    <div style="display: flex; flex-direction: column; gap: 0.6rem;">
      ${sim.options.map((opt, idx) => `
        <button onclick="handleSimChoice(${idx})" style="text-align: left; background: #edf2f7; color: #2d3748; padding: 0.75rem 1rem; border-radius: 10px; margin-top: 0; font-size: 0.9rem;">
          ${opt.text}
        </button>
      `).join('')}
    </div>
    <div id="sim-feedback" style="margin-top: 1rem; display: none;"></div>
  `;
}

function handleSimChoice(choiceIdx) {
  const sim = clinicalScenarios[currentScenarioIndex];
  const feedback = document.getElementById('sim-feedback');
  const isCorrect = sim.options[choiceIdx].correct;
  feedback.style.display = 'block';
  const t = translations[currentLanguage];
  if (isCorrect) {
    if (typeof confetti === 'function') confetti({ particleCount: 50, spread: 60, origin: { y: 0.7 } });
    feedback.innerHTML = `
      <div style="background: #f0fff4; border: 1px solid #c6f6d5; padding: 1rem; border-radius: 10px; color: #276749;">
        <strong>${t.correctResponseTitle}</strong><br>${sim.explanation}
        <button onclick="nextClinicalScenario()" style="display: block; margin-top: 0.75rem; background: #38a169;">${t.nextScenarioBtn} →</button>
      </div>`;
  } else {
    feedback.innerHTML = `
      <div style="background: #fff5f5; border: 1px solid #fed7d7; padding: 1rem; border-radius: 10px; color: #9b2c2c;">
        <strong>${t.incorrectDiagnosisTitle}</strong> ${t.incorrectDiagnosisDesc}
      </div>`;
  }
}

function nextClinicalScenario() {
  currentScenarioIndex = (currentScenarioIndex + 1) % clinicalScenarios.length;
  renderClinicalSimulations();
}

// ==========================================
// 6. TRANSLATIONS & FULL MULTILINGUAL DICTIONARY
// ==========================================
const translations = {
  en: {
    brandTitle: "SignLingo ISL",
    subtitle: "INDIAN SIGN LANGUAGE STUDIO",
    streakDayLabel: "Day Streak",
    authSubtitleLogin: "Login to save your modules, track streak & earn certificates",
    authSubtitleSignup: "Create your profile to save modules & earn certificates",
    authSignInBtn: "Sign In",
    authCreateBtn: "Create Account",
    authLabelName: "Full Name",
    authLabelEmail: "Email Address",
    authLabelPassword: "Password",
    modulesTab: "📖 Modules",
    aiTab: "🤖 AI Hand Studio",
    drillTab: "🎮 Clinical Drills",
    gameTab: "⚡ Speed Challenge",
    dictTab: "📚 Dictionary",
    flashTab: "⚡ Flashcards",
    examTab: "📝 Final Exam",
    certTab: "🏆 Certificate",
    verifyTab: "🔍 Verify",
    heroBadge: "ISL CURRICULUM",
    heroTitle: "Interactive ISL Studio",
    heroDesc: "Master Indian Sign Language with structured modules, real-time two-hand AI gesture tracking, and verified certificates.",
    modulesPassedCount: "of 3 Modules passed",
    progressText: "Progress",
    shortcutAiTitle: "Two-Hand AI Motion Studio",
    shortcutAiDesc: "Live kinetic tracking & temporal trajectory analysis",
    shortcutGameTitle: "Beat-the-Clock Speed Drill",
    shortcutGameDesc: "60-second rapid emergency sign recognition",
    shortcutDrillTitle: "Clinical Scenario Simulation",
    shortcutDrillDesc: "Emergency triage patient diagnosis",
    shortcutFlashTitle: "Flashcards",
    shortcutFlashDesc: "Rapid memory retention deck",
    curriculumHeading: "Curriculum Modules",
    mod1Title: "Module 1: Foundations & Theory",
    mod1Desc: "History, alphabets, basic greetings, and core ISL theory",
    mod2Title: "Module 2: Situational Communication",
    mod2Desc: "Hospital, medical terminology, and emergency signs",
    mod3Title: "Module 3: Advanced Sentences & Numbers",
    mod3Desc: "Advanced sentences, numerical structures, and video tutorials",
    examCardTitle: "Final Cryptographic Examination & Certification",
    examUnlockedDesc: "All module tests passed. Ready for certification examination!",
    examLockedDesc: "Complete all 3 Module Clinical Tests to unlock the final certification exam",
    startBtn: "Start →",
    passedStatus: "Passed ✓",
    lockedStatus: "Locked 🔒",
    unlockedStatus: "Unlocked →",
    backToDashboard: "← Back to Dashboard",
    mod1ContentTitle: "Module 1: Foundations & Theory",
    mod1TheoryHeading: "📖 ISL Core Theory & Background",
    mod1Theory1: "<strong>1. Organizations & History:</strong> The Indian Sign Language Research and Training Centre (ISLRTC) in India focuses on research, development, and promotion of Indian Sign Language.",
    mod1Theory2: "<strong>2. Socio-Cultural Model:</strong> Defines deafness primarily as a linguistic and cultural identity rather than solely a medical pathology.",
    mod1Theory3: "<strong>3. Statutory Frameworks:</strong> The Rights of Persons with Disabilities (RPwD) Act, 2016 legally recognizes and protects the rights of persons with hearing impairment in India.",
    mod1Theory4: "<strong>4. Communication Etiquette:</strong> To get a Deaf person's attention, gently tap their shoulder or wave slightly in their field of vision.",
    mod1Theory5: "<strong>5. Linguistics:</strong> ISL relies on Subject-Object-Verb (SOV) structure, Handshape, Location, Movement, and Non-Manual Markers (NMMs).",
    mod1Vid1Title: "A-Z Alphabets Tutorial",
    mod1Vid2Title: "Basic 25 Words & Greetings",
    mod1Vid3Title: "Basic Daily Words",
    mod2ContentTitle: "Module 2: Situational Communication (Hospital)",
    mod2Vid1Title: "Medical Terminology & Emergency Signs",
    mod2Vid2Title: "Common Medical Terminology & Hospital Checkup",
    mod2Vid3Title: "Illness and Disease Signs (Deaf Enabled Foundation)",
    mod3ContentTitle: "Module 3: Advanced Sentences & Numbers",
    mod3Vid1Title: "Standard Signs & Advanced Vocabulary",
    mod3Vid2Title: "Medical-Related Terminology & Law Contexts",
    mod3Vid3Title: "Numbers & Numerical Sign Sentences",
    markWatched: "Mark Watched",
    replay10s: "⏪ Replay 10s",
    slowMo: "🐢 0.5x Slow-Mo",
    normalSpeed: "▶ 1.0x Normal",
    lockBannerMod1: "Watch all 3 episodes to unlock the Module 1 Clinical Scenario Test.",
    lockBannerMod2: "Watch all 3 episodes to unlock the Module 2 Clinical Scenario Test.",
    lockBannerMod3: "Watch all 3 episodes to unlock the Module 3 Clinical Scenario Test.",
    takeTestMod1: "Take Module 1 Clinical Scenario Test (10 Qs) →",
    takeTestMod2: "Take Module 2 Clinical Scenario Test (10 Qs) →",
    takeTestMod3: "Take Module 3 Clinical Scenario Test (10 Qs) →",
    aiViewTitle: "🤖 Advanced AI Real-Time Two-Hand & Dynamic Motion Studio",
    aiViewDesc: "Evaluates two-handed synchronization and kinetic movement trajectories.",
    camRestart: "Restart Mirror",
    camPause: "Pause Mirror",
    drillViewTitle: "🎮 Clinical Emergency Simulation Drills",
    drillViewDesc: "Practice rapid situational diagnosis: evaluate simulated patient signs and prescribe the correct emergency response.",
    observedSignLabel: "Observed ISL Patient Sign",
    selectResponsePrompt: "Select Appropriate Clinical Response",
    correctResponseTitle: "Correct Clinical Response!",
    incorrectDiagnosisTitle: "Incorrect Diagnosis.",
    incorrectDiagnosisDesc: "Review the patient's non-manual markers and try again.",
    nextScenarioBtn: "Next Scenario",
    gameViewTitle: "⚡ \"Beat-the-Clock\" Sign Identification Challenge",
    gameViewDesc: "Identify as many emergency and hospital ISL signs as you can before the 60-second timer expires!",
    gameTimeLabel: "Time:",
    gameScoreLabel: "Score:",
    gameHighLabel: "High Score:",
    gamePrompt: "Which sign is represented above?",
    gameCompletedTitle: "🎉 Drill Completed!",
    gamePlayAgain: "Play Again",
    earnedScoreText: "You earned",
    pointsText: "Points",
    dictViewTitle: "📚 ISL Quick-Reference Dictionary",
    dictViewDesc: "Search medical, emergency, and everyday vocabulary instantly, or practice any gesture directly in the AI Studio.",
    dictSearchPlaceholder: "Type a word (e.g. Doctor, Emergency, Thank you)...",
    dictNoMatch: "No matching signs found.",
    flashViewTitle: "⚡ Rapid Flashcard Retention Deck",
    flashViewDesc: "Flip through sign definitions to build long-term memory fluency.",
    flashRevealHint: "Tap to Reveal Sign Definition",
    flashClickHint: "(Click card to flip)",
    flashPrevBtn: "← Previous",
    flashNextBtn: "Next Card →",
    examViewTitle: "🏆 Cryptographic Certification Exam",
    examGuideHeading: "Certification Guidelines",
    examGuideIntro: "Welcome to the official assessment portal. Certificates are valid for 3 months from the date of issue.",
    examRule1: "Consists of 20 comprehensive questions covering ISL theory, grammar, and etiquette.",
    examRule2: "Requires a minimum passing score of 75% (15/20 correct).",
    examRule3: "Generates a direct, downloadable high-resolution PDF certificate with a verifiable SHA-256 HMAC cryptographic token.",
    examStartBtn: "Launch Certification Exam Now",
    nameInputTitle: "🏆 Incredible Job!",
    nameInputDesc: "You have successfully passed the certification examination. Verify your full name below for your official certificate:",
    nameInputPlaceholder: "Your Full Name",
    nameInputSubmitBtn: "Generate My Verified Certificate",
    verifyViewTitle: "🔍 Cryptographic Certificate Validation Portal",
    verifyViewDesc: "Enter a secure credential ID (e.g., SLP-2026-XXXX) or full token signature to verify authenticity against SignLingo records.",
    verifyInputPlaceholder: "Enter Credential ID...",
    verifySubmitBtn: "Verify Credential",
    botHeaderTitle: "ISL Sign Visualizer",
    botHeaderStatus: "Online • Vector ISL Active",
    botWelcomeMsg: "Namaste! 🙏 Type any word or sentence (e.g., \"Doctor\", \"Help\", \"Hospital\", or \"Emergency\") to see its visual sign cards!",
    botInputPlaceholder: "Type a word or sentence for ISL signs...",
    chipHosp: "Hospital",
    chipDoc: "Doctor",
    chipHelp: "Help",
    chipEmg: "Emergency",
    chipWater: "Water"
  },
  hi: {
    brandTitle: "साइनलिंगो ISL",
    subtitle: "भारतीय सांकेतिक भाषा स्टूडियो",
    streakDayLabel: "दिनों का स्ट्रीक",
    authSubtitleLogin: "मॉड्यूल सहेजने, स्ट्रीक ट्रैक करने और प्रमाणपत्र अर्जित करने के लिए लॉगिन करें",
    authSubtitleSignup: "मॉड्यूल सहेजने और प्रमाणपत्र प्राप्त करने के लिए अपनी प्रोफ़ाइल बनाएं",
    authSignInBtn: "साइन इन करें",
    authCreateBtn: "खाता बनाएं",
    authLabelName: "पूरा नाम",
    authLabelEmail: "ईमेल पता",
    authLabelPassword: "पासवर्ड",
    modulesTab: "📖 मॉड्यूल",
    aiTab: "🤖 AI हैंड स्टूडियो",
    drillTab: "🎮 नैदानिक अभ्यास",
    gameTab: "⚡ गति चुनौती",
    dictTab: "📚 शब्दकोश",
    flashTab: "⚡ फ्लैशकार्ड्स",
    examTab: "📝 अंतिम परीक्षा",
    certTab: "🏆 प्रमाणपत्र",
    verifyTab: "🔍 सत्यापन",
    heroBadge: "ISL पाठ्यचर्या",
    heroTitle: "इंटरैक्टिव ISL स्टूडियो",
    heroDesc: "संरचित मॉड्यूल, वास्तविक समय AI हैंड ट्रैकिंग और सत्यापित प्रमाणपत्रों के साथ भारतीय सांकेतिक भाषा सीखें।",
    modulesPassedCount: "में से 3 मॉड्यूल उत्तीर्ण",
    progressText: "प्रगति",
    shortcutAiTitle: "टू-हैंड AI मोशन स्टूडियो",
    shortcutAiDesc: "लाइव काइनेटिक ट्रैकिंग और गति विश्लेषण",
    shortcutGameTitle: "स्पीड ड्रिल चुनौती",
    shortcutGameDesc: "60-सेकंड त्वरित आपातकालीन संकेत पहचान",
    shortcutDrillTitle: "नैदानिक परिदृश्य सिमुलेशन",
    shortcutDrillDesc: "आपातकालीन रोगी निदान अभ्यास",
    shortcutFlashTitle: "फ्लैशकार्ड्स",
    shortcutFlashDesc: "त्वरित स्मरण शक्ति डेक",
    curriculumHeading: "पाठ्यचर्या मॉड्यूल",
    mod1Title: "मॉड्यूल 1: नीतियां और सिद्धांत",
    mod1Desc: "इतिहास, वर्णमाला, बुनियादी अभिवादन और मुख्य ISL सिद्धांत",
    mod2Title: "मॉड्यूल 2: प्रासंगिक संचार",
    mod2Desc: "अस्पताल, चिकित्सा शब्दावली और आपातकालीन संकेत",
    mod3Title: "मॉड्यूल 3: उन्नत वाक्य और संख्याएँ",
    mod3Desc: "उन्नत वाक्य, संख्यात्मक संरचनाएं और वीडियो ट्यूटोरियल",
    examCardTitle: "अंतिम क्रिप्टोग्राफिक परीक्षा और प्रमाणन",
    examUnlockedDesc: "सभी मॉड्यूल परीक्षण उत्तीर्ण। प्रमाणन परीक्षा के लिए तैयार!",
    examLockedDesc: "अंतिम परीक्षा अनलॉक करने के लिए तीनों मॉड्यूल परीक्षण पूरे करें",
    startBtn: "शुरू करें →",
    passedStatus: "उत्तीर्ण ✓",
    lockedStatus: "लॉक्ड 🔒",
    unlockedStatus: "अनलॉक्ड →",
    backToDashboard: "← डैशबोर्ड पर वापस जाएं",
    mod1ContentTitle: "मॉड्यूल 1: नीतियां और सिद्धांत",
    mod1TheoryHeading: "📖 ISL मुख्य सिद्धांत और पृष्ठभूमि",
    mod1Theory1: "<strong>1. संगठन और इतिहास:</strong> भारत में ISLRTC ISL के प्रचार पर ध्यान केंद्रित करता है।",
    mod1Theory2: "<strong>2. सामाजिक-सांस्कृतिक मॉडल:</strong> बहरेपन को एक भाषाई और सांस्कृतिक पहचान के रूप में परिभाषित करता है।",
    mod1Theory3: "<strong>3. वैधानिक रूपरेखा:</strong> RPwD अधिनियम, 2016 श्रवण बाधित व्यक्तियों के अधिकारों की रक्षा करता है।",
    mod1Theory4: "<strong>4. संचार शिष्टाचार:</strong> ध्यान आकर्षित करने के लिए कंधे पर हल्के से थपथपाएं या दृश्य क्षेत्र में हाथ लहराएं।",
    mod1Theory5: "<strong>5. भाषाज्ञान:</strong> ISL सब्जेक्ट-ऑब्जेक्ट-वर्ब (SOV) संरचना पर निर्भर करता है।",
    mod1Vid1Title: "ए-ज़ेड वर्णमाला ट्यूटोरियल",
    mod1Vid2Title: "बुनियादी 25 शब्द और अभिवादन",
    mod1Vid3Title: "बुनियादी दैनिक शब्द",
    mod2ContentTitle: "मॉड्यूल 2: प्रासंगिक संचार (अस्पताल)",
    mod2Vid1Title: "चिकित्सा शब्दावली और आपातकालीन संकेत",
    mod2Vid2Title: "सामान्य चिकित्सा शब्दावली और अस्पताल जांच",
    mod2Vid3Title: "बीमारी और रोग के संकेत",
    mod3ContentTitle: "मॉड्यूल 3: उन्नत वाक्य और संख्याएँ",
    mod3Vid1Title: "मानक संकेत और उन्नत शब्दावली",
    mod3Vid2Title: "चिकित्सा-संबंधित शब्दावली और कानूनी संदर्भ",
    mod3Vid3Title: "संख्याएँ और संख्यात्मक संकेत वाक्य",
    markWatched: "देखा हुआ चिह्नित करें",
    replay10s: "⏪ 10 सेकंड पीछे",
    slowMo: "🐢 0.5x धीमा",
    normalSpeed: "▶ 1.0x सामान्य",
    lockBannerMod1: "मॉड्यूल 1 क्लिनिकल टेस्ट अनलॉक करने के लिए सभी 3 एपिसोड देखें।",
    lockBannerMod2: "मॉड्यूल 2 क्लिनिकल टेस्ट अनलॉक करने के लिए सभी 3 एपिसोड देखें।",
    lockBannerMod3: "मॉड्यूल 3 क्लिनिकल टेस्ट अनलॉक करने के लिए सभी 3 एपिसोड देखें।",
    takeTestMod1: "मॉड्यूल 1 क्लिनिकल टेस्ट (10 प्रश्न) लें →",
    takeTestMod2: "मॉड्यूल 2 क्लिनिकल टेस्ट (10 प्रश्न) लें →",
    takeTestMod3: "मॉड्यूल 3 क्लिनिकल टेस्ट (10 प्रश्न) लें →",
    aiViewTitle: "🤖 उन्नत AI रियल-टाइम टू-हैंड मोशन स्टूडियो",
    aiViewDesc: "दो हाथों के समन्वय और गति प्रक्षेपवक्र का मूल्यांकन करता है।",
    camRestart: "मिरर पुनः प्रारंभ करें",
    camPause: "मिरर रोकें",
    drillViewTitle: "🎮 नैदानिक आपातकालीन सिमुलेशन अभ्यास",
    drillViewDesc: "त्वरित नैदानिक निदान का अभ्यास करें: रोगी के संकेतों का मूल्यांकन करें और सही आपातकालीन प्रतिक्रिया चुनें।",
    observedSignLabel: "देखा गया ISL रोगी संकेत",
    selectResponsePrompt: "उपयुक्त नैदानिक प्रतिक्रिया चुनें",
    correctResponseTitle: "सही नैदानिक प्रतिक्रिया!",
    incorrectDiagnosisTitle: "गलत निदान।",
    incorrectDiagnosisDesc: "रोगी के संकेतों की समीक्षा करें और पुनः प्रयास करें।",
    nextScenarioBtn: "अगला परिदृश्य",
    gameViewTitle: "⚡ स्पीड ड्रिल संकेत पहचान चुनौती",
    gameViewDesc: "60 सेकंड का टाइमर समाप्त होने से पहले आपातकालीन संकेतों को पहचानें!",
    gameTimeLabel: "समय:",
    gameScoreLabel: "अंक:",
    gameHighLabel: "सर्वोच्च अंक:",
    gamePrompt: "ऊपर कौन सा संकेत दिया गया है?",
    gameCompletedTitle: "🎉 ड्रिल पूरी हुई!",
    gamePlayAgain: "फिर से खेलें",
    earnedScoreText: "आपने अर्जित किए",
    pointsText: "अंक",
    dictViewTitle: "📚 ISL त्वरित-संदर्भ शब्दकोश",
    dictViewDesc: "चिकित्सा, आपातकालीन और दैनिक शब्दावली तुरंत खोजें।",
    dictSearchPlaceholder: "शब्द टाइप करें (उदा. डॉक्टर, आपातकाल)...",
    dictNoMatch: "कोई मेल खाता संकेत नहीं मिला।",
    flashViewTitle: "⚡ त्वरित फ्लैशकार्ड स्मरण डेक",
    flashViewDesc: "दीर्घकालिक स्मृति के लिए संकेत परिभाषाओं को देखें।",
    flashRevealHint: "संकेत परिभाषा देखने के लिए टैप करें",
    flashClickHint: "(फ़्लिप करने के लिए कार्ड पर क्लिक करें)",
    flashPrevBtn: "← पिछला",
    flashNextBtn: "अगला कार्ड →",
    examViewTitle: "🏆 क्रिप्टोग्राफिक प्रमाणन परीक्षा",
    examGuideHeading: "प्रमाणन दिशानिर्देश",
    examGuideIntro: "आधिकारिक मूल्यांकन पोर्टल में आपका स्वागत है।",
    examRule1: "इसमें ISL सिद्धांत और व्याकरण को कवर करने वाले 20 प्रश्न शामिल हैं।",
    examRule2: "न्यूनतम 75% (15/20) उत्तीर्ण अंक आवश्यक हैं।",
    examRule3: "सत्यापन योग्य टोकन के साथ एक डाउनलोड करने योग्य PDF प्रमाणपत्र उत्पन्न करता है।",
    examStartBtn: "प्रमाणन परीक्षा शुरू करें",
    nameInputTitle: "🏆 शानदार प्रदर्शन!",
    nameInputDesc: "आपने परीक्षा उत्तीर्ण कर ली है। प्रमाणपत्र के लिए अपने नाम की पुष्टि करें:",
    nameInputPlaceholder: "आपका पूरा नाम",
    nameInputSubmitBtn: "मेरा सत्यापित प्रमाणपत्र बनाएं",
    verifyViewTitle: "🔍 क्रिप्टोग्राफिक प्रमाणपत्र सत्यापन पोर्टल",
    verifyViewDesc: "प्रमाणिकता सत्यापित करने के लिए क्रेडेंशियल आईडी दर्ज करें।",
    verifyInputPlaceholder: "क्रेडेंशियल आईडी दर्ज करें...",
    verifySubmitBtn: "क्रेडेंशियल सत्यापित करें",
    botHeaderTitle: "ISL संकेत विज़ुअलाइज़र",
    botHeaderStatus: "ऑनलाइन • एक्टिव",
    botWelcomeMsg: "नमस्ते! 🙏 दृश्य संकेत देखने के लिए कोई भी शब्द टाइप करें!",
    botInputPlaceholder: "ISL संकेतों के लिए शब्द लिखें...",
    chipHosp: "अस्पताल",
    chipDoc: "डॉक्टर",
    chipHelp: "मदद",
    chipEmg: "आपातकाल",
    chipWater: "पानी"
  },
  mr: {
    brandTitle: "साइनलिंगो ISL",
    subtitle: "भारतीय सांकेतिक भाषा स्टुडिओ",
    streakDayLabel: "दिवसांचा स्ट्रीक",
    authSubtitleLogin: "मॉड्यूल सेव्ह करण्यासाठी व प्रमाणपत्र मिळवण्यासाठी लॉगिन करा",
    authSubtitleSignup: "मॉड्यूल सेव्ह करण्यासाठी व प्रमाणपत्र मिळवण्यासाठी प्रोफाइल तयार करा",
    authSignInBtn: "साइन इन करा",
    authCreateBtn: "खाते तयार करा",
    authLabelName: "पूर्ण नाव",
    authLabelEmail: "ईमेल पत्ता",
    authLabelPassword: "पासवर्ड",
    modulesTab: "📖 मॉड्यूल्स",
    aiTab: "🤖 AI हँड स्टुडिओ",
    drillTab: "🎮 क्लिनिकल सराव",
    gameTab: "⚡ गती आव्हान",
    dictTab: "📚 शब्दकोश",
    flashTab: "⚡ फ्लॅशकार्ड्स",
    examTab: "📝 अंतिम परीक्षा",
    certTab: "🏆 प्रमाणपत्र",
    verifyTab: "🔍 पडताळणी",
    heroBadge: "ISL अभ्यासक्रम",
    heroTitle: "परस्परसंवादी ISL स्टुडिओ",
    heroDesc: "रचनात्मक मॉड्यूल्स आणि AI ट्रॅकिंगसह भारतीय सांकेतिक भाषा शिका.",
    modulesPassedCount: "पैकी ३ मॉड्यूल्स उत्तीर्ण",
    progressText: "प्रगती",
    shortcutAiTitle: "टू-हँड AI मोशन स्टुडिओ",
    shortcutAiDesc: "थेट गती ट्रॅकिंग आणि हालचाल विश्लेषण",
    shortcutGameTitle: "स्पीड ड्रिल आव्हान",
    shortcutGameDesc: "६०-सेकंदात जलद आपत्कालीन संकेत ओळख",
    shortcutDrillTitle: "क्लिनिकल प्रसंग सिम्युलेशन",
    shortcutDrillDesc: "आपत्कालीन रुग्ण निदान सराव",
    shortcutFlashTitle: "फ्लॅशकार्ड्स",
    shortcutFlashDesc: "जलद स्मरणशक्ती डेक",
    curriculumHeading: "अभ्यासक्रम मॉड्यूल्स",
    mod1Title: "मॉड्यूल 1: पाया आणि सिद्धांत",
    mod1Desc: "इतिहास, मुळाक्षरे, मूलभूत अभिवादन आणि मुख्य ISL सिद्धांत",
    mod2Title: "मॉड्यूल 2: प्रासंगिक संवाद",
    mod2Desc: "रुग्णालय, वैद्यकीय पारिभाषिक शब्द आणि आणीबाणीचे संकेत",
    mod3Title: "मॉड्यूल 3: प्रगत वाक्ये आणि संख्या",
    mod3Desc: "प्रगत वाक्ये, संख्यात्मक संरचना आणि व्हिडिओ ट्यूटोरियल",
    examCardTitle: "अंतिम क्रिप्टोग्राफिक परीक्षा आणि प्रमाणीकरण",
    examUnlockedDesc: "सर्व मॉड्यूल्स उत्तीर्ण. परीक्षेसाठी सज्ज!",
    examLockedDesc: "अंतिम परीक्षा अनलॉक करण्यासाठी सर्व ३ मॉड्यूल्स पूर्ण करा",
    startBtn: "सुरू करा →",
    passedStatus: "उत्तीर्ण ✓",
    lockedStatus: "लॉक्ड 🔒",
    unlockedStatus: "अनलॉक्ड →",
    backToDashboard: "← डॅशबोर्डवर परत जा",
    mod1ContentTitle: "मॉड्यूल 1: पाया आणि सिद्धांत",
    mod1TheoryHeading: "📖 ISL मुख्य सिद्धांत आणि पार्श्वभूमी",
    mod1Theory1: "<strong>1. संस्था आणि इतिहास:</strong> ISLRTC भारतीय सांकेतिक भाषेच्या विकासावर काम करते.",
    mod1Theory2: "<strong>2. सामाजिक-सांस्कृतिक मॉडेल:</strong> बहिरेपणाला एक भाषिक आणि सांस्कृतिक ओळख म्हणून स्पष्ट करते.",
    mod1Theory3: "<strong>3. कायदेशीर चौकट:</strong> RPwD कायदा, २०१६ श्रवणदोष असणाऱ्या व्यक्तींच्या हक्कांचे रक्षण करतो.",
    mod1Theory4: "<strong>4. संवादाचा शिष्टाचार:</strong> लक्ष वेधून घेण्यासाठी खांद्यावर हलकेच स्पर्श करा किंवा दृष्टीक्षेपात हात हलवा.",
    mod1Theory5: "<strong>5. भाषाज्ञान:</strong> ISL मध्ये SOV रचना वापरली जाते.",
    mod1Vid1Title: "A-Z मुळाक्षरे ट्यूटोरियल",
    mod1Vid2Title: "मूलभूत २५ शब्द आणि अभिवादन",
    mod1Vid3Title: "मूलभूत दैनिक शब्द",
    mod2ContentTitle: "मॉड्यूल 2: प्रासंगिक संवाद (रुग्णालय)",
    mod2Vid1Title: "वैद्यकीय पारिभाषिक शब्द आणि आणीबाणीचे संकेत",
    mod2Vid2Title: "सामान्य वैद्यकीय शब्द आणि रुग्णालय तपासणी",
    mod2Vid3Title: "आजारांचे आणि रोगांचे संकेत",
    mod3ContentTitle: "मॉड्यूल 3: प्रगत वाक्ये आणि संख्या",
    mod3Vid1Title: "मानक संकेत आणि प्रगत शब्दसंग्रह",
    mod3Vid2Title: "वैद्यकीय संबंधित शब्दसंग्रह आणि कायदेशीर संदर्भ",
    mod3Vid3Title: "संख्या आणि संख्यात्मक संकेत वाक्ये",
    markWatched: "पाहिले म्हणून चिन्हांकित करा",
    replay10s: "⏪ १० सेकंद मागे",
    slowMo: "🐢 ०.५x हळू",
    normalSpeed: "▶ १.०x सामान्य",
    lockBannerMod1: "मॉड्यूल १ चाचणी अनलॉक करण्यासाठी सर्व ३ भाग पहा.",
    lockBannerMod2: "मॉड्यूल २ चाचणी अनलॉक करण्यासाठी सर्व ३ भाग पहा.",
    lockBannerMod3: "मॉड्यूल ३ चाचणी अनलॉक करण्यासाठी सर्व ३ भाग पहा.",
    takeTestMod1: "मॉड्यूल १ क्लिनिकल टेस्ट (१० प्रश्न) घ्या →",
    takeTestMod2: "मॉड्यूल २ क्लिनिकल टेस्ट (१० प्रश्न) घ्या →",
    takeTestMod3: "मॉड्यूल ३ क्लिनिकल टेस्ट (१० प्रश्न) घ्या →",
    aiViewTitle: "🤖 प्रगत AI टू-हँड मोशन स्टुडिओ",
    aiViewDesc: "दोन हातांच्या समन्वयाचे थेट मूल्यांकन करते.",
    camRestart: "मिरर पुन्हा सुरू करा",
    camPause: "मिरर थांबवा",
    drillViewTitle: "🎮 क्लिनिकल आपत्कालीन सिम्युलेशन सराव",
    drillViewDesc: "रुग्णाच्या संकेतांचे मूल्यांकन करा आणि योग्य आपत्कालीन प्रतिसाद निवडा.",
    observedSignLabel: "पाहिलेला ISL रुग्ण संकेत",
    selectResponsePrompt: "योग्य क्लिनिकल प्रतिसाद निवडा",
    correctResponseTitle: "योग्य क्लिनिकल प्रतिसाद!",
    incorrectDiagnosisTitle: "चुकीचे निदान.",
    incorrectDiagnosisDesc: "रुग्णाच्या संकेतांचे निरीक्षण करा आणि पुन्हा प्रयत्न करा.",
    nextScenarioBtn: "पुढील प्रसंग",
    gameViewTitle: "⚡ स्पीड ड्रिल संकेत ओळख आव्हान",
    gameViewDesc: "६० सेकंदात जास्तीत जास्त आपत्कालीन संकेत ओळखा!",
    gameTimeLabel: "वेळ:",
    gameScoreLabel: "गुण:",
    gameHighLabel: "सर्वोच्च गुण:",
    gamePrompt: "वरील चित्रात कोणता संकेत दिला आहे?",
    gameCompletedTitle: "🎉 सराव पूर्ण झाला!",
    gamePlayAgain: "पुन्हा खेळा",
    earnedScoreText: "तुम्ही मिळवले",
    pointsText: "गुण",
    dictViewTitle: "📚 ISL द्रुत-संदर्भ शब्दकोश",
    dictViewDesc: "वैद्यकीय आणि दैनंदिन शब्द त्वरित शोधा.",
    dictSearchPlaceholder: "शब्द टाइप करा (उदा. डॉक्टर, आपत्कालीन)...",
    dictNoMatch: "कोणतेही जुळणारे संकेत आढळले नाहीत.",
    flashViewTitle: "⚡ जलद फ्लॅशकार्ड स्मरण डेक",
    flashViewDesc: "संकेत व्याख्या अभ्यासा.",
    flashRevealHint: "संकेत व्याख्या पाहण्यासाठी टॅप करा",
    flashClickHint: "(कार्डवर क्लिक करा)",
    flashPrevBtn: "← मागील",
    flashNextBtn: "पुढील कार्ड →",
    examViewTitle: "🏆 क्रिप्टोग्राफिक प्रमाणीकरण परीक्षा",
    examGuideHeading: "प्रमाणीकरण मार्गदर्शक तत्त्वे",
    examGuideIntro: "मूल्यांकन पोर्टलवर आपले स्वागत आहे.",
    examRule1: "यात ISL व्याकरण आणि शिष्टाचारावर आधारित २० प्रश्न आहेत.",
    examRule2: "किमान ७५% (१५/२०) गुण मिळवणे आवश्यक आहे.",
    examRule3: "सुरक्षित टोकनसह डाउनलोड करण्यायोग्य PDF प्रमाणपत्र तयार करते.",
    examStartBtn: "प्रमाणीकरण परीक्षा सुरू करा",
    nameInputTitle: "🏆 उत्कृष्ट कामगिरी!",
    nameInputDesc: "तुम्ही परीक्षा उत्तीर्ण केली आहे. प्रमाणपत्रासाठी आपले पूर्ण नाव तपासा:",
    nameInputPlaceholder: "तुमचे पूर्ण नाव",
    nameInputSubmitBtn: "माझे प्रमाणपत्र तयार करा",
    verifyViewTitle: "🔍 प्रमाणपत्र पडताळणी पोर्टल",
    verifyViewDesc: "पडताळणी करण्यासाठी क्रेडेंशियल आयडी प्रविष्ट करा.",
    verifyInputPlaceholder: "क्रेडेंशियल आयडी प्रविष्ट करा...",
    verifySubmitBtn: "क्रेडेंशियल पडताळा",
    botHeaderTitle: "ISL संकेत व्हिज्युअलायझर",
    botHeaderStatus: "ऑनलाइन • ॲक्टिव्ह",
    botWelcomeMsg: "नमस्ते! 🙏 व्हिज्युअल संकेत पाहण्यासाठी कोणताही शब्द टाइप करा!",
    botInputPlaceholder: "ISL संकेतांसाठी शब्द लिहा...",
    chipHosp: "रुग्णालय",
    chipDoc: "डॉक्टर",
    chipHelp: "मदत",
    chipEmg: "आणीबाणी",
    chipWater: "पाणी"
  }
};

const islDictionaryData = {
  en: [
    { word: "Acidity", category: "Medical", desc: "Tracing a rising line upward from the stomach toward the chest and throat." },
    { word: "Acne", category: "Medical", desc: "Tapping multiple spots across the face and chin with fingertips." },
    { word: "Allergy", category: "Medical", desc: "Moving hands apart from the chest while opening fingers outward." },
    { word: "Ambulance", category: "Medical", desc: "Crossing index fingers above the head like flashing emergency lights." },
    { word: "Anemia", category: "Medical", desc: "Pulling down the lower eyelid or rubbing the inner palm to indicate blood deficiency." },
    { word: "Antiseptic", category: "Medical", desc: "Wiping two fingers across the palm or forearm in a cleansing motion." },
    { word: "Appointment", category: "Medical", desc: "Rotating the right closed fist over the left closed fist in a circular motion." },
    { word: "Arthritis", category: "Medical", desc: "Bending and rotating finger joints stiffly to show joint pain and inflammation." },
    { word: "Asthma", category: "Medical", desc: "Patting or gently squeezing the chest with a cupped hand while showing shortness of breath." },
    { word: "Bandage", category: "Medical", desc: "Wrapping the edge of a flat hand or imaginary wrap around the wrist or forearm." },
    { word: "Blood", category: "Medical", desc: "Moving fingers downward from the mouth or tapping the arm." },
    { word: "Blood Pressure", category: "Medical", desc: "Squeezing and releasing the left upper arm with the right hand, mimicking a cuff." },
    { word: "Boil", category: "Medical", desc: "Pointing to a localized swelling or raised bump on the skin." },
    { word: "Bruise", category: "Medical", desc: "Pressing the fingertips onto the skin and making a small circular or pressing motion." },
    { word: "Burn", category: "Medical", desc: "Hovering the palm slightly above the back of the other hand while pulling back quickly." },
    { word: "Cancer", category: "Medical", desc: "Tracing a small crab shape or an inward eating motion on the back of the hand." },
    { word: "Cardiologist", category: "Medical", desc: "Tapping the left side of the chest over the heart area twice, then signing 'doctor'." },
    { word: "Casting", category: "Medical", desc: "Tracing the shape of a hard mold or covering around the lower arm or leg." },
    { word: "Cataract", category: "Medical", desc: "Tracing a hazy circular motion over the eyes." },
    { word: "Checkup", category: "Medical", desc: "Moving the index finger in a small checklist motion from top to bottom on the open palm." },
    { word: "Chickenpox", category: "Medical", desc: "Tapping multiple fingertips lightly across the face and arms to indicate spots or blisters." },
    { word: "Cholera", category: "Medical", desc: "Pressing the stomach and pointing downward rapidly to indicate severe fluid loss." },
    { word: "Clinic", category: "Medical", desc: "Signing a small hospital sign or tapping a 'C' shape near the chest." },
    { word: "Cold", category: "Medical", desc: "Tapping or lightly touching the nose to indicate a cold or runny nose." },
    { word: "Constipation", category: "Medical", desc: "Crossing or blocking hands tightly over the lower stomach area." },
    { word: "Cough", category: "Medical", desc: "Cupping the hand slightly and patting or tapping the chest area twice." },
    { word: "Crutches", category: "Medical", desc: "Placing both hands under the armpits and pressing down slightly to simulate walking aids." },
    { word: "Dehydration", category: "Medical", desc: "Pinching the skin of the hand or mimicking a dry, empty throat." },
    { word: "Dengue", category: "Medical", desc: "Tapping the joints or forehead to indicate severe body ache and fever." },
    { word: "Dentist", category: "Medical", desc: "Tapping the front teeth gently with the right index finger." },
    { word: "Diabetes", category: "Medical", desc: "Tracing a small insulin injection motion on the arm or mimicking checking blood glucose levels." },
    { word: "Diarrhea", category: "Medical", desc: "Moving hands downward repeatedly to indicate frequent loose motions." },
    { word: "Discharge", category: "Medical", desc: "Moving both open hands outward and forward from the body to show leaving or releasing." },
    { word: "Dizziness", category: "Medical", desc: "Rotating the index finger in small circles near the side of the head." },
    { word: "Doctor", category: "Medical", desc: "Tapping two fingers of dominant hand against the inner wrist (pulse point)." },
    { word: "Drip", category: "Medical", desc: "Mimicking liquid droplets falling from a hanging bag down through a small tube." },
    { word: "Emergency", category: "Medical", desc: "Sign letter 'E' twisted rapidly back and forth in front of chest." },
    { word: "Epilepsy", category: "Medical", desc: "Mimicking involuntary shaking or tremor movements with the hands." },
    { word: "Fever", category: "Medical", desc: "Placing the back of the hand against the forehead to check temperature." },
    { word: "Food", category: "Daily", desc: "Bringing fingertips repeatedly toward mouth." },
    { word: "Fracture", category: "Medical", desc: "Mimicking a bone breaking or cracking by moving two hands apart and slightly twisting." },
    { word: "Glucose", category: "Medical", desc: "Tapping the tip of the index finger against the cheek or mimicking drinking a sweet solution." },
    { word: "Headache", category: "Medical", desc: "Tapping both sides of the forehead gently with index fingers or making a small circular motion." },
    { word: "Heart Attack", category: "Medical", desc: "Clenching or gripping tightly over the left side of the chest near the heart." },
    { word: "Help", category: "Medical", desc: "Fist with thumb up resting on flat palm of other hand, lifting upward." },
    { word: "High Blood Pressure", category: "Medical", desc: "Squeezing the upper arm or making a pumping motion with a clenched fist." },
    { word: "Hospital", category: "Medical", desc: "Drawing a cross shape on the upper arm or shoulder with index finger." },
    { word: "Incision", category: "Medical", desc: "Drawing a straight line down the forearm or palm with the index finger." },
    { word: "Infection", category: "Medical", desc: "Tapping the back of the left hand with the fingertips of the right hand." },
    { word: "Inhaler", category: "Medical", desc: "Mimicking holding a small device to the mouth and pressing down to breathe in." },
    { word: "Injection", category: "Medical", desc: "Mimicking holding a syringe with the right hand and gently jabbing the forearm or upper arm." },
    { word: "Insomnia", category: "Medical", desc: "Holding open eyes wide with fingers or tapping the forehead to indicate sleeplessness." },
    { word: "Itching / Scabies", category: "Medical", desc: "Scratching the back of the forearm or hand gently with fingernails." },
    { word: "Jaundice", category: "Medical", desc: "Pointing to the eyes and skin with yellowish undertone gestures using the index finger." },
    { word: "Madness / Insanity", category: "Medical", desc: "Circling the index finger rapidly near the side of the head." },
    { word: "Malaria", category: "Medical", desc: "Mimicking a mosquito bite on the arm followed by shivering motions." },
    { word: "Measles", category: "Medical", desc: "Tracing small rashes or spots across the cheeks and arms." },
    { word: "Medicine", category: "Medical", desc: "Tapping the fingertips of the open right hand against the palm of the left hand." },
    { word: "Night Blindness", category: "Medical", desc: "Covering the eyes or signing 'night' followed by inability to see." },
    { word: "Nurse", category: "Medical", desc: "Tapping the thumb side of the index finger against the inner wrist." },
    { word: "Obesity", category: "Medical", desc: "Tracing a large rounded circle in front of the stomach area." },
    { word: "Ointment", category: "Medical", desc: "Rubbing the index finger and thumb together in a circular motion over the back of the hand." },
    { word: "Operation", category: "Medical", desc: "Moving the right hand in precise, short cutting or scanning motions over the left forearm." },
    { word: "Pain", category: "Medical", desc: "Twisting index fingers toward each other near the affected body part." },
    { word: "Paralysis", category: "Medical", desc: "Holding the arms stiff and motionless against the body or drooping a hand." },
    { word: "Patient", category: "Medical", desc: "Drawing an imaginary cross downward on the upper arm or chest." },
    { word: "Pediatrist", category: "Medical", desc: "Signing 'child' followed by the sign for 'doctor'." },
    { word: "Pharmacy", category: "Medical", desc: "Tapping the chin with two fingers, then moving hands forward." },
    { word: "Piles / Hemorrhoids", category: "Medical", desc: "Pointing downward near the lower body while making a localized pressing motion." },
    { word: "Pimple", category: "Medical", desc: "Tapping the cheek or forehead lightly with the tip of the index finger." },
    { word: "Plague", category: "Medical", desc: "Showing widespread spreading motions with both hands across the body." },
    { word: "Pneumonia", category: "Medical", desc: "Placing both hands flat on the lungs/chest and mimicking heavy, restricted breathing." },
    { word: "Prescription", category: "Medical", desc: "Mimicking writing on the palm of the left hand with the right index finger." },
    { word: "Pulse", category: "Medical", desc: "Pressing two fingertips lightly against the opposite inner wrist to feel heartbeats." },
    { word: "Rabies", category: "Medical", desc: "Mimicking an animal bite on the hand or forearm." },
    { word: "Recovery", category: "Medical", desc: "Moving both hands upward and outward from a resting position to signify getting better." },
    { word: "Report", category: "Medical", desc: "Tapping the fingertips of an open right hand against a flat left palm twice." },
    { word: "Ringworm", category: "Medical", desc: "Tracing a small circle on the skin with the index finger." },
    { word: "Smallpox", category: "Medical", desc: "Tapping fingertips lightly across the face to indicate pox marks or blisters." },
    { word: "Sore Throat", category: "Medical", desc: "Touching or lightly gripping the throat with the thumb and index finger." },
    { word: "Sprain", category: "Medical", desc: "Twisting the wrist slightly while moving hands inward to indicate joint strain." },
    { word: "Stethoscope", category: "Medical", desc: "Placing two fingers near the ears and touching the chest where a stethoscope bell would go." },
    { word: "Stitches", category: "Medical", desc: "Mimicking a needle weaving back and forth across the skin or forearm." },
    { word: "Stomach Ache", category: "Medical", desc: "Circling the flat right hand clockwise over the stomach area." },
    { word: "Stone", category: "Medical", desc: "Tapping a closed fist against the side or lower back area to indicate kidney/gallbladder stones." },
    { word: "Stress / Depression", category: "Medical", desc: "Holding the head with both hands or pressing temples with a heavy downward expression." },
    { word: "Stretcher", category: "Medical", desc: "Moving two flat hands forward in parallel to represent carrying a patient flat." },
    { word: "Sunstroke / Heatstroke", category: "Medical", desc: "Wiping sweat from the forehead and pointing upward toward the sun." },
    { word: "Surgery", category: "Medical", desc: "Moving the right index finger in a gentle cutting motion across the back of the left hand." },
    { word: "Swelling", category: "Medical", desc: "Moving two palms outward from each other to show expanding size or puffiness." },
    { word: "Syrup", category: "Medical", desc: "Tracing a small liquid pouring motion or a line down the throat with the index finger." },
    { word: "Tablet", category: "Medical", desc: "Mimicking taking a small pill from the palm and placing it into the mouth." },
    { word: "Tetanus", category: "Medical", desc: "Stiffening the fingers and hand sharply to represent muscle lock." },
    { word: "Thank You", category: "Greetings", desc: "Flat hand moving forward and downward from chin." },
    { word: "Thermometer", category: "Medical", desc: "Placing the index finger vertically at the side of the mouth as if checking temperature." },
    { word: "Tuberculosis (TB)", category: "Medical", desc: "Tapping the chest repeatedly with a clenched fist while coughing gently." },
    { word: "Typhoid", category: "Medical", desc: "Tapping the forehead and stomach consecutively to indicate prolonged high fever and abdominal discomfort." },
    { word: "Ulcer", category: "Medical", desc: "Touching the stomach area and showing an open sore or painful spot with the fingertip." },
    { word: "Vitamin", category: "Medical", desc: "Signing the letter 'V' near the mouth or tapping fingertips together." },
    { word: "Vomit", category: "Medical", desc: "Moving the right hand upward from the chest while opening the fingers and palm outward." },
    { word: "Ward", category: "Medical", desc: "Making a wide sweeping motion with both open hands outward to indicate a room or section." },
    { word: "Water", category: "Daily", desc: "Forming letter 'W' near chin and tapping cheek twice." },
    { word: "Wheelchair", category: "Medical", desc: "Moving two index fingers in circles forward on either side to mimic rolling wheels." },
    { word: "X-Ray", category: "Medical", desc: "Holding the right hand flat in front of the chest with fingers slightly spread, palm facing inward." }
  ],
  hi: [
    { word: "एसिडिटी", category: "वैद्यकीय", desc: "पोटापासून छाती आणि गळ्याच्या दिशेने वरच्या बाजूला रेषा ओढणे." },
    { word: "पुरळ / मुरुम", category: "वैद्यकीय", desc: "बोटांच्या टोकांनी चेहऱ्यावर आणि हनुवटीवर अनेक ठिकाणी हलके थपथपणे." },
    { word: "ऍलर्जी", category: "वैद्यकीय", desc: "बोटे बाहेरच्या बाजूला उघडी करत छातीपासून दोन्ही हात दूर नेणे." },
    { word: "रुग्णवाहिका", category: "वैद्यकीय", desc: "डोक्याच्या वर तर्जनी ओलांडणे." },
    { word: "डॉक्टर", category: "वैद्यकीय", desc: "मुख्य हाताची दोन बोटे आतील मनगटावर थपथपणे." },
    { word: "अस्पताल", category: "वैद्यकीय", desc: "तर्जनीने खांद्यावर क्रॉस काढणे." },
    { word: "मदत", category: "वैद्यकीय", desc: "तळहातावर मूठ ठेवून वर उचलणे." },
    { word: "ताप", category: "वैद्यकीय", desc: "कपाळावर हाताचा मागचा भाग ठेवणे." },
    { word: "पाणी", category: "दैनिक", desc: "हनुवटीजवळ 'W' आकार तयार करून गालावर दोनदा टॅप करणे." }
  ],
  mr: [
    { word: "अ‍ॅसिडिटी", category: "वैद्यकीय", desc: "पोटापासून छाती आणि गळ्याच्या दिशेने वरच्या बाजूला रेषा ओढणे." },
    { word: "पुरळ / मुरुम", category: "वैद्यकीय", desc: "बोटांच्या टोकांनी चेहऱ्यावर आणि हनुवटीवर अनेक ठिकाणी हलके थपथपणे." },
    { word: "ऍलर्जी", category: "वैद्यकीय", desc: "बोटे बाहेरच्या बाजूला उघडी करत छातीपासून दोन्ही हात दूर नेणे." },
    { word: "रुग्णवाहिका", category: "वैद्यकीय", desc: "डोक्याच्या वर तर्जनी ओलांडणे." },
    { word: "डॉक्टर", category: "वैद्यकीय", desc: "मुख्य हाताची दोन बोटे आतील मनगटावर थपथपणे." },
    { word: "रुग्णालय", category: "वैद्यकीय", desc: "तर्जनीने खांद्यावर क्रॉस काढणे." },
    { word: "मदत", category: "वैद्यकीय", desc: "तळहातावर मूठ ठेवून वर उचलणे." },
    { word: "ताप", category: "वैद्यकीय", desc: "कपाळावर हाताचा मागचा भाग ठेवणे." },
    { word: "पाणी", category: "दैनिक", desc: "हनुवटीजवळ 'W' आकार तयार करून गालावर दोनदा टॅप करणे." }
  ]
};

// ==========================================
// 7. GATED MODULE CLINICAL TESTS
// ==========================================
const moduleTestsData = {
  1: {
    title: "Module 1: Foundations & Deaf Etiquette",
    questions: [
      { scenario: "A Deaf patient enters the registration desk while administrative staff are shouting verbal directions.", q: "What is the appropriate protocol to get the patient's visual attention according to ISL healthcare etiquette?", options: ["Shout louder facing their ear", "Gently tap their shoulder or wave smoothly within their visual field", "Clap vigorously behind their head", "Wave bright lights directly into their eyes"], answer: 1 },
      { scenario: "The hospital is auditing its disability compliance under Indian statutory mandates.", q: "Which statutory Act legally protects the rights of Deaf patients to have accessible communication and healthcare in India?", options: ["The RPwD Act, 2016", "The Disabilities Act of 1995", "The Mental Healthcare Act 2017", "Right to Education Act 2009"], answer: 0 },
      { scenario: "A clinical intern writes an ISL transcription for 'Doctor prescribes medicine'.", q: "What is the standard grammatical sentence structure used in Indian Sign Language (ISL)?", options: ["Subject-Verb-Object (SVO)", "Subject-Object-Verb (SOV)", "Verb-Subject-Object (VSO)", "Object-Verb-Subject (OVS)"], answer: 1 },
      { scenario: "A hospital wishes to source standard clinical ISL dictionaries and certified interpreter materials.", q: "Which apex national institute standardizes ISL training and research in India?", options: ["ISLRTC (Indian Sign Language Research and Training Centre)", "AIIMS New Delhi", "NCERT", "NIMH"], answer: 0 },
      { scenario: "A patient’s rare medication name does not have an established single-sign lexical entry.", q: "How should the medical officer convey the specific drug name?", options: ["Write illegibly on paper", "Fingerspell using the ISL manual alphabet in sequence", "Invent a random gesture", "Skip providing the drug name"], answer: 1 },
      { scenario: "An orientation workshop discusses deaf interaction in clinical settings.", q: "Under the Socio-Cultural Model of deafness, how is a Deaf individual viewed?", options: ["Solely as an impaired biological pathology needing correction", "As a linguistic and cultural minority with distinct communication heritage", "As completely unable to make medical choices", "As an acute psychiatric case"], answer: 1 },
      { scenario: "A patient expresses acute pain while signing.", q: "Why are facial expressions, head tilts, and mouth movements (Non-Manual Markers) critical during ISL patient assessment?", options: ["They are decorative and can be ignored", "They convey grammatical tone, severity of symptoms, and sentence types", "They indicate patient confusion only", "They replace the entire need for hand gestures"], answer: 1 },
      { scenario: "A Deaf patient arrives in the OPD consultation room.", q: "What is the standard culturally respectful opening greeting in ISL?", options: ["A closed fist thump on the desk", "Both hands joined palms together in front of chest (Namaste) or flat open wave", "Snapping fingers repeatedly", "Pointing downward toward the floor"], answer: 1 },
      { scenario: "Setting up an ergonomic consultation room for effective Deaf communication.", q: "What physical lighting environment is crucial for effective ISL healthcare interaction?", options: ["Dim lighting with the doctor sitting in front of a glaring window", "Well-lit room with direct, unobstructed line-of-sight and no backlight glare", "Pitch dark room with focused strobe lights", "Physician wearing a dark opaque full-face mask obscuring mouth and expressions"], answer: 1 },
      { scenario: "A patient shows a fist with thumb up resting on a flat opposite palm, lifting upward.", q: "What core emergency concept is the patient communicating?", options: ["'Help'", "'Discharge'", "'Food'", "'Sleep'"], answer: 0 }
    ]
  },
  2: {
    title: "Module 2: Situational & Emergency Signs",
    questions: [
      { scenario: "An emergency patient holds their right hand with two fingers tapping against the inner left wrist pulse point.", q: "Which healthcare professional is the patient requesting immediately?", options: ["Dentist", "Doctor / Physician", "Pharmacist", "Radiologist"], answer: 1 },
      { scenario: "A nurse observes a patient drawing an imaginary cross on their upper arm and shoulder.", q: "What medical facility or concept is being indicated?", options: ["Hospital", "Police Station", "Pharmacy", "Cafeteria"], answer: 0 },
      { scenario: "A patient arrives clutching the left chest with a strained grimace and gasping expressions.", q: "What acute clinical condition does this combination of signs represent?", options: ["Mild Acidity", "Heart Attack / Acute Coronary Syndrome", "Eye Infection", "Common Cold"], answer: 1 },
      { scenario: "A patient forms an 'E' handshape and rapidly twists it side-to-side across the chest.", q: "What critical status is being signaled?", options: ["Routine Checkup", "Emergency / Critical Priority", "Prescription Refill", "Dietary Advice"], answer: 1 },
      { scenario: "Two hands are held in parallel, moving apart with a sharp twisting/snapping motion.", q: "Which orthopedic injury is the patient describing?", options: ["Bone Fracture", "Mild Itching", "Cough", "Headache"], answer: 0 },
      { scenario: "A relative crosses both index fingers repeatedly over their head like flashing beacons.", q: "Which emergency dispatch service is needed?", options: ["Ambulance Service", "Hospital Cafeteria", "Wheelchair Repair", "Dental Clinic"], answer: 0 },
      { scenario: "A paramedic squeezes and releases the patient's upper bicep with a pumping gesture.", q: "Which routine clinical measurement is being performed or requested?", options: ["Blood Pressure Examination", "Vision Test", "Height Measurement", "Ear Syringing"], answer: 0 },
      { scenario: "The patient rubs their flat palm clockwise over the abdomen with an agonizing facial expression.", q: "What symptom is being diagnosed?", options: ["Headache", "Stomach Ache / Acute Abdominal Pain", "Sprained Ankle", "Toothache"], answer: 1 },
      { scenario: "A mother places the back of her flat hand against the child's forehead.", q: "What clinical symptom is being highlighted?", options: ["High Fever / Elevated Temperature", "Ear Infection", "Knee Fracture", "Insomnia"], answer: 0 },
      { scenario: "The practitioner mimes holding a small syringe and lightly tapping the deltoid.", q: "What clinical procedure is being explained to the patient?", options: ["Intramuscular / Subcutaneous Injection", "Oral Syrup Consumption", "Surgical Incision", "Bandage Application"], answer: 0 }
    ]
  },
  3: {
    title: "Module 3: Advanced Numerical & Legal Contexts",
    questions: [
      { scenario: "The pharmacist signs 'TABLET' + holds up two fingers + points to 'SUN/DAY' and 'MOON/NIGHT'.", q: "What is the precise dosage instruction?", options: ["Take 2 tablets twice daily (Morning and Night)", "Take 1 tablet every 3 days", "Take 4 tablets at bedtime", "Dissolve 5 tablets in hot water"], answer: 0 },
      { scenario: "A surgeon explains a high-risk surgical procedure to a Deaf patient before surgery.", q: "Under medical ethics and the RPwD Act 2016, how must informed consent be obtained?", options: ["Have a family member guess what the patient wants without interpretation", "Provide full surgical risks through a qualified ISL interpreter and ensure clear mutual understanding", "Perform surgery without consent", "Give the patient a 10-page English document only"], answer: 1 },
      { scenario: "The doctor signs 'NUMBER 3' followed by the time-marker for 'WEEKS' + 'RETURN / APPOINTMENT'.", q: "When is the patient scheduled for review?", options: ["In 3 days", "In 3 weeks", "In 3 months", "Never"], answer: 1 },
      { scenario: "A nurse signs 'WATER' + 'BOTTLE' + holds up '3' + 'DAY'.", q: "What clinical target is the patient advised to maintain?", options: ["Drink 3 liters/bottles of water per day", "Avoid water for 3 consecutive days", "Take 3 drops of eye medication", "Fast for 3 days"], answer: 0 },
      { scenario: "A patient signs 'COUGH' + holds up '5' + 'DAYS' + non-manual marker of intense chest congestion.", q: "What is the recorded chief complaint?", options: ["Severe cough for the past 5 days", "Mild headache 5 weeks ago", "Sore throat for 5 hours", "5 episodes of vomiting today"], answer: 0 },
      { scenario: "A ward attendant sweeps both open hands outward indicating a wide section + signs number '12'.", q: "What is being communicated to the admitting patient?", options: ["Patient is admitted to Ward Bed 12", "Patient must wait 12 hours", "12 visitors are allowed at once", "Cost of bed is 12 rupees"], answer: 0 },
      { scenario: "The lab technician signs 'BLOOD TEST' + 'FOOD NO' + shows '8 HOURS'.", q: "What pre-test instruction is given to the patient?", options: ["Maintain 8 hours of overnight fasting before the blood draw", "Eat 8 heavy meals before the test", "Take 8 glucose tablets immediately", "Drink 8 cups of coffee"], answer: 0 },
      { scenario: "An interpreter accompanies a Deaf patient into a sensitive medical consultation.", q: "What ethical obligation binds the medical interpreter and clinical team?", options: ["The interpreter may share the diagnosis on social media", "Strict confidentiality and unbiased translation of all medical details", "The interpreter decides what the doctor is allowed to hear", "The interpreter must leave during sensitive conversations"], answer: 1 },
      { scenario: "A pediatrician signs 'BABY' + 'INJECTION' + 'NUMBER 6' + 'MONTH'.", q: "What is the clinical advice?", options: ["6-month routine vaccination due for the infant", "Give 6 injections today", "Wait 6 years for all shots", "Infant needs 6 tablets per day"], answer: 0 },
      { scenario: "The physician signs 'MEDICINE' + 'CONTINUE' + 'NUMBER 7' + 'DAYS' + 'STOP'.", q: "How should the patient complete their antibiotic course?", options: ["Take medicine for 7 full days and then cease", "Stop taking medicine immediately if feeling slightly better on Day 2", "Take medicine indefinitely forever", "Take all 7 days of pills in one single dose"], answer: 0 }
    ]
  }
};

let currentModTestNum = 1;
let currentModTestQIdx = 0;
let currentModTestScore = 0;

function startModuleTest(modNum) {
  if (watchedVideos[modNum].size < 3) {
    alert(`Please complete viewing all 3 episodes in Module ${modNum} before taking the test.`);
    return;
  }
  currentModTestNum = modNum;
  currentModTestQIdx = 0;
  currentModTestScore = 0;
  switchView('module-test-view');
  renderModuleTestQuestion();
}

function renderModuleTestQuestion() {
  const container = document.getElementById('module-test-container');
  if (!container) return;
  const test = moduleTestsData[currentModTestNum];
  if (currentModTestQIdx >= test.questions.length) {
    finishModuleTest();
    return;
  }
  const item = test.questions[currentModTestQIdx];
  container.innerHTML = `
    <div class="card">
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.75rem;">
        <span style="font-size: 0.8rem; font-weight: 700; color: #5a67d8;">Module ${currentModTestNum} Clinical Test</span>
        <span style="font-size: 0.8rem; font-weight: 700; color: #4a5568;">Question ${currentModTestQIdx + 1} of 10</span>
      </div>
      <div style="background: #ebf8ff; border-left: 4px solid #3182ce; padding: 0.85rem; border-radius: 8px; margin-bottom: 1rem;">
        <strong style="color: #2b6cb0;">Clinical Scenario:</strong>
        <p style="margin-top: 0.25rem; font-size: 0.9rem; color: #2d3748;">${item.scenario}</p>
      </div>
      <h3 style="margin-bottom: 1rem; font-size: 1.05rem; color: #1a202c;">${item.q}</h3>
      <div style="display: flex; flex-direction: column; gap: 0.6rem;">
        ${item.options.map((opt, idx) => `
          <button onclick="submitModuleTestAnswer(${idx})" style="text-align: left; background: #edf2f7; color: #2d3748; padding: 0.75rem 1rem; border-radius: 10px; font-size: 0.95rem; margin-top: 0;">
            ${opt}
          </button>
        `).join('')}
      </div>
    </div>
  `;
}

function submitModuleTestAnswer(selectedIdx) {
  const test = moduleTestsData[currentModTestNum];
  if (selectedIdx === test.questions[currentModTestQIdx].answer) {
    currentModTestScore++;
  }
  currentModTestQIdx++;
  renderModuleTestQuestion();
}

function finishModuleTest() {
  const container = document.getElementById('module-test-container');
  const passingScore = 7;
  const passed = currentModTestScore >= passingScore;
  if (passed) {
    completedModules.add(currentModTestNum);
    saveUserProgress();
    updateProgressUI();
    if (typeof confetti === 'function') confetti({ particleCount: 100, spread: 70, origin: { y: 0.6 } });
    container.innerHTML = `
      <div class="card" style="text-align: center; padding: 2rem;">
        <h2 style="color: #38a169; margin-bottom: 0.5rem;">🎉 Module ${currentModTestNum} Test Passed!</h2>
        <p style="font-size: 1.1rem; margin-bottom: 1rem;">You scored <strong>${currentModTestScore}/10</strong> (${currentModTestScore * 10}%).</p>
        <p style="color: #4a5568; margin-bottom: 1.5rem;">Module ${currentModTestNum} is now recorded as officially completed in your progress bar.</p>
        <button onclick="switchView('dashboard')" style="background: #38a169; color: white; padding: 0.75rem 1.5rem; border-radius: 10px;">Return to Dashboard</button>
      </div>
    `;
  } else {
    container.innerHTML = `
      <div class="card" style="text-align: center; padding: 2rem;">
        <h2 style="color: #e53e3e; margin-bottom: 0.5rem;">Clinical Assessment Incomplete</h2>
        <p style="font-size: 1.1rem; margin-bottom: 1rem;">You scored <strong>${currentModTestScore}/10</strong> (${currentModTestScore * 10}%). A minimum score of 70% (7/10) is required to validate completion.</p>
        <button onclick="startModuleTest(${currentModTestNum})" style="background: #5a67d8; color: white; padding: 0.75rem 1.5rem; border-radius: 10px; margin-right: 0.5rem;">Retry Module ${currentModTestNum} Test</button>
        <button onclick="switchView('dashboard')" style="background: #e2e8f0; color: #4a5568; padding: 0.75rem 1.5rem; border-radius: 10px;">Review Video Lessons</button>
      </div>
    `;
  }
}

// ==========================================
// 8. ACCESSIBILITY, THEMING & DOM LOCALIZATION
// ==========================================
let currentFontSize = 16;
function toggleDarkMode() {
  document.body.classList.toggle('dark-mode');
  const isDark = document.body.classList.contains('dark-mode');
  localStorage.setItem('signlingo_theme', isDark ? 'dark' : 'light');
}

function adjustFontSize(delta) {
  currentFontSize = Math.min(22, Math.max(12, currentFontSize + delta));
  document.documentElement.style.fontSize = `${currentFontSize}px`;
}

function changeLanguage(lang) {
  if (!translations[lang]) return;
  currentLanguage = lang;
  const t = translations[lang];
  const setText = (id, text) => {
    const el = document.getElementById(id);
    if (el) el.innerHTML = text;
  };
  const setAttr = (id, attr, value) => {
    const el = document.getElementById(id);
    if (el) el.setAttribute(attr, value);
  };

  setText('auth-brand-title', t.brandTitle);
  setText('header-brand-title', t.brandTitle);
  setText('header-studio-subtitle', t.subtitle);
  setText('tab-login-btn', t.authSignInBtn);
  setText('tab-signup-btn', t.authCreateBtn);
  setText('nav-modules-btn', t.modulesTab);
  setText('nav-camera-btn', t.aiTab);
  setText('nav-drill-btn', t.drillTab);
  setText('nav-game-btn', t.gameTab);
  setText('nav-dict-btn', t.dictTab);
  setText('nav-flash-btn', t.flashTab);
  setText('nav-exam-btn', t.examTab);
  setText('nav-cert-btn', t.certTab);
  setText('nav-verify-btn', t.verifyTab);
  setText('hero-badge-tag', t.heroBadge);
  setText('hero-title-text', t.heroTitle);
  setText('hero-desc-text', t.heroDesc);
  setText('curriculum-heading-text', t.curriculumHeading);
  setText('mod1-title', t.mod1Title);
  setText('mod1-desc', t.mod1Desc);
  setText('mod2-title', t.mod2Title);
  setText('mod2-desc', t.mod2Desc);
  setText('mod3-title', t.mod3Title);
  setText('mod3-desc', t.mod3Desc);
  setText('exam-card-title', t.examCardTitle);
  setText('dict-view-title', t.dictViewTitle);
  setText('dict-view-desc', t.dictViewDesc);
  setAttr('dict-search-input', 'placeholder', t.dictSearchPlaceholder);

  updateProgressUI();
  populateAiSignSelector();
  filterDictionary();
  updateFlashcardUI();
  renderClinicalSimulations();
}

function filterDictionary() {
  const query = (document.getElementById('dict-search-input')?.value || '').toLowerCase().trim();
  const container = document.getElementById('dictionary-results-container');
  if (!container) return;
  const t = translations[currentLanguage];
  const list = islDictionaryData[currentLanguage] || islDictionaryData['en'];
  const filtered = list.filter(item => item.word.toLowerCase().includes(query) || item.desc.toLowerCase().includes(query));

  if (filtered.length === 0) {
    container.innerHTML = `<p style="color: #718096; text-align: center; padding: 1rem;">${t.dictNoMatch}</p>`;
    return;
  }
  container.innerHTML = filtered.map(item => `
    <div class="card dict-card-item">
      <div style="flex: 1;">
        <span style="font-size: 0.7rem; font-weight: 700; color: #3182ce; text-transform: uppercase;">${item.category}</span>
        <h4 style="margin: 0.2rem 0; color: #2d3748;">${item.word}</h4>
        <p style="margin: 0; font-size: 0.85rem; color: #718096;">${item.desc}</p>
      </div>
      <button onclick="practiceSpecificSignFromDict('${item.word}')" style="margin-top: 0; background: #ebf8ff; color: #2b6cb0; border: 1.5px solid #bee3f8; padding: 0.4rem 0.8rem; border-radius: 8px; font-size: 0.8rem; font-weight: 700;">
        🎯 Practice in AI Studio
      </button>
    </div>
  `).join('');
}

let flashcardIndex = 0;
let isFlashcardFlipped = false;
function getFlashcardDeck() {
  return islDictionaryData[currentLanguage] || islDictionaryData['en'];
}
function updateFlashcardUI() {
  const deck = getFlashcardDeck();
  if (flashcardIndex >= deck.length) flashcardIndex = 0;
  const card = deck[flashcardIndex];
  const catEl = document.getElementById('flashcard-category');
  const contentEl = document.getElementById('flashcard-content');
  if (!card || !catEl || !contentEl) return;
  catEl.innerText = `${card.category} (${flashcardIndex + 1}/${deck.length})`;
  contentEl.innerText = isFlashcardFlipped ? card.desc : card.word;
}
function flipFlashcard() {
  isFlashcardFlipped = !isFlashcardFlipped;
  updateFlashcardUI();
}
function nextFlashcard() {
  const deck = getFlashcardDeck();
  flashcardIndex = (flashcardIndex + 1) % deck.length;
  isFlashcardFlipped = false;
  updateFlashcardUI();
}
function prevFlashcard() {
  const deck = getFlashcardDeck();
  flashcardIndex = (flashcardIndex - 1 + deck.length) % deck.length;
  isFlashcardFlipped = false;
  updateFlashcardUI();
}

// ==========================================
// 9. FINAL 20-QUESTION CERTIFICATION QUIZ
// ==========================================
const finalExamQuestions = [
  { q: "What is the primary linguistic word order in Indian Sign Language (ISL)?", options: ["SVO", "SOV (Subject-Object-Verb)", "VSO", "OVS"], answer: 1 },
  { q: "Which statutory Act legally protects ISL accessibility rights in Indian healthcare?", options: ["RPwD Act 2016", "Disabilities Act 1995", "Rehabilitation Council Act 1992", "Medical Termination Act"], answer: 0 },
  { q: "How should a nurse gain a Deaf patient's attention respectfully?", options: ["Shout loudly", "Gently tap the shoulder or wave in visual field", "Clap behind them", "Snap fingers near ear"], answer: 1 },
  { q: "Which national center develops and standardizes ISL education in India?", options: ["AIIMS", "ISLRTC", "NCERT", "NIMH"], answer: 1 },
  { q: "How is 'Doctor' signed in medical ISL?", options: ["Tapping inner wrist pulse point with index & middle fingers", "Saluting forehead", "Pinching nose", "Touching both ears"], answer: 0 },
  { q: "How is an emergency 'Hospital' cross signed?", options: ["Tracing a cross on upper shoulder/arm", "Drawing a circle on abdomen", "Waving two fists", "Tapping chin"], answer: 0 },
  { q: "What sign denotes 'Help' in clinical triage?", options: ["Fist with thumb up on flat palm lifted upward", "Tapping teeth", "Clenching both ears", "Wiping forehead"], answer: 0 },
  { q: "What is the sign motion for 'Emergency'?", options: ["Twisting 'E' handshape rapidly across chest", "Holding ears", "Tapping knees", "Crossing feet"], answer: 0 },
  { q: "How is 'Blood Pressure' measurement communicated?", options: ["Squeezing upper arm with pumping motion", "Rubbing chin", "Tapping index fingers", "Circling head"], answer: 0 },
  { q: "What does clutching the left chest with an acute grimace indicate?", options: ["Cardiac Emergency / Heart Attack", "Mild Eye Irritation", "Headache", "Knee Pain"], answer: 0 },
  { q: "What does circling a flat palm over the abdomen signify?", options: ["Stomach Ache / Abdominal Distress", "Fever", "Ear Infection", "Tooth Decay"], answer: 0 },
  { q: "How are bone fractures represented in orthopedic evaluation?", options: ["Two hands snapping and twisting apart", "Touching nose", "Saluting", "Tapping pulse"], answer: 0 },
  { q: "How is an ambulance arrival requested?", options: ["Crossing index fingers overhead like flashing lights", "Tapping toes", "Rubbing palms", "Blinking rapidly"], answer: 0 },
  { q: "What is the proper method to communicate an unlisted brand drug name?", options: ["Fingerspelling via ISL manual alphabet", "Guessing a gesture", "Skipping the name", "Shouting the brand"], answer: 0 },
  { q: "What do Non-Manual Markers (NMMs) communicate in ISL medical dialogues?", options: ["Symptom severity, grammatical questions, and emotional intensity", "Nothing important", "Only confusion", "Background music tempo"], answer: 0 },
  { q: "How is informed surgical consent obtained ethically from a Deaf patient?", options: ["Through a qualified medical ISL interpreter ensuring full mutual understanding", "By family guesswork", "By skipping consent", "By giving English paperwork only"], answer: 0 },
  { q: "How is a '2 tablets daily' prescription signed?", options: ["'Tablet' + two fingers + 'Day' & 'Night' markers", "Drinking water rapidly", "Touching forehead once", "Holding 5 fingers"], answer: 0 },
  { q: "What does placing the back of a flat hand on the forehead signify?", options: ["Checking / reporting high fever", "Sore throat", "Sprained ankle", "Discharge order"], answer: 0 },
  { q: "What does sweeping open hands forward and outward indicate at discharge?", options: ["Discharge / Leaving hospital safely", "Admission to ICU", "Emergency injection", "Isolation ward"], answer: 0 },
  { q: "What is the validity period of the verified SignLingo ISL competency certificate?", options: ["3 Months from issue date", "1 Day", "2 Weeks", "100 Years"], answer: 0 }
];

let finalQuizScore = 0;
let finalQuizCurrentQ = 0;

function handleExamClick() {
  if (completedModules.size < 3) {
    alert("Final Certification Exam is Locked!\n\nPlease complete and pass all 3 Module Tests first.");
    return;
  }
  switchView('exam-section');
}

function handleCertificateClick() {
  const savedCert = localStorage.getItem('signlingo_last_cert');
  if (savedCert) {
    document.getElementById('result-content').innerHTML = savedCert;
    switchView('result-view');
  } else {
    alert("No active certificate found. Complete all 3 module tests and pass the final exam first.");
  }
}

function startQuiz() {
  finalQuizScore = 0;
  finalQuizCurrentQ = 0;
  switchView('quiz-view');
  renderFinalQuizQuestion();
}

function renderFinalQuizQuestion() {
  const container = document.getElementById('quiz-container');
  if (!container) return;
  if (finalQuizCurrentQ >= finalExamQuestions.length) {
    finishFinalQuiz();
    return;
  }
  const q = finalExamQuestions[finalQuizCurrentQ];
  container.innerHTML = `
    <div class="card">
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.75rem;">
        <span style="font-size: 0.8rem; font-weight: 700; color: #5a67d8;">Final Certification Examination</span>
        <span style="font-size: 0.8rem; font-weight: 700; color: #4a5568;">Question ${finalQuizCurrentQ + 1} of 20</span>
      </div>
      <h3 style="margin: 0.5rem 0 1.25rem 0;">${q.q}</h3>
      <div style="display: flex; flex-direction: column; gap: 0.6rem;">
        ${q.options.map((opt, idx) => `
          <button onclick="submitFinalQuizAnswer(${idx})" style="text-align: left; background: #edf2f7; color: #2d3748; padding: 0.75rem 1rem; border-radius: 10px; font-size: 0.95rem; margin-top: 0;">
            ${opt}
          </button>
        `).join('')}
      </div>
    </div>
  `;
}

function submitFinalQuizAnswer(selectedIdx) {
  if (selectedIdx === finalExamQuestions[finalQuizCurrentQ].answer) {
    finalQuizScore++;
  }
  finalQuizCurrentQ++;
  renderFinalQuizQuestion();
}

function finishFinalQuiz() {
  const percentage = Math.round((finalQuizScore / finalExamQuestions.length) * 100);
  if (percentage >= 75) {
    switchView('name-input-view');
  } else {
    const container = document.getElementById('quiz-container');
    container.innerHTML = `
      <div class="card" style="text-align: center; padding: 2rem;">
        <h3 style="color: #e53e3e; margin-bottom: 0.5rem;">Final Exam Not Passed</h3>
        <p style="margin: 1rem 0;">You scored ${finalQuizScore}/${finalExamQuestions.length} (${percentage}%). A minimum score of 75% is required for certification.</p>
        <button onclick="startQuiz()" style="background: #5a67d8; color: white; padding: 0.75rem 1.5rem; border-radius: 10px;">Retry Final Exam</button>
      </div>
    `;
  }
}

function generateCredentialId(name) {
  const cleanName = name.replace(/[^a-zA-Z]/g, '').toUpperCase().slice(0, 4) || 'USER';
  const randomHex = Math.random().toString(16).substring(2, 8).toUpperCase();
  const year = new Date().getFullYear();
  return `SLP-${year}-${cleanName}-${randomHex}`;
}

function generateCertificate() {
  const recipientName = document.getElementById('cert-name-input')?.value.trim() || currentUser?.name || "Healthcare Practitioner";
  const issueDate = new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
  const credentialId = generateCredentialId(recipientName);
  const certMarkup = `
    <div class="certificate-box" id="printable-certificate">
      <div class="certificate-inner">
        <h2>Certificate of Competency</h2>
        <div class="cert-subtitle">Indian Sign Language Healthcare Communication</div>
        <p class="cert-recipient">This is to certify that</p>
        <div class="cert-name">${recipientName}</div>
        <p class="cert-body">
          Has successfully passed all 3 Clinical Module Assessments and the Final Cryptographic Examination, demonstrating clinical fluency in Indian Sign Language (ISL) foundations, emergency triage, hospital vocabulary, and patient communication ethics.
        </p>
        <div class="cert-verification-footer">
          <strong>Credential ID:</strong> ${credentialId} | <strong>Issued:</strong> ${issueDate} | <strong>Validity:</strong> 3 Months
        </div>
      </div>
    </div>
    <div style="text-align: center; margin-bottom: 2rem;">
      <button onclick="downloadPDF('${recipientName}')" style="background: #38a169; color: white; padding: 0.75rem 1.5rem; border-radius: 10px; margin-right: 0.5rem;"><i class="fa-solid fa-download"></i> Download PDF</button>
      <button onclick="switchView('dashboard')" style="background: #4a5568; color: white; padding: 0.75rem 1.5rem; border-radius: 10px;">Back to Dashboard</button>
    </div>
  `;
  localStorage.setItem('signlingo_last_cert', certMarkup);
  let certDB = JSON.parse(localStorage.getItem('signlingo_cert_db') || '{}');
  certDB[credentialId] = { name: recipientName, issueDate, valid: true };
  localStorage.setItem('signlingo_cert_db', JSON.stringify(certDB));
  document.getElementById('result-content').innerHTML = certMarkup;
  switchView('result-view');
  if (typeof confetti === 'function') confetti({ particleCount: 150, spread: 90, origin: { y: 0.5 } });
}

function downloadPDF(recipientName) {
  const element = document.getElementById('printable-certificate');
  if (!element || typeof html2pdf !== 'function') return;
  const opt = {
    margin: 10,
    filename: `SignLingo_Certificate_${recipientName.replace(/\s+/g, '_')}.pdf`,
    image: { type: 'jpeg', quality: 0.98 },
    html2canvas: { scale: 2 },
    jsPDF: { unit: 'mm', format: 'a4', orientation: 'landscape' }
  };
  html2pdf().set(opt).from(element).save();
}

function verifyCredential() {
  const input = document.getElementById('verify-input')?.value.trim();
  const resultBox = document.getElementById('verify-result');
  if (!input || !resultBox) return;
  const certDB = JSON.parse(localStorage.getItem('signlingo_cert_db') || '{}');
  const record = certDB[input];
  if (record) {
    resultBox.innerHTML = `
      <div style="background: #f0fff4; border: 1.5px solid #38a169; padding: 1rem; border-radius: 10px; color: #22543d;">
        <h4 style="margin: 0 0 0.4rem 0;"><i class="fa-solid fa-circle-check"></i> Verified Authentic Certificate</h4>
        <p style="margin: 0; font-size: 0.85rem;"><strong>Recipient:</strong> ${record.name}</p>
        <p style="margin: 0; font-size: 0.85rem;"><strong>Date Issued:</strong> ${record.issueDate}</p>
        <p style="margin: 0; font-size: 0.85rem;"><strong>Status:</strong> Active (3-Month Validity Verified)</p>
      </div>
    `;
  } else {
    resultBox.innerHTML = `
      <div style="background: #fff5f5; border: 1.5px solid #e53e3e; padding: 1rem; border-radius: 10px; color: #9b2c2c;">
        <h4 style="margin: 0 0 0.4rem 0;"><i class="fa-solid fa-circle-xmark"></i> Unverified Credential</h4>
        <p style="margin: 0; font-size: 0.85rem;">The credential ID could not be validated against recorded token registries.</p>
      </div>
    `;
  }
}

// ==========================================
// 10. CHATBOT VISUALIZER INITIALIZATION
// ==========================================
const islHandGestureGraphics = {
  "doctor": {
    title: "Doctor",
    motion: "Tap index & middle fingers twice on inner wrist pulse point",
    svg: `<svg width="100" height="100" viewBox="0 0 120 120"><rect x="15" y="65" width="85" height="28" rx="8" fill="#e2e8f0" stroke="#718096" stroke-width="2"/><circle cx="45" cy="79" r="6" fill="#feb2b2" stroke="#e53e3e" stroke-width="1.5"/><path d="M 40 20 L 40 70 M 50 20 L 50 70 M 58 45 L 68 55" stroke="#2b6cb0" stroke-width="6" stroke-linecap="round"/></svg>`
  },
  "hospital": {
    title: "Hospital",
    motion: "Trace an 'H' cross on your upper shoulder/arm with index finger",
    svg: `<svg width="100" height="100" viewBox="0 0 120 120"><path d="M 25 30 Q 55 15 95 30 L 85 95 Q 55 105 25 95 Z" fill="#ebf8ff" stroke="#3182ce" stroke-width="2"/><line x1="60" y1="35" x2="60" y2="85" stroke="#e53e3e" stroke-width="6" stroke-linecap="round"/><line x1="38" y1="58" x2="82" y2="58" stroke="#e53e3e" stroke-width="6" stroke-linecap="round"/></svg>`
  },
  "help": {
    title: "Help",
    motion: "Thumb-up closed fist placed on flat open palm, lifted upward together",
    svg: `<svg width="100" height="100" viewBox="0 0 120 120"><rect x="20" y="80" width="80" height="14" rx="7" fill="#cbd5e0" stroke="#4a5568" stroke-width="2"/><rect x="42" y="48" width="36" height="32" rx="6" fill="#feebc8" stroke="#dd6b20" stroke-width="2"/><path d="M 50 48 L 50 25 Q 50 18 57 18 Q 64 18 64 25 L 64 48" fill="#feebc8" stroke="#dd6b20" stroke-width="2"/></svg>`
  },
  "emergency": {
    title: "Emergency",
    motion: "Form letter 'E' handshape and twist rapidly side-to-side across chest",
    svg: `<svg width="100" height="100" viewBox="0 0 120 120"><rect x="35" y="30" width="48" height="50" rx="8" fill="#fed7d7" stroke="#c53030" stroke-width="2"/><line x1="38" y1="42" x2="72" y2="42" stroke="#c53030" stroke-width="4" stroke-linecap="round"/><line x1="38" y1="54" x2="72" y2="54" stroke="#c53030" stroke-width="4" stroke-linecap="round"/><line x1="38" y1="66" x2="72" y2="66" stroke="#c53030" stroke-width="4" stroke-linecap="round"/></svg>`
  },
  "water": {
    title: "Water",
    motion: "Form 'W' shape near chin and tap twice against cheek",
    svg: `<svg width="100" height="100" viewBox="0 0 120 120"><line x1="45" y1="75" x2="40" y2="25" stroke="#3182ce" stroke-width="5" stroke-linecap="round"/><line x1="55" y1="75" x2="55" y2="20" stroke="#3182ce" stroke-width="5" stroke-linecap="round"/><line x1="65" y1="75" x2="70" y2="25" stroke="#3182ce" stroke-width="5" stroke-linecap="round"/></svg>`
  },
  "pain": {
    title: "Pain",
    motion: "Twist two extended index fingers toward each other with strained expression",
    svg: `<svg width="100" height="100" viewBox="0 0 120 120"><path d="M 15 60 L 45 60" stroke="#c53030" stroke-width="6" stroke-linecap="round"/><path d="M 105 60 L 75 60" stroke="#c53030" stroke-width="6" stroke-linecap="round"/><circle cx="60" cy="60" r="4" fill="#c53030"/></svg>`
  }
};

document.addEventListener("DOMContentLoaded", () => {
  initAuth();
  initStreak();
  filterDictionary();
  populateAiSignSelector();
  updateFlashcardUI();
  renderClinicalSimulations();

  const toggleBtn = document.getElementById("chatbot-toggle-btn");
  const closeBtn = document.getElementById("chatbot-close-btn");
  const chatWindow = document.getElementById("chatbot-window");
  const sendBtn = document.getElementById("chatbot-send-btn");
  const userInput = document.getElementById("chatbot-user-input");
  const chatMessages = document.getElementById("chatbot-messages");

  if (toggleBtn) toggleBtn.onclick = () => chatWindow.classList.toggle("chatbot-hidden");
  if (closeBtn) closeBtn.onclick = () => chatWindow.classList.add("chatbot-hidden");

  function sendChat() {
    const text = userInput.value.trim();
    if (!text) return;
    appendChat(text, 'user-message');
    userInput.value = '';
    setTimeout(() => {
      appendVisualSignBot(text);
    }, 400);
  }

  if (sendBtn) sendBtn.onclick = sendChat;
  if (userInput) userInput.onkeypress = (e) => { if (e.key === 'Enter') sendChat(); };

  document.querySelectorAll('.suggestion-chip').forEach(chip => {
    chip.onclick = () => {
      userInput.value = chip.getAttribute('data-query');
      sendChat();
    };
  });

  function appendChat(text, cls) {
    const msg = document.createElement('div');
    msg.className = `chat-message ${cls}`;
    msg.innerHTML = `<div class="message-content">${text}</div>`;
    chatMessages.appendChild(msg);
    chatMessages.scrollTop = chatMessages.scrollHeight;
  }

  function appendVisualSignBot(query) {
    const msg = document.createElement('div');
    msg.className = 'chat-message bot-message';
    const cleanQuery = query.toLowerCase().trim();
    const cleanWords = cleanQuery.replace(/[^a-z\s]/g, '').split(/\s+/).filter(w => w.length > 0);
    let html = `<div class="message-content"><div style="margin-bottom: 4px;"><strong>ISL Hand Sign Guide: "${query}"</strong></div>`;
    html += '<div style="display: flex; gap: 10px; overflow-x: auto; padding: 10px 2px;">';

    if (islHandGestureGraphics[cleanQuery]) {
      const item = islHandGestureGraphics[cleanQuery];
      html += renderSignCard(item.title, item.svg, item.motion);
    } else {
      cleanWords.forEach(word => {
        if (islHandGestureGraphics[word]) {
          const item = islHandGestureGraphics[word];
          html += renderSignCard(item.title, item.svg, item.motion);
        } else {
          html += `
            <div style="background: #f8fafc; border: 1.5px dashed #cbd5e0; border-radius: 12px; padding: 8px; text-align: center; min-width: 130px; flex: 0 0 auto;">
              <span style="font-size: 0.7rem; font-weight: 700; color: #4a5568; display: block; margin-bottom: 4px;">FINGERSPELLING</span>
              <div style="display: flex; gap: 3px; justify-content: center; margin-bottom: 6px;">
                ${word.toUpperCase().split('').map(c => `
                  <span style="background: #3182ce; color: white; font-weight: bold; font-size: 0.75rem; padding: 2px 5px; border-radius: 4px;">${c}</span>
                `).join('')}
              </div>
              <span style="font-size: 0.65rem; color: #718096; line-height: 1.1; display: block;">Spell letters in sequence using ISL manual alphabet</span>
            </div>
          `;
        }
      });
    }
    html += '</div></div>';
    msg.innerHTML = html;
    chatMessages.appendChild(msg);
    chatMessages.scrollTop = chatMessages.scrollHeight;
  }

  function renderSignCard(title, svgMarkup, motionText) {
    return `
      <div style="background: white; border: 1.5px solid #cbd5e0; border-radius: 12px; padding: 8px; text-align: center; width: 140px; min-width: 140px; flex: 0 0 auto; box-shadow: 0 2px 6px rgba(0,0,0,0.04);">
        <div style="height: 90px; display: flex; align-items: center; justify-content: center; background: #f8fafc; border-radius: 8px; margin-bottom: 6px;">
          ${svgMarkup}
        </div>
        <strong style="display: block; font-size: 0.8rem; color: #1a202c; text-transform: uppercase;">${title}</strong>
        <p style="font-size: 0.65rem; color: #4a5568; margin-top: 3px; line-height: 1.2;">${motionText}</p>
      </div>
    `;
  }
});

// ========================================================
// 11. ADDON: DUAL-TERMINAL BI-DIRECTIONAL CLINICAL KIOSK
// ========================================================
let triageCamera = null;
let triageLanguage = 'mr';
let triageTTSActive = true;
let recordedPainScore = 0;
let lastDecodedSign = null;
let signHoldTimestamp = 0;
const SIGN_CONFIRMATION_TIME = 900;
const patientSentenceHistory = [];
const activeSymptomFlags = new Set();

const clinicalTranslationMatrix = {
  "Heart Attack": {
    hi: "हृदयविकार / सीने में तेज़ दर्द",
    mr: "हृदयविकाराचा तीव्र झटका / छातीत दुखणे",
    priority: "RED",
    sentence: {
      en: "Patient describes acute retrosternal chest pain and tightness.",
      hi: "रोगी सीने में गंभीर जकड़न और अत्यधिक दर्द का संकेत दे रहा है।",
      mr: "रुग्ण छातीत तीव्र वेदना आणि जकडल्यासारखे वाटत असल्याचा इशारा देत आहे."
    }
  },
  "Emergency": {
    hi: "आपातकालीन स्थिति / तत्काल सहायता",
    mr: "तातडीची / आणीबाणीची परिस्थिती",
    priority: "RED",
    sentence: {
      en: "Critical emergency status signaled. Needs immediate triage intervention.",
      hi: "अत्यंत गंभीर आपातकालीन स्थिति! तत्काल चिकित्सा दल की आवश्यकता है।",
      mr: "गंभीर आणीबाणीचा इशारा! तातडीने वैद्यकीय मदतीची गरज आहे."
    }
  },
  "Fever": {
    hi: "उच्च बुखार / शरीर का बढ़ा हुआ तापमान",
    mr: "तीव्र ताप / अंगात उष्णता",
    priority: "YELLOW",
    sentence: {
      en: "Patient reports elevated body temperature and chills.",
      hi: "रोगी ने तेज़ बुखार और बदन में हरारत की शिकायत की है।",
      mr: "रुग्णाने तीव्र ताप आणि अंगात भरल्याची तक्रार केली आहे."
    }
  },
  "Stomach Ache": {
    hi: "पेट में गंभीर दर्द / ऐंठन",
    mr: "पोटात तीव्र कळा / पोटदुखी",
    priority: "YELLOW",
    sentence: {
      en: "Patient indicates severe localized abdominal cramping.",
      hi: "रोगी पेट में असहनीय दर्द और मरोड़ का संकेत कर रहा है।",
      mr: "रुग्ण पोटात तीव्र दुखणे आणि कळा येत असल्याचे सांगत आहे."
    }
  },
  "Blood Pressure": {
    hi: "रक्तचाप / चक्कर आना",
    mr: "रक्तदाब तपासणी / भोवळ",
    priority: "YELLOW",
    sentence: {
      en: "Patient is requesting an immediate blood pressure assessment.",
      hi: "रोगी रक्तचाप की तत्काल जांच करने का अनुरोध कर रहा है।",
      mr: "रुग्ण रक्तदाब त्वरित तपासण्याची विनंती करत आहे."
    }
  },
  "Pain": {
    hi: "असहनीय शारीरिक दर्द",
    mr: "शारीरिक तीव्र वेदना",
    priority: "YELLOW",
    sentence: {
      en: "Patient expresses localized acute discomfort and sharp pain.",
      hi: "रोगी शरीर के विशिष्ट भाग में गंभीर दर्द व्यक्त कर रहा है।",
      mr: "रुग्ण शरीराच्या विशिष्ट भागात तीव्र वेदना होत असल्याचे दाखवत आहे."
    }
  },
  "Help": {
    hi: "सहायता की तत्काल आवश्यकता",
    mr: "तातडीच्या मदतीची आवश्यकता",
    priority: "YELLOW",
    sentence: {
      en: "Patient is calling for bedside assistance.",
      hi: "रोगी को तत्काल सहायता की आवश्यकता है।",
      mr: "रुग्णाला त्वरित मदतीची आवश्यकता आहे."
    }
  },
  "Doctor": {
    hi: "चिकित्सक / डॉक्टर की मांग",
    mr: "डॉक्टरांची त्वरित भेट",
    priority: "GREEN",
    sentence: {
      en: "Patient is requesting consultation with the attending physician.",
      hi: "रोगी डॉक्टर से परामर्श करने की प्रतीक्षा कर रहा है।",
      mr: "रुग्ण डॉक्टरांना भेटण्याची विनंती करत आहे."
    }
  },
  "Hospital": {
    hi: "अस्पताल में भर्ती / ओपीडी",
    mr: "रुग्णालयात तपासणी / दाखल",
    priority: "GREEN",
    sentence: {
      en: "Patient is inquiring about hospital admission and general care.",
      hi: "रोगी अस्पताल में प्रवेश और सेवा के बारे में पूछ रहा है।",
      mr: "रुग्ण रुग्णालयातील सेवा आणि प्रवेशाबाबत चौकशी करत आहे."
    }
  },
  "Water": {
    hi: "पीने का पानी",
    mr: "पिण्याचे पाणी",
    priority: "GREEN",
    sentence: {
      en: "Patient requests drinking water.",
      hi: "रोगी को पीने के लिए पानी चाहिए।",
      mr: "रुग्णाला पिण्यासाठी पाणी हवे आहे."
    }
  }
};

function changeTriageLanguage(lang) {
  triageLanguage = lang;
  updateTriageLiveDisplay();
}

function selectPainLevel(level) {
  recordedPainScore = level;
  document.querySelectorAll('.pain-level-btn').forEach(btn => btn.classList.remove('active-pain'));
  event.target.classList.add('active-pain');
  const label = document.getElementById('selected-pain-score');
  if (label) {
    label.innerText = `Recorded Pain: ${level}/10 (${level >= 7 ? 'Severe' : level >= 4 ? 'Moderate' : level > 0 ? 'Mild' : 'None'})`;
    label.style.color = level >= 7 ? '#dc2626' : level >= 4 ? '#d97706' : '#2563eb';
  }
}

function toggleTriageTTS() {
  triageTTSActive = !triageTTSActive;
  const btn = document.getElementById('triage-tts-toggle');
  if (btn) btn.innerText = triageTTSActive ? '🔊 Audio ON' : '🔈 Audio OFF';
}

function speakTriageSentence(text, lang) {
  if (!triageTTSActive || !window.speechSynthesis) return;
  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = lang === 'mr' ? 'mr-IN' : lang === 'hi' ? 'hi-IN' : 'en-US';
  utterance.rate = 0.95;
  window.speechSynthesis.speak(utterance);
}

function processTriageLandmarks(multiHandLandmarks) {
  const activeGestureBadge = document.getElementById('triage-active-gesture');
  if (!multiHandLandmarks || multiHandLandmarks.length === 0) {
    if (activeGestureBadge) activeGestureBadge.innerText = "Position patient hands in frame...";
    return;
  }

  const candidateSigns = ["Heart Attack", "Emergency", "Fever", "Stomach Ache", "Blood Pressure", "Pain", "Help", "Doctor", "Hospital", "Water"];
  let matchedSign = null;

  for (const sign of candidateSigns) {
    const res = evaluateSpecificSign(sign, multiHandLandmarks);
    if (res && res.valid) {
      matchedSign = sign;
      break;
    }
  }

  if (matchedSign) {
    if (activeGestureBadge) activeGestureBadge.innerText = `Sensing Sign: ${matchedSign}`;
    const now = performance.now();
    if (lastDecodedSign === matchedSign) {
      if (now - signHoldTimestamp > SIGN_CONFIRMATION_TIME) {
        confirmPatientSign(matchedSign);
        signHoldTimestamp = now + 1200;
      }
    } else {
      lastDecodedSign = matchedSign;
      signHoldTimestamp = now;
    }
  }
}

function confirmPatientSign(signKey) {
  const meta = clinicalTranslationMatrix[signKey];
  if (!meta) return;

  activeSymptomFlags.add(signKey);
  const sentenceObj = meta.sentence;
  const sentence = sentenceObj[triageLanguage] || sentenceObj.en;

  if (!patientSentenceHistory.includes(sentence)) {
    patientSentenceHistory.push(sentence);
  }

  updateTriageLiveDisplay();
  speakTriageSentence(sentence, triageLanguage);

  if (signKey === "Heart Attack" || signKey === "Pain" || signKey === "Stomach Ache") {
    const box = document.getElementById('pain-scale-box');
    if (box) box.style.background = '#fef2f2';
  }
}

function updateTriageLiveDisplay() {
  const sentenceContainer = document.getElementById('triage-live-sentence');
  const tagContainer = document.getElementById('clinical-symptom-tags');

  if (sentenceContainer) {
    sentenceContainer.innerText = patientSentenceHistory.length > 0 
      ? patientSentenceHistory[patientSentenceHistory.length - 1] 
      : (triageLanguage === 'mr' ? "रुग्णाच्या सांकेतिक भाषेची वाट पाहत आहे..." : triageLanguage === 'hi' ? "रोगी के संकेतों की प्रतीक्षा की जा रही है..." : "Awaiting patient communication...");
  }

  if (tagContainer) {
    tagContainer.innerHTML = Array.from(activeSymptomFlags).map(flag => {
      const meta = clinicalTranslationMatrix[flag];
      const priorityClass = meta.priority === 'RED' ? 'tag-red' : meta.priority === 'YELLOW' ? 'tag-yellow' : 'tag-green';
      const label = triageLanguage === 'mr' ? meta.mr : triageLanguage === 'hi' ? meta.hi : flag;
      return `<span class="symptom-tag ${priorityClass}">● [${meta.priority}] ${label}</span>`;
    }).join('');
  }
}

function triggerStaffQuickReply(text) {
  const input = document.getElementById('staff-reply-input');
  if (input) input.value = text;
  sendStaffReply();
}

function sendStaffReply() {
  const input = document.getElementById('staff-reply-input');
  if (!input || !input.value.trim()) return;
  const text = input.value.trim();
  renderStaffReplyOnPatientTerminal(text);
  input.value = '';
}

function renderStaffReplyOnPatientTerminal(text) {
  const playbackContainer = document.getElementById('patient-sign-playback');
  if (!playbackContainer) return;

  const lower = text.toLowerCase();
  const matchedTokens = [];

  const signKeys = ["doctor", "hospital", "help", "emergency", "water", "pain"];
  signKeys.forEach(k => {
    if (lower.includes(k)) matchedTokens.push(k);
  });

  if (matchedTokens.length === 0) matchedTokens.push("doctor");

  playbackContainer.innerHTML = matchedTokens.map(token => {
    const signGraphic = islHandGestureGraphics[token] || islHandGestureGraphics["help"];
    return `
      <div style="background: white; border: 1.5px solid #93c5fd; border-radius: 8px; padding: 6px; text-align: center; min-width: 110px;">
        <div style="height: 60px; display: flex; align-items: center; justify-content: center;">
          ${signGraphic.svg}
        </div>
        <strong style="font-size: 0.75rem; color: #1e3a8a;">${signGraphic.title}</strong>
        <p style="font-size: 0.65rem; color: #64748b; margin: 0;">${signGraphic.motion}</p>
      </div>
    `;
  }).join('');
}

function toggleStaffSpeechInput() {
  const SpeechRec = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SpeechRec) {
    alert("Speech recognition is not supported on this browser. You can type instructions directly.");
    return;
  }
  const recognizer = new SpeechRec();
  recognizer.lang = triageLanguage === 'mr' ? 'mr-IN' : triageLanguage === 'hi' ? 'hi-IN' : 'en-US';
  recognizer.start();

  const micBtn = document.getElementById('staff-mic-btn');
  if (micBtn) micBtn.style.background = '#dc2626';

  recognizer.onresult = (evt) => {
    const transcript = evt.results[0][0].transcript;
    const input = document.getElementById('staff-reply-input');
    if (input) input.value = transcript;
    sendStaffReply();
    if (micBtn) micBtn.style.background = '#2563eb';
  };

  recognizer.onerror = () => {
    if (micBtn) micBtn.style.background = '#2563eb';
  };
}

function startTriageCamera() {
  const video = document.getElementById('triage-webcam-input');
  const canvas = document.getElementById('triage-camera-canvas');
  if (!video || !canvas) return;

  const canvasCtx = canvas.getContext('2d');

  if (!hands) {
    hands = new Hands({
      locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`
    });
    hands.setOptions({
      maxNumHands: 2,
      modelComplexity: 1,
      minDetectionConfidence: 0.55,
      minTrackingConfidence: 0.55
    });
  }

  hands.onResults((results) => {
    canvasCtx.save();
    canvasCtx.clearRect(0, 0, canvas.width, canvas.height);
    canvas.width = video.videoWidth || 520;
    canvas.height = video.videoHeight || 390;

    if (results.multiHandLandmarks) {
      processTriageLandmarks(results.multiHandLandmarks);
      for (const handLandmarks of results.multiHandLandmarks) {
        if (window.drawConnectors && window.HAND_CONNECTIONS) {
          drawConnectors(canvasCtx, handLandmarks, HAND_CONNECTIONS, { color: '#00FF88', lineWidth: 3 });
        }
        if (window.drawLandmarks) {
          drawLandmarks(canvasCtx, handLandmarks, { color: '#FF3366', lineWidth: 1, radius: 4 });
        }
      }
    }
    canvasCtx.restore();
  });

  if (!triageCamera) {
    triageCamera = new Camera(video, {
      onFrame: async () => {
        if (hands) await hands.send({ image: video });
      },
      width: 520,
      height: 390
    });
    triageCamera.start();
  }
}

function stopTriageCamera() {
  if (triageCamera) {
    triageCamera.stop();
    triageCamera = null;
  }
}

function generateTriageTicketPDF() {
  const pulse = document.getElementById('vital-pulse')?.value || "Not Recorded";
  const spo2 = document.getElementById('vital-spo2')?.value || "Not Recorded";
  const bp = document.getElementById('vital-bp')?.value || "Not Recorded";

  const comorbidities = [];
  if (document.getElementById('cm-diabetes')?.checked) comorbidities.push("Diabetes");
  if (document.getElementById('cm-htn')?.checked) comorbidities.push("Hypertension");
  if (document.getElementById('cm-cardiac')?.checked) comorbidities.push("Cardiac History");
  if (document.getElementById('cm-pregnancy')?.checked) comorbidities.push("Pregnancy");

  const ticketId = `TRG-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;
  const timestamp = new Date().toLocaleString('en-IN');

  const ticketMarkup = `
    <div style="padding: 24px; font-family: 'Segoe UI', Arial, sans-serif; color: #0f172a; max-width: 700px; margin: auto; border: 3px solid #dc2626; border-radius: 12px; background: #ffffff;">
      <div style="border-bottom: 2px solid #e2e8f0; padding-bottom: 12px; margin-bottom: 16px; display: flex; justify-content: space-between; align-items: center;">
        <div>
          <h2 style="margin: 0; color: #dc2626; font-size: 1.4rem;">🚨 EMERGENCY CLINICAL TRIAGE TICKET</h2>
          <p style="margin: 2px 0 0 0; font-size: 0.85rem; color: #64748b;">SignLingo Bi-Directional ISL Interpretation Record</p>
        </div>
        <div style="text-align: right;">
          <strong style="font-size: 1rem; color: #0f172a;">${ticketId}</strong><br>
          <span style="font-size: 0.75rem; color: #64748b;">${timestamp}</span>
        </div>
      </div>

      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 16px;">
        <div style="background: #f8fafc; padding: 10px; border-radius: 8px; border: 1px solid #e2e8f0;">
          <strong style="font-size: 0.8rem; color: #475569;">PATIENT VITALS:</strong>
          <p style="margin: 4px 0 0 0; font-size: 0.9rem;"><strong>Pulse:</strong> ${pulse} BPM | <strong>SpO2:</strong> ${spo2}% | <strong>BP:</strong> ${bp}</p>
        </div>
        <div style="background: #f8fafc; padding: 10px; border-radius: 8px; border: 1px solid #e2e8f0;">
          <strong style="font-size: 0.8rem; color: #475569;">PAIN SEVERITY (VAS):</strong>
          <p style="margin: 4px 0 0 0; font-size: 0.9rem; color: #dc2626; font-weight: bold;">${recordedPainScore} / 10</p>
        </div>
      </div>

      <div style="background: #fef2f2; border-left: 4px solid #dc2626; padding: 10px; margin-bottom: 16px;">
        <strong style="font-size: 0.8rem; color: #991b1b;">DETECTED CLINICAL SYMPTOMS:</strong>
        <p style="margin: 4px 0 0 0; font-size: 0.95rem; font-weight: 700; color: #991b1b;">
          ${Array.from(activeSymptomFlags).join(', ') || 'No Critical Flags Detected'}
        </p>
      </div>

      <div style="margin-bottom: 16px;">
        <strong style="font-size: 0.8rem; color: #475569;">DECODED ISL PATIENT NARRATIVE:</strong>
        <ul style="margin: 6px 0 0 16px; padding: 0; font-size: 0.85rem; color: #1e293b;">
          ${patientSentenceHistory.map(s => `<li style="margin-bottom: 4px;">${s}</li>`).join('') || '<li>General consultation query.</li>'}
        </ul>
      </div>

      <div style="margin-bottom: 16px;">
        <strong style="font-size: 0.8rem; color: #475569;">KNOWN COMORBIDITIES:</strong>
        <p style="margin: 4px 0 0 0; font-size: 0.85rem; color: #1e293b;">
          ${comorbidities.length > 0 ? comorbidities.join(', ') : 'None Reported'}
        </p>
      </div>

      <div style="border-top: 1px solid #e2e8f0; padding-top: 8px; font-size: 0.75rem; color: #64748b; text-align: center;">
        Generated via SignLingo TriageHub Accessibility System • Validated for Casualty Admission
      </div>
    </div>
  `;

  const container = document.getElementById('printable-triage-ticket');
  if (container && typeof html2pdf === 'function') {
    container.innerHTML = ticketMarkup;
    container.style.display = 'block';

    const opt = {
      margin: 8,
      filename: `Emergency_Triage_${ticketId}.pdf`,
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: { scale: 2 },
      jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
    };

    html2pdf().set(opt).from(container).save().then(() => {
      container.style.display = 'none';
    });
  }
}
