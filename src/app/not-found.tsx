import Link from 'next/link'
import { Button } from '@/components/ui/button'

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-8" style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '2rem' }}>
      <div className="text-center" style={{ textAlign: 'center' }}>
        <h1 className="text-6xl font-bold text-gray-900 mb-4" style={{ fontSize: '3.75rem', fontWeight: 'bold', color: '#111827', marginBottom: '1rem' }}>
          404
        </h1>
        <h2 className="text-2xl font-semibold text-gray-700 mb-4" style={{ fontSize: '1.5rem', fontWeight: '600', color: '#374151', marginBottom: '1rem' }}>
          ページが見つかりません
        </h2>
        <p className="text-lg text-gray-600 mb-8 max-w-md" style={{ fontSize: '1.125rem', color: '#4B5563', marginBottom: '2rem', maxWidth: '28rem' }}>
          お探しのページは存在しないか、移動された可能性があります。
        </p>
        
        <div className="space-y-4" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <Link href="/">
            <Button size="lg" style={{ padding: '0.75rem 2rem', backgroundColor: '#1F2937', color: 'white', borderRadius: '0.375rem', textDecoration: 'none', display: 'inline-block' }}>
              ホームに戻る
            </Button>
          </Link>
          
          <Link href="/debug">
            <Button variant="outline" size="lg" style={{ padding: '0.75rem 2rem', border: '1px solid #D1D5DB', backgroundColor: 'white', color: '#374151', borderRadius: '0.375rem', textDecoration: 'none', display: 'inline-block' }}>
              デバッグページ
            </Button>
          </Link>
        </div>
      </div>
    </div>
  )
} 