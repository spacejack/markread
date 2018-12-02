# MarkRead

A Markdown Reader

## Install

	npm i

## Develop in browser (compile, reload on save)

	npm start

Then go to `http://localhost:3000/` in your browser.

## Build minified

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

Now you can right-click an `.md` file and set its default application to `/opt/markread/markread`. Then double-clicking `.md` files will auto-launch this app.
