/*jslint browser, module*/
// Music: "Sneaky Snooper" by Audionautix (audionautix.com)
// Licensed under Creative Commons Attribution 4.0 International (CC BY 4.0)

import {
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
} from "./game-logic.js";

const RESULT_DISPLAY_TIME = 900;
const ROLLING_ANIMATION_TIME = 2000;
const WIN_POSTER_DISPLAY_TIME = 5500;
const TURN_TIME_LIMIT = 20;
const MUSIC_SRC = "assets/audio/Sneaky Snooper - Audionautix.mp3";
const DICE_STATIONARY_IMAGE = "assets/images/dice_stationary_image.png";
const DICE_ROLL_GIF = "assets/video/dice_roll.gif";
const THIEF_WIN_VIDEO = "assets/video/escaped.mp4";
const KING_WIN_VIDEO = "assets/video/arrested.mp4";

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
const intro_step = document.querySelector("#intro-step");
const intro_icon = document.querySelector("#intro-icon");
const intro_title = document.querySelector("#intro-title");
const intro_body = document.querySelector("#intro-body");
const intro_dots = document.querySelector("#intro-dots");
const intro_back = document.querySelector("#intro-back");
const intro_next = document.querySelector("#intro-next");
const intro_skip = document.querySelector("#intro-skip");

const INTRO_STEPS = [
    {
        icon: "assets/images/chess-thieves-crest.svg",
        title: "Welcome to Chess Thieves",
        body: (
            "The Thief races to reach the EXIT square. "
            + "The King blocks the way and tries to catch the Thief."
        )
    },
    {
        icon: "assets/images/dice_stationary_image.png",
        title: "Thief: roll, then move",
        body: (
            "Each turn the Thief rolls a die for a move type - pawn (one "
            + "square in any direction), knight (an L-shape), or bishop, rook, "
            + "or queen (up to four squares). Then move onto a glowing square."
        )
    },
    {
        icon: "assets/characters/king.png",
        title: "King: block or chase",
        body: (
            "The King moves one square in any direction, or places a police "
            + "car - up to six - to wall off the Thief's escape route."
        )
    },
    {
        icon: "assets/characters/thief-sack.png",
        title: "How to win",
        body: (
            "The Thief wins by reaching the EXIT. The King wins by catching "
            + "the Thief, or if the Thief still has not escaped after 15 turns."
        )
    },
    {
        icon: "assets/images/chess-thieves-crest.svg",
        title: "Controls",
        body: (
            "Use the Arrow keys or WASD to move the cursor, Enter or Space to "
            + "select a square, and R to roll the dice. Good luck!"
        )
    }
];

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
let win_poster_timer = null;
let pending_glide = null;
let celebration_shown = false;
let intro_index = 0;
let turn_seconds_left = TURN_TIME_LIMIT;
let turn_timer_id = null;
let last_turn_key = "";
let audio_context = null;
let music_enabled = false;

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
let skip_turn;
let createDiceButton;
let handleDiceButtonKeydown;
let handleDiceRollRequest;
let playDiceRollAnimation;
let showRolledPieceImage;
let finishDiceRoll;
let getRandomMoveType;
let clamp;
let focus_cursor_square;
let invalid_message;
let next_cursor;
let legal_action_for_square;
let legal_label;
let square_display_label;
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
let choose_barrier;
let animate_piece_glide;
let trigger_win_poster;
let clear_win_poster;
let maybe_celebrate;
let prefers_reduced_motion;
let show_intro;
let close_intro;
let render_intro_step;
let build_intro_dots;
let go_intro_next;
let go_intro_back;
let handle_intro_keydown;
let turn_decision_key;
let render_timer;
let sync_turn_timer;
let handle_turn_tick;
let handle_turn_timeout;
let start_turn_timer;
let timeout_message;
let skip_message;
let ensure_audio;
let play_tone;
let make_shaper_curve;
let wood_knock;
let sound_move;
let sound_barrier;
let sound_dice;
let sound_poster_thump;
let sound_timeout;
let sound_tick;
let start_music;
let start_audio;

