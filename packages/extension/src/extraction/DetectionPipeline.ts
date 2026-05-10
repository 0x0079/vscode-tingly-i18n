import * as vscode from 'vscode'
import type { Framework, FrameworkHost } from '@tingly/framework-contract'

/**
 * Wires framework.detectHardStrings -> diagnostics -> CodeAction. v1 just
 * passes through to the diagnostics provider; the dedicated extraction UX
 * (preview + bulk apply) lands in Phase 3.
 */
export class DetectionPipeline {
  constructor(private readonly framework: Framework, private readonly host: FrameworkHost) {}

  // Reserved for future bulk extraction commands. Kept as a placeholder so
  // CodeAction handlers can call into a single object.
  async runForDocument(_doc: vscode.TextDocument): Promise<void> {
    void this.framework; void this.host
  }
}
