import React, { Suspense } from 'react'
import dynamicImport from 'next/dynamic'

// Skip static generation; always render server-side
export const dynamic = 'force-dynamic'

// Dynamically import the client-side camera component with suspense
const CameraClient = dynamicImport(
  () => import('./CameraClient'),
  { suspense: true } as any
)

export default function CameraPage() {
  return (
    <Suspense fallback={<div>Loading camera…</div>}>
      <CameraClient />
    </Suspense>
  )
} 