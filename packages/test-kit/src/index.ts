export { runFrameworkTestKit } from './runner'
export { makeFakeLoader, makeFakeConfig, makeFakeLogger, makeTestHost } from './host'
export { fixtureToDocument } from './fixtures'
export type {
  FrameworkFixture,
  FrameworkTestKit,
  TestCase,
  GoldenKeyReference,
  GoldenDetection,
  GoldenScope
} from './types'
export const TEST_KIT_VERSION = '1.0.0-pre'
