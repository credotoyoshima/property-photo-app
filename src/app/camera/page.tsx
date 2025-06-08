'use client'

import React, { useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import CameraModal from '@/components/CameraModal'
import { autoRemoveCompletedProperty } from '@/utils/shootingSchedule'

export default function CameraPage() {
  const router = useRouter()
  const params = useSearchParams()
  const propertyId   = Number(params.get('propertyId'))
  const propertyName = params.get('propertyName') || ''
  const roomNumber   = params.get('roomNumber')  || ''

  // 保存後に物件詳細ページへ遷移するフラグ
  const [navigateToDetail, setNavigateToDetail] = useState(false)

  // モーダルを閉じるハンドラ
  const handleClose = () => {
    if (navigateToDetail) {
      router.push(`/properties/${propertyId}`)
    } else {
      router.back()
    }
  }

  // 撮影後のステータス更新（必要に応じて実装）
  const handleStatusUpdate = (updatedProperty: any) => {
    // 撮影完了により撮影予定から自動削除
    autoRemoveCompletedProperty(updatedProperty.id)
    window.dispatchEvent(new CustomEvent('scheduledPropertiesChanged'))
    // 保存後に詳細ページに遷移するためのフラグを立てる
    setNavigateToDetail(true)
  }

  return (
    <CameraModal
      property={{
        id:            propertyId,
        property_name: propertyName,
        room_number:   roomNumber,
        address:       '',
        latitude:      0,
        longitude:     0,
        status:        '',
        last_updated:  new Date().toISOString(),
      }}
      isOpen={true}
      onClose={handleClose}
      onSave={async (photos) => { /* no-op */ }}
      onStatusUpdate={handleStatusUpdate}
    />
  )
} 