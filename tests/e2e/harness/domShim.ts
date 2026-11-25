/**
 * tests/e2e/harness/domShim.ts
 *
 * Lightweight, high-fidelity headless DOM environment for Barmo Lounge E2E tests.
 * Provides window, document, HTMLElement, HTMLCanvasElement, Event classes,
 * matchMedia responsive query evaluator, and pointer/touch event dispatching.
 */

// Active media query listeners registry for reactive viewport updates
type MediaQueryListener = (e: { matches: boolean; media: string }) => void;

interface RegisteredMQL {
  query: string;
  mql: MediaQueryListShim;
}

const registeredQueries = new Set<RegisteredMQL>();

export class MediaQueryListShim {
  public media: string;
  public onchange: ((e: any) => void) | null = null;
  private listeners: Set<MediaQueryListener> = new Set();

  constructor(query: string) {
    this.media = query;
  }

  get matches(): boolean {
    return evaluateMediaQuery(this.media, currentViewport.width, currentViewport.height);
  }

  addEventListener(type: string, listener: any): void {
    if (type === "change" && typeof listener === "function") {
      this.listeners.add(listener);
    }
  }

  removeEventListener(type: string, listener: any): void {
    if (type === "change") {
      this.listeners.delete(listener);
    }
  }

  addListener(listener: any): void {
    this.addEventListener("change", listener);
  }

  removeListener(listener: any): void {
    this.removeEventListener("change", listener);
  }

  dispatchEvent(event: any): boolean {
    if (this.onchange) this.onchange(event);
    for (const listener of Array.from(this.listeners)) {
      try {
        listener(event);
      } catch (err) {
        console.error("MediaQueryList listener error:", err);
      }
    }
    return true;
  }

  _notify(matches: boolean): void {
    const event = { matches, media: this.media, type: "change" };
    this.dispatchEvent(event);
  }
}

/**
 * Robust CSS Media Query Parser and Evaluator
 * Supports (max-width: Xpx), (min-width: Xpx), (max-height: Ypx), (min-height: Ypx),
 * orientation, and logical combinations (and, commas/or).
 */
export function evaluateMediaQuery(query: string, width: number, height: number): boolean {
  if (!query || query === "all") return true;

  // Split OR branches (comma-separated)
  const branches = query.split(",").map((s) => s.trim());
  for (const branch of branches) {
    if (evaluateBranch(branch, width, height)) {
      return true;
    }
  }
  return false;
}

function evaluateBranch(branch: string, width: number, height: number): boolean {
  // Split AND conditions
  const conditions = branch.split(/\s+and\s+/i);
  for (let cond of conditions) {
    cond = cond.trim();
    if (cond.startsWith("only ") || cond.startsWith("screen")) {
      cond = cond.replace(/^(only\s+screen|screen|only)\s*/i, "").trim();
      if (!cond) continue;
    }

    const maxW = cond.match(/\(\s*max-width\s*:\s*(\d+)(px)?\s*\)/i);
    if (maxW) {
      if (width > parseFloat(maxW[1])) return false;
      continue;
    }

    const minW = cond.match(/\(\s*min-width\s*:\s*(\d+)(px)?\s*\)/i);
    if (minW) {
      if (width < parseFloat(minW[1])) return false;
      continue;
    }

    const maxH = cond.match(/\(\s*max-height\s*:\s*(\d+)(px)?\s*\)/i);
    if (maxH) {
      if (height > parseFloat(maxH[1])) return false;
      continue;
    }

    const minH = cond.match(/\(\s*min-height\s*:\s*(\d+)(px)?\s*\)/i);
    if (minH) {
      if (height < parseFloat(minH[1])) return false;
      continue;
    }

    const orientation = cond.match(/\(\s*orientation\s*:\s*(portrait|landscape)\s*\)/i);
    if (orientation) {
      const isPortrait = height >= width;
      if (orientation[1].toLowerCase() === "portrait" && !isPortrait) return false;
      if (orientation[1].toLowerCase() === "landscape" && isPortrait) return false;
      continue;
    }
  }
  return true;
}

