import { useState, useRef } from 'react'
import { useParams } from 'react-router-dom'
import api from '../services/api'

function PhotoUpload() {
  const { sessionId } = useParams<{ sessionId: string }>()
  const [photos, setPhotos] = useState<string[]>([])
  const [uploading, setUploading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const compressImage = (file: File): Promise<Blob> => {
    return new Promise((resolve) => {
      const reader = new FileReader()
      reader.onload = (e) => {
        const img = new Image()
        img.onload = () => {
          const canvas = document.createElement('canvas')
          let width = img.width
          let height = img.height
          const maxDimension = 2000

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
          ctx?.drawImage(img, 0, 0, width, height)

          canvas.toBlob(
            (blob) => {
              resolve(blob || file)
            },
            'image/jpeg',
            0.8
          )
        }
        img.src = e.target?.result as string
      }
      reader.readAsDataURL(file)
    })
  }

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files || files.length === 0) return

    setUploading(true)
    try {
      for (const file of Array.from(files)) {
        const compressed = await compressImage(file)
        const formData = new FormData()
        formData.append('photo', compressed, file.name)

        const response = await api.post(`/upload/${sessionId}`, formData, {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
        })

        setPhotos((prev) => [...prev, response.data.url])
      }
    } catch (error) {
      console.error('Error uploading photos:', error)
      alert('Eroare la încărcarea pozelor')
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
        <h1 className="text-2xl font-bold mb-6 text-center">Încarcă poze</h1>
        
        <div className="bg-gray-800 rounded-lg p-6 mb-6">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            multiple
            onChange={handleFileSelect}
            disabled={uploading}
            className="hidden"
            id="file-input"
          />
          <label
            htmlFor="file-input"
            className={`block w-full py-4 px-6 text-center rounded-lg cursor-pointer transition-all ${
              uploading
                ? 'bg-gray-700 text-gray-500 cursor-not-allowed'
                : 'bg-neon-pink hover:bg-neon-pink/90'
            }`}
          >
            {uploading ? 'Se încarcă...' : 'Selectează poze'}
          </label>
        </div>

        {photos.length > 0 && (
          <div>
            <h2 className="text-xl font-semibold mb-4">Poze încărcate</h2>
            <div className="grid grid-cols-2 gap-4">
              {photos.map((photo, index) => (
                <div key={index} className="relative">
                  <img
                    src={photo}
                    alt={`Poza ${index + 1}`}
                    className="w-full h-48 object-cover rounded-lg"
                  />
                </div>
              ))}
            </div>
          </div>
        )}

        {photos.length > 0 && (
          <div className="mt-6 text-center">
            <p className="text-green-400 mb-4">Pozele au fost încărcate cu succes!</p>
            <p className="text-gray-400 text-sm">Pozele vor apărea în aplicația principală</p>
          </div>
        )}
      </div>
    </div>
  )
}

export default PhotoUpload

