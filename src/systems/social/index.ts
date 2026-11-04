/**
 * Social
 * Barrel export for the chunked social channel and card trading
 */

export { CodexShare, MAX_SHARED_PER_MESSAGE } from './CodexShare'
export { CHUNK_CHARS, MAX_MESSAGE_CHARS, SocialChannel, type SocialMessage } from './channel'
export {
  type JointBeginArgs,
  type JointBeginResult,
  JointBreeding,
  type JointEvent,
  type JointProposal,
  MAX_INCOMING_JOINT,
} from './JointBreeding'
export {
  MAX_INCOMING,
  type Offer,
  type OfferResult,
  type TradeEvent,
  TradeManager,
  type TradeOptions,
} from './TradeManager'
export { type ParkSnapshotData, type VisitHandlers, VisitShare } from './VisitShare'
