export function activeFlightTrigger() {
  return document.activeElement instanceof HTMLElement ? document.activeElement : null
}

export function flightErrorProps(id: string, error?: string) {
  return { 'aria-invalid': !!error, 'aria-describedby': error ? `${id}-error` : undefined }
}
