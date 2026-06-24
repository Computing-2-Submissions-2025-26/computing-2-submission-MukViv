/*jslint long, node*/

import assert from "node:assert/strict";
import ChessThieves from "../game-logic.js";
const {
    BARRIER,
    KING,
    MAX_BARRIERS,
    MAX_TURNS,
    PLAYER_KING,
    PLAYER_THIEF,
    POLICE_CAR,
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
    is_valid_pawn_move,
    is_valid_queen_move,
    is_valid_rook_move,
    is_valid_thief_move,
    move_king,
    move_thief,
    pass_turn,
    place_barrier,
    roll_thief_die,
    set_thief_move
} = ChessThieves;

const controlled_zero = function controlled_zero() {
    return 0;
};

const king_turn = function king_turn(game = create_new_game()) {
    return Object.assign({}, game, {
        current_player: PLAYER_KING
    });
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
        + "\nCurrent turn: " + game.current_player
        + "\nTurn count: " + String(game.turn_count)
        + "\nWinner: " + String(game.winner)
    );
};

describe("Chess Thieves", function describe_chess_thieves() {
    describe("Setup and dice", function describe_setup_and_dice() {
        it("rolls a value from the thief move die", function test_roll() {
            assert.equal(roll_thief_die(function minimum_roll() {
                return 0;
            }), "pawn");
            assert.equal(roll_thief_die(function maximum_roll() {
                return 0.99;
            }), "queen");
        });

        it("starts the Thief in a roll phase", function test_roll_phase() {
            const game = create_new_game();
            const rolled_game = set_thief_move(game, "pawn");

            assert.equal(game.thief_move, null);
            assert.notEqual(rolled_game, null);
            assert.equal(rolled_game.thief_move, "pawn");
            assert.equal(set_thief_move(rolled_game, "rook"), null);
        });

        it("creates the starting layout", function test_random_start() {
            const game = create_new_game(controlled_zero);
            const first_barrier = game.map_barriers[0];

            assert.equal(game.thief.row, 7);
            assert.equal(game.king.row, 0);
            assert.equal(game.exit.row, 1);
            assert.equal(game.thief.column, 0);
            assert.equal(game.exit.column, 0);
            assert.equal(game.king.column, 0);
            assert.equal(
                game.map_barriers.length,
                4,
                "A new game should create four starting traffic barriers."
            );
            assert.equal(
                game.barriers.length,
                0,
                "A new game should start with no player-placed police cars."
            );
            assert.equal(
                game.board[first_barrier.row][first_barrier.column],
                BARRIER,
                "The first stored map barrier should also appear on the board."
            );
            assert.equal(
                is_valid_barrier_placement(king_turn(game), game.thief),
                false,
                "The King should not be allowed to place a police car on the Thief."
            );
        });

        it("labels each square type", function test_square_labels() {
            const game = create_new_game(controlled_zero);

            assert.equal(get_square_label(game, 7, 0), "Thief");
            assert.equal(get_square_label(game, 0, 0), "King");
            assert.equal(get_square_label(game, 1, 0), "Exit");
            assert.equal(get_square_label(game, 4, 4), "Empty");
            assert.equal(
                get_square_label(
                    game,
                    game.map_barriers[0].row,
                    game.map_barriers[0].column
                ),
                "Barrier"
            );
        });

        it("starts with the game unfinished", function test_game_not_ended() {
            assert.equal(is_game_ended(create_new_game()), false);
        });
    });

    describe("Movement rules", function describe_movement_rules() {
        it("allows all five thief move types on an open board", function test_movement() {
            const board = create_empty_board();

            assert.equal(
                is_valid_pawn_move(board, {row: 4, column: 4}, {row: 3, column: 4}),
                true
            );
            assert.equal(
                is_valid_knight_move(board, {row: 4, column: 4}, {row: 2, column: 5}),
                true
            );
            assert.equal(
                is_valid_bishop_move(board, {row: 4, column: 4}, {row: 1, column: 1}),
                true
            );
            assert.equal(
                is_valid_rook_move(board, {row: 4, column: 4}, {row: 4, column: 7}),
                true
            );
            assert.equal(
                is_valid_queen_move(board, {row: 4, column: 4}, {row: 0, column: 4}),
                true
            );
        });

        it("blocks sliding moves through traffic barriers", function test_path_clear() {
            const board = create_empty_board();

            board[4][5] = BARRIER;

            assert.equal(
                is_path_clear(board, {row: 4, column: 4}, {row: 4, column: 7}),
                false,
                "A traffic barrier at row 4, column 5 should block the path."
                + board_text(board)
            );
            assert.equal(
                is_valid_rook_move(board, {row: 4, column: 4}, {row: 4, column: 7}),
                false,
                "The Thief should not be able to rook-move through a traffic barrier."
                + board_text(board)
            );
        });

        it("blocks sliding moves through the King", function test_king_blocks_path() {
            const board = create_empty_board();

            board[4][5] = KING;

            assert.equal(
                is_path_clear(board, {row: 4, column: 4}, {row: 4, column: 7}),
                false,
                "The King at row 4, column 5 should block the sliding path."
                + board_text(board)
            );
            assert.equal(
                is_valid_rook_move(board, {row: 4, column: 4}, {row: 4, column: 7}),
                false,
                "The Thief should not be able to rook-move through the King."
                + board_text(board)
            );
        });

        it("checks legal move targets", function test_highlight_rules() {
            const game = create_new_game(function queen_roll() {
                return 0.99;
            });
            const king_game = king_turn(game);
            const valid_queen_target = {
                row: game.thief.row - 4,
                column: game.thief.column
            };
            const invalid_queen_target = {
                row: game.thief.row - 5,
                column: game.thief.column
            };

            assert.equal(
                is_valid_thief_move(game, "queen", game.thief, valid_queen_target),
                true,
                "Queen roll should allow the Thief to move four squares vertically."
                + game_text(game)
            );
            assert.equal(
                is_valid_thief_move(game, "queen", game.thief, invalid_queen_target),
                false,
                "Queen roll should not allow the Thief to move more than four squares."
                + game_text(game)
            );
            assert.equal(
                is_valid_king_move(
                    king_game,
                    {row: game.king.row, column: game.king.column - 1}
                ),
                true,
                "The King should be allowed to move one square left from the start."
                + game_text(king_game)
            );
            assert.equal(
                is_valid_barrier_placement(king_game, {row: 1, column: 1}),
                true,
                "The King should be allowed to place a police car on an empty square."
                + game_text(king_game)
            );
            assert.equal(
                is_valid_barrier_placement(king_game, game.thief),
                false,
                "The King should not be allowed to place a police car on the Thief."
                + game_text(king_game)
            );
        });

        it("moves the Thief and hands control to the King", function test_move_thief_success() {
            const game = create_new_game(controlled_zero);
            const rolled = set_thief_move(game, "rook");
            const result = move_thief(rolled, 6, 0);

            assert.notEqual(
                result,
                null,
                "A rook move from row 7, column 0 to row 6, column 0 should be legal."
            );
            assert.equal(result.thief.row, 6, "The Thief should move to row 6.");
            assert.equal(result.thief.column, 0, "The Thief should remain in column 0.");
            assert.equal(
                result.current_player,
                PLAYER_KING,
                "After the Thief moves, the King should take the next turn."
            );
        });

        it("refuses a Thief move on the King's turn", function test_move_thief_wrong_player() {
            assert.equal(move_thief(king_turn(), 6, 0), null);
        });

        it("moves the King and starts the next round", function test_move_king_success() {
            const game = create_new_game(controlled_zero);
            const result = move_king(king_turn(game), 1, 1);

            assert.notEqual(
                result,
                null,
                "The King should be able to move one square diagonally."
                + game_text(game)
            );
            assert.equal(result.king.row, 1, "The King should move to row 1.");
            assert.equal(result.king.column, 1, "The King should move to column 1.");
            assert.equal(
                result.current_player,
                PLAYER_THIEF,
                "After the King moves, the Thief should take the next turn."
            );
            assert.equal(
                result.turn_count,
                game.turn_count + 1,
                "The turn counter should increase after the King acts."
            );
        });

        it("prevents the King from moving onto the Exit", function test_king_blocked_by_exit() {
            const game = create_new_game(controlled_zero);

            assert.equal(
                is_valid_king_move(king_turn(game), game.exit),
                false,
                "The King should not be able to stand on the Exit square."
                + game_text(game)
            );
        });
    });

    describe("Pawn movement", function describe_pawn_movement() {
        it("rejects diagonal pawn moves", function test_pawn_no_diagonal() {
            const board = create_empty_board();

            assert.equal(
                is_valid_pawn_move(board, {row: 4, column: 4}, {row: 3, column: 3}),
                false
            );
        });

        it("rejects pawn jumps", function test_pawn_no_jump() {
            const board = create_empty_board();

            assert.equal(
                is_valid_pawn_move(board, {row: 4, column: 4}, {row: 2, column: 4}),
                false
            );
        });
    });

    describe("Turn flow", function describe_turn_flow() {
        it("passes the Thief turn to the King", function test_pass_thief_turn() {
            const passed = pass_turn(create_new_game());

            assert.notEqual(passed, null, "Passing the Thief turn should be allowed.");
            assert.equal(
                passed.current_player,
                PLAYER_KING,
                "After the Thief skips, it should be the King's turn."
            );
        });

        it("passes the King turn and increments the counter", function test_pass_king_turn() {
            const game = create_new_game();
            const passed = pass_turn(king_turn(game));

            assert.notEqual(passed, null, "Passing the King turn should be allowed.");
            assert.equal(
                passed.current_player,
                PLAYER_THIEF,
                "After the King skips, the Thief should take the next turn."
            );
            assert.equal(
                passed.turn_count,
                game.turn_count + 1,
                "Skipping the King turn should advance the round counter."
            );
        });

        it("requires the Thief to roll before moving", function test_thief_must_roll_first() {
            const game = create_new_game();

            assert.equal(game.thief_move, null);
            assert.equal(
                move_thief(game, game.thief.row - 1, game.thief.column),
                null,
                "The Thief should not move before a die result has been set."
                + game_text(game)
            );
        });

        it("rejects move types not on the die", function test_invalid_move_type() {
            const game = create_new_game();

            assert.equal(set_thief_move(game, "invalid"), null);
            assert.equal(set_thief_move(game, "king"), null);
            assert.equal(set_thief_move(game, ""), null);
        });
    });

    describe("Win conditions", function describe_win_conditions() {
        it("detects the two main win conditions", function test_winners() {
            const base_game = create_new_game();
            const thief_game = Object.assign({}, base_game, {
                thief: base_game.exit
            });
            const king_game = Object.assign({}, base_game, {
                king: base_game.thief
            });

            assert.equal(
                check_winner(thief_game),
                PLAYER_THIEF,
                "The Thief should win when standing on the Exit."
                + game_text(thief_game)
            );
            assert.equal(
                check_winner(king_game),
                PLAYER_KING,
                "The King should win when standing on the Thief."
                + game_text(king_game)
            );
        });

        it("ends when the turn limit is exceeded", function test_turn_limit_win() {
            const late_game = Object.assign({}, create_new_game(), {
                turn_count: MAX_TURNS + 1
            });

            assert.equal(
                check_winner(late_game),
                PLAYER_KING,
                "The King should win after the turn limit is exceeded."
                + game_text(late_game)
            );
            assert.equal(
                is_game_ended(late_game),
                true,
                "A game past the turn limit should be marked ended."
            );
        });

        it("lets the Thief win by moving onto the Exit", function test_thief_wins_via_move() {
            const game = create_new_game(controlled_zero);
            const near_exit = Object.assign({}, game, {
                thief: {row: game.exit.row + 1, column: game.exit.column},
                thief_move: "pawn"
            });
            const result = move_thief(near_exit, game.exit.row, game.exit.column);

            assert.notEqual(result, null, "Moving onto the Exit should be legal.");
            assert.equal(
                result.winner,
                PLAYER_THIEF,
                "The Thief should win immediately after moving onto the Exit."
                + game_text(result)
            );
            assert.equal(is_game_ended(result), true, "The game should end after the Thief wins.");
        });

        it("lets the King win by moving onto the Thief", function test_king_wins_via_move() {
            const game = create_new_game(controlled_zero);
            const king_adjacent = Object.assign({}, game, {
                king: {
                    row: game.thief.row - 1,
                    column: game.thief.column
                },
                current_player: PLAYER_KING
            });
            const result = move_king(
                king_adjacent,
                game.thief.row,
                game.thief.column
            );

            assert.notEqual(result, null, "Moving onto the Thief should be legal for the King.");
            assert.equal(
                result.winner,
                PLAYER_KING,
                "The King should win immediately after moving onto the Thief."
                + game_text(result)
            );
            assert.equal(is_game_ended(result), true, "The game should end after the King wins.");
        });

        it("rejects actions after the game ends", function test_no_moves_after_win() {
            const game = create_new_game();
            const ended = Object.assign({}, game, {thief: game.exit});

            assert.equal(is_game_ended(ended), true);
            assert.equal(move_thief(ended, 5, 0), null);
            assert.equal(move_king(king_turn(ended), 0, 1), null);
            assert.equal(pass_turn(ended), null);
        });
    });

    describe("Police cars and barriers", function describe_police_cars_and_barriers() {
        it("places police cars on empty squares", function test_barrier() {
            const game = king_turn(create_new_game(controlled_zero));
            const placed_game = place_barrier(game, 1, 1);

            assert.equal(
                place_barrier(game, game.thief.row, game.thief.column),
                null
            );
            assert.notEqual(
                placed_game,
                null,
                "The King should be able to place a police car on row 1, column 1."
                + game_text(game)
            );
            assert.equal(
                placed_game.barriers.length,
                1,
                "After one placement, there should be exactly one police car."
            );
            assert.equal(
                placed_game.board[1][1],
                POLICE_CAR,
                "The placed police car should appear on the board at row 1, column 1."
            );
        });

        it("blocks sliding moves through police cars", function test_police_car_blocks_path() {
            const board = create_empty_board();

            board[4][5] = POLICE_CAR;

            assert.equal(
                is_path_clear(board, {row: 4, column: 4}, {row: 4, column: 7}),
                false,
                "A police car at row 4, column 5 should block the sliding path."
                + board_text(board)
            );
            assert.equal(
                is_valid_rook_move(board, {row: 4, column: 4}, {row: 4, column: 7}),
                false,
                "The Thief should not be able to rook-move through a police car."
                + board_text(board)
            );
        });

        it("prevents police cars on the Exit", function test_barrier_not_on_exit() {
            const game = create_new_game();

            assert.equal(
                is_valid_barrier_placement(king_turn(game), game.exit),
                false,
                "The King should not be able to place a police car on the Exit."
                + game_text(game)
            );
        });

        it("limits police cars to six", function test_barrier_limit() {
            const full_game = Object.assign({}, king_turn(), {
                barriers: [
                    {row: 3, column: 0},
                    {row: 3, column: 1},
                    {row: 3, column: 2},
                    {row: 3, column: 3},
                    {row: 3, column: 4},
                    {row: 3, column: 5}
                ]
            });

            assert.equal(
                full_game.barriers.length,
                MAX_BARRIERS,
                "The test setup should contain the maximum number of police cars."
            );
            assert.equal(
                is_valid_barrier_placement(full_game, {row: 4, column: 4}),
                false,
                "The King should not be able to place a seventh police car."
                + game_text(full_game)
            );
        });

        it("prevents the King walking onto traffic barriers", function test_king_blocked_by_map_barrier() {
            const game = create_new_game(controlled_zero);

            assert.equal(
                is_valid_king_move(king_turn(game), game.map_barriers[0]),
                false,
                "The King should not be able to move onto a traffic barrier at "
                + position_text(game.map_barriers[0])
                + "."
                + game_text(game)
            );
        });
    });

    describe("Board coordinates", function describe_board_coordinates() {
        it("accepts only whole-number coordinates from 0 to 7", function test_inside_board() {
            assert.equal(is_inside_board(0, 0), true, "Top-left corner should be on the board.");
            assert.equal(is_inside_board(7, 7), true, "Bottom-right corner should be on the board.");
            assert.equal(is_inside_board(4, 4), true, "Middle square should be on the board.");
            assert.equal(is_inside_board(-1, 0), false, "Negative row should be off the board.");
            assert.equal(is_inside_board(0, -1), false, "Negative column should be off the board.");
            assert.equal(is_inside_board(8, 0), false, "Row 8 should be off the board.");
            assert.equal(is_inside_board(0, 8), false, "Column 8 should be off the board.");
            assert.equal(is_inside_board(0.5, 0), false, "Half-row coordinates should be invalid.");
        });
    });
});
