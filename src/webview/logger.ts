let el: HTMLElement
let pendingMsg: string | undefined

export function init() {
	el = document.createElement('div')
	el.className = 'logger'
	document.body.appendChild(el)
	if (pendingMsg) {
		el.textContent = pendingMsg + '\n'
		pendingMsg = undefined
	} else {
		el.style.display = 'none'
	}
}

export function msg (str: string) {
	if (el) {
		el.style.display = 'inline-block'
		el.textContent = el.textContent + str + '\n'
	} else {
		pendingMsg = str
	}
}

setTimeout(init, 10)
