/*jslint browser*/
// Music: "Sneaky Snooper" by Audionautix (audionautix.com)
// Licensed under Creative Commons Attribution 4.0 International (CC BY 4.0)

import ChessThieves from "./game-logic.js";
const {
    BOARD_SIZE,
    MAX_BARRIERS,
    MAX_TURNS,
    PLAYER_KING,
    PLAYER_THIEF,
    create_new_game,
    get_square_label,
    is_valid_barrier_placement,
    is_valid_king_move,
    is_valid_thief_move,
    move_king,
    move_thief,
    pass_turn,
    place_barrier,
    roll_thief_die,
    set_thief_move
} = ChessThieves;
import {createAudioController} from "./audio.js";
import {createIntroController} from "./intro.js";
import createWinPosterController from "./win-poster.js";

const RESULT_DISPLAY_TIME = 900;
const ROLLING_ANIMATION_TIME = 2000;
const WIN_POSTER_DISPLAY_TIME = 5500;
const TURN_TIME_LIMIT = 20;
const MUSIC_SRC = "assets/audio/Sneaky Snooper - Audionautix.mp3";
const DICE_STATIONARY_IMAGE = "assets/images/dice_stationary_image.png";
const DICE_ROLL_GIF = "assets/video/dice_roll.gif";
const THIEF_WIN_VIDEO = "assets/video/escaped.mp4";
const KING_WIN_VIDEO = "assets/video/arrested.mp4";
const THIEF_WIN_SOUND = "assets/audio/laugh.mp3";
const KING_WIN_SOUND = "assets/audio/jail-sound.mp3";

const rollResultImageByMoveType = {
    bishop: "assets/images/roll-results/bishop.png",
    knight: "assets/images/roll-results/knight.png",
    pawn: "assets/images/roll-results/pawn.png",
    queen: "assets/images/roll-results/queen.png",
    rook: "assets/images/roll-results/rook.png"
};

const thiefImageByMoveType = {
    bishop: "assets/characters/thief-bishop.png",
    knight: "assets/characters/thief-knight.png",
    pawn: "assets/characters/thief-pawn.png",
    queen: "assets/characters/thief-queen.png",
    rook: "assets/characters/thief-rook.png"
};
const THIEF_SACK_IMAGE = "assets/characters/thief-sack.png";
const KING_IMAGE = "assets/characters/king.png";
const BARRIER_IMAGE = "assets/images/traffic-barrier.png";
const POLICE_CAR_IMAGE = "assets/images/police-car.png";

const board_element = document.querySelector("#board");
const turn_element = document.querySelector("#turn");
const timer_element = document.querySelector("#timer");
const die_element = document.querySelector("#die");
const barrier_element = document.querySelector("#barriers");
const message_element = document.querySelector("#message");
const result_element = document.querySelector("#result");
const move_button = document.querySelector("#king-move");
const barrier_button = document.querySelector("#king-barrier");
const skip_turn_button = document.querySelector("#skip-turn");
const restart_button = document.querySelector("#restart");
const how_to_play_button = document.querySelector("#how-to-play");
const bg_music = document.querySelector("#bg-music");
const dice_button = document.querySelector("#dice-button");
const dice_button_image = document.querySelector("#dice-button-image");
const dice_stage = document.querySelector("#dice-stage");
const dice_roll_image = document.querySelector("#dice-roll-image");
const dice_result_image = document.querySelector("#dice-result-image");
const dice_live_element = document.querySelector("#dice-live");
const intro_overlay = document.querySelector("#intro-overlay");
const intro_steps = document.querySelectorAll(".intro-step");
const intro_dots = document.querySelector("#intro-dots");
const intro_back = document.querySelector("#intro-back");
const intro_next = document.querySelector("#intro-next");
const intro_skip = document.querySelector("#intro-skip");

