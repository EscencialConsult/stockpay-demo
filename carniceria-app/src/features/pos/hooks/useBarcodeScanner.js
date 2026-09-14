import { useEffect, useRef, useCallback } from 'react'

const SCAN_TIMEOUT_MS = 80
const MIN_BARCODE_LENGTH = 4

function isInputFocused() {
  const tag = document.activeElement?.tagName
  return tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT'
}

export function useBarcodeScanner(onScan) {
  const bufferRef = useRef('')
  const timerRef  = useRef(undefined)
  const stableOnScan = useCallback(onScan, [onScan])

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (isInputFocused()) return

      if (e.key === 'Enter') {
        const code = bufferRef.current.trim()
        if (code.length >= MIN_BARCODE_LENGTH) stableOnScan(code)
        bufferRef.current = ''
        clearTimeout(timerRef.current)
        return
      }

      if (e.key.length === 1) {
        bufferRef.current += e.key
        clearTimeout(timerRef.current)
        timerRef.current = setTimeout(() => { bufferRef.current = '' }, SCAN_TIMEOUT_MS)
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => {
      window.removeEventListener('keydown', handleKeyDown)
      clearTimeout(timerRef.current)
    }
  }, [stableOnScan])
}