// Global Viewport State
let currentViewport = { width: 1280, height: 800 };

export function setViewport(width: number, height: number): void {
  const oldWidth = currentViewport.width;
  const oldHeight = currentViewport.height;
  currentViewport = { width, height };

  if (typeof globalThis.window !== "undefined") {
    (globalThis.window as any).innerWidth = width;
    (globalThis.window as any).innerHeight = height;
  }

  // Check all registered media queries and notify on state change
  for (const item of Array.from(registeredQueries)) {
    const wasMatching = evaluateMediaQuery(item.query, oldWidth, oldHeight);
    const nowMatching = evaluateMediaQuery(item.query, width, height);
    if (wasMatching !== nowMatching) {
      item.mql._notify(nowMatching);
    }
  }

  if (typeof globalThis.window !== "undefined" && typeof (globalThis.window as any).dispatchEvent === "function") {
    (globalThis.window as any).dispatchEvent(new EventShim("resize"));
  }
}

export function getViewport(): { width: number; height: number } {
  return { ...currentViewport };
}

// ---------------- DOM Classes ----------------

export class EventShim {
  public type: string;
  public bubbles: boolean;
  public cancelable: boolean;
  public defaultPrevented = false;
  public propagationStopped = false;
  public target: any = null;
  public currentTarget: any = null;
  public timeStamp: number;

  constructor(type: string, eventInitDict?: { bubbles?: boolean; cancelable?: boolean }) {
    this.type = type;
    this.bubbles = !!eventInitDict?.bubbles;
    this.cancelable = !!eventInitDict?.cancelable;
    this.timeStamp = Date.now();
  }

  preventDefault(): void {
    if (this.cancelable) this.defaultPrevented = true;
  }

  stopPropagation(): void {
    this.propagationStopped = true;
  }

  stopImmediatePropagation(): void {
    this.propagationStopped = true;
  }
}

export class CustomEventShim extends EventShim {
  public detail: any;
  constructor(type: string, init?: { detail?: any; bubbles?: boolean; cancelable?: boolean }) {
    super(type, init);
    this.detail = init?.detail ?? null;
  }
}

export class UIEventShim extends EventShim {
  public view: any;
  public detail: number;
  constructor(type: string, init?: any) {
    super(type, init);
    this.view = init?.view ?? (typeof globalThis.window !== "undefined" ? globalThis.window : null);
    this.detail = init?.detail ?? 0;
  }
}

export class MouseEventShim extends UIEventShim {
  public screenX: number;
  public screenY: number;
  public clientX: number;
  public clientY: number;
  public movementX: number;
  public movementY: number;
  public ctrlKey: boolean;
  public shiftKey: boolean;
  public altKey: boolean;
  public metaKey: boolean;
  public button: number;
  public buttons: number;

  constructor(type: string, init?: any) {
    super(type, init);
    this.screenX = init?.screenX ?? 0;
    this.screenY = init?.screenY ?? 0;
    this.clientX = init?.clientX ?? 0;
    this.clientY = init?.clientY ?? 0;
    this.movementX = init?.movementX ?? 0;
    this.movementY = init?.movementY ?? 0;
    this.ctrlKey = !!init?.ctrlKey;
    this.shiftKey = !!init?.shiftKey;
    this.altKey = !!init?.altKey;
    this.metaKey = !!init?.metaKey;
    this.button = init?.button ?? 0;
    this.buttons = init?.buttons ?? 0;
  }
}

export class PointerEventShim extends MouseEventShim {
  public pointerId: number;
  public width: number;
  public height: number;
  public pressure: number;
  public tangentialPressure: number;
  public tiltX: number;
  public tiltY: number;
  public twist: number;
  public pointerType: string;
  public isPrimary: boolean;

