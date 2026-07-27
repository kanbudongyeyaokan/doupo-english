import { useEffect, useState } from 'react'
import { db } from '../db'

export function WordImage({ assetId, alt }: { assetId: string; alt: string }) {
  const [url, setUrl] = useState('')
  useEffect(() => {
    let objectUrl = ''
    db.assets.get(assetId).then((asset) => {
      if (!asset) return
      objectUrl = URL.createObjectURL(asset.blob)
      setUrl(objectUrl)
    })
    return () => { if (objectUrl) URL.revokeObjectURL(objectUrl) }
  }, [assetId])
  return url ? <img className="word-image" src={url} alt={alt} /> : null
}