const audio_controller = createAudioController({
    barrier_src: "assets/audio/police.mp3",
    bg_music,
    king_win_src: KING_WIN_SOUND,
    move_src: "assets/audio/chess sound.mp3",
    music_src: MUSIC_SRC,
    player_thief: PLAYER_THIEF,
    thief_win_src: THIEF_WIN_SOUND
});

const win_poster_controller = createWinPosterController({
    display_time: WIN_POSTER_DISPLAY_TIME,
    king_win_video: KING_WIN_VIDEO,
    player_thief: PLAYER_THIEF,
    thief_win_video: THIEF_WIN_VIDEO
});

const intro_controller = createIntroController({
    elements: {
        back: intro_back,
        dots: intro_dots,
        next: intro_next,
        overlay: intro_overlay,
        steps: intro_steps
    },
    on_close: function intro_closed() {
        start_audio();
        render_timer();
        focus_cursor_square();
    },
    on_visibility_change: function intro_visibility_changed() {
        render_timer();
    }
});

let game = create_new_game();
let cursor = {
    row: game.thief.row,
    column: game.thief.column
};
let king_action = "move";
let isDiceAnimationPlaying = false;
let pendingRolledMoveType = null;
let diceAnimationTimer = null;
let diceResultTimer = null;
let pending_glide = null;
let celebration_shown = false;
let turn_seconds_left = TURN_TIME_LIMIT;
let turn_timer_id = null;
let last_turn_key = "";

