// App entry point
import m from 'mithril'
import MarkdownIt from 'markdown-it'
import * as ipc from './ipc'
import state from './state'
import App from './components/App'

m.mount(document.body, App)

const md = new MarkdownIt({
	html: false,
	linkify: true,
	typographer: true
})

// Configure MarkdownIt to use target=_blank for links
/* const defaultRender = md.renderer.rules.link_open || function(tokens, idx, options, env, self) {
	return self.renderToken(tokens, idx, options)
}

md.renderer.rules.link_open = function (tokens, idx, options, env, self) {
	// If you are sure other plugins can't add `target` - drop check below
	const aIndex = tokens[idx].attrIndex('target')
	if (aIndex < 0) {
		tokens[idx].attrPush(['target', '_blank']) // add new attribute
	} else {
		tokens[idx].attrs[aIndex][1] = '_blank'    // replace value of existing attr
	}

	// pass token to default renderer.
	return defaultRender(tokens, idx, options, env, self)
} */

function readFile (file: File): Promise<string> {
	return new Promise((resolve, reject) => {
		const reader = new FileReader()
		reader.onload = e => {
			resolve((e.target as any).result as string)
		}
		reader.onerror = e => {
			reject(new Error('Failed to read file contents'))
		}
		reader.readAsText(file)
	})
}

/**
 * Recieves markdown source and filename.
 * Generates HTML string, saves in global state and triggers Mithril redraw.
 */
function handleMarkdownContent (src: string, filename: string) {
	state.markdownSource = src
	state.htmlContent = md.render(state.markdownSource)
	document.title = filename
	m.redraw()
}

function onDragOver (e: Event) {
	e.preventDefault()
}

function onDrop (e: DragEvent) {
	console.log('Handling dropped file...')
	e.preventDefault()
	if (!e.dataTransfer || !e.dataTransfer.files || e.dataTransfer.files.length < 1) {
		console.warn('No files dropped')
		return
	}
	const file = e.dataTransfer.files[0]
	readFile(file).then(src => {
		handleMarkdownContent(src, file.name)
		ipc.send('dropfile', {filename: file.name})
	}).catch(err => {
		console.warn(err.message)
	})
	e.dataTransfer.clearData()
}

document.body.addEventListener('dragover', onDragOver)
document.body.addEventListener('drop', onDrop)

// Handle markdown messages from GTK app
ipc.on('markdown', (data: {source: string, filename: string}) => {
	handleMarkdownContent(data.source, data.filename)
})

///////////////////////////////////////////////////////////
// For browserify-hmr
// See browserify-hmr module.hot API docs for hooks docs.
declare const module: any // tslint:disable-line no-reserved-keywords
if (module.hot) {
	module.hot.accept()
	// module.hot.dispose((data: any) => {
	// 	m.redraw();
	// })
}
///////////////////////////////////////////////////////////
