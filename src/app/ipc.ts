/**
 * Escape a string so it can be used within a double-quoted string.
 */
export function escapeString (str: string) {
	return JSON.stringify(str).slice(1, -1)
}

/**
 * Runs a script directly. script must already be sanitized!
 */
export function runScript<T = void>(webView: any, script: string): Promise<T> {
	return new Promise<T>((res, rej) => {
		try {
			webView.run_javascript(script, null, (t: T) => {
				res(t)
			})
		} catch (err) {
			rej(err)
		}
	})
}

export type MessageCallback<T> = (data: T) => void

/** Max size of send data */
export const CHUNK_SIZE = 800
/** Message unique ID (incremented every send) */
let msgUid = 0

export function IPC (webView: any) {
	const messageCallbacks = new Map<string, Set<MessageCallback<any>>>()

	function on<T>(id: string, cb: MessageCallback<T>) {
		let set = messageCallbacks.get(id)
		if (set == null) {
			set = new Set()
			set.add(cb)
			messageCallbacks.set(id, set)
			// This is a new id, so setup the Webkit script message handler for it...
			const contentManager = webView.get_user_content_manager()
			contentManager.connect(`script-message-received::${id}`, (self: any, message: any) => {
				const json = message.get_js_value().to_string()
				const data = json ? JSON.parse(json) : undefined
				for (const cb of set!.values()) {
					cb(data)
				}
			})
			contentManager.register_script_message_handler(id)
			print('Setup dropfile handler')
		} else {
			set.add(cb)
		}
		return set.size
	}

	function off<T>(id: string, cb: MessageCallback<T>) {
		const set = messageCallbacks.get(id)
		if (set == null) {
			return 0
		}
		set.delete(cb)
		if (set.size > 0) {
			return set.size
		}
		// Was the last listener for this id. Remove the script message handler...
		const contentManager = webView.get_user_content_manager()
		contentManager.unregister_script_message_handler(id)
		// TODO: Probably need a ref to the signal handler... :|
		contentManager.disconnect(`script-message-received::${id}`)
		messageCallbacks.delete(id)
		return 0
	}

	/**
	 * Send a message to client-side IPC message handler
	 */
	async function send (id: string, data?: any) {
		if (data === undefined) {
			// No data, just a message id
			return runScript(webView, `handleIPCMessage("${escapeString(id)}")`)
		}
		const json = JSON.stringify(data)
		if (json.length < CHUNK_SIZE) {
			// Data fits in a single message
			return runScript(webView, `handleIPCMessage("${escapeString(id)}","${escapeString(json)}")`)
		}
		// Data is too long for a single message - send in chunks
		msgUid += 1
		await runScript(webView, `handleIPCMessageBegin("${msgUid}","${id}")`)
		for (let p = 0; p < json.length; p += CHUNK_SIZE) {
			const chunk = json.substr(p, CHUNK_SIZE)
			await runScript(webView, `handleIPCMessageChunk("${msgUid}","${escapeString(chunk)}")`)
		}
		return runScript(webView, `handleIPCMessageEnd("${msgUid}")`)
	}

	return {send, on, off}
}

export interface IPC extends ReturnType<typeof IPC> {}
