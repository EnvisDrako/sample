"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { MessageSquare, Trash2, Edit3, Archive } from "lucide-react"
import { Button, Modal, Form } from "react-bootstrap"
import { trpc } from "@/lib/trpc/client"

interface Conversation {
  id: string
  title: string
  created_at: string
  updated_at: string
}

interface ConversationsListProps {
  currentConversationId: string | null
  onSelectConversation: (id: string) => void
  onNewConversation: () => void
}

export default function ConversationsList({
  currentConversationId,
  onSelectConversation,
  onNewConversation,
}: ConversationsListProps) {
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; conversationId: string } | null>(null)
  const [showRenameModal, setShowRenameModal] = useState(false)
  const [renameConversationId, setRenameConversationId] = useState<string | null>(null)
  const [newTitle, setNewTitle] = useState("")

  const { data: conversations = [], refetch } = trpc.chat.getConversations.useQuery()
  
  const deleteConversationMutation = trpc.chat.deleteConversation.useMutation({
    onSuccess: (data, variables) => {
      refetch()
      if (currentConversationId === variables.conversationId) {
        onNewConversation()
      }
    },
  })

  const renameConversationMutation = trpc.chat.renameConversation.useMutation({
    onSuccess: () => {
      refetch()
      setShowRenameModal(false)
      setRenameConversationId(null)
      setNewTitle("")
    },
  })

  const handleDeleteConversation = async (conversationId: string) => {
    try {
      await deleteConversationMutation.mutateAsync({ conversationId })
      setContextMenu(null)
    } catch (error) {
      console.error("Error deleting conversation:", error)
    }
  }

  const handleRenameConversation = async () => {
    if (!renameConversationId || !newTitle.trim()) return

    try {
      await renameConversationMutation.mutateAsync({
        conversationId: renameConversationId,
        title: newTitle.trim(),
      })
    } catch (error) {
      console.error("Error renaming conversation:", error)
    }
  }

  const handleContextMenu = (e: React.MouseEvent, conversationId: string) => {
    e.preventDefault()
    setContextMenu({
      x: e.clientX,
      y: e.clientY,
      conversationId,
    })
  }

  const openRenameModal = (conversationId: string, currentTitle: string) => {
    setRenameConversationId(conversationId)
    setNewTitle(currentTitle)
    setShowRenameModal(true)
    setContextMenu(null)
  }

  useEffect(() => {
    const handleClickOutside = () => setContextMenu(null)
    if (contextMenu) {
      document.addEventListener("click", handleClickOutside)
      return () => document.removeEventListener("click", handleClickOutside)
    }
  }, [contextMenu])

  if (conversations.length === 0) {
    return (
      <div className="p-3">
        <div className="text-center text-secondary">
          <MessageSquare size={32} className="mb-2" />
          <p className="small mb-0">No conversations yet</p>
          <p className="small text-muted">Start a new chat to begin</p>
        </div>
      </div>
    )
  }

  return (
    <>
      {/* --- FIX: Add New Chat button at the top --- */}
      <div className="p-3 border-bottom border-secondary d-flex justify-content-center">
        <Button
          variant="outline-primary"
          size="sm"
          className="rounded-pill d-flex align-items-center justify-content-center"
          style={{ minWidth: "120px" }}
          onClick={onNewConversation}
        >
          <MessageSquare size={14} />
          <span className="ms-2">New Chat</span>
        </Button>
      </div>

      <div className="p-2">
        {conversations.map((conversation) => (
          <div
            key={conversation.id}
            className={`d-flex align-items-center justify-content-between p-3 mb-2 cursor-pointer ${
              currentConversationId === conversation.id ? "bg-secondary" : ""
            }`}
            style={{
              cursor: "pointer",
              transition: "all 0.2s ease",
              borderRadius: "12px",
            }}
            onClick={() => onSelectConversation(conversation.id)}
            onContextMenu={(e) => handleContextMenu(e, conversation.id)}
            onMouseEnter={(e) => {
              if (currentConversationId !== conversation.id) {
                e.currentTarget.style.backgroundColor = "rgba(255, 255, 255, 0.1)"
              }
            }}
            onMouseLeave={(e) => {
              if (currentConversationId !== conversation.id) {
                e.currentTarget.style.backgroundColor = "transparent"
              }
            }}
          >
            <div className="flex-grow-1 text-truncate">
              <div className="text-white small fw-medium text-truncate">{conversation.title}</div>
              <div className="text-secondary" style={{ fontSize: "0.75rem" }}>
                {new Date(conversation.updated_at).toLocaleDateString()}
              </div>
            </div>
          </div>
        ))}
      </div>

      {contextMenu && (
        <div
          className="position-fixed bg-dark border rounded-3 shadow-lg py-2"
          style={{
            left: contextMenu.x,
            top: contextMenu.y,
            zIndex: 1050,
            minWidth: "150px",
          }}
        >
          <button
            className="btn btn-link text-white text-decoration-none w-100 text-start px-3 py-2 d-flex align-items-center gap-2"
            onClick={() => {
              const conversation = conversations.find((c) => c.id === contextMenu.conversationId)
              if (conversation) {
                openRenameModal(conversation.id, conversation.title)
              }
            }}
          >
            <Edit3 size={14} />
            Rename
          </button>
          <button
            className="btn btn-link text-white text-decoration-none w-100 text-start px-3 py-2 d-flex align-items-center gap-2"
            onClick={() => {
              setContextMenu(null)
            }}
          >
            <Archive size={14} />
            Archive
          </button>
          <hr className="my-1 border-secondary" />
          <button
            className="btn btn-link text-danger text-decoration-none w-100 text-start px-3 py-2 d-flex align-items-center gap-2"
            onClick={() => handleDeleteConversation(contextMenu.conversationId)}
          >
            <Trash2 size={14} />
            Delete
          </button>
        </div>
      )}

      <Modal show={showRenameModal} onHide={() => setShowRenameModal(false)} centered>
        <Modal.Header closeButton className="bg-dark text-white border-secondary">
          <Modal.Title>Rename Conversation</Modal.Title>
        </Modal.Header>
        <Modal.Body className="bg-dark">
          <Form.Control
            type="text"
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            placeholder="Enter new title..."
            className="bg-secondary text-white border-0"
            autoFocus
          />
        </Modal.Body>
        <Modal.Footer className="bg-dark border-secondary">
          <Button variant="secondary" onClick={() => setShowRenameModal(false)}>
            Cancel
          </Button>
          <Button
            variant="primary"
            onClick={handleRenameConversation}
            disabled={!newTitle.trim() || renameConversationMutation.isPending}
          >
            {renameConversationMutation.isPending ? "Saving..." : "Save"}
          </Button>
        </Modal.Footer>
      </Modal>
    </>
  )
}
