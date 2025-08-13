import { isSupabaseConfigured } from "@/lib/supabase/server"
import ChatInterface from "@/components/chat-interface"

export default function Home() {
  // If Supabase is not configured, show setup message directly
  if (!isSupabaseConfigured) {
    return (
      <div className="d-flex min-vh-100 align-items-center justify-content-center bg-dark">
        <div className="text-center">
          <h1 className="h2 mb-4 text-white">Connect Supabase to get started</h1>
        </div>
      </div>
    )
  }

  return <ChatInterface />
}
