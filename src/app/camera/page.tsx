'use client'

// Skip static generation; always render client-side
export const dynamic = 'force-dynamic'

import React, { useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import CameraModal from '@/components/CameraModal'
import { autoRemoveCompletedProperty } from '@/utils/shootingSchedule'

export default function CameraPage() {
  const router = useRouter()
  const params = useSearchParams()
  const propertyId = Number(params.get('propertyId'))
  const propertyName = params.get('propertyName') || ''
  const roomNumber = params.get('roomNumber') || ''

  const [navigateToDetail, setNavigateToDetail] = useState(false)

  const handleClose = () => {
    navigateToDetail
      ? router.push(`/properties/${propertyId}`)
      : router.back()
  }

  const handleStatusUpdate = (updatedProperty: any) => {
    autoRemoveCompletedProperty(updatedProperty.id)
    window.dispatchEvent(new CustomEvent('scheduledPropertiesChanged'))
    setNavigateToDetail(true)
  }

  return (
    <CameraModal
      property={{
        id: propertyId,
        property_name: propertyName,
        room_number: roomNumber,
        address: '',
        latitude: 0,
        longitude: 0,
        status: '',
        last_updated: new Date().toISOString(),
      }}
      isOpen={true}
      onClose={handleClose}
      onSave={async () => {}}
      onStatusUpdate={handleStatusUpdate}
    />
  )
} 