// lib/video-thumbnail.ts
export function captureVideoFrame(blobUrl: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const video = document.createElement('video')
    video.src = blobUrl
    video.crossOrigin = 'anonymous'
    video.muted = true
    video.playsInline = true

    video.addEventListener('loadeddata', () => {
      video.currentTime = 2 // seek to 2s (or 0 if video is short)
    })

    video.addEventListener('seeked', () => {
      const canvas = document.createElement('canvas')
      canvas.width = video.videoWidth
      canvas.height = video.videoHeight
      canvas.getContext('2d')!.drawImage(video, 0, 0)
      resolve(canvas.toDataURL('image/jpeg'))
      video.remove()
    })

    video.addEventListener('error', reject)
    video.load()
  })
}