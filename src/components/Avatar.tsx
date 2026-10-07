import { useState } from 'react'
import { getInitials } from '../lib/profile'

interface AvatarProps {
  email: string | undefined
  imageUrl?: string | null
  className?: string
}

export function Avatar({ email, imageUrl, className = 'size-9' }: AvatarProps) {
  const [failedUrl, setFailedUrl] = useState<string | null>(null)
  const showImage = Boolean(imageUrl) && failedUrl !== imageUrl

  return (
    <span
      className={`grid shrink-0 place-items-center overflow-hidden rounded-full border border-[var(--glass-edge)] bg-[image:var(--avatar-bg)] font-[family-name:var(--font-display)] font-bold text-[var(--avatar-fg)] ${className}`}
    >
      {showImage ? (
        <img
          alt=""
          className="size-full object-cover"
          onError={() => setFailedUrl(imageUrl ?? null)}
          src={imageUrl ?? undefined}
        />
      ) : (
        getInitials(email)
      )}
    </span>
  )
}
