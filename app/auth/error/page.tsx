import { Suspense } from "react"
import { ErrorContent } from "@/components/auth/error-content"
import { Metadata } from "next"

export const metadata: Metadata = {
  title: "Authentication Error | Edu Matrix Interlinked",
  description: "Authentication error - Edu Matrix Interlinked",
}

export default function AuthErrorPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <ErrorContent />
    </Suspense>
  )
}
