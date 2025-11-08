import process from 'node:process'
import { JSONRPCMessageSchema } from '@modelcontextprotocol/sdk/types.js'

const HEADER_END = '\r\n\r\n'
const HEADER_RE = /Content-Length:\s*(\d+)/i
const DEFAULT_BUFFER = Buffer.alloc(0)

function encodeContentLength(message) {
  const json = JSON.stringify(message)
  const header = `Content-Length: ${Buffer.byteLength(json, 'utf8')}${HEADER_END}`
  return header + json
}

function encodeNdjson(message) {
  return `${JSON.stringify(message)}\n`
}

function parseJson(text) {
  return JSONRPCMessageSchema.parse(JSON.parse(text))
}

export class HybridStdioServerTransport {
  constructor(stdin = process.stdin, stdout = process.stdout) {
    this._stdin = stdin
    this._stdout = stdout
    this._buffer = DEFAULT_BUFFER
    this._started = false
    this._mode = null // 'content-length' | 'ndjson'

    this._onData = chunk => {
      this._buffer = this._buffer.length ? Buffer.concat([this._buffer, chunk]) : Buffer.from(chunk)
      this._processBuffer()
    }

    this._onError = error => {
      this.onerror?.(error)
    }
  }

  get framingMode() {
    return this._mode
  }

  async start() {
    if (this._started) {
      throw new Error('HybridStdioServerTransport already started')
    }
    this._started = true
    this._stdin.on('data', this._onData)
    this._stdin.on('error', this._onError)
  }

  async close() {
    if (!this._started) return
    this._stdin.off('data', this._onData)
    this._stdin.off('error', this._onError)
    this._buffer = DEFAULT_BUFFER
    this._started = false
    this.onclose?.()
  }

  send(message) {
    return new Promise(resolve => {
      const payload = this._mode === 'ndjson' ? encodeNdjson(message) : encodeContentLength(message)
      if (this._stdout.write(payload)) {
        resolve()
      } else {
        this._stdout.once('drain', resolve)
      }
    })
  }

  _processBuffer() {
    while (true) {
      const message = this._readMessage()
      if (message === null) {
        break
      }
      this.onmessage?.(message)
    }
  }

  _readMessage() {
    if (!this._buffer || this._buffer.length === 0) {
      return null
    }

    if (this._mode === 'content-length') {
      return this._readContentLengthMessage()
    }
    if (this._mode === 'ndjson') {
      return this._readNdjsonMessage()
    }

    const prefix = this._peekPrefix()
    if (!prefix.length) {
      return null
    }

    if ('content-length:'.startsWith(prefix.toLowerCase())) {
      return null // Wait for full header keyword before deciding
    }

    if (prefix.toLowerCase().startsWith('content-length:')) {
      this._mode = 'content-length'
      return this._readContentLengthMessage()
    }

    const newlineIndex = this._buffer.indexOf(0x0a) // '\n'
    if (newlineIndex === -1) {
      return null
    }

    this._mode = 'ndjson'
    return this._readNdjsonMessage()
  }

  _peekPrefix() {
    const length = Math.min(this._buffer.length, 32)
    return this._buffer.toString('utf8', 0, length).trimStart()
  }

  _readContentLengthMessage() {
    const headerEndIndex = this._buffer.indexOf(HEADER_END)
    if (headerEndIndex === -1) {
      return null
    }

    const header = this._buffer.toString('utf8', 0, headerEndIndex)
    const match = header.match(HEADER_RE)
    if (!match) {
      this._buffer = this._buffer.subarray(headerEndIndex + HEADER_END.length)
      this.onerror?.(new Error('Invalid Content-Length header'))
      return null
    }

    const length = Number(match[1])
    const totalMessageLength = headerEndIndex + HEADER_END.length + length
    if (this._buffer.length < totalMessageLength) {
      return null
    }

    const json = this._buffer.toString(
      'utf8',
      headerEndIndex + HEADER_END.length,
      totalMessageLength
    )
    this._buffer = this._buffer.subarray(totalMessageLength)

    try {
      return parseJson(json)
    } catch (error) {
      this.onerror?.(error)
      return null
    }
  }

  _readNdjsonMessage() {
    while (true) {
      const newlineIndex = this._buffer.indexOf(0x0a)
      if (newlineIndex === -1) {
        return null
      }

      let line = this._buffer.toString('utf8', 0, newlineIndex)
      this._buffer = this._buffer.subarray(newlineIndex + 1)
      line = line.trim()
      if (!line) {
        continue
      }

      try {
        return parseJson(line)
      } catch (error) {
        this.onerror?.(error)
      }
    }
  }
}
