import R from "./ramda.js";
/**
 * Chess Thieves is played on an 8 by 8 board. The Thief tries to reach the
 * Exit, while the King tries to catch the Thief or delay the escape until the
 * turn limit is passed.
 *
 * A successful action returns a new game state; an illegal action returns null.
 *
 * @namespace ChessThieves
 */

const ChessThieves = Object.create(null);

/**
 * A board coordinate.
 * @typedef {object} ChessThieves.Position
 * @property {number} row Row index, from 0 at the top to 7 at the bottom.
 * @property {number} column Column index, from 0 at the left to 7 at the right.
 */

/**
 * Complete game state for one Chess Thieves match.
 *
 * Returned by `create_new_game` and by successful action functions such as
 * `set_thief_move`, `move_thief`, `move_king`, and `place_police_car`.
 * @typedef {object} ChessThieves.GameState
 * @property {ChessThieves.Position} thief Current Thief square.
 * @property {ChessThieves.Position} king Current King square.
 * @property {ChessThieves.Position} exit Escape square the Thief must reach.
 * @property {ChessThieves.Position[]} map_barriers Permanent traffic barriers.
 * @property {ChessThieves.Position[]} police_cars Police cars placed by the
 * King.
 * @property {string} current_player Either `PLAYER_THIEF` or `PLAYER_KING`.
 * @property {string|null} thief_move The Thief's current die result, or null
 * before the Thief has rolled this turn.
 * @property {number} turn_count Current round number.
 * @property {string|null} winner `PLAYER_THIEF`, `PLAYER_KING`, or null while
 * the match is still running.
 * @property {string[][]} board Current board contents as marker strings.
 */

/**
 * The width and height of the board, in squares.
 * @memberof ChessThieves
 * @constant {number}
 */
const BOARD_SIZE = 8;

/**
 * The round number after which the King wins by running out the clock.
 * @memberof ChessThieves
 * @constant {number}
 */
const MAX_TURNS = 15;

/**
 * The most police cars the King may place during a match.
 * @memberof ChessThieves
 * @constant {number}
 */
const MAX_POLICE_CARS = 5;

const EMPTY = "empty";

const THIEF = "thief";

const KING = "king";

const EXIT = "exit";

const BARRIER = "barrier";

const POLICE_CAR = "police_car";

/**
 * State value for the Thief player.
 *
 * Used in `current_player` when it is the Thief's turn, and in `winner` when
 * the Thief has escaped.
 * @memberof ChessThieves
 * @constant {string}
 */
const PLAYER_THIEF = "thief";

/**
 * State value for the King player.
 *
 * Used in `current_player` when it is the King's turn, and in `winner` when
 * the King has caught the Thief or won by the turn limit.
 * @memberof ChessThieves
 * @constant {string}
 */
const PLAYER_KING = "king";

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
const START_TRAFFIC_BARRIER_COUNT = 4;

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

const board_indexes = function board_indexes() {
    return R.range(0, BOARD_SIZE);
};

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

const create_empty_board = function create_empty_board() {
    return R.map(function create_row() {
        return R.repeat(EMPTY, BOARD_SIZE);
    }, board_indexes());
};

const square_at_position = function square_at_position(game, position) {
    if (same_position(position, game.king)) {
        return KING;
    }

    if (same_position(position, game.thief)) {
        return THIEF;
    }

    if (same_position(position, game.exit)) {
        return EXIT;
    }

    if (contains_position(game.map_barriers || [], position)) {
        return BARRIER;
    }

    if (contains_position(game.police_cars || [], position)) {
        return POLICE_CAR;
    }

    return EMPTY;
};

const board_from_state = function board_from_state(game) {
    return R.map(function make_row(row) {
        return R.map(function make_cell(column) {
            return square_at_position(game, {row, column});
        }, board_indexes());
    }, board_indexes());
};

const path_positions = function path_positions(
    start,
    end,
    row_step,
    column_step
) {
    const distance = Math.max(
        Math.abs(end.row - start.row),
        Math.abs(end.column - start.column)
    );

    return R.map(function position_at_step(step) {
        return {
            row: start.row + (row_step * step),
            column: start.column + (column_step * step)
        };
    }, R.range(1, distance));
};

