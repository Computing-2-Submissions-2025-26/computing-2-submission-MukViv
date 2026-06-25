/*jslint browser*/
/*global requestAnimationFrame*/
//This file is for controlling the the pop up tutorial instructions

/**
 * Builds the how-to-play pop up window for Chess Thieves.
 * @param {object} config DOM nodes and callbacks for the intro overlay.
 * @returns {object} Controls for opening, closing, and navigating the intro.
 */
const createIntroController = function createIntroController(config) {
    const elements = config.elements;
    const steps = Array.from(elements.overlay.querySelectorAll(".intro-step"));
    let intro_index = 0;

    /**
     * Reports whether the how-to-play overlay is currently visible.
     * @returns {boolean} True when the intro is open.
     */
    const is_open = function is_open() {
        return !elements.overlay.classList.contains("is-hidden");
    };

    /**
     * Builds the progress dots for the current intro step.
     * @returns {undefined}
     */
    const build_intro_dots = function build_intro_dots() {
        let i = 0;

        elements.dots.textContent = "";

        while (i < steps.length) {
            const dot = document.createElement("span");

            dot.className = (
                i === intro_index
                ? "intro-dot active"
                : "intro-dot"
            );
            elements.dots.append(dot);
            i += 1;
        }
    };

    /**
     * Shows the current how-to-play step and replays its entrance animation.
     * @returns {undefined}
     */
    const render_intro_step = function render_intro_step() {
        const current_step = steps[intro_index];
        const current_title = current_step.querySelector(".intro-title");
        const is_last = intro_index === steps.length - 1;

        steps.forEach(function toggle_intro_step(step, index) {
            step.classList.toggle("is-hidden", index !== intro_index);
            step.setAttribute("aria-hidden", String(index !== intro_index));
            step.classList.remove("intro-step-enter");
        });
        if (current_title !== null && current_title.id !== "") {
            elements.overlay.setAttribute("aria-labelledby", current_title.id);
        }

        elements.back.disabled = intro_index === 0;
        elements.next.textContent = (
            is_last
            ? "Let's play"
            : "Next"
        );
        build_intro_dots();

        requestAnimationFrame(function reflow_step() {
            requestAnimationFrame(function add_enter() {
                current_step.classList.add("intro-step-enter");
            });
        });
    };

    /**
     * Closes the how-to-play intro and returns focus to the board.
     * @returns {undefined}
     */
    const close_intro = function close_intro() {
        elements.overlay.classList.add("is-hidden");
        config.on_close();
    };

    /**
     * Advances the intro, or closes it on the final step.
     * @returns {undefined}
     */
    const go_intro_next = function go_intro_next() {
        if (intro_index >= steps.length - 1) {
            close_intro();
            return;
        }

        intro_index += 1;
        render_intro_step();
    };

    /**
     * Steps the intro back to the previous rule.
     * @returns {undefined}
     */
    const go_intro_back = function go_intro_back() {
        if (intro_index === 0) {
            return;
        }

        intro_index -= 1;
        render_intro_step();
    };

    /**
     * Opens the how-to-play intro at the first step.
     * @returns {undefined}
     */
    const show_intro = function show_intro() {
        intro_index = 0;
        render_intro_step();
        elements.overlay.classList.remove("is-hidden");
        config.on_visibility_change();
        elements.next.focus();
    };

    /**
     * Handles keyboard shortcuts while the intro is open.
     * @param {KeyboardEvent} event The keyboard event.
     * @returns {undefined}
     */
    const handle_intro_keydown = function handle_intro_keydown(event) {
        if (event.key === "Escape") {
            event.preventDefault();
            close_intro();
        } else if (event.key === "ArrowRight") {
            event.preventDefault();
            go_intro_next();
        } else if (event.key === "ArrowLeft") {
            event.preventDefault();
            go_intro_back();
        }
    };

    return Object.freeze({
        close_intro,
        go_intro_back,
        go_intro_next,
        handle_intro_keydown,
        is_open,
        show_intro
    });
};

export {createIntroController};
