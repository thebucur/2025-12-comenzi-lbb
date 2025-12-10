import { useEffect, useRef, useState } from 'react'
import { Html5Qrcode } from 'html5-qrcode'

interface QRScannerProps {
  onScanSuccess: (decodedText: string) => void
  onClose: () => void
}

function QRScanner({ onScanSuccess, onClose }: QRScannerProps) {
  const scannerRef = useRef<Html5Qrcode | null>(null)
  const [error, setError] = useState<string | null>(null)

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
      (_errorMessage) => {
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
      {error && (
        <div className="p-4 bg-red-500 text-white text-center">
          {error}
        </div>
      )}
    </div>
  )
}

export default QRScanner



