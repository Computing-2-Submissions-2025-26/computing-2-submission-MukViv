/*jslint browser*/

/*This file is for controlling imported mp3 audio files and
generating sound effects using the Web Audio API (frequencies).
*/

function createAudioController(config) {
    let audio_context = null;
    let music_enabled = false;
    function ensure_audio() {
        if (audio_context === null) {
            const Ctx = window.AudioContext || window.webkitAudioContext;

            if (Ctx === undefined) {
                return null;
            }

            try {
                audio_context = new Ctx();
            } catch (ignore) {
                audio_context = null;
                return null;
            }
        }

        if (audio_context !== null && audio_context.state === "suspended") {
            audio_context.resume();
        }

        return audio_context;
    }
    function play_file_sound(source, volume) {
        const sfx = new window.Audio(source);

        sfx.volume = volume;

        const played = sfx.play();

        if (played !== undefined && typeof played.catch === "function") {
            played.catch(function ignore_blocked_sound() {
                return undefined;
            });
        }
    }
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
    function sound_move() {
        play_file_sound(config.move_src, 0.6);
    }
    function sound_police_car() {
        play_file_sound(config.police_car_src, 0.6);
    }
    function sound_victor(winner) {
        const thief_won = winner === config.player_thief;

        play_file_sound(
            (
                thief_won
                ? config.thief_win_src
                : config.king_win_src
            ),
            (
                thief_won
                ? 0.75
                : 1
            )
        );
    }
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

        out.gain.value = 4.4;
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

        config.bg_music.volume = 0.8;

        const played = config.bg_music.play();

        music_enabled = true;

        if (played !== undefined && typeof played.catch === "function") {
            played.catch(function music_unavailable() {
                music_enabled = false;
            });
        }
    }
    function stop_music() {
        config.bg_music.pause();
        config.bg_music.currentTime = 0;
        music_enabled = false;
    }
    function start_audio(should_start_music) {
        ensure_audio();

        if (should_start_music) {
            start_music();
        }
    }

    return {
        sound_dice,
        sound_move,
        sound_police_car,
        sound_poster_thump,
        sound_tick,
        sound_victor,
        start_audio,
        start_music,
        stop_music
    };
}

export {createAudioController};
