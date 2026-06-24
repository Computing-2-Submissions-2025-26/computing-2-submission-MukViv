/*jslint browser*/

/**
 * Builds the controller for the win poster video.
 * @param {object} config Poster timing, players, and video paths.
 * @returns {object} Poster controls.
 */
function createWinPosterController(config) {
    let win_poster_timer = null;

    /**
     * Removes any win poster currently shown over the board.
     * @returns {undefined}
     */
    function clear_win_poster() {
        const layer = document.querySelector(".win-poster-layer");

        if (win_poster_timer !== null) {
            clearTimeout(win_poster_timer);
            win_poster_timer = null;
        }

        if (layer !== null) {
            layer.remove();
        }
    }

    /**
     * Shows the matching win poster video over the board.
     * @param {string} winner The player who won the game.
     * @returns {undefined}
     */
    function trigger_win_poster(winner) {
        const board_area = document.querySelector(".board-area");
        const layer = document.createElement("div");
        const frame = document.createElement("div");
        const video = document.createElement("video");
        const source = (
            winner === config.player_thief
            ? config.thief_win_video
            : config.king_win_video
        );

        if (board_area === null) {
            return;
        }

        clear_win_poster();

        layer.className = "win-poster-layer";
        layer.setAttribute("aria-hidden", "true");
        const board_rect = board_area.getBoundingClientRect();
        const poster_size = Math.min(board_rect.width * 0.64, 462);

        frame.className = "win-poster-frame";
        frame.style.maxWidth = String(board_rect.width * 0.75) + "px";
        frame.style.maxHeight = String(board_rect.height * 0.75) + "px";
        frame.style.visibility = "hidden";
        frame.style.width = String(poster_size) + "px";

        video.className = "win-poster-video";
        video.src = source;
        video.autoplay = true;
        video.muted = true;
        video.playsInline = true;
        video.preload = "auto";

        video.addEventListener("loadedmetadata", function centre_loaded_poster() {
            if (video.videoWidth === 0 || video.videoHeight === 0) {
                return;
            }

            const ratio = video.videoHeight / video.videoWidth;
            const frame_width = Math.min(
                poster_size,
                board_rect.width * 0.75,
                (board_rect.height * 0.75) / ratio
            );

            frame.style.width = String(frame_width) + "px";
            frame.style.removeProperty("height");
            frame.style.visibility = "visible";
        }, {once: true});

        frame.append(video);
        layer.append(frame);
        board_area.append(layer);

        video.addEventListener("ended", function hide_finished_poster() {
            layer.classList.add("is-leaving");
            win_poster_timer = setTimeout(function remove_finished_poster() {
                layer.remove();
                win_poster_timer = null;
            }, 250);
        }, {once: true});

        video.play().catch(function ignore_autoplay_block() {
            return undefined;
        });

        win_poster_timer = setTimeout(function remove_poster() {
            layer.remove();
            win_poster_timer = null;
        }, config.display_time);
    }

    return Object.freeze({
        clear_win_poster,
        trigger_win_poster
    });
}

export {createWinPosterController};