  constructor(type: string, init?: any) {
    super(type, init);
    this.pointerId = init?.pointerId ?? 1;
    this.width = init?.width ?? 1;
    this.height = init?.height ?? 1;
    this.pressure = init?.pressure ?? (init?.buttons ? 0.5 : 0);
    this.tangentialPressure = init?.tangentialPressure ?? 0;
    this.tiltX = init?.tiltX ?? 0;
    this.tiltY = init?.tiltY ?? 0;
    this.twist = init?.twist ?? 0;
    this.pointerType = init?.pointerType ?? "mouse";
    this.isPrimary = init?.isPrimary ?? true;
  }
}

export class TouchShim {
  public identifier: number;
  public target: any;
  public clientX: number;
  public clientY: number;
  public pageX: number;
  public pageY: number;
  public screenX: number;
  public screenY: number;

  constructor(init: any) {
    this.identifier = init.identifier ?? 0;
    this.target = init.target ?? null;
    this.clientX = init.clientX ?? 0;
    this.clientY = init.clientY ?? 0;
    this.pageX = init.pageX ?? this.clientX;
    this.pageY = init.pageY ?? this.clientY;
    this.screenX = init.screenX ?? this.clientX;
    this.screenY = init.screenY ?? this.clientY;
  }
}

export class TouchEventShim extends UIEventShim {
  public touches: TouchShim[];
  public targetTouches: TouchShim[];
  public changedTouches: TouchShim[];
  public altKey: boolean;
  public metaKey: boolean;
  public ctrlKey: boolean;
  public shiftKey: boolean;

  constructor(type: string, init?: any) {
    super(type, init);
    this.touches = init?.touches ?? [];
    this.targetTouches = init?.targetTouches ?? [];
    this.changedTouches = init?.changedTouches ?? [];
    this.altKey = !!init?.altKey;
    this.metaKey = !!init?.metaKey;
    this.ctrlKey = !!init?.ctrlKey;
    this.shiftKey = !!init?.shiftKey;
  }
}

export class KeyboardEventShim extends UIEventShim {
  public key: string;
  public code: string;
  public repeat: boolean;
  public ctrlKey: boolean;
  public shiftKey: boolean;
  public altKey: boolean;
  public metaKey: boolean;

  constructor(type: string, init?: any) {
    super(type, init);
    this.key = init?.key ?? "";
    this.code = init?.code ?? "";
    this.repeat = !!init?.repeat;
    this.ctrlKey = !!init?.ctrlKey;
    this.shiftKey = !!init?.shiftKey;
    this.altKey = !!init?.altKey;
    this.metaKey = !!init?.metaKey;
  }
}

// ClassList Implementation
export class DOMTokenListShim {
  private tokens = new Set<string>();

  constructor(initial = "") {
    if (initial) {
      initial.trim().split(/\s+/).forEach((t) => t && this.tokens.add(t));
    }
  }

  add(...tokens: string[]): void {
    for (const t of tokens) if (t) this.tokens.add(t);
  }

  remove(...tokens: string[]): void {
    for (const t of tokens) this.tokens.delete(t);
  }

  contains(token: string): boolean {
    return this.tokens.has(token);
  }

  toggle(token: string, force?: boolean): boolean {
    if (force !== undefined) {
      if (force) this.tokens.add(token);
      else this.tokens.delete(token);
      return force;
    }
    if (this.tokens.has(token)) {
      this.tokens.delete(token);
      return false;
    } else {
      this.tokens.add(token);
      return true;
    }
  }

  toString(): string {
    return Array.from(this.tokens).join(" ");
  }

  get value(): string {
    return this.toString();
  }

  set value(val: string) {
    this.tokens.clear();
    val.trim().split(/\s+/).forEach((t) => t && this.tokens.add(t));
  }
}

