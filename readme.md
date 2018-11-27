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

## TODO:

* Make GJS app work from any directory
