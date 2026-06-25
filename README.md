# Computing 2 Coursework Submission.
**CID**: [02613317]

This is the submission template for your Computing 2 Applications coursework submission.

## Chess Thieves

Chess Thieves is a turn-based board game where the Thief tries to escape with a 
bag full of stolen chess pieces by
reaching the Exit, while the King tries to catch the Thief or delay the escape
past the turn limit (15 turns). Each player has a 20s window to act before their
turn is automatically skipped.

As a thief...
You roll a dice to decide your move type based on chess moves 
Try to reach the exit before 15 turns 

As a king...
You select between moving and placing a police car (max 5) that can block the thief 
Try to catch the thief or prevent them from escaping within 15 turns

TURN THE SOUND ON


### Core Game Loop

1. Start with `create_new_game()`.
2. On the Thief's turn, call `roll_thief_die()`.
3. Store that roll with `set_thief_move(game, move_type)`.
4. Use `is_valid_thief_move(...)` to show legal Thief destinations.
5. Apply the Thief move with `move_thief(game, row, column)`.
6. On the King's turn, either use `move_king(...)` or `place_police_car(...)`.
7. Use `check_winner(game)` or `is_game_ended(game)` after each returned state.

Most action functions return a new game state when the action is legal and
`null` when the action breaks a Chess Thieves rule. Keep the old state when a
function returns `null`.

AI Acknowledgement:

Vizcom was used to transform concept sketches into coloured illustrations and to generate the winning poster artwork. The dice asset was not AI-generated; it was modelled and animated manually in Fusion 360.
ChatGPT was used to generate the videos for the winning poster.
Claude was used as a coding assistant across the project to go over the human baseline code. Its primary contributions were implementing video, image, and audio imports/generations; CSS clipping and resizing; features related to the introduction screens and winning poster; and suggesting additional unit tests and failure-condition test cases. All AI-generated code, assets, and suggestions were reviewed, adapted, and tested before inclusion in the final project.



Music: "Sneaky Snooper" by Audionautix (audionautix.com)
Licensed under Creative Commons Attribution 4.0 International (CC BY 4.0)

Sound effects: Pixabay (pixabay.com)
