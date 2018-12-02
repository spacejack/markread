#!/usr/bin/env gjs

//@ts-check

///<reference path="gtk.d.ts"/>

imports.gi.versions.Gtk = '3.0'
imports.gi.versions.WebKit2 = '4.0'

const GLib = imports.gi.GLib
const Gio = imports.gi.Gio
const GObj = imports.gi.GObject
const Gtk = imports.gi.Gtk
const Webkit = imports.gi.WebKit2

/**
 * Escape a string so it can be used within a single-quoted string.
 * TODO: How to ensure safely sanitized?
 * @param {string | void} str
 */
function escapeString (str) {
	return str != null
		? str.replace(/\'/g, "\\'").replace(/\n/g, '\\n') : ''
}

/** @param {string} path */
function getBaseName (path) {
	const pos = path.lastIndexOf('/')
	return pos >= 0 ? path.substr(pos + 1) : path
}

/**
 * Somewhat convoluted way to get abs app directory.
 * SEE: https://github.com/optimisme/gjs-examples/blob/master/egAsset.js#L17
 * @returns {string} Absolute application directory path
 */
function getAppDirectory() {
	const stack = (new Error()).stack || ''
	const stackLine = stack.split('\n')[1]
	if (!stackLine) {
		throw new Error('Could not find current file in stack (2)')
	}
	const coincidence = /@(.+):\d+/.exec(stackLine)
	if (!coincidence) {
		throw new Error('Could not find current file in stack (3)')
	}
	const path = coincidence[1]
	const file = Gio.File.new_for_path(path)
	return file.get_parent().get_path()
	// full exe path: file.get_path(),
	// full exe dir : file.get_parent().get_path(),
	// exe basename : file.get_basename()
}

/**
 * @param {string} filename
 * @returns {Uint8Array | void} File content as a buffer or undefined if failed.
 */
function tryLoadFile (filename) {
	try {
		return GLib.file_get_contents(filename)[1]
	} catch (err) {
		printerr(`Failed to load '${filename}'`)
	}
}

/**
 * @param {string} filename Name of file to load
 * @returns {string | undefined} Text content of file
 */
function tryLoadTextFile (filename) {
	const result = tryLoadFile(filename)
	// TODO: How to avoid string conversion warning here?
	return result != null ? String(result) : undefined
}

/**
 * @param {any} window
 * @returns {string | undefined}
 */
function openDialog (window) {
	const filter = new Gtk.FileFilter()
	filter.add_mime_type('text/plain')

	const chooser = new Gtk.FileChooserDialog({
		action: Gtk.FileChooserAction.OPEN,
		filter: filter,
		select_multiple: false,
		transient_for: window,
		title: 'Open'
	})

	// Without setting a current folder, folders won't show its contents
	// Use app home folder by default:
	const path = '~/Documents' // getAppDirectory()
	chooser.set_current_folder(path)

	// Add the buttons and its return values
	chooser.add_button('Cancel', Gtk.ResponseType.CANCEL)
	chooser.add_button('OK', Gtk.ResponseType.OK)

	// This is to add the 'combo' filtering options
	const store = new Gtk.ListStore()
	store.set_column_types([GObj.TYPE_STRING, GObj.TYPE_STRING])
	store.set(store.append(), [0, 1], ['text', 'text/plain'])
	store.set(store.append(), [0, 1], ['md', '*.md'])
	//store.set(store.append(), [0, 1], ['js', '*.js'])

	const combo = new Gtk.ComboBox({model: store})
	const renderer = new Gtk.CellRendererText()
	combo.pack_start(renderer, false)
	combo.add_attribute(renderer, "text", 1)
	combo.set_active(0)
	combo.connect('changed', /** @param {any} widget */ widget => {
		const model = widget.get_model()
		const active = widget.get_active_iter()[1]
		const type = model.get_value(active, 0)
		const text = model.get_value(active, 1)
		const filter = new Gtk.FileFilter()
		if (type === 'text') {
			filter.add_mime_type(text)
		} else {
			filter.add_pattern(text)
		}
		chooser.set_filter(filter)
	})
	chooser.set_extra_widget(combo)

	// Run the dialog
	const result = chooser.run()
	const filename = chooser.get_filename()
	chooser.destroy()
	return result === Gtk.ResponseType.OK ? filename : undefined
}

/**
 * Send the markdown source to the browser context via
 * a global window function that it has exposed.
 * @param {any} webView
 * @param {string} mkSrc
 * @param {string | void} filename
 * @returns {Promise<void>}
 */
function sendMarkdownToWebView (webView, mkSrc, filename) {
	return new Promise(res => {
		const script = `handleMarkdownContent('${escapeString(mkSrc)}', '${escapeString(filename)}')`
		webView.run_javascript(script, null, () => {
			print("Sent markdown content to WebView")
			res()
		})
	})
}

/**
@typedef {{
	run: (argv: string[]) => void
	setTitle: (title: string) => void
}} App
*/

/**
 * @param {string | void} mkSrc
 * @param {string | void} title
 * @returns {App} Instance interface
 */
function App (mkSrc, title) {
	const application = new Gtk.Application()
	/** @type {any} */
	let appWindow
	/** @type {any} */
	let webView

	/**
	 * @param {string} title
	 * @param {string | void} subtitle
	 * @param {{onOpen: (filename: string) => void} | void} options
	 */
	function createHeaderBar (title, subtitle, options) {
		const headerBar = new Gtk.HeaderBar()
		headerBar.set_title(title)
		if (subtitle != null) {
			headerBar.set_subtitle(subtitle)
		}
		headerBar.set_show_close_button(true)
		const button = new Gtk.Button({label: 'Open'})
		if (options && options.onOpen) {
			button.connect ('clicked', () => {
				const filename = openDialog(appWindow)
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
				const mkSrc = tryLoadTextFile(filename)
				if (mkSrc != null) {
					const basename = getBaseName(filename)
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
			GLib.filename_to_uri(`${getAppDirectory()}/public/index.html`, null)
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

/** @type {string | undefined} */
let markdownSrc
let basename

// Were we supplied a markdown filename to use?
if (ARGV.length > 0) {
	const filename = ARGV[0]
	if (filename) {
		markdownSrc = tryLoadTextFile(filename)
		if (markdownSrc != null) {
			basename = getBaseName(filename)
		}
	}
}

App(markdownSrc, basename).run(ARGV)
