/**
 * Social channel
 * Typed JSON messages over a text transport (the multiplayer data channel), split into chunks
 * so a big payload such as a whole park snapshot never exceeds a data-channel message limit.
 * Pure: the transport is injected, so it is tested without any WebRTC.
 */

export interface SocialMessage {
  type: string
  [key: string]: unknown
}

type Handler = (message: SocialMessage) => void

/** Characters per chunk: well under the 16 KB every browser's data channel accepts. */
export const CHUNK_CHARS = 12_000
/** A message may be at most this many characters in total; bigger ones are dropped unread. */
export const MAX_MESSAGE_CHARS = 4_000_000
/** Half-received messages kept at once; the oldest is forgotten past this. */
const MAX_PARTIAL = 8

interface Envelope {
  /** Message id, unique per sender. */
  m: number
  /** Chunk index and count. */
  i: number
  n: number
  /** The slice of the JSON text. */
  d: string
}

export class SocialChannel {
  private readonly sendText: (text: string) => void
  private handlers = new Map<string, Set<Handler>>()
  private partial = new Map<number, { parts: string[]; got: number; chars: number }>()
  private nextId = 1

  constructor(sendText: (text: string) => void) {
    this.sendText = sendText
  }

  public send(message: SocialMessage): void {
    const text = JSON.stringify(message)
    if (text.length > MAX_MESSAGE_CHARS) throw new Error('Social message too large')
    const n = Math.max(1, Math.ceil(text.length / CHUNK_CHARS))
    const m = this.nextId++
    for (let i = 0; i < n; i++) {
      const env: Envelope = { m, i, n, d: text.slice(i * CHUNK_CHARS, (i + 1) * CHUNK_CHARS) }
      this.sendText(JSON.stringify(env))
    }
  }

  public on(type: string, handler: Handler): () => void {
    const set = this.handlers.get(type) ?? new Set()
    set.add(handler)
    this.handlers.set(type, set)
    return () => {
      set.delete(handler)
    }
  }

  /** Feed one received text frame. Bad frames are ignored, never thrown. */
  public receive(text: string): void {
    let env: Partial<Envelope>
    try {
      env = JSON.parse(text)
    } catch {
      return
    }
    if (
      typeof env.m !== 'number' ||
      typeof env.i !== 'number' ||
      typeof env.n !== 'number' ||
      typeof env.d !== 'string' ||
      !Number.isInteger(env.i) ||
      !Number.isInteger(env.n) ||
      env.n < 1 ||
      env.i < 0 ||
      env.i >= env.n ||
      env.n * CHUNK_CHARS > MAX_MESSAGE_CHARS + CHUNK_CHARS
    ) {
      return
    }

    let entry = this.partial.get(env.m)
    if (!entry) {
      if (this.partial.size >= MAX_PARTIAL) {
        const oldest = this.partial.keys().next().value
        if (oldest !== undefined) this.partial.delete(oldest)
      }
      entry = { parts: new Array<string>(env.n).fill(''), got: 0, chars: 0 }
      this.partial.set(env.m, entry)
    }
    if (entry.parts.length !== env.n) return // inconsistent chunk count: ignore
    if (entry.parts[env.i] === '') {
      entry.parts[env.i] = env.d
      entry.got++
      entry.chars += env.d.length
    }
    if (entry.chars > MAX_MESSAGE_CHARS) {
      this.partial.delete(env.m)
      return
    }
    if (entry.got < env.n) return

    this.partial.delete(env.m)
    let message: SocialMessage
    try {
      message = JSON.parse(entry.parts.join(''))
    } catch {
      return
    }
    if (typeof message?.type !== 'string') return
    for (const handler of this.handlers.get(message.type) ?? []) handler(message)
  }

  /** Forget half-received messages (on disconnect). */
  public reset(): void {
    this.partial.clear()
  }
}
