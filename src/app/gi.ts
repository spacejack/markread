// 'imports' wrapper
// Allows us to use normal ES imports for GTK libs

///<reference path="types/gtk.d.ts"/>

imports.gi.versions.Gtk = '3.0'
imports.gi.versions.WebKit2 = '4.0'

export const GLib = imports.gi.GLib
export const Gio = imports.gi.Gio
export const GObj = imports.gi.GObject
export const Gtk = imports.gi.Gtk
export const Webkit = imports.gi.WebKit2
