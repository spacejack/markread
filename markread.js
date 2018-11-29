#!/usr/bin/env gjs

imports.gi.versions.Gtk = '3.0'
imports.gi.versions.WebKit2 = '4.0'

const GLib = imports.gi.GLib
const Gio = imports.gi.Gio
const Gtk = imports.gi.Gtk
const Webkit = imports.gi.WebKit2

/**
 * Escape a string so it can be used within a single-quoted string.
 * TODO: How to ensure safely sanitized?
 * @param {string} str
 */
function escapeString (str) {
	return str.replace(/\'/g, "\\'").replace(/\n/g, '\\n')
}

/**
 * Somewhat convoluted way to get abs app directory.
 * SEE: https://github.com/optimisme/gjs-examples/blob/master/egAsset.js#L17
 */
function getAppDirectory() {
	const stack = (new Error()).stack
	const stackLine = stack.split('\n')[1]
	if (!stackLine) {
		throw new Error('Could not find current file (1)')
	}
	const coincidence = /@(.+):\d+/.exec(stackLine)
	if (!coincidence) {
		throw new Error('Could not find current file (2)')
	}
	const path = coincidence[1]
	const file = Gio.File.new_for_path(path)
	return file.get_parent().get_path()
	// full exe path: file.get_path(),
	// full exe dir : file.get_parent().get_path(),
	// exe basename : file.get_basename()
}

/**
 * @param {string?} mkSrc
 * @param {string?} title
 * @returns Gtk.Application
 */
function createApp (mkSrc, title) {
	const application = new Gtk.Application()
	let appWindow

	application.connect('startup', () => {
		appWindow = new Gtk.ApplicationWindow({
			application,
			title: "MarkRead",
			default_height: 800,
			default_width: 720,
			border_width: 0,
			window_position: Gtk.WindowPosition.CENTER
		})

		// Create a webview to show the web app
		const webView = new Webkit.WebView()

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
			/**
			 * Tracks number of files loaded in webview.
			 */
			let numLoaded = 0

			// When the page loads, use the markdown file from the CLI
			webView.connect('load-changed', self => {
				numLoaded += 1
				if (numLoaded === NUM_FILES_TO_LOAD) {
					print(`Loading ${title}`)
					// Send the file we loaded to the browser context via
					// a global window function that it has exposed
					//GLib.timeout_add(null, 1000, () => {
					const script = `handleMarkdownContent('${escapeString(mkSrc)}', '${escapeString(title)}')`
					webView.run_javascript(script, null, () => {})
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

	return application
}

/** @type {string | undefined} */
let markdownSrc
let basename

// Were we supplied a markdown filename to use?
if (ARGV.length > 0) {
	const filename = ARGV[0]
	const pos = filename.lastIndexOf('/')
	basename = pos >= 0 ? filename.substr(pos + 1) : filename
	const data = GLib.file_get_contents(filename)[1]
	// TODO: How to avoid warning here?
	markdownSrc = String(data)
}

const app = createApp(markdownSrc, basename)
app.run(ARGV)
