'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/hooks/useAuth'
import { FullScreenLoading } from '@/components/ui/loading'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { APP_CONFIG } from '@/lib/utils/constants'

export default function HomePage() {
  const router = useRouter()
  const { isAuthenticated, isLoading } = useAuth()

  useEffect(() => {
    if (!isLoading) {
      if (isAuthenticated) {
        // 認証済みの場合はマップページへ
        router.push('/map')
      } else {
        // 未認証の場合はログインページへ
        router.push('/login')
      }
    }
  }, [isLoading, isAuthenticated, router])

  // ローディング中またはリダイレクト中
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center">
      <FullScreenLoading />
    </div>
  )
}
