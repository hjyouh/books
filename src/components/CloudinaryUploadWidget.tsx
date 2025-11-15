import React, { useEffect, useRef } from 'react'
import './CloudinaryUploadWidget.css'

interface CloudinaryUploadWidgetProps {
  onUpload: (url: string) => void
  onError: (error: string) => void
  disabled?: boolean
  buttonText?: string
}

const CloudinaryUploadWidget: React.FC<CloudinaryUploadWidgetProps> = ({
  onUpload,
  onError,
  disabled = false,
  buttonText
}) => {
  const cloudinaryRef = useRef<any>(null)
  const widgetRef = useRef<any>(null)

  useEffect(() => {
    // 이미 스크립트가 로드되어 있는지 확인
    const existingScript = document.querySelector('script[src*="cloudinary"]')
    
    if (existingScript) {
      // 스크립트가 이미 있으면 바로 위젯 생성 시도
      const cloudinary = (window as any).cloudinary
      if (cloudinary && cloudinary.createUploadWidget) {
        cloudinaryRef.current = cloudinary
        createWidget()
      } else {
        // 스크립트는 있지만 아직 로드되지 않았으면 대기
        const checkCloudinary = setInterval(() => {
          const cloudinary = (window as any).cloudinary
          if (cloudinary && cloudinary.createUploadWidget) {
            cloudinaryRef.current = cloudinary
            createWidget()
            clearInterval(checkCloudinary)
          }
        }, 100)
        
        setTimeout(() => {
          clearInterval(checkCloudinary)
        }, 5000)
      }
    } else {
      // 스크립트가 없으면 새로 로드
      const script = document.createElement('script')
      script.src = 'https://upload-widget.cloudinary.com/global/all.js'
      script.async = true
      document.head.appendChild(script)

      script.onload = () => {
        const cloudinary = (window as any).cloudinary
        if (cloudinary && cloudinary.createUploadWidget) {
          cloudinaryRef.current = cloudinary
          createWidget()
        }
      }
      
      script.onerror = () => {
        console.error('Cloudinary 스크립트 로드 실패')
      }
    }

    return () => {
      // 위젯이 존재하고 destroy 메서드가 있으면 정리
      if (widgetRef.current && typeof widgetRef.current.destroy === 'function') {
        try {
          widgetRef.current.destroy()
        } catch (error) {
          console.error('위젯 정리 중 오류:', error)
        }
        widgetRef.current = null
      }
    }
  }, [])

  const createWidget = () => {
    // 이미 위젯이 있으면 재생성하지 않음
    if (widgetRef.current) {
      return
    }

    if (!cloudinaryRef.current || !cloudinaryRef.current.createUploadWidget) {
      return
    }

    try {
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
    } catch (error) {
      console.error('Cloudinary 위젯 생성 오류:', error)
      widgetRef.current = null
    }
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