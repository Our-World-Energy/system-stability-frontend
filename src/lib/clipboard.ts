/*
  Clipboard writes that survive an await.

  `navigator.clipboard.writeText` requires transient user activation. Copying a
  credential secret means fetching and decrypting it first, and that await can
  outlive the activation window — Safari in particular then rejects the write.
  So the async API is tried first and a synchronous execCommand fallback catches
  the rejection.
*/

/** Write `text` to the clipboard. Resolves true when it landed. */
export async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard?.writeText(text)
    return true
  } catch {
    return legacyCopy(text)
  }
}

/**
 * Pre-activation clipboard write: stage the value in an off-screen textarea,
 * select it and let the browser copy the selection.
 */
function legacyCopy(text: string): boolean {
  const field = document.createElement('textarea')
  field.value = text
  // Off-screen rather than hidden: a display:none element cannot be selected,
  // and `readonly` stops mobile keyboards popping up.
  field.setAttribute('readonly', '')
  field.style.position = 'fixed'
  field.style.top = '-1000px'
  field.style.opacity = '0'
  document.body.appendChild(field)

  try {
    field.select()
    field.setSelectionRange(0, text.length)
    return document.execCommand('copy')
  } catch {
    return false
  } finally {
    // Never leave the plaintext sitting in the DOM, even if the copy failed.
    field.value = ''
    field.remove()
  }
}
