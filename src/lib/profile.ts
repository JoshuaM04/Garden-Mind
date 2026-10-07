import type { User } from '@supabase/supabase-js'

export const AVATAR_MAX_BYTES = 8 * 1024 * 1024
const AVATAR_SIZE = 256

export function getAvatarUrl(user: User | null | undefined) {
  const url = user?.user_metadata?.avatar_url
  return typeof url === 'string' && url ? url : null
}

// Center-crops to a square and re-encodes as JPEG so uploads stay small.
export async function resizeAvatar(file: File): Promise<Blob> {
  const bitmap = await createImageBitmap(file)
  const side = Math.min(bitmap.width, bitmap.height)
  const canvas = document.createElement('canvas')
  canvas.width = AVATAR_SIZE
  canvas.height = AVATAR_SIZE
  const context = canvas.getContext('2d')
  if (!context) {
    throw new Error('Image processing is not supported in this browser.')
  }
  context.drawImage(
    bitmap,
    (bitmap.width - side) / 2,
    (bitmap.height - side) / 2,
    side,
    side,
    0,
    0,
    AVATAR_SIZE,
    AVATAR_SIZE,
  )
  bitmap.close()
  return new Promise((resolve, reject) =>
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error('Could not process image.'))),
      'image/jpeg',
      0.88,
    ),
  )
}

export function getInitials(email: string | undefined) {
  return email ? email.slice(0, 2).toUpperCase() : 'GM'
}
