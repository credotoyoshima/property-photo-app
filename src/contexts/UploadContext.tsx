"use client"

import React, { createContext, useContext, useState } from 'react'

interface UploadProgress {
  current: number
  total: number
}

interface UploadContextValue {
  isUploading: boolean
  uploadProgress: UploadProgress | null
  setUploading: (uploading: boolean) => void
  setProgress: (progress: UploadProgress | null) => void
}

const UploadContext = createContext<UploadContextValue | undefined>(undefined)

export const UploadProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isUploading, setUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState<UploadProgress | null>(null)

  return (
    <UploadContext.Provider
      value={{ isUploading, uploadProgress, setUploading, setProgress: setUploadProgress }}
    >
      {children}
    </UploadContext.Provider>
  )
}

export const useUpload = (): UploadContextValue => {
  const context = useContext(UploadContext)
  if (!context) {
    throw new Error('useUpload must be used within UploadProvider')
  }
  return context
} 