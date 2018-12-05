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

const messageCallbacks = new Map<string, Set<MessageCallback<any>>>()

export function IPC (webView: any) {
	/* webView.connect('status_bar_text_changed', (arg: any, json: string) => {
		// Get Webkit messages into GTK listening to 'status bar/window.status' signals
		json = json || ''
		json = json.trim()
		if (!json) {
			return
		}
		let message: any
		try {
			message = JSON.parse(json) as {id: string, data: any}
		} catch (err) {
			printerr("failed to parse IPC message json: " + json)
			return
		}
		const set = messageCallbacks.get(message.id)
		if (!set) {
			return
		}
		for (const cb of set.values()) {
			cb(message.data)
		}
	}) */

	webView.connect('script-dialog', (wv: any, dlg: any) => {
		//print('got dialog type: ' + dlg.get_dialog_type())
		const json = dlg.get_message()
		print('got dialog message: ' + json)
		if (!json) {
			return true
		}
		let message: any
		try {
			message = JSON.parse(json) as {id: string, data: any}
		} catch (err) {
			printerr("failed to parse IPC message json: " + json)
			return true
		}
		const set = messageCallbacks.get(message.id)
		if (!set) {
			return true
		}
		print(`sending to '${message.id}' callbacks`)
		for (const cb of set.values()) {
			cb(message.data)
		}
		return true
	})

	function on<T>(id: string, cb: MessageCallback<T>) {
		let set = messageCallbacks.get(id)
		if (set == null) {
			set = new Set()
			messageCallbacks.set(id, set)
		}
		set.add(cb)
		return set.size
	}

	function off<T>(id: string, cb: MessageCallback<T>) {
		const set = messageCallbacks.get(id)
		if (set == null) {
			return 0
		}
		set.delete(cb)
		return set.size
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
