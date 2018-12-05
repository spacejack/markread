import * as logger from './logger'

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
	return set.size
}

export function send (id: string, data?: any) {
	//window.status = JSON.stringify({id, value: data})
	// This is the only way I know to send a message the Webkit2 WebView can listen for
	alert(JSON.stringify({id, data}))
}

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

(window as any).handleIPCMessage = handleIPCMessage
