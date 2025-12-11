import { useState, useEffect } from 'react'
import api from '../services/api'
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
    // Load cached config immediately for fast render
    const configStr = localStorage.getItem('installationConfig')
    if (configStr) {
      try {
        setConfig(JSON.parse(configStr))
      } catch (error) {
        console.error('Error parsing installation config:', error)
      }
    }

    const installationId = localStorage.getItem('installationId')
    if (!installationId) return

    // Always fetch latest config so new admin changes (ex: shapes) appear
    const fetchLatestConfig = async () => {
      try {
        const response = await api.get(`/auth/installation/${installationId}/config`)
        setConfig(response.data)
        localStorage.setItem('installationConfig', JSON.stringify(response.data))
      } catch (error) {
        console.error('Error fetching latest installation config:', error)
      }
    }

    fetchLatestConfig()
  }, [])

  return config
}