/**
 * Draws every square and updates all text panels.
 * @returns {undefined}
 */
render = function render() {
    render_board();
    render_status();
    render_dice_button();
    maybe_celebrate();
    sync_turn_timer();
};

/**
 * Draws the chessboard buttons.
 * @returns {undefined}
 */
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
};

/**
 * Updates the text panels and action buttons.
 * @returns {undefined}
 */
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
};

/**
 * Shows or hides the dice button for the Thief's roll phase.
 * @returns {undefined}
 */
render_dice_button = function render_dice_button() {
    dice_button.classList.toggle(
        "is-hidden",
        !should_show_dice_button()
    );
};

/**
 * Checks whether the dice button should be visible for the Thief.
 * @returns {boolean} True when the Thief must roll and no animation is playing.
 */
should_show_dice_button = function should_show_dice_button() {
    return (
        game.current_player === PLAYER_THIEF
        && game.thief_move === null
        && game.winner === null
        && !isDiceAnimationPlaying
    );
};

/**
 * Handles mouse or keyboard selection of a square.
 * @param {Event} event The click event.
 * @returns {undefined}
 */
select_square = function select_square(event) {
    const row = Number(event.currentTarget.dataset.row);
    const column = Number(event.currentTarget.dataset.column);

    cursor = {row, column};
    play_selected_square(row, column);
};

/**
 * Keeps the keyboard cursor synced with the focused board square.
 * @param {Event} event The focus event.
 * @returns {undefined}
 */
focus_square = function focus_square(event) {
    cursor = {
        row: Number(event.currentTarget.dataset.row),
        column: Number(event.currentTarget.dataset.column)
    };
};

/**
 * Applies the current player's action to the selected square.
 * @param {number} row The selected row.
 * @param {number} column The selected column.
 * @returns {undefined}
 */
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
                sound_move();
            } else {
                sound_barrier();
            }
        }
    }

    render();
    focus_cursor_square();
};

/**
 * Moves the keyboard cursor around the board.
 * @param {number} row_change The row movement.
 * @param {number} column_change The column movement.
 * @returns {undefined}
 */
move_cursor = function move_cursor(row_change, column_change) {
    cursor = {
        row: clamp(cursor.row + row_change, 0, BOARD_SIZE - 1),
        column: clamp(cursor.column + column_change, 0, BOARD_SIZE - 1)
    };
    render();
    focus_cursor_square();
};

/**
 * Handles keyboard controls for the board.
 * @param {KeyboardEvent} event The keyboard event.
 * @returns {undefined}
 */
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
        handleDiceRollRequest();
    }
};

/**
 * Handles global keyboard shortcuts for King action selection.
 * @param {KeyboardEvent} event The keyboard event.
 * @returns {undefined}
 */
handle_global_shortcuts = function handle_global_shortcuts(event) {
    const key = event.key.toLowerCase();
    const intro_open = !intro_overlay.classList.contains("is-hidden");

    if (event.altKey || event.ctrlKey || event.metaKey || intro_open) {
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
        show_intro();
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
};

/**
 * Checks whether the King action controls can currently be used.
 * @returns {boolean} True when the King may choose move or police car.
 */
king_controls_available = function king_controls_available() {
    return (
        game.current_player === PLAYER_KING
        && game.winner === null
    );
};

/**
 * Checks whether the active side can skip the current turn.
 * @returns {boolean} True when skipping is currently allowed.
 */
can_skip_turn = function can_skip_turn() {
    return (
        game.winner === null
        && !isDiceAnimationPlaying
    );
};

/**
 * Starts a fresh game.
 * @returns {undefined}
 */
restart_game = function restart_game() {
    game = create_new_game();
    king_action = "move";
    isDiceAnimationPlaying = false;
    pendingRolledMoveType = null;
    pending_glide = null;
    celebration_shown = false;
    clear_win_poster();
    turn_seconds_left = TURN_TIME_LIMIT;
    last_turn_key = "";
    clear_dice_result_timer();
    hide_dice_stage();
    cursor = {row: game.thief.row, column: game.thief.column};
    message_element.textContent = "The Thief rolls first.";
    dice_live_element.textContent = "";
    render();
    focus_cursor_square();
};

/**
 * Skips the active side's turn.
 * @returns {undefined}
 */
skip_turn = function skip_turn() {
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
};

/**
 * Builds the dice button behaviour and accessibility attributes.
 * @returns {undefined}
 */
createDiceButton = function createDiceButton() {
    dice_button_image.src = DICE_STATIONARY_IMAGE;
    dice_button.setAttribute("aria-label", "Roll movement dice");
    dice_button.addEventListener("click", handleDiceRollRequest);
    dice_button.addEventListener("keydown", handleDiceButtonKeydown);
};

/**
 * Handles keyboard activation for the dice button.
 * @param {KeyboardEvent} event The keyboard event.
 * @returns {undefined}
 */
handleDiceButtonKeydown = function handleDiceButtonKeydown(event) {
    if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        handleDiceRollRequest();
    }
};

