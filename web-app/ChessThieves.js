/**
 * Pure game rules for Chess Thieves.
 *
 * The browser interface imports this module, but this file does not use the
 * DOM. That keeps the rules easy to test from Node or a browser console.
 */

export const BOARD_SIZE = 8;
export const MAX_TURNS = 25;
export const MAX_BARRIERS = 5;

export const EMPTY = "empty";
export const THIEF = "thief";
export const KING = "king";
export const EXIT = "exit";
export const BARRIER = "barrier";

export const PLAYER_THIEF = "thief";
export const PLAYER_KING = "king";

export const thief_move_die = [
    "sneak",
    "sneak",
    "knight",
    "bishop",
    "rook",
    "queen"
];

const START_THIEF = Object.freeze({row: 7, column: 0});
const START_KING = Object.freeze({row: 0, column: 7});
const START_EXIT = Object.freeze({row: 0, column: 0});
const START_BARRIERS = Object.freeze([
    Object.freeze({row: 2, column: 3}),
    Object.freeze({row: 4, column: 4})
]);

/**
 * Creates a blank 8 by 8 board filled with empty squares.
 * @returns {string[][]} A new board containing only empty squares.
 */
export function create_empty_board() {
    const board = [];
    let row = 0;

    while (row < BOARD_SIZE) {
        const board_row = [];
        let column = 0;

        while (column < BOARD_SIZE) {
            board_row.push(EMPTY);
            column += 1;
        }

        board.push(board_row);
        row += 1;
    }

    return board;
}

/**
 * Checks whether a board coordinate is inside the 8 by 8 board.
 * @param {number} row The row number to check.
 * @param {number} column The column number to check.
 * @returns {boolean} True when the coordinate is on the board.
 */
export function is_inside_board(row, column) {
    return (
        Number.isInteger(row)
        && Number.isInteger(column)
        && row >= 0
        && row < BOARD_SIZE
        && column >= 0
        && column < BOARD_SIZE
    );
}

/**
 * Rolls the thief movement die.
 * @param {Function} [random_function=Math.random] Optional random number
 * generator used for tests.
 * @returns {string} The movement type rolled for the thief.
 */
export function roll_thief_die(random_function = Math.random) {
    const roll = Math.floor(random_function() * thief_move_die.length);
    return thief_move_die[roll];
}

/**
 * Checks whether a move is a valid sneak move.
 * @param {string[][]} board The current board.
 * @param {object} start The starting position.
 * @param {object} end The destination position.
 * @returns {boolean} True when the move is one square up, down, left, or right.
 */
export function is_valid_sneak_move(board, start, end) {
    const row_difference = Math.abs(end.row - start.row);
    const column_difference = Math.abs(end.column - start.column);

    return (
        is_open_square(board, end)
        && (
            (row_difference === 1 && column_difference === 0)
            || (row_difference === 0 && column_difference === 1)
        )
    );
}

/**
 * Checks whether a move is a valid chess knight move.
 * @param {string[][]} board The current board.
 * @param {object} start The starting position.
 * @param {object} end The destination position.
 * @returns {boolean} True when the move is an L-shaped knight move.
 */
export function is_valid_knight_move(board, start, end) {
    const row_difference = Math.abs(end.row - start.row);
    const column_difference = Math.abs(end.column - start.column);

    return (
        is_open_square(board, end)
        && (
            (row_difference === 2 && column_difference === 1)
            || (row_difference === 1 && column_difference === 2)
        )
    );
}

/**
 * Checks whether a move is a valid bishop-style thief move.
 * @param {string[][]} board The current board.
 * @param {object} start The starting position.
 * @param {object} end The destination position.
 * @returns {boolean} True when the move is diagonal, no more than four
 * squares, and does not pass through a barrier.
 */
export function is_valid_bishop_move(board, start, end) {
    const row_difference = Math.abs(end.row - start.row);
    const column_difference = Math.abs(end.column - start.column);

    return (
        is_open_square(board, end)
        && row_difference === column_difference
        && row_difference >= 1
        && row_difference <= 4
        && is_path_clear(board, start, end)
    );
}

/**
 * Checks whether a move is a valid rook-style thief move.
 * @param {string[][]} board The current board.
 * @param {object} start The starting position.
 * @param {object} end The destination position.
 * @returns {boolean} True when the move is horizontal or vertical, no more
 * than four squares, and does not pass through a barrier.
 */
export function is_valid_rook_move(board, start, end) {
    const row_difference = Math.abs(end.row - start.row);
    const column_difference = Math.abs(end.column - start.column);
    const distance = Math.max(row_difference, column_difference);

    return (
        is_open_square(board, end)
        && distance >= 1
        && distance <= 4
        && (
            row_difference === 0
            || column_difference === 0
        )
        && is_path_clear(board, start, end)
    );
}

/**
 * Checks whether a move is a valid queen-style thief move.
 * @param {string[][]} board The current board.
 * @param {object} start The starting position.
 * @param {object} end The destination position.
 * @returns {boolean} True when the move is diagonal, horizontal, or vertical,
 * no more than four squares, and does not pass through a barrier.
 */