// Base Element Implementation
export class HTMLElementShim {
  public tagName: string;
  public style: Record<string, any>;
  public classList: DOMTokenListShim;
  public dataset: Record<string, string> = {};
  public children: HTMLElementShim[] = [];
  public parentElement: HTMLElementShim | null = null;
  public attributes: Record<string, string> = {};
  public innerHTML = "";
  public textContent = "";
  public clientWidth = 0;
  public clientHeight = 0;
  public offsetWidth = 0;
  public offsetHeight = 0;

  protected eventListeners: Map<string, Set<Function>> = new Map();

  constructor(tagName = "DIV") {
    this.tagName = tagName.toUpperCase();
    this.classList = new DOMTokenListShim();
    this.style = new Proxy({} as Record<string, any>, {
      get(target, prop: string) {
        return target[prop] ?? "";
      },
      set(target, prop: string, value: any) {
        target[prop] = String(value);
        return true;
      },
    });
  }

  get id(): string {
    return this.attributes["id"] ?? "";
  }

  set id(val: string) {
    this.attributes["id"] = val;
  }

  get className(): string {
    return this.classList.toString();
  }

  set className(val: string) {
    this.classList.value = val;
  }

  get ownerDocument(): any {
    return typeof globalThis.document !== "undefined" ? globalThis.document : null;
  }

  addEventListener(type: string, listener: Function, options?: any): void {
    if (!this.eventListeners.has(type)) {
      this.eventListeners.set(type, new Set());
    }
    this.eventListeners.get(type)!.add(listener);
  }

  removeEventListener(type: string, listener: Function, options?: any): void {
    this.eventListeners.get(type)?.delete(listener);
  }

  dispatchEvent(event: EventShim): boolean {
    event.target = this;
    event.currentTarget = this;
    const listeners = this.eventListeners.get(event.type);
    if (listeners) {
      for (const listener of Array.from(listeners)) {
        try {
          listener.call(this, event);
        } catch (err) {
          console.error(`Error in event listener for ${event.type}:`, err);
        }
        if (event.propagationStopped) break;
      }
    }
    // Bubble to parent if bubbles is true
    if (this.parentElement && event.bubbles && !event.propagationStopped) {
      this.parentElement.dispatchEvent(event);
    }
    return !event.defaultPrevented;
  }

  appendChild<T extends HTMLElementShim>(child: T): T {
    child.parentElement = this;
    this.children.push(child);
    return child;
  }

  removeChild<T extends HTMLElementShim>(child: T): T {
    const idx = this.children.indexOf(child);
    if (idx !== -1) {
      this.children.splice(idx, 1);
      child.parentElement = null;
    }
    return child;
  }

  setAttribute(name: string, value: string): void {
    this.attributes[name] = String(value);
    if (name === "id") this.id = value;
    if (name === "class") {
      this.className = value;
      this.classList.value = value;
    }
  }

  getAttribute(name: string): string | null {
    if (name === "class") return this.classList.toString() || this.className || null;
    return this.attributes[name] ?? null;
  }

  hasAttribute(name: string): boolean {
    return name in this.attributes;
  }

  removeAttribute(name: string): void {
    delete this.attributes[name];
  }

  getBoundingClientRect() {
    const width = this.offsetWidth || this.clientWidth || 100;
    const height = this.offsetHeight || this.clientHeight || 100;
    return {
      top: 0,
      left: 0,
      right: width,
      bottom: height,
      width,
      height,
      x: 0,
      y: 0,
      toJSON() {
        return this;
      },
    };
  }

  querySelector(selector: string): HTMLElementShim | null {
    if (!selector) return null;
    // Simple tag, class, or id matching
    for (const child of this.children) {
      if (matchesSelector(child, selector)) return child;
      const found = child.querySelector(selector);
      if (found) return found;
    }
    return null;
  }

  querySelectorAll(selector: string): HTMLElementShim[] {
    const results: HTMLElementShim[] = [];
    for (const child of this.children) {
      if (matchesSelector(child, selector)) results.push(child);
      results.push(...child.querySelectorAll(selector));
    }
    return results;
  }

