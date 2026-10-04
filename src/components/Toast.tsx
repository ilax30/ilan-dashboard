import { useEffect } from 'react'

export type ToastData = { id: number; message: string; undo?: () => void }

export function Toast({ toast, onClose }: { toast: ToastData | null; onClose: () => void }) {
  useEffect(() => {
    if (!toast) return
    const t = setTimeout(onClose, 5000)
    return () => clearTimeout(t)
  }, [toast, onClose])

  if (!toast) return null

  return (
    <div className="toast" role="status" key={toast.id}>
      <span>{toast.message}</span>
      {toast.undo && (
        <button
          className="toast-undo"
          type="button"
          onClick={() => {
            toast.undo?.()
            onClose()
          }}
        >
          Ongedaan maken
        </button>
      )}
    </div>
  )
}
