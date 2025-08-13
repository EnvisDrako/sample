"use client"

import type React from "react"
import { useState, useRef, useEffect } from "react"
import { Button, Form } from "react-bootstrap"
import { MessageSquare, ImageIcon, ArrowUp, Menu, LogOut } from "lucide-react"
import { trpc } from "@/lib/trpc/client"
import { createClient } from "@/lib/supabase/client"
import ConversationsList from "./conversations-list"
import { signOut } from "@/lib/actions"

interface Message {
  id: string
  role: "user" | "assistant"
  content: string
  type?: "text" | "image"
  imageUrl?: string
  createdAt: string
}

export default function ChatInterface() {
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [messages, setMessages] = useState<Message[]>([])
  const [inputMessage, setInputMessage] = useState("")
  const [uploadedImage, setUploadedImage] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [currentConversationId, setCurrentConversationId] = useState<string | null>(null)
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [showScrollTop, setShowScrollTop] = useState(false)
  const [headerVisible, setHeaderVisible] = useState(true)
  const [lastScrollY, setLastScrollY] = useState(0)

  const chatContainerRef = useRef<HTMLDivElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // --- FIX: Get tRPC context for invalidating queries ---
  const utils = trpc.useContext()

  // --- FIX: Add query to fetch messages for selected conversation ---
  const { data: conversationMessages = [], isLoading: isLoadingMessages } = trpc.chat.getMessages.useQuery(
    { conversationId: currentConversationId! },
    { enabled: !!currentConversationId && currentConversationId !== "new" }
  )

  // --- FIX: Get current conversation details for header ---
  const { data: conversations = [] } = trpc.chat.getConversations.useQuery()
  const currentConversation = conversations.find((c: any) => c.id === currentConversationId)

  // --- FIX: Load messages when conversation changes ---
  useEffect(() => {
    if (currentConversationId && currentConversationId !== "new") {
      // Convert database messages to local message format
      const formattedMessages = conversationMessages.map((msg: any) => ({
        id: msg.id,
        role: msg.role,
        content: msg.content,
        type: msg.message_type === "image" ? "image" : "text",
        imageUrl: msg.image_url,
        createdAt: msg.created_at,
      }))
      setMessages(formattedMessages)
    } else if (currentConversationId === null) {
      // New conversation - clear messages
      setMessages([])
    }
  }, [currentConversationId, conversationMessages])

  const sendMessageMutation = trpc.chat.sendMessage.useMutation({
    onSuccess: (response) => {
      // --- FIX: Invalidate the conversations query to force a refresh ---
      // This will make the ConversationsList component update automatically
      // when a new chat is created.
      if (!currentConversationId || currentConversationId === "new") {
        utils.chat.getConversations.invalidate()
      }
      
      setUploadedImage(null)
      if (fileInputRef.current) {
        fileInputRef.current.value = ""
      }

      if (response.conversationId && response.conversationId !== currentConversationId) {
        setCurrentConversationId(response.conversationId)
      }

      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: response.content,
        type: response.messageType === "image" ? "image" : "text",
        imageUrl: response.imageUrl,
        createdAt: new Date().toISOString(),
      }

      setMessages((prev) => {
        const currentMessages = Array.isArray(prev) ? prev : []
        return [...currentMessages, assistantMessage]
      })
    },
    onError: (error) => {
      console.error("Error sending message:", error)
      setMessages((prev) => {
        const currentMessages = Array.isArray(prev) ? prev : []
        return currentMessages.slice(0, -1)
      })
    },
    onSettled: () => {
      setIsLoading(false)
    },
  })

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const supabase = createClient()
        const {
          data: { user },
        } = await supabase.auth.getUser()
        setUser(user)
      } catch (error) {
        console.error("Auth check error:", error)
      } finally {
        setLoading(false)
      }
    }

    checkAuth()
  }, [])

  if (loading) {
    return (
      <div className="d-flex min-vh-100 align-items-center justify-content-center bg-dark">
        <div className="text-center">
          <div className="spinner-border text-primary mb-3" role="status">
            <span className="visually-hidden">Loading...</span>
          </div>
          <p className="text-white">Loading...</p>
        </div>
      </div>
    )
  }

  if (!user) {
    return (
      <div className="d-flex min-vh-100 align-items-center justify-content-center bg-dark">
        <div className="text-center">
          <h1 className="h2 mb-4 text-white">Please sign in to continue</h1>
          <a href="/auth/login" className="btn btn-primary">
            Go to Login
          </a>
        </div>
      </div>
    )
  }

  const handleSendMessage = async (e?: React.FormEvent) => {
    e?.preventDefault()

    if ((!inputMessage.trim() && !uploadedImage) || isLoading) return

    const messageContent = inputMessage.trim() || (uploadedImage ? "Image" : "")
    const imageToSend = uploadedImage

    setInputMessage("")
    setIsLoading(true)

    const tempId = Date.now().toString()
    const userMessage: Message = {
      id: tempId,
      role: "user",
      content: messageContent,
      type: imageToSend ? "image" : "text",
      imageUrl: imageToSend || undefined,
      createdAt: new Date().toISOString(),
    }

    setMessages((prev) => {
      const currentMessages = Array.isArray(prev) ? prev : []
      return [...currentMessages, userMessage]
    })

    sendMessageMutation.mutate({
      message: messageContent,
      conversationId: currentConversationId || "new",
      imageData: imageToSend || undefined,
      conversationHistory: messages.map((msg) => ({
        role: msg.role,
        content: msg.content,
      })),
    })
  }

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      const reader = new FileReader()
      reader.onload = (event) => {
        const result = event.target?.result as string
        setUploadedImage(result)
      }
      reader.readAsDataURL(file)
    }
  }

  const handleCopyMessage = (content: string) => {
    navigator.clipboard.writeText(content)
  }

  const scrollToTop = () => {
    chatContainerRef.current?.scrollTo({ top: 0, behavior: "smooth" })
  }

  const startNewConversation = () => {
    setMessages([])
    setCurrentConversationId(null)
    setSidebarOpen(false)
  }

  const handleSignOut = async () => {
    try {
      await signOut()
    } catch (error) {
      console.error("Sign out error:", error)
    }
  }

  const handleSelectConversation = (conversationId: string) => {
    setCurrentConversationId(conversationId)
    setSidebarOpen(false)
    // Invalidate messages query to ensure fresh data
    if (conversationId !== "new") {
      utils.chat.getMessages.invalidate({ conversationId })
    }
  }

  return (
    <div className="d-flex vh-100" style={{ backgroundColor: "#000" }}>
      <div
        className={`position-fixed top-0 start-0 end-0 d-flex align-items-center justify-content-between p-3 transition-transform ${
          headerVisible ? "translate-y-0" : "-translate-y-100"
        }`}
        style={{
          backgroundColor: "#000",
          zIndex: 1000,
          transform: headerVisible ? "translateY(0)" : "translateY(-100%)",
          transition: "transform 0.3s ease",
        }}
      >
        <Button
          variant="outline-secondary"
          size="sm"
          className="rounded-pill border-0"
          style={{ backgroundColor: "rgba(255, 255, 255, 0.1)" }}
          onClick={() => setSidebarOpen(!sidebarOpen)}
        >
          <Menu size={18} />
        </Button>

        <div className="flex-grow-1 text-center">
          <h5 className="mb-0 text-white">
            {currentConversationId && currentConversationId !== "new" 
              ? currentConversation?.title || "Chat" 
              : "New Chat"
            }
          </h5>
        </div>

        {/* --- FIX: Add signout button --- */}
        <Button
          variant="outline-secondary"
          size="sm"
          className="rounded-pill border-0"
          style={{ backgroundColor: "rgba(255, 255, 255, 0.1)" }}
          onClick={handleSignOut}
          title="Sign Out"
        >
          <LogOut size={18} />
        </Button>
      </div>

      <div className="d-flex flex-grow-1 position-relative" style={{ paddingTop: "60px" }}>
        {sidebarOpen && (
          <div
            className="position-fixed top-0 start-0 h-100 bg-dark border-end"
            style={{ width: "280px", zIndex: 999, paddingTop: "60px" }}
          >
            <ConversationsList
              currentConversationId={currentConversationId}
              onSelectConversation={handleSelectConversation}
              onNewConversation={startNewConversation}
            />
          </div>
        )}

        <div className="flex-grow-1 d-flex flex-column position-relative">
          <div ref={chatContainerRef} className="flex-grow-1 overflow-auto p-3" style={{ backgroundColor: "#000" }}>
            {isLoadingMessages ? (
              <div className="d-flex flex-column align-items-center justify-content-center h-100 text-center">
                <div className="mb-4 d-flex flex-column align-items-center">
                  <div className="spinner-border text-primary mb-3" role="status">
                    <span className="visually-hidden">Loading...</span>
                  </div>
                  <p className="text-secondary">Loading conversation...</p>
                </div>
              </div>
            ) : messages.length === 0 ? (
              <div className="d-flex flex-column align-items-center justify-content-center h-100 text-center">
                <div className="mb-4 d-flex flex-column align-items-center">
                  <div className="d-flex align-items-center justify-content-center mb-3">
                    <MessageSquare size={64} className="text-secondary" />
                  </div>
                  <h3 className="text-white mb-2">How can I help you today?</h3>
                  <p className="text-secondary">Start a conversation by typing a message below</p>
                </div>
              </div>
            ) : (
              messages.map((message, index) => (
                <div
                  key={message.id}
                  className={`mb-4 d-flex ${message.role === "user" ? "justify-content-end" : "justify-content-start"}`}
                >
                  <div className="position-relative group" style={{ maxWidth: "80%" }}>
                    {message.imageUrl && (
                      <div className="mb-2">
                        <img
                          src={message.imageUrl || "/placeholder.svg"}
                          alt="Message attachment"
                          className="rounded"
                          style={{ maxWidth: "300px", maxHeight: "300px", objectFit: "cover" }}
                        />
                      </div>
                    )}
                    {message.content && (
                      <div
                        className={`p-3 rounded-4 position-relative ${
                          message.role === "user" ? "text-white" : "text-white"
                        }`}
                        style={{
                          backgroundColor: message.role === "user" ? "#333" : "#1a1a1a",
                          wordWrap: "break-word",
                          whiteSpace: "pre-wrap",
                        }}
                        onContextMenu={(e) => {
                          e.preventDefault()
                          handleCopyMessage(message.content)
                        }}
                      >
                        {message.content}
                      </div>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>

          {showScrollTop && (
            <Button
              className="position-fixed rounded-circle border-0"
              style={{
                bottom: "100px",
                right: "20px",
                width: "40px",
                height: "40px",
                backgroundColor: "rgba(255, 255, 255, 0.3)",
                color: "white",
                zIndex: 1000,
              }}
              onClick={scrollToTop}
            >
              <ArrowUp size={18} />
            </Button>
          )}

          <div className="p-3" style={{ backgroundColor: "#000" }}>
            {uploadedImage && (
              <div className="mb-3 position-relative d-inline-block">
                <img
                  src={uploadedImage || "/placeholder.svg"}
                  alt="Selected"
                  className="rounded"
                  style={{ maxWidth: "200px", maxHeight: "200px", objectFit: "cover" }}
                />
                <Button
                  variant="danger"
                  size="sm"
                  className="position-absolute top-0 end-0 rounded-circle"
                  style={{ transform: "translate(50%, -50%)" }}
                  onClick={() => {
                    setUploadedImage(null)
                    if (fileInputRef.current) {
                      fileInputRef.current.value = ""
                    }
                  }}
                >
                  ×
                </Button>
              </div>
            )}

            <Form onSubmit={handleSendMessage}>
              <div className="d-flex align-items-end gap-2" style={{ margin: "0 15px" }}>
                <Button
                  type="button"
                  variant="outline-secondary"
                  className="rounded-circle border-0 d-flex align-items-center justify-content-center"
                  style={{
                    width: "48px",
                    height: "48px",
                    backgroundColor: "rgba(255, 255, 255, 0.1)",
                    flexShrink: 0,
                  }}
                  onClick={() => fileInputRef.current?.click()}
                >
                  <ImageIcon size={20} />
                  {uploadedImage && (
                    <div
                      className="position-absolute top-0 end-0 bg-primary rounded-circle d-flex align-items-center justify-content-center"
                      style={{ width: "16px", height: "16px", transform: "translate(25%, -25%)" }}
                    >
                      <span style={{ fontSize: "10px", color: "white" }}>1</span>
                    </div>
                  )}
                </Button>

                <div className="position-relative flex-grow-1">
                  <Form.Control
                    as="textarea"
                    rows={1}
                    value={inputMessage}
                    onChange={(e) => setInputMessage(e.target.value)}
                    placeholder="Message..."
                    className="border-0 pe-5"
                    style={{
                      backgroundColor: "#333",
                      color: "white",
                      borderRadius: "25px",
                      padding: "12px 50px 12px 16px",
                      resize: "none",
                      minHeight: "48px",
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault()
                        handleSendMessage()
                      }
                    }}
                  />

                  {isLoading ? (
                    <div
                      className="position-absolute end-0 top-50 translate-middle-y me-2 d-flex align-items-center justify-content-center rounded"
                      style={{
                        width: "36px",
                        height: "36px",
                        backgroundColor: "#222",
                        cursor: "pointer",
                      }}
                      onClick={() => {
                        sendMessageMutation.reset()
                        setIsLoading(false)
                      }}
                    >
                      <div className="d-flex gap-1">
                        {[0, 1, 2].map((i) => (
                          <div
                            key={i}
                            className="rounded-circle"
                            style={{
                              width: "6px",
                              height: "6px",
                              backgroundColor: "#666",
                              animation: `wave 1.4s ease-in-out ${i * 0.2}s infinite`,
                            }}
                          />
                        ))}
                      </div>
                    </div>
                  ) : (
                    <Button
                      type="submit"
                      disabled={isLoading || (!inputMessage.trim() && !uploadedImage)}
                      className="position-absolute end-0 top-50 translate-middle-y me-2 rounded-circle d-flex align-items-center justify-content-center border-0"
                      style={{
                        width: "36px",
                        height: "36px",
                        backgroundColor: !inputMessage.trim() && !uploadedImage ? "rgba(255, 255, 255, 0.3)" : "white",
                        color: "black",
                      }}
                    >
                      <ArrowUp size={16} />
                    </Button>
                  )}
                </div>
              </div>
            </Form>

            <input type="file" ref={fileInputRef} onChange={handleImageSelect} accept="image/*" className="d-none" />
          </div>
        </div>
      </div>

      <style jsx>{`
        @keyframes wave {
          0%, 40%, 100% { transform: translateY(0); }
          20% { transform: translateY(-10px); }
        }
      `}</style>
    </div>
  )
}
