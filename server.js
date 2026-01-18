const express = require("express");
const cors = require("cors");
const fs = require("fs");
const path = require("path");
const axios = require("axios");

const app = express();
app.use(express.json());
app.use(cors());

/* -----------------------------------------------------------
   LOAD JSON (SOURCE OF TRUTH)
----------------------------------------------------------- */
const dataPath = path.join(__dirname, "data.json");
const clubData = JSON.parse(fs.readFileSync(dataPath, "utf8"));

/* -----------------------------------------------------------
   SERVE FRONTEND
----------------------------------------------------------- */
app.use(express.static(__dirname));
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "index.html"));
});

/* -----------------------------------------------------------
   NORMALIZER (STT ROBUST)
----------------------------------------------------------- */
function normalize(q) {
  return q
    .toLowerCase()
    .replace(/elektra|electer|electron|electra bot/g, "electra")
    .replace(/college|collage|collate|cold lead|call lead/g, "colead")
    .replace(/co lead|co-lead|colead/g, "colead")
    .replace(/presedent|presidant|prez/g, "president")
    .replace(/marketting|markting|markiting/g, "marketing")
    .replace(/contant|conteant|conten/g, "content")
    .replace(/creativ|creatve/g, "creative")
    .replace(/hard ware|hardwere|hardwar/g, "hardware")
    .replace(/soft ware|sofware|sofwere|softwar/g, "software")
    .replace(/head|leader/g, "lead")
    .replace(/\s+/g, " ")
    .trim();
}

/* -----------------------------------------------------------
   SAFE RESPONSE HELPERS
----------------------------------------------------------- */
function lead(name, label) {
  if (!name || !name.trim()) return `${label} is not assigned yet.`;
  return `${label} is ${name}.`;
}

function coLead(name, label) {
  if (!name || !name.trim()) {
    return `The Co-Lead of the ${label} is not assigned yet.`;
  }
  return `The Co-Lead of the ${label} is ${name}.`;
}

/* -----------------------------------------------------------
   MAIN ANSWER LOGIC (UNCHANGED)
----------------------------------------------------------- */
function answerFromData(question) {
  const q = normalize(question);

  if (
    q.includes("what is g electra") ||
    q.includes("about g electra") ||
    q.includes("about club") ||
    q.includes("what is this club")
  ) return clubData.about;

  if (q.includes("president") && !q.includes("vice"))
    return lead(clubData.members.President, "The President of G-electra Club");

  if (q.includes("vice") && q.includes("president"))
    return lead(clubData.members.VicePresident, "The Vice President of G-electra Club");

  if (q.includes("secretary"))
    return `The Secretaries are ${clubData.members.Secretary}.`;

  if (q.includes("treasurer"))
    return lead(clubData.members.Treasurer, "The Treasurer of G-electra Club");

  if (q.includes("software") && q.includes("colead"))
    return coLead(clubData.members.SoftwareCoLead, "Software Wing");

  if (q.includes("software") && q.includes("lead"))
    return lead(clubData.members.SoftwareLead, "The Lead of the Software Wing");

  if (q.includes("hardware") && q.includes("colead"))
    return coLead(clubData.members.HardwareCoLead, "Hardware Wing");

  if (q.includes("hardware") && q.includes("lead"))
    return lead(clubData.members.HardwareLead, "The Lead of the Hardware Wing");

  if (q.includes("marketing") && q.includes("colead"))
    return coLead(clubData.members.MarketingCoLead, "Marketing Team");

  if (q.includes("marketing") && q.includes("lead"))
    return lead(clubData.members.MarketingLead, "The Lead of the Marketing Team");

  if (q.includes("content") && q.includes("colead"))
    return coLead(clubData.members.ContentCoLead, "Content Team");

  if (q.includes("content") && q.includes("lead"))
    return lead(clubData.members.ContentLead, "The Lead of the Content Team");

  if (q.includes("creative") && q.includes("colead"))
    return coLead(clubData.members.CreativeCoLead, "Creative Design Team");

  if (q.includes("creative") && q.includes("lead"))
    return lead(clubData.members.CreativeLead, "The Lead of the Creative Design Team");

  if (q.includes("web") || q.includes("developer"))
    return lead(clubData.members.WebLead, "The Lead of the Web Development Team");

  if (q.includes("categories") || q.includes("teams") || q.includes("wings"))
    return `The categories in G-electra Club are: ${clubData.categories.join(", ")}.`;

  if (q.includes("havana")) {
    const hv = clubData.events.past.find(e => e.name.toLowerCase() === "havana");
    return `Havana (${hv.date}): ${hv.description}`;
  }

  if (q.includes("upcoming") || q.includes("next event")) {
    const next = clubData.events.upcoming[0];
    return `The next event is ${next.name} on ${next.date}.`;
  }

  if (q.includes("past events"))
    return clubData.events.past.map(e => `${e.name} (${e.date})`).join(", ");

  return null;
}

/* -----------------------------------------------------------
   OLLAMA (SEARCH ONLY)
----------------------------------------------------------- */
async function askOllama(question) {
  const res = await axios.post("http://localhost:11434/api/generate", {
    model: "mistral",
    prompt: `You are Electra Bot. Answer clearly:\n${question}`,
    stream: false
  });
  return res.data.response;
}

/* -----------------------------------------------------------
   CHAT API (TEXT SEARCH)
----------------------------------------------------------- */
app.post("/chat", async (req, res) => {
  const question = (req.body.question || "").trim();
  if (!question) {
    return res.json({ answer: "Ask a question about G-electra Club." });
  }

  const q = normalize(question);

  if (
    q.includes("colead") &&
    !(
      q.includes("software") ||
      q.includes("hardware") ||
      q.includes("content") ||
      q.includes("creative") ||
      q.includes("marketing")
    )
  ) {
    return res.json({
      answer:
        "Which wing’s co-lead are you asking about? Software, Hardware, Content, Creative, or Marketing."
    });
  }

  const localAnswer = answerFromData(question);
  if (localAnswer !== null) {
    return res.json({ answer: localAnswer });
  }

  const aiAnswer = await askOllama(question);
  res.json({ answer: aiAnswer });
});

/* -----------------------------------------------------------
   VOICE API – JSON ONLY, NO OLLAMA
----------------------------------------------------------- */
app.post("/voice", (req, res) => {
  const question = (req.body.question || "").trim();
  if (!question) {
    return res.json({ answer: "Please ask again." });
  }

  const localAnswer = answerFromData(question);

  if (localAnswer !== null) {
    return res.json({ answer: localAnswer });
  }

  return res.json({
    answer: "I can answer only about G-electra Club information."
  });
});

/* -----------------------------------------------------------
   START SERVER
----------------------------------------------------------- */
app.listen(5000, () => {
  console.log("🚀 Electra Bot running at http://localhost:5000");
});
