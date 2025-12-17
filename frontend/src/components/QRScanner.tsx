import { useEffect, useRef, useState, type ChangeEvent } from 'react'
import { Html5Qrcode } from 'html5-qrcode'

interface QRScannerProps {
  onScanSuccess: (decodedText: string) => void
  onClose: () => void
}

function QRScanner({ onScanSuccess, onClose }: QRScannerProps) {
  const scannerRef = useRef<Html5Qrcode | null>(null)
  const fileInputRef = useRef<HTMLInputElement | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isProcessingFile, setIsProcessingFile] = useState(false)

  useEffect(() => {
    const scanner = new Html5Qrcode('qr-reader')
    
    scanner.start(
      { facingMode: 'environment' },
      {
        fps: 10,
        qrbox: { width: 250, height: 250 },
      },
      (decodedText) => {
        scanner.stop()
        onScanSuccess(decodedText)
      },
      () => {
        // Ignore scanning errors
      }
    ).catch((err) => {
      setError('Eroare la pornirea camerei')
      console.error(err)
    })

    scannerRef.current = scanner

    return () => {
      if (scannerRef.current) {
        scannerRef.current.stop().catch(() => {})
      }
    }
  }, [onScanSuccess])

  const handleSelectFile = () => {
    setError(null)
    fileInputRef.current?.click()
  }

  const handleFileChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file || !scannerRef.current) return

    setIsProcessingFile(true)
    try {
      const decodedText = await scannerRef.current.scanFile(file, true)
      onScanSuccess(decodedText)
    } catch (err) {
      console.error(err)
      setError('Eroare la citirea imaginii. Încearcă altă poză.')
    } finally {
      setIsProcessingFile(false)
      // reset input to allow re-selecting the same file
      event.target.value = ''
    }
  }

  return (
    <div className="fixed inset-0 bg-black z-50 flex flex-col">
      <div className="flex justify-between items-center p-4 bg-gray-900">
        <h2 className="text-xl font-semibold text-white">Scanează codul QR</h2>
        <button
          onClick={onClose}
          className="text-white hover:text-gray-300 text-2xl"
        >
          ×
        </button>
      </div>
      <div id="qr-reader" className="flex-1" />
      <div className="p-4 bg-gray-900 flex items-center justify-center gap-3">
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleFileChange}
        />
        <button
          onClick={handleSelectFile}
          disabled={isProcessingFile}
          className="px-4 py-2 rounded bg-white text-gray-900 font-medium hover:bg-gray-200 disabled:opacity-60"
        >
          {isProcessingFile ? 'Se procesează...' : 'Încarcă poză din device'}
        </button>
      </div>
      {error && (
        <div className="p-4 bg-red-500 text-white text-center">
          {error}
        </div>
      )}
    </div>
  )
}

export default QRScanner



