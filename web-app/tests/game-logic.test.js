import assert from "node:assert/strict";
import {describe, it} from "node:test";
import {
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
} from "../game-logic.js";

describe("Chess Thieves", function describe_chess_thieves() {
    it("rolling the die always gives one of the six move types", function test_roll() {
        assert.equal(roll_thief_die(function minimum_roll() {
            return 0;
        }), "pawn");
        assert.equal(roll_thief_die(function maximum_roll() {
            return 0.99;
        }), "queen");
    });

    it("the Thief must roll the die before they can move", function test_roll_phase() {
        const game = create_new_game();
        const rolled_game = set_thief_move(game, "pawn");

        assert.equal(game.thief_move, null);
        assert.notEqual(rolled_game, null);
        assert.equal(rolled_game.thief_move, "pawn");
        assert.equal(set_thief_move(rolled_game, "rook"), null);
    });

    it("each new game places the Thief, King, Exit, and barriers in different positions", function test_random_start() {
        const game = create_new_game(function controlled_random() {
            return 0;
        });
        const first_barrier = game.map_barriers[0];
        const barrier_game = Object.assign({}, game, {
            current_player: PLAYER_KING
        });

        assert.equal(game.thief.row, 7);
        assert.equal(game.king.row, 0);
        assert.equal(game.exit.row, 1);
        assert.equal(game.thief.column, 0);
        assert.equal(game.exit.column, 0);
        assert.equal(game.king.column, 0);
        assert.equal(game.map_barriers.length, 4);
        assert.equal(game.barriers.length, 0);
        assert.equal(
            game.board[first_barrier.row][first_barrier.column],
            BARRIER
        );
        assert.equal(
            is_valid_barrier_placement(barrier_game, game.thief),
            false
        );
    });

    it("the Thief can use all five move types on an open board", function test_movement() {
        const board = create_empty_board();

        assert.equal(
            is_valid_pawn_move(
                board,
                {row: 4, column: 4},
                {row: 3, column: 4}
            ),
            true
        );
        assert.equal(
            is_valid_knight_move(
                board,
                {row: 4, column: 4},
                {row: 2, column: 5}
            ),
            true
        );
        assert.equal(
            is_valid_bishop_move(
                board,
                {row: 4, column: 4},
                {row: 1, column: 1}
            ),
            true
        );
        assert.equal(
            is_valid_rook_move(board, {row: 4, column: 4}, {row: 4, column: 7}),
            true
        );
        assert.equal(
            is_valid_queen_move(
                board,
                {row: 4, column: 4},
                {row: 0, column: 4}
            ),
            true
        );
    });

    it("a traffic barrier stops the Thief sliding through it", function test_path_clear() {
        const board = create_empty_board();

        board[4][5] = BARRIER;

        assert.equal(
            is_path_clear(board, {row: 4, column: 4}, {row: 4, column: 7}),
            false
        );
        assert.equal(
            is_valid_rook_move(board, {row: 4, column: 4}, {row: 4, column: 7}),
            false
        );
    });

    it("the King's body also stops the Thief from sliding past", function test_king_blocks_path() {
        const board = create_empty_board();

        board[4][5] = KING;

        assert.equal(
            is_path_clear(board, {row: 4, column: 4}, {row: 4, column: 7}),
            false
        );
        assert.equal(
            is_valid_rook_move(board, {row: 4, column: 4}, {row: 4, column: 7}),
            false
        );
    });

    it("the King can place a police car on an empty square but not on the Thief", function test_barrier() {
        const game = Object.assign({}, create_new_game(function first_roll() {
            return 0;
        }), {
            current_player: PLAYER_KING
        });

        assert.equal(
            place_barrier(game, game.thief.row, game.thief.column),
            null
        );
        const placed_game = place_barrier(game, 1, 1);

        assert.notEqual(placed_game, null);
        assert.equal(placed_game.barriers.length, 1);
        assert.equal(placed_game.board[1][1], POLICE_CAR);
    });

    it("only squares the die roll can reach are legal for the Thief or King to move to", function test_highlight_rules() {
        const game = create_new_game(function queen_roll() {
            return 0.99;
        });
        const king_game = Object.assign({}, game, {
            current_player: PLAYER_KING
        });
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
            true
        );
        assert.equal(
            is_valid_thief_move(
                game,
                "queen",
                game.thief,
                invalid_queen_target
            ),
            false
        );
        assert.equal(
            is_valid_king_move(
                king_game,
                {row: game.king.row, column: game.king.column - 1}
            ),
            true
        );
        assert.equal(
            is_valid_barrier_placement(king_game, {row: 1, column: 1}),
            true
        );
        assert.equal(is_valid_barrier_placement(king_game, game.thief), false);
    });

    it("the Thief wins by reaching the Exit and the King wins by catching the Thief", function test_winners() {
        const base_game = create_new_game();
        const thief_game = Object.assign({}, base_game, {
            thief: base_game.exit
        });
        const king_game = Object.assign({}, base_game, {
            king: base_game.thief
        });

        assert.equal(check_winner(thief_game), PLAYER_THIEF);
        assert.equal(check_winner(king_game), PLAYER_KING);
    });

    it("skipping the Thief's turn hands control straight to the King", function test_pass_thief_turn() {
        const game = create_new_game();

        assert.equal(game.current_player, PLAYER_THIEF);

        const passed = pass_turn(game);

        assert.notEqual(passed, null);
        assert.equal(passed.current_player, PLAYER_KING);
    });

    it(
        "skipping the King's turn ends the round and moves the turn counter on by one",
        function test_pass_king_turn() {
            const game = create_new_game();
            const king_game = Object.assign({}, game, {
                current_player: PLAYER_KING
            });
            const passed = pass_turn(king_game);

            assert.notEqual(passed, null);
            assert.equal(passed.current_player, PLAYER_THIEF);
            assert.equal(passed.turn_count, king_game.turn_count + 1);
        }
    );

    it(
        "after a legal Thief move the board updates and the King's turn begins",
        function test_move_thief_success() {
            const game = create_new_game(function controlled_zero() {
                return 0;
            });
            const rolled = set_thief_move(game, "rook");
            const result = move_thief(rolled, 6, 0);

            assert.notEqual(result, null);
            assert.equal(result.thief.row, 6);
            assert.equal(result.thief.column, 0);
            assert.equal(result.current_player, PLAYER_KING);
        }
    );

    it(
        "the Thief cannot move when it is the King's turn",
        function test_move_thief_wrong_player() {
            const game = create_new_game();
            const king_game = Object.assign({}, game, {
                current_player: PLAYER_KING
            });

            assert.equal(move_thief(king_game, 6, 0), null);
        }
    );

    it(
        "after the King moves one square the turn counter goes up and the Thief rolls next",
        function test_move_king_success() {
            const game = create_new_game(function controlled_zero() {
                return 0;
            });
            const king_game = Object.assign({}, game, {
                current_player: PLAYER_KING
            });
            const result = move_king(king_game, 1, 1);

            assert.notEqual(result, null);
            assert.equal(result.king.row, 1);
            assert.equal(result.king.column, 1);
            assert.equal(result.current_player, PLAYER_THIEF);
            assert.equal(result.turn_count, king_game.turn_count + 1);
        }
    );

    it(
        "the King is not allowed to step onto the Exit square",
        function test_king_blocked_by_exit() {
            const game = create_new_game(function controlled_zero() {
                return 0;
            });
            const king_game = Object.assign({}, game, {
                current_player: PLAYER_KING
            });

            assert.equal(
                is_valid_king_move(king_game, game.exit),
                false
            );
        }
    );

    it(
        "the King wins if the Thief has not escaped by the end of turn 15",
        function test_turn_limit_win() {
            const game = create_new_game();
            const late_game = Object.assign({}, game, {
                turn_count: MAX_TURNS + 1
            });

            assert.equal(check_winner(late_game), PLAYER_KING);
            assert.equal(is_game_ended(late_game), true);
        }
    );

    it("a freshly started game is not over", function test_game_not_ended() {
        const game = create_new_game();

        assert.equal(is_game_ended(game), false);
    });

    it("every type of square has the correct plain-English label", function test_square_labels() {
        const game = create_new_game(function controlled_zero() {
            return 0;
        });

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

    it(
        "the Thief wins the moment they step onto the Exit square",
        function test_thief_wins_via_move() {
            const game = create_new_game(function controlled_zero() {
                return 0;
            });
            const near_exit = Object.assign({}, game, {
                thief: {row: game.exit.row + 1, column: game.exit.column},
                thief_move: "pawn"
            });
            const result = move_thief(
                near_exit,
                game.exit.row,
                game.exit.column
            );

            assert.notEqual(result, null);
            assert.equal(result.winner, PLAYER_THIEF);
            assert.equal(is_game_ended(result), true);
        }
    );

    it(
        "the King wins the moment they step onto the Thief's square",
        function test_king_wins_via_move() {
            const game = create_new_game(function controlled_zero() {
                return 0;
            });
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

            assert.notEqual(result, null);
            assert.equal(result.winner, PLAYER_KING);
            assert.equal(is_game_ended(result), true);
        }
    );

    it(
        "once someone has won no further moves or actions are accepted",
        function test_no_moves_after_win() {
            const game = create_new_game();
            const ended = Object.assign({}, game, {thief: game.exit});

            assert.equal(is_game_ended(ended), true);
            assert.equal(move_thief(ended, 5, 0), null);
            assert.equal(
                move_king(
                    Object.assign({}, ended, {current_player: PLAYER_KING}),
                    0,
                    1
                ),
                null
            );
            assert.equal(pass_turn(ended), null);
        }
    );

    it(
        "the Thief cannot choose a square before rolling the die",
        function test_thief_must_roll_first() {
            const game = create_new_game();

            assert.equal(game.thief_move, null);
            assert.equal(
                move_thief(game, game.thief.row - 1, game.thief.column),
                null
            );
        }
    );

    it(
        "only the six move types that appear on the die face are accepted",
        function test_invalid_move_type() {
            const game = create_new_game();

            assert.equal(set_thief_move(game, "invalid"), null);
            assert.equal(set_thief_move(game, "king"), null);
            assert.equal(set_thief_move(game, ""), null);
        }
    );

    it(
        "a police car stops the Thief sliding through it, just like a traffic barrier",
        function test_police_car_blocks_path() {
            const board = create_empty_board();

            board[4][5] = POLICE_CAR;

            assert.equal(
                is_path_clear(board, {row: 4, column: 4}, {row: 4, column: 7}),
                false
            );
            assert.equal(
                is_valid_rook_move(
                    board,
                    {row: 4, column: 4},
                    {row: 4, column: 7}
                ),
                false
            );
        }
    );

    it(
        "the King cannot block the Exit itself with a police car",
        function test_barrier_not_on_exit() {
            const game = create_new_game();
            const king_game = Object.assign({}, game, {
                current_player: PLAYER_KING
            });

            assert.equal(is_valid_barrier_placement(king_game, game.exit), false);
        }
    );

    it(
        "once six police cars are on the board the King cannot place any more",
        function test_barrier_limit() {
            const game = create_new_game();
            const full_game = Object.assign({}, game, {
                current_player: PLAYER_KING,
                barriers: [
                    {row: 3, column: 0},
                    {row: 3, column: 1},
                    {row: 3, column: 2},
                    {row: 3, column: 3},
                    {row: 3, column: 4},
                    {row: 3, column: 5}
                ]
            });

            assert.equal(full_game.barriers.length, MAX_BARRIERS);
            assert.equal(
                is_valid_barrier_placement(full_game, {row: 4, column: 4}),
                false
            );
        }
    );

    it(
        "the King cannot walk onto a traffic barrier",
        function test_king_blocked_by_map_barrier() {
            const game = create_new_game(function controlled_zero() {
                return 0;
            });
            const king_game = Object.assign({}, game, {
                current_player: PLAYER_KING
            });

            assert.equal(
                is_valid_king_move(king_game, game.map_barriers[0]),
                false
            );
        }
    );

    it("a pawn move must go straight — no diagonals allowed", function test_pawn_no_diagonal() {
        const board = create_empty_board();

        assert.equal(
            is_valid_pawn_move(
                board,
                {row: 4, column: 4},
                {row: 3, column: 3}
            ),
            false
        );
    });

    it(
        "a pawn move only reaches the square directly next to the Thief — no jumping two squares",
        function test_pawn_no_jump() {
            const board = create_empty_board();

            assert.equal(
                is_valid_pawn_move(
                    board,
                    {row: 4, column: 4},
                    {row: 2, column: 4}
                ),
                false
            );
        }
    );

    it(
        "a square must be a whole number from 0 to 7 on both axes to be on the board",
        function test_inside_board() {
            assert.equal(is_inside_board(0, 0), true);
            assert.equal(is_inside_board(7, 7), true);
            assert.equal(is_inside_board(4, 4), true);
            assert.equal(is_inside_board(-1, 0), false);
            assert.equal(is_inside_board(0, -1), false);
            assert.equal(is_inside_board(8, 0), false);
            assert.equal(is_inside_board(0, 8), false);
            assert.equal(is_inside_board(0.5, 0), false);
        }
    );
});
