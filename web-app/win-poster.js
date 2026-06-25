/*jslint browser*/
// Controls the video that plays when someone wins.

/**
 * Builds the winning-video poster controller for Chess Thieves.
 * @param {object} config Winner constant, video sources, and display time.
 * @returns {object} Controls for showing and clearing the win poster.
 */
const createWinPosterController = function createWinPosterController(config) {
    let win_poster_timer = null;

    /**
     * Removes any visible win poster and cancels its pending hide timer.
     * @returns {undefined}
     */
    const clear_win_poster = function clear_win_poster() {
        const layer = document.querySelector(".win-poster-layer");

        if (win_poster_timer !== null) {
            clearTimeout(win_poster_timer);
            win_poster_timer = null;
        }

        if (layer !== null) {
            layer.remove();
        }
    };

    /**
     * Plays the winner's video poster centred over the board.
     * @param {string} winner The winning player constant.
     * @returns {undefined}
     */
    const trigger_win_poster = function trigger_win_poster(winner) {
        const board_area = document.querySelector(".board-area");
        const frame = document.createElement("div");
        const layer = document.createElement("div");
        const source = (
            winner === config.player_thief
            ? config.thief_win_video
            : config.king_win_video
        );
        const video = document.createElement("video");
        let board_rect;
        let poster_size;

        if (board_area === null) {
            return;
        }

        clear_win_poster();

        layer.className = "win-poster-layer";
        layer.setAttribute("aria-hidden", "true");
        board_rect = board_area.getBoundingClientRect();
        poster_size = Math.min(board_rect.width * 0.64, 462);

        frame.className = "win-poster-frame is-loading";
        frame.style.maxWidth = String(board_rect.width * 0.75) + "px";
        frame.style.maxHeight = String(board_rect.height * 0.75) + "px";
        frame.style.width = String(poster_size) + "px";

        video.className = "win-poster-video";
        video.src = source;
        video.autoplay = true;
        video.muted = true;
        video.playsInline = true;
        video.preload = "auto";

        video.addEventListener(
            "loadedmetadata",
            function centre_loaded_poster() {
                let frame_width;
                let ratio;

                if (video.videoWidth === 0 || video.videoHeight === 0) {
                    return;
                }

                ratio = video.videoHeight / video.videoWidth;
                frame_width = Math.min(
                    poster_size,
                    board_rect.width * 0.75,
                    (board_rect.height * 0.75) / ratio
                );

                frame.style.width = String(frame_width) + "px";
                frame.style.removeProperty("height");
            },
            {once: true}
        );

        video.addEventListener(
            "loadeddata",
            function show_loaded_poster() {
                frame.classList.remove("is-loading");
            },
            {once: true}
        );

        frame.append(video);
        layer.append(frame);
        board_area.append(layer);

        if (video.readyState >= 2) {
            frame.classList.remove("is-loading");
        }

        video.addEventListener("ended", function remove_finished_poster() {
            layer.remove();
            win_poster_timer = null;
        }, {once: true});

        video.play().catch(function ignore_autoplay_block() {
            return undefined;
        });

        win_poster_timer = setTimeout(function remove_poster() {
            layer.remove();
            win_poster_timer = null;
        }, config.display_time);
    };

    return {
        clear_win_poster,
        trigger_win_poster
    };
};

export {createWinPosterController};
