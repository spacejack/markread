import * as logger from './logger'

declare global {
	interface Window {
		webkit: any
		handleIPCMessage (id: string, json?: string): void
		handleIPCMessageBegin (uid: string, id: string): void
		handleIPCMessageChunk (uid: string, chunk: string): void
		handleIPCMessageEnd (uid: string): void
	}
}

export type MessageCallback<T> = (data: T) => void

const messageCallbacks = new Map<string, Set<MessageCallback<any>>>()

const chunkedMessages = new Map<string, {id: string; chunks: string[]}>()

export function on<T>(id: string, cb: MessageCallback<T>) {
	let set = messageCallbacks.get(id)
	if (set == null) {
		set = new Set()
		messageCallbacks.set(id, set)
	}
	set.add(cb)
	return set.size
}

export function off<T>(id: string, cb: MessageCallback<T>) {
	const set = messageCallbacks.get(id)
	if (set == null) {
		return 0
	}
	set.delete(cb)
	if (set.size > 0) {
		return set.size
	}
	messageCallbacks.delete(id)
	return 0
}

export function send (id: string, data?: any) {
	if (!window.webkit) {
		console.warn('Not a webkit webview')
		return
	}
	if (!window.webkit.messageHandlers[id]) {
		throw new Error(`No webkit.messageHandlers for '${id}'`)
	}
	if (data != null) {
		window.webkit.messageHandlers[id].postMessage(JSON.stringify(data))
	} else {
		window.webkit.messageHandlers[id].postMessage()
	}
}

/** A function the GTK app can call */
function handleIPCMessage (id: string, json?: string) {
	const set = messageCallbacks.get(id)
	if (set == null) {
		return
	}
	let data: any
	if (json != null) {
		try {
			data = JSON.parse(json)
		} catch (err) {
			logger.msg('Error parsing json: ' + json)
			return
		}
	}
	for (const cb of set.values()) {
		cb(data)
	}
}

/** Handle start of a chunked message */
function handleIPCMessageBegin (uid: string, id: string) {
	if (chunkedMessages.get(uid)) {
		logger.msg('Already receiving a message for this UID: ' + uid)
		return
	}
	chunkedMessages.set(uid, {id, chunks: []})
}

/** Handle one chunk of a chunked message */
function handleIPCMessageChunk (uid: string, chunk: string) {
	const cm = chunkedMessages.get(uid)
	if (!cm) {
		logger.msg('Unrecognized UID for chunk: ' + uid)
		return
	}
	cm.chunks.push(chunk)
}

/** Handle end of a chunked message */
function handleIPCMessageEnd (uid: string) {
	const cm = chunkedMessages.get(uid)
	if (!cm) {
		logger.msg('Unrecognized UID for chunk: ' + uid)
		return
	}
	chunkedMessages.delete(uid)
	const json = cm.chunks.join('')
	handleIPCMessage(cm.id, json)
}

// Make these globals
window.handleIPCMessage = handleIPCMessage
window.handleIPCMessageBegin = handleIPCMessageBegin
window.handleIPCMessageEnd = handleIPCMessageEnd
window.handleIPCMessageChunk = handleIPCMessageChunk