/**
 * Handles a mouse or keyboard request to roll the movement dice.
 * @returns {undefined}
 */
handleDiceRollRequest = function handleDiceRollRequest() {
    if (isDiceAnimationPlaying || !should_show_dice_button()) {
        return;
    }

    sound_dice();

    const move_type = getRandomMoveType();

    isDiceAnimationPlaying = true;
    pendingRolledMoveType = move_type;
    dice_live_element.textContent = "The Thief is rolling the movement dice.";
    message_element.textContent = "Rolling...";
    render();
    playDiceRollAnimation(move_type);
};

/**
 * Plays the central dice roll GIF while the board remains visible.
 * @param {string} move_type The move type that has been rolled.
 * @returns {undefined}
 */
playDiceRollAnimation = function playDiceRollAnimation(move_type) {
    hide_rolled_piece_image();
    clear_dice_animation_timer();
    dice_stage.classList.remove("is-hidden");
    dice_stage.setAttribute("aria-hidden", "true");
    dice_roll_image.classList.remove("is-hidden");
    dice_roll_image.src = DICE_ROLL_GIF + "?roll=" + String(Date.now());
    diceAnimationTimer = setTimeout(function finish_gif_animation() {
        showRolledPieceImage(move_type);
    }, ROLLING_ANIMATION_TIME);
};

/**
 * Shows the image for the rolled chess piece.
 * @param {string} move_type The move type that has been rolled.
 * @returns {undefined}
 */
showRolledPieceImage = function showRolledPieceImage(move_type) {
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
};

/**
 * Finishes the dice roll and updates the game state with the rolled move.
 * @param {string} move_type The move type that has been rolled.
 * @returns {undefined}
 */
finishDiceRoll = function finishDiceRoll(move_type) {
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
};

/**
 * Gets a random movement type from the pure game rules module.
 * @returns {string} The movement type rolled by the thief movement die.
 */
getRandomMoveType = function getRandomMoveType() {
    return roll_thief_die();
};

/**
 * Restricts a number so it stays within a minimum and maximum value.
 * @param {number} value The number to restrict.
 * @param {number} minimum The smallest allowed value.
 * @param {number} maximum The largest allowed value.
 * @returns {number} The restricted number.
 */
clamp = function clamp(value, minimum, maximum) {
    return Math.max(minimum, Math.min(value, maximum));
};

/**
 * Moves keyboard focus to the square currently selected by the board cursor.
 * @returns {undefined}
 */
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

/**
 * Builds the message shown when a player selects an illegal square.
 * @param {number} row The row the player attempted to move to.
 * @param {number} column The column the player attempted to move to.
 * @returns {string} A message explaining why the selected action failed.
 */
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

    if (king_action === "barrier") {
        return "That police car cannot be placed there.";
    }

    return (
        "The King can only move one square and cannot move through police cars."
    );
};

/**
 * Chooses where the keyboard cursor should move after a successful turn.
 * @returns {object} The thief or king position for the next active player.
 */
