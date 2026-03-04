'use client'

import { useEffect } from 'react'
import cssVars from 'css-vars-ponyfill'

export default function LegacyCSSSupport() {
  useEffect(() => {
    // Detect Internet Explorer (any version)
    const isIE = /*@cc_on!@*/false || !!(document as any).documentMode
    // Detect old Edge (versions 15-16 with poor CSS var support)
    const isOldEdge = !isIE && /Edge\/1[56]\./i.test(navigator.userAgent)

    if (isIE || isOldEdge) {
      cssVars({
        onlyLegacy: true,
        preserveStatic: true,
        watch: false,
        silent: true
      })
    }
  }, [])

  return null
}