const is_unblocked_path_position = function is_unblocked_path_position(board) {
    return function check_path_position(position) {
        return !is_blocking_square(board[position.row][position.column]);
    };
};

const contains_position = function contains_position(positions, position) {
    return R.any(function is_same_position(current_position) {
        return same_position(current_position, position);
    }, positions);
};

const path_is_slide_shape = function path_is_slide_shape(
    row_difference,
    column_difference
) {
    return (
        Math.abs(row_difference) === Math.abs(column_difference)
        || row_difference === 0
        || column_difference === 0
    );
};

const path_has_distance = function path_has_distance(
    row_step,
    column_step
) {
    return row_step !== 0 || column_step !== 0;
};

const open_neighbours = function open_neighbours(board, visited) {
    return function open_neighbours_from(position) {
        return R.filter(function can_visit(neighbour) {
            return (
                is_inside_board(neighbour.row, neighbour.column)
                && visited[neighbour.row][neighbour.column] !== "visited"
                && board[neighbour.row][neighbour.column] !== BARRIER
                && board[neighbour.row][neighbour.column] !== POLICE_CAR
            );
        }, neighbours(position));
    };
};

const mark_position_visited = function mark_position_visited(
    visited,
    position
) {
    visited[position.row][position.column] = "visited";
    return visited;
};

const mark_visited_positions = function mark_visited_positions(
    visited,
    positions
) {
    return R.reduce(mark_position_visited, visited, positions);
};

const is_open_square = function is_open_square(board, position) {
    return (
        is_inside_board(position.row, position.column)
        && !is_blocking_square(board[position.row][position.column])
    );
};

