import { createClient, isSupabaseConfigured } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import SignUpForm from "@/components/sign-up-form"

export const dynamic = "force-dynamic"

export default async function SignUpPage() {
  // If Supabase is not configured, show setup message directly
  if (!isSupabaseConfigured) {
    return (
      <div className="d-flex min-vh-100 align-items-center justify-content-center">
        <h1 className="h2 mb-4 text-white">Connect Supabase to get started</h1>
      </div>
    )
  }

  // Check if user is already logged in
  const supabase = createClient()
  const {
    data: { session },
  } = await supabase.auth.getSession()

  // If user is logged in, redirect to home page
  if (session) {
    redirect("/")
  }

  return (
    <div
      className="d-flex min-vh-100 align-items-center justify-content-center px-3 py-4"
      style={{ backgroundColor: "#000" }}
    >
      <SignUpForm />
    </div>
  )
}