next_cursor = function next_cursor() {
    if (game.current_player === PLAYER_THIEF) {
        return {row: game.thief.row, column: game.thief.column};
    }

    return {row: game.king.row, column: game.king.column};
};

/**
 * Finds whether a square is legal for the current action.
 * @param {number} row The row to check.
 * @param {number} column The column to check.
 * @returns {string|null} "move", "barrier", or null.
 */
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
        && king_action === "barrier"
        && is_valid_barrier_placement(game, position)
    ) {
        return "barrier";
    }

    return null;
};

/**
 * Builds extra accessible label text for a legal action square.
 * @param {string|null} legal_action The legal action for the square.
 * @returns {string} Text appended to the square's aria-label.
 */
legal_label = function legal_label(legal_action) {
    if (legal_action === "move") {
        return ". Legal move";
    }

    if (legal_action === "barrier") {
        return ". Legal police car placement";
    }

    return "";
};

/**
 * Converts game-state labels into player-facing labels.
 * @param {string} label The logical square label.
 * @returns {string} The label shown to players and assistive technology.
 */
square_display_label = function square_display_label(label) {
    return label;
};

/**
 * Builds the CSS class list for one board square.
 * @param {number} row The square row.
 * @param {number} column The square column.
 * @param {string} label The logical square label.
 * @param {string|null} legal_action The legal action available on the square.
 * @returns {string} A space-separated CSS class string.
 */
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

    if (legal_action === "barrier") {
        classes.push("legal-barrier");
    }

    return classes.join(" ");
};

/**
 * Checks whether a square is the current keyboard cursor square.
 * @param {number} row The square row.
 * @param {number} column The square column.
 * @returns {boolean} True when the cursor is on this square.
 */
square_is_cursor = function square_is_cursor(row, column) {
    return cursor.row === row && cursor.column === column;
};

/**
 * Adds visible content to a board square.
 * @param {HTMLElement} square The square button to fill.
 * @param {string} label The logical square label from the game state.
 * @returns {undefined}
 */
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

/**
 * Gets the image path that should be used for a square.
 * @param {string} label The logical square label.
 * @returns {string|null} An image path, or null when text should be shown.
 */
square_image = function square_image(label) {
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
};

/**
 * Gets fallback text for a board square that does not use an image.
 * @param {string} label The logical square label.
 * @returns {string} Short visible text for the square.
 */
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

/**
 * Builds the message shown after a successful move or action.
 * @returns {string} A short message for the message area.
 */
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

/**
 * Clears any pending timer that would finish the dice result display.
 * @returns {undefined}
 */
clear_dice_result_timer = function clear_dice_result_timer() {
    if (diceResultTimer !== null) {
        clearTimeout(diceResultTimer);
        diceResultTimer = null;
    }
};

/**
 * Clears any pending timer that would finish the dice rolling GIF.
 * @returns {undefined}
 */
clear_dice_animation_timer = function clear_dice_animation_timer() {
    if (diceAnimationTimer !== null) {
        clearTimeout(diceAnimationTimer);
        diceAnimationTimer = null;
    }
};

/**
 * Hides the central dice animation and result display.
 * @returns {undefined}
 */
hide_dice_stage = function hide_dice_stage() {
    dice_stage.classList.add("is-hidden");
    clear_dice_animation_timer();
    dice_roll_image.classList.add("is-hidden");
    hide_rolled_piece_image();
};

/**
 * Hides and clears the rolled piece image.
 * @returns {undefined}
 */
hide_rolled_piece_image = function hide_rolled_piece_image() {
    dice_result_image.classList.add("is-hidden");
    dice_result_image.removeAttribute("src");
};

/**
 * Creates screen-reader-only dice status text.
 * @returns {string} The accessible dice status.
 */
screen_reader_dice_text = function screen_reader_dice_text() {
    if (game.thief_move === null) {
        return "The Thief needs to roll the movement dice.";
    }

    return "The Thief rolled " + game.thief_move + ".";
};

/**
 * Selects the King's move action.
 * @returns {undefined}
 */
choose_king_move = function choose_king_move() {
    king_action = "move";
    message_element.textContent = "King action: move one square.";
    render();
    focus_cursor_square();
};

