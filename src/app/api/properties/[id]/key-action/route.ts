import { NextRequest, NextResponse } from 'next/server'
import { updatePropertyKeyStatus, getUserById } from '@/lib/googleSheets'
import { verifyToken } from '@/lib/auth'

interface KeyActionRequest {
  action: 'rent' | 'return' | 'reset'
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const resolvedParams = await params
/    const propertyId = resolvedParams.id  // string ID from sheet
    const body = await request.json()
    const { action } = body

    if (!propertyId) {
      return NextResponse.json(
        { error: 'Invalid property ID' },
        { status: 400 }
      )
    }

    if (!action || !['rent', 'return', 'reset'].includes(action)) {
      return NextResponse.json(
        { error: 'Invalid action. Must be "rent", "return", or "reset"' },
        { status: 400 }
      )
    }

    let rented_by: string | undefined

    if (action === 'rent') {
      // ログインユーザーの情報を取得
      const token = request.cookies.get('auth-token')?.value
      
      if (!token) {
        return NextResponse.json(
          { error: 'Authentication required' },
          { status: 401 }
        )
      }

      const tokenResult = verifyToken(token)
      
      if (!tokenResult.valid || !tokenResult.userId) {
        return NextResponse.json(
          { error: 'Invalid authentication token' },
          { status: 401 }
        )
      }

      const user = await getUserById(tokenResult.userId)
      
      if (!user) {
      return NextResponse.json(
          { error: 'User not found' },
          { status: 401 }
      )
      }

      rented_by = user.display_name
    }

    const result = await updatePropertyKeyStatus(propertyId, action, rented_by)
    
    if (!result) {
      return NextResponse.json(
        { error: 'Property not found' },
        { status: 404 }
      )
    }

    return NextResponse.json(result)
  } catch (error) {
    console.error('Error updating property key status:', error)
    return NextResponse.json(
      { error: 'Failed to update property key status' },
      { status: 500 }
    )
  }
} 