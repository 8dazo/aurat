import koffi from 'koffi'

const TITLE_BAR_HEIGHT_PT = 28
const OFFSCREEN_X = -10000
const PANEL_WIDTH = 380

const kAXValueTypeCGPoint = 1
const kAXValueTypeCGSize = 2
const kAXValueTypeCGRect = 3

const kAXErrorSuccess = 0
const kAXErrorAPIDisabled = -25211
const kAXErrorCannotComplete = -25204
const kAXErrorNotImplemented = -25208
const kAXErrorInvalidUIElement = -25202

const appServices = koffi.load('/System/Library/Frameworks/ApplicationServices.framework/ApplicationServices')
const coreFoundation = koffi.load('/System/Library/Frameworks/CoreFoundation.framework/CoreFoundation')

const CGPoint = koffi.struct('CGPoint', { x: 'double', y: 'double' })
const CGSize = koffi.struct('CGSize', { width: 'double', height: 'double' })

const AXUIElementRef = koffi.pointer('AXUIElementRef', koffi.opaque())
const CFStringRef = koffi.pointer('CFStringRef', koffi.opaque())
const CFTypeRef = koffi.pointer('CFTypeRef', koffi.opaque())
const CFDictionaryRef = koffi.pointer('CFDictionaryRef', koffi.opaque())
const CFBooleanRef = koffi.pointer('CFBooleanRef', koffi.opaque())
const CFArrayRef = koffi.pointer('CFArrayRef', koffi.opaque())
const AXValueRef = koffi.pointer('AXValueRef', koffi.opaque())

const kCFStringEncodingUTF8 = 0x08000100

const CFStringCreateWithCString = coreFoundation.func('CFStringRef CFStringCreateWithCString(void *alloc, const char *cStr, uint32_t encoding)')
const AXUIElementCreateApplication = appServices.func('AXUIElementRef AXUIElementCreateApplication(int32_t pid)')
const AXUIElementCopyAttributeValue = appServices.func('int32_t AXUIElementCopyAttributeValue(AXUIElementRef element, CFStringRef attribute, _Out_ CFTypeRef *value)')
const AXUIElementSetAttributeValue = appServices.func('int32_t AXUIElementSetAttributeValue(AXUIElementRef element, CFStringRef attribute, CFTypeRef value)')
const AXUIElementPerformAction = appServices.func('int32_t AXUIElementPerformAction(AXUIElementRef element, CFStringRef action)')
const AXValueCreate = appServices.func('AXValueRef AXValueCreate(int32_t theType, const void *valuePtr)')
const AXIsProcessTrusted = appServices.func('bool AXIsProcessTrusted()')
const AXIsProcessTrustedWithOptions = appServices.func('bool AXIsProcessTrustedWithOptions(CFDictionaryRef options)')
const CFRelease = coreFoundation.func('void CFRelease(CFTypeRef cf)')
const CFArrayGetCount = coreFoundation.func('int64_t CFArrayGetCount(CFArrayRef array)')
const CFArrayGetValueAtIndex = coreFoundation.func('void *CFArrayGetValueAtIndex(CFArrayRef array, int64_t index)')

function cfstr(s: string) {
  return CFStringCreateWithCString(null, s, kCFStringEncodingUTF8)
}

const kAXPositionAttr = cfstr('AXPosition')
const kAXSizeAttr = cfstr('AXSize')
const kAXWindowsAttr = cfstr('AXWindows')
const kAXRoleAttr = cfstr('AXRole')
const kAXTitleAttr = cfstr('AXTitle')
const kAXMinimizedAttr = cfstr('AXMinimized')
const kAXRaiseActionStr = cfstr('AXRaise')
const kAXTrustedCheckOptionPromptStr = cfstr('TrustedCheckOptionPrompt')
const kCFBooleanTrue = koffi.decode(coreFoundation.symbol('kCFBooleanTrue', CFBooleanRef), CFBooleanRef)
const kCFBooleanFalse = koffi.decode(coreFoundation.symbol('kCFBooleanFalse', CFBooleanRef), CFBooleanRef)

export interface AXWindowRef {
  element: unknown
  pid: number
  windowIndex: number
}

const CFDictionaryCreate = coreFoundation.func('CFDictionaryRef CFDictionaryCreate(void *alloc, const void **keys, const void **values, int64_t count, void *keyCallbacks, void *valueCallbacks)')

let cachedTrusted: boolean | null = null

export function checkAccessibilityPermission(): boolean {
  if (cachedTrusted !== null) return cachedTrusted
  try {
    const trusted = AXIsProcessTrusted()
    cachedTrusted = trusted
    return trusted
  } catch {
    return false
  }
}

