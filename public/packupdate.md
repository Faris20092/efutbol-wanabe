Goal: Implement the "Contract" section navigation and UI for a mobile-style web game, precisely following the flow and design from the provided screenshots.

Navigation Flow:

Start from the main "Home" screen (implied from Image 0).

User taps the "Contract" button in the bottom navigation bar.

Navigate to the "Contract" Screen (modeled after Image 2).

From the "Contract" screen, user taps the "Special Player List" card.

Navigate to the "Special Player List" Screen (modeled after Image 1).

The "Back" button on both screens should return the user to the previous screen.

Detailed Screen Requirements:

1. "Contract" Screen (Component: ContractScreen)

Reference: Image 2.

Layout:

Top Bar: Display user's currency (Coins, GP) on the left. Add "Back" and "Home" buttons on the right.

Main Content: A 2-row grid of 6 rectangular cards.

Cards (Create a reusable CategoryCard component):

Special Player List: Must include a red notification badge with a number (e.g., '17' as shown). Title: "Special Player List". Subtitle: "Sign some amazing talent!".

Packs: Title: "Packs". Subtitle: "Get your hands on special products!".

Customisables: Title: "Customisables". Subtitle: "Get items that express your style.".

Standard Player: Title: "Standard Player".

Standard Player Tickets: Title: "Standard Player Tickets".

Standard Manager: Title: "Standard Manager".

Styling: Dark background with a blue/purple gradient aesthetic. Use placeholder images that match the theme for each card's background.

2. "Special Player List" Screen (Component: SpecialPlayerListScreen)

Reference: Image 1.

Layout:

Top Bar: Same currency and back/home buttons as the Contract screen. Add "Product Details" text and filter/sort icons on the right.

Main Content: A horizontal scrollable list (carousel) of pack cards.

Pack Cards (Create a reusable PlayerPackCard component):

Each card must display:

Header: Pack type (e.g., "Show Time", "Epic", "POTW") and "Limited Draw: [x]/[y]" count.

Title: The name of the pack (e.g., "English League Selection").

Timer: "Ends in: [D] day(s) [H] hr(s)".

Visuals: Featured players with their ratings and card art.

Action Buttons: Two buttons at the bottom for purchasing: one for a single draw (e.g., "1x [Coin Icon] 100") and one for multiple draws (e.g., "10x [Coin Icon] 900").

Footer: A "Nominating Contract" button below the purchase buttons, where applicable.

Data: Populate the carousel with the four examples shown in Image 1 ("English League Selection", "European Clubs Guardians", "European Club Championship", "Worldwide 18 Dec '25"). You can use placeholder data for the actual players, but the card structure must be accurate.

Technical Notes:

Use a modern frontend framework (React, Vue, etc.).

Assume the pack details (players, odds, etc.) will be fetched from an existing API; your focus is solely on the UI structure and navigation.

Implement the "Back" button logic to correctly pop the current screen from the navigation stack.

Match the dark mode, neon color palette, and font styles from the screenshots as closely as possible.