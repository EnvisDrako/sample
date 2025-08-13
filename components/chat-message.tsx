"use client"

import { User, Bot, ExternalLink } from "lucide-react"
import { Button } from "react-bootstrap"

interface Message {
  id: string
  role: "user" | "assistant"
  content: string
  message_type: "text" | "image"
  image_url?: string
  created_at: string
}

interface ChatMessageProps {
  message: Message
}

export default function ChatMessage({ message }: ChatMessageProps) {
  const isUser = message.role === "user"

  const handleImageClick = (imageUrl: string) => {
    window.open(imageUrl, "_blank", "noopener,noreferrer")
  }

  return (
    <div className={`d-flex ${isUser ? "justify-content-end" : "justify-content-start"}`}>
      <div
        className={`d-flex gap-3 ${isUser ? "flex-row-reverse" : "flex-row"} align-items-start`}
        style={{ maxWidth: "85%" }}
      >
        {/* Avatar */}
        <div
          className={`rounded-circle d-flex align-items-center justify-content-center flex-shrink-0 ${
            isUser ? "bg-primary" : "bg-success"
          }`}
          style={{ width: "32px", height: "32px" }}
        >
          {isUser ? <User size={18} className="text-white" /> : <Bot size={18} className="text-white" />}
        </div>

        {/* Message Content */}
        <div
          className={`rounded p-3 ${isUser ? "bg-primary text-white" : "text-white"}`}
          style={{
            backgroundColor: isUser ? "var(--accent-color)" : "var(--message-bg)",
            wordWrap: "break-word",
          }}
        >
          {message.message_type === "image" && message.image_url && (
            <div className="mb-2 position-relative">
              <img
                src={message.image_url || "/placeholder.svg"}
                alt="Generated image"
                className="img-fluid rounded cursor-pointer"
                style={{
                  maxWidth: "100%",
                  height: "auto",
                  maxHeight: "300px",
                  objectFit: "cover",
                  cursor: "pointer",
                }}
                onClick={() => handleImageClick(message.image_url!)}
                loading="lazy"
              />
              <Button
                variant="outline-light"
                size="sm"
                className="position-absolute top-0 end-0 m-2 opacity-75"
                onClick={() => handleImageClick(message.image_url!)}
                style={{ backdropFilter: "blur(4px)" }}
              >
                <ExternalLink size={14} />
              </Button>
            </div>
          )}
          <div style={{ whiteSpace: "pre-wrap" }}>{message.content}</div>
          <div className={`small mt-2 ${isUser ? "text-white-50" : "text-secondary"}`}>
            {new Date(message.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
          </div>
        </div>
      </div>
    </div>
  )
}
