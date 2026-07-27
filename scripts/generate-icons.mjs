import sharp from 'sharp'
import { fileURLToPath } from 'node:url'

const input = fileURLToPath(new URL('../public/favicon.svg', import.meta.url))
await Promise.all([
  sharp(input).resize(192, 192).png().toFile(fileURLToPath(new URL('../public/pwa-192x192.png', import.meta.url))),
  sharp(input).resize(512, 512).png().toFile(fileURLToPath(new URL('../public/pwa-512x512.png', import.meta.url)))
])

console.log('Generated PWA icons: 192x192, 512x512')
