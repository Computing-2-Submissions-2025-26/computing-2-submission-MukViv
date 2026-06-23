/*jslint module*/
/**
 * Game rules for Chess Thieves.
 *
 * The browser interface imports this module, but this file does not use the
 * DOM. That keeps the rules easy to test from Node or a browser console.
 * @namespace ChessThieves
 */
const ChessThieves = Object.create(null);


const BOARD_SIZE = 8;
const MAX_TURNS = 15;
const MAX_BARRIERS = 6;

const EMPTY = "empty";
const THIEF = "thief";
const KING = "king";
const EXIT = "exit";
const BARRIER = "barrier";
const POLICE_CAR = "police_car";

const PLAYER_THIEF = "thief";
const PLAYER_KING = "king";

/**
 * The six possible faces on the thief movement die
 * 33.33% chance of a pawn move, 16.67% chance of every other move type
 * @memberof ChessThieves
 * @constant
 */
const thief_move_die = [
    "pawn",
    "pawn",
    "knight",
    "bishop",
    "rook",
    "queen"
];

const START_THIEF_ROW = 7;
const START_KING_ROW = 0;
const START_EXIT_ROW = 1;
const START_BARRIER_COUNT = 4;

let create_empty_board;
let is_inside_board;
let roll_thief_die;
let is_valid_pawn_move;
let is_valid_knight_move;
let is_valid_bishop_move;
let is_valid_rook_move;
let is_valid_queen_move;
let is_valid_thief_move;
let is_path_clear;
let move_thief;
let move_king;
let place_barrier;
let set_thief_move;
let pass_turn;
let is_valid_king_move;
let is_valid_barrier_placement;
let check_winner;
let is_game_ended;
let create_new_game;
let get_square_label;
let create_random_setup;
let create_random_start_barriers;
let is_reachable_with_barrier;
let random_column;
let random_unused_column;
let random_empty_position;
let position_from_square_number;
let contains_position;
let board_from_state;
let copy_position;
let finish_game_state;
let finish_king_turn;
let is_empty_for_barrier;
let is_exit_reachable;
let is_open_square;
let is_blocking_square;
let neighbours;
let same_position;

/**
 * Creates a fresh board with every square empty, ready for pieces to be placed.
 * @returns {string[][]} An 8×8 grid where every cell is the empty marker.
 * @memberof ChessThieves
 * @function
 */
create_empty_board = function create_empty_board() {
    return Array.from({length: BOARD_SIZE}, function create_row() {
        return Array.from({length: BOARD_SIZE}, function create_cell() {
            return EMPTY;
        });
    });
};

/**
 * Returns true when a row and column both fall within the 8×8 playing area.
 * Rows and columns must be whole numbers from 0 to 7.
 * @param {number} row The row to check (0 = top, 7 = bottom).
 * @param {number} column The column to check (0 = left, 7 = right).
 * @returns {boolean} True when the square exists on the board.
 * @memberof ChessThieves
 * @function
 */
is_inside_board = function is_inside_board(row, column) {
    return (
        Number.isInteger(row)
        && Number.isInteger(column)
        && row >= 0
        && row < BOARD_SIZE
        && column >= 0
        && column < BOARD_SIZE
    );
};

/**
 * Picks a move type for the Thief's turn by rolling the movement die.
 * The die has six faces: pawn appears twice (giving it a 1-in-3 chance),
 * while knight, bishop, rook, and queen each appear once.
 * @param {Function} [random_function=Math.random] Swap in a fixed function
 * during tests to get a predictable result.
 * @returns {string} The move type rolled — one of pawn, knight, bishop,
 * rook, or queen.
 * @memberof ChessThieves
 * @function
 */
roll_thief_die = function roll_thief_die(random_function = Math.random) {
    const roll = Math.floor(random_function() * thief_move_die.length);
    return thief_move_die[roll];
};

