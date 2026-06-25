/*jslint long*/
import assert from "node:assert/strict";
import ChessThieves from "../game-logic.js";

const {
    BARRIER,
    MAX_POLICE_CARS,
    MAX_TURNS,
    PLAYER_KING,
    PLAYER_THIEF,
    POLICE_CAR,
    check_winner,
    create_empty_board,
    create_new_game,
    is_game_ended,
    is_path_clear,
    is_valid_police_car_placement,
    is_valid_bishop_move,
    is_valid_king_move,
    is_valid_knight_move,
    is_valid_pawn_move,
    is_valid_queen_move,
    is_valid_rook_move,
    is_valid_thief_move,
    move_king,
    move_thief,
    pass_turn,
    place_police_car,
    roll_thief_die,
    set_thief_move
} = ChessThieves;

// Returns 0, making create_new_game deterministic.
// With this seed: thief = {row:7, column:0}, exit = {row:1, column:0},
// king = {row:0, column:0}, map_barriers = [{row:0,column:1} … {row:0,column:4}].
const controlled_zero = function controlled_zero() {
    return 0;
};

// Forces current_player to PLAYER_KING without altering any other field.
const king_turn = function king_turn(game = create_new_game()) {
    return Object.assign({}, game, {current_player: PLAYER_KING});
};

const position_text = function position_text(position) {
    return "row " + String(position.row) + ", column " + String(position.column);
};

const board_text = function board_text(board) {
    return "\n" + board.map(function show_row(row) {
        return row.join(" ");
    }).join("\n");
};

const game_text = function game_text(game) {
    return (
        "\nThief: " + position_text(game.thief)
        + "\nKing: " + position_text(game.king)
        + "\nExit: " + position_text(game.exit)
        + "\nCurrent player: " + game.current_player
        + "\nTurn count: " + String(game.turn_count)
        + "\nThief move: " + String(game.thief_move)
        + "\nWinner: " + String(game.winner)
    );
};

