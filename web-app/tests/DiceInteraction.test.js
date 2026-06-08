import assert from "node:assert/strict";
import {
    PLAYER_KING,
    create_new_game,
    set_thief_move
} from "../ChessThieves.js";
import {
    get_random_move_type,
    get_roll_result_image,
    is_dice_activation_key,
    should_show_dice_button,
    start_dice_roll_state
} from "../DiceInteraction.js";

describe("Dice interaction", function describe_dice_interaction() {
    it("shows the dice button only during Player 1 roll phase", function test_button_phase() {
        const game = create_new_game();
        const rolled_game = set_thief_move(game, "pawn");
        const king_game = {
            ...game,
            current_player: PLAYER_KING
        };

        assert.equal(should_show_dice_button(game, false), true);
        assert.equal(should_show_dice_button(game, true), false);
        assert.equal(should_show_dice_button(rolled_game, false), false);
        assert.equal(should_show_dice_button(king_game, false), false);
    });

    it("clicking dice hides button and shows rolling animation state", function test_start_roll() {
        const game = create_new_game();
        const roll_state = start_dice_roll_state(game, false, function roll_bishop() {
            return 0.5;
        });

        assert.equal(roll_state.dice_button_visible, false);
        assert.equal(roll_state.rolling_animation_visible, true);
        assert.equal(roll_state.is_dice_animation_playing, true);
        assert.equal(roll_state.move_type, "bishop");
    });

    it("finds the correct result image after the video finishes", function test_result_image() {
        assert.equal(
            get_roll_result_image("bishop"),
            "assets/images/roll-results/bishop.png"
        );
    });

    it("updates game state to the rolled move", function test_state_update() {
        const game = create_new_game();
        const rolled_game = set_thief_move(game, "rook");

        assert.equal(rolled_game.thief_move, "rook");
    });

    it("allows Enter and Space to trigger the dice", function test_keyboard() {
        assert.equal(is_dice_activation_key("Enter"), true);
        assert.equal(is_dice_activation_key(" "), true);
        assert.equal(is_dice_activation_key("ArrowDown"), false);
    });

    it("does not start a second roll while animation is playing", function test_double_roll() {
        const game = create_new_game();

        assert.equal(start_dice_roll_state(game, true), null);
    });

    it("can use a deterministic random roll", function test_random_roll() {
        assert.equal(get_random_move_type(function roll_queen() {
            return 0.99;
        }), "queen");
    });
});
