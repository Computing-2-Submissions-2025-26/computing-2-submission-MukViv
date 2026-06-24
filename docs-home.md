# Chess Thieves API Documentation

This documentation describes the pure game module in `web-app/game-logic.js`.
The module contains the rules only: it does not touch the DOM, play audio, or
render the board. You can reuse it from a browser UI, a command-line version,
or tests.

## Core Game Loop

1. Start with `create_new_game()`.
2. On the Thief's turn, call `roll_thief_die()`.
3. Store that roll with `set_thief_move(game, move_type)`.
4. Use `is_valid_thief_move(...)` to show legal Thief destinations.
5. Apply the Thief move with `move_thief(game, row, column)`.
6. On the King's turn, either use `move_king(...)` or `place_barrier(...)`.
7. Use `check_winner(game)` or `is_game_ended(game)` after each returned state.

Most action functions return a new game state when the action is legal and
`null` when the action breaks a Chess Thieves rule. Keep the old state when a
function returns `null`.

Use the navigation to inspect the exported constants, state types, and
functions such as `create_new_game`, `move_thief`, `move_king`,
`place_barrier`, and `check_winner`.