  closest(selector: string): HTMLElementShim | null {
    let current: HTMLElementShim | null = this;
    while (current) {
      if (matchesSelector(current, selector)) return current;
      current = current.parentElement;
    }
    return null;
  }
}

function matchesSelector(el: HTMLElementShim, sel: string): boolean {
  if (sel.startsWith(".")) {
    const cls = sel.slice(1);
    return el.classList.contains(cls);
  }
  if (sel.startsWith("#")) {
    const id = sel.slice(1);
    return el.id === id || el.getAttribute("id") === id;
  }
  return el.tagName.toLowerCase() === sel.toLowerCase();
}

// Canvas Element Implementation
export class HTMLCanvasElementShim extends HTMLElementShim {
  public width = 800;
  public height = 600;
  private _contextMap = new Map<string, any>();
  private capturedPointerId: number | null = null;

  constructor() {
    super("CANVAS");
    this.clientWidth = 800;
    this.clientHeight = 600;
    this.offsetWidth = 800;
    this.offsetHeight = 600;
  }

  getContext(contextId: string, options?: any): any {
    if (this._contextMap.has(contextId)) {
      return this._contextMap.get(contextId);
    }
    // Check if webgl mock factory exists
    if (typeof (HTMLCanvasElementShim as any)._contextFactory === "function") {
      const ctx = (HTMLCanvasElementShim as any)._contextFactory(this, contextId, options);
      if (ctx) {
        this._contextMap.set(contextId, ctx);
        return ctx;
      }
    }
    return null;
  }

  setPointerCapture(pointerId: number): void {
    this.capturedPointerId = pointerId;
  }

  releasePointerCapture(pointerId: number): void {
    if (this.capturedPointerId === pointerId) {
      this.capturedPointerId = null;
    }
  }

  hasPointerCapture(pointerId: number): boolean {
    return this.capturedPointerId === pointerId;
  }

  requestPointerLock(): void {
    if (typeof globalThis.document !== "undefined") {
      (globalThis.document as any).pointerLockElement = this;
      (globalThis.document as any).dispatchEvent(new EventShim("pointerlockchange"));
    }
  }
}

// Document Implementation
export class DocumentShim extends HTMLElementShim {
  public body: HTMLElementShim;
  public head: HTMLElementShim;
  public documentElement: HTMLElementShim;
  public pointerLockElement: HTMLElementShim | null = null;

  constructor() {
    super("#DOCUMENT");
    this.documentElement = new HTMLElementShim("HTML");
    this.head = new HTMLElementShim("HEAD");
    this.body = new HTMLElementShim("BODY");
    this.documentElement.appendChild(this.head);
    this.documentElement.appendChild(this.body);
    this.appendChild(this.documentElement);
  }

  createElement(tagName: string): HTMLElementShim {
    const upper = tagName.toUpperCase();
    if (upper === "CANVAS") {
      return new HTMLCanvasElementShim();
    }
    return new HTMLElementShim(upper);
  }

  getElementById(id: string): HTMLElementShim | null {
    return this.querySelector(`#${id}`);
  }

  exitPointerLock(): void {
    if (this.pointerLockElement) {
      this.pointerLockElement = null;
      this.dispatchEvent(new EventShim("pointerlockchange"));
    }
  }
}

// Window Implementation
export class WindowShim {
  public innerWidth = 1280;
  public innerHeight = 800;
  public document: DocumentShim;
  public navigator: any;
  public location: any;
  private eventListeners: Map<string, Set<Function>> = new Map();
  private rafId = 0;
  private rafCallbacks: Map<number, (time: number) => void> = new Map();