export function is_valid_queen_move(board, start, end) {
    return (
        is_valid_bishop_move(board, start, end)
        || is_valid_rook_move(board, start, end)
    );
}

/**
 * Checks whether the thief's current die roll allows a destination square.
 * @param {object} game The current game state.
 * @param {string} move_type The movement type rolled for the thief.
 * @param {object} start The thief's starting position.
 * @param {object} end The destination position.
 * @returns {boolean} True when the thief can legally move to the destination.
 */
export function is_valid_thief_move(game, move_type, start, end) {
    if (same_position(end, game.king)) {
        return false;
    }

    if (move_type === "sneak") {
        return is_valid_sneak_move(game.board, start, end);
    }

    if (move_type === "knight") {
        return is_valid_knight_move(game.board, start, end);
    }

    if (move_type === "bishop") {
        return is_valid_bishop_move(game.board, start, end);
    }

    if (move_type === "rook") {
        return is_valid_rook_move(game.board, start, end);
    }

    if (move_type === "queen") {
        return is_valid_queen_move(game.board, start, end);
    }

    return false;
}

/**
 * Checks that a sliding move does not pass through a barrier.
 * @param {string[][]} board The current board.
 * @param {object} start The starting position.
 * @param {object} end The destination position.
 * @returns {boolean} True when every square between start and end is clear.
 */
export function is_path_clear(board, start, end) {
    const row_difference = end.row - start.row;
    const column_difference = end.column - start.column;
    const row_step = Math.sign(row_difference);
    const column_step = Math.sign(column_difference);
    const is_diagonal = Math.abs(row_difference) === Math.abs(column_difference);
    const is_straight = row_difference === 0 || column_difference === 0;

    if ((!is_diagonal && !is_straight) || (row_step === 0 && column_step === 0)) {
        return false;
    }

    let row = start.row + row_step;
    let column = start.column + column_step;

    while (row !== end.row || column !== end.column) {
        if (board[row][column] === BARRIER) {
            return false;
        }

        row += row_step;
        column += column_step;
    }

    return true;
}

/**
 * Moves the thief if the rolled movement type allows the destination.
 * @param {object} game The current game state.
 * @param {number} row The destination row.
 * @param {number} column The destination column.
 * @returns {object|null} A new game state, or null if the move is illegal.
 */
export function move_thief(game, row, column) {
    const end = {row, column};

    if (
        game.current_player !== PLAYER_THIEF
        || is_game_ended(game)
        || !is_valid_thief_move(game, game.thief_move, game.thief, end)
    ) {
        return null;
    }

    return finish_game_state({
        ...game,
        thief: end,
        current_player: PLAYER_KING
    });
}

/**
 * Moves the king one square in any direction.
 * @param {object} game The current game state.
 * @param {number} row The destination row.
 * @param {number} column The destination column.
 * @param {Function} [random_function=Math.random] Optional random number
 * generator used for the next thief die roll.
 * @returns {object|null} A new game state, or null if the move is illegal.
 */
export function move_king(game, row, column, random_function = Math.random) {
    const end = {row, column};

    if (
        game.current_player !== PLAYER_KING
        || is_game_ended(game)
        || !is_valid_king_move(game, end)
    ) {
        return null;
    }

    return finish_king_turn({
        ...game,
        king: end
    }, random_function);
}

/**
 * Places one barrier on an empty square if the placement is legal.
 * @param {object} game The current game state.
 * @param {number} row The row where the barrier should be placed.
 * @param {number} column The column where the barrier should be placed.
 * @param {Function} [random_function=Math.random] Optional random number
 * generator used for the next thief die roll.
 * @returns {object|null} A new game state, or null if the barrier is illegal.
 */
export function place_barrier(game, row, column, random_function = Math.random) {
    const barrier = {row, column};

    if (
        game.current_player !== PLAYER_KING
        || is_game_ended(game)
        || !is_valid_barrier_placement(game, barrier)
    ) {
        return null;
    }

    const next_barriers = game.barriers.concat([barrier]);
    const next_game = {
        ...game,
        barriers: next_barriers
    };
    const next_board = board_from_state(next_game);

    if (!is_exit_reachable(next_board, game.thief, game.exit)) {
        return null;
    }

    return finish_king_turn({
        ...next_game,
        board: next_board
    }, random_function);
}

/**
 * Checks whether the king can move to a destination square.
 * @param {object} game The current game state.
 * @param {object} end The destination position.
 * @returns {boolean} True when the king can legally move to the destination.
 */
export function is_valid_king_move(game, end) {
    const row_difference = Math.abs(end.row - game.king.row);
    const column_difference = Math.abs(end.column - game.king.column);

    return (
        is_inside_board(end.row, end.column)
        && (row_difference !== 0 || column_difference !== 0)
        && row_difference <= 1
        && column_difference <= 1
        && game.board[end.row][end.column] !== BARRIER
    );
}

/**
 * Checks whether a barrier may be placed on a square.
 * @param {object} game The current game state.
 * @param {object} position The position where the barrier would be placed.
 * @returns {boolean} True when the barrier placement is legal.
 */
