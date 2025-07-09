import { NextRequest, NextResponse } from 'next/server'
import { markPropertyDeleted, clearPropertyDeleted } from '@/lib/googleSheets'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const result = await markPropertyDeleted(id)
    return NextResponse.json({ success: true, ...result })
  } catch (error) {
    console.error('Error marking delete flag:', error)
    return NextResponse.json(
      { success: false, message: '削除フラグ設定に失敗しました' },
      { status: 500 }
    )
  }
}

// DELETE メソッドで削除予定をキャンセル
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const result = await clearPropertyDeleted(id)
    return NextResponse.json({ success: true, ...result })
  } catch (error) {
    console.error('Error clearing delete flag:', error)
    return NextResponse.json(
      { success: false, message: '削除予定のキャンセルに失敗しました' },
      { status: 500 }
    )
  }
} 