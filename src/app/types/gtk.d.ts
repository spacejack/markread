interface GJS_Imports {
	gi: {
		versions: any
		GLib: any
		Gio: any
		GObject: any
		Gtk: any
		WebKit2: any
	}
}

declare const imports: GJS_Imports

declare const ARGV: string[]

/** Print to stdout */
declare function print (msg: string): void

/** Print to stderr */
declare function printerr (msg: string): void
