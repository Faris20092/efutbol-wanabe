Subject: Create a Reusable PES 2021 Style Card Component for a Web Game

"I am building a web-based football game. Please create a robust HTML/React component using Tailwind CSS for a player card inspired by PES 2021 Mobile.

1. Design & Layout:

Shape: Rectangular card with rounded corners (`border-radius: 10px`). Use a flex layout for lists.

Inner Layout:
Left Column:
Position: Left, small text (`font-size: 0.75em`, `margin-bottom: 5px`).
Rating: Centered/Prominent (`font-size: 1.5em`, `font-weight: bold`).
Rarity Logo: Bottom (if applicable).

Right Column:
Player Image: Centered/Right.

2. Rarity Color System: Use the following specific CSS values:

Base/Standard:
```css
background: linear-gradient(135deg, rgba(100, 50, 150, 0.8), rgba(50, 20, 100, 0.9));
border: 2px solid rgba(200, 100, 255, 0.3);
```

Iconic (Pink):
```css
background: linear-gradient(135deg, rgba(219, 10, 91, 0.8), rgba(139, 0, 139, 0.9));
border-color: rgba(255, 20, 147, 0.5);
```

Legend (Gold):
```css
background: linear-gradient(135deg, rgba(218, 165, 32, 0.8), rgba(139, 101, 8, 0.9));
border-color: rgba(255, 215, 0, 0.5);
```

Other rarities (Black, Gold, Silver, Bronze, White) can use standard Tailwind gradients or similar logic.

3. Implementation Requirements:

Provide a Single React Component (e.g., Card.jsx) that accepts props: rarity, rating, position, image, clubBadge.

Alternatively, if simpler, provide a generic HTML/CSS structure that uses a class like .card-iconic, .card-black, etc.

Ensure the rating number is centered vertically relative to the space on the left.

Add a subtle drop-shadow-lg to the whole card to make it pop on the website background."