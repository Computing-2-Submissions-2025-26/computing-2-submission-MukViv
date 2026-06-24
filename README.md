# Computing 2 Coursework Submission.
**CID**: [02613317]

This is the submission template for your Computing 2 Applications coursework submission.

## Chess Thieves

Chess Thieves is a turn-based board game where the Thief tries to escape by
reaching the Exit, while the King tries to catch the Thief or delay the escape
past the turn limit.

The pure game-rule module is `web-app/game-logic.js`. It represents the whole
match as a plain game state object and exposes functions for creating a game,
rolling the Thief movement die, validating moves, moving the Thief, moving the
King, placing police cars, skipping turns, and checking the winner.

The generated API documentation is in `docs/index.html`. The main namespace
page is `docs/ChessThieves.html`.

### Core Game Loop

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

Vizcom was used to turn brief sketches into coloured images 
Chat gpt was used to add effects to 
Claude was used to code the baseline for everything 

Music: "Sneaky Snooper" by Audionautix (audionautix.com)
Licensed under Creative Commons Attribution 4.0 International (CC BY 4.0)

Sound effects: Pixabay (pixabay.com)

