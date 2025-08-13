import { z } from "zod"
import { router, publicProcedure } from "../trpc"
import { generateUnifiedResponse } from "@/lib/gemini"
import { createServerClient } from "@/lib/supabase/server"
import { cookies } from "next/headers"

export const chatRouter = router({
  // Get all conversations for the current user
  getConversations: publicProcedure.query(async () => {
    try {
      const cookieStore = cookies()
      const supabase = createServerClient(cookieStore)

      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) {
        return []
      }

      const { data: conversations, error } = await supabase
        .from("conversations")
        .select("*")
        .eq("user_id", user.id)
        .order("updated_at", { ascending: false })

      if (error) {
        console.error("Error fetching conversations:", error)
        return []
      }

      return conversations || []
    } catch (error) {
      console.error("Error in getConversations:", error)
      return []
    }
  }),

  // Get messages for a conversation
  getMessages: publicProcedure.input(z.object({ conversationId: z.string() })).query(async ({ input }) => {
    try {
      const cookieStore = cookies()
      const supabase = createServerClient(cookieStore)

      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) {
        return []
      }

      const { data: messages, error } = await supabase
        .from("messages")
        .select("*")
        .eq("conversation_id", input.conversationId)
        .order("created_at", { ascending: true })

      if (error) {
        console.error("Error fetching messages:", error)
        return []
      }

      return messages || []
    } catch (error) {
      console.error("Error in getMessages:", error)
      return []
    }
  }),

  // Create a new conversation
  createConversation: publicProcedure
    .input(z.object({ title: z.string().min(1, "Title cannot be empty") }))
    .mutation(async ({ input }) => {
      try {
        const cookieStore = cookies()
        const supabase = createServerClient(cookieStore)

        const {
          data: { user },
        } = await supabase.auth.getUser()
        if (!user) {
          throw new Error("User not authenticated")
        }

        const { data: conversation, error } = await supabase
          .from("conversations")
          .insert({
            user_id: user.id,
            title: input.title,
          })
          .select()
          .single()

        if (error) {
          throw new Error(`Failed to create conversation: ${error.message}`)
        }

        return conversation
      } catch (error) {
        console.error("Error creating conversation:", error)
        throw new Error(error instanceof Error ? error.message : "Failed to create conversation")
      }
    }),

  renameConversation: publicProcedure
    .input(
      z.object({
        conversationId: z.string(),
        title: z.string().min(1, "Title cannot be empty"),
      }),
    )
    .mutation(async ({ input }) => {
      try {
        const cookieStore = cookies()
        const supabase = createServerClient(cookieStore)

        const {
          data: { user },
        } = await supabase.auth.getUser()
        if (!user) {
          throw new Error("User not authenticated")
        }

        const { error } = await supabase
          .from("conversations")
          .update({ title: input.title, updated_at: new Date().toISOString() })
          .eq("id", input.conversationId)
          .eq("user_id", user.id)

        if (error) {
          throw new Error(`Failed to rename conversation: ${error.message}`)
        }

        return { success: true }
      } catch (error) {
        console.error("Error renaming conversation:", error)
        throw new Error(error instanceof Error ? error.message : "Failed to rename conversation")
      }
    }),

  // Delete a conversation
  deleteConversation: publicProcedure.input(z.object({ conversationId: z.string() })).mutation(async ({ input }) => {
    try {
      const cookieStore = cookies()
      const supabase = createServerClient(cookieStore)

      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) {
        throw new Error("User not authenticated")
      }

      // Delete messages first (due to foreign key constraint)
      await supabase.from("messages").delete().eq("conversation_id", input.conversationId)

      // Then delete the conversation
      const { error } = await supabase
        .from("conversations")
        .delete()
        .eq("id", input.conversationId)
        .eq("user_id", user.id)

      if (error) {
        throw new Error(`Failed to delete conversation: ${error.message}`)
      }

      return { success: true }
    } catch (error) {
      console.error("Error deleting conversation:", error)
      throw new Error(error instanceof Error ? error.message : "Failed to delete conversation")
    }
  }),

  sendMessage: publicProcedure
    .input(
      z.object({
        message: z.string().min(1, "Message cannot be empty"),
        conversationId: z.string(),
        imageData: z.string().optional(), // Base64 image data
        conversationHistory: z
          .array(
            z.object({
              role: z.enum(["user", "assistant"]),
              content: z.string(),
            }),
          )
          .optional()
          .default([]),
      }),
    )
    .mutation(async ({ input }) => {
      try {
        const cookieStore = cookies()
        const supabase = createServerClient(cookieStore)

        const {
          data: { user },
        } = await supabase.auth.getUser()
        if (!user) {
          throw new Error("User not authenticated")
        }

        let actualConversationId = input.conversationId

        if (input.conversationId === "new") {
          // Create a new conversation with a title based on the first message
          const title = input.message.length > 50 ? input.message.substring(0, 50) + "..." : input.message

          const { data: newConversation, error: createError } = await supabase
            .from("conversations")
            .insert({
              user_id: user.id,
              title: title,
            })
            .select()
            .single()

          if (createError) {
            throw new Error(`Failed to create conversation: ${createError.message}`)
          }

          actualConversationId = newConversation.id
        }

        // Save user message to database
        const { error: userMessageError } = await supabase.from("messages").insert({
          conversation_id: actualConversationId,
          content: input.message,
          role: "user",
          message_type: input.imageData ? "image" : "text",
        })

        if (userMessageError) {
          console.error("Error saving user message:", userMessageError)
        }

        let aiContent = "I'm a ChatGPT clone powered by Gemini AI. How can I help you today?"
        let imageUrl = null
        let messageType = "text"

        try {
          const response = await generateUnifiedResponse(input.message, input.conversationHistory, input.imageData)

          if (response.success) {
            aiContent = response.content || aiContent

            if (response.type === "image_generation" && response.imageUrl) {
              imageUrl = response.imageUrl
              messageType = "image"

              // Create a more detailed response for image generation
              if (response.functionCall?.args?.prompt) {
                const optimizedPrompt = response.functionCall.args.prompt
                aiContent = `🎨 **Image Generated Successfully**

**Optimized Prompt:** ${optimizedPrompt}

I've created a detailed visual concept using Google's advanced AI models. The image incorporates sophisticated artistic elements, proper composition, and enhanced visual details based on your request.

*Powered by Gemini AI + Imagen Technology*`
              }
            } else if (response.type === "weather") {
              // Weather responses are already well formatted
              aiContent = response.content || aiContent
            }
          } else {
            if (response.error?.includes("quota")) {
              aiContent =
                "🚫 **Service Temporarily Unavailable**\n\nI'm experiencing high demand right now. Please try again in a few moments, or consider upgrading your API plan for higher quotas.\n\n*This helps ensure consistent service for all users.*"
            } else {
              aiContent =
                "⚠️ **Processing Error**\n\nI encountered an issue while processing your request. Please try rephrasing your message or try again in a moment.\n\n*If the issue persists, please check your connection.*"
            }
          }
        } catch (error) {
          console.error("AI generation error:", error)
          aiContent =
            "⚠️ **Temporary Service Issue**\n\nI'm having trouble connecting to my AI services right now. Please try again in a moment.\n\n*This is usually a temporary issue that resolves quickly.*"
        }

        // Save AI response to database
        const { error: aiMessageError } = await supabase.from("messages").insert({
          conversation_id: actualConversationId,
          content: aiContent,
          role: "assistant",
          message_type: messageType,
          image_url: imageUrl,
        })

        if (aiMessageError) {
          console.error("Error saving AI message:", aiMessageError)
        }

        // Update conversation's updated_at timestamp
        await supabase
          .from("conversations")
          .update({ updated_at: new Date().toISOString() })
          .eq("id", actualConversationId)

        return {
          success: true,
          content: aiContent,
          messageType: messageType,
          imageUrl,
          conversationId: actualConversationId,
        }
      } catch (error) {
        console.error("Chat API error:", error)
        throw new Error(error instanceof Error ? error.message : "Failed to process message")
      }
    }),
})
