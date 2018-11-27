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

	./markread.js readme.md

### Ad-hoc install on a Linux system

To install to `/opt/markread`:

	npm run compile
	sudo mkdir /opt/markread
	sudo chown <you> /opt/markread
	sudo chgrp <you> /opt/markread
	cp markread.js /opt/markread/markread
	cp -r public /opt/markread

Now you can right-click an `.md` file and set its default application to `/opt/markread/markread`. Then double-clicking `.md` files will auto-launch this app.
