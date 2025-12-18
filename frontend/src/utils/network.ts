/**
 * Get the local network IP address for mobile device access
 * This replaces localhost with the actual local IP so mobile devices can connect
 */
export function getLocalNetworkUrl(): string {
  // In development, try to use the local network IP
  if (import.meta.env.DEV) {
    // Check if we have a stored IP address
    const storedIP = localStorage.getItem('localNetworkIP')
    if (storedIP) {
      return `http://${storedIP}:3000`
    }
    
    // Try to detect from window.location if available
    // If hostname is localhost or 127.0.0.1, we need the actual IP
    const hostname = window.location.hostname
    if (hostname === 'localhost' || hostname === '127.0.0.1') {
      // Return a placeholder that will be replaced by the user
      // The user should set their local IP via the console or UI
      return window.location.origin
    }
    
    // If already using an IP address, use it
    return window.location.origin
  }
  
  // In production, use the normal origin
  return window.location.origin
}

/**
 * Set the local network IP address manually
 * Call this from the browser console: setLocalNetworkIP('192.168.1.100')
 */
export function setLocalNetworkIP(ip: string): void {
  localStorage.setItem('localNetworkIP', ip)
  console.log(`Local network IP set to: ${ip}`)
  console.log(`QR codes will now use: http://${ip}:3000`)
}

/**
 * Get the current local network IP if set
 */
export function getLocalNetworkIP(): string | null {
  return localStorage.getItem('localNetworkIP')
}




