// Re-export the contract analysis types so consumers depend on @tingly/core
// rather than @tingly/framework-contract directly when they're working at the
// core layer.
export type {
  KeyReference,
  DetectionResult,
  ScopeRange,
  OffsetRange,
  TextDocumentLike,
  SourceKind
} from '@tingly/framework-contract'
