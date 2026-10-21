import { useCallback, useEffect, useRef, useState } from 'react'

/**
 * Speech to text, using what the browser already has.
 *
 * No library and no server round trip: the Web Speech API is a browser feature
 * (Chrome, Edge, Safari). Two honest limits come with that. Firefox has no
 * implementation at all. And in most browsers recognition runs on the vendor's
 * servers, so it needs a connection even though Knack itself does not. Newer
 * Chrome can recognise on-device (`processLocally`), which is requested when
 * offline mode is on; where it is not available the button says so rather than
 * silently sending someone's voice to a server they asked not to use.
 */

const Recognition =
  typeof window !== 'undefined' ? window.SpeechRecognition || window.webkitSpeechRecognition : null

export const speechSupported = !!Recognition

/**
 * What "network" really means. The browser reports it when it cannot reach its
 * own speech service, which is Google's in Chrome and Microsoft's in Edge. That
 * is a different thing from the user's internet being down, and telling someone
 * with a working connection that they have no internet sends them looking in the
 * wrong place. So the message names the browser and the usual cause.
 */
function networkMessage(onDevice) {
  const ua = typeof navigator === 'undefined' ? '' : navigator.userAgent
  if (typeof navigator !== 'undefined' && navigator.onLine === false) {
    return 'You look offline, and this browser needs a connection for speech. Typing still works.'
  }
  if (onDevice) {
    return 'Offline mode asks for on-device recognition and this browser cannot do that. Type, or turn offline mode off to use the browser’s speech service.'
  }
  if (typeof navigator !== 'undefined' && navigator.brave) {
    return 'Brave blocks the browser speech service. Use Chrome or Edge for the mic, or type.'
  }
  if (/Electron\//.test(ua)) {
    return 'This built-in browser has no speech service. Open this page in Chrome or Edge to use the mic, or type.'
  }
  if (/Edg\//.test(ua)) {
    return 'Edge could not reach its speech service. Turn on Windows Settings, Privacy and security, Speech, Online speech recognition, then reload. Or use Chrome. Typing works.'
  }
  return 'The browser could not reach its speech service. This is not about your internet: a VPN, firewall or privacy extension is usually blocking it. Try Incognito, or Edge, or type.'
}

const ERRORS = {
  'not-allowed': 'The microphone is blocked. Allow it in the address bar, then try again.',
  'service-not-allowed': 'The microphone is blocked. Allow it in the address bar, then try again.',
  'no-speech': 'Heard nothing. Try again a bit closer to the microphone.',
  'audio-capture': 'No microphone was found on this device.',
  'language-not-supported': 'This browser cannot recognise that language on this device.',
}

export function useSpeech({ onText, lang = 'en-IN', onDevice = false } = {}) {
  const [listening, setListening] = useState(false)
  const [interim, setInterim] = useState('')
  const [error, setError] = useState(null)

  const recRef = useRef(null)
  const onTextRef = useRef(onText)
  onTextRef.current = onText

  const stop = useCallback(() => {
    try {
      recRef.current?.stop()
    } catch {
      /* already stopped */
    }
  }, [])

  const start = useCallback(() => {
    if (!Recognition) {
      setError('This browser cannot do speech recognition. Chrome, Edge and Safari can.')
      return
    }
    if (recRef.current) return

    setError(null)
    const rec = new Recognition()
    rec.lang = lang
    rec.continuous = true
    rec.interimResults = true
    rec.maxAlternatives = 1
    // Offline mode asks for on-device recognition. If the browser cannot do it,
    // it will fail with 'language-not-supported' or 'network', which is shown.
    if (onDevice && 'processLocally' in rec) rec.processLocally = true

    rec.onstart = () => setListening(true)
    rec.onresult = (e) => {
      let finalText = ''
      let live = ''
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const r = e.results[i]
        if (r.isFinal) finalText += r[0].transcript
        else live += r[0].transcript
      }
      setInterim(live)
      if (finalText.trim()) onTextRef.current?.(finalText.trim())
    }
    rec.onerror = (e) =>
      setError(
        e.error === 'network'
          ? networkMessage(onDevice && 'processLocally' in rec)
          : (ERRORS[e.error] ?? `Speech recognition stopped (${e.error}).`)
      )
    rec.onend = () => {
      recRef.current = null
      setListening(false)
      setInterim('')
    }

    recRef.current = rec
    try {
      rec.start()
    } catch (e) {
      recRef.current = null
      setError(e.message)
    }
  }, [lang, onDevice])

  // Never leave the microphone open behind a page the trainee has left.
  useEffect(
    () => () => {
      try {
        recRef.current?.abort()
      } catch {
        /* nothing to abort */
      }
    },
    []
  )

  return { supported: speechSupported, listening, interim, error, start, stop }
}
