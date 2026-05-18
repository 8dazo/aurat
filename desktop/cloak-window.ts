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

const kAXPositionAttr = koffi.decode(appServices.symbol('kAXPositionAttribute', CFStringRef), CFStringRef)
const kAXSizeAttr = koffi.decode(appServices.symbol('kAXSizeAttribute', CFStringRef), CFStringRef)
const kAXWindowsAttr = koffi.decode(appServices.symbol('kAXWindowsAttribute', CFStringRef), CFStringRef)
const kAXRoleAttr = koffi.decode(appServices.symbol('kAXRoleAttribute', CFStringRef), CFStringRef)
const kAXTitleAttr = koffi.decode(appServices.symbol('kAXTitleAttribute', CFStringRef), CFStringRef)
const kAXMinimizedAttr = koffi.decode(appServices.symbol('kAXMinimizedAttribute', CFStringRef), CFStringRef)
const kAXRaiseActionStr = koffi.decode(appServices.symbol('kAXRaiseAction', CFStringRef), CFStringRef)
const kAXTrustedCheckOptionPromptStr = koffi.decode(coreFoundation.symbol('kAXTrustedCheckOptionPrompt', CFStringRef), CFStringRef)
const kCFBooleanTrue = koffi.decode(coreFoundation.symbol('kCFBooleanTrue', CFBooleanRef), CFBooleanRef)

export interface AXWindowRef {
  element: unknown
  pid: number
  windowIndex: number
}

export { TITLE_BAR_HEIGHT_PT, OFFSCREEN_X, PANEL_WIDTH, kAXErrorAPIDisabled, kAXErrorCannotComplete, kAXErrorInvalidUIElement }