const is_path_clear = function is_path_clear(board, start, end) {
    const row_difference = end.row - start.row;
    const column_difference = end.column - start.column;
    const row_step = Math.sign(row_difference);
    const column_step = Math.sign(column_difference);

    if (
        !path_is_slide_shape(row_difference, column_difference)
        || !path_has_distance(row_step, column_step)
    ) {
        return false;
    }

    return R.all(
        is_unblocked_path_position(board),
        path_positions(start, end, row_step, column_step)
    );
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

const is_exit_reachable = function is_exit_reachable(
    board,
    start,
    exit_position
) {
    let queue = [copy_position(start)];
    const visited = create_empty_board();

    visited[start.row][start.column] = "visited";

    while (queue.length > 0) {
        const current = queue.shift();

        if (same_position(current, exit_position)) {
            return true;
        }

        const next_neighbours = open_neighbours(board, visited)(current);

        mark_visited_positions(visited, next_neighbours);
        queue = queue.concat(next_neighbours);
    }

    return false;
};

const is_valid_queen_move = function is_valid_queen_move(board, start, end) {
    return (
        is_valid_bishop_move(board, start, end)
        || is_valid_rook_move(board, start, end)
    );
};

const thief_move_validators = Object.freeze({
    bishop: is_valid_bishop_move,
    knight: is_valid_knight_move,
    pawn: is_valid_pawn_move,
    queen: is_valid_queen_move,
    rook: is_valid_rook_move
});

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

const is_empty_for_police_car = function is_empty_for_police_car(
    game,
    position
) {
    return (
        game.board[position.row][position.column] === EMPTY
        && !same_position(position, game.thief)
        && !same_position(position, game.king)
        && !same_position(position, game.exit)
    );
};

/**
 * Checks whether the Thief can move to a proposed destination.
 *
 * The chosen square must be legal for the die result passed in `move_type`.
 * This includes the pawn, knight, bishop, rook, and queen movement rules used
 * by Chess Thieves, plus board blockers such as traffic barriers, police cars,
 * and the King.
 *
 * @param {ChessThieves.GameState} game The current game state.
 * @param {string} move_type The die result to apply.
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

    const validate_move = thief_move_validators[move_type];

    return (
        validate_move !== undefined
        && validate_move(game.board, start, end)
    );
};

/**
 * Checks whether a square is a legal King move destination.
 *
 * The King must move exactly one square in any direction. The King can enter
 * the Thief's square to win, but cannot enter the Exit square, traffic
 * barriers, police cars, or any square outside the board.
 *
 * @param {ChessThieves.GameState} game The current game state.
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
 * @param {ChessThieves.GameState} game The current game state.
 * @returns {string|null} `PLAYER_THIEF`, `PLAYER_KING`, or null when nobody
 * has won yet.
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

const is_reachable_with_traffic_barrier = function reachable_with_barrier(
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
        police_cars: []
    };

    const board = board_from_state(test_game);

    return is_exit_reachable(board, occupied[0], occupied[2]);
};

/**
 * Checks whether a square can receive a King-placed police car.
 *
 * A valid placement must be on the board, empty, within `MAX_POLICE_CARS`, and
 * must leave at least one open path from the Thief to the Exit after the police
 * car is added.
 *
 * @param {ChessThieves.GameState} game The current game state.
 * @param {ChessThieves.Position} position The square where the King wants to
 * place a police car.
 * @returns {boolean} True when `place_police_car` would accept this square.
 * @memberof ChessThieves
 * @function
 */
const is_valid_police_car_placement = function is_valid_police_car_placement(
    game,
    position
) {
    if (
        game.police_cars.length >= MAX_POLICE_CARS
        || !is_inside_board(position.row, position.column)
        || !is_empty_for_police_car(game, position)
    ) {
        return false;
    }

    const next_police_cars = game.police_cars.concat([position]);
    const next_game = Object.assign({}, game, {
        police_cars: next_police_cars
    });
    const next_board = board_from_state(next_game);

    return is_exit_reachable(next_board, game.thief, game.exit);
};

/**
 * Checks whether the match is over.
 *
 * A match is over once the Thief reaches the Exit, the King catches the Thief,
 * or the turn limit gives the King the win.
 *
 * @param {ChessThieves.GameState} game The current game state.
 * @returns {boolean} True when the current state has a winner.
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

const create_random_start_traffic_barriers = function start_traffic_barriers(
    occupied,
    random_function
) {
    let barriers = [];

    while (barriers.length < START_TRAFFIC_BARRIER_COUNT) {
        let rejected = [];
        let found_barrier = false;

        while (!found_barrier) {
            const barrier = random_empty_position(
                occupied.concat(barriers, rejected),
                random_function
            );

            if (
                is_reachable_with_traffic_barrier(
                    occupied,
                    barriers,
                    barrier
                )
            ) {
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
    const barriers = create_random_start_traffic_barriers(
        [thief, king, exit],
        random_function
    );

    return {thief, king, exit, barriers};
};

/**
 * Rolls the Thief's movement die and returns the move type for this turn.
 *
 * Pawn appears twice on the die, while knight, bishop, rook, and queen each
 * appear once.
 *
 * @param {Function} [random_function=Math.random] Optional random number
 * source that returns a value from 0 up to, but not including, 1. Supplying a
 * fixed function makes tests deterministic.
 * @returns {string} One of "pawn", "knight", "bishop", "rook", or "queen".
 * @example
 * const move_type = roll_thief_die();
 * game = set_thief_move(game, move_type);
 * @memberof ChessThieves
 * @function
 */
const roll_thief_die = function roll_thief_die(random_function = Math.random) {
    const roll = Math.floor(random_function() * thief_move_die.length);
    return thief_move_die[roll];
};

/**
 * Applies the Thief's chosen destination after a die roll has been set.
 *
 * The destination must match `game.thief_move`, must be reachable under that
 * move type's rules, and must not be occupied by the King. When the move
 * succeeds, control passes to the King unless the Thief reaches the Exit, in
 * which case `winner` becomes `PLAYER_THIEF`.
 *
 * The input state is not changed. A legal move returns the next game state; an
 * illegal move returns null.
 *
 * @param {ChessThieves.GameState} game The current game state.
 * @param {ChessThieves.Position} end The square the Thief wants to move to.
 * @returns {ChessThieves.GameState|null} The updated game state, or null if
 * the move is not allowed.
 * @example
 * let next_game = set_thief_move(game, "rook");
 * next_game = move_thief(next_game, {row: 6, column: 0});
 * if (next_game !== null) {
 *     game = next_game;
 * }
 * @memberof ChessThieves
 * @function
 */
const move_thief = function move_thief(game, end) {
    if (
        game.current_player !== PLAYER_THIEF
        || is_game_ended(game)
        || !is_valid_thief_move(game, game.thief_move, game.thief, end)
    ) {
        return null;
    }

    return finish_game_state(Object.assign({}, game, {
        thief: copy_position(end),
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
 * @param {ChessThieves.GameState} game The current game state.
 * @param {ChessThieves.Position} end The square the King wants to move to.
 * @returns {ChessThieves.GameState|null} The updated game state, or null if
 * the move is not allowed.
 * @example
 * const next_game = move_king(game, {
 *     row: game.king.row + 1,
 *     column: game.king.column
 * });
 * if (next_game !== null) {
 *     game = next_game;
 * }
 * @memberof ChessThieves
 * @function
 */
const move_king = function move_king(game, end) {
    if (
        game.current_player !== PLAYER_KING
        || is_game_ended(game)
        || !is_valid_king_move(game, end)
    ) {
        return null;
    }

    return finish_king_turn(Object.assign({}, game, {
        king: copy_position(end)
    }));
};

/**
 * Applies the King's police-car placement action.
 *
 * Police cars are player-placed blockers. The King may place up to
 * `MAX_POLICE_CARS` of them, but only on empty squares. A placement is
 * rejected if it would leave the Thief with no route to the Exit, because
 * Chess Thieves is a chase-and-block game rather than a complete-trapping game.
 *
 * After a legal placement, the round advances just like a King move:
 * `turn_count` increases, `thief_move` resets to null, and the Thief takes the
 * next turn.
 *
 * @param {ChessThieves.GameState} game The current game state.
 * @param {ChessThieves.Position} position The proposed police-car square.
 * @returns {ChessThieves.GameState|null} The updated game state, or null if
 * placement is not allowed.
 * @example
 * const next_game = place_police_car(game, {row: 3, column: 4});
 * if (next_game === null) {
 *     // The placement is not legal.
 * }
 * @memberof ChessThieves
 * @function
 */
const place_police_car = function place_police_car(game, position) {
    const police_car = copy_position(position);

    if (
        game.current_player !== PLAYER_KING
        || is_game_ended(game)
        || !is_valid_police_car_placement(game, police_car)
    ) {
        return null;
    }

    const next_game = Object.assign({}, game, {
        police_cars: game.police_cars.concat([police_car])
    });

    return finish_king_turn(Object.assign({}, next_game, {
        board: board_from_state(next_game)
    }));
};

/**
 * Stores the Thief's die result for the current turn.
 *
 * Chess Thieves separates rolling from moving. After a roll is stored, the
 * Thief must either move with that move type or skip; a second roll in the same
 * Thief turn is rejected.
 *
 * @param {ChessThieves.GameState} game The current game state.
 * @param {string} move_type The die result for this turn.
 * @returns {ChessThieves.GameState|null} The updated game state, or null if
 * the roll is not accepted.
 * @example
 * const move_type = roll_thief_die();
 * const next_game = set_thief_move(game, move_type);
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
 * @param {ChessThieves.GameState} game The current game state.
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
 * let game = create_new_game();
 * const roll = roll_thief_die();
 * game = set_thief_move(game, roll);
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
        police_cars: [],
        current_player: PLAYER_THIEF,
        thief_move: null,
        turn_count: 1,
        winner: null,
        board: create_empty_board()
    });
};

Object.assign(ChessThieves, {
    BOARD_SIZE,
    MAX_POLICE_CARS,
    MAX_TURNS,
    PLAYER_KING,
    PLAYER_THIEF,
    check_winner,
    create_new_game,
    is_game_ended,
    is_valid_police_car_placement,
    is_valid_king_move,
    is_valid_thief_move,
    move_king,
    move_thief,
    pass_turn,
    place_police_car,
    roll_thief_die,
    set_thief_move
});

export default Object.freeze(ChessThieves);
