import { useState, useEffect } from 'react'
import { ColorOption } from '../constants/colors'

interface InstallationConfig {
  sortiment?: {
    cakeTypes?: string[]
    weights?: string[]
    shapes?: string[]
    floors?: string[]
  }
  decor?: {
    coatings?: string[]
    colors?: Array<string | ColorOption>
    decorTypes?: string[]
  }
}

export const useInstallationConfig = () => {
  const [config, setConfig] = useState<InstallationConfig | null>(null)

  useEffect(() => {
    const configStr = localStorage.getItem('installationConfig')
    if (configStr) {
      try {
        setConfig(JSON.parse(configStr))
      } catch (error) {
        console.error('Error parsing installation config:', error)
      }
    }
  }, [])

  return config
}



