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

            let icon = new St.Icon({
                icon_name: 'display-brightness-symbolic',
                style_class: 'system-status-icon',
            });
            this.add_child(icon);

            this.brightness = 1.0;
            this.red = 1.0;
            this.green = 1.0;
            this.blue = 1.0;

            // Store sliders
            this.sliders = {};

            this._addSlider("Brightness", 0.1, 1.0, "brightness");
            this._addSlider("Red", 0.1, 2.0, "red");
            this._addSlider("Green", 0.1, 2.0, "green");
            this._addSlider("Blue", 0.1, 2.0, "blue");

            this._addResetButton();

            this._applySettings();
        }

        _addSlider(label, min, max, key) {
            let sliderItem = new PopupMenu.PopupBaseMenuItem({ activate: false });
            let sliderLabel = new St.Label({
                text: label,
                y_align: Clutter.ActorAlign.CENTER
            });
            sliderItem.actor.add_child(sliderLabel, { expand: false });

            let slider = new Slider.Slider((this[key] - min) / (max - min));
            slider.connect('notify::value', () => {
                this[key] = Math.max(min, min + slider.value * (max - min)).toFixed(2);
                this._applySettings();

            });

            sliderItem.actor.add_child(slider.actor, { expand: true });
            this.menu.addMenuItem(sliderItem);

            // Store slider reference
            this.sliders[key] = { slider, min, max };
        }

        _addResetButton() {
            let resetItem = new PopupMenu.PopupMenuItem("Reset to Default");
            resetItem.connect('activate', () => {
                this.brightness = 1.0;
                this.red = 1.0;
                this.green = 1.0;
                this.blue = 1.0;

                // Update sliders
                for (let key of ["brightness", "red", "green", "blue"]) {
                    let { slider, min, max } = this.sliders[key];
                    slider.value = (this[key] - min) / (max - min);
                }

                // Force apply settings
                GLib.idle_add(GLib.PRIORITY_DEFAULT, () => {
                    this._applySettings();
                    return GLib.SOURCE_REMOVE;
                });
            });
            this.menu.addMenuItem(resetItem);
        }

        _applySettings() {
            try {
                new Gio.Subprocess({
                    argv: [
                        'xrandr', '--output', 'eDP', '--brightness',
                        String(this.brightness), '--gamma',
                        `${String(this.red)}:${String(this.green)}:${String(this.blue)}`
                    ],
                    flags: Gio.SubprocessFlags.STDOUT_SILENCE | Gio.SubprocessFlags.STDERR_SILENCE,
                }).init(null);
            } catch (e) {
                logError(e, "Failed to change display settings");
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