describe("Chess Thieves", function describe_chess_thieves() {

    describe("Setup and dice", function describe_setup_and_dice() {

        it("rolls a value from the thief move die", function test_roll() {
            assert.equal(
                roll_thief_die(function minimum_roll() {
                    return 0;
                }),
                "pawn",
                "A roll of 0 should map to the first die face, which is \"pawn\"."
            );
            assert.equal(
                roll_thief_die(function maximum_roll() {
                    return 0.99;
                }),
                "queen",
                "A roll of 0.99 should map to the last die face, which is \"queen\"."
            );
        });

        it("starts the Thief in a roll phase", function test_roll_phase() {
            const game = create_new_game();
            const rolled_game = set_thief_move(game, "pawn");

            assert.equal(
                game.thief_move,
                null,
                "A freshly created game should have thief_move === null before any roll."
                + game_text(game)
            );
            assert.notEqual(
                rolled_game,
                null,
                "set_thief_move(game, \"pawn\") on a fresh game should succeed."
                + game_text(game)
            );
            assert.equal(
                rolled_game.thief_move,
                "pawn",
                "After set_thief_move(game, \"pawn\"), thief_move should be \"pawn\"."
                + game_text(rolled_game)
            );
            assert.equal(
                set_thief_move(rolled_game, "rook"),
                null,
                "set_thief_move should return null if a roll is already stored — "
                + "the Thief cannot roll twice in one turn."
                + game_text(rolled_game)
            );
        });

        it("creates the starting layout", function test_random_start() {
            const game = create_new_game(controlled_zero);
            const first_barrier = game.map_barriers[0];

            assert.equal(
                game.thief.row,
                7,
                "With controlled_zero, the Thief should start on row 7."
                + game_text(game)
            );
            assert.equal(
                game.exit.row,
                1,
                "With controlled_zero, the Exit should be on row 1."
                + game_text(game)
            );
            assert.equal(
                game.king.row,
                0,
                "With controlled_zero, the King should start on row 0."
                + game_text(game)
            );
            assert.equal(
                game.thief.column,
                0,
                "With controlled_zero, the Thief should start in column 0."
                + game_text(game)
            );
            assert.equal(
                game.exit.column,
                0,
                "With controlled_zero, the Exit should be in column 0."
                + game_text(game)
            );
            assert.equal(
                game.king.column,
                0,
                "With controlled_zero, the King should start in column 0."
                + game_text(game)
            );
            assert.equal(
                game.map_barriers.length,
                4,
                "A new game should create exactly four starting traffic barriers, "
                + "but got " + String(game.map_barriers.length) + "."
            );
            assert.equal(
                game.police_cars.length,
                0,
                "A new game should start with zero player-placed police cars."
            );
            assert.equal(
                game.board[first_barrier.row][first_barrier.column],
                BARRIER,
                "The first stored map barrier at " + position_text(first_barrier)
                + " should also appear on the board as BARRIER."
                + board_text(game.board)
            );
            assert.equal(
                is_valid_police_car_placement(king_turn(game), game.thief),
                false,
                "The King should not be able to place a police car on the Thief's square."
                + game_text(game)
            );
        });

    });

    describe("Movement rules", function describe_movement_rules() {

        it("allows all five thief move types on an open board", function test_open_board_moves() {
            const board = create_empty_board();
            const center = {row: 4, column: 4};

            assert.equal(
                is_valid_pawn_move(board, center, {row: 3, column: 4}),
                true,
                "Pawn should move one square up from " + position_text(center) + "."
                + board_text(board)
            );
            assert.equal(
                is_valid_knight_move(board, center, {row: 2, column: 5}),
                true,
                "Knight should jump two up, one right from " + position_text(center) + "."
                + board_text(board)
            );
            assert.equal(
                is_valid_bishop_move(board, center, {row: 1, column: 1}),
                true,
                "Bishop should slide three squares diagonally from " + position_text(center) + "."
                + board_text(board)
            );
            assert.equal(
                is_valid_rook_move(board, center, {row: 4, column: 7}),
                true,
                "Rook should slide three squares right from " + position_text(center) + "."
                + board_text(board)
            );
            assert.equal(
                is_valid_queen_move(board, center, {row: 0, column: 4}),
                true,
                "Queen should slide four squares up from " + position_text(center) + "."
                + board_text(board)
            );
        });

        it("blocks sliding moves through traffic barriers", function test_path_blocked_by_barrier() {
            const board = create_empty_board();

            board[4][5] = BARRIER;

            assert.equal(
                is_path_clear(board, {row: 4, column: 4}, {row: 4, column: 7}),
                false,
                "A traffic barrier at row 4, column 5 should block the path "
                + "from row 4, column 4 to row 4, column 7."
                + board_text(board)
            );
            assert.equal(
                is_valid_rook_move(board, {row: 4, column: 4}, {row: 4, column: 7}),
                false,
                "The Thief should not be able to rook-slide through a traffic barrier "
                + "at row 4, column 5."
                + board_text(board)
            );
        });

        it("queen move is rejected beyond four squares", function test_queen_range_invalid() {
            const game = create_new_game(function queen_roll() {
                return 0.99;
            });
            const invalid_target = {
                row: game.thief.row - 5,
                column: game.thief.column
            };

            assert.equal(
                is_valid_thief_move(game, "queen", game.thief, invalid_target),
                false,
                "Queen roll should not allow the Thief to move five squares vertically "
                + "from " + position_text(game.thief) + " to " + position_text(invalid_target)
                + " — the maximum is four squares."
                + game_text(game)
            );
        });

        it("King can move one square diagonally", function test_king_diagonal_move() {
            const game = create_new_game(controlled_zero);
            // King is at {row:0, column:0}; one diagonal step toward the board center.
            const diagonal_target = {row: 1, column: 1};

            assert.equal(
                is_valid_king_move(king_turn(game), diagonal_target),
                true,
                "The King at " + position_text(game.king)
                + " should be allowed to step diagonally to " + position_text(diagonal_target) + "."
                + game_text(game)
            );
        });

        it("knight jumps over a traffic barrier in its path", function test_knight_jumps_barrier() {
            const board = create_empty_board();
            // Place a barrier on the most direct route between the two squares.
            // Knight from (4,4) to (2,5): intermediate square (3,4) or (3,5).
            board[3][4] = BARRIER;

            assert.equal(
                is_valid_knight_move(board, {row: 4, column: 4}, {row: 2, column: 5}),
                true,
                "A knight move from row 4, column 4 to row 2, column 5 should succeed "
                + "even with a traffic barrier at row 3, column 4 on the apparent path — "
                + "knights jump rather than slide."
                + board_text(board)
            );
        });

        it("thief cannot land on the King's square", function test_thief_no_capture_king() {
            // Build a state where the Thief is one pawn-step from an arbitrary King position.
            const game = create_new_game(controlled_zero);
            const king_pos = {row: 4, column: 4};
            const thief_pos = {row: 5, column: 4};
            const test_game = Object.assign({}, game, {
                king: king_pos,
                thief: thief_pos
            });

            assert.equal(
                is_valid_thief_move(test_game, "pawn", thief_pos, king_pos),
                false,
                "The Thief at " + position_text(thief_pos)
                + " should not be allowed to pawn-move onto the King at "
                + position_text(king_pos)
                + " — the Thief cannot capture the King."
                + game_text(test_game)
            );
        });

        it("thief_move resets to null after the King's turn ends", function test_thief_move_reset() {
            const game = create_new_game(controlled_zero);
            // thief at {row:7,column:0}; rook one step up; King at {row:0,column:0} → (1,1).
            const rolled = set_thief_move(game, "rook");

            assert.equal(
                rolled.thief_move,
                "rook",
                "thief_move should store the roll immediately after set_thief_move."
                + game_text(rolled)
            );

            const after_thief = move_thief(rolled, {row: 6, column: 0});
            assert.notEqual(
                after_thief,
                null,
                "Rook move from row 7, column 0 to row 6, column 0 should be legal."
                + game_text(rolled)
            );

            const after_king = move_king(after_thief, {row: 1, column: 1});
            assert.notEqual(
                after_king,
                null,
                "King move from row 0, column 0 to row 1, column 1 should be legal."
                + game_text(after_thief)
            );
            assert.equal(
                after_king.thief_move,
                null,
                "After the King acts, thief_move must reset to null so the next "
                + "Thief turn requires a fresh roll."
                + game_text(after_king)
            );
        });

        it("King cannot move more than one square", function test_king_max_one_step() {
            const game = create_new_game(controlled_zero);
            // King at {row:0, column:0}; two squares away in either axis.

            assert.equal(
                is_valid_king_move(king_turn(game), {row: 0, column: 2}),
                false,
                "The King at " + position_text(game.king)
                + " should not be able to move two squares right to row 0, column 2."
                + game_text(game)
            );
            assert.equal(
                is_valid_king_move(king_turn(game), {row: 2, column: 0}),
                false,
                "The King at " + position_text(game.king)
                + " should not be able to move two squares down to row 2, column 0."
                + game_text(game)
            );
        });

        it("moves the Thief and hands control to the King", function test_move_thief_success() {
            const game = create_new_game(controlled_zero);
            const rolled = set_thief_move(game, "rook");
            const result = move_thief(rolled, {row: 6, column: 0});

            assert.notEqual(
                result,
                null,
                "A rook move from " + position_text(game.thief)
                + " to row 6, column 0 should be legal."
                + game_text(rolled)
            );
            assert.equal(
                result.thief.row,
                6,
                "After the move, the Thief should be on row 6."
                + game_text(result)
            );
            assert.equal(
                result.thief.column,
                0,
                "After the move, the Thief should remain in column 0."
                + game_text(result)
            );
            assert.equal(
                result.current_player,
                PLAYER_KING,
                "After the Thief moves, current_player should switch to PLAYER_KING."
                + game_text(result)
            );
        });

        it("refuses a Thief move on the King's turn", function test_thief_move_wrong_turn() {
            assert.equal(
                move_thief(king_turn(), {row: 6, column: 0}),
                null,
                "move_thief should return null when it is the King's turn, not the Thief's."
            );
        });

        it("moves the King and starts the next round", function test_move_king_success() {
            const game = create_new_game(controlled_zero);
            const result = move_king(king_turn(game), {row: 1, column: 1});

            assert.notEqual(
                result,
                null,
                "The King should be able to move one square diagonally from "
                + position_text(game.king) + " to row 1, column 1."
                + game_text(game)
            );
            assert.equal(
                result.king.row,
                1,
                "After the move, the King should be on row 1."
                + game_text(result)
            );
            assert.equal(
                result.king.column,
                1,
                "After the move, the King should be in column 1."
                + game_text(result)
            );
            assert.equal(
                result.current_player,
                PLAYER_THIEF,
                "After the King moves, current_player should switch back to PLAYER_THIEF."
                + game_text(result)
            );
            assert.equal(
                result.turn_count,
                game.turn_count + 1,
                "The turn counter should increase by one after the King acts — "
                + "was " + String(game.turn_count) + ", expected " + String(game.turn_count + 1)
                + ", got " + String(result.turn_count) + "."
            );
        });

        it("prevents the King from moving onto the Exit", function test_king_blocked_by_exit() {
            const game = create_new_game(controlled_zero);

            assert.equal(
                is_valid_king_move(king_turn(game), game.exit),
                false,
                "The King at " + position_text(game.king)
                + " should not be able to move onto the Exit at " + position_text(game.exit)
                + "."
                + game_text(game)
            );
        });

        it("prevents the King from moving onto traffic barriers", function test_king_blocked_by_barrier() {
            const game = create_new_game(controlled_zero);

            assert.equal(
                is_valid_king_move(king_turn(game), game.map_barriers[0]),
                false,
                "The King should not be able to step onto the adjacent traffic barrier at "
                + position_text(game.map_barriers[0]) + "."
                + game_text(game)
            );
        });

    });

    describe("Pawn movement", function describe_pawn_movement() {

        it("pawn moves exactly one square in any direction", function test_pawn_four_directions() {
            const board = create_empty_board();
            const center = {row: 4, column: 4};

            assert.equal(
                is_valid_pawn_move(board, center, {row: 3, column: 4}),
                true,
                "Pawn should move one square up from " + position_text(center) + "."
                + board_text(board)
            );
            assert.equal(
                is_valid_pawn_move(board, center, {row: 5, column: 4}),
                true,
                "Pawn should move one square down from " + position_text(center) + "."
                + board_text(board)
            );
            assert.equal(
                is_valid_pawn_move(board, center, {row: 4, column: 3}),
                true,
                "Pawn should move one square left from " + position_text(center) + "."
                + board_text(board)
            );
            assert.equal(
                is_valid_pawn_move(board, center, {row: 4, column: 5}),
                true,
                "Pawn should move one square right from " + position_text(center) + "."
                + board_text(board)
            );
        });

        it("rejects diagonal pawn moves", function test_pawn_no_diagonal() {
            const board = create_empty_board();

            assert.equal(
                is_valid_pawn_move(board, {row: 4, column: 4}, {row: 3, column: 3}),
                false,
                "Pawn should not move diagonally — row 4, column 4 to row 3, column 3 "
                + "must be rejected."
                + board_text(board)
            );
        });

        it("rejects pawn jumps", function test_pawn_no_jump() {
            const board = create_empty_board();

            assert.equal(
                is_valid_pawn_move(board, {row: 4, column: 4}, {row: 2, column: 4}),
                false,
                "Pawn should not jump two squares — row 4, column 4 to row 2, column 4 "
                + "must be rejected."
                + board_text(board)
            );
        });

    });

    describe("Turn flow", function describe_turn_flow() {

        it("passes the Thief turn to the King", function test_pass_thief_turn() {
            const game = create_new_game();
            const passed = pass_turn(game);

            assert.notEqual(
                passed,
                null,
                "Passing on the Thief's turn should be allowed."
                + game_text(game)
            );
            assert.equal(
                passed.current_player,
                PLAYER_KING,
                "After the Thief skips, current_player should be PLAYER_KING."
                + game_text(passed)
            );
        });

        it("passes the King turn and increments the counter", function test_pass_king_turn() {
            const game = create_new_game();
            const passed = pass_turn(king_turn(game));

            assert.notEqual(
                passed,
                null,
                "Passing on the King's turn should be allowed."
                + game_text(game)
            );
            assert.equal(
                passed.current_player,
                PLAYER_THIEF,
                "After the King skips, current_player should return to PLAYER_THIEF."
                + game_text(passed)
            );
            assert.equal(
                passed.turn_count,
                game.turn_count + 1,
                "Skipping the King turn should advance turn_count from "
                + String(game.turn_count) + " to " + String(game.turn_count + 1)
                + ", but got " + String(passed.turn_count) + "."
            );
        });

        it("requires the Thief to roll before moving", function test_thief_must_roll_first() {
            const game = create_new_game();

            assert.equal(
                game.thief_move,
                null,
                "A fresh game should have thief_move === null."
                + game_text(game)
            );
            assert.equal(
                move_thief(game, {row: game.thief.row - 1, column: game.thief.column}),
                null,
                "move_thief should return null when thief_move is null — "
                + "the Thief must set a die result before moving."
                + game_text(game)
            );
        });

        it("rejects move types not on the die", function test_invalid_move_type() {
            const game = create_new_game();

            assert.equal(
                set_thief_move(game, "invalid"),
                null,
                "set_thief_move should return null for move type \"invalid\"."
            );
            assert.equal(
                set_thief_move(game, "king"),
                null,
                "set_thief_move should return null for move type \"king\" — "
                + "only die-face strings are accepted."
            );
            assert.equal(
                set_thief_move(game, ""),
                null,
                "set_thief_move should return null for an empty string."
            );
        });

    });

    describe("Win conditions", function describe_win_conditions() {

        it("detects the two main win conditions", function test_winners() {
            const base_game = create_new_game();

            const thief_wins = Object.assign({}, base_game, {thief: base_game.exit});
            assert.equal(
                check_winner(thief_wins),
                PLAYER_THIEF,
                "check_winner should return PLAYER_THIEF when the Thief is on the Exit."
                + game_text(thief_wins)
            );

            const king_wins = Object.assign({}, base_game, {king: base_game.thief});
            assert.equal(
                check_winner(king_wins),
                PLAYER_KING,
                "check_winner should return PLAYER_KING when the King is on the Thief."
                + game_text(king_wins)
            );
        });

        it("ends when the turn limit is exceeded", function test_turn_limit_win() {
            const late_game = Object.assign({}, create_new_game(), {
                turn_count: MAX_TURNS + 1
            });

            assert.equal(
                check_winner(late_game),
                PLAYER_KING,
                "The King should win when turn_count exceeds MAX_TURNS ("
                + String(MAX_TURNS) + "). turn_count is "
                + String(late_game.turn_count) + "."
                + game_text(late_game)
            );
            assert.equal(
                is_game_ended(late_game),
                true,
                "is_game_ended should return true once the turn limit is exceeded."
                + game_text(late_game)
            );
        });

        it("lets the Thief win by moving onto the Exit", function test_thief_wins_via_move() {
            const game = create_new_game(controlled_zero);
            // Place Thief one pawn-step below the Exit (exit is at row 1, column 0).
            const near_exit = Object.assign({}, game, {
                thief: {row: game.exit.row + 1, column: game.exit.column},
                thief_move: "pawn"
            });
            const result = move_thief(near_exit, {
                row: game.exit.row,
                column: game.exit.column
            });

            assert.notEqual(
                result,
                null,
                "Pawn move from " + position_text(near_exit.thief)
                + " onto the Exit at " + position_text(game.exit) + " should be legal."
                + game_text(near_exit)
            );
            assert.equal(
                result.winner,
                PLAYER_THIEF,
                "The Thief should win immediately after stepping onto the Exit."
                + game_text(result)
            );
            assert.equal(
                is_game_ended(result),
                true,
                "is_game_ended should return true after the Thief wins."
                + game_text(result)
            );
        });

        it("lets the King win by moving onto the Thief", function test_king_wins_via_move() {
            const game = create_new_game(controlled_zero);
            // Place King one square above the Thief (thief at row 7, column 0).
            const king_adjacent = Object.assign({}, game, {
                king: {row: game.thief.row - 1, column: game.thief.column},
                current_player: PLAYER_KING
            });
            const result = move_king(king_adjacent, {
                row: game.thief.row,
                column: game.thief.column
            });

            assert.notEqual(
                result,
                null,
                "The King at " + position_text(king_adjacent.king)
                + " moving onto the Thief at " + position_text(game.thief)
                + " should be legal."
                + game_text(king_adjacent)
            );
            assert.equal(
                result.winner,
                PLAYER_KING,
                "The King should win immediately after moving onto the Thief."
                + game_text(result)
            );
            assert.equal(
                is_game_ended(result),
                true,
                "is_game_ended should return true after the King wins."
                + game_text(result)
            );
        });

        it("rejects actions after the game ends", function test_no_moves_after_win() {
            const game = create_new_game();
            const ended = Object.assign({}, game, {thief: game.exit});

            assert.equal(
                is_game_ended(ended),
                true,
                "A game where the Thief is on the Exit should be marked ended."
                + game_text(ended)
            );
            assert.equal(
                move_thief(ended, {row: 5, column: 0}),
                null,
                "move_thief should return null after the game is over."
            );
            assert.equal(
                move_king(king_turn(ended), {row: 0, column: 1}),
                null,
                "move_king should return null after the game is over."
            );
            assert.equal(
                pass_turn(ended),
                null,
                "pass_turn should return null after the game is over."
            );
        });

    });

    describe("Police cars and barriers", function describe_police_cars_and_barriers() {

        it("places police cars on empty squares", function test_place_police_car() {
            const game = king_turn(create_new_game(controlled_zero));
            const placed_game = place_police_car(game, {row: 1, column: 1});

            assert.equal(
                place_police_car(game, {row: game.thief.row, column: game.thief.column}),
                null,
                "place_police_car should return null when the target square holds the Thief."
                + game_text(game)
            );
            assert.notEqual(
                placed_game,
                null,
                "The King should be able to place a police car on the empty square "
                + "row 1, column 1."
                + game_text(game)
            );
            assert.equal(
                placed_game.police_cars.length,
                1,
                "After one placement, police_cars.length should be 1, but got "
                + String(placed_game.police_cars.length) + "."
            );
            assert.equal(
                placed_game.board[1][1],
                POLICE_CAR,
                "The board at row 1, column 1 should show POLICE_CAR after placement."
                + board_text(placed_game.board)
            );
        });

        it("prevents police cars on the Exit", function test_barrier_not_on_exit() {
            const game = create_new_game();

            assert.equal(
                is_valid_police_car_placement(king_turn(game), game.exit),
                false,
                "The King should not be able to place a police car on the Exit at "
                + position_text(game.exit) + "."
                + game_text(game)
            );
        });

        it("refuses a police car that would trap the Thief", function test_no_trapping_barrier() {
            // The Thief sits in the top-left corner. A police car already blocks
            // (0, 1), so the Thief's only remaining way out of the corner is the
            // square (1, 0). Sealing (1, 0) would leave no route to the Exit, so
            // both the predicate and the action must reject it.
            const trap = {row: 1, column: 0};
            const boxed = {
                thief: {row: 0, column: 0},
                king: {row: 7, column: 7},
                exit: {row: 7, column: 0},
                map_barriers: [],
                police_cars: [{row: 0, column: 1}],
                current_player: PLAYER_KING,
                thief_move: null,
                turn_count: 1,
                winner: null,
                board: create_empty_board()
            };

            assert.equal(
                is_valid_police_car_placement(boxed, trap),
                false,
                "Sealing the Thief's last escape square at " + position_text(trap)
                + " should be rejected - it would leave no route to the Exit."
                + game_text(boxed)
            );
            assert.equal(
                place_police_car(boxed, trap),
                null,
                "place_police_car should return null for a placement that traps the Thief."
                + game_text(boxed)
            );
        });

        it("limits police cars to the exported maximum", function test_barrier_limit() {
            // Build up to MAX_POLICE_CARS via real place_police_car calls so the board
            // stays consistent and the test exercises actual game logic.
            const start = king_turn(create_new_game(controlled_zero));

            let state = place_police_car(start, {row: 5, column: 5});
            state = place_police_car(king_turn(state), {row: 5, column: 6});
            state = place_police_car(king_turn(state), {row: 6, column: 5});
            state = place_police_car(king_turn(state), {row: 6, column: 6});
            state = place_police_car(king_turn(state), {row: 4, column: 5});

            assert.equal(
                state.police_cars.length,
                MAX_POLICE_CARS,
                "After placing the maximum number of police cars, police_cars.length "
                + "should equal MAX_POLICE_CARS ("
                + String(MAX_POLICE_CARS) + "), but got " + String(state.police_cars.length) + "."
            );

            const full_game = king_turn(state);

            assert.equal(
                is_valid_police_car_placement(full_game, {row: 3, column: 3}),
                false,
                "is_valid_police_car_placement should return false when "
                + String(MAX_POLICE_CARS) + " police cars are already placed."
                + game_text(full_game)
            );
            assert.equal(
                place_police_car(full_game, {row: 3, column: 3}),
                null,
                "place_police_car should return null when the police-car limit of "
                + String(MAX_POLICE_CARS) + " has been reached."
                + game_text(full_game)
            );
        });

    });

});
