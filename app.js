let currentSymptoms = new Set();
const SEQUENCE_LENGTH = 30;
const featureSequence = [];
let isPredicting = false;

// 12 key facial non-manual marker landmarks
const KEY_FACE_INDICES = [10, 338, 297, 332, 284, 251, 389, 356, 454, 323, 361, 288];

// SVG Dictionary for Staff-to-Patient reverse translation
const signVisuals = {
  "Doctor": {
    title: "DOCTOR / डॉक्टर",
    instruction: "Tapping pulse point on wrist twice.",
    svg: `<svg width="70" height="70" viewBox="0 0 120 120"><rect x="15" y="65" width="85" height="28" rx="8" fill="#e2e8f0" stroke="#718096" stroke-width="2"/><circle cx="45" cy="79" r="6" fill="#feb2b2" stroke="#e53e3e" stroke-width="1.5"/><path d="M 40 20 L 40 70 M 50 20 L 50 70 M 58 45 L 68 55" stroke="#2b6cb0" stroke-width="6" stroke-linecap="round"/></svg>`
  },
  "Hospital": {
    title: "HOSPITAL ADMISSION / रुग्णालय",
    instruction: "Draw cross on upper shoulder/arm.",
    svg: `<svg width="70" height="70" viewBox="0 0 120 120"><path d="M 25 30 Q 55 15 95 30 L 85 95 Q 55 105 25 95 Z" fill="#ebf8ff" stroke="#3182ce" stroke-width="2"/><line x1="60" y1="35" x2="60" y2="85" stroke="#e53e3e" stroke-width="6" stroke-linecap="round"/><line x1="38" y1="58" x2="82" y2="58" stroke="#e53e3e" stroke-width="6" stroke-linecap="round"/></svg>`
  },
  "Wait": {
    title: "PLEASE WAIT / कृपया थांबा",
    instruction: "Flat open hand held forward calmly.",
    svg: `<svg width="70" height="70" viewBox="0 0 120 120"><circle cx="60" cy="60" r="45" fill="#fef3c7" stroke="#d97706" stroke-width="3"/><path d="M 60 30 L 60 65 L 85 65" stroke="#d97706" stroke-width="6" stroke-linecap="round"/></svg>`
  },
  "Water": {
    title: "DRINK WATER / पाणी",
    instruction: "Form 'W' handshape near chin.",
    svg: `<svg width="70" height="70" viewBox="0 0 120 120"><line x1="45" y1="75" x2="40" y2="25" stroke="#3182ce" stroke-width="5" stroke-linecap="round"/><line x1="55" y1="75" x2="55" y2="20" stroke="#3182ce" stroke-width="5" stroke-linecap="round"/><line x1="65" y1="75" x2="70" y2="25" stroke="#3182ce" stroke-width="5" stroke-linecap="round"/></svg>`
  }
};

function extractHolisticKeypoints(results) {
  const frameFeatures = [];

  // 1. Pose landmarks (Shoulders & Torso: 4 points = 12 values)
  if (results.poseLandmarks) {
    [11, 12, 23, 24].forEach(idx => {
      const p = results.poseLandmarks[idx];
      frameFeatures.push(p ? p.x : 0, p ? p.y : 0, p ? p.z : 0);
    });
  } else {
    for (let i = 0; i < 12; i++) frameFeatures.push(0.0);
  }

  // 2. Face Non-Manual Markers (12 points = 36 values)
  if (results.faceLandmarks) {
    KEY_FACE_INDICES.forEach(idx => {
      const p = results.faceLandmarks[idx];
      frameFeatures.push(p ? p.x : 0, p ? p.y : 0, p ? p.z : 0);
    });
  } else {
    for (let i = 0; i < 36; i++) frameFeatures.push(0.0);
  }

  // 3. Left Hand (21 points = 63 values)
  if (results.leftHandLandmarks) {
    results.leftHandLandmarks.forEach(p => frameFeatures.push(p.x, p.y, p.z));
  } else {
    for (let i = 0; i < 63; i++) frameFeatures.push(0.0);
  }

  // 4. Right Hand (21 points = 63 values)
  if (results.rightHandLandmarks) {
    results.rightHandLandmarks.forEach(p => frameFeatures.push(p.x, p.y, p.z));
  } else {
    for (let i = 0; i < 63; i++) frameFeatures.push(0.0);
  }

  return frameFeatures; // Total: 174 features per frame
}

// MediaPipe Setup
const videoElement = document.getElementById("webcam");
const canvasElement = document.getElementById("output-canvas");
const canvasCtx = canvasElement.getContext("2d");
const detectionPill = document.getElementById("detection-pill");

