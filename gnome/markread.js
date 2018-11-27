#!/usr/bin/gjs

imports.gi.versions.Gtk = '3.0'
imports.gi.versions.WebKit2 = '4.0'

const GLib = imports.gi.GLib
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
 * @param {string?} mkSrc
 * @param {string?} title
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
			// TODO: How to find the public directory relative to this gjs app script?
			// i.e., if the CWD isn't this script's directory.
			GLib.filename_to_uri(GLib.get_current_dir() + "/../public/index.html", null)
		)

		/**
		 * Tracks number of files loaded in webview.
		 * We will send the markdown content (if any) after the
		 * final file is loaded (of 3 total: HTML, JS, CSS)
		 * TODO: How do we know when client-side script is ready
		 * given an arbitrary number of web files?
		 */
		const NUM_FILES_TO_LOAD = 3
		let numLoaded = 0

		// When the page loads, use the markdown file from the CLI
		webView.connect('load-changed', (self) => {
			print('load-changed event')
			numLoaded += 1
			if (mkSrc != null && numLoaded === NUM_FILES_TO_LOAD) {
				//GLib.timeout_add(null, 1000, () => {
				const script = `handleMarkdownContent('${escapeString(mkSrc)}', '${escapeString(title)}')`
				webView.run_javascript(script, null, () => {})
				//})
			}
		})

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
