import React, { useState, useRef, useEffect } from 'react'
import './ColorPaletteMenu.css'

interface ColorPaletteMenuProps {
  currentColor: string
  onColorChange: (color: string) => void
}

const ColorPaletteMenu: React.FC<ColorPaletteMenuProps> = ({ currentColor, onColorChange }) => {
  const [isOpen, setIsOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  // 미리 정의된 색상 팔레트
  const colorPalette = [
    '#FFFFFF', '#000000', '#FF0000', '#00FF00', '#0000FF',
    '#FFFF00', '#FF00FF', '#00FFFF', '#FFA500', '#800080',
    '#FFC0CB', '#A52A2A', '#808080', '#C0C0C0', '#800000',
    '#008000', '#000080', '#808000', '#008080', '#FF6347'
  ]

  // 외부 클릭 시 메뉴 닫기
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => {
        document.removeEventListener('mousedown', handleClickOutside)
      }
    }
  }, [isOpen])

  return (
    <div className="color-palette-wrapper" ref={menuRef}>
      <div 
        className="color-palette-trigger"
        style={{ backgroundColor: currentColor }}
        onClick={() => setIsOpen(!isOpen)}
      />
      {isOpen && (
        <div className="color-palette-menu">
          <div className="color-palette-grid">
            {colorPalette.map((color, index) => (
              <div
                key={index}
                className={`color-palette-item ${currentColor.toLowerCase() === color.toLowerCase() ? 'active' : ''}`}
                style={{ backgroundColor: color }}
                onClick={() => {
                  onColorChange(color)
                  setIsOpen(false)
                }}
                title={color}
              />
            ))}
          </div>
          <div className="color-palette-custom">
            <input
              type="color"
              value={currentColor}
              onChange={(e) => {
                onColorChange(e.target.value)
                setIsOpen(false)
              }}
              className="color-palette-custom-input"
            />
            <label>커스텀 색상</label>
          </div>
        </div>
      )}
    </div>
  )
}

export default ColorPaletteMenu

