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
    place_barrier
} from "./ChessThieves.js";

const board_element = document.querySelector("#board");
const turn_element = document.querySelector("#turn");
const die_element = document.querySelector("#die");
const barrier_element = document.querySelector("#barriers");
const message_element = document.querySelector("#message");
const result_element = document.querySelector("#result");
const move_button = document.querySelector("#king-move");
const barrier_button = document.querySelector("#king-barrier");
const restart_button = document.querySelector("#restart");

let game = create_new_game();
let cursor = {row: game.thief.row, column: game.thief.column};
let king_action = "move";

/**
 * Draws every square and updates all text panels.
 * @returns {undefined}
 */
function render() {
    render_board();
    render_status();
}

/**
 * Draws the chessboard buttons.
 * @returns {undefined}
 */
function render_board() {
    board_element.innerHTML = "";

    let row = 0;

    while (row < BOARD_SIZE) {
        let column = 0;

        while (column < BOARD_SIZE) {
            const square = document.createElement("button");
            const label = get_square_label(game, row, column);
            const legal_action = legal_action_for_square(row, column);

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
            square.tabIndex = square_is_cursor(row, column)
                ? 0
                : -1;
            square.textContent = square_text(label);
            square.addEventListener("click", select_square);

            board_element.append(square);
            column += 1;
        }

        row += 1;
    }
}

/**
 * Updates the text panels and action buttons.
 * @returns {undefined}
 */
function render_status() {
    const winner = game.winner;
    const current_player = game.current_player === PLAYER_THIEF
        ? "Player 1, Thief"
        : "Player 2, King";

    if (winner === null) {
        turn_element.textContent = current_player
            + " - turn " + String(Math.min(game.turn_count, MAX_TURNS))
            + " of " + String(MAX_TURNS);
    } else {
        turn_element.textContent = "Game ended on turn "
            + String(Math.min(game.turn_count, MAX_TURNS))
            + " of " + String(MAX_TURNS);
    }
    die_element.textContent = game.current_player === PLAYER_THIEF
        ? "Thief move: " + game.thief_move
        : "Thief move waiting for next roll";
    barrier_element.textContent = "Barriers: "
        + String(game.barriers.length) + " of " + String(MAX_BARRIERS);

    move_button.disabled = game.current_player !== PLAYER_KING || winner !== null;
    barrier_button.disabled = game.current_player !== PLAYER_KING || winner !== null;
    move_button.setAttribute("aria-pressed", String(king_action === "move"));
    barrier_button.setAttribute("aria-pressed", String(king_action === "barrier"));

    if (winner === PLAYER_THIEF) {
        result_element.textContent = "The Thief escaped with the magical pieces.";
    } else if (winner === PLAYER_KING) {
        result_element.textContent = "The King recovered the stolen pieces.";
    } else {
        result_element.textContent = "No winner yet.";
    }
}

/**
 * Handles mouse or keyboard selection of a square.
 * @param {Event} event The click event.
 * @returns {undefined}
 */
function select_square(event) {
    const row = Number(event.currentTarget.dataset.row);
    const column = Number(event.currentTarget.dataset.column);

    cursor = {row, column};
    play_selected_square(row, column);
}

/**
 * Applies the current player's action to the selected square.
 * @param {number} row The selected row.
 * @param {number} column The selected column.
 * @returns {undefined}
 */
function play_selected_square(row, column) {
    let next_game = null;

    if (game.winner !== null) {
        message_element.textContent = "Start a new game to play again.";
        render();
        return;
    }

    if (game.current_player === PLAYER_THIEF) {
        next_game = move_thief(game, row, column);
    } else if (king_action === "move") {
        next_game = move_king(game, row, column);
    } else {
        next_game = place_barrier(game, row, column);
    }

    if (next_game === null) {
        message_element.textContent = invalid_message();
    } else {
        game = next_game;
        cursor = next_cursor();
        message_element.textContent = success_message();
    }

    render();
    focus_cursor_square();
}

