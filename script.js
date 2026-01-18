/* -----------------------------------------------------------
   ELECTRABOT – VOICE UI (RESTORED & FIXED)
----------------------------------------------------------- */

let voiceMode = false;
let speaking = false;
let recognition = null;
let startupPlayed = false;

let finalTranscript = "";
let silenceTimer = null;

/* ---------------- DOM ---------------- */
const voiceBtn = document.getElementById("voiceBtn");
const voiceOverlay = document.getElementById("voiceOverlay");
const voiceTextEl = document.querySelector(".voice-text");
const responseOutputEl = document.getElementById("responseOutput");

/* ---------------- TEXT SEARCH ---------------- */
async function askQuestion() {
  if (voiceMode) return;

  const input = document.getElementById("questionInput");
  const question = input.value.trim();
  if (!question) return;

  responseOutputEl.textContent = "Thinking...";

  const res = await fetch("/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ question })
  });

  const data = await res.json();
  responseOutputEl.textContent = data.answer;
}

/* ---------------- TEXT TO SPEECH ---------------- */
function speak(text, pitch = 1, rate = 1) {
  return new Promise(resolve => {
    window.speechSynthesis.cancel();
    speaking = true;

    const utter = new SpeechSynthesisUtterance(text);
    utter.lang = "en-US";
    utter.pitch = pitch;
    utter.rate = rate;

    voiceOverlay.classList.add("speaking");
    voiceOverlay.classList.remove("listening");

    utter.onend = () => {
      speaking = false;
      voiceOverlay.classList.remove("speaking");
      voiceOverlay.classList.add("listening");

      // ✅ RESTART LISTENING FOR NEXT QUESTION
      if (voiceMode && recognition) {
        try {
          recognition.start();
        } catch (_) {}
      }

      resolve();
    };

    window.speechSynthesis.speak(utter);
  });
}



/* ---------------- SPEECH RECOGNITION ---------------- */
const SR = window.SpeechRecognition || window.webkitSpeechRecognition;

if (SR) {
  recognition = new SR();
  recognition.lang = "en-US";
  recognition.continuous = true;
  recognition.interimResults = true;

  recognition.onstart = () => {
    finalTranscript = "";
    voiceTextEl.textContent = "Listening...";
  };

  recognition.onresult = (event) => {
    let interim = "";

    for (let i = event.resultIndex; i < event.results.length; i++) {
      const transcript = event.results[i][0].transcript;
      if (event.results[i].isFinal) {
        finalTranscript += transcript + " ";
      } else {
        interim += transcript;
      }
    }

    voiceTextEl.textContent =
      "You said: " + (finalTranscript + interim).trim();

    clearTimeout(silenceTimer);
    silenceTimer = setTimeout(async () => {
      recognition.stop();
      const question = finalTranscript.trim();
      finalTranscript = "";

      if (!question) return;

      /* 🔥 ONLY CHANGE: CALL /voice */
      const res = await fetch("/voice", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question })
      });

      const data = await res.json();
      await speak(data.answer);
    }, 900);
  };

  recognition.onerror = () => {
    recognition.stop();
  };
}

/* ---------------- VOICE MODE ---------------- */
async function startVoiceMode() {
  if (!recognition) {
    alert("Voice not supported");
    return;
  }

  voiceMode = true;
  responseOutputEl.textContent = "";

  voiceOverlay.style.display = "flex";
  voiceOverlay.classList.add("listening");
  voiceOverlay.classList.remove("speaking");

  if (!startupPlayed) {
    startupPlayed = true;
    await speak("Welcome to Electra Bot. Systems online.", 0.6, 0.9);
  }

  recognition.start();
}

function stopVoiceMode() {
  voiceMode = false;
  startupPlayed = false;
  finalTranscript = "";

  window.speechSynthesis.cancel();
  try { recognition.stop(); } catch {}

  voiceOverlay.style.display = "none";
}

/* ---------------- BUTTONS ---------------- */
voiceBtn.addEventListener("click", startVoiceMode);
window.stopVoiceMode = stopVoiceMode;
window.askQuestion = askQuestion;
