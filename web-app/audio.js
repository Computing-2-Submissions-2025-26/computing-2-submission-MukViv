/*jslint browser*/

// Audio controller for Chess Thieves. Plays imported mp3 effects and the
// background music track, plus two synthesized sounds (the dice roll and the
// countdown tick) generated with the Web Audio API.

const MUSIC_VOLUME = 0.08;

const createAudioController = function createAudioController(config) {
    let audio_context = null;
    let music_enabled = false;

    config.bg_music.volume = MUSIC_VOLUME;

    // Creates the AudioContext on first use and resumes it if the browser
    // suspended it before the first user gesture. Returns null when the
    // browser has no Web Audio support.
    const ensure_audio = function ensure_audio() {
        if (audio_context === null) {
            const Ctx = window.AudioContext || window.webkitAudioContext;

            if (Ctx === undefined) {
                return null;
            }

            audio_context = new Ctx();
        }

        if (audio_context.state === "suspended") {
            audio_context.resume();
        }

        return audio_context;
    };

    // Plays a one-shot mp3 file. Browsers reject playback that happens before
    // a user gesture, so a rejected promise is ignored rather than thrown.
    const play_file_sound = function play_file_sound(source, volume) {
        const sfx = new window.Audio(source);

        sfx.volume = volume;

        const played = sfx.play();

        if (played !== undefined) {
            played.catch(function ignore_blocked_sound() {
                return undefined;
            });
        }
    };

    // Plays a single shaped oscillator note. Used for the dice roll and tick.
    const play_tone = function play_tone(freq, duration, type, gain, delay) {
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
    };

    const sound_move = function sound_move() {
        play_file_sound(config.move_src, 0.6);
    };

    const sound_police_car = function sound_police_car() {
        play_file_sound(config.police_car_src, 0.6);
    };

    const sound_victor = function sound_victor(winner) {
        play_file_sound(
            (
                winner === config.player_thief
                ? config.thief_win_src
                : config.king_win_src
            ),
            0.75
        );
    };

    // A short series of blips with widening gaps, suggesting a die tumbling
    // and settling.
    const sound_dice = function sound_dice() {
        let i = 0;
        let delay = 0.05;

        while (i < 5) {
            play_tone(200 + Math.random() * 120, 0.05, "triangle", 0.18, delay);
            delay += 0.06 + i * 0.03;
            i += 1;
        }
    };

    const sound_tick = function sound_tick(urgent) {
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
    };

    const start_music = function start_music() {
        if (config.music_src === "" || music_enabled) {
            return;
        }

        if (config.bg_music.getAttribute("src") !== config.music_src) {
            config.bg_music.src = config.music_src;
        }

        const played = config.bg_music.play();

        music_enabled = true;

        if (played !== undefined) {
            played.catch(function music_unavailable() {
                music_enabled = false;
            });
        }
    };

    const stop_music = function stop_music() {
        config.bg_music.pause();
        config.bg_music.currentTime = 0;
        music_enabled = false;
    };

    const start_audio = function start_audio(should_start_music) {
        ensure_audio();

        if (should_start_music) {
            start_music();
        }
    };

    return Object.freeze({
        sound_dice,
        sound_move,
        sound_police_car,
        sound_tick,
        sound_victor,
        start_audio,
        start_music,
        stop_music
    });
};

export {createAudioController};
