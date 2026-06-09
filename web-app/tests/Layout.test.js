import assert from "node:assert/strict";
import fs from "node:fs";

const html = fs.readFileSync("web-app/index.html", "utf8");
const css = fs.readFileSync("web-app/default.css", "utf8");
const main_js = fs.readFileSync("web-app/main.js", "utf8");

describe("Chess Thieves layout", function describe_layout() {
    it("has the main game wrapper and responsive board class", function test_layout_hooks() {
        assert.match(html, /class="game-shell"/);
        assert.match(html, /class="game-layout"/);
        assert.match(html, /class="board game-board"/);
    });

    it("keeps the board inside viewport size constraints", function test_board_constraints() {
        assert.match(css, /--board-size:/);
        assert.match(css, /--safe-screen-padding:/);
        assert.match(css, /\.board-area[\s\S]*max-height: calc\(100svh - var\(--safe-screen-padding\)\);/);
        assert.match(css, /\.game-board,[\s\S]*aspect-ratio: 1 \/ 1;/);
        assert.match(css, /\.game-board,[\s\S]*max-width: 100%;/);
        assert.match(css, /\.game-board,[\s\S]*max-height: 100%;/);
    });

    it("keeps the dice button accessible and keyboard triggerable", function test_dice_access() {
        assert.match(html, /aria-label="Roll movement dice"/);
        assert.match(main_js, /function handleDiceButtonKeydown\(event\)/);
        assert.match(main_js, /event\.key === "Enter"/);
        assert.match(main_js, /event\.key === " "/);
        assert.match(main_js, /key === "r"/);
    });

    it("uses hidden classes for the dice overlay state", function test_overlay_classes() {
        assert.match(html, /class="board-area"[\s\S]*id="dice-stage"/);
        assert.match(html, /id="dice-stage" class="dice-stage is-hidden"/);
        assert.match(main_js, /dice_stage\.classList\.remove\("is-hidden"\)/);
        assert.match(main_js, /dice_stage\.classList\.add\("is-hidden"\)/);
        assert.match(css, /\.board-area[\s\S]*position: relative;/);
        assert.match(css, /\.dice-stage[\s\S]*position: absolute;/);
        assert.match(css, /\.dice-stage[\s\S]*pointer-events: none;/);
    });

    it("does not set repeated layout values through JavaScript styles", function test_no_inline_layout_styles() {
        assert.equal(main_js.includes(".style"), false);
        assert.equal(main_js.includes("style ="), false);
        assert.match(css, /:root\s*{/);
        assert.match(css, /--dice-button-size:/);
        assert.match(css, /--dice-button-offset:/);
    });
});
