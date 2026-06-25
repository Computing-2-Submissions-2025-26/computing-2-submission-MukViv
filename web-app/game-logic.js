/*jslint*/
/**
 * Pure rule engine for Chess Thieves.
 *
 * Chess Thieves is played on an 8 by 8 board. The Thief starts on the bottom
 * row and tries to reach the Exit. The King starts near the top and tries to
 * catch the Thief or delay the escape until the turn limit is passed. The
 * browser interface imports this module, but this file does not use the DOM,
 * so another project can reuse the same functions for a different interface,
 * a command-line version, or automated tests.
 *
 * Public functions never mutate the game object they receive. A successful
 * action returns a new game state; an illegal action returns null. That means
 * callers can treat null as a rejected action and keep their previous state.
 *
 * A normal turn sequence is: create a game, roll the Thief's movement die,
 * store that die result, move or skip the Thief, then let the King move,
 * place a police car, or skip. The King wins by catching the Thief or by
 * delaying the escape past the turn limit. The Thief wins by reaching the
 * Exit square.
 *
 * @namespace ChessThieves
 */
const ChessThieves = Object.create(null);

/**
 * A board coordinate. Row 0 is the top row and column 0 is the left column.
 * The playable board accepts only integer rows and columns from 0 to 7.
 * @typedef {object} ChessThieves.Position
 * @property {number} row The vertical board index, where 0 is the top.
 * @property {number} column The horizontal board index, where 0 is the left.
 */

/**
 * Player identifier used for turns and winners.
 *
 * `PLAYER_THIEF` means the Thief is active or has escaped. `PLAYER_KING`
 * means the King is active or has caught/delayed the Thief.
 * @typedef {("thief" | "king")} ChessThieves.Player
 */

/**
 * Movement die face for the Thief's current turn.
 *
 * Pawn is a one-square orthogonal step, knight is an L-shaped jump, bishop is
 * a diagonal slide of up to four squares, rook is a straight slide of up to
 * four squares, and queen is either a bishop or rook slide.
 * Values are "pawn", "knight", "bishop", "rook", or "queen".
 * @typedef {string} ChessThieves.MoveType
 */

/**
 * Marker stored in each board cell.
 *
 * `EMPTY` is an open square. `THIEF`, `KING`, and `EXIT` show the main game
 * pieces and target. `BARRIER` marks permanent setup traffic barriers, while
 * `POLICE_CAR` marks the blockers placed by the King during play.
 * Values are "empty", "thief", "king", "exit", "barrier", or "police_car".
 * @typedef {string} ChessThieves.SquareMarker
 */

/**
 * Human-readable label for a board square.
 *
 * These labels are intended for interfaces, screen-reader text, and debugging
 * output. They include normal square contents plus the special win-state
 * labels "Thief at the Exit" and "King caught the Thief".
 * @typedef {string} ChessThieves.SquareLabel
 */

/**
 * The board array used by the rule engine.
 *
 * The first index is the row and the second index is the column, so
 * `board[2][5]` means row 2, column 5. Each cell contains one exported square
 * marker: `EMPTY`, `THIEF`, `KING`, `EXIT`, `BARRIER`, or `POLICE_CAR`.
 * @typedef {ChessThieves.SquareMarker[][]} ChessThieves.Board
 */

/**
 * Complete game state for one Chess Thieves match.
 *
 * Store the object returned by `create_new_game`, then pass the latest state
 * into actions such as `set_thief_move`, `move_thief`, `move_king`, and
 * `place_barrier`. The returned state includes an updated `board` and `winner`
 * field after every accepted action.
 * @typedef {object} ChessThieves.GameState
 * @property {ChessThieves.Position} thief Current Thief square.
 * @property {ChessThieves.Position} king Current King square.
 * @property {ChessThieves.Position} exit Escape square the Thief must reach.
 * @property {ChessThieves.Position[]} map_barriers Permanent traffic barriers
 * randomly placed at setup.
 * @property {ChessThieves.Position[]} barriers Police cars placed by the King.
 * @property {ChessThieves.Player} current_player The side that must act next.
 * @property {ChessThieves.MoveType|null} thief_move The Thief's current die
 * result, or null before the Thief has rolled this turn.
 * @property {number} turn_count Current round number. It starts at 1 and
 * increases after the King acts or skips.
 * @property {ChessThieves.Player|null} winner The winner, or null while the
 * match is still running.
 * @property {ChessThieves.Board} board Board markers rebuilt from the current
 * positions, permanent barriers, and placed police cars.
 */

