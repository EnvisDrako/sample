import { GoogleGenerativeAI } from "@google/generative-ai"

// Initialize Gemini AI
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "")

export const getGeminiModel = (useFlash = true) => {
  const modelName = useFlash ? "gemini-1.5-flash" : "gemini-1.5-pro"
  return genAI.getGenerativeModel({
    model: modelName,
    generationConfig: {
      temperature: 0.7,
      topP: 0.8,
      topK: 40,
      maxOutputTokens: 2048,
    },
  })
}

export async function generateUnifiedResponse(
  prompt: string,
  conversationHistory: Array<{ role: string; content: string }> = [],
  imageData?: string,
) {
  let lastError: Error | null = null

  for (const useFlash of [true, false]) {
    try {
      const model = getGeminiModel(useFlash)

      const systemPrompt = `You are ChatGPT, a helpful AI assistant. You can:
- Have natural conversations and answer questions
- Analyze uploaded images when provided
- Provide helpful information on various topics

Be conversational and helpful in all interactions.`

      // Start chat without tools
      const chat = model.startChat({
        history: conversationHistory.map((msg) => ({
          role: msg.role === "user" ? "user" : "model",
          parts: [{ text: msg.content }],
        })),
      })

      const messageParts = []

      // Add text prompt
      if (prompt) {
        messageParts.push({ text: prompt })
      }

      // Add image if provided
      if (imageData) {
        messageParts.push({
          inlineData: {
            data: imageData.split(",")[1],
            mimeType: imageData.split(";")[0].split(":")[1],
          },
        })
      }

      const result = await chat.sendMessage(messageParts)
      const response = result.response

      // Regular text response only
      const text = response.text()
      return {
        success: true,
        content: text,
        type: "text",
        error: null,
      }
    } catch (error) {
      lastError = error instanceof Error ? error : new Error("Unknown error")
      console.error(`Gemini API error with ${useFlash ? "Flash" : "Pro"} model:`, error)

      if (error instanceof Error && error.message.includes("quota")) {
        console.log(`Quota exceeded for ${useFlash ? "Flash" : "Pro"} model, trying fallback...`)
        continue
      } else {
        // For non-quota errors, don't retry
        break
      }
    }
  }

  const isQuotaError = lastError?.message.includes("quota") || lastError?.message.includes("429")

  return {
    success: false,
    content: null,
    error: isQuotaError
      ? "I'm currently experiencing high demand. Please try again in a few minutes, or consider upgrading your Gemini API plan for higher quotas."
      : lastError?.message || "Failed to generate response",
  }
}

export async function generateTextResponse(
  prompt: string,
  conversationHistory: Array<{ role: string; content: string }> = [],
) {
  return generateUnifiedResponse(prompt, conversationHistory)
}

export async function analyzeImageWithText(prompt: string, imageData: string) {
  return generateUnifiedResponse(prompt, [], imageData)
}
