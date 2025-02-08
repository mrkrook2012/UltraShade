const { GLib, St, Clutter, Gio, GObject } = imports.gi;
const Main = imports.ui.main;
const PanelMenu = imports.ui.panelMenu;
const ExtensionUtils = imports.misc.extensionUtils;
const Slider = imports.ui.slider;
const PopupMenu = imports.ui.popupMenu;

const XrandrDimmer = GObject.registerClass(
    class XrandrDimmer extends PanelMenu.Button {
        _init() {
            super._init(0.0, "Xrandr Dimmer", false);

            // Create and add an icon
            let icon = new St.Icon({
                icon_name: 'display-brightness-symbolic',
                style_class: 'system-status-icon',
            });
            this.add_child(icon);

            // Create menu item with brightness slider
            let sliderItem = new PopupMenu.PopupBaseMenuItem({ activate: false });
            let sliderLabel = new St.Label({
                text: "Brightness",
                y_align: Clutter.ActorAlign.CENTER
            });
            sliderItem.actor.add_child(sliderLabel, { expand: false });

            this._slider = new Slider.Slider(1.0);
            this._slider.connect('notify::value', () => {
                let brightness = Math.max(0.1, this._slider.value).toFixed(2);
                this._setBrightness(brightness);
            });
            sliderItem.actor.add_child(this._slider.actor, { expand: true });
            this.menu.addMenuItem(sliderItem);

            // Add the menu to the panel
            Main.panel.addToStatusArea("xrandr-dimmer", this);
        }

        _setBrightness(brightness) {
            try {
                new Gio.Subprocess({
                    argv: ['xrandr', '--output', 'eDP', '--brightness', brightness],
                    flags: Gio.SubprocessFlags.STDOUT_SILENCE | Gio.SubprocessFlags.STDERR_SILENCE,
                }).init(null);
            } catch (e) {
                logError(e, "Failed to change brightness");
            }
        }
    }
);

let _indicator = null;

function init() {}

function enable() {
    if (!_indicator) {
        _indicator = new XrandrDimmer();
        Main.panel.addToStatusArea("xrandr-dimmer", _indicator);
    }
}


function disable() {
    if (_indicator) {
        _indicator.destroy();
        _indicator = null;
    }
}
