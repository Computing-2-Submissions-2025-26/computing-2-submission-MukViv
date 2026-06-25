// Music: "Sneaky Snooper" by Audionautix (audionautix.com)
// Licensed under Creative Commons Attribution 4.0 International (CC BY 4.0)

import ChessThieves from "./game-logic.js";
// Short aliases for the game module API.
const {
    BOARD_SIZE,
    MAX_POLICE_CARS,
    MAX_TURNS,
    PLAYER_KING,
    PLAYER_THIEF,
    create_new_game,
    is_valid_police_car_placement,
    is_valid_king_move,
    is_valid_thief_move,
    move_king,
    move_thief,
    pass_turn,
    place_police_car,
    roll_thief_die,
    set_thief_move
} = ChessThieves;
import {createAudioController} from "./audio.js";
import {createIntroController} from "./intro.js";
import {createWinPosterController} from "./win-poster.js";

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

const roll_result_image_by_move_type = {
    bishop: "assets/images/roll-results/bishop.png",
    knight: "assets/images/roll-results/knight.png",
    pawn: "assets/images/roll-results/pawn.png",
    queen: "assets/images/roll-results/queen.png",
    rook: "assets/images/roll-results/rook.png"
};

const thief_image_by_move_type = {
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
const police_cars_element = document.querySelector("#police-cars");
const message_element = document.querySelector("#message");
const result_element = document.querySelector("#result");
const move_button = document.querySelector("#king-move");
const police_car_button = document.querySelector("#king-police-car");
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
const intro_dots = document.querySelector("#intro-dots");
const intro_back = document.querySelector("#intro-back");
const intro_next = document.querySelector("#intro-next");
const intro_skip = document.querySelector("#intro-skip");

let game = create_new_game();
let cursor = {
    row: game.thief.row,
    column: game.thief.column
};
let king_action = "move";
let is_dice_animation_playing = false;
let pending_rolled_move_type = null;
let dice_animation_timer = null;
let dice_result_timer = null;
let pending_glide = null;
let celebration_shown = false;
let turn_seconds_left = TURN_TIME_LIMIT;
let turn_timer_id = null;
let last_turn_key = "";

let render;
let render_board;
let render_status;
let render_dice_button;
let should_show_dice_button;
let select_square;
let focus_square;
let play_selected_square;
let move_cursor;
let handle_keydown;
let handle_global_shortcuts;
let king_controls_available;
let can_skip_turn;
let restart_game;
let apply_pass;
let skip_turn;
let create_dice_button;
let handle_dice_button_keydown;
let handle_dice_roll_request;
let play_dice_roll_animation;
let show_rolled_piece_image;
let finish_dice_roll;
let clamp;
let focus_cursor_square;
let invalid_message;
let next_cursor;
let legal_action_for_square;
let legal_label;
let square_label;
let square_class;
let square_is_cursor;
let add_square_content;
let square_image;
let square_text;
let success_message;
let clear_dice_result_timer;
let clear_dice_animation_timer;
let hide_dice_stage;
let hide_rolled_piece_image;
let screen_reader_dice_text;
let choose_king_move;
let choose_police_car;
let animate_piece_glide;
let maybe_celebrate;
let prefers_reduced_motion;
let turn_decision_key;
let render_timer;
let sync_turn_timer;
let handle_turn_tick;
let handle_turn_timeout;
let start_turn_timer;
let timeout_message;
let skip_message;
let start_audio;

const audio_controller = createAudioController({
    bg_music,
    king_win_src: KING_WIN_SOUND,
    move_src: "assets/audio/chess sound.mp3",
    music_src: MUSIC_SRC,
    police_car_src: "assets/audio/police.mp3",
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
        overlay: intro_overlay
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

render = function render() {
    render_board();
    render_status();
    render_dice_button();
    maybe_celebrate();
    sync_turn_timer();
};
render_board = function render_board() {
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
            const label = square_label(row, column);
            const legal_action = legal_action_for_square(row, column);

            td.setAttribute("role", "gridcell");

            square.type = "button";
            square.className = square_class(row, column, label, legal_action);
            square.dataset.row = String(row);
            square.dataset.column = String(column);
            square.setAttribute(
                "aria-label",
                "Row " + String(row + 1) + ", column " + String(column + 1)
                + ": " + label + legal_label(legal_action)
            );
            square.title = label + legal_label(legal_action);
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
};
render_status = function render_status() {
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
    const police_car_count = String(game.police_cars.length);

    police_cars_element.textContent = (
        "Police cars: " + police_car_count + " of "
        + String(MAX_POLICE_CARS)
    );

    const disable_king_controls = (
        game.current_player !== PLAYER_KING
        || winner !== null
    );

    move_button.disabled = disable_king_controls;
    police_car_button.disabled = disable_king_controls;
    skip_turn_button.disabled = !can_skip_turn();
    move_button.setAttribute(
        "aria-pressed",
        String(!disable_king_controls && king_action === "move")
    );
    police_car_button.setAttribute(
        "aria-pressed",
        String(!disable_king_controls && king_action === "police_car")
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
};
render_dice_button = function render_dice_button() {
    dice_button.classList.toggle(
        "is-hidden",
        !should_show_dice_button()
    );
};
should_show_dice_button = function should_show_dice_button() {
    return (
        game.current_player === PLAYER_THIEF
        && game.thief_move === null
        && game.winner === null
        && !is_dice_animation_playing
    );
};
select_square = function select_square(event) {
    const row = Number(event.currentTarget.dataset.row);
    const column = Number(event.currentTarget.dataset.column);

    cursor = {row, column};
    play_selected_square(row, column);
};
focus_square = function focus_square(event) {
    cursor = {
        row: Number(event.currentTarget.dataset.row),
        column: Number(event.currentTarget.dataset.column)
    };
};
play_selected_square = function play_selected_square(row, column) {
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

        next_game = move_thief(game, {row, column});
    } else if (king_action === "move") {
        next_game = move_king(game, {row, column});
    } else {
        next_game = place_police_car(game, {row, column});
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
                audio_controller.sound_police_car();
            }
        }
    }

    render();
    focus_cursor_square();
};
move_cursor = function move_cursor(row_change, column_change) {
    cursor = {
        row: clamp(cursor.row + row_change, 0, BOARD_SIZE - 1),
        column: clamp(cursor.column + column_change, 0, BOARD_SIZE - 1)
    };
    render();
    focus_cursor_square();
};
handle_keydown = function handle_keydown(event) {
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
        handle_dice_roll_request();
    }
};
handle_global_shortcuts = function handle_global_shortcuts(event) {
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
        handle_dice_roll_request();
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
        choose_police_car();
    }
};
king_controls_available = function king_controls_available() {
    return (
        game.current_player === PLAYER_KING
        && game.winner === null
    );
};
can_skip_turn = function can_skip_turn() {
    return (
        game.winner === null
        && !is_dice_animation_playing
    );
};
restart_game = function restart_game() {
    game = create_new_game();
    king_action = "move";
    is_dice_animation_playing = false;
    pending_rolled_move_type = null;
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
};
apply_pass = function apply_pass(message) {
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
};
skip_turn = function skip_turn() {
    if (!can_skip_turn()) {
        return;
    }

    apply_pass(skip_message());
};
create_dice_button = function create_dice_button() {
    dice_button_image.src = DICE_STATIONARY_IMAGE;
    dice_button.setAttribute("aria-label", "Roll movement dice");
    dice_button.addEventListener("click", handle_dice_roll_request);
    dice_button.addEventListener("keydown", handle_dice_button_keydown);
};
handle_dice_button_keydown = function handle_dice_button_keydown(event) {
    if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        handle_dice_roll_request();
    }
};
handle_dice_roll_request = function handle_dice_roll_request() {
    if (is_dice_animation_playing || !should_show_dice_button()) {
        return;
    }

    audio_controller.sound_dice();

    const move_type = roll_thief_die();

    is_dice_animation_playing = true;
    pending_rolled_move_type = move_type;
    dice_live_element.textContent = "The Thief is rolling the movement dice.";
    message_element.textContent = "Rolling...";
    render();
    play_dice_roll_animation(move_type);
};
play_dice_roll_animation = function play_dice_roll_animation(move_type) {
    hide_rolled_piece_image();
    clear_dice_animation_timer();
    dice_stage.classList.remove("is-hidden");
    dice_stage.setAttribute("aria-hidden", "true");
    dice_roll_image.classList.remove("is-hidden");
    dice_roll_image.src = DICE_ROLL_GIF + "?roll=" + String(Date.now());
    dice_animation_timer = setTimeout(function finish_gif_animation() {
        show_rolled_piece_image(move_type);
    }, ROLLING_ANIMATION_TIME);
};
show_rolled_piece_image = function show_rolled_piece_image(move_type) {
    if (pending_rolled_move_type === null || move_type === null) {
        return;
    }

    const image_path = roll_result_image_by_move_type[move_type];

    clear_dice_animation_timer();
    dice_roll_image.classList.add("is-hidden");
    dice_result_image.src = image_path;
    dice_result_image.classList.remove("is-hidden");
    dice_live_element.textContent = "The Thief rolled " + move_type + ".";
    clear_dice_result_timer();
    dice_result_timer = setTimeout(function finish_after_delay() {
        finish_dice_roll(move_type);
    }, RESULT_DISPLAY_TIME);
};
finish_dice_roll = function finish_dice_roll(move_type) {
    const next_game = set_thief_move(game, move_type);

    if (next_game !== null) {
        game = next_game;
    }

    is_dice_animation_playing = false;
    pending_rolled_move_type = null;
    clear_dice_result_timer();
    hide_dice_stage();
    message_element.textContent = "Choose a glowing square.";
    render();
    focus_cursor_square();
};
clamp = function clamp(value, minimum, maximum) {
    return Math.max(minimum, Math.min(value, maximum));
};
focus_cursor_square = function focus_cursor_square() {
    const row_selector = "[data-row='" + String(cursor.row) + "']";
    const column_selector = "[data-column='" + String(cursor.column) + "']";
    const selector = row_selector + column_selector;
    const square = board_element.querySelector(
        selector
    );

    if (square !== null) {
        square.focus();
    }
};
invalid_message = function invalid_message(row, column) {
    if (game.current_player === PLAYER_THIEF) {
        if (
            row === game.king.row
            && column === game.king.column
        ) {
            return "Are you trying to get caught or something?";
        }

        return "That square is not legal for the current thief move.";
    }

    if (king_action === "police_car") {
        return "That police car cannot be placed there.";
    }

    return (
        "The King can only move one square and cannot move through police cars."
    );
};
next_cursor = function next_cursor() {
    if (game.current_player === PLAYER_THIEF) {
        return {row: game.thief.row, column: game.thief.column};
    }

    return {row: game.king.row, column: game.king.column};
};
legal_action_for_square = function legal_action_for_square(row, column) {
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
        && king_action === "police_car"
        && is_valid_police_car_placement(game, position)
    ) {
        return "police_car";
    }

    return null;
};
legal_label = function legal_label(legal_action) {
    if (legal_action === "move") {
        return ". Legal move";
    }

    if (legal_action === "police_car") {
        return ". Legal police car placement";
    }

    return "";
};
square_label = function square_label(row, column) {
    const position = {row, column};
    const thief_is_here = (
        game.thief.row === position.row
        && game.thief.column === position.column
    );
    const king_is_here = (
        game.king.row === position.row
        && game.king.column === position.column
    );
    const exit_is_here = (
        game.exit.row === position.row
        && game.exit.column === position.column
    );

    if (thief_is_here && king_is_here) {
        return "King caught the Thief";
    }

    if (thief_is_here && exit_is_here) {
        return "Thief at the Exit";
    }

    if (thief_is_here) {
        return "Thief";
    }

    if (king_is_here) {
        return "King";
    }

    if (exit_is_here) {
        return "Exit";
    }

    if (game.board[row][column] === "barrier") {
        return "Barrier";
    }

    if (game.board[row][column] === "police_car") {
        return "Police Car";
    }

    return "Empty";
};
square_class = function square_class(row, column, label, legal_action) {
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

    if (legal_action === "police_car") {
        classes.push("legal-police-car");
    }

    return classes.join(" ");
};
square_is_cursor = function square_is_cursor(row, column) {
    return cursor.row === row && cursor.column === column;
};
add_square_content = function add_square_content(square, label) {
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
};
square_image = function square_image(label) {
    if (label === "Thief" || label === "Thief at the Exit") {
        if (game.current_player === PLAYER_KING || game.thief_move === null) {
            return THIEF_SACK_IMAGE;
        }

        return thief_image_by_move_type[game.thief_move] || THIEF_SACK_IMAGE;
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
};
square_text = function square_text(label) {
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
};
success_message = function success_message() {
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
};
clear_dice_result_timer = function clear_dice_result_timer() {
    if (dice_result_timer !== null) {
        clearTimeout(dice_result_timer);
        dice_result_timer = null;
    }
};
clear_dice_animation_timer = function clear_dice_animation_timer() {
    if (dice_animation_timer !== null) {
        clearTimeout(dice_animation_timer);
        dice_animation_timer = null;
    }
};
hide_dice_stage = function hide_dice_stage() {
    dice_stage.classList.add("is-hidden");
    clear_dice_animation_timer();
    dice_roll_image.classList.add("is-hidden");
    hide_rolled_piece_image();
};
hide_rolled_piece_image = function hide_rolled_piece_image() {
    dice_result_image.classList.add("is-hidden");
    dice_result_image.removeAttribute("src");
};
screen_reader_dice_text = function screen_reader_dice_text() {
    if (game.thief_move === null) {
        return "The Thief needs to roll the movement dice.";
    }

    return "The Thief rolled " + game.thief_move + ".";
};
choose_king_move = function choose_king_move() {
    king_action = "move";
    message_element.textContent = "King action: move one square.";
    render();
    focus_cursor_square();
};
choose_police_car = function choose_police_car() {
    king_action = "police_car";
    message_element.textContent = (
        "King action: choose an empty square for a police car."
    );
    render();
    focus_cursor_square();
};
prefers_reduced_motion = function prefers_reduced_motion() {
    return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
};
animate_piece_glide = function animate_piece_glide(glide) {
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

    window.requestAnimationFrame(function before_glide() {
        window.requestAnimationFrame(function start_glide() {
            piece.style.transition = (
                "transform 340ms cubic-bezier(0.22, 0.61, 0.36, 1)"
            );
            piece.style.transform = "translate(0, 0)";
        });
    });
};
maybe_celebrate = function maybe_celebrate() {
    if (game.winner !== null && !celebration_shown) {
        celebration_shown = true;
        audio_controller.stop_music();
        win_poster_controller.trigger_win_poster(game.winner);
        audio_controller.sound_victor(game.winner);
    }
};
turn_decision_key = function turn_decision_key() {
    if (game.winner !== null) {
        return "ended";
    }

    if (game.current_player === PLAYER_THIEF) {
        return "thief";
    }

    return "king";
};
render_timer = function render_timer() {
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
};
sync_turn_timer = function sync_turn_timer() {
    const key = turn_decision_key();

    if (key !== last_turn_key) {
        last_turn_key = key;
        turn_seconds_left = TURN_TIME_LIMIT;
    }

    render_timer();
};
handle_turn_tick = function handle_turn_tick() {
    if (
        game.winner !== null
        || intro_controller.is_open()
        || is_dice_animation_playing
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
};
handle_turn_timeout = function handle_turn_timeout() {
    apply_pass(timeout_message());
};
timeout_message = function timeout_message() {
    if (game.current_player === PLAYER_THIEF) {
        return "The Thief ran out of time. The Thief's turn was skipped.";
    }

    return "The King ran out of time. The King's turn was skipped.";
};
skip_message = function skip_message() {
    if (game.current_player === PLAYER_THIEF) {
        return "The Thief skipped their turn.";
    }

    return "The King skipped their turn.";
};
start_turn_timer = function start_turn_timer() {
    if (turn_timer_id !== null) {
        clearInterval(turn_timer_id);
    }

    turn_timer_id = setInterval(handle_turn_tick, 1000);
};
start_audio = function start_audio() {
    audio_controller.start_audio(game.winner === null);
};

dice_button.setAttribute("aria-keyshortcuts", "R");
move_button.setAttribute("aria-keyshortcuts", "K");
police_car_button.setAttribute("aria-keyshortcuts", "P");
skip_turn_button.setAttribute("aria-keyshortcuts", "L");
restart_button.setAttribute("aria-keyshortcuts", "N");
how_to_play_button.setAttribute("aria-keyshortcuts", "H");

board_element.addEventListener("keydown", handle_keydown);
document.addEventListener("keydown", handle_global_shortcuts);
move_button.addEventListener("click", choose_king_move);
police_car_button.addEventListener("click", choose_police_car);
skip_turn_button.addEventListener("click", skip_turn);
restart_button.addEventListener("click", restart_game);
how_to_play_button.addEventListener("click", intro_controller.show_intro);
intro_next.addEventListener("click", intro_controller.go_intro_next);
intro_back.addEventListener("click", intro_controller.go_intro_back);
intro_skip.addEventListener("click", intro_controller.close_intro);
intro_overlay.addEventListener(
    "keydown",
    intro_controller.handle_intro_keydown
);
document.addEventListener("pointerdown", start_audio);
document.addEventListener("keydown", start_audio);

create_dice_button();
render();
intro_controller.show_intro();
start_turn_timer();
start_audio();
