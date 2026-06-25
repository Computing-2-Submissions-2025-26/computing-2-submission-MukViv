# Computing 2 Coursework Submission.
**CID**: [02613317]

## Chess Thieves

Chess Thieves is a turn-based chase game about a stolen set of chess pieces and
a king who is trying to get his chess family back. The Thief starts at the bottom
with the pieces and is trying to reach the Exit. The King starts from the top
and must either catch the Thief or slow them down until the 15 turn limit
has passed. The board begins with four permanent traffic barriers, so each match
starts with a slightly different escape route.

# As the Thief...
Roll the movement die, then move using the chess move type shown. The die has
six faces: pawn appears twice, while knight, bishop, rook, and queen each appear
once. This means pawn has a 2 in 6 chance, and every other move type has a 1 in
6 chance. The Thief wins by reaching the Exit before the King catches them or the
turn limit runs out. You may skip the turn if needed.

# As the King...
Choose between moving the King one square in any direction or placing a police
car as a blocker. The King can place a maximum of five police cars, and a police
car cannot be placed if it would completely trap the Thief with no route to the
Exit. The King wins by landing on the Thief's square or by stopping the escape
for more than 15 turns. You may skip the turn if needed.

# TURN THE SOUND ON


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
