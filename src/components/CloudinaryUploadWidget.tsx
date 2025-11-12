import React, { useEffect, useRef } from 'react'
import './CloudinaryUploadWidget.css'

interface CloudinaryUploadWidgetProps {
  onUpload: (url: string) => void
  onError: (error: string) => void
  disabled?: boolean
  buttonText?: string
}

declare global {
  interface Window {
    cloudinary: any
  }
}

const CloudinaryUploadWidget: React.FC<CloudinaryUploadWidgetProps> = ({
  onUpload,
  onError,
  disabled = false,
  buttonText
}) => {
  const cloudinaryRef = useRef<any>()
  const widgetRef = useRef<any>()

  useEffect(() => {
    // Cloudinary 스크립트 로드
    const script = document.createElement('script')
    script.src = 'https://upload-widget.cloudinary.com/global/all.js'
    script.async = true
    document.head.appendChild(script)

    script.onload = () => {
      if (window.cloudinary) {
        cloudinaryRef.current = window.cloudinary
        createWidget()
      }
    }

    return () => {
      if (widgetRef.current) {
        widgetRef.current.destroy()
      }
    }
  }, [])

  const createWidget = () => {
    if (!cloudinaryRef.current) return

    widgetRef.current = cloudinaryRef.current.createUploadWidget(
      {
        cloudName: import.meta.env.VITE_CLOUDINARY_CLOUD_NAME,
        uploadPreset: import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET,
        cropping: true,
        croppingAspectRatio: 0.8,
        croppingShowDimensions: true,
        showAdvancedOptions: false,
        showUploadMoreButton: false,
        showPoweredBy: false,
        sources: ['local', 'url', 'camera'],
        styles: {
          palette: {
            window: '#FFFFFF',
            sourceBg: '#F4F4F5',
            windowBorder: '#90A0B3',
            tabIcon: '#000000',
            inactiveTabIcon: '#555A5F',
            menuIcons: '#555A5F',
            link: '#0433FF',
            action: '#339933',
            inProgress: '#0433FF',
            complete: '#20B832',
            error: '#EA2727',
            textDark: '#000000',
            textLight: '#FFFFFF'
          },
          fonts: {
            default: null,
            "'Suite', sans-serif": {
              url: 'https://cdn.jsdelivr.net/gh/projectnoonnu/noonfonts_2107@1.1/Suite-Regular.woff2',
              active: true
            }
          }
        }
      },
      (error: any, result: any) => {
        if (!error && result && result.event === 'success') {
          console.log('업로드 성공:', result.info)
          onUpload(result.info.secure_url)
        } else if (error) {
          console.error('업로드 오류:', error)
          onError(error.message || '이미지 업로드 중 오류가 발생했습니다.')
        }
      }
    )
  }

  const handleUploadClick = () => {
    if (disabled || !widgetRef.current) return
    widgetRef.current.open()
  }

  if (buttonText) {
    return (
      <button
        type="button"
        className="upload-button-icon"
        onClick={handleUploadClick}
        disabled={disabled}
        title="이미지 업로드"
      >
        {buttonText}
      </button>
    )
  }

  return (
    <div className="cloudinary-upload-widget">
      <button
        type="button"
        className="upload-button"
        onClick={handleUploadClick}
        disabled={disabled}
      >
        {disabled ? '업로드 중...' : '📷 이미지 업로드'}
      </button>
      <p className="upload-hint">
        클릭하여 책 표지 이미지를 업로드하세요
      </p>
    </div>
  )
}

export default CloudinaryUploadWidget