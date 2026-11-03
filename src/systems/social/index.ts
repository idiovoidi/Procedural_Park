/**
 * Social
 * Barrel export for the chunked social channel and card trading
 */

export { CodexShare, MAX_SHARED_PER_MESSAGE } from './CodexShare'
export { CHUNK_CHARS, MAX_MESSAGE_CHARS, SocialChannel, type SocialMessage } from './channel'
export {
  MAX_INCOMING,
  type Offer,
  type OfferResult,
  type TradeEvent,
  TradeManager,
  type TradeOptions,
} from './TradeManager'
