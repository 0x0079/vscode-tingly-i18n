type Token = string

export interface Disposable { dispose(): void }

export class Container implements Disposable {
  private readonly bindings = new Map<Token, unknown>()

  register<T>(token: Token, value: T): void {
    if (this.bindings.has(token)) {
      throw new Error(`Container: token already registered: ${token}`)
    }
    this.bindings.set(token, value)
  }

  resolve<T>(token: Token): T {
    if (!this.bindings.has(token)) {
      throw new Error(`Container: unknown token: ${token}`)
    }
    return this.bindings.get(token) as T
  }

  has(token: Token): boolean {
    return this.bindings.has(token)
  }

  dispose(): void {
    for (const value of this.bindings.values()) {
      if (value && typeof value === 'object' && 'dispose' in value) {
        try { (value as Disposable).dispose() } catch { /* ignore */ }
      }
    }
    this.bindings.clear()
  }
}