/**
 * Checks whether the Thief can make a pawn move to the destination.
 * A pawn move is exactly one step in any of the four straight directions
 * (up, down, left, or right). Diagonal steps are not allowed.
 * @param {string[][]} board The current board.
 * @param {object} start The Thief's current square.
 * @param {object} end The square the Thief wants to move to.
 * @returns {boolean} True when the destination is one straight step away
 * and is not blocked by the King or an obstacle.
 * @memberof ChessThieves
 * @function
 */
is_valid_pawn_move = function is_valid_pawn_move(board, start, end) {
    const row_difference = Math.abs(end.row - start.row);
    const column_difference = Math.abs(end.column - start.column);

    return (
        is_open_square(board, end)
        && (
            (row_difference === 1 && column_difference === 0)
            || (row_difference === 0 && column_difference === 1)
        )
    );
};

/**
 * Checks whether the Thief can make a knight move to the destination.
 * A knight move is an L-shape: two squares in one direction then one
 * square sideways (or vice versa). Knights jump — obstacles in between
 * do not block them.
 * @param {string[][]} board The current board.
 * @param {object} start The Thief's current square.
 * @param {object} end The square the Thief wants to jump to.
 * @returns {boolean} True when the destination is a valid L-shape away
 * and is not occupied by the King or an obstacle.
 * @memberof ChessThieves
 * @function
 */
is_valid_knight_move = function is_valid_knight_move(board, start, end) {
    const row_difference = Math.abs(end.row - start.row);
    const column_difference = Math.abs(end.column - start.column);

    return (
        is_open_square(board, end)
        && (
            (row_difference === 2 && column_difference === 1)
            || (row_difference === 1 && column_difference === 2)
        )
    );
};

/**
 * Checks whether the Thief can make a bishop move to the destination.
 * A bishop move is diagonal — the same number of rows as columns — and
 * can cover one to four squares. The path must be clear: traffic barriers,
 * police cars, and the King all block the way.
 * @param {string[][]} board The current board.
 * @param {object} start The Thief's current square.
 * @param {object} end The square the Thief wants to move to.
 * @returns {boolean} True when the destination is diagonally reachable
 * within four squares and nothing is in the way.
 * @memberof ChessThieves
 * @function
 */
is_valid_bishop_move = function is_valid_bishop_move(board, start, end) {
    const row_difference = Math.abs(end.row - start.row);
    const column_difference = Math.abs(end.column - start.column);

    return (
        is_open_square(board, end)
        && row_difference === column_difference
        && row_difference >= 1
        && row_difference <= 4
        && is_path_clear(board, start, end)
    );
};

/**
 * Checks whether the Thief can make a rook move to the destination.
 * A rook move is a straight line — either along a row or along a column —
 * covering one to four squares. The path must be clear: traffic barriers,
 * police cars, and the King all block the way.
 * @param {string[][]} board The current board.
 * @param {object} start The Thief's current square.
 * @param {object} end The square the Thief wants to move to.
 * @returns {boolean} True when the destination is in a straight line within
 * four squares and nothing is in the way.
 * @memberof ChessThieves
 * @function
 */
is_valid_rook_move = function is_valid_rook_move(board, start, end) {
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
};

/**
 * Checks whether the Thief can make a queen move to the destination.
 * A queen move combines the bishop and rook: diagonal, horizontal, or
 * vertical, up to four squares. The path must be clear of traffic barriers,
 * police cars, and the King.
 * @param {string[][]} board The current board.
 * @param {object} start The Thief's current square.
 * @param {object} end The square the Thief wants to move to.
 * @returns {boolean} True when the destination is reachable in a straight
 * or diagonal line within four squares with nothing blocking the path.
 * @memberof ChessThieves
 * @function
 */
is_valid_queen_move = function is_valid_queen_move(board, start, end) {
    return (
        is_valid_bishop_move(board, start, end)
        || is_valid_rook_move(board, start, end)
    );
};