/**
 * Moves the keyboard cursor around the board.
 * @param {number} row_change The row movement.
 * @param {number} column_change The column movement.
 * @returns {undefined}
 */
function move_cursor(row_change, column_change) {
    cursor = {
        row: clamp(cursor.row + row_change, 0, BOARD_SIZE - 1),
        column: clamp(cursor.column + column_change, 0, BOARD_SIZE - 1)
    };
    render();
    focus_cursor_square();
}

/**
 * Handles keyboard controls for the board.
 * @param {KeyboardEvent} event The keyboard event.
 * @returns {undefined}
 */
function handle_keydown(event) {
    if (event.key === "ArrowUp" || event.key.toLowerCase() === "w") {
        event.preventDefault();
        move_cursor(-1, 0);
    } else if (event.key === "ArrowDown" || event.key.toLowerCase() === "s") {
        event.preventDefault();
        move_cursor(1, 0);
    } else if (event.key === "ArrowLeft" || event.key.toLowerCase() === "a") {
        event.preventDefault();
        move_cursor(0, -1);
    } else if (event.key === "ArrowRight" || event.key.toLowerCase() === "d") {
        event.preventDefault();
        move_cursor(0, 1);
    } else if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        play_selected_square(cursor.row, cursor.column);
    }
}

/**
 * Starts a fresh game.
 * @returns {undefined}
 */
function restart_game() {
    game = create_new_game();
    king_action = "move";
    cursor = {row: game.thief.row, column: game.thief.column};
    message_element.textContent = "The Thief rolls first.";
    render();
    focus_cursor_square();
}

function clamp(value, minimum, maximum) {
    return Math.max(minimum, Math.min(value, maximum));
}

function focus_cursor_square() {
    const square = board_element.querySelector(
        "[data-row='" + String(cursor.row) + "'][data-column='" + String(cursor.column) + "']"
    );

    if (square !== null) {
        square.focus();
    }
}

function invalid_message() {
    if (game.current_player === PLAYER_THIEF) {
        return "That square is not legal for the current thief move.";
    }

    if (king_action === "barrier") {
        return "That barrier cannot be placed there.";
    }

    return "The King can only move one square and cannot move through barriers.";
}

function next_cursor() {
    if (game.current_player === PLAYER_THIEF) {
        return {row: game.thief.row, column: game.thief.column};
    }

    return {row: game.king.row, column: game.king.column};
}

/**
 * Finds whether a square is legal for the current action.
 * @param {number} row The row to check.
 * @param {number} column The column to check.
 * @returns {string|null} "move", "barrier", or null.
 */
function legal_action_for_square(row, column) {
    const position = {row, column};

    if (game.winner !== null) {
        return null;
    }

    if (
        game.current_player === PLAYER_THIEF
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
        return ". Legal barrier placement";
    }

    return "";
}

function square_class(row, column, label, legal_action) {
    const classes = [
        "square",
        (row + column) % 2 === 0
            ? "light"
            : "dark",
        label.toLowerCase().replaceAll(" ", "-")
    ];

    if (square_is_cursor(row, column)) {
        classes.push("cursor");
    }

    if (legal_action === "move") {
        classes.push("legal-move");
    }

    if (legal_action === "barrier") {
        classes.push("legal-barrier");
    }

    return classes.join(" ");
}

function square_is_cursor(row, column) {
    return cursor.row === row && cursor.column === column;
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
        return "WALL";
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
        return "The King has acted. The Thief rolls " + game.thief_move + ".";
    }

    return "The Thief moved. The King may move or place a barrier.";
}

board_element.addEventListener("keydown", handle_keydown);
move_button.addEventListener("click", function choose_king_move() {
    king_action = "move";
    message_element.textContent = "King action: move one square.";
    render();
    focus_cursor_square();
});
barrier_button.addEventListener("click", function choose_barrier() {
    king_action = "barrier";
    message_element.textContent = "King action: place one barrier.";
    render();
    focus_cursor_square();
});
restart_button.addEventListener("click", restart_game);

render();
