Subject: Create a Reusable PES 2021 Style Card Component for a Web Game

"I am building a web-based football game. Please create a robust HTML/React component using Tailwind CSS for a player card inspired by PES 2021 Mobile.

1. Design & Layout (The 'Squircle' Icon):

Shape: The card must be a perfect square with heavy rounded corners (rounded-[2rem] or rounded-3xl).

Dimensions: Use a responsive width (e.g., w-32 h-32 or w-full aspect-square).

Inner Layout:

Left Column:

Position: Top-left (Small text, uppercase).

Rating: Center-left (Large, Extra Bold text).

rarity logo: Bottom-left (Small circular/shield icon).

Right Column:

Player Image: Transparent PNG, aligned right, slightly overlapping the bottom bar if needed, clipped by the border. based on asset/faces folder.

Bottom: A solid black bar fixed at the bottom edge inside the card.

Exclusions: No player name text. No stamina gauge.

2. Rarity Color System: The component must handle these 7 specific rarities. Use Tailwind Gradients:

Iconic (Pink): bg-gradient-to-br from-pink-500 via-rose-600 to-rose-900. White text.

Legend (Gold): bg-gradient-to-br from-yellow-200 via-yellow-500 to-yellow-700. Text needs a shadow or dark outline for visibility.

Black Ball: bg-gradient-to-br from-gray-800 to-black. White text.

Gold Ball: bg-gradient-to-br from-yellow-100 to-yellow-500. Dark Gray/Black text (for contrast).

Silver Ball: bg-gradient-to-br from-gray-100 via-gray-300 to-gray-500. Dark Gray/Black text.

Bronze Ball: bg-gradient-to-br from-orange-200 via-orange-400 to-orange-800. White text.

White Ball: bg-gradient-to-br from-white to-gray-200. Black text (Important).

3. Implementation Requirements:

Provide a Single React Component (e.g., Card.jsx) that accepts props: rarity, rating, position, image, clubBadge.

Alternatively, if simpler, provide a generic HTML/CSS structure that uses a class like .card-iconic, .card-black, etc.

Ensure the rating number is centered vertically relative to the space on the left.

Add a subtle drop-shadow-lg to the whole card to make it pop on the website background."