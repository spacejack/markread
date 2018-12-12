# MarkRead

A Markdown reader for Gnome (or the browser.)

This is small project that is a result of me blundering my way through learning [GJS](https://gitlab.gnome.org/GNOME/gjs/), [GTK+](https://www.gtk.org/) and a bit of [WebKitGTK+](https://webkitgtk.org/).

Documentation and examples for these technologies is thin, scattered, and more often than not out of date. Quite often you'll need to look up C APIs and make your best guess at what the GJS equivalent will be.

The good news is that GJS uses the Spidermonkey Javascript engine which is quite up-to-date. And GTK uses modern WebKit2 webviews.

That said, I'm kind of a Typescript fanatic so despite having modern JS at my disposal I decided to write everything in Typescript anyway.

## Install

	npm i

## Develop in browser (compile, hot-reload on save)

	npm start

Then go to `http://localhost:3000/` in your browser.

## Build compiled bundles

	npm run build

* Outputs webview app to `public/`
* Outputs executable GTK/GJS script to `markread`

## Run as a Gnome GJS/GTK app:

First `npm run build`, then:

	./markread readme.md

### Ad-hoc install on a Linux system

To install to `/opt/markread`:

	npm run build
	sudo mkdir /opt/markread
	sudo cp markread /opt/markread/markread
	sudo cp -r public /opt/markread

Now you can right-click a `.md` file and set its default application to `/opt/markread/markread`. Then double-clicking `.md` files will auto-launch this app.

You can also open files using the "Open" button or drag & drop them into the window.

## Notes

First, a big thank-you to Github user [optimisme](https://github.com/optimisme) for providing [these examples](https://github.com/optimisme/gjs-examples). Without them I don't think I would've gotten anywhere.

### IPC (Inter-Process Communication)

I could find no up-to-date GJS examples using WebKit2 that demonstrated communicating between a GJS app and its webview. After much searching and pleading for help, I found a way to do this that is 50% okay.

#### The good: Sending messages from the webview to the GTK app

Here's the gist:

```javascript
// GTK
const contentManager = webView.get_user_content_manager()
contentManager.connect('script-message-received::test', (self, message) => {
	const data = message.get_js_value().to_string()
	print(data)
})
contentManager.register_script_message_handler('test')
```

```javascript
// Webview
window.webkit.messageHandlers.test.postMessage('Hello from webview!')
```

#### The bad: Sending messages from the GTK app to the webview

This requires that you basically "exec" a Javascript string from the GTK side which runs in the webview context. So on the webview side you might set up a global message handler function:

```javascript
window.handleGtkMessage(data) {
	console.log(data)
}
```

Then in your GTK app you can do:

```javascript
webView.run_javascript('handleGtkMessage("Hello from GTK")', null, () => {
	print('Ran webview script')
})
```

This has a fairly small size limit as I discovered, so in order to send larger messages (like markdown file contents) you'll need to break these messages into chunks. You can see my implementations in [src/app/ipc.ts](src/app/ipc.ts) and [src/webview/ipc.ts](src/app/ipc.ts).

### Compiling & Bundling a GTK app

This is kind of a strange thing to do given that GJS provides its own module system of sorts. But it makes working with the Typescript compiler easier than trying to get it to understand types from GJS's `imports`. I simply wrapped the stdlib imports in a module (see [src/app/gi.ts](src/app/gi.ts)) then imported them "normally". Otherwise I used regular ES imports for my own sources and let the compiler/bundler do its thing.

### Types

GTK, GLib, Gio, WebKit2 etc. are huge APIs. So, no, a full set of up-to-date types don't exist. But I see a valiant attempt was made a few years ago [here](https://github.com/niagr/gjs-ts).

## TODOs

This app is pretty barebones in its current state. Links don't work, it can't open images from your local file system, there's no syntax highlighting. At some point I'd like to add an editor as well. But for now it scratches my immediate itch which was to have a quick utility to open and read markdown files with decent formatting.