/**
 * Selects the King's barrier placement action.
 * @returns {undefined}
 */
choose_barrier = function choose_barrier() {
    king_action = "barrier";
    message_element.textContent = (
        "King action: choose an empty square for a police car."
    );
    render();
    focus_cursor_square();
};

/**
 * Reports whether the user has asked the system for reduced motion.
 * @returns {boolean} True when reduced motion is preferred.
 */
prefers_reduced_motion = function prefers_reduced_motion() {
    return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
};

/**
 * Slides a moved piece from its previous square into its new square.
 * @param {object} glide The from and to coordinates of the moved piece.
 * @returns {undefined}
 */
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

    requestAnimationFrame(function before_glide() {
        requestAnimationFrame(function start_glide() {
            piece.style.transition = (
                "transform 340ms cubic-bezier(0.22, 0.61, 0.36, 1)"
            );
            piece.style.transform = "translate(0, 0)";
        });
    });
};

/**
 * Removes any win poster currently shown over the board.
 * @returns {undefined}
 */
clear_win_poster = function clear_win_poster() {
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
 * Shows the matching win poster video over the board.
 * @returns {undefined}
 */
trigger_win_poster = function trigger_win_poster() {
    const board_area = document.querySelector(".board-area");
    const layer = document.createElement("div");
    const video = document.createElement("video");
    const source = (
        game.winner === PLAYER_THIEF
        ? THIEF_WIN_VIDEO
        : KING_WIN_VIDEO
    );

    if (board_area === null) {
        return;
    }

    clear_win_poster();

    layer.className = "win-poster-layer";
    layer.setAttribute("aria-hidden", "true");
    const board_rect = board_area.getBoundingClientRect();
    const poster_size = Math.min(board_rect.width * 0.64, 462);

    video.className = "win-poster-video";
    video.src = source;
    video.autoplay = true;
    video.muted = true;
    video.playsInline = true;
    video.preload = "auto";
    video.style.left = String(board_rect.left + board_rect.width / 2) + "px";
    video.style.top = String(board_rect.top + board_rect.height / 2) + "px";
    video.style.maxWidth = String(board_rect.width * 0.75) + "px";
    video.style.maxHeight = String(board_rect.height * 0.75) + "px";
    video.style.width = String(poster_size) + "px";

    layer.append(video);
    document.body.append(layer);

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
    }, WIN_POSTER_DISPLAY_TIME);
};

/**
 * Runs the win celebration once, the first render after a winner appears.
 * @returns {undefined}
 */
maybe_celebrate = function maybe_celebrate() {
    if (game.winner !== null && !celebration_shown) {
        celebration_shown = true;
        trigger_win_poster();
        sound_poster_thump();
    }
};

/**
 * Draws the progress dots for the how-to-play intro.
 * @returns {undefined}
 */
build_intro_dots = function build_intro_dots() {
    intro_dots.innerHTML = "";

    let i = 0;

    while (i < INTRO_STEPS.length) {
        const dot = document.createElement("span");

        dot.className = (
            i === intro_index
            ? "intro-dot active"
            : "intro-dot"
        );
        intro_dots.append(dot);
        i += 1;
    }
};

/**
 * Shows the current how-to-play step and replays its entrance animation.
 * @returns {undefined}
 */
render_intro_step = function render_intro_step() {
    const step = INTRO_STEPS[intro_index];
    const is_last = intro_index === INTRO_STEPS.length - 1;

    intro_icon.src = step.icon;
    intro_title.textContent = step.title;
    intro_body.textContent = step.body;
    intro_back.disabled = intro_index === 0;
    intro_next.textContent = (
        is_last
        ? "Let's play"
        : "Next"
    );
    build_intro_dots();

    intro_step.classList.remove("intro-step-enter");
    requestAnimationFrame(function reflow_step() {
        requestAnimationFrame(function add_enter() {
            intro_step.classList.add("intro-step-enter");
        });
    });
};

/**
 * Advances the intro, or closes it on the final step.
 * @returns {undefined}
 */
