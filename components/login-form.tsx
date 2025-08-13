"use client"

import type React from "react"

import { useState } from "react"
import { Button, Form, Card, Spinner } from "react-bootstrap"
import Link from "next/link"
import { signIn } from "@/lib/actions"

export default function LoginForm() {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setIsLoading(true)
    setError(null)

    const formData = new FormData(e.currentTarget)

    try {
      const result = await signIn(null, formData)
      if (result?.error) {
        setError(result.error)
      }
    } catch (err) {
      setError("An unexpected error occurred")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Card
      className="w-100"
      style={{
        maxWidth: "400px",
        backgroundColor: "var(--message-bg)",
        border: "1px solid var(--border-color)",
        borderRadius: "20px",
      }}
    >
      <Card.Body className="p-4">
        <div className="text-center mb-4">
          <h1 className="h3 text-white mb-2">Welcome back</h1>
          <p className="text-secondary">Sign in to your account</p>
        </div>

        <Form onSubmit={handleSubmit}>
          {error && (
            <div className="alert alert-danger" role="alert" style={{ borderRadius: "15px" }}>
              {error}
            </div>
          )}

          <Form.Group className="mb-3">
            <Form.Label className="text-white">Email</Form.Label>
            <Form.Control
              type="email"
              name="email"
              placeholder="you@example.com"
              required
              style={{
                backgroundColor: "var(--chat-bg)",
                borderColor: "var(--border-color)",
                color: "var(--text-primary)",
                fontSize: "16px",
                borderRadius: "15px",
                padding: "12px 16px",
              }}
            />
          </Form.Group>

          <Form.Group className="mb-3">
            <Form.Label className="text-white">Password</Form.Label>
            <Form.Control
              type="password"
              name="password"
              required
              style={{
                backgroundColor: "var(--chat-bg)",
                borderColor: "var(--border-color)",
                color: "var(--text-primary)",
                fontSize: "16px",
                borderRadius: "15px",
                padding: "12px 16px",
              }}
            />
          </Form.Group>

          <Form.Group className="mb-4">
            <Form.Check
              type="checkbox"
              name="rememberMe"
              id="rememberMe"
              label="Keep me signed in"
              className="text-white"
              style={{ fontSize: "14px" }}
            />
          </Form.Group>

          <Button
            type="submit"
            disabled={isLoading}
            className="w-100 py-2"
            style={{
              backgroundColor: "var(--accent-color)",
              borderColor: "var(--accent-color)",
              borderRadius: "25px",
            }}
          >
            {isLoading ? (
              <>
                <Spinner animation="border" size="sm" className="me-2" />
                Signing in...
              </>
            ) : (
              "Sign In"
            )}
          </Button>

          <div className="text-center mt-3">
            <span className="text-secondary">Don't have an account? </span>
            <Link href="/auth/sign-up" className="text-white text-decoration-none">
              Sign up
            </Link>
          </div>
        </Form>
      </Card.Body>
    </Card>
  )
}
