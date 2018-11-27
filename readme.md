# MarkRead

A Markdown Reader

## Install

	npm i

## Develop in browser (compile, reload on save)

	npm start

Then go to `http://localhost:3000/` in your browser.

## Build minified

	npm run build

Outputs to `public/`

## Run as a Gnome GJS/GTK app:

First `npm run build` or `npm run compile`. Then:

	cd gnome
	./markread.js ../readme.md

### Ad-hoc install on a Linux system

To install to `/opt/markread`:

	npm run compile
	sudo mkdir /opt/markread
	sudo chown <you> /opt/markread
	sudo chgrp <you> /opt/markread
	cp gnome/markread.js /opt/markread/markread
	cp -r public /opt/markread

To make the script work as a default application for `.md` files you'll need to edit the path to the `public` directory in the `/opt/markread/markread` script. Change line 44 to:

	GLib.filename_to_uri("/opt/markread/public/index.html", null)

Now you can right-click an `.md` file and set its default application to `/opt/markread/markread`. Then double-clicking `.md` files will auto-launch this app.

## TODO:

Make GJS app work from any directory without hard-coding the path to `public`
