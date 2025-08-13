import type React from "react"
import type { Metadata, Viewport } from "next"
import { GeistSans } from "geist/font/sans"
import { GeistMono } from "geist/font/mono"

// 1. Import Bootstrap CSS directly. This is the recommended way.
import "bootstrap/dist/css/bootstrap.min.css"
import "./globals.css"

import { TRPCProvider } from "@/lib/trpc/provider"
// 2. Import the new client component for Bootstrap's JavaScript
import BootstrapClient from "@/components/BootstrapClient"

export const metadata: Metadata = {
  title: "Mobile ChatGPT Clone",
  description: "A mobile-first ChatGPT clone built with Next.js",
  generator: "v0.dev",
}

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    // 3. Apply the font variables to the className. This is the correct way to use next/font
    //    and it removes the need for the manual <style> tag.
    <html lang="en" className={`${GeistSans.variable} ${GeistMono.variable}`}>
      {/* The <head> tag is managed by Next.js, so you don't need to add it manually */}
      <body>
        <TRPCProvider>{children}</TRPCProvider>
        {/* 4. This component safely loads Bootstrap's JS on the client-side */}
        <BootstrapClient />
      </body>
    </html>
  )
}