function render() {
    render_board();
    render_status();
    render_dice_button();
    maybe_celebrate();
    sync_turn_timer();
}
function render_board() {
    board_element.innerHTML = "";

    const tbody = document.createElement("tbody");

    tbody.setAttribute("role", "rowgroup");

    let row = 0;

    while (row < BOARD_SIZE) {
        const tr = document.createElement("tr");

        tr.setAttribute("role", "row");

        let column = 0;

        while (column < BOARD_SIZE) {
            const td = document.createElement("td");
            const square = document.createElement("button");
            const label = get_square_label(game, row, column);
            const display_label = square_display_label(label);
            const legal_action = legal_action_for_square(row, column);

            td.setAttribute("role", "gridcell");

            square.type = "button";
            square.className = square_class(row, column, label, legal_action);
            square.dataset.row = String(row);
            square.dataset.column = String(column);
            square.setAttribute(
                "aria-label",
                "Row " + String(row + 1) + ", column " + String(column + 1)
                + ": " + display_label + legal_label(legal_action)
            );
            square.title = display_label + legal_label(legal_action);
            square.tabIndex = 0;
            add_square_content(square, label);
            square.addEventListener("click", select_square);
            square.addEventListener("focus", focus_square);

            td.append(square);
            tr.append(td);
            column += 1;
        }

        tbody.append(tr);
        row += 1;
    }

    board_element.append(tbody);

    if (pending_glide !== null) {
        animate_piece_glide(pending_glide);
        pending_glide = null;
    }
}
function render_status() {
    const winner = game.winner;
    const current_turn = (
        game.current_player === PLAYER_THIEF
        ? "Thief"
        : "King"
    );
    const turn_number = String(Math.min(game.turn_count, MAX_TURNS));
    const max_turns = String(MAX_TURNS);
    let turn_text;

    if (winner === null) {
        turn_text = current_turn + " - turn " + turn_number;
    } else {
        turn_text = "Game ended on turn " + turn_number;
    }

    turn_element.textContent = turn_text + " of " + max_turns;
    die_element.textContent = (
        game.current_player === PLAYER_THIEF
        ? screen_reader_dice_text()
        : "Thief move waiting for next roll"
    );
    const barrier_count = String(game.barriers.length);

    barrier_element.textContent = (
        "Police cars: " + barrier_count + " of " + String(MAX_BARRIERS)
    );

    const disable_king_controls = (
        game.current_player !== PLAYER_KING
        || winner !== null
    );

    move_button.disabled = disable_king_controls;
    barrier_button.disabled = disable_king_controls;
    skip_turn_button.disabled = !can_skip_turn();
    dice_button.setAttribute("aria-keyshortcuts", "R");
    move_button.setAttribute("aria-keyshortcuts", "K");
    barrier_button.setAttribute("aria-keyshortcuts", "P");
    skip_turn_button.setAttribute("aria-keyshortcuts", "L");
    restart_button.setAttribute("aria-keyshortcuts", "N");
    how_to_play_button.setAttribute("aria-keyshortcuts", "H");
    move_button.setAttribute(
        "aria-pressed",
        String(!disable_king_controls && king_action === "move")
    );
    barrier_button.setAttribute(
        "aria-pressed",
        String(!disable_king_controls && king_action === "barrier")
    );

    if (winner === PLAYER_THIEF) {
        result_element.textContent = (
            "The Thief escaped with the magical pieces."
        );
    } else if (winner === PLAYER_KING) {
        result_element.textContent = "The King recovered the stolen pieces.";
    } else {
        result_element.textContent = "No winner yet.";
    }
}
function render_dice_button() {
    dice_button.classList.toggle(
        "is-hidden",
        !should_show_dice_button()
    );
}
function should_show_dice_button() {
    return (
        game.current_player === PLAYER_THIEF
        && game.thief_move === null
        && game.winner === null
        && !isDiceAnimationPlaying
    );
}
function select_square(event) {
    const row = Number(event.currentTarget.dataset.row);
    const column = Number(event.currentTarget.dataset.column);

    cursor = {row, column};
    play_selected_square(row, column);
}
function focus_square(event) {
    cursor = {
        row: Number(event.currentTarget.dataset.row),
        column: Number(event.currentTarget.dataset.column)
    };
}
function play_selected_square(row, column) {
    let next_game = null;

    if (game.winner !== null) {
        message_element.textContent = "Start a new game to play again.";
        render();
        return;
    }

    if (game.current_player === PLAYER_THIEF) {
        if (game.thief_move === null) {
            message_element.textContent = "Roll the movement dice first.";
            render();
            return;
        }

        next_game = move_thief(game, row, column);
    } else if (king_action === "move") {
        next_game = move_king(game, row, column);
    } else {
        next_game = place_barrier(game, row, column);
    }

    if (next_game === null) {
        message_element.textContent = invalid_message(row, column);
    } else {
        const moved_piece = (
            game.current_player === PLAYER_THIEF
            || king_action === "move"
        );

        if (game.current_player === PLAYER_THIEF) {
            pending_glide = {
                from: {row: game.thief.row, column: game.thief.column},
                to: {row, column}
            };
        } else if (king_action === "move") {
            pending_glide = {
                from: {row: game.king.row, column: game.king.column},
                to: {row, column}
            };
        }

        game = next_game;
        cursor = next_cursor();
        message_element.textContent = success_message();

        if (game.winner === null) {
            if (moved_piece) {
                audio_controller.sound_move();
            } else {
                audio_controller.sound_barrier();
            }
        }
    }

    render();
    focus_cursor_square();
}
function move_cursor(row_change, column_change) {
    cursor = {
        row: clamp(cursor.row + row_change, 0, BOARD_SIZE - 1),
        column: clamp(cursor.column + column_change, 0, BOARD_SIZE - 1)
    };
    render();
    focus_cursor_square();
}
function handle_keydown(event) {
    const key = event.key.toLowerCase();
    const target = event.target;
    const focused_square = (
        target !== null
        && target.dataset !== undefined
        && target.dataset.row !== undefined
        && target.dataset.column !== undefined
    );

    if (event.key === "ArrowUp" || key === "w") {
        event.preventDefault();
        move_cursor(-1, 0);
    } else if (event.key === "ArrowDown" || key === "s") {
        event.preventDefault();
        move_cursor(1, 0);
    } else if (event.key === "ArrowLeft" || key === "a") {
        event.preventDefault();
        move_cursor(0, -1);
    } else if (event.key === "ArrowRight" || key === "d") {
        event.preventDefault();
        move_cursor(0, 1);
    } else if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        if (focused_square) {
            play_selected_square(
                Number(target.dataset.row),
                Number(target.dataset.column)
            );
        } else {
            play_selected_square(cursor.row, cursor.column);
        }
    } else if (key === "r") {
        event.preventDefault();
        handleDiceRollRequest();
    }
}
function handle_global_shortcuts(event) {
    const key = event.key.toLowerCase();

    if (
        event.altKey
        || event.ctrlKey
        || event.metaKey
        || intro_controller.is_open()
    ) {
        return;
    }

    if (key === "r") {
        event.preventDefault();
        handleDiceRollRequest();
    } else if (key === "n") {
        event.preventDefault();
        restart_game();
    } else if (key === "h") {
        event.preventDefault();
        intro_controller.show_intro();
    } else if (key === "l" && can_skip_turn()) {
        event.preventDefault();
        skip_turn();
    } else if (key === "k" && king_controls_available()) {
        event.preventDefault();
        choose_king_move();
    } else if (key === "p" && king_controls_available()) {
        event.preventDefault();
        choose_barrier();
    }
}
function king_controls_available() {
    return (
        game.current_player === PLAYER_KING
        && game.winner === null
    );
}
function can_skip_turn() {
    return (
        game.winner === null
        && !isDiceAnimationPlaying
    );
}
function restart_game() {
    game = create_new_game();
    king_action = "move";
    isDiceAnimationPlaying = false;
    pendingRolledMoveType = null;
    pending_glide = null;
    celebration_shown = false;
    win_poster_controller.clear_win_poster();
    turn_seconds_left = TURN_TIME_LIMIT;
    last_turn_key = "";
    clear_dice_result_timer();
    hide_dice_stage();
    cursor = {row: game.thief.row, column: game.thief.column};
    message_element.textContent = "The Thief rolls first.";
    dice_live_element.textContent = "";
    render();
    focus_cursor_square();
    audio_controller.start_music();
}
function skip_turn() {
    if (!can_skip_turn()) {
        return;
    }

    const message = skip_message();
    const next_game = pass_turn(game);

    if (next_game !== null) {
        game = next_game;
        king_action = "move";
        cursor = next_cursor();
        message_element.textContent = message;
        dice_live_element.textContent = message;
    }

    render();
    focus_cursor_square();
}
function createDiceButton() {
    dice_button_image.src = DICE_STATIONARY_IMAGE;
    dice_button.setAttribute("aria-label", "Roll movement dice");
    dice_button.addEventListener("click", handleDiceRollRequest);
    dice_button.addEventListener("keydown", handleDiceButtonKeydown);
}
function handleDiceButtonKeydown(event) {
    if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        handleDiceRollRequest();
    }
}
function handleDiceRollRequest() {
    if (isDiceAnimationPlaying || !should_show_dice_button()) {
        return;
    }

    audio_controller.sound_dice();

    const move_type = getRandomMoveType();

    isDiceAnimationPlaying = true;
    pendingRolledMoveType = move_type;
    dice_live_element.textContent = "The Thief is rolling the movement dice.";
    message_element.textContent = "Rolling...";
    render();
    playDiceRollAnimation(move_type);
}
function playDiceRollAnimation(move_type) {
    hide_rolled_piece_image();
    clear_dice_animation_timer();
    dice_stage.classList.remove("is-hidden");
    dice_stage.setAttribute("aria-hidden", "true");
    dice_roll_image.classList.remove("is-hidden");
    dice_roll_image.src = DICE_ROLL_GIF + "?roll=" + String(Date.now());
    diceAnimationTimer = setTimeout(function finish_gif_animation() {
        showRolledPieceImage(move_type);
    }, ROLLING_ANIMATION_TIME);
}
function showRolledPieceImage(move_type) {
    if (pendingRolledMoveType === null || move_type === null) {
        return;
    }

    const image_path = rollResultImageByMoveType[move_type];

    clear_dice_animation_timer();
    dice_roll_image.classList.add("is-hidden");
    dice_result_image.src = image_path;
    dice_result_image.classList.remove("is-hidden");
    dice_live_element.textContent = "The Thief rolled " + move_type + ".";
    clear_dice_result_timer();
    diceResultTimer = setTimeout(function finish_after_delay() {
        finishDiceRoll(move_type);
    }, RESULT_DISPLAY_TIME);
}
function finishDiceRoll(move_type) {
    const next_game = set_thief_move(game, move_type);

    if (next_game !== null) {
        game = next_game;
    }

    isDiceAnimationPlaying = false;
    pendingRolledMoveType = null;
    clear_dice_result_timer();
    hide_dice_stage();
    message_element.textContent = "Choose a glowing square.";
    render();
    focus_cursor_square();
}
function getRandomMoveType() {
    return roll_thief_die();
}
function clamp(value, minimum, maximum) {
    return Math.max(minimum, Math.min(value, maximum));
}
function focus_cursor_square() {
    const row_selector = "[data-row='" + String(cursor.row) + "']";
    const column_selector = "[data-column='" + String(cursor.column) + "']";
    const selector = row_selector + column_selector;
    const square = board_element.querySelector(
        selector
    );

    if (square !== null) {
        square.focus();
    }
}
function invalid_message(row, column) {
    if (game.current_player === PLAYER_THIEF) {
        if (
            row === game.king.row
            && column === game.king.column
        ) {
            return "Are you trying to get caught or something?";
        }

        return "That square is not legal for the current thief move.";
    }

    if (king_action === "barrier") {
        return "That police car cannot be placed there.";
    }

    return (
        "The King can only move one square and cannot move through police cars."
    );
}
function next_cursor() {
    if (game.current_player === PLAYER_THIEF) {
        return {row: game.thief.row, column: game.thief.column};
    }

    return {row: game.king.row, column: game.king.column};
}
function legal_action_for_square(row, column) {
    const position = {row, column};

    if (game.winner !== null) {
        return null;
    }

    if (
        game.current_player === PLAYER_THIEF
        && game.thief_move !== null
        && is_valid_thief_move(game, game.thief_move, game.thief, position)
    ) {
        return "move";
    }

    if (
        game.current_player === PLAYER_KING
        && king_action === "move"
        && is_valid_king_move(game, position)
    ) {
        return "move";
    }

    if (
        game.current_player === PLAYER_KING
        && king_action === "barrier"
        && is_valid_barrier_placement(game, position)
    ) {
        return "barrier";
    }

    return null;
}
function legal_label(legal_action) {
    if (legal_action === "move") {
        return ". Legal move";
    }

    if (legal_action === "barrier") {
        return ". Legal police car placement";
    }

    return "";
}
function square_display_label(label) {
    return label;
}
function square_class(row, column, label, legal_action) {
    const classes = [
        "square",
        (
            (row + column) % 2 === 0
            ? "light"
            : "dark"
        ),
        label.toLowerCase().replaceAll(" ", "-")
    ];

    if (square_is_cursor(row, column)) {
        classes.push("cursor");
    }

    if (legal_action === "move") {
        classes.push("legal-move");
        classes.push(
            game.current_player === PLAYER_THIEF
            ? "legal-move-thief"
            : "legal-move-king"
        );
    }

    if (legal_action === "barrier") {
        classes.push("legal-barrier");
    }

    return classes.join(" ");
}
function square_is_cursor(row, column) {
    return cursor.row === row && cursor.column === column;
}
function add_square_content(square, label) {
    const image_path = square_image(label);

    square.textContent = "";

    if (image_path !== null) {
        const image = document.createElement("img");

        image.className = "piece-image";
        image.src = image_path;
        image.alt = "";
        image.setAttribute("aria-hidden", "true");
        square.append(image);
    } else {
        square.textContent = square_text(label);
    }
}
function square_image(label) {
    if (label === "Thief" || label === "Thief at the Exit") {
        if (game.current_player === PLAYER_KING || game.thief_move === null) {
            return THIEF_SACK_IMAGE;
        }

        return thiefImageByMoveType[game.thief_move] || THIEF_SACK_IMAGE;
    }

    if (label === "King" || label === "King caught the Thief") {
        return KING_IMAGE;
    }

    if (label === "Barrier") {
        return BARRIER_IMAGE;
    }

    if (label === "Police Car") {
        return POLICE_CAR_IMAGE;
    }

    return null;
}
function square_text(label) {
    if (label === "Thief") {
        return "T";
    }

    if (label === "King") {
        return "K";
    }

    if (label === "Exit") {
        return "EXIT";
    }

    if (label === "Barrier") {
        return "";
    }

    if (label === "Police Car") {
        return "CAR";
    }

    if (label === "Thief at the Exit") {
        return "T EXIT";
    }

    if (label === "King caught the Thief") {
        return "K T";
    }

    return "";
}
function success_message() {
    if (game.winner === PLAYER_THIEF) {
        return "The Thief reached the exit.";
    }

    if (game.winner === PLAYER_KING) {
        return "The King has stopped the escape.";
    }

    if (game.current_player === PLAYER_THIEF) {
        return "The King has acted. The Thief can roll the dice.";
    }

    return "The Thief moved. The King may move or place a police car.";
}
function clear_dice_result_timer() {
    if (diceResultTimer !== null) {
        clearTimeout(diceResultTimer);
        diceResultTimer = null;
    }
}
function clear_dice_animation_timer() {
    if (diceAnimationTimer !== null) {
        clearTimeout(diceAnimationTimer);
        diceAnimationTimer = null;
    }
}
function hide_dice_stage() {
    dice_stage.classList.add("is-hidden");
    clear_dice_animation_timer();
    dice_roll_image.classList.add("is-hidden");
    hide_rolled_piece_image();
}
function hide_rolled_piece_image() {
    dice_result_image.classList.add("is-hidden");
    dice_result_image.removeAttribute("src");
}
function screen_reader_dice_text() {
    if (game.thief_move === null) {
        return "The Thief needs to roll the movement dice.";
    }

    return "The Thief rolled " + game.thief_move + ".";
}
function choose_king_move() {
    king_action = "move";
    message_element.textContent = "King action: move one square.";
    render();
    focus_cursor_square();
}
function choose_barrier() {
    king_action = "barrier";
    message_element.textContent = (
        "King action: choose an empty square for a police car."
    );
    render();
    focus_cursor_square();
}
function prefers_reduced_motion() {
    return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}
