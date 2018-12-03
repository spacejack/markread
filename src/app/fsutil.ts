// Wrappers for GTK filesystem utils

import {Gio, GLib} from './gi'

export function getBaseName (path: string) {
	const pos = path.lastIndexOf('/')
	return pos >= 0 ? path.substr(pos + 1) : path
}

/**
 * Somewhat convoluted way to get abs app directory.
 * SEE: https://github.com/optimisme/gjs-examples/blob/master/egAsset.js#L17
 * @returns {string} Absolute application directory path
 */
export function getAppDirectory(): string {
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
 * TODO: Make this async? Don't swallow exception?
 * @param filename Name of file to load
 * @returns File content as a buffer or undefined if failed.
 */
export function tryLoadFile (filename: string): string | void {
	try {
		return GLib.file_get_contents(filename)[1]
	} catch (err) {
		printerr(`Failed to load '${filename}'`)
	}
}

/**
 * @param filename Name of file to load
 * @returns Text content of file or undefined if load failed
 */
export function tryLoadTextFile (filename: string) {
	const result = tryLoadFile(filename)
	// TODO: How to avoid string conversion warning here?
	return result != null ? String(result) : undefined
}
