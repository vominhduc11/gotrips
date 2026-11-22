import { useSyncExternalStore } from "react"

const MOBILE_BREAKPOINT = 768
const MOBILE_QUERY = `(max-width: ${MOBILE_BREAKPOINT - 1}px)`

// Dùng useSyncExternalStore thay vì useState + useEffect: trạng thái đến từ matchMedia (hệ thống bên ngoài)
// nên đọc trực tiếp là đúng, và không gây render thừa khi mount.
function subscribe(callback: () => void) {
  const mql = window.matchMedia(MOBILE_QUERY)
  mql.addEventListener("change", callback)
  return () => mql.removeEventListener("change", callback)
}

function getSnapshot() {
  return window.matchMedia(MOBILE_QUERY).matches
}

// Lúc render phía server (không có window) coi như không phải mobile.
function getServerSnapshot() {
  return false
}

export function useIsMobile(): boolean {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot)
}
