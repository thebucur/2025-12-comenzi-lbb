import axios from 'axios'
import { useState, useRef, useEffect } from 'react'
import { useParams, useSearchParams } from 'react-router-dom'
import api from '../services/api'

// Helper function to convert relative URL to absolute using the same baseURL as axios
const getAbsoluteUrl = (relativeUrl: string): string => {
  if (relativeUrl.startsWith('http://') || relativeUrl.startsWith('https://')) {
    return relativeUrl
  }

  // Prefer the axios baseURL so production always matches the backend host
  const baseFromApi = api.defaults.baseURL
  const backendURL = baseFromApi
    ? baseFromApi.replace(/\/api$/, '').replace(/\/$/, '')
    : window.location.origin.replace(/\/$/, '')

  const url = relativeUrl.startsWith('/') ? relativeUrl : `/${relativeUrl}`
  const fullURL = `${backendURL}${url}`

  console.log(`getAbsoluteUrl: ${relativeUrl} -> ${fullURL}`, {
    baseFromApi,
    backendURL,
    relativeUrl,
  })

  return fullURL
}

function PhotoUpload() {
  const { sessionId } = useParams<{ sessionId: string }>()
  const [searchParams] = useSearchParams()
  const uploadType = searchParams.get('type') // 'foaie-de-zahar' or null for regular photos
  const isFoaieDeZahar = uploadType === 'foaie-de-zahar'
  
  const [photos, setPhotos] = useState<string[]>([])
  const [foaieDeZaharUrl, setFoaieDeZaharUrl] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)
  const [sending, setSending] = useState(false)
  const [sent, setSent] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Sync sessionId from URL to localStorage so polling in main app can find it
  useEffect(() => {
    if (sessionId) {
      const currentSession = localStorage.getItem('currentUploadSession')
      if (currentSession !== sessionId) {
        console.log(`Syncing sessionId from URL to localStorage: ${sessionId}`)
        localStorage.setItem('currentUploadSession', sessionId)
        // Dispatch custom event to notify other components in same tab
        window.dispatchEvent(new CustomEvent('uploadSessionChanged', { detail: { sessionId } }))
      }
    }
  }, [sessionId])

  // Debug: Log when photos state changes
  useEffect(() => {
    console.log('📸 Photos state updated:', photos.length, 'photos:', photos)
  }, [photos])

  const compressImage = (file: File): Promise<Blob> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onerror = () => reject(new Error('Failed to read file'))
      
      reader.onload = (e) => {
        const img = new Image()
        img.onerror = () => reject(new Error('Failed to load image'))
        
        img.onload = () => {
          try {
            const canvas = document.createElement('canvas')
            let width = img.width
            let height = img.height
            const maxDimension = 1000 // Compress to max 1000x1000 px

            if (width > height) {
              if (width > maxDimension) {
                height = (height * maxDimension) / width
                width = maxDimension
              }
            } else {
              if (height > maxDimension) {
                width = (width * maxDimension) / height
                height = maxDimension
              }
            }

            canvas.width = width
            canvas.height = height
            const ctx = canvas.getContext('2d')
            
            if (!ctx) {
              reject(new Error('Failed to get canvas context'))
              return
            }
            
            ctx.drawImage(img, 0, 0, width, height)

            canvas.toBlob(
              (blob) => {
                if (blob) {
                  resolve(blob)
                } else {
                  // Fallback: convert file to blob if toBlob fails
                  file.arrayBuffer().then(buffer => {
                    resolve(new Blob([buffer], { type: 'image/jpeg' }))
                  }).catch(() => {
                    reject(new Error('Failed to compress image'))
                  })
                }
              },
              'image/jpeg',
              0.8
            )
          } catch (error) {
            reject(error)
          }
        }
        
        const result = e.target?.result
        if (result) {
          img.src = result as string
        } else {
          reject(new Error('Failed to read file data'))
        }
      }
      
      reader.readAsDataURL(file)
    })
  }

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files || files.length === 0) return

    // For foaie de zahar: only 1 file allowed
    if (isFoaieDeZahar) {
      if (photos.length >= 1) {
        alert('Poți încărca doar o singură foaie de zahar.')
        if (fileInputRef.current) {
          fileInputRef.current.value = ''
        }
        return
      }
      if (files.length > 1) {
        alert('Ai ales prea multe fișiere. Se va încărca doar primul fișier.')
      }
    } else {
      // For regular photos: max 3 files
      const existingCount = photos.length
      const remainingSlots = 3 - existingCount

      if (remainingSlots <= 0) {
        alert('Poți încărca maximum 3 poze.')
        if (fileInputRef.current) {
          fileInputRef.current.value = ''
        }
        return
      }

      if (files.length > remainingSlots) {
        alert(`Ai ales prea multe poze. Se vor încărca doar primele ${remainingSlots}.`)
      }
    }

    const filesToProcess = isFoaieDeZahar 
      ? Array.from(files).slice(0, 1) // Only first file for foaie de zahar
      : Array.from(files).slice(0, 3 - photos.length) // Up to remaining slots for photos

    if (!sessionId) {
      alert('Eroare: ID sesiune lipsă')
      return
    }

    // Log API configuration for debugging - use the same logic as api.ts
    let envURL = import.meta.env.VITE_API_URL || 'http://localhost:5000'
    
    // In development, detect IP from current location or localStorage (same as api.ts)
    if (import.meta.env.DEV) {
      const currentHostname = window.location.hostname
      
      // If accessing from mobile device via IP (not localhost), use that IP for API
      if (currentHostname && currentHostname !== 'localhost' && currentHostname !== '127.0.0.1') {
        const port = envURL.match(/:(\d+)/)?.[1] || '5000'
        envURL = `http://${currentHostname}:${port}`
      } else {
        // Check localStorage for manually set IP
        const localIP = localStorage.getItem('localNetworkIP')
        if (localIP) {
          envURL = envURL.replace('localhost', localIP).replace('127.0.0.1', localIP)
        }
      }
    }
    
    const cleanURL = envURL.replace(/\/$/, '').replace(/\/api$/, '')
    const apiBaseURL = cleanURL.endsWith('/api') ? cleanURL : `${cleanURL}/api`
    
    console.log('Upload configuration:', {
      sessionId,
      currentHostname: window.location.hostname,
      envURL,
      apiBaseURL,
      uploadURL: `${apiBaseURL}/upload/${sessionId}`,
      fileCount: files.length,
      localStorageIP: localStorage.getItem('localNetworkIP'),
    })

    setUploading(true)
    const uploadErrors: string[] = []
    const successfullyUploadedUrls: string[] = []

    try {
      for (const file of filesToProcess) {
        try {
          // Validate file type
          if (!file.type.startsWith('image/')) {
            uploadErrors.push(`${file.name}: Nu este o imagine validă`)
            continue
          }

          // Validate file size (max 10MB before compression)
          if (file.size > 10 * 1024 * 1024) {
            uploadErrors.push(`${file.name}: Fișierul este prea mare (max 10MB)`)
            continue
          }

          const formData = new FormData()
          let fileToUpload: Blob | File
          let filename: string

          if (isFoaieDeZahar) {
            // For foaie de zahar: upload original file without compression
            fileToUpload = file
            filename = file.name
            formData.append('photo', fileToUpload, filename)
            console.log(`Uploading foaie de zahar ${file.name} (${(file.size / 1024 / 1024).toFixed(2)}MB, uncompressed)...`)
          } else {
            // For regular photos: compress to 1000x1000
            console.log(`Compressing ${file.name} (${(file.size / 1024 / 1024).toFixed(2)}MB)...`)
            const compressed = await compressImage(file)
            console.log(`Compressed to ${(compressed.size / 1024 / 1024).toFixed(2)}MB`)
            
            // Ensure we have a valid blob
            if (!compressed || compressed.size === 0) {
              uploadErrors.push(`${file.name}: Eroare la compresia imaginii`)
              continue
            }

            fileToUpload = compressed
            // Use the original filename but ensure .jpg extension for compressed images
            filename = file.name.replace(/\.[^/.]+$/, '') + '.jpg'
            formData.append('photo', fileToUpload, filename)
            console.log(`Uploading ${file.name} to ${apiBaseURL}/upload/${sessionId}...`)
          }

          // Use different endpoint based on upload type
          const uploadEndpoint = isFoaieDeZahar 
            ? `/upload/${sessionId}/foaie-de-zahar`
            : `/upload/${sessionId}`
          
          // Don't set Content-Type header manually - let axios set it with proper boundary
          const response = await api.post(uploadEndpoint, formData, {
            timeout: 120000, // 2 minutes timeout for large files
            onUploadProgress: (progressEvent) => {
              if (progressEvent.total) {
                const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total)
                console.log(`Upload progress: ${percentCompleted}%`)
              }
            },
          })
          
          console.log(`Upload successful for ${file.name}:`, response.data)
          console.log('Response structure:', {
            hasUrl: !!response.data?.url,
            url: response.data?.url,
            filename: response.data?.filename,
            fullResponse: response.data,
          })

          if (response.data?.url) {
            // Convert relative URL to absolute URL for proper display on mobile
            const absoluteUrl = getAbsoluteUrl(response.data.url)
            console.log(`Converted URL: ${response.data.url} -> ${absoluteUrl}`)
            
            // Test if image URL is accessible
            const testImage = new Image()
            testImage.onload = () => {
              console.log(`✅ Image URL is accessible: ${absoluteUrl}`)
            }
            testImage.onerror = () => {
              console.error(`❌ Image URL is NOT accessible: ${absoluteUrl}`)
              console.error('This might be a CORS issue or incorrect URL')
            }
            testImage.src = absoluteUrl
            
            if (isFoaieDeZahar) {
              // For foaie de zahar, store in separate state
              // It will also be picked up by polling in Screen3Decor
              console.log('✅ Foaie de zahar uploaded successfully, will be detected by polling')
              setFoaieDeZaharUrl(absoluteUrl)
              successfullyUploadedUrls.push(absoluteUrl) // Track for success message
            } else {
              // For regular photos, add to photos array
              successfullyUploadedUrls.push(absoluteUrl)
              setPhotos((prev) => {
                const updated = [...prev, absoluteUrl]
                console.log('Updated photos array:', updated)
                console.log('Previous photos count:', prev.length, 'New count:', updated.length)
                return updated
              })
            }
          } else {
            console.error('No URL in response:', response.data)
            uploadErrors.push(`${file.name}: Răspuns invalid de la server - lipsă URL`)
          }
        } catch (fileError: unknown) {
          console.error(`Error uploading ${file.name}:`, fileError)
          
          let errorMessage = 'Eroare necunoscută'
          if (axios.isAxiosError(fileError)) {
            const fullURL = fileError.config ? `${fileError.config.baseURL ?? ''}${fileError.config.url ?? ''}` : 'unknown'
            
            if (fileError.response) {
              // Server responded with error
              const dataError = (fileError.response.data as { error?: string } | undefined)?.error
              errorMessage = dataError || `Server error: ${fileError.response.status}`
            } else if (fileError.request) {
              // Request was made but no response received (network error)
              errorMessage = `Eroare de rețea: Nu s-a primit răspuns de la server.\nURL încercat: ${fullURL}\n\nVerifică:\n- Backend-ul rulează pe portul 5000\n- Telefonul este pe aceeași rețea Wi-Fi\n- Firewall-ul permite conexiuni pe portul 5000`
              console.error('Network error details:', {
                fullURL,
                url: fileError.config?.url,
                method: fileError.config?.method,
                baseURL: fileError.config?.baseURL,
                currentHostname: window.location.hostname,
                localStorageIP: localStorage.getItem('localNetworkIP'),
              })
            } else {
              errorMessage = fileError.message || 'Eroare necunoscută'
            }
          }
          
          uploadErrors.push(`${file.name}: ${errorMessage}`)
        }
      }

      // Check final state
      const successfulUploads = successfullyUploadedUrls.length
      const totalFiles = Array.from(files).length
      
      console.log('Upload summary:', {
        totalFiles,
        successfulUploads,
        errors: uploadErrors.length,
        uploadedUrls: successfullyUploadedUrls,
        currentPhotosState: photos,
      })

      if (uploadErrors.length > 0) {
        const errorMsg = uploadErrors.length === totalFiles
          ? 'Toate pozele au eșuat:\n' + uploadErrors.join('\n')
          : `Unele poze au eșuat (${successfulUploads}/${totalFiles} reușite):\n` + uploadErrors.join('\n')
        alert(errorMsg)
      }
      
      if (successfulUploads > 0) {
        if (isFoaieDeZahar) {
          console.log(`✅ Successfully uploaded foaie de zahar`)
          alert('Foaia de zahar a fost încărcată cu succes! Va apărea în aplicația principală.')
        } else {
          console.log(`✅ Successfully uploaded ${successfulUploads} photo(s)`)
          // Verify URLs were added to state
          if (successfullyUploadedUrls.length > 0) {
            console.log('Uploaded photo URLs:', successfullyUploadedUrls)
          }
        }
      } else if (totalFiles > 0 && uploadErrors.length === 0) {
        // This case: files processed but no URLs added
        console.error('⚠️ Files were processed but no URLs were added to state')
        if (isFoaieDeZahar) {
          alert('Foaia de zahar a fost procesată, dar nu s-a încărcat URL-ul. Verifică consola pentru detalii.')
        } else {
          alert('Pozele au fost procesate, dar nu s-au încărcat URL-uri. Verifică consola pentru detalii.')
        }
      }
    } catch (error: unknown) {
      console.error('Error uploading photos:', error)
      if (axios.isAxiosError(error)) {
        const apiMessage = (error.response?.data as { error?: string } | undefined)?.error
        const errorMessage = apiMessage || error.message || 'Eroare necunoscută'
        alert(`Eroare la încărcarea pozelor: ${errorMessage}`)
      } else {
        alert('Eroare la încărcarea pozelor: Eroare necunoscută')
      }
    } finally {
      setUploading(false)
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    }
  }

  return (
    <div className="min-h-screen bg-dark-navy text-white p-4">
      <div className="max-w-md mx-auto">
        <h1 className="text-2xl font-bold mb-6 text-center">
          {isFoaieDeZahar ? '📄 Încarcă foaie de zahar' : '📸 Încarcă poze'}
        </h1>
        
        <div className="bg-gray-800 rounded-lg p-6 mb-6">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            multiple={!isFoaieDeZahar}
            onChange={handleFileSelect}
            disabled={uploading || (isFoaieDeZahar && foaieDeZaharUrl !== null)}
            className="hidden"
            id="file-input"
          />
          <label
            htmlFor="file-input"
            className={`block w-full py-4 px-6 text-center rounded-lg cursor-pointer transition-all ${
              uploading || (isFoaieDeZahar && foaieDeZaharUrl !== null)
                ? 'bg-gray-700 text-gray-500 cursor-not-allowed'
                : 'bg-neon-pink hover:bg-neon-pink/90'
            }`}
          >
            {uploading ? 'Se încarcă...' : isFoaieDeZahar ? 'Selectează foaie de zahar' : 'Selectează poze'}
          </label>
          <p className="text-sm text-gray-400 mt-3 text-center">
            {isFoaieDeZahar 
              ? foaieDeZaharUrl !== null 
                ? 'Foaie de zahar încărcată (1/1)' 
                : 'O singură imagine, necomprimată (0/1)'
              : `Maxim 3 poze (mai poți adăuga ${Math.max(3 - photos.length, 0)})`
            }
          </p>
        </div>

        {(photos.length > 0 || (isFoaieDeZahar && foaieDeZaharUrl)) && (
          <div>
            <h2 className="text-xl font-semibold mb-4">
              {isFoaieDeZahar ? 'Foaie de zahar încărcată' : `Poze încărcate (${photos.length})`}
            </h2>
            <div className={`grid gap-4 ${isFoaieDeZahar ? 'grid-cols-1' : 'grid-cols-2'}`}>
              {(isFoaieDeZahar && foaieDeZaharUrl ? [foaieDeZaharUrl] : photos).map((photo, index) => {
                console.log(`Rendering photo ${index + 1}:`, photo)
                // Use photo URL as key to ensure proper re-rendering
                const photoKey = photo.substring(photo.lastIndexOf('/') + 1) || `photo-${index}`
                return (
                  <div key={photoKey} className="relative">
                    <img
                      src={getAbsoluteUrl(photo)}
                      alt={`Poza ${index + 1}`}
                      className="w-full h-48 object-cover rounded-lg border-2 border-gray-700"
                      onLoad={() => {
                        console.log(`✅ Image ${index + 1} loaded successfully:`, photo)
                      }}
                      onError={(e) => {
                        console.error(`❌ Image ${index + 1} failed to load:`, photo, 'Full URL:', getAbsoluteUrl(photo), e)
                        // Show error indicator
                        const target = e.target as HTMLImageElement
                        target.style.border = '2px solid red'
                        target.alt = `Eroare la încărcarea pozei ${index + 1}`
                      }}
                    />
                    {/* Debug info in development */}
                    {import.meta.env.DEV && (
                      <div className="text-xs text-gray-500 mt-1 break-all">
                        {photo.substring(0, 50)}...
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        )}
        
        {/* Debug info */}
        {import.meta.env.DEV && photos.length === 0 && (
          <div className="mt-4 p-4 bg-gray-800 rounded-lg">
            <p className="text-sm text-gray-400">Debug: Nu există poze în state</p>
            <p className="text-xs text-gray-500 mt-2">
              State photos length: {photos.length}
            </p>
          </div>
        )}

        {photos.length > 0 && !sent && !isFoaieDeZahar && (
          <div className="mt-6">
            <button
              onClick={async () => {
                if (!sessionId) {
                  alert('Eroare: ID sesiune lipsă')
                  return
                }
                
                setSending(true)
                try {
                  // Mark photos as sent
                  await api.post(`/upload/${sessionId}/send`)
                  setSent(true)
                  alert('Pozele au fost trimise cu succes! Acestea vor apărea în aplicația principală.')
                } catch (error: unknown) {
                  console.error('Error sending photos:', error)
                  if (axios.isAxiosError(error)) {
                    const apiMessage = (error.response?.data as { error?: string } | undefined)?.error
                    const errorMessage = apiMessage || error.message || 'Eroare necunoscută'
                    alert(`Eroare la trimiterea pozelor: ${errorMessage}`)
                  } else {
                    alert('Eroare la trimiterea pozelor: Eroare necunoscută')
                  }
                } finally {
                  setSending(false)
                }
              }}
              disabled={sending || photos.length === 0}
              className={`w-full py-4 px-6 rounded-lg font-bold text-lg transition-all ${
                sending || photos.length === 0
                  ? 'bg-gray-700 text-gray-500 cursor-not-allowed'
                  : 'bg-green-600 hover:bg-green-700 text-white'
              }`}
            >
              {sending ? 'Se trimit...' : '📤 Trimite poze'}
            </button>
          </div>
        )}
        
        {sent && !isFoaieDeZahar && (
          <div className="mt-6 text-center">
            <p className="text-green-400 mb-2 text-lg font-semibold">✅ Pozele au fost trimise!</p>
            <p className="text-gray-400 text-sm">Pozele vor apărea în aplicația principală</p>
          </div>
        )}

        {isFoaieDeZahar && foaieDeZaharUrl && (
          <div className="mt-6 text-center">
            <p className="text-green-400 mb-2 text-lg font-semibold">✅ Foaia de zahar a fost încărcată!</p>
            <p className="text-gray-400 text-sm">Foaia de zahar va fi disponibilă în panoul de administrare</p>
          </div>
        )}
        
        {/* Debug panel */}
        {import.meta.env.DEV && (
          <div className="mt-6 p-4 bg-gray-800 rounded-lg">
            <h3 className="text-sm font-semibold mb-2">Debug Info</h3>
            <div className="text-xs text-gray-400 space-y-1">
              <p>Photos in state: {photos.length}</p>
              <p>Session ID: {sessionId || 'N/A'}</p>
              <p>Current hostname: {window.location.hostname}</p>
              <p>Local IP in storage: {localStorage.getItem('localNetworkIP') || 'Not set'}</p>
              {photos.length > 0 && (
                <div className="mt-2">
                  <p className="font-semibold">Photo URLs:</p>
                  {photos.map((url, idx) => (
                    <div key={idx} className="mt-1 break-all text-xs">
                      {idx + 1}. {url}
                    </div>
                  ))}
                </div>
              )}
              <button
                onClick={() => {
                  console.log('Current photos state:', photos)
                  console.log('Photos array length:', photos.length)
                  alert(`Poze în state: ${photos.length}\n\nVerifică consola pentru detalii.`)
                }}
                className="mt-2 px-3 py-1 bg-blue-600 text-white rounded text-xs"
              >
                Log State to Console
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default PhotoUpload












