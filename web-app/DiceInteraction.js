import {
    PLAYER_THIEF,
    roll_thief_die
} from "./ChessThieves.js";

export const DICE_STATIONARY_IMAGE = "assets/images/dice_stationary_image.png";
export const DICE_ROLL_GIF = "assets/images/dice.gif";

export const rollResultImageByMoveType = {
    bishop: "assets/images/roll-results/bishop.png",
    knight: "assets/images/roll-results/knight.png",
    pawn: "assets/images/roll-results/pawn.png",
    queen: "assets/images/roll-results/queen.png",
    rook: "assets/images/roll-results/rook.png"
};

/**
 * Checks whether Player 1 is waiting to roll the movement dice.
 * @param {object} game The current game state.
 * @param {boolean} is_dice_animation_playing Whether the dice animation is busy.
 * @returns {boolean} True when the dice button should be visible.
 */
export function should_show_dice_button(game, is_dice_animation_playing) {
    return (
        game.current_player === PLAYER_THIEF
        && game.thief_move === null
        && game.winner === null
        && !is_dice_animation_playing
    );
}

/**
 * Checks whether a key should activate the dice button.
 * @param {string} key The key name from a keyboard event.
 * @returns {boolean} True when the key should roll the dice.
 */
export function is_dice_activation_key(key) {
    return key === "Enter" || key === " ";
}

/**
 * Chooses a movement type for the dice roll.
 * @param {Function} [random_function=Math.random] Optional random number generator.
 * @returns {string} The rolled movement type.
 */
export function get_random_move_type(random_function = Math.random) {
    return roll_thief_die(random_function);
}

/**
 * Gets the image path for a rolled move type.
 * @param {string} move_type The rolled movement type.
 * @returns {string} The image path for the result.
 */
export function get_roll_result_image(move_type) {
    return rollResultImageByMoveType[move_type];
}

/**
 * Creates a small state snapshot for starting a dice animation.
 * @param {object} game The current game state.
 * @param {boolean} is_dice_animation_playing Whether the dice animation is busy.
 * @param {Function} [random_function=Math.random] Optional random number generator.
 * @returns {object|null} The roll state, or null when rolling is not allowed.
 */
export function start_dice_roll_state(
    game,
    is_dice_animation_playing,
    random_function = Math.random
) {
    const move_type = get_random_move_type(random_function);

    if (!should_show_dice_button(game, is_dice_animation_playing)) {
        return null;
    }

    return {
        dice_button_visible: false,
        is_dice_animation_playing: true,
        move_type,
        rolling_animation_visible: true
    };
}
