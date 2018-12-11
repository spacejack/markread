import * as logger from './logger'

declare global {
	interface Window {
		webkit: any
	}
}

export type MessageCallback<T> = (data: T) => void

const messageCallbacks = new Map<string, Set<MessageCallback<any>>>()

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
	if (set != null) {
		for (const cb of set.values()) {
			let data: any
			if (typeof json === 'string') {
				try {
					data = JSON.parse(json)
				} catch (err) {
					logger.msg('Error parsing json: ' + json)
				}
			}
			cb(data)
		}
	}
}

// Make it a global
(window as any).handleIPCMessage = handleIPCMessage