/**
 * Checks whether the die roll the Thief just got allows them to move to
 * a particular square. Delegates to the correct move validator (pawn,
 * knight, bishop, rook, or queen) based on the rolled type, and also
 * prevents the Thief from landing on the King's square.
 * @param {object} game The current game state.
 * @param {string} move_type The move type that came up on the die this turn.
 * @param {object} start The Thief's current square.
 * @param {object} end The square the Thief wants to move to.
 * @returns {boolean} True when the destination is legal for the rolled type.
 * @memberof ChessThieves
 * @function
 */
is_valid_thief_move = function is_valid_thief_move(
    game,
    move_type,
    start,
    end
) {
    if (same_position(end, game.king)) {
        return false;
    }

    if (move_type === "pawn") {
        return is_valid_pawn_move(game.board, start, end);
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
};

/**
 * Checks that nothing stands between two squares on a straight or diagonal
 * line. Used by bishop, rook, and queen moves to make sure the Thief is
 * not jumping over a traffic barrier, police car, or the King.
 * @param {string[][]} board The current board.
 * @param {object} start The square the Thief is moving from.
 * @param {object} end The square the Thief wants to reach.
 * @returns {boolean} True when every square along the path is clear.
 * @memberof ChessThieves
 * @function
 */
is_path_clear = function is_path_clear(board, start, end) {
    const row_difference = end.row - start.row;
    const column_difference = end.column - start.column;
    const row_step = Math.sign(row_difference);
    const column_step = Math.sign(column_difference);
    const is_diagonal = (
        Math.abs(row_difference) === Math.abs(column_difference)
    );
    const is_straight = row_difference === 0 || column_difference === 0;

    if (
        (!is_diagonal && !is_straight)
        || (row_step === 0 && column_step === 0)
    ) {
        return false;
    }

    let row = start.row + row_step;
    let column = start.column + column_step;

    while (row !== end.row || column !== end.column) {
        if (is_blocking_square(board[row][column])) {
            return false;
        }

        row += row_step;
        column += column_step;
    }

    return true;
};

/**
 * Moves the Thief to the chosen square if the current die roll allows it.
 * Returns null when it is not the Thief's turn, the game is already over,
 * or the destination is not legal for the rolled move type.
 * If the Thief lands on the Exit the game ends immediately with a Thief win.
 * @param {object} game The current game state.
 * @param {number} row The row the Thief wants to move to.
 * @param {number} column The column the Thief wants to move to.
 * @returns {object|null} The updated game state, or null if the move is not allowed.
 * @memberof ChessThieves
 * @function
 */
move_thief = function move_thief(game, row, column) {
    const end = {row, column};

    if (
        game.current_player !== PLAYER_THIEF
        || is_game_ended(game)
        || !is_valid_thief_move(game, game.thief_move, game.thief, end)
    ) {
        return null;
    }

    return finish_game_state(Object.assign({}, game, {
        thief: end,
        current_player: PLAYER_KING
    }));
};

/**
 * Moves the King one square in any direction (including diagonals).
 * Returns null when it is not the King's turn, the game is already over,
 * or the destination is blocked by a barrier or is the Exit square.
 * If the King lands on the Thief's square the game ends with a King win.
 * @param {object} game The current game state.
 * @param {number} row The row the King wants to move to.
 * @param {number} column The column the King wants to move to.
 * @returns {object|null} The updated game state, or null if the move is not allowed.
 * @memberof ChessThieves
 * @function
 */
move_king = function move_king(game, row, column) {
    const end = {row, column};

    if (
        game.current_player !== PLAYER_KING
        || is_game_ended(game)
        || !is_valid_king_move(game, end)
    ) {
        return null;
    }

    return finish_king_turn(Object.assign({}, game, {
        king: end
    }));
};

/**
 * Places one police car on the board for the King.
 * Returns null when it is not the King's turn, the game is over, the square
 * is occupied, the limit of six police cars has already been reached, or
 * placing the car would completely cut off every route the Thief has to
 * the Exit.
 * @param {object} game The current game state.
 * @param {number} row The row where the police car should be placed.
 * @param {number} column The column where the police car should be placed.
 * @returns {object|null} The updated game state, or null if placement is not allowed.
 * @memberof ChessThieves
 * @function
 */
place_barrier = function place_barrier(game, row, column) {
    const barrier = {row, column};

    if (
        game.current_player !== PLAYER_KING
        || is_game_ended(game)
        || !is_valid_barrier_placement(game, barrier)
    ) {
        return null;
    }

    const next_barriers = game.barriers.concat([barrier]);
    const next_game = Object.assign({}, game, {
        barriers: next_barriers
    });
    const next_board = board_from_state(next_game);

    if (!is_exit_reachable(next_board, game.thief, game.exit)) {
        return null;
    }

    return finish_king_turn(Object.assign({}, next_game, {
        board: next_board
    }));
};

/**
 * Records the move type shown on the die for this Thief turn.
 * Must be called before the Thief selects a square to move to.
 * Returns null if the game is over, a roll has already been recorded,
 * it is not the Thief's turn, or the type is not one of the six die faces.
 * @param {object} game The current game state.
 * @param {string} move_type The move type shown on the die this turn.
 * @returns {object|null} The updated game state, or null if the roll is not accepted.
 * @memberof ChessThieves
 * @function
 */
set_thief_move = function set_thief_move(game, move_type) {
    if (
        game.current_player !== PLAYER_THIEF
        || is_game_ended(game)
        || game.thief_move !== null
        || !thief_move_die.includes(move_type)
    ) {
        return null;
    }

    return finish_game_state(Object.assign({}, game, {
        thief_move: move_type
    }));
};

/**
 * Skips the current player's turn — called automatically when the timer runs out.
 * Skipping the Thief's turn hands control to the King.
 * Skipping the King's turn ends the round and adds one to the turn counter,
 * which can trigger the King's turn-limit win if turn 15 has been reached.
 * Returns null if the game has already ended.
 * @param {object} game The current game state.
 * @returns {object|null} The updated game state, or null if the game is over.
 * @memberof ChessThieves
 * @function
 */
pass_turn = function pass_turn(game) {
    if (is_game_ended(game)) {
        return null;
    }

    if (game.current_player === PLAYER_THIEF) {
        return finish_game_state(Object.assign({}, game, {
            current_player: PLAYER_KING
        }));
    }

    return finish_king_turn(game);
};

/**
 * Checks that the King can step to a given square.
 * The destination must be exactly one square away (in any direction including
 * diagonal), on the board, not a traffic barrier or police car, and not the
 * Exit square.
 * @param {object} game The current game state.
 * @param {object} end The square the King wants to move to.
 * @returns {boolean} True when the King is allowed to step there.
 * @memberof ChessThieves
 * @function
 */
is_valid_king_move = function is_valid_king_move(game, end) {
    const row_difference = Math.abs(end.row - game.king.row);
    const column_difference = Math.abs(end.column - game.king.column);

    return (
        is_inside_board(end.row, end.column)
        && (row_difference !== 0 || column_difference !== 0)
        && row_difference <= 1
        && column_difference <= 1
        && !is_blocking_square(game.board[end.row][end.column])
        && !same_position(end, game.exit)
    );
};

/**
 * Checks whether the King may place a police car on a given square.
 * The square must be empty, the limit of six police cars must not have
 * been reached, and after placement the Thief must still have at least one
 * open path to the Exit.
 * @param {object} game The current game state.
 * @param {object} position The square where the King wants to place a police car.
 * @returns {boolean} True when the placement is allowed.
 * @memberof ChessThieves
 * @function
 */
is_valid_barrier_placement = function is_valid_barrier_placement(
    game,
    position
) {
    if (
        game.barriers.length >= MAX_BARRIERS
        || !is_inside_board(position.row, position.column)
        || !is_empty_for_barrier(game, position)
    ) {
        return false;
    }

    const next_barriers = game.barriers.concat([position]);
    const next_game = Object.assign({}, game, {
        barriers: next_barriers
    });
    const next_board = board_from_state(next_game);

    return (
        is_exit_reachable(next_board, game.thief, game.exit)
    );
};

/**
 * Returns who has won, or null when the game is still in progress.
 * The Thief wins by reaching the Exit square.
 * The King wins by landing on the Thief's square or by surviving until
 * the turn counter goes past 15 without the Thief escaping.
 * @param {object} game The current game state.
 * @returns {string|null} "thief" if the Thief won, "king" if the King won,
 * or null if nobody has won yet.
 * @memberof ChessThieves
 * @function
 */
check_winner = function check_winner(game) {
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
};

/**
 * Returns true once the game has a winner — either player.
 * Use this to guard against actions being taken after the game is over.
 * @param {object} game The current game state.
 * @returns {boolean} True when someone has won, false while the game is ongoing.
 * @memberof ChessThieves
 * @function
 */
is_game_ended = function is_game_ended(game) {
    return check_winner(game) !== null;
};

/**
 * Sets up a fresh game of Chess Thieves with random starting positions.
 * The Thief always starts on the bottom row, the King and Exit on the top
 * two rows, and four traffic barriers are scattered across the board.
 * The Thief's turn begins immediately.
 * @param {Function} [random_function=Math.random] Swap in a fixed function
 * during tests to get a repeatable starting layout.
 * @returns {object} A new game state ready for the Thief to roll the die.
 * @memberof ChessThieves
 * @function
 */
create_new_game = function create_new_game(random_function = Math.random) {
    const setup = create_random_setup(random_function);

    return finish_game_state({
        thief: setup.thief,
        king: setup.king,
        exit: setup.exit,
        map_barriers: setup.barriers,
        barriers: [],
        current_player: PLAYER_THIEF,
        thief_move: null,
        turn_count: 1,
        winner: null,
        board: create_empty_board()
    });
};

/**
 * Returns a plain-English description of what is on a given board square.
 * Used by the board display to label each square for the player.
 * @param {object} game The current game state.
 * @param {number} row The row of the square to describe.
 * @param {number} column The column of the square to describe.
 * @returns {string} One of "Thief", "King", "Exit", "Barrier", "Empty",
 * "Thief at the Exit", or "King caught the Thief".
 * @memberof ChessThieves
 * @function
 */
get_square_label = function get_square_label(game, row, column) {
    const position = {row, column};
    const thief_is_here = same_position(game.thief, position);
    const king_is_here = same_position(game.king, position);
    const exit_is_here = same_position(game.exit, position);

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

    if (game.board[row][column] === BARRIER) {
        return "Barrier";
    }

    if (game.board[row][column] === POLICE_CAR) {
        return "Police Car";
    }

    return "Empty";
};

/**
 * Picks random starting columns for the Thief, King, and Exit, then places
 * the starting traffic barriers. Rows are fixed — only columns are random.
 * @param {Function} random_function The random number generator to use.
 * @returns {object} Starting positions for the Thief, King, Exit, and barriers.
 * @private
 */
create_random_setup = function create_random_setup(random_function) {
    const thief = {
        row: START_THIEF_ROW,
        column: random_column(random_function)
    };
    const exit = {
        row: START_EXIT_ROW,
        column: random_column(random_function)
    };
    const king = {
        row: START_KING_ROW,
        column: random_unused_column(START_KING_ROW, [exit], random_function)
    };
    const barriers = create_random_start_barriers(
        [thief, king, exit],
        random_function
    );

    return {thief, king, exit, barriers};
};

/**
 * Randomly places the starting traffic barriers on the board, making sure
 * the Thief always has at least one open route to the Exit after each one.
 * @param {object[]} occupied Squares already taken by the Thief, King, or Exit.
 * @param {Function} random_function The random number generator to use.
 * @returns {object[]} The positions of the starting traffic barriers.
 * @private
 */
create_random_start_barriers = function create_random_start_barriers(
    occupied,
    random_function
) {
    let barriers = [];

    while (barriers.length < START_BARRIER_COUNT) {
        let rejected = [];
        let found_barrier = false;

        while (!found_barrier) {
            const barrier = random_empty_position(
                occupied.concat(barriers, rejected),
                random_function
            );

            if (is_reachable_with_barrier(occupied, barriers, barrier)) {
                barriers = barriers.concat([barrier]);
                found_barrier = true;
            } else {
                rejected = rejected.concat([barrier]);
            }
        }
    }

    return barriers;
};

/**
 * Tests whether placing one more starting traffic barrier would still leave
 * the Thief with a route to the Exit. Used to avoid creating an unwinnable
 * starting layout.
 * @param {object[]} occupied The Thief, King, and Exit positions.
 * @param {object[]} barriers Traffic barriers already placed on the board.
 * @param {object} barrier The candidate barrier being tested.
 * @returns {boolean} True when the Thief can still reach the Exit with this barrier added.
 * @private
 */
is_reachable_with_barrier = function is_reachable_with_barrier(
    occupied,
    barriers,
    barrier
) {
    const next_barriers = barriers.concat([barrier]);
    const test_game = {
        thief: occupied[0],
        king: occupied[1],
        exit: occupied[2],
        map_barriers: next_barriers,
        barriers: []
    };

    const board = board_from_state(test_game);

    return is_exit_reachable(board, occupied[0], occupied[2]);
};

/**
 * Picks a random column number between 0 and 7.
 * @param {Function} random_function The random number generator to use.
 * @returns {number} A column index on the board.
 * @private
 */
random_column = function random_column(random_function) {
    return Math.floor(random_function() * BOARD_SIZE);
};

/**
 * Picks a random column on a given row that is not already taken by another
 * piece. Keeps trying the next column along until it finds a free one.
 * @param {number} row The row to find a free column in.
 * @param {object[]} occupied Squares already taken on that row.
 * @param {Function} random_function The random number generator to use.
 * @returns {number} A free column index.
 * @private
 */
random_unused_column = function random_unused_column(
    row,
    occupied,
    random_function
) {
    let column = random_column(random_function);

    while (contains_position(occupied, {row, column})) {
        column = (column + 1) % BOARD_SIZE;
    }

    return column;
};

/**
 * Picks a random square on the board that is not already taken by any piece
 * or obstacle. Keeps stepping to the next square until it finds a free one.
 * @param {object[]} occupied Squares that are already in use.
 * @param {Function} random_function The random number generator to use.
 * @returns {object} A free square as a row and column.
 * @private
 */
random_empty_position = function random_empty_position(
    occupied,
    random_function
) {
    let square_number = Math.floor(random_function() * BOARD_SIZE * BOARD_SIZE);
    let position = position_from_square_number(square_number);

    while (contains_position(occupied, position)) {
        square_number = (square_number + 1) % (BOARD_SIZE * BOARD_SIZE);
        position = position_from_square_number(square_number);
    }

    return position;
};

/**
 * Turns a single number (0–63) into a board square. Used internally to
 * step through every square on the board in order.
 * @param {number} square_number A number from 0 (top-left) to 63 (bottom-right).
 * @returns {object} The row and column that number maps to.
 * @private
 */
position_from_square_number = function position_from_square_number(
    square_number
) {
    return {
        row: Math.floor(square_number / BOARD_SIZE),
        column: square_number % BOARD_SIZE
    };
};

/**
 * Returns true when a list of squares already includes the given square.
 * @param {object[]} positions The list of squares to search.
 * @param {object} position The square to look for.
 * @returns {boolean} True when the square is already in the list.
 * @private
 */
contains_position = function contains_position(positions, position) {
    return positions.some(function is_same_position(current_position) {
        return same_position(current_position, position);
    });
};

/**
 * Rebuilds the visual board from the current positions of the Thief, King,
 * Exit, traffic barriers, and police cars. Called after every move or action
 * so the board always reflects the latest game state.
 * @param {object} game The game state with current piece positions.
 * @returns {string[][]} An 8×8 grid with the correct marker on each square.
 * @private
 */
board_from_state = function board_from_state(game) {
    const board = create_empty_board();
    const map_barriers = game.map_barriers || [];
    const placed_barriers = game.barriers || [];

    board[game.exit.row][game.exit.column] = EXIT;

    map_barriers.forEach(function place_each_map_barrier(barrier) {
        board[barrier.row][barrier.column] = BARRIER;
    });

    placed_barriers.forEach(function place_each_police_car(barrier) {
        board[barrier.row][barrier.column] = POLICE_CAR;
    });

    board[game.thief.row][game.thief.column] = THIEF;
    board[game.king.row][game.king.column] = KING;

    return board;
};

/**
 * Creates an independent copy of a square's position. Used to avoid
 * accidentally modifying the original position when the copy is changed.
 * @param {object} position The square to copy.
 * @returns {object} A new object with the same row and column values.
 * @private
 */
copy_position = function copy_position(position) {
    return {
        row: position.row,
        column: position.column
    };
};

/**
 * Applies any piece-position changes to the visual board and checks whether
 * the game now has a winner. Called after every move or action to keep the
 * board and winner fields in sync with the piece positions.
 * @param {object} game A game state that has just had positions changed.
 * @returns {object} The same game state with a fresh board and updated winner.
 * @private
 */
finish_game_state = function finish_game_state(game) {
    const next_game = Object.assign({}, game, {
        board: board_from_state(game)
    });

    return Object.assign({}, next_game, {
        winner: check_winner(next_game)
    });
};

/**
 * Wraps up the King's action (move or police car) and sets up the Thief's
 * next turn. Checks for a King win first — if the game is over it stops
 * there; otherwise it clears the die roll, increments the turn counter,
 * and hands control back to the Thief.
 * @param {object} game The game state after the King has acted.
 * @returns {object} A game state ready for the Thief to roll the die.
 * @private
 */
finish_king_turn = function finish_king_turn(game) {
    const checked_game = finish_game_state(game);

    if (checked_game.winner !== null) {
        return checked_game;
    }

    return finish_game_state(Object.assign({}, checked_game, {
        current_player: PLAYER_THIEF,
        thief_move: null,
        turn_count: checked_game.turn_count + 1
    }));
};

/**
 * Returns true when a square is completely clear — not occupied by the Thief,
 * King, Exit, traffic barrier, or police car — and can therefore accept a
 * new police car placement.
 * @param {object} game The current game state.
 * @param {object} position The square to check.
 * @returns {boolean} True when the square is free for a police car.
 * @private
 */
is_empty_for_barrier = function is_empty_for_barrier(game, position) {
    return (
        game.board[position.row][position.column] === EMPTY
        && !same_position(position, game.thief)
        && !same_position(position, game.king)
        && !same_position(position, game.exit)
    );
};

/**
 * Flood-fills outward from the Thief's square to check whether at least one
 * open path to the Exit still exists. Traffic barriers block the flood;
 * police cars also block it. Used to ensure no placement ever traps the Thief.
 * @param {string[][]} board The board to search.
 * @param {object} start The Thief's current square.
 * @param {object} exit_position The Exit square to try to reach.
 * @returns {boolean} True when the Thief has at least one route to the Exit.
 * @private
 */
is_exit_reachable = function is_exit_reachable(board, start, exit_position) {
    const queue = [copy_position(start)];
    const visited = create_empty_board();

    visited[start.row][start.column] = "visited";

    while (queue.length > 0) {
        const current = queue.shift();

        if (same_position(current, exit_position)) {
            return true;
        }

        const next_neighbours = neighbours(current);
        let index = 0;

        while (index < next_neighbours.length) {
            const neighbour = next_neighbours[index];

            if (
                is_inside_board(neighbour.row, neighbour.column)
                && visited[neighbour.row][neighbour.column] !== "visited"
                && board[neighbour.row][neighbour.column] !== BARRIER
            ) {
                visited[neighbour.row][neighbour.column] = "visited";
                queue.push(neighbour);
            }

            index += 1;
        }
    }

    return false;
};

/**
 * Returns true when the Thief is allowed to step onto or slide through a
 * square — it must be on the board and not contain a traffic barrier,
 * police car, or the King.
 * @param {string[][]} board The board to inspect.
 * @param {object} position The square to check.
 * @returns {boolean} True when the Thief can enter that square.
 * @private
 */
is_open_square = function is_open_square(board, position) {
    return (
        is_inside_board(position.row, position.column)
        && !is_blocking_square(board[position.row][position.column])
    );
};

/**
 * Returns true when the contents of a square stop the Thief from passing
 * through it. Traffic barriers, police cars, and the King all block.
 * @param {string} square The marker stored in the board cell.
 * @returns {boolean} True when the Thief cannot slide through this square.
 * @private
 */
is_blocking_square = function is_blocking_square(square) {
    return square === BARRIER || square === POLICE_CAR || square === KING;
};

/**
 * Returns the four squares directly above, below, left, and right of a given
 * square. Used by the flood-fill path check to explore routes to the Exit.
 * @param {object} position The square to find neighbours of.
 * @returns {object[]} The four adjacent squares (may include off-board squares).
 * @private
 */
neighbours = function neighbours(position) {
    return [
        {row: position.row - 1, column: position.column},
        {row: position.row + 1, column: position.column},
        {row: position.row, column: position.column - 1},
        {row: position.row, column: position.column + 1}
    ];
};

/**
 * Returns true when two squares share the same row and column — used to
 * check whether two pieces are on the same square (e.g. King on Thief).
 * @param {object} first One square position.
 * @param {object} second Another square position.
 * @returns {boolean} True when both squares are the same place on the board.
 * @private
 */
same_position = function same_position(first, second) {
    return first.row === second.row && first.column === second.column;
};

Object.assign(ChessThieves, {
    BARRIER,
    BOARD_SIZE,
    EMPTY,
    EXIT,
    KING,
    MAX_BARRIERS,
    MAX_TURNS,
    PLAYER_KING,
    PLAYER_THIEF,
    POLICE_CAR,
    THIEF,
    check_winner,
    create_empty_board,
    create_new_game,
    get_square_label,
    is_game_ended,
    is_inside_board,
    is_path_clear,
    is_valid_barrier_placement,
    is_valid_bishop_move,
    is_valid_king_move,
    is_valid_knight_move,
    is_valid_queen_move,
    is_valid_rook_move,
    is_valid_pawn_move,
    is_valid_thief_move,
    move_king,
    move_thief,
    pass_turn,
    place_barrier,
    roll_thief_die,
    set_thief_move,
    thief_move_die
});

export default Object.freeze(ChessThieves);

export {
    BARRIER,
    BOARD_SIZE,
    EMPTY,
    EXIT,
    KING,
    MAX_BARRIERS,
    MAX_TURNS,
    PLAYER_KING,
    PLAYER_THIEF,
    POLICE_CAR,
    THIEF,
    check_winner,
    create_empty_board,
    create_new_game,
    get_square_label,
    is_game_ended,
    is_inside_board,
    is_path_clear,
    is_valid_barrier_placement,
    is_valid_bishop_move,
    is_valid_king_move,
    is_valid_knight_move,
    is_valid_queen_move,
    is_valid_rook_move,
    is_valid_pawn_move,
    is_valid_thief_move,
    move_king,
    move_thief,
    pass_turn,
    place_barrier,
    roll_thief_die,
    set_thief_move,
    thief_move_die
};
