/*
 * Version 0.1.5
 * Made By Robin Kuiper
 * Skype: RobinKuiper.eu
 * Discord: Atheos#1095
 * Roll20: https://app.roll20.net/users/1226016/robin
 * Github: https://github.com/RobinKuiper/Roll20APIScripts
 * Reddit: https://www.reddit.com/user/robinkuiper/
 * Patreon: https://patreon.com/robinkuiper
 * Paypal.me: https://www.paypal.me/robinkuiper
 */

var DeathTracker = DeathTracker || (function () {
    'use strict';

    let observers = {
        tokenChange: []
    }

    // Styling for the chat responses.
    const styles = {
            reset: 'padding: 0; margin: 0;',
            menu: 'background-color: #fff; border: 1px solid #000; padding: 5px; border-radius: 5px;',
            button: 'background-color: #000; border: 1px solid #292929; border-radius: 3px; padding: 5px; color: #fff; text-align: center;',
            list: 'list-style: none;',
            float: {
                right: 'float: right;',
                left: 'float: left;'
            },
            overflow: 'overflow: hidden;',
            fullWidth: 'width: 100%;',
            underline: 'text-decoration: underline;',
            strikethrough: 'text-decoration: strikethrough'
        },
        script_name = 'DeathTracker',
        state_name = 'DEATHTRACKER',
        markers = ['blue', 'brown', 'green', 'pink', 'purple', 'red', 'yellow', '-', 'all-for-one', 'angel-outfit', 'archery-target', 'arrowed', 'aura', 'back-pain', 'black-flag', 'bleeding-eye', 'bolt-shield', 'broken-heart', 'broken-shield', 'broken-skull', 'chained-heart', 'chemical-bolt', 'cobweb', 'dead', 'death-zone', 'drink-me', 'edge-crack', 'fishing-net', 'fist', 'fluffy-wing', 'flying-flag', 'frozen-orb', 'grab', 'grenade', 'half-haze', 'half-heart', 'interdiction', 'lightning-helix', 'ninja-mask', 'overdrive', 'padlock', 'pummeled', 'radioactive', 'rolling-tomb', 'screaming', 'sentry-gun', 'skull', 'sleepy', 'snail', 'spanner', 'stopwatch', 'strong', 'three-leaves', 'tread', 'trophy', 'white-tower'],

        handleInput = (msg) => {
            if (msg.type != 'api' || !playerIsGM(msg.playerid)) return;

            // Split the message into command and argument(s)
            let args = msg.content.split(' ');
            let command = args.shift().substring(1);
            let extracommand = args.shift();

            if (command == state[state_name].config.command) {
                switch (extracommand) {
                    case 'reset':
                        state[state_name] = {};
                        setDefaults(true);
                        sendConfigMenu();
                        break;

                    case 'config':
                        let message;
                        if (args.length > 0) {
                            let setting = args.shift().split('|');
                            let key = setting.shift();
                            let value = (setting[0] === 'true') ? true : (setting[0] === 'false') ? false : setting[0];

                            if (key === 'death_statusmarker') {
                                if (value !== state[state_name].config.half_statusmarker) {
                                    state[state_name].config[key] = value;
                                } else {
                                    message = '<span style="color: red">Statusmakers can\'t be the same.</span>';
                                }
                            } else if (key === 'half_statusmarker') {
                                if (value !== state[state_name].config.death_statusmarker) {
                                    state[state_name].config[key] = value;
                                } else {
                                    message = '<span style="color: red">Statusmakers can\'t be the same.</span>';
                                }
                            } else {
                                state[state_name].config[key] = value;
                            }

                            if (key === 'bar') {
                                //registerEventHandlers();
                                message = '<span style="color: red">The API Sandbox needs to be restarted for this to take effect.</span>';
                            }
                        }

                        sendConfigMenu(false, message);
                        break;

                    default:
                        sendConfigMenu();
                        break;
                }
            }
        },

        handleBarValueChange = (obj, prev) => {
            let bar = 'bar' + state[state_name].config.bar;

            if (!obj || !prev || !obj.get('represents') || obj.get(bar + '_value') === prev[bar + '_value']) {
                return;
            }

            let attributes = {};
            let set_death_statusmarker = state[state_name].config.set_death_statusmarker;
            let set_half_statusmarker = state[state_name].config.set_half_statusmarker;
            let pc_unconscious = state[state_name].config.pc_unconscious;

            let deathMarker = state[state_name].config.death_statusmarker;
            let halfMarker = state[state_name].config.half_statusmarker;
            let unconsciousMarker = state[state_name].config.pc_unconscious_statusmarker;

            let playerid = (obj.get('controlledby') && obj.get('controlledby') !== '') ? obj.get('controlledby') : (getObj('character', obj.get('represents'))) ? getObj('character', obj.get('represents')).get('controlledby') : false;
            let isPlayer = (playerid && !playerIsGM(playerid));

            if (set_death_statusmarker && obj.get(bar + '_value') <= 0) {
                let marker = (pc_unconscious && isPlayer) ? unconsciousMarker : deathMarker;
                attributes['status_' + marker] = true;
                attributes['status_' + halfMarker] = false;
            } else {
                attributes['status_' + deathMarker] = false;
                attributes['status_' + unconsciousMarker] = false;
                attributes['status_' + halfMarker] = (set_half_statusmarker && obj.get(bar + '_max') !== '' && obj.get(bar + '_value') <= obj.get(bar + '_max') / 2);
            }

            if(state[state_name].config.change_tint){
                let color = getColor(1 - (obj.get(bar + '_value') / obj.get(bar + '_max')));
                attributes.tint_color = (obj.get(bar + '_max') == obj.get(bar + '_value')) ? 'transparent' : color;
            }

            if(state[state_name].config.fx && parseInt(obj.get(bar + '_value')) < parseInt(prev[bar + '_value'])){
                let x = parseInt(obj.get('left')),
                    y = parseInt(obj.get('top'));

                spawnFxBetweenPoints({ x, y }, { x, y }, state[state_name].config.fx_type, obj.get('pageid'))
            }

            obj.set(attributes);
            notifyObservers('tokenChange', obj, prev);
        },

        getColor = (value) => {
            return hslToHex(((1-value)*120), 75, 50);
        },

        hslToHex = (h, s, l) => {
            h /= 360;
            s /= 100;
            l /= 100;
            let r, g, b;
            if (s === 0) {
                r = g = b = l; // achromatic
            } else {
                const hue2rgb = (p, q, t) => {
                    if (t < 0) t += 1;
                    if (t > 1) t -= 1;
                    if (t < 1 / 6) return p + (q - p) * 6 * t;
                    if (t < 1 / 2) return q;
                    if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
                    return p;
                };
                const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
                const p = 2 * l - q;
                r = hue2rgb(p, q, h + 1 / 3);
                g = hue2rgb(p, q, h);
                b = hue2rgb(p, q, h - 1 / 3);
            }
            const toHex = x => {
                const hex = Math.round(x * 255).toString(16);
                return hex.length === 1 ? '0' + hex : hex;
            };
            return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
        },

        ucFirst = (string) => {
            return string.charAt(0).toUpperCase() + string.slice(1);
        },

        sendConfigMenu = (first, message) => {
            let markerDropdown = '?{Marker';
            markers.forEach((marker) => {
                markerDropdown += '|' + ucFirst(marker).replace('-', ' ') + ',' + marker
            })
            markerDropdown += '}';

            let death_markerButton = makeButton(state[state_name].config.death_statusmarker, '!' + state[state_name].config.command + ' config death_statusmarker|' + markerDropdown, styles.button + styles.float.right);
            let half_markerButton = makeButton(state[state_name].config.half_statusmarker, '!' + state[state_name].config.command + ' config half_statusmarker|' + markerDropdown, styles.button + styles.float.right);
            let set_death_statusmarkerButton = makeButton(state[state_name].config.set_death_statusmarker, '!' + state[state_name].config.command + ' config set_death_statusmarker|' + !state[state_name].config.set_death_statusmarker, styles.button + styles.float.right)
            let set_half_statusmarkerButton = makeButton(state[state_name].config.set_half_statusmarker, '!' + state[state_name].config.command + ' config set_half_statusmarker|' + !state[state_name].config.set_death_statusmarker, styles.button + styles.float.right)
            let commandButton = makeButton('!' + state[state_name].config.command, '!' + state[state_name].config.command + ' config command|?{Command (without !)}', styles.button + styles.float.right)
            let barButton = makeButton('bar ' + state[state_name].config.bar, '!' + state[state_name].config.command + ' config bar|?{Bar|Bar 1 (green),1|Bar 2 (blue),2|Bar 3 (red),3}', styles.button + styles.float.right);
            let pc_unconsciousButton = makeButton(state[state_name].config.pc_unconscious, '!' + state[state_name].config.command + ' config pc_unconscious|' + !state[state_name].config.pc_unconscious, styles.button + styles.float.right);
            let pc_unconscious_markerButton = makeButton(state[state_name].config.pc_unconscious_statusmarker, '!' + state[state_name].config.command + ' config pc_unconscious_statusmarker|' + markerDropdown, styles.button + styles.float.right);
            let change_tintButton = makeButton(state[state_name].config.change_tint, '!' + state[state_name].config.command + ' config change_tint|' + !state[state_name].config.change_tint, styles.button + styles.float.right);
            let fxButton = makeButton(state[state_name].config.fx, '!' + state[state_name].config.command + ' config fx|' + !state[state_name].config.fx, styles.button + styles.float.right);
            let fx_typeButton = makeButton(state[state_name].config.fx_type, '!' + state[state_name].config.command + ' config fx_type|?{FX Type|'+state[state_name].config.fx_type+'}', styles.button + styles.float.right)

            let buttons = '<div style="' + styles.overflow + '">';
            buttons += '<div style="' + styles.overflow + ' clear: both;"><span style="' + styles.float.left + '">Command:</span> ' + commandButton + '</div>';
            buttons += '<div style="' + styles.overflow + ' clear: both;"><span style="' + styles.float.left + '">HP Bar:</span> ' + barButton + '</div>';
            buttons += '<hr>';
            buttons += '<div style="' + styles.overflow + '"><span style="' + styles.float.left + '">Set Dead:</span> ' + set_death_statusmarkerButton + '</div>';
            if (state[state_name].config.set_death_statusmarker) {
                buttons += '<div style="' + styles.overflow + '"><span style="' + styles.float.left + '">Dead Marker:</span> ' + death_markerButton + '</div>';
            }
            buttons += '<br>';
            buttons += '<div style="' + styles.overflow + '"><span style="' + styles.float.left + '">Set Half HP:</span> ' + set_half_statusmarkerButton + '</div>';
            if (state[state_name].config.set_half_statusmarker) {
                buttons += '<div style="' + styles.overflow + '"><span style="' + styles.float.left + '">Half HP Marker:</span> ' + half_markerButton + '</div>';
            }
            buttons += '<br>';
            buttons += '<div style="' + styles.overflow + '"><span style="' + styles.float.left + '">Set Unconscious: <p style="font-size: 8pt">Unconscious if PC.</p></span> ' + pc_unconsciousButton + '</div>';
            if (state[state_name].config.pc_unconscious) {
                buttons += '<div style="' + styles.overflow + '"><span style="' + styles.float.left + '">Unconscious Marker:</span> ' + pc_unconscious_markerButton + '</div>';
            }
            buttons += '<hr>';
            buttons += '<div style="' + styles.overflow + '"><span style="' + styles.float.left + '">Change Tint:</span> ' + change_tintButton + '</div>';
            buttons += '<div style="' + styles.overflow + '"><span style="' + styles.float.left + '">Use FX:</span> ' + fxButton + '</div>';
            if(state[state_name].config.fx){
                buttons += '<div style="' + styles.overflow + '"><span style="' + styles.float.left + '">FX Type:</span> ' + fx_typeButton + '</div>';
            }
            buttons += '</div>';

            let resetButton = makeButton('Reset', '!' + state[state_name].config.command + ' reset', styles.button + styles.fullWidth);

            let title_text = (first) ? script_name + ' First Time Setup' : script_name + ' Config';
            message = (message) ? '<p>' + message + '</p>' : '';
            let contents = message + buttons + '<hr><p style="font-size: 80%">You can always come back to this config by typing `!' + state[state_name].config.command + ' config`.</p><hr>' + resetButton;
            makeAndSendMenu(contents, title_text, 'gm');
        },

        makeAndSendMenu = (contents, title, whisper) => {
            title = (title && title != '') && makeTitle(title)
            whisper = (whisper && whisper !== '') && '/w ' + whisper + ' ';
            sendChat(script_name, whisper + '<div style="' + styles.menu + styles.overflow + '">' + title + contents + '</div>', null, {
                noarchive: true
            });
        },

        makeTitle = (title) => {
            return '<h3 style="margin-bottom: 10px;">' + title + '</h3>';
        },

        makeButton = (title, href, style) => {
            return '<a style="' + style + '" href="' + href + '">' + title + '</a>';
        },

        makeList = (items, listStyle, itemStyle) => {
            let list = '<ul style="' + listStyle + '">';
            items.forEach((item) => {
                list += '<li style="' + itemStyle + '">' + item + '</li>';
            });
            list += '</ul>';
            return list;
        },

        pre_log = (message) => {
            log('---------------------------------------------------------------------------------------------');
            log(message);
            log('---------------------------------------------------------------------------------------------');
        },

        checkInstall = () => {
            if (!_.has(state, state_name)) {
                state[state_name] = state[state_name] || {};
            }
            setDefaults();

            log(script_name + ' Ready! Command: !' + state[state_name].config.command);
            if (state[state_name].config.debug) {
                makeAndSendMenu(script_name + ' Ready! Debug On.', '', 'gm')
            }
        },

        observeTokenChange = function (handler) {
            if (handler && _.isFunction(handler)) {
                observers.tokenChange.push(handler);
            }
        },

        notifyObservers = function (event, obj, prev) {
            _.each(observers[event], function (handler) {
                handler(obj, prev);
            });
        },

        registerEventHandlers = () => {
            on('chat:message', handleInput);
            on('change:graphic', handleBarValueChange);
        },

        setDefaults = (reset) => {
            const defaults = {
                config: {
                    command: 'dead',
                    death_statusmarker: 'dead',
                    half_statusmarker: 'red',
                    set_death_statusmarker: true,
                    set_half_statusmarker: true,
                    bar: 1,
                    firsttime: (reset) ? false : true,
                    pc_unconscious: true,
                    pc_unconscious_statusmarker: 'sleepy',
                    change_tint: true,
                    fx: true,
                    fx_type: 'splatter-blood'
                }
            };

            if (!state[state_name].config) {
                state[state_name].config = defaults.config;
            } else {
                if (!state[state_name].config.hasOwnProperty('command')) {
                    state[state_name].config.command = defaults.config.command;
                }
                if (!state[state_name].config.hasOwnProperty('death_statusmarker')) {
                    state[state_name].config.death_statusmarker = defaults.config.death_statusmarker;
                }
                if (!state[state_name].config.hasOwnProperty('half_statusmarker')) {
                    state[state_name].config.half_statusmarker = defaults.config.half_statusmarker;
                }
                if (!state[state_name].config.hasOwnProperty('set_death_statusmarker')) {
                    state[state_name].config.set_death_statusmarker = defaults.config.set_death_statusmarker;
                }
                if (!state[state_name].config.hasOwnProperty('set_half_statusmarker')) {
                    state[state_name].config.set_half_statusmarker = defaults.config.set_half_statusmarker;
                }
                if (!state[state_name].config.hasOwnProperty('bar')) {
                    state[state_name].config.bar = defaults.config.bar;
                }
                if (!state[state_name].config.hasOwnProperty('pc_unconscious')) {
                    state[state_name].config.pc_unconscious = defaults.config.pc_unconscious;
                }
                if (!state[state_name].config.hasOwnProperty('pc_unconscious_statusmarker')) {
                    state[state_name].config.pc_unconscious_statusmarker = defaults.config.pc_unconscious_statusmarker;
                }
                if (!state[state_name].config.hasOwnProperty('change_tint')) {
                    state[state_name].config.change_tint = defaults.config.change_tint;
                }
                if (!state[state_name].config.hasOwnProperty('fx')) {
                    state[state_name].config.fx = defaults.config.fx;
                }
                if (!state[state_name].config.hasOwnProperty('fx_type')) {
                    state[state_name].config.fx_type = defaults.config.fx_type;
                }
            }

            if (state[state_name].config.firsttime) {
                sendConfigMenu(true);
                state[state_name].config.firsttime = false;
            }
        };

    return {
        CheckInstall: checkInstall,
        ObserveTokenChange: observeTokenChange,
        RegisterEventHandlers: registerEventHandlers
    }
})();

on('ready', function () {
    'use strict';

    DeathTracker.CheckInstall();
    DeathTracker.RegisterEventHandlers();
});