/*jslint browser*/

/**
 * Builds the browser audio controller for music and sound effects.
 * @param {object} config Audio file paths and DOM nodes.
 * @returns {object} Sound effect and music controls.
 */
function createAudioController(config) {
    let audio_context = null;
    let music_enabled = false;

    /**
     * Lazily creates (and resumes) the Web Audio context for sound effects.
     * @returns {object|null} The audio context, or null when unavailable.
     */
    function ensure_audio() {
        if (audio_context === null) {
            const Ctx = window.AudioContext || window.webkitAudioContext;

            if (Ctx === undefined) {
                return null;
            }

            try {
                audio_context = new Ctx();
            } catch (error) {
                void error;
                audio_context = null;
                return null;
            }
        }

        if (audio_context !== null && audio_context.state === "suspended") {
            audio_context.resume();
        }

        return audio_context;
    }

    /**
     * Plays an audio file and ignores browser autoplay rejections.
     * @param {string} source The audio file path.
     * @param {number} volume Playback volume from 0 to 1.
     * @returns {undefined}
     */
    function play_file_sound(source, volume) {
        const sfx = new Audio(source);

        sfx.volume = volume;

        const played = sfx.play();

        if (played !== undefined && typeof played.catch === "function") {
            played.catch(function ignore_blocked_sound() {
                return undefined;
            });
        }
    }

    /**
     * Plays one short synthesised note with a quick fade in and out.
     * @param {number} freq The pitch in hertz.
     * @param {number} duration The length in seconds.
     * @param {string} type The oscillator wave type.
     * @param {number} gain The peak volume from 0 to 1.
     * @param {number} delay Seconds to wait before the note starts.
     * @returns {undefined}
     */
    function play_tone(freq, duration, type, gain, delay) {
        const ctx = ensure_audio();

        if (ctx === null) {
            return;
        }

        const start = ctx.currentTime + delay;
        const osc = ctx.createOscillator();
        const env = ctx.createGain();

        osc.type = type;
        osc.frequency.value = freq;
        env.gain.setValueAtTime(0.0001, start);
        env.gain.linearRampToValueAtTime(gain, start + 0.008);
        env.gain.exponentialRampToValueAtTime(0.0001, start + duration);
        osc.connect(env);
        env.connect(ctx.destination);
        osc.start(start);
        osc.stop(start + duration + 0.03);
    }

    /**
     * Builds a soft-saturation curve used to warm the dice sound.
     * @param {number} amount How hard to drive the curve.
     * @returns {Float32Array} The waveshaper curve.
     */
    function make_shaper_curve(amount) {
        const size = 1024;
        const curve = new Float32Array(size);
        let i = 0;

        while (i < size) {
            const x = (i / (size - 1)) * 2 - 1;
            curve[i] = Math.tanh(x * amount);
            i += 1;
        }

        return curve;
    }

    /**
     * Plays one struck-wood "knock" using inharmonic modal resonances.
     * @param {number} start When the knock starts, in audio time.
     * @param {number} gain The knock volume.
     * @param {number} base The base resonance frequency.
     * @param {object} out The node to connect into.
     * @returns {undefined}
     */
    function wood_knock(start, gain, base, out) {
        const ctx = audio_context;
        const length = Math.floor(ctx.sampleRate * 0.005);
        const buffer = ctx.createBuffer(1, length, ctx.sampleRate);
        const data = buffer.getChannelData(0);
        const modes = [
            [1, 16, 1, 0.055],
            [1.59, 13, 0.55, 0.045],
            [2.71, 10, 0.38, 0.035],
            [4.16, 8, 0.22, 0.028]
        ];
        let i = 0;
        let k = 0;

        while (i < length) {
            data[i] = Math.random() * 2 - 1;
            i += 1;
        }

        while (k < modes.length) {
            const mode = modes[k];
            const src = ctx.createBufferSource();
            const band = ctx.createBiquadFilter();
            const env = ctx.createGain();

            src.buffer = buffer;
            band.type = "bandpass";
            band.frequency.value = (
                base * mode[0] * (0.95 + Math.random() * 0.1)
            );
            band.Q.value = mode[1];
            env.gain.setValueAtTime(gain * mode[2], start);
            env.gain.exponentialRampToValueAtTime(0.0001, start + mode[3]);
            src.connect(band);
            band.connect(env);
            env.connect(out);
            src.start(start);
            src.stop(start + 0.1);
            k += 1;
        }
    }

    /**
     * Plays the chess piece movement sound from file.
     * @returns {undefined}
     */
    function sound_move() {
        play_file_sound(config.move_src, 0.6);
    }

    /**
     * Plays the police car placement sound from file.
     * @returns {undefined}
     */
    function sound_barrier() {
        play_file_sound(config.barrier_src, 0.6);
    }

    /**
     * Plays the matching end sound once the victor has been decided.
     * @param {string} winner The player who won the game.
     * @returns {undefined}
     */
    function sound_victor(winner) {
        play_file_sound(
            (
                winner === config.player_thief
                ? config.thief_win_src
                : config.king_win_src
            ),
            0.75
        );
    }

    /**
     * Plays a warm wooden dice-roll: several settling knocks, soft-saturated.
     * @returns {undefined}
     */
    function sound_dice() {
        const ctx = ensure_audio();

        if (ctx === null) {
            return;
        }

        const out = ctx.createGain();
        const low = ctx.createBiquadFilter();
        const limiter = ctx.createWaveShaper();
        const knocks = 6;
        let t = ctx.currentTime + 1;
        let i = 0;

        out.gain.value = 2.2;
        low.type = "lowpass";
        low.frequency.value = 4000;
        limiter.curve = make_shaper_curve(1.2);
        limiter.oversample = "2x";
        out.connect(limiter);
        limiter.connect(low);
        low.connect(ctx.destination);

        while (i < knocks) {
            const frac = i / knocks;
            const gain = (
                0.9 * (0.3 + 0.7 * (1 - frac))
                * (0.8 + Math.random() * 0.4)
            );
            const base = 250 * (0.85 + Math.random() * 0.3);

            wood_knock(t, gain, base, out);
            t += 0.1 * (0.5 + Math.random()) * (1 + frac);
            i += 1;
        }
    }

    /**
     * Plays a heavy thump when the win poster lands.
     * @returns {undefined}
     */
    function sound_poster_thump() {
        const ctx = ensure_audio();

        if (ctx === null) {
            return;
        }

        const start = ctx.currentTime + 0.1;
        const out = ctx.createGain();
        const low = ctx.createBiquadFilter();

        out.gain.value = 2.8;
        low.type = "lowpass";
        low.frequency.value = 900;
        out.connect(low);
        low.connect(ctx.destination);

        wood_knock(start, 1.15, 95, out);
        play_tone(72, 0.18, "sine", 0.28, 0.1);
    }

    /**
     * Plays a clock tick for the final seconds of a turn.
     * @param {boolean} urgent Whether to use the higher, more urgent pitch.
     * @returns {undefined}
     */
    function sound_tick(urgent) {
        play_tone(
            (
                urgent
                ? 1180
                : 880
            ),
            0.045,
            "square",
            0.22,
            0
        );
    }

    /**
     * Starts the looping background music when the browser allows playback.
     * @returns {undefined}
     */
    function start_music() {
        if (config.music_src === "") {
            return;
        }

        if (music_enabled) {
            return;
        }

        if (config.bg_music.getAttribute("src") !== config.music_src) {
            config.bg_music.src = config.music_src;
        }

        const played = config.bg_music.play();

        music_enabled = true;

        if (played !== undefined && typeof played.catch === "function") {
            played.catch(function music_unavailable() {
                music_enabled = false;
            });
        }
    }

    /**
     * Stops the looping background music.
     * @returns {undefined}
     */
    function stop_music() {
        config.bg_music.pause();
        config.bg_music.currentTime = 0;
        music_enabled = false;
    }

    /**
     * Starts all audio systems that are enabled for the game.
     * @param {boolean} should_start_music Whether music should start.
     * @returns {undefined}
     */
    function start_audio(should_start_music) {
        ensure_audio();

        if (should_start_music) {
            start_music();
        }
    }

    return Object.freeze({
        sound_barrier,
        sound_dice,
        sound_move,
        sound_poster_thump,
        sound_tick,
        sound_victor,
        start_audio,
        start_music,
        stop_music
    });
}

export {createAudioController};
