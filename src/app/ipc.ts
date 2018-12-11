/**
 * Escape a string so it can be used within a single-quoted string.
 * TODO: How to ensure safely sanitized?
 */
export function escapeString (str?: string) {
	return str != null
		? str.replace(/\'/g, "\\'").replace(/\n/g, '\\n') : ''
}

export function escapeJSON (json: string) {
	return json.replace(/\\n/g, '\\\\n').replace(/\\t/g, '\\\\t')
}

/**
 * Runs a script directly. script must already be sanitized!
 */
export function runScript<T>(webView: any, script: string): Promise<T> {
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
				const data = message.get_js_value().to_string()
				const json = data ? JSON.parse(data) : undefined
				for (const cb of set!.values()) {
					cb(json)
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
	function send (id: string, data: any) {
		let script = `handleIPCMessage('${escapeString(id)}'`
		if (data !== undefined) {
			script += `,'${escapeJSON(JSON.stringify(data))}'`
		}
		script += ')'
		runScript(webView, script)
	}

	return {send, on, off}
}

export interface IPC extends ReturnType<typeof IPC> {}
