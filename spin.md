Context: I am building a web-based football management game (eFootball/PES style). I have a basic prototype for a "Spinning Ball" contract signing animation. I need you to upgrade this into a full production-ready component (React/Vue/Next.js preferred) with expanded rarity logic and anti-cheat protection.

1. Expanded Rarity System: The game now features 7 Rarity Tiers. The component must handle unique styling (CSS/Images) for each ball type:

Iconic (Highest - Pink/Red styling)

Legend (Gold+ styling)

Black

Gold

Silver

Bronze

White (Lowest)

Requirement: Create a getBallStyle(rarity) helper function that returns the correct CSS class or image URL for the specific rarity.

Ball Text: All balls should display the text "EFW".

2. Anti-Cheat & Backend Logic (Crucial):

No Client-Side RNG: The browser must never decide the winner.

The Flow:

User clicks "Sign" (1x or 10x).

Client sends request to API (POST /api/sign-contract).

Server calculates result(s) and subtracts currency.

Server returns payload: { highestRarity: 'iconic', players: [...] }.

Only then does the client start the deceleration animation to land on the correct ball color.

3. The "10x Spin" Logic:

The Rule: If the user performs a 10x spin, the spinning animation must land on a ball matching the highest rarity player in the pack.

Example: If the server returns 1 Iconic and 9 Silver, the animation must stop on an Iconic Ball.

Example: If the best player is Gold, the animation stops on a Gold Ball.

4. The Cinematic Reveal Flow: The component must handle this exact state sequence:

Idle: Sign buttons visible.

Spinning: Infinite loop waiting for API.

Stopping: Decelerate and land on the highestRarity ball.

Cinematic (GIF):

Immediately overlay a full-screen GIF: assets/gifs/{rarity}.gif.

Note: Iconic/Legend/Black usually have special animations. White/Bronze/Silver might have a generic one.

Interaction: User can Tap to SKIP the GIF.

Card Reveal:

Show the main Player Card (the .player_detail design card with full player image)

If 10x spin: theres 2 row,1 row have 5 player. the highest rarity player card should be displayed at top left at first row and so on. and yes the player card same follow the .player_detail design card with full player image.

5. Technical Requirements:

Create a clean, reusable component.

Include a Mock API Function that simulates the server response with these new rarities so I can test the "Iconic" and "Legend" spin logic immediately without a real backend.