go_intro_next = function go_intro_next() {
    if (intro_index >= INTRO_STEPS.length - 1) {
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
go_intro_back = function go_intro_back() {
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
show_intro = function show_intro() {
    intro_index = 0;
    render_intro_step();
    intro_overlay.classList.remove("is-hidden");
    render_timer();
    intro_next.focus();
};

/**
 * Closes the how-to-play intro and returns focus to the board.
 * @returns {undefined}
 */
close_intro = function close_intro() {
    intro_overlay.classList.add("is-hidden");
    start_audio();
    render_timer();
    focus_cursor_square();
};

/**
 * Handles keyboard shortcuts while the intro is open.
 * @param {KeyboardEvent} event The keyboard event.
 * @returns {undefined}
 */
handle_intro_keydown = function handle_intro_keydown(event) {
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

/**
 * Builds a key describing which decision the game is waiting on.
 * @returns {string} A key that changes whenever a new decision begins.
 */
turn_decision_key = function turn_decision_key() {
    if (game.winner !== null) {
        return "ended";
    }

    if (game.current_player === PLAYER_THIEF) {
        return "thief";
    }

    return "king";
};

/**
 * Shows the remaining time for the active player.
 * @returns {undefined}
 */
render_timer = function render_timer() {
    const intro_open = !intro_overlay.classList.contains("is-hidden");

    timer_element.textContent = "";
    timer_element.classList.remove("is-low");

    if (game.winner !== null || intro_open) {
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

/**
 * Resets the countdown when a new decision begins, then redraws it.
 * @returns {undefined}
 */
sync_turn_timer = function sync_turn_timer() {
    const key = turn_decision_key();

    if (key !== last_turn_key) {
        last_turn_key = key;
        turn_seconds_left = TURN_TIME_LIMIT;
    }

    render_timer();
};

/**
 * Counts down one second unless play is paused, and acts on a timeout.
 * @returns {undefined}
 */
handle_turn_tick = function handle_turn_tick() {
    const intro_open = !intro_overlay.classList.contains("is-hidden");

    if (game.winner !== null || intro_open || isDiceAnimationPlaying) {
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
        sound_tick(turn_seconds_left <= 5);
    }

    render_timer();
};

/**
 * Passes the active player's turn because their time ran out.
 * @returns {undefined}
 */
handle_turn_timeout = function handle_turn_timeout() {
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
};

/**
 * Builds the message shown when a player's time runs out.
 * @returns {string} A short message describing the skipped turn.
 */
timeout_message = function timeout_message() {
    if (game.current_player === PLAYER_THIEF) {
        return "The Thief ran out of time. The Thief's turn was skipped.";
    }

    return "The King ran out of time. The King's turn was skipped.";
};

/**
 * Builds the message shown when a side chooses to skip.
 * @returns {string} A short message describing the skipped turn.
 */
skip_message = function skip_message() {
    if (game.current_player === PLAYER_THIEF) {
        return "The Thief skipped their turn.";
    }

    return "The King skipped their turn.";
};

/**
 * Starts the one-second countdown loop used for turn time limits.
 * @returns {undefined}
 */
start_turn_timer = function start_turn_timer() {
    if (turn_timer_id !== null) {
        clearInterval(turn_timer_id);
    }

    turn_timer_id = setInterval(handle_turn_tick, 1000);
};

/**
 * Lazily creates (and resumes) the Web Audio context for sound effects.
 * @returns {object|null} The audio context, or null when audio is unavailable.
 */
ensure_audio = function ensure_audio() {
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
};

/**
 * Plays one short synthesised note with a quick fade in and out.
 * @param {number} freq The pitch in hertz.
 * @param {number} duration The length in seconds.
 * @param {string} type The oscillator wave type.
 * @param {number} gain The peak volume from 0 to 1.
 * @param {number} delay Seconds to wait before the note starts.
 * @returns {undefined}
 */
play_tone = function play_tone(freq, duration, type, gain, delay) {
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

/**
 * Plays the chess piece movement sound from file.
 * @returns {undefined}
 */
sound_move = function sound_move() {
    const sfx = new Audio("assets/audio/chess sound.mp3");

    sfx.volume = 0.6;

    const played = sfx.play();

    if (played !== undefined && typeof played.catch === "function") {
        played.catch(function ignore_blocked_sound() {
            return undefined;
        });
    }
};

/**
 * Plays the police car placement sound from file.
 * @returns {undefined}
 */
sound_barrier = function sound_barrier() {
    const sfx = new Audio("assets/audio/police.mp3");

    sfx.volume = 0.6;

    const played = sfx.play();

    if (played !== undefined && typeof played.catch === "function") {
        played.catch(function ignore_blocked_sound() {
            return undefined;
        });
    }
};

/**
 * Plays a short rattling dice-roll sound.
 * @returns {undefined}
 */
/**
 * Builds a soft-saturation curve used to warm the dice sound.
 * @param {number} amount How hard to drive the curve.
 * @returns {Float32Array} The waveshaper curve.
 */
make_shaper_curve = function make_shaper_curve(amount) {
    const size = 1024;
    const curve = new Float32Array(size);
    let i = 0;

    while (i < size) {
        const x = (i / (size - 1)) * 2 - 1;
        curve[i] = Math.tanh(x * amount);
        i += 1;
    }

    return curve;
};

/**
 * Plays one struck-wood "knock" using inharmonic modal resonances.
 * @param {number} start When the knock starts, in audio time.
 * @param {number} gain The knock volume.
 * @param {number} base The base resonance frequency.
 * @param {object} out The node to connect into.
 * @returns {undefined}
 */
wood_knock = function wood_knock(start, gain, base, out) {
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
        band.frequency.value = base * mode[0] * (0.95 + Math.random() * 0.1);
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
};

/**
 * Plays a warm wooden dice-roll: several settling knocks, soft-saturated.
 * @returns {undefined}
 */
sound_dice = function sound_dice() {
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
};

/**
 * Plays a heavy thump when the win poster lands.
 * @returns {undefined}
 */
sound_poster_thump = function sound_poster_thump() {
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
};

/**
 * Plays a low buzzer for the king winning on the turn limit.
 * @returns {undefined}
 */
sound_timeout = function sound_timeout() {
    play_tone(130, 0.5, "square", 0.3, 0);
};

/**
 * Plays a clock tick for the final seconds of a turn.
 * @param {boolean} urgent Whether to use the higher, more urgent pitch.
 * @returns {undefined}
 */
sound_tick = function sound_tick(urgent) {
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

/**
 * Starts the looping background music when the browser allows playback.
 * @returns {undefined}
 */
start_music = function start_music() {
    if (MUSIC_SRC === "") {
        return;
    }

    if (music_enabled) {
        return;
    }

    if (bg_music.getAttribute("src") !== MUSIC_SRC) {
        bg_music.src = MUSIC_SRC;
    }

    const played = bg_music.play();

    music_enabled = true;

    if (played !== undefined && typeof played.catch === "function") {
        played.catch(function music_unavailable() {
            music_enabled = false;
        });
    }
};

/**
 * Starts all audio systems that are enabled for the game.
 * @returns {undefined}
 */
start_audio = function start_audio() {
    ensure_audio();
    start_music();
};

board_element.addEventListener("keydown", handle_keydown);
document.addEventListener("keydown", handle_global_shortcuts);
move_button.addEventListener("click", choose_king_move);
barrier_button.addEventListener("click", choose_barrier);
skip_turn_button.addEventListener("click", skip_turn);
restart_button.addEventListener("click", restart_game);
how_to_play_button.addEventListener("click", show_intro);
intro_next.addEventListener("click", go_intro_next);
intro_back.addEventListener("click", go_intro_back);
intro_skip.addEventListener("click", close_intro);
intro_overlay.addEventListener("keydown", handle_intro_keydown);
document.addEventListener("pointerdown", start_audio);
document.addEventListener("keydown", start_audio);
bg_music.volume = 0.08;

createDiceButton();
render();
show_intro();
start_turn_timer();
start_audio();
