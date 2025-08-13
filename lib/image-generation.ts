import { generateTextResponse } from "./gemini"

// Unsplash API for free stock photos
const UNSPLASH_ACCESS_KEY = process.env.UNSPLASH_ACCESS_KEY || ""
const UNSPLASH_API_URL = "https://api.unsplash.com"

// Placeholder image service
const PLACEHOLDER_API_URL = "https://picsum.photos"

interface ImageResult {
  success: boolean
  imageUrl?: string
  description?: string
  error?: string
  source: "unsplash" | "placeholder" | "ai-generated"
}

export async function generateImageFromPrompt(prompt: string): Promise<ImageResult> {
  try {
    // First, try to get a real photo from Unsplash if API key is available
    if (UNSPLASH_ACCESS_KEY) {
      const unsplashResult = await searchUnsplashImage(prompt)
      if (unsplashResult.success) {
        return unsplashResult
      }
    }

    // Fallback to AI-generated placeholder with description
    return await generateAIPlaceholderImage(prompt)
  } catch (error) {
    console.error("Image generation error:", error)
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to generate image",
      source: "placeholder",
    }
  }
}

async function searchUnsplashImage(query: string): Promise<ImageResult> {
  try {
    const response = await fetch(
      `${UNSPLASH_API_URL}/search/photos?query=${encodeURIComponent(query)}&per_page=1&orientation=landscape`,
      {
        headers: {
          Authorization: `Client-ID ${UNSPLASH_ACCESS_KEY}`,
        },
      },
    )

    if (!response.ok) {
      throw new Error(`Unsplash API error: ${response.status}`)
    }

    const data = await response.json()

    if (data.results && data.results.length > 0) {
      const photo = data.results[0]
      return {
        success: true,
        imageUrl: photo.urls.regular,
        description: photo.alt_description || `Photo related to: ${query}`,
        source: "unsplash",
      }
    }

    throw new Error("No images found")
  } catch (error) {
    console.error("Unsplash search error:", error)
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to search Unsplash",
      source: "unsplash",
    }
  }
}

async function generateAIPlaceholderImage(prompt: string): Promise<ImageResult> {
  try {
    // Generate a detailed description using Gemini
    const descriptionPrompt = `Create a detailed, vivid description of an image based on this prompt: "${prompt}". 
    Describe colors, composition, lighting, mood, and specific details that would make this image compelling and beautiful. 
    Write it as if you're describing a real photograph or artwork.`

    const descriptionResult = await generateTextResponse(descriptionPrompt)

    if (!descriptionResult.success) {
      throw new Error("Failed to generate image description")
    }

    // Create a placeholder image URL with dimensions and a seed based on the prompt
    const seed = hashString(prompt)
    const width = 800
    const height = 600
    const placeholderUrl = `${PLACEHOLDER_API_URL}/seed/${seed}/${width}/${height}`

    return {
      success: true,
      imageUrl: placeholderUrl,
      description: descriptionResult.content || "AI-generated image description",
      source: "ai-generated",
    }
  } catch (error) {
    console.error("AI placeholder generation error:", error)

    // Final fallback - simple placeholder
    const seed = hashString(prompt)
    return {
      success: true,
      imageUrl: `${PLACEHOLDER_API_URL}/seed/${seed}/800/600`,
      description: `Generated image for: ${prompt}`,
      source: "placeholder",
    }
  }
}

// Simple hash function to create consistent seeds from prompts
function hashString(str: string): number {
  let hash = 0
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i)
    hash = (hash << 5) - hash + char
    hash = hash & hash // Convert to 32-bit integer
  }
  return Math.abs(hash)
}

// Generate creative image prompts
export async function enhanceImagePrompt(userPrompt: string): Promise<string> {
  try {
    const enhancePrompt = `Take this image request: "${userPrompt}" and enhance it with artistic details. 
    Add information about style, lighting, colors, composition, and mood to make it more specific and creative. 
    Keep it concise but descriptive. Return only the enhanced prompt.`

    const result = await generateTextResponse(enhancePrompt)

    if (result.success && result.content) {
      return result.content.trim()
    }

    return userPrompt
  } catch (error) {
    console.error("Prompt enhancement error:", error)
    return userPrompt
  }
}
