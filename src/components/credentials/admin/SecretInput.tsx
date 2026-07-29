import { useState } from 'react'
import { Eye, EyeOff } from 'lucide-react'
import { cn } from '@/lib/utils'
import { controlClass } from '@/components/ui/Field'

interface SecretInputProps {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  className?: string
}

/** Password-style input with a show/hide toggle for entering secret values. */
export function SecretInput({ value, onChange, placeholder, className }: SecretInputProps) {
  const [visible, setVisible] = useState(false)
  return (
    <div className="relative">
      <input
        type={visible ? 'text' : 'password'}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className={cn(controlClass, 'h-11 pr-10 font-mono', className)}
      />
      <button
        type="button"
        onClick={() => setVisible((v) => !v)}
        aria-label={visible ? 'Hide secret' : 'Show secret'}
        className="text-fg-subtle hover:text-fg absolute top-1/2 right-3 -translate-y-1/2 transition-colors"
      >
        {visible ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
      </button>
    </div>
  )
}