export function requestAccessibilityPermission(): boolean {
  try {
    const keys = [kAXTrustedCheckOptionPromptStr]
    const values = [kCFBooleanTrue]
    const options = CFDictionaryCreate(null, keys, values, 1, null, null)
    const trusted = AXIsProcessTrustedWithOptions(options)
    if (options) CFRelease(options)
    cachedTrusted = trusted
    return trusted
  } catch {
    return false
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

export async function findWindowByPID(pid: number, maxRetries = 20): Promise<AXWindowRef | null> {
  for (let i = 0; i < maxRetries; i++) {
    let appElement: unknown = null
    try {
      appElement = AXUIElementCreateApplication(pid)
    } catch {
      console.error(`[cloak-window] findWindow retry ${i + 1}/${maxRetries}: CreateApplication threw`)
      await sleep(500)
      continue
    }
    if (!appElement) {
      console.error(`[cloak-window] findWindow retry ${i + 1}/${maxRetries}: appElement is null`)
      await sleep(500)
      continue
    }

    const windowsOut = [null]
    let err: number
    try {
      err = AXUIElementCopyAttributeValue(appElement, kAXWindowsAttr, windowsOut)
    } catch (e) {
      console.error(`[cloak-window] findWindow retry ${i + 1}/${maxRetries}: CopyAttributeValue threw:`, e)
      await sleep(500)
      continue
    }

    if (err !== kAXErrorSuccess) {
      try { CFRelease(appElement) } catch {}
      console.error(`[cloak-window] findWindow retry ${i + 1}/${maxRetries}: AXWindows error=${err}`)
      if (err === kAXErrorCannotComplete || err === kAXErrorNotImplemented) {
        await sleep(500)
        continue
      }
      if (err === kAXErrorAPIDisabled) {
        console.error('[cloak-window] Accessibility API disabled')
        return null
      }
      await sleep(500)
      continue
    }

    const windowsArray = windowsOut[0]
    if (!windowsArray) {
      try { CFRelease(appElement) } catch {}
      await sleep(500)
      continue
    }

    const count = CFArrayGetCount(windowsArray)
    let foundWindow: AXWindowRef | null = null

    for (let j = 0; j < count; j++) {
      const windowElement = CFArrayGetValueAtIndex(windowsArray, j)

      const roleOut = [null]
      try {
        const roleErr = AXUIElementCopyAttributeValue(windowElement, kAXRoleAttr, roleOut)
        if (roleErr === kAXErrorSuccess && roleOut[0]) {
          CFRelease(roleOut[0])
          foundWindow = { element: windowElement, pid, windowIndex: j }
          break
        }
        if (roleOut[0]) CFRelease(roleOut[0])
      } catch {
        if (roleOut[0]) try { CFRelease(roleOut[0]) } catch {}
      }
    }

    if (foundWindow) {
      retainedAppElement = appElement
      retainedWindowsArray = windowsArray
      return foundWindow
    }

    CFRelease(windowsArray)
    CFRelease(appElement)

    await sleep(500)
  }

  console.error(`[cloak-window] Could not find window for PID ${pid} after ${maxRetries} retries`)
  return null
}

export function setPositionAndSize(window: AXWindowRef, x: number, y: number, w: number, h: number): number {
  let posErr = -1
  try {
    const posValue = AXValueCreate(kAXValueTypeCGPoint, koffi.as({ x, y }, 'CGPoint *'))
    if (posValue) {
      posErr = AXUIElementSetAttributeValue(window.element, kAXPositionAttr, posValue)
      CFRelease(posValue)
    }
  } catch {}

  let sizeErr = -1
  try {
    const sizeValue = AXValueCreate(kAXValueTypeCGSize, koffi.as({ width: w, height: h }, 'CGSize *'))
    if (sizeValue) {
      sizeErr = AXUIElementSetAttributeValue(window.element, kAXSizeAttr, sizeValue)
      CFRelease(sizeValue)
    }
  } catch {}

  return posErr || sizeErr
}

export function raiseWindow(window: AXWindowRef): number {
  try {
    return AXUIElementPerformAction(window.element, kAXRaiseActionStr)
  } catch { return -1 }
}

export function minimizeWindow(window: AXWindowRef): number {
  try {
    return AXUIElementSetAttributeValue(window.element, kAXMinimizedAttr, kCFBooleanTrue)
  } catch { return -1 }
}

export function unminimizeWindow(window: AXWindowRef): number {
  try {
    return AXUIElementSetAttributeValue(window.element, kAXMinimizedAttr, kCFBooleanFalse)
  } catch { return -1 }
}

let retainedAppElement: unknown = null
let retainedWindowsArray: unknown = null

export function dispose(): void {
  if (retainedWindowsArray) {
    try { CFRelease(retainedWindowsArray) } catch {}
    retainedWindowsArray = null
  }
  if (retainedAppElement) {
    try { CFRelease(retainedAppElement) } catch {}
    retainedAppElement = null
  }
  cachedTrusted = null
}

export { TITLE_BAR_HEIGHT_PT, OFFSCREEN_X, PANEL_WIDTH, kAXErrorAPIDisabled, kAXErrorCannotComplete, kAXErrorInvalidUIElement, kAXErrorNotImplemented }