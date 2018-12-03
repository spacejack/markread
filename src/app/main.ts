import {GLib, GObj, Gtk, Webkit} from './gi'
import * as fs from './fsutil'
import {openFileDialog} from './dialog'

/**
 * Escape a string so it can be used within a single-quoted string.
 * TODO: How to ensure safely sanitized?
 */
function escapeString (str?: string) {
	return str != null
		? str.replace(/\'/g, "\\'").replace(/\n/g, '\\n') : ''
}

/**
 * Send the markdown source to the browser context via
 * a global window function that it has exposed.
 */
function sendMarkdownToWebView (webView: any, mkSrc: string, filename?: string) {
	return new Promise(res => {
		const script = `handleMarkdownContent('${escapeString(mkSrc)}', '${escapeString(filename)}')`
		webView.run_javascript(script, null, () => {
			print("Sent markdown content to WebView")
			res()
		})
	})
}

interface App {
	run(argv: string[]): void
	setTitle(title: string): void
}

/**
 * Create an App instance (wrapper for Gtk.Application)
 */
function App (mkSrc?: string, title?: string): App {
	const application = new Gtk.Application()
	let appWindow: any
	let webView: any

	function createHeaderBar (
		title: string, subtitle?: string, options?: {onOpen(filename: string): void}
	) {
		const headerBar = new Gtk.HeaderBar()
		headerBar.set_title(title)
		if (subtitle != null) {
			headerBar.set_subtitle(subtitle)
		}
		headerBar.set_show_close_button(true)
		const button = new Gtk.Button({label: 'Open'})
		if (options && options.onOpen) {
			button.connect ('clicked', () => {
				const filename = openFileDialog(appWindow)
				if (filename != null) {
					options.onOpen(filename)
				}
			})
		}
		headerBar.pack_start(button)
		return headerBar
	}

	application.connect('startup', () => {
		appWindow = new Gtk.ApplicationWindow({
			application,
			title: 'MarkRead',
			default_height: 800,
			default_width: 720,
			border_width: 0,
			window_position: Gtk.WindowPosition.CENTER
		})

		appWindow.set_titlebar(createHeaderBar('MarkRead', undefined, {
			onOpen(filename) {
				const mkSrc = fs.tryLoadTextFile(filename)
				if (mkSrc != null) {
					const basename = fs.getBaseName(filename)
					sendMarkdownToWebView(webView, mkSrc, basename)
					appWindow.title = basename + ' - MarkRead'
				}
			}
		}))

		// Create a webview to show the web app
		webView = new Webkit.WebView()

		// Put the web app into the webview
		webView.load_uri(
			//GLib.filename_to_uri(`${GLib.get_current_dir()}/../public/index.html`, null)
			GLib.filename_to_uri(`${fs.getAppDirectory()}/public/index.html`, null)
		)

		// If a markdown file was loaded on startup we need to send it
		// to the client to render...
		if (mkSrc != null) {
			/**
			 * Number of files we assume need to be loaded before we
			 * can invoke client-side functions. (3 files: html, js, css.)
			 * TODO: How can this be determined besides hard-coding it?
			 */
			const NUM_FILES_TO_LOAD = 3
			/** Tracks number of files loaded in webview. */
			let numLoaded = 0

			// When the page loads, use the markdown file from the CLI
			webView.connect('load-changed', () => {
				numLoaded += 1
				if (numLoaded === NUM_FILES_TO_LOAD) {
					print(`Loading ${title}`)
					//GLib.timeout_add(null, 1000, () => {
					sendMarkdownToWebView(webView, mkSrc, title)
					appWindow.title = title + ' - MarkRead'
					//})
				}
			})
		}

		// Put the scrolled window into the app window
		appWindow.add(webView)

		// Show the window and all child widgets
		appWindow.show_all()
	})

	application.connect('activate', () => {
		appWindow.present()
	})

	// return App interface
	return {
		run: argv => {
			application.run(argv)
		},
		setTitle: title => {
			appWindow.title = title
		}
	}
}

///////////////////////////////////////////////////////////
// Script starts...

let markdownSrc: string | undefined
let basename: string | undefined

// Were we supplied a markdown filename to use?
if (ARGV.length > 0) {
	const filename = ARGV[0]
	if (filename) {
		markdownSrc = fs.tryLoadTextFile(filename)
		if (markdownSrc != null) {
			basename = fs.getBaseName(filename)
		}
	}
}

App(markdownSrc, basename).run(ARGV)