  constructor(doc: DocumentShim) {
    this.document = doc;
    this.innerWidth = currentViewport.width;
    this.innerHeight = currentViewport.height;
    this.navigator = {
      userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) BarmoHeadless/2.4",
      vibrate: (pattern: any) => true,
      maxTouchPoints: 5,
    };
    this.location = {
      href: "http://localhost:3000",
      pathname: "/",
      search: "",
      hash: "",
    };
  }

  matchMedia(query: string): MediaQueryListShim {
    const mql = new MediaQueryListShim(query);
    registeredQueries.add({ query, mql });
    return mql;
  }

  addEventListener(type: string, listener: Function): void {
    if (!this.eventListeners.has(type)) {
      this.eventListeners.set(type, new Set());
    }
    this.eventListeners.get(type)!.add(listener);
  }

  removeEventListener(type: string, listener: Function): void {
    this.eventListeners.get(type)?.delete(listener);
  }

  dispatchEvent(event: EventShim): boolean {
    const listeners = this.eventListeners.get(event.type);
    if (listeners) {
      for (const listener of Array.from(listeners)) {
        try {
          listener.call(this, event);
        } catch (err) {
          console.error(`Error in window listener for ${event.type}:`, err);
        }
      }
    }
    return !event.defaultPrevented;
  }

  requestAnimationFrame(cb: (time: number) => void): number {
    const id = ++this.rafId;
    this.rafCallbacks.set(id, cb);
    // Execute on next tick asynchronously
    setTimeout(() => {
      if (this.rafCallbacks.has(id)) {
        this.rafCallbacks.delete(id);
        cb(Date.now());
      }
    }, 16);
    return id;
  }

  cancelAnimationFrame(id: number): void {
    this.rafCallbacks.delete(id);
  }
}

// Backup storage for environment restoration
const originalGlobals: Record<string, any> = {};
let isShimInstalled = false;

export function installDOMShim(options?: { width?: number; height?: number }): void {
  const width = options?.width ?? 1280;
  const height = options?.height ?? 800;
  setViewport(width, height);

  if (!isShimInstalled) {
    // Preserve existing globals if present
    const keys = [
      "window",
      "self",
      "document",
      "HTMLElement",
      "HTMLCanvasElement",
      "Event",
      "CustomEvent",
      "UIEvent",
      "MouseEvent",
      "PointerEvent",
      "TouchEvent",
      "KeyboardEvent",
      "matchMedia",
      "requestAnimationFrame",
      "cancelAnimationFrame",
      "navigator",
    ];
    for (const k of keys) {
      originalGlobals[k] = (globalThis as any)[k];
    }
    isShimInstalled = true;
  }

  const doc = new DocumentShim();
  const win = new WindowShim(doc);
  (win as any).self = win;

  (globalThis as any).window = win;
  (globalThis as any).self = win;
  (globalThis as any).document = doc;
  (globalThis as any).HTMLElement = HTMLElementShim;
  (globalThis as any).HTMLCanvasElement = HTMLCanvasElementShim;
  (globalThis as any).Event = EventShim;
  (globalThis as any).CustomEvent = CustomEventShim;
  (globalThis as any).UIEvent = UIEventShim;
  (globalThis as any).MouseEvent = MouseEventShim;
  (globalThis as any).PointerEvent = PointerEventShim;
  (globalThis as any).TouchEvent = TouchEventShim;
  (globalThis as any).KeyboardEvent = KeyboardEventShim;
  (globalThis as any).matchMedia = (q: string) => win.matchMedia(q);
  (globalThis as any).requestAnimationFrame = (cb: any) => win.requestAnimationFrame(cb);
  (globalThis as any).cancelAnimationFrame = (id: any) => win.cancelAnimationFrame(id);
  (globalThis as any).navigator = win.navigator;
}

export function cleanupDOMShim(): void {
  if (!isShimInstalled) return;

  for (const [k, v] of Object.entries(originalGlobals)) {
    if (v === undefined) {
      delete (globalThis as any)[k];
    } else {
      (globalThis as any)[k] = v;
    }
  }
  registeredQueries.clear();
  isShimInstalled = false;
}