/**
 * Number of rows and columns on a Chess Thieves board.
 * @memberof ChessThieves
 * @constant {number}
 */
const BOARD_SIZE = 8;

/**
 * Highest round number the Thief can use before the King wins by delay.
 * @memberof ChessThieves
 * @constant {number}
 */
const MAX_TURNS = 15;

/**
 * Maximum number of police cars the King may place during a match.
 * @memberof ChessThieves
 * @constant {number}
 */
const MAX_BARRIERS = 5;

/**
 * Marker for a square with no piece, Exit, traffic barrier, or police car.
 * @memberof ChessThieves
 * @constant {ChessThieves.SquareMarker}
 */
const EMPTY = "empty";

/**
 * Marker for the Thief's current square.
 * @memberof ChessThieves
 * @constant {ChessThieves.SquareMarker}
 */
const THIEF = "thief";

/**
 * Marker for the King's current square.
 * @memberof ChessThieves
 * @constant {ChessThieves.SquareMarker}
 */
const KING = "king";

/**
 * Marker for the square the Thief must reach to win.
 * @memberof ChessThieves
 * @constant {ChessThieves.SquareMarker}
 */
const EXIT = "exit";

/**
 * Marker for a permanent traffic barrier placed during game setup.
 * @memberof ChessThieves
 * @constant {ChessThieves.SquareMarker}
 */
const BARRIER = "barrier";

/**
 * Marker for a police car placed by the King during play.
 * @memberof ChessThieves
 * @constant {ChessThieves.SquareMarker}
 */
const POLICE_CAR = "police_car";

/**
 * Turn and winner value used when the Thief is active or has escaped.
 * @memberof ChessThieves
 * @constant {ChessThieves.Player}
 */
const PLAYER_THIEF = "thief";

/**
 * Turn and winner value used when the King is active or has won.
 * @memberof ChessThieves
 * @constant {ChessThieves.Player}
 */
const PLAYER_KING = "king";

/**
 * The six possible faces on the Thief movement die.
 *
 * Pawn appears twice, so it has a 2-in-6 chance. Knight, bishop, rook, and
 * queen each appear once. The strings in this array are the same values that
 * `roll_thief_die` returns and `set_thief_move` accepts.
 * @memberof ChessThieves
 * @constant {ChessThieves.MoveType[]}
 */
const thief_move_die = Object.freeze([
    "pawn",
    "pawn",
    "knight",
    "bishop",
    "rook",
    "queen"
]);

const START_THIEF_ROW = 7;
const START_KING_ROW = 0;
const START_EXIT_ROW = 1;
const START_BARRIER_COUNT = 4;

// Private helpers — each only references consts defined above it.

const same_position = function same_position(first, second) {
    return first.row === second.row && first.column === second.column;
};

const is_blocking_square = function is_blocking_square(square) {
    return square === BARRIER || square === POLICE_CAR || square === KING;
};

const neighbours = function neighbours(position) {
    return [
        {row: position.row - 1, column: position.column},
        {row: position.row + 1, column: position.column},
        {row: position.row, column: position.column - 1},
        {row: position.row, column: position.column + 1}
    ];
};

const copy_position = function copy_position(position) {
    return {
        row: position.row,
        column: position.column
    };
};

/**
 * Checks whether a coordinate can exist on a Chess Thieves board.
 *
 * A valid coordinate must use whole-number indexes from 0 to 7. Fractional,
 * negative, and edge-overflow coordinates are outside the playable board.
 *
 * @param {number} row The row to check (0 = top, 7 = bottom).
 * @param {number} column The column to check (0 = left, 7 = right).
 * @returns {boolean} True when the square exists on the board.
 * @memberof ChessThieves
 * @function
 */
