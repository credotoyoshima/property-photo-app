import { cn } from "@/lib/utils/cn"

interface LoadingSpinnerProps {
  className?: string
  size?: 'xs' | 'sm' | 'md' | 'lg'
}

export function LoadingSpinner({ className, size = 'md' }: LoadingSpinnerProps) {
  const sizeClasses = {
    xs: 'h-4 w-4',
    sm: 'h-6 w-6',
    md: 'h-10 w-10',
    lg: 'h-12 w-12'
  }

  return (
    <div className={cn("relative inline-block", sizeClasses[size], className)}>
      {/* 背景の薄いリング */}
      <div className={cn(
        "absolute inset-0 rounded-full border-2 border-gray-200",
        sizeClasses[size]
      )} />
      {/* アニメーションするメインリング */}
      <div className={cn(
        "absolute inset-0 rounded-full border-2 border-blue-500 border-t-transparent animate-spin",
        sizeClasses[size]
      )} />
    </div>
  )
}

interface LoadingProps {
  message?: string
  className?: string
  size?: 'sm' | 'md' | 'lg'
}

export function Loading({ message = "読み込み中...", className, size = 'lg' }: LoadingProps) {
  return (
    <div className={cn("flex flex-col items-center justify-center min-h-[200px]", className)}>
      <LoadingSpinner size={size} />
      <p className="mt-4 text-gray-600 font-medium">{message}</p>
    </div>
  )
}

// フルスクリーンローディング（認証やページ遷移用）
interface FullScreenLoadingProps {
  message?: string
}

export function FullScreenLoading({ message = "読み込み中..." }: FullScreenLoadingProps) {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center">
      <LoadingSpinner size="lg" />
      <div className="mt-6 space-y-2 text-center">
        <p className="text-gray-700 text-lg font-medium">{message}</p>
        <p className="text-gray-500 text-sm">しばらくお待ちください</p>
      </div>
    </div>
  )
}

// マップオーバーレイローディング（地図の上に表示用）
interface MapLoadingProps {
  message?: string
}

export function MapLoading({ message = "地図を読み込み中..." }: MapLoadingProps) {
  return (
    <div className="absolute inset-0 bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center z-10">
      <div className="flex flex-col items-center">
        <LoadingSpinner size="lg" />
        <p className="mt-4 text-gray-600 font-medium text-center">{message}</p>
      </div>
    </div>
  )
}

// インラインローディング（ボタン内などで使用）
interface InlineLoadingProps {
  text?: string
  className?: string
  size?: 'xs' | 'sm' | 'md' | 'lg'
}

export function InlineLoading({ text = "処理中...", className, size = 'xs' }: InlineLoadingProps) {
  return (
    <div className={cn("flex items-center", className)}>
      <LoadingSpinner size={size} className="mr-2" />
      <span>{text}</span>
    </div>
  )
} 