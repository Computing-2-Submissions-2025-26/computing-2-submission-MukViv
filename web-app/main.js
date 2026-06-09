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
    place_barrier,
    roll_thief_die,
    set_thief_move
} from "./ChessThieves.js";

const RESULT_DISPLAY_TIME = 900;
const ROLLING_ANIMATION_TIME = 2000;
const DICE_STATIONARY_IMAGE = "assets/images/dice_stationary_image.png";
const DICE_ROLL_GIF = "assets/images/dice.gif";

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

const board_element = document.querySelector("#board");
const turn_element = document.querySelector("#turn");
const die_element = document.querySelector("#die");
const barrier_element = document.querySelector("#barriers");
const message_element = document.querySelector("#message");
const result_element = document.querySelector("#result");
const move_button = document.querySelector("#king-move");
const barrier_button = document.querySelector("#king-barrier");
const restart_button = document.querySelector("#restart");
const dice_button = document.querySelector("#dice-button");
const dice_button_image = document.querySelector("#dice-button-image");
const dice_stage = document.querySelector("#dice-stage");
const dice_roll_image = document.querySelector("#dice-roll-image");
const dice_result_image = document.querySelector("#dice-result-image");
const dice_live_element = document.querySelector("#dice-live");

let game = create_new_game();
let cursor = {row: game.thief.row, column: game.thief.column};
let king_action = "move";
let isDiceAnimationPlaying = false;
let pendingRolledMoveType = null;
let diceAnimationTimer = null;
let diceResultTimer = null;

/**
 * Draws every square and updates all text panels.
 * @returns {undefined}
 */
function render() {
    render_board();
    render_status();
    render_dice_button();
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
            add_square_content(square, label);
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
        ? screen_reader_dice_text()
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
 * Shows or hides the dice button for Player 1's roll phase.
 * @returns {undefined}
 */
function render_dice_button() {
    dice_button.classList.toggle(
        "is-hidden",
        !should_show_dice_button()
    );
}

/**
 * Checks whether the dice button should be visible for Player 1.
 * @returns {boolean} True when Player 1 must roll and no animation is playing.
 */
function should_show_dice_button() {
    return (
        game.current_player === PLAYER_THIEF
        && game.thief_move === null
        && game.winner === null
        && !isDiceAnimationPlaying
    );
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
    const key = event.key.toLowerCase();

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
        play_selected_square(cursor.row, cursor.column);
    } else if (key === "r") {
        event.preventDefault();
        handleDiceRollRequest();
    }
}

/**
 * Starts a fresh game.
 * @returns {undefined}
 */
function restart_game() {
    game = create_new_game();
    king_action = "move";
    isDiceAnimationPlaying = false;
    pendingRolledMoveType = null;
    clear_dice_result_timer();
    hide_dice_stage();
    cursor = {row: game.thief.row, column: game.thief.column};
    message_element.textContent = "Player 1 rolls first.";
    dice_live_element.textContent = "";
    render();
    focus_cursor_square();
}

/**
 * Builds the dice button behaviour and accessibility attributes.
 * @returns {undefined}
 */
function createDiceButton() {
    dice_button_image.src = DICE_STATIONARY_IMAGE;
    dice_button.setAttribute("aria-label", "Roll movement dice");
    dice_button.addEventListener("click", handleDiceRollRequest);
    dice_button.addEventListener("keydown", handleDiceButtonKeydown);
}

/**
 * Handles keyboard activation for the dice button.
 * @param {KeyboardEvent} event The keyboard event.
 * @returns {undefined}
 */
function handleDiceButtonKeydown(event) {
    if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        handleDiceRollRequest();
    }
}

/**
 * Handles a mouse or keyboard request to roll the movement dice.
 * @returns {undefined}
 */
function handleDiceRollRequest() {
    if (isDiceAnimationPlaying || !should_show_dice_button()) {
        return;
    }

    const move_type = getRandomMoveType();

    isDiceAnimationPlaying = true;
    pendingRolledMoveType = move_type;
    dice_live_element.textContent = "Player 1 is rolling the movement dice.";
    message_element.textContent = "Rolling...";
    render();
    playDiceRollAnimation(move_type);
}

/**
 * Plays the central dice roll GIF while the board remains visible.
 * @param {string} move_type The move type that has been rolled.
 * @returns {undefined}
 */
function playDiceRollAnimation(move_type) {
    hide_rolled_piece_image();
    clear_dice_animation_timer();
    dice_stage.classList.remove("is-hidden");
    dice_stage.setAttribute("aria-hidden", "true");
    dice_roll_image.classList.remove("is-hidden");
    dice_roll_image.src = "";
    dice_roll_image.src = DICE_ROLL_GIF;
    diceAnimationTimer = setTimeout(function finish_gif_animation() {
        showRolledPieceImage(move_type);
    }, ROLLING_ANIMATION_TIME);
}

/**
 * Shows the image for the rolled chess piece.
 * @param {string} move_type The move type that has been rolled.
 * @returns {undefined}
 */
function showRolledPieceImage(move_type) {
    if (pendingRolledMoveType === null || move_type === null) {
        return;
    }

    const image_path = rollResultImageByMoveType[move_type];

    clear_dice_animation_timer();
    dice_roll_image.classList.add("is-hidden");
    dice_result_image.src = image_path;
    dice_result_image.classList.remove("is-hidden");
    dice_live_element.textContent = "Player 1 rolled " + move_type + ".";
    clear_dice_result_timer();
    diceResultTimer = setTimeout(function finish_after_delay() {
        finishDiceRoll(move_type);
    }, RESULT_DISPLAY_TIME);
}