const is_inside_board = function is_inside_board(row, column) {
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
 * Creates an empty 8 by 8 board using the Chess Thieves board format.
 *
 * The board contains only `EMPTY` markers. It does not place the Thief, King,
 * Exit, traffic barriers, or police cars; those appear in full states created
 * by `create_new_game`.
 *
 * @returns {ChessThieves.Board} A board where every cell is `EMPTY`.
 * @example
 * const board = ChessThieves.create_empty_board();
 * board[4][5] = ChessThieves.BARRIER;
 * ChessThieves.is_valid_rook_move(
 *     board,
 *     {row: 4, column: 4},
 *     {row: 4, column: 7}
 * );
 * @memberof ChessThieves
 * @function
 */
const create_empty_board = function create_empty_board() {
    return Array.from({length: BOARD_SIZE}, function create_row() {
        return Array.from({length: BOARD_SIZE}, function create_cell() {
            return EMPTY;
        });
    });
};

const is_open_square = function is_open_square(board, position) {
    return (
        is_inside_board(position.row, position.column)
        && !is_blocking_square(board[position.row][position.column])
    );
};

/**
 * Checks whether a sliding Thief move has an unobstructed path.
 *
 * This helper is for bishop, rook, and queen movement. `start` and `end` must
 * form a straight or diagonal line; otherwise the path is not clear. The ending
 * square is not checked here, only the squares between start and end.
 *
 * @param {ChessThieves.Board} board The board to inspect.
 * @param {ChessThieves.Position} start The square the Thief is moving from.
 * @param {ChessThieves.Position} end The square the Thief wants to reach.
 * @returns {boolean} True when no traffic barrier, police car, or King blocks
 * the path between the two squares.
 * @memberof ChessThieves
 * @function
 */
const is_path_clear = function is_path_clear(board, start, end) {
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

const contains_position = function contains_position(positions, position) {
    return positions.some(function is_same_position(current_position) {
        return same_position(current_position, position);
    });
};

const position_from_square_number = function position_from_square_number(
    square_number
) {
    return {
        row: Math.floor(square_number / BOARD_SIZE),
        column: square_number % BOARD_SIZE
    };
};

const random_column = function random_column(random_function) {
    return Math.floor(random_function() * BOARD_SIZE);
};

/**
 * Checks the pawn face of the Thief movement die.
 *
 * In Chess Thieves, pawn means exactly one orthogonal step: up, down, left, or
 * right. It cannot move diagonally or jump two squares. The destination must be
 * inside the board and must not contain a blocking marker such as the King, a
 * traffic barrier, or a police car.
 *
 * @param {ChessThieves.Board} board The board to test against.
 * @param {ChessThieves.Position} start The Thief's current square.
 * @param {ChessThieves.Position} end The square the Thief wants to enter.
 * @returns {boolean} True when this is a legal pawn move for the Thief.
 * @memberof ChessThieves
 * @function
 */
const is_valid_pawn_move = function is_valid_pawn_move(board, start, end) {
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
 * Checks the knight face of the Thief movement die.
 *
 * Knight means the standard chess L-shape: two squares along one axis and one
 * square along the other. The Thief may jump over intervening squares, so only
 * the destination is checked for blockers. The destination still cannot be the
 * King, a traffic barrier, or a police car.
 *
 * @param {ChessThieves.Board} board The board to test against.
 * @param {ChessThieves.Position} start The Thief's current square.
 * @param {ChessThieves.Position} end The square the Thief wants to jump to.
 * @returns {boolean} True when this is a legal knight move for the Thief.
 * @memberof ChessThieves
 * @function
 */
const is_valid_knight_move = function is_valid_knight_move(board, start, end) {
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
 * Checks the bishop face of the Thief movement die.
 *
 * Bishop means a diagonal slide of one to four squares. The row distance and
 * column distance must match, and every square between `start` and `end` must
 * be clear. Traffic barriers, police cars, and the King all block the slide.
 *
 * @param {ChessThieves.Board} board The board to test against.
 * @param {ChessThieves.Position} start The Thief's current square.
 * @param {ChessThieves.Position} end The square the Thief wants to reach.
 * @returns {boolean} True when this is a legal bishop move for the Thief.
 * @memberof ChessThieves
 * @function
 */
const is_valid_bishop_move = function is_valid_bishop_move(board, start, end) {
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
 * Checks the rook face of the Thief movement die.
 *
 * Rook means a horizontal or vertical slide of one to four squares. The move
 * must stay in a single row or a single column, and the path must be clear.
 * The Thief cannot pass through traffic barriers, police cars, or the King.
 *
 * @param {ChessThieves.Board} board The board to test against.
 * @param {ChessThieves.Position} start The Thief's current square.
 * @param {ChessThieves.Position} end The square the Thief wants to reach.
 * @returns {boolean} True when this is a legal rook move for the Thief.
 * @memberof ChessThieves
 * @function
 */
const is_valid_rook_move = function is_valid_rook_move(board, start, end) {
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

const board_from_state = function board_from_state(game) {
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

const is_exit_reachable = function is_exit_reachable(
    board,
    start,
    exit_position
) {
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
 * Checks the queen face of the Thief movement die.
 *
 * Queen combines the bishop and rook rules used in this game: the Thief may
 * move diagonally, horizontally, or vertically, but only one to four squares.
 * Like other sliding moves, the path must not pass through the King, a traffic
 * barrier, or a police car.
 *
 * @param {ChessThieves.Board} board The board to test against.
 * @param {ChessThieves.Position} start The Thief's current square.
 * @param {ChessThieves.Position} end The square the Thief wants to reach.
 * @returns {boolean} True when this is a legal queen move for the Thief.
 * @memberof ChessThieves
 * @function
 */
const is_valid_queen_move = function is_valid_queen_move(board, start, end) {
    return (
        is_valid_bishop_move(board, start, end)
        || is_valid_rook_move(board, start, end)
    );
};

const random_unused_column = function random_unused_column(
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

const random_empty_position = function random_empty_position(
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

const is_empty_for_barrier = function is_empty_for_barrier(game, position) {
    return (
        game.board[position.row][position.column] === EMPTY
        && !same_position(position, game.thief)
        && !same_position(position, game.king)
        && !same_position(position, game.exit)
    );
};

/**
 * Checks whether a proposed Thief destination matches the rolled die face.
 *
 * The move type must be the Thief's die result for the turn. This function
 * delegates to the pawn, knight, bishop, rook, or queen rule and also applies
 * the Chess Thieves capture rule: the Thief cannot move onto the King's square.
 *
 * @param {ChessThieves.GameState} game A Chess Thieves state to validate.
 * @param {ChessThieves.MoveType} move_type The die result to apply.
 * @param {ChessThieves.Position} start The Thief's current square.
 * @param {ChessThieves.Position} end The square the Thief wants to move to.
 * @returns {boolean} True when the destination is legal for that die result.
 * @memberof ChessThieves
 * @function
 */
const is_valid_thief_move = function is_valid_thief_move(
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
 * Checks whether a square is a legal King move destination.
 *
 * The King must move exactly one square in any direction. The King can enter
 * the Thief's square to win, but cannot enter the Exit square, traffic
 * barriers, police cars, or any square outside the board.
 *
 * @param {ChessThieves.GameState} game A Chess Thieves state to validate.
 * @param {ChessThieves.Position} end The square the King wants to move to.
 * @returns {boolean} True when `move_king` would accept this destination.
 * @memberof ChessThieves
 * @function
 */
const is_valid_king_move = function is_valid_king_move(game, end) {
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
 * Calculates the winner from the current board positions and round count.
 *
 * The Thief wins immediately by occupying the Exit. The King wins immediately
 * by occupying the same square as the Thief. If neither piece-position win has
 * happened and `turn_count` is greater than `MAX_TURNS`, the King wins because
 * the Thief failed to escape in time.
 *
 * @param {ChessThieves.GameState} game A Chess Thieves state to inspect.
 * @returns {ChessThieves.Player|null} `PLAYER_THIEF`, `PLAYER_KING`, or null
 * when nobody has won yet.
 * @memberof ChessThieves
 * @function
 */
const check_winner = function check_winner(game) {
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

const is_reachable_with_barrier = function is_reachable_with_barrier(
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
 * Checks whether a square can receive a King-placed police car.
 *
 * A valid placement must be on the board, empty, within `MAX_BARRIERS`, and
 * must leave at least one open path from the Thief to the Exit after the police
 * car is added.
 *
 * @param {ChessThieves.GameState} game A Chess Thieves state to validate.
 * @param {ChessThieves.Position} position The square where the King wants to
 * place a police car.
 * @returns {boolean} True when `place_barrier` would accept this square.
 * @memberof ChessThieves
 * @function
 */
const is_valid_barrier_placement = function is_valid_barrier_placement(
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

    return is_exit_reachable(next_board, game.thief, game.exit);
};

/**
 * Checks whether the match is over.
 *
 * This is a convenience wrapper around `check_winner`. A match is ended as
 * soon as the Thief has escaped, the King has caught the Thief, or the King
 * has won by the turn limit.
 *
 * @param {ChessThieves.GameState} game A Chess Thieves state to inspect.
 * @returns {boolean} True when `check_winner(game)` is not null.
 * @memberof ChessThieves
 * @function
 */
const is_game_ended = function is_game_ended(game) {
    return check_winner(game) !== null;
};

const finish_game_state = function finish_game_state(game) {
    const next_game = Object.assign({}, game, {
        board: board_from_state(game)
    });

    return Object.assign({}, next_game, {
        winner: check_winner(next_game)
    });
};

const create_random_start_barriers = function create_random_start_barriers(
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

const finish_king_turn = function finish_king_turn(game) {
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

const create_random_setup = function create_random_setup(random_function) {
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
 * Rolls the Thief's movement die and returns the move type for this turn.
 *
 * The die faces are defined by `thief_move_die`: pawn appears twice, while
 * knight, bishop, rook, and queen each appear once. In a full game flow, call
 * this during the Thief roll phase, then pass the returned string to
 * `set_thief_move` before allowing the Thief to choose a destination.
 *
 * @param {Function} [random_function=Math.random] Optional random number
 * source that returns a value from 0 up to, but not including, 1. Supplying a
 * fixed function makes tests deterministic.
 * @returns {ChessThieves.MoveType} The move type to store for this Thief turn.
 * @example
 * const move_type = ChessThieves.roll_thief_die();
 * game = ChessThieves.set_thief_move(game, move_type);
 * @memberof ChessThieves
 * @function
 */
const roll_thief_die = function roll_thief_die(random_function = Math.random) {
    const roll = Math.floor(random_function() * thief_move_die.length);
    return thief_move_die[roll];
};

/**
 * Returns the display label for one board square.
 *
 * The label combines board markers with special end-game cases. If the Thief
 * is on the Exit, the square is labelled "Thief at the Exit"; if the King is
 * on the Thief, the square is labelled "King caught the Thief".
 *
 * @param {ChessThieves.GameState} game A Chess Thieves state to inspect.
 * @param {number} row The row of the square to describe.
 * @param {number} column The column of the square to describe.
 * @returns {ChessThieves.SquareLabel} One of "Thief", "King", "Exit",
 * "Barrier", "Police Car", "Empty", "Thief at the Exit", or
 * "King caught the Thief".
 * @memberof ChessThieves
 * @function
 */
const get_square_label = function get_square_label(game, row, column) {
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
 * Applies the Thief's chosen destination after a die roll has been set.
 *
 * The state must already contain an accepted die result in `game.thief_move`.
 * The destination must match that move type's rules and must not be occupied
 * by the King. A successful non-winning move passes control to the King; a
 * move onto the Exit sets `winner` to `PLAYER_THIEF`.
 *
 * The input state is not changed. A legal move returns the next state. An
 * illegal move returns null.
 *
 * @param {ChessThieves.GameState} game A state where the Thief is active.
 * @param {number} row The row the Thief wants to move to.
 * @param {number} column The column the Thief wants to move to.
 * @returns {ChessThieves.GameState|null} The updated game state, or null if
 * the move is not allowed.
 * @example
 * let next_game = ChessThieves.set_thief_move(game, "rook");
 * next_game = ChessThieves.move_thief(next_game, 6, 0);
 * if (next_game !== null) {
 *     game = next_game;
 * }
 * @memberof ChessThieves
 * @function
 */
const move_thief = function move_thief(game, row, column) {
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
 * Applies the King's one-square movement action.
 *
 * The King can step one square horizontally, vertically, or diagonally. The
 * King may move onto the Thief to win, but cannot move onto the Exit, a traffic
 * barrier, or a police car. After a legal non-winning move, the round advances:
 * `turn_count` increases by one, `thief_move` resets to null, and the Thief
 * becomes the current player.
 *
 * @param {ChessThieves.GameState} game A state where the King is active.
 * @param {number} row The row the King wants to move to.
 * @param {number} column The column the King wants to move to.
 * @returns {ChessThieves.GameState|null} The updated game state, or null if
 * the move is not allowed.
 * @example
 * const next_game = ChessThieves.move_king(
 *     game,
 *     game.king.row + 1,
 *     game.king.column
 * );
 * if (next_game !== null) {
 *     game = next_game;
 * }
 * @memberof ChessThieves
 * @function
 */
const move_king = function move_king(game, row, column) {
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
 * Applies the King's police-car placement action.
 *
 * Police cars are player-placed blockers. The King may place up to
 * `MAX_BARRIERS` of them, but only on empty squares. A placement is rejected if
 * it would leave the Thief with no route to the Exit, because Chess Thieves is
 * a chase-and-block game rather than a complete-trapping game.
 *
 * After a legal placement, the round advances just like a King move:
 * `turn_count` increases, `thief_move` resets to null, and the Thief takes the
 * next turn.
 *
 * @param {ChessThieves.GameState} game A state where the King is active.
 * @param {number} row The row where the police car should be placed.
 * @param {number} column The column where the police car should be placed.
 * @returns {ChessThieves.GameState|null} The updated game state, or null if
 * placement is not allowed.
 * @example
 * const next_game = ChessThieves.place_barrier(game, 3, 4);
 * if (next_game === null) {
 *     // The attempted police-car placement was illegal.
 * }
 * @memberof ChessThieves
 * @function
 */
const place_barrier = function place_barrier(game, row, column) {
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
 * Stores the Thief's die result for the current turn.
 *
 * Chess Thieves separates rolling from moving. This function records the die
 * face that controls the Thief's move for the current turn. After a roll is
 * stored, the Thief must either move with that move type or skip; a second
 * roll in the same Thief turn is rejected.
 *
 * @param {ChessThieves.GameState} game A state where the Thief is active.
 * @param {ChessThieves.MoveType} move_type The die result for this turn.
 * @returns {ChessThieves.GameState|null} The updated game state, or null if
 * the roll is not accepted.
 * @example
 * const move_type = ChessThieves.roll_thief_die();
 * const next_game = ChessThieves.set_thief_move(game, move_type);
 * @memberof ChessThieves
 * @function
 */
const set_thief_move = function set_thief_move(game, move_type) {
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
 * Skips whichever side is currently active.
 *
 * If the Thief skips, control passes to the King without increasing the round
 * counter. If the King skips, the round ends: `turn_count` increases, the
 * Thief's stored die roll is cleared, and the Thief becomes active again. This
 * is the same transition used after a legal King action, so it can trigger the
 * King's turn-limit win once the counter goes beyond `MAX_TURNS`.
 *
 * @param {ChessThieves.GameState} game A state for the active side to skip.
 * @returns {ChessThieves.GameState|null} The updated game state, or null when
 * the game already has a winner.
 * @memberof ChessThieves
 * @function
 */
const pass_turn = function pass_turn(game) {
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
 * Creates the first game state for a new Chess Thieves match.
 *
 * The Thief starts on row 7. The King starts on row 0. The Exit starts on
 * row 1. Their columns are random, and four permanent traffic barriers are
 * added without blocking every route from the Thief to the Exit. The first
 * active player is always the Thief, and `thief_move` starts as null because
 * the Thief has not rolled yet.
 *
 * @param {Function} [random_function=Math.random] Optional random number
 * source for deterministic setup in tests or custom level generation.
 * @returns {ChessThieves.GameState} A complete game state ready for the Thief
 * to roll the movement die.
 * @example
 * let game = ChessThieves.create_new_game();
 * const roll = ChessThieves.roll_thief_die();
 * game = ChessThieves.set_thief_move(game, roll);
 * @memberof ChessThieves
 * @function
 */
const create_new_game = function create_new_game(
    random_function = Math.random
) {
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
