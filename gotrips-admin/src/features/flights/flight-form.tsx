import { LoaderCircle } from 'lucide-react'
import { useState, type FormEventHandler, type ReactNode, type Ref } from 'react'
import { Button } from '@/components/ui/button'
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog'
import { Field, FieldError, FieldLabel } from '@/components/ui/field'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { activeFlightTrigger, flightErrorProps } from './flight-form-utils'

export function FlightDialog({ title, description, onClose, children, returnFocus }: {
  title: string
  description: string
  onClose: () => void
  children: ReactNode
  returnFocus?: HTMLElement | null
}) {
  const [trigger] = useState(activeFlightTrigger)
  return (
    <Dialog open onOpenChange={(open) => { if (!open) onClose() }}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl!" onCloseAutoFocus={(event) => {
        event.preventDefault()
        requestAnimationFrame(() => {
          if (!document.querySelector('[role="dialog"][data-state="open"]')) (returnFocus ?? trigger)?.focus()
        })
      }}>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        {children}
      </DialogContent>
    </Dialog>
  )
}

export function FlightForm({ onSubmit, pending, error, onClose, submitLabel, children }: {
  onSubmit: FormEventHandler<HTMLFormElement>
  pending: boolean
  error: string | null
  onClose: () => void
  submitLabel: string
  children: ReactNode
}) {
  return (
    <form noValidate onSubmit={onSubmit} className="space-y-4">
      {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
      {children}
      <DialogFooter>
        <Button type="button" variant="outline" disabled={pending} onClick={onClose}>Quay lại</Button>
        <Button type="submit" disabled={pending}>
          {pending && <LoaderCircle className="animate-spin" aria-hidden="true" />}
          {submitLabel}
        </Button>
      </DialogFooter>
    </form>
  )
}

export function FlightField({ id, label, error, children }: {
  id: string
  label: string
  error?: string
  children: ReactNode
}) {
  return (
    <Field data-invalid={!!error}>
      <FieldLabel htmlFor={id}>{label}</FieldLabel>
      {children}
      {error && <FieldError id={`${id}-error`}>{error}</FieldError>}
    </Field>
  )
}

export type FlightOption = { code: string; name: string }

export function FlightCodeSelect({ id, label, allLabel, value, onChange, onBlur, options, disabled, error, triggerRef }: {
  id?: string
  label: string
  allLabel?: string
  value: string
  onChange: (code: string) => void
  onBlur?: () => void
  options: FlightOption[]
  disabled?: boolean
  error?: string
  triggerRef?: Ref<HTMLButtonElement>
}) {
  return (
    <Select value={allLabel && !value ? '__all__' : value}
      onValueChange={(code) => onChange(code === '__all__' && allLabel ? '' : code)} disabled={disabled}>
      <SelectTrigger id={id} aria-label={label} onBlur={onBlur} ref={triggerRef}
        {...flightErrorProps(id ?? 'flight-option', error)}>
        <SelectValue placeholder={label} />
      </SelectTrigger>
      <SelectContent>
        {allLabel && <SelectItem value="__all__">{allLabel}</SelectItem>}
        {options.map(({ code, name }) => (
          <SelectItem key={code} value={code}>{code} · {name}</SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}

export function FlightEditButton({ onClick, children, disabled }: {
  onClick: () => void
  children: ReactNode
  disabled?: boolean
}) {
  return (
    <button type="button" onClick={onClick} disabled={disabled}
      className="rounded-sm text-left font-medium whitespace-normal text-primary hover:underline focus-visible:ring-3 focus-visible:ring-ring/50 disabled:opacity-50">
      {children}
    </button>
  )
}