export function is_valid_barrier_placement(game, position) {
    if (
        game.barriers.length >= MAX_BARRIERS
        || !is_inside_board(position.row, position.column)
        || !is_empty_for_barrier(game, position)
    ) {
        return false;
    }

    const next_barriers = game.barriers.concat([position]);
    const next_game = {
        ...game,
        barriers: next_barriers
    };
    const next_board = board_from_state(next_game);

    return (
        is_exit_reachable(next_board, game.thief, game.exit)
    );
}

/**
 * Checks whether either player has won.
 * @param {object} game The current game state.
 * @returns {string|null} "thief", "king", or null when nobody has won yet.
 */
export function check_winner(game) {
    if (same_position(game.thief, game.exit)) {
        return PLAYER_THIEF;
    }

    if (same_position(game.king, game.thief)) {
        return PLAYER_KING;
    }

    if (game.turn_count > MAX_TURNS) {
        return PLAYER_KING;
    }

    return null;
}

/**
 * Checks whether the game has ended.
 * @param {object} game The current game state.
 * @returns {boolean} True when a win condition has been reached.
 */
export function is_game_ended(game) {
    return check_winner(game) !== null;
}

/**
 * Creates a full starting game state for Chess Thieves.
 * @param {Function} [random_function=Math.random] Optional random number
 * generator used for the first thief die roll.
 * @returns {object} A new playable game state.
 */
export function create_new_game(random_function = Math.random) {
    return finish_game_state({
        thief: copy_position(START_THIEF),
        king: copy_position(START_KING),
        exit: copy_position(START_EXIT),
        barriers: START_BARRIERS.map(copy_position),
        current_player: PLAYER_THIEF,
        thief_move: roll_thief_die(random_function),
        turn_count: 1,
        winner: null,
        board: create_empty_board()
    });
}

/**
 * Gets a short readable label for a board square.
 * @param {object} game The current game state.
 * @param {number} row The row to inspect.
 * @param {number} column The column to inspect.
 * @returns {string} A label such as "Thief", "King", "Exit", or "Empty".
 */
export function get_square_label(game, row, column) {
    const position = {row, column};

    if (same_position(game.thief, position) && same_position(game.king, position)) {
        return "King caught the Thief";
    }

    if (same_position(game.thief, position) && same_position(game.exit, position)) {
        return "Thief at the Exit";
    }

    if (same_position(game.thief, position)) {
        return "Thief";
    }

    if (same_position(game.king, position)) {
        return "King";
    }

    if (same_position(game.exit, position)) {
        return "Exit";
    }

    if (game.board[row][column] === BARRIER) {
        return "Barrier";
    }

    return "Empty";
}

function board_from_state(game) {
    const board = create_empty_board();

    board[game.exit.row][game.exit.column] = EXIT;

    game.barriers.forEach(function place_each_barrier(barrier) {
        board[barrier.row][barrier.column] = BARRIER;
    });

    board[game.thief.row][game.thief.column] = THIEF;
    board[game.king.row][game.king.column] = KING;

    return board;
}

function copy_position(position) {
    return {
        row: position.row,
        column: position.column
    };
}

function finish_game_state(game) {
    const next_game = {
        ...game,
        board: board_from_state(game)
    };

    return {
        ...next_game,
        winner: check_winner(next_game)
    };
}

function finish_king_turn(game, random_function) {
    const checked_game = finish_game_state(game);

    if (checked_game.winner !== null) {
        return checked_game;
    }

    return finish_game_state({
        ...checked_game,
        current_player: PLAYER_THIEF,
        thief_move: roll_thief_die(random_function),
        turn_count: checked_game.turn_count + 1
    });
}

function is_empty_for_barrier(game, position) {
    return (
        game.board[position.row][position.column] === EMPTY
        && !same_position(position, game.thief)
        && !same_position(position, game.king)
        && !same_position(position, game.exit)
    );
}

function is_exit_reachable(board, start, exit_position) {
    const queue = [copy_position(start)];
    const visited = create_empty_board();

    visited[start.row][start.column] = "visited";

    while (queue.length > 0) {
        const current = queue.shift();

        if (same_position(current, exit_position)) {
            return true;
        }

        neighbours(current).forEach(function check_neighbour(neighbour) {
            if (
                is_inside_board(neighbour.row, neighbour.column)
                && visited[neighbour.row][neighbour.column] !== "visited"
                && board[neighbour.row][neighbour.column] !== BARRIER
            ) {
                visited[neighbour.row][neighbour.column] = "visited";
                queue.push(neighbour);
            }
        });
    }

    return false;
}

function is_open_square(board, position) {
    return (
        is_inside_board(position.row, position.column)
        && board[position.row][position.column] !== BARRIER
    );
}

function neighbours(position) {
    return [
        {row: position.row - 1, column: position.column},
        {row: position.row + 1, column: position.column},
        {row: position.row, column: position.column - 1},
        {row: position.row, column: position.column + 1}
    ];
}

function same_position(first, second) {
    return first.row === second.row && first.column === second.column;
}
