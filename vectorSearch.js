const { pipeline } = require("@xenova/transformers")

let embedder = null

async function loadModel() {
  if (!embedder) {
    embedder = await pipeline(
      "feature-extraction",
      "Xenova/all-MiniLM-L6-v2"
    )
  }
  return embedder
}

function cosineSimilarity(a, b) {
  let dot = 0
  let normA = 0
  let normB = 0

  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i]
    normA += a[i] * a[i]
    normB += b[i] * b[i]
  }

  return dot / (Math.sqrt(normA) * Math.sqrt(normB))
}

async function semanticSearch(question, clubData) {

  const model = await loadModel()

  const dataTexts = Object.entries(clubData).map(
    ([key, value]) => `${key}: ${JSON.stringify(value)}`
  )

  const questionEmbedding = await model(question)

  const questionVector = questionEmbedding.data

  let bestScore = -1
  let bestText = ""

  for (const text of dataTexts) {

    const emb = await model(text)
    const vec = emb.data

    const score = cosineSimilarity(questionVector, vec)

    if (score > bestScore) {
      bestScore = score
      bestText = text
    }
  }

  return bestText
}

module.exports = semanticSearch