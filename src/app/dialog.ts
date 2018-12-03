import {GObj, Gtk} from './gi'

/**
 * Show the Open File dialog.
 * @param window The window that is opening the file dialog
 * @returns The selected filename or undefined
 */
export function openFileDialog (window: any): string | undefined {
	const filter = new Gtk.FileFilter()
	filter.add_mime_type('text/plain')

	const chooser = new Gtk.FileChooserDialog({
		action: Gtk.FileChooserAction.OPEN,
		filter,
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
	combo.connect('changed', (widget: any) => {
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
