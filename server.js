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
   SIMPLE RAG SEARCH
----------------------------------------------------------- */
function searchClubData(question) {

  const q = question.toLowerCase();
  let results = [];

  for (const key in clubData) {

    const value = JSON.stringify(clubData[key]).toLowerCase();

    if (value.includes(q)) {
      results.push(`${key}: ${JSON.stringify(clubData[key])}`);
    }

  }

  return results.slice(0,3).join("\n");
}

/* -----------------------------------------------------------
   INTELLIGENT JSON SEARCH
----------------------------------------------------------- */
function intelligentSearch(question) {

  const q = question.toLowerCase();
  let answers = [];

  if (q.includes("g electra") || q.includes("about club")) {
    answers.push(clubData.about);
  }

  if (q.includes("lead")) {

    if (clubData.members.SoftwareLead)
      answers.push(`Software Lead: ${clubData.members.SoftwareLead}`);

    if (clubData.members.HardwareLead)
      answers.push(`Hardware Lead: ${clubData.members.HardwareLead}`);

    if (clubData.members.MarketingLead)
      answers.push(`Marketing Lead: ${clubData.members.MarketingLead}`);

    if (clubData.members.ContentLead)
      answers.push(`Content Lead: ${clubData.members.ContentLead}`);

    if (clubData.members.CreativeLead)
      answers.push(`Creative Lead: ${clubData.members.CreativeLead}`);
  }

  if (q.includes("colead") || q.includes("co lead")) {

    if (clubData.members.SoftwareCoLead)
      answers.push(`Software Co-Lead: ${clubData.members.SoftwareCoLead}`);

    if (clubData.members.HardwareCoLead)
      answers.push(`Hardware Co-Lead: ${clubData.members.HardwareCoLead}`);

    if (clubData.members.MarketingCoLead)
      answers.push(`Marketing Co-Lead: ${clubData.members.MarketingCoLead}`);

    if (clubData.members.ContentCoLead)
      answers.push(`Content Co-Lead: ${clubData.members.ContentCoLead}`);

    if (clubData.members.CreativeCoLead)
      answers.push(`Creative Co-Lead: ${clubData.members.CreativeCoLead}`);
  }

  if (q.includes("team") || q.includes("categories") || q.includes("wings")) {
    answers.push(`The teams in G-Electra are: ${clubData.categories.join(", ")}`);
  }

  if (q.includes("event")) {

    const past = clubData.events.past.map(e => `${e.name} (${e.date})`);
    const upcoming = clubData.events.upcoming.map(e => `${e.name} (${e.date})`);

    answers.push(`Past Events: ${past.join(", ")}`);
    answers.push(`Upcoming Events: ${upcoming.join(", ")}`);
  }

  if (answers.length > 0) {
    return answers.join("\n");
  }

  return null;
}

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
   MAIN ANSWER LOGIC
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

  if (q.includes("treasurer"))
    return lead(clubData.members.Treasurer, "The Treasurer of G-electra Club");

  return null;
}

/* -----------------------------------------------------------
   SMART FALLBACK RESPONSE
----------------------------------------------------------- */
async function askOllama(question) {

  const relevantInfo = searchClubData(question);

  if (relevantInfo) {
    return relevantInfo;
  }

  return "I'm sorry, I couldn't find information about that. But I can help you with details related to the G-Electra Club such as members, teams, leads, and events.";
}

/* -----------------------------------------------------------
   CHAT API
----------------------------------------------------------- */
app.post("/chat", async (req, res) => {

  const question = (req.body.question || "").trim();

  if (!question) {
    return res.json({ answer: "Ask a question about G-electra Club." });
  }

  const localAnswer = answerFromData(question);

  if (localAnswer !== null) {
    return res.json({ answer: localAnswer });
  }

  const smartAnswer = intelligentSearch(question);

  if (smartAnswer !== null) {
    return res.json({ answer: smartAnswer });
  }

  const aiAnswer = await askOllama(question);

  res.json({ answer: aiAnswer });

});

/* -----------------------------------------------------------
   VOICE API
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

  const smartAnswer = intelligentSearch(question);

  if (smartAnswer !== null) {
    return res.json({ answer: smartAnswer });
  }

  return res.json({
    answer: "I can help with information about the G-Electra Club such as members, teams, leads, and events."
  });

});

/* -----------------------------------------------------------
   START SERVER
----------------------------------------------------------- */
const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`🚀 Electra Bot running on port ${PORT}`);
});