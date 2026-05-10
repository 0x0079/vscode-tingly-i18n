export type Listener<T> = (payload: T) => void

export class EventBus {
  private readonly listeners = new Map<string, Set<Listener<unknown>>>()

  on<T>(event: string, listener: Listener<T>): { dispose(): void } {
    let set = this.listeners.get(event)
    if (!set) {
      set = new Set()
      this.listeners.set(event, set)
    }
    set.add(listener as Listener<unknown>)
    return { dispose: () => { set!.delete(listener as Listener<unknown>) } }
  }

  emit<T>(event: string, payload: T): void {
    const set = this.listeners.get(event)
    if (!set) return
    for (const listener of set) {
      try { (listener as Listener<T>)(payload) } catch { /* swallow per-listener */ }
    }
  }

  dispose(): void {
    this.listeners.clear()
  }
}
