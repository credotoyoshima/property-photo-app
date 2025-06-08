import dynamicImport from 'next/dynamic'

// Skip static generation; always render server-side
export const dynamic = 'force-dynamic'

// Dynamically import the client-side camera component
const CameraClient = dynamicImport(
  () => import('./CameraClient'),
  { ssr: false, loading: () => <div>Loading camera…</div> }
)

export default function CameraPage() {
  return <CameraClient />
} 