import { NextRequest, NextResponse } from 'next/server'
import { updatePropertyStatus, getPropertyById, updatePropertyMemo } from '@/lib/googleSheets'

// 単一物件の取得
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const resolvedParams = await params
    const propertyId = parseInt(resolvedParams.id)
    
    if (isNaN(propertyId)) {
      return NextResponse.json(
        { error: 'Invalid property ID' },
        { status: 400 }
      )
    }

    const property = await getPropertyById(propertyId)
    
    if (!property) {
      return NextResponse.json(
        { error: 'Property not found' },
        { status: 404 }
      )
    }

    return NextResponse.json(property)
  } catch (error) {
    console.error('Error fetching property:', error)
    return NextResponse.json(
      { error: 'Failed to fetch property' },
      { status: 500 }
    )
  }
}

// メモを更新
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const resolvedParams = await params
    const propertyId = parseInt(resolvedParams.id)
    const body = await request.json()
    const { memo, updated_by } = body

    if (isNaN(propertyId)) {
      return NextResponse.json(
        { error: 'Invalid property ID' },
        { status: 400 }
      )
    }

    // メモのみの更新かチェック
    if (memo !== undefined) {
      const result = await updatePropertyMemo(propertyId, memo, updated_by || 'システム')
      return NextResponse.json(result)
    }

    return NextResponse.json(
      { error: 'Only memo updates are supported' },
      { status: 400 }
    )
  } catch (error) {
    console.error('Error updating property:', error)
    return NextResponse.json(
      { error: 'Failed to update property' },
      { status: 500 }
    )
  }
}

// 物件のステータスを更新
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const resolvedParams = await params
    const propertyId = parseInt(resolvedParams.id)
    const body = await request.json()
    const { status, shooting_datetime, updated_by } = body

    if (!status) {
      return NextResponse.json(
        { error: 'Status is required' },
        { status: 400 }
      )
    }

    if (!['未撮影', '撮影済'].includes(status)) {
      return NextResponse.json(
        { error: 'Invalid status. Must be "未撮影" or "撮影済"' },
        { status: 400 }
      )
    }

    // updated_byはユーザー名（username）として扱い、updatePropertyStatus内でdisplay_nameに変換
    const result = await updatePropertyStatus(propertyId, status, shooting_datetime, updated_by || 'システム')
    return NextResponse.json(result)
  } catch (error) {
    console.error('Error updating property status:', error)
    return NextResponse.json(
      { error: 'Failed to update property status' },
      { status: 500 }
    )
  }
} 