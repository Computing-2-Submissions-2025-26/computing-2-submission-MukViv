/*jslint browser*/

/**
 * Builds the how-to-play pop up window for Chess Thieves.
 * @param {object} config DOM nodes and callbacks for the intro overlay.
 * @returns {object} Controls for opening, closing, and navigating the intro.
 */
function createIntroController(config) {
    const elements = config.elements;
    const total = elements.steps.length;
    let intro_index = 0;

    function is_open() {
        return !elements.overlay.classList.contains("is-hidden");
    }

    function build_intro_dots() {
        let i = 0;
        while (i < elements.dots.children.length) {
            elements.dots.children[i].className = (
                i === intro_index
                ? "intro-dot active"
                : "intro-dot"
            );
            i += 1;
        }
    }

    function render_intro_step() {
        const is_last = intro_index === total - 1;
        const current = elements.steps[intro_index];
        let i = 0;
        while (i < total) {
            elements.steps[i].classList.toggle("is-hidden", i !== intro_index);
            i += 1;
        }
        elements.back.disabled = intro_index === 0;
        elements.next.textContent = (
            is_last
            ? "Let's play"
            : "Next"
        );
        build_intro_dots();
        current.classList.remove("intro-step-enter");
        window.requestAnimationFrame(function reflow_step() {
            window.requestAnimationFrame(function add_enter() {
                current.classList.add("intro-step-enter");
            });
        });
    }

    function close_intro() {
        elements.overlay.classList.add("is-hidden");
        config.on_close();
    }

    function go_intro_next() {
        if (intro_index >= total - 1) {
            close_intro();
            return;
        }
        intro_index += 1;
        render_intro_step();
    }

    function go_intro_back() {
        if (intro_index === 0) {
            return;
        }
        intro_index -= 1;
        render_intro_step();
    }

    function show_intro() {
        intro_index = 0;
        render_intro_step();
        elements.overlay.classList.remove("is-hidden");
        config.on_visibility_change();
        elements.next.focus();
    }

    function handle_intro_keydown(event) {
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
    }

    return Object.freeze({
        close_intro,
        go_intro_back,
        go_intro_next,
        handle_intro_keydown,
        is_open,
        show_intro
    });
}

export {createIntroController};