function animate_piece_glide(glide) {
    if (prefers_reduced_motion()) {
        return;
    }

    const from_selector = (
        "[data-row='" + String(glide.from.row) + "']"
        + "[data-column='" + String(glide.from.column) + "']"
    );
    const to_selector = (
        "[data-row='" + String(glide.to.row) + "']"
        + "[data-column='" + String(glide.to.column) + "']"
    );
    const from_square = board_element.querySelector(from_selector);
    const to_square = board_element.querySelector(to_selector);

    if (from_square === null || to_square === null) {
        return;
    }

    const piece = to_square.querySelector(".piece-image");

    if (piece === null) {
        return;
    }

    const from_rect = from_square.getBoundingClientRect();
    const to_rect = to_square.getBoundingClientRect();
    const offset_x = from_rect.left - to_rect.left;
    const offset_y = from_rect.top - to_rect.top;

    to_square.style.zIndex = "10";
    piece.style.transition = "none";
    piece.style.transform = (
        "translate(" + String(offset_x) + "px, " + String(offset_y) + "px)"
    );

    piece.addEventListener("transitionend", function clear_glide() {
        piece.style.transition = "";
        piece.style.transform = "";
        to_square.style.zIndex = "";
    }, {once: true});

    requestAnimationFrame(function before_glide() {
        requestAnimationFrame(function start_glide() {
            piece.style.transition = (
                "transform 340ms cubic-bezier(0.22, 0.61, 0.36, 1)"
            );
            piece.style.transform = "translate(0, 0)";
        });
    });
}
function maybe_celebrate() {
    if (game.winner !== null && !celebration_shown) {
        celebration_shown = true;
        audio_controller.stop_music();
        win_poster_controller.trigger_win_poster(game.winner);
        audio_controller.sound_poster_thump();
        audio_controller.sound_victor(game.winner);
    }
}
function turn_decision_key() {
    if (game.winner !== null) {
        return "ended";
    }

    if (game.current_player === PLAYER_THIEF) {
        return "thief";
    }

    return "king";
}
function render_timer() {
    timer_element.textContent = "";
    timer_element.classList.remove("is-low");

    if (game.winner !== null || intro_controller.is_open()) {
        return;
    }

    const who = (
        game.current_player === PLAYER_THIEF
        ? "Thief"
        : "King"
    );
    const minutes = Math.floor(turn_seconds_left / 60);
    const seconds = turn_seconds_left % 60;
    const padded = (
        seconds < 10
        ? "0" + String(seconds)
        : String(seconds)
    );

    const label = document.createElement("span");
    const time = document.createElement("span");

    label.className = "timer-label";
    label.textContent = who + " to move";
    time.className = "timer-time";
    time.textContent = String(minutes) + ":" + padded;

    timer_element.append(label, time);
    timer_element.classList.toggle("is-low", turn_seconds_left <= 5);
}
function sync_turn_timer() {
    const key = turn_decision_key();

    if (key !== last_turn_key) {
        last_turn_key = key;
        turn_seconds_left = TURN_TIME_LIMIT;
    }

    render_timer();
}
function handle_turn_tick() {
    if (
        game.winner !== null
        || intro_controller.is_open()
        || isDiceAnimationPlaying
    ) {
        render_timer();
        return;
    }

    turn_seconds_left -= 1;

    if (turn_seconds_left <= 0) {
        turn_seconds_left = 0;
        handle_turn_timeout();
        return;
    }

    if (turn_seconds_left <= 10) {
        audio_controller.sound_tick(turn_seconds_left <= 5);
    }

    render_timer();
}
function handle_turn_timeout() {
    const message = timeout_message();
    const next_game = pass_turn(game);

    if (next_game !== null) {
        game = next_game;
        king_action = "move";
        cursor = next_cursor();
        message_element.textContent = message;
        dice_live_element.textContent = message;
    }

    render();
    focus_cursor_square();
}
function timeout_message() {
    if (game.current_player === PLAYER_THIEF) {
        return "The Thief ran out of time. The Thief's turn was skipped.";
    }

    return "The King ran out of time. The King's turn was skipped.";
}
function skip_message() {
    if (game.current_player === PLAYER_THIEF) {
        return "The Thief skipped their turn.";
    }

    return "The King skipped their turn.";
}
function start_turn_timer() {
    if (turn_timer_id !== null) {
        clearInterval(turn_timer_id);
    }

    turn_timer_id = setInterval(handle_turn_tick, 1000);
}
function start_audio() {
    audio_controller.start_audio(game.winner === null);
}

board_element.addEventListener("keydown", handle_keydown);
document.addEventListener("keydown", handle_global_shortcuts);
move_button.addEventListener("click", choose_king_move);
barrier_button.addEventListener("click", choose_barrier);
skip_turn_button.addEventListener("click", skip_turn);
restart_button.addEventListener("click", restart_game);
how_to_play_button.addEventListener("click", intro_controller.show_intro);
intro_next.addEventListener("click", intro_controller.go_intro_next);
intro_back.addEventListener("click", intro_controller.go_intro_back);
intro_skip.addEventListener("click", intro_controller.close_intro);
intro_overlay.addEventListener("keydown", intro_controller.handle_intro_keydown);
document.addEventListener("pointerdown", start_audio);
document.addEventListener("keydown", start_audio);
bg_music.volume = 0.08;

createDiceButton();
render();
intro_controller.show_intro();
start_turn_timer();
start_audio();
