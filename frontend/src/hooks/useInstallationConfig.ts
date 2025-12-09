import { useState, useEffect } from 'react'

interface InstallationConfig {
  sortiment?: {
    cakeTypes?: string[]
    weights?: string[]
    shapes?: string[]
    floors?: string[]
  }
  decor?: {
    coatings?: string[]
    colors?: string[]
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