/**
 * Finishes the dice roll and updates the game state with the rolled move.
 * @param {string} move_type The move type that has been rolled.
 * @returns {undefined}
 */
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

/**
 * Gets a random movement type from the pure game rules module.
 * @returns {string} The movement type rolled by the thief movement die.
 */
function getRandomMoveType() {
    return roll_thief_die();
}

/**
 * Restricts a number so it stays within a minimum and maximum value.
 * @param {number} value The number to restrict.
 * @param {number} minimum The smallest allowed value.
 * @param {number} maximum The largest allowed value.
 * @returns {number} The restricted number.
 */
function clamp(value, minimum, maximum) {
    return Math.max(minimum, Math.min(value, maximum));
}

/**
 * Moves keyboard focus to the square currently selected by the board cursor.
 * @returns {undefined}
 */
function focus_cursor_square() {
    const square = board_element.querySelector(
        "[data-row='" + String(cursor.row) + "'][data-column='" + String(cursor.column) + "']"
    );

    if (square !== null) {
        square.focus();
    }
}

/**
 * Builds the message shown when a player selects an illegal square.
 * @returns {string} A message explaining why the selected action failed.
 */
function invalid_message() {
    if (game.current_player === PLAYER_THIEF) {
        return "That square is not legal for the current thief move.";
    }

    if (king_action === "barrier") {
        return "That barrier cannot be placed there.";
    }

    return "The King can only move one square and cannot move through barriers.";
}

/**
 * Chooses where the keyboard cursor should move after a successful turn.
 * @returns {object} The thief or king position for the next active player.
 */
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

/**
 * Builds extra accessible label text for a legal action square.
 * @param {string|null} legal_action The legal action for the square.
 * @returns {string} Text appended to the square's aria-label.
 */
function legal_label(legal_action) {
    if (legal_action === "move") {
        return ". Legal move";
    }

    if (legal_action === "barrier") {
        return ". Legal barrier placement";
    }

    return "";
}

/**
 * Builds the CSS class list for one board square.
 * @param {number} row The square row.
 * @param {number} column The square column.
 * @param {string} label The logical square label.
 * @param {string|null} legal_action The legal action available on the square.
 * @returns {string} A space-separated CSS class string.
 */
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

/**
 * Checks whether a square is the current keyboard cursor square.
 * @param {number} row The square row.
 * @param {number} column The square column.
 * @returns {boolean} True when the cursor is on this square.
 */
function square_is_cursor(row, column) {
    return cursor.row === row && cursor.column === column;
}

/**
 * Adds visible content to a board square.
 * @param {HTMLElement} square The square button to fill.
 * @param {string} label The logical square label from the game state.
 * @returns {undefined}
 */
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

/**
 * Gets the image path that should be used for a square.
 * @param {string} label The logical square label.
 * @returns {string|null} An image path, or null when text should be shown.
 */
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

    return null;
}

/**
 * Gets fallback text for a board square that does not use an image.
 * @param {string} label The logical square label.
 * @returns {string} Short visible text for the square.
 */
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

/**
 * Builds the message shown after a successful move or action.
 * @returns {string} A short message for the message area.
 */
function success_message() {
    if (game.winner === PLAYER_THIEF) {
        return "The Thief reached the exit.";
    }

    if (game.winner === PLAYER_KING) {
        return "The King has stopped the escape.";
    }

    if (game.current_player === PLAYER_THIEF) {
        return "The King has acted. Player 1 can roll the dice.";
    }

    return "The Thief moved. The King may move or place a barrier.";
}

/**
 * Clears any pending timer that would finish the dice result display.
 * @returns {undefined}
 */
function clear_dice_result_timer() {
    if (diceResultTimer !== null) {
        clearTimeout(diceResultTimer);
        diceResultTimer = null;
    }
}

/**
 * Clears any pending timer that would finish the dice rolling GIF.
 * @returns {undefined}
 */
function clear_dice_animation_timer() {
    if (diceAnimationTimer !== null) {
        clearTimeout(diceAnimationTimer);
        diceAnimationTimer = null;
    }
}

/**
 * Hides the central dice animation and result display.
 * @returns {undefined}
 */
function hide_dice_stage() {
    dice_stage.classList.add("is-hidden");
    clear_dice_animation_timer();
    dice_roll_image.classList.add("is-hidden");
    hide_rolled_piece_image();
}

/**
 * Hides and clears the rolled piece image.
 * @returns {undefined}
 */
function hide_rolled_piece_image() {
    dice_result_image.classList.add("is-hidden");
    dice_result_image.removeAttribute("src");
}

/**
 * Creates screen-reader-only dice status text.
 * @returns {string} The accessible dice status.
 */
function screen_reader_dice_text() {
    if (game.thief_move === null) {
        return "Player 1 needs to roll the movement dice.";
    }

    return "Player 1 rolled " + game.thief_move + ".";
}

/**
 * Selects the king's move action for Player 2.
 * @returns {undefined}
 */
function choose_king_move() {
    king_action = "move";
    message_element.textContent = "King action: move one square.";
    render();
    focus_cursor_square();
}

/**
 * Selects the barrier placement action for Player 2.
 * @returns {undefined}
 */
function choose_barrier() {
    king_action = "barrier";
    message_element.textContent = "King action: place one barrier.";
    render();
    focus_cursor_square();
}

board_element.addEventListener("keydown", handle_keydown);
move_button.addEventListener("click", choose_king_move);
barrier_button.addEventListener("click", choose_barrier);
restart_button.addEventListener("click", restart_game);

createDiceButton();
render();
