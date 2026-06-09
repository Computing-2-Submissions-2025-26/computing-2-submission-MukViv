import assert from "node:assert/strict";
import {
    BARRIER,
    PLAYER_KING,
    PLAYER_THIEF,
    create_empty_board,
    create_new_game,
    check_winner,
    is_path_clear,
    is_valid_barrier_placement,
    is_valid_bishop_move,
    is_valid_king_move,
    is_valid_knight_move,
    is_valid_queen_move,
    is_valid_rook_move,
    is_valid_sneak_move,
    is_valid_thief_move,
    place_barrier,
    roll_thief_die,
    set_thief_move
} from "../ChessThieves.js";

describe("Chess Thieves rules", function describe_chess_thieves() {
    it("rolls a value from the thief move die", function test_roll() {
        assert.equal(roll_thief_die(function minimum_roll() {
            return 0;
        }), "pawn");
        assert.equal(roll_thief_die(function maximum_roll() {
            return 0.99;
        }), "queen");
    });

    it("starts Player 1 in a roll phase", function test_roll_phase() {
        const game = create_new_game();
        const rolled_game = set_thief_move(game, "pawn");

        assert.equal(game.thief_move, null);
        assert.notEqual(rolled_game, null);
        assert.equal(rolled_game.thief_move, "pawn");
        assert.equal(set_thief_move(rolled_game, "rook"), null);
    });

    it("validates basic thief movement", function test_movement() {
        const board = create_empty_board();

        assert.equal(
            is_valid_sneak_move(board, {row: 4, column: 4}, {row: 3, column: 4}),
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

    it("blocks sliding moves through barriers", function test_path_clear() {
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

    it("places legal barriers and rejects occupied squares", function test_barrier() {
        const game = {
            ...create_new_game(function first_roll() {
                return 0;
            }),
            current_player: PLAYER_KING
        };

        assert.equal(place_barrier(game, game.thief.row, game.thief.column), null);
        assert.notEqual(place_barrier(game, 1, 1), null);
    });

    it("checks legal squares for board highlights", function test_highlight_rules() {
        const game = create_new_game(function queen_roll() {
            return 0.99;
        });
        const king_game = {
            ...game,
            current_player: PLAYER_KING
        };
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
            is_valid_thief_move(game, "queen", game.thief, invalid_queen_target),
            false
        );
        assert.equal(is_valid_king_move(king_game, {row: 1, column: 6}), true);
        assert.equal(is_valid_barrier_placement(king_game, {row: 1, column: 1}), true);
        assert.equal(is_valid_barrier_placement(king_game, game.thief), false);
    });

    it("detects both win conditions", function test_winners() {
        const base_game = create_new_game();
        const thief_game = {
            ...base_game,
            thief: {row: 0, column: 0}
        };
        const king_game = {
            ...base_game,
            king: base_game.thief
        };

        assert.equal(check_winner(thief_game), PLAYER_THIEF);
        assert.equal(check_winner(king_game), PLAYER_KING);
    });
});