const holistic = new Holistic({
  locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/holistic/${file}`
});

holistic.setOptions({
  modelComplexity: 1,
  smoothLandmarks: true,
  minDetectionConfidence: 0.55,
  minTrackingConfidence: 0.55
});

holistic.onResults(async (results) => {
  canvasCtx.save();
  canvasCtx.clearRect(0, 0, canvasElement.width, canvasElement.height);
  canvasElement.width = videoElement.videoWidth || 480;
  canvasElement.height = videoElement.videoHeight || 360;

  // Draw Visual Skeletons
  if (results.leftHandLandmarks) {
    drawConnectors(canvasCtx, results.leftHandLandmarks, HAND_CONNECTIONS, { color: '#38bdf8', lineWidth: 2 });
  }
  if (results.rightHandLandmarks) {
    drawConnectors(canvasCtx, results.rightHandLandmarks, HAND_CONNECTIONS, { color: '#38bdf8', lineWidth: 2 });
  }
  if (results.faceLandmarks) {
    KEY_FACE_INDICES.forEach(idx => {
      const pt = results.faceLandmarks[idx];
      if (pt) {
        canvasCtx.beginPath();
        canvasCtx.arc(pt.x * canvasElement.width, pt.y * canvasElement.height, 2, 0, 2 * Math.PI);
        canvasCtx.fillStyle = '#f59e0b';
        canvasCtx.fill();
      }
    });
  }

  // Manage 30-Frame FIFO Buffer
  const frameFeatures = extractHolisticKeypoints(results);
  featureSequence.push(frameFeatures);
  if (featureSequence.length > SEQUENCE_LENGTH) {
    featureSequence.shift();
  }

  // Predict when buffer is full
  if (featureSequence.length === SEQUENCE_LENGTH && !isPredicting) {
    isPredicting = true;
    try {
      const res = await fetch("/api/model/predict", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sequence: featureSequence })
      });
      const data = await res.json();
      
      if (data.is_valid) {
        registerSymptom(data.sign);
        detectionPill.innerText = `${data.sign} (${data.confidence}%)`;
        detectionPill.style.background = "#15803d";
      } else {
        detectionPill.innerText = data.sign;
        detectionPill.style.background = "rgba(15, 23, 42, 0.85)";
      }
    } catch (err) {
      console.error("Inference Error:", err);
    } finally {
      isPredicting = false;
    }
  }

  canvasCtx.restore();
});

const camera = new Camera(videoElement, {
  onFrame: async () => {
    await holistic.send({ image: videoElement });
  },
  width: 480,
  height: 360
});
camera.start();

// ----------------- INTAKE QUEUE & REVERSE DISPATCH -----------------
function registerSymptom(symptom) {
  if (currentSymptoms.has(symptom)) return;
  currentSymptoms.add(symptom);

  const bucket = document.getElementById("symptoms-bucket");
  const emptyHint = bucket.querySelector(".empty-hint");
  if (emptyHint) emptyHint.remove();

  const tag = document.createElement("div");
  tag.className = "symptom-tag";
  tag.innerHTML = `<i class="fa-solid fa-triangle-exclamation"></i> ${symptom} <i class="fa-solid fa-xmark" style="cursor:pointer;" onclick="removeSymptom('${symptom}', this)"></i>`;
  bucket.appendChild(tag);
}

function removeSymptom(symptom, el) {
  currentSymptoms.delete(symptom);
  el.parentElement.remove();
}

function dispatchToPatient(wordKey) {
  const area = document.getElementById("visual-sign-card");
  const sign = signVisuals[wordKey];
  if (sign) {
    area.innerHTML = `
      <div style="margin-bottom:6px;">${sign.svg}</div>
      <h3 style="color:#0369a1; font-size:1.05rem;">${sign.title}</h3>
      <p style="font-size:0.8rem; color:#475569;">${sign.instruction}</p>
    `;
  }
}

function sendCustomStaffText() {
  const input = document.getElementById("nurse-custom-text");
  const val = input.value.trim();
  if (!val) return;
  
  const area = document.getElementById("visual-sign-card");
  area.innerHTML = `
    <h3 style="color:#0f172a; font-size:1.1rem; margin-bottom: 4px;">Staff Notice:</h3>
    <p style="font-size:1.05rem; color:#0284c7; font-weight:700;">"${val}"</p>
  `;
  input.value = "";
}

// ----------------- DATABASE COMMIT & PDF EXPORT -----------------
async function commitTriageIntake() {
  if (currentSymptoms.size === 0) {
    alert("Please perform and detect at least one patient symptom before generating a ticket.");
    return;
  }

  const payload = {
    patient_identifier: "OPD-DHH-Patient",
    detected_signs: Array.from(currentSymptoms),
    nurse_notes: "Processed via SignLingo Dynamic Interpretation Terminal."
  };

  try {
    const res = await fetch("/api/intake/create", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
    const data = await res.json();
    renderTriageTicket(data);
  } catch (err) {
    console.error("Backend error:", err);
    alert("Error communicating with backend database.");
  }
}

function renderTriageTicket(data) {
  const container = document.getElementById("triage-ticket-output");
  container.style.display = "block";
  container.innerHTML = `
    <div class="ticket-container" id="printable-ticket">
      <div class="ticket-header">
        <div>
          <h2>EMERGENCY TRIAGE INTAKE SUMMARY</h2>
          <p style="font-size:0.8rem; color:#64748b;">Hospital OPD / Casualty Intake Record</p>
        </div>
        <div style="text-align:right;">
          <strong>ID: ${data.intake_id}</strong><br>
          <span style="font-size:0.8rem;">${data.timestamp}</span>
        </div>
      </div>
      <p><strong>Priority Status:</strong> <span style="color:#b91c1c; font-weight:800;">${data.priority}</span></p>
      <p style="margin-top:0.5rem;"><strong>Primary Chief Complaints (ISL Detected):</strong></p>
      <ul style="margin: 0.5rem 0 1rem 1.5rem;">
        ${data.detected_signs.map(s => `<li>${s}</li>`).join('')}
      </ul>
      <p style="font-size:0.85rem; color:#475569; border-top:1px solid #cbd5e1; padding-top:0.5rem;">
        Generated automatically via SignLingo TriageHub Assistive Terminal.
      </p>
    </div>
    <button onclick="downloadTicketPDF()" style="margin-top:0.75rem; background:#0f172a; color:white; border:none; padding:8px 16px; border-radius:6px; cursor:pointer;">
      <i class="fa-solid fa-download"></i> Save Ticket as PDF
    </button>
  `;
  container.scrollIntoView({ behavior: 'smooth' });
}

function downloadTicketPDF() {
  const element = document.getElementById("printable-ticket");
  html2pdf().from(element).save("Triage_Ticket.pdf");
}
