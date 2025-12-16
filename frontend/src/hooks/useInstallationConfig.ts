import { useState, useEffect } from 'react'
import api from '../services/api'
import { ColorOption } from '../constants/colors'

interface GlobalConfig {
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
  const [config, setConfig] = useState<GlobalConfig | null>(null)

  useEffect(() => {
    // Load cached config immediately for fast render
    const configStr = localStorage.getItem('globalConfig')
    if (configStr) {
      try {
        setConfig(JSON.parse(configStr))
      } catch (error) {
        console.error('Error parsing global config:', error)
      }
    }

    // Always fetch latest config so new admin changes (ex: shapes) appear
    const fetchLatestConfig = async () => {
      try {
        const response = await api.get('/auth/config')
        setConfig(response.data)
        localStorage.setItem('globalConfig', JSON.stringify(response.data))
      } catch (error) {
        console.error('Error fetching latest global config:', error)
      }
    }

    fetchLatestConfig()
  }, [])

  return config
}



