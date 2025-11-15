import React, { useEffect, useState } from 'react'
import { useLocation } from 'react-router-dom'

interface PageTransitionProps {
  children: React.ReactNode
}

const PageTransition: React.FC<PageTransitionProps> = ({ children }) => {
  const location = useLocation()
  const [displayLocation, setDisplayLocation] = useState(location)
  const [transitionStage, setTransitionStage] = useState<'entering' | 'entered' | 'exiting'>('entered')

  useEffect(() => {
    if (location !== displayLocation) {
      setTransitionStage('exiting')
    }
  }, [location, displayLocation])

  useEffect(() => {
    if (transitionStage === 'exiting') {
      const timer = setTimeout(() => {
        setDisplayLocation(location)
        setTransitionStage('entering')
        setTimeout(() => {
          setTransitionStage('entered')
        }, 10)
      }, 300)
      return () => clearTimeout(timer)
    }
  }, [transitionStage, location])

  return (
    <div className={`page-transition page-transition-${transitionStage}`}>
      {children}
    </div>
  )
}

export default PageTransition

