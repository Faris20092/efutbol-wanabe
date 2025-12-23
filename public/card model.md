.player-detail-container {
    display: flex;
    gap: 30px;
    padding: 0;
    background: transparent;
    border-radius: 0;
    max-width: 900px;
    margin: 0 auto;
}

.player-detail-left {
    flex-shrink: 0;
}

.player-detail-card {
    position: relative;
    width: 240px;
    height: 340px;
    background: linear-gradient(135deg, #e91e63 0%, #9c27b0 100%);
    border-radius: 15px;
    overflow: hidden;
    box-shadow: 0 10px 30px rgba(0, 0, 0, 0.5);
    border: 4px solid rgba(255, 255, 255, 0.3);
}

.player-detail-card[data-rarity="Iconic"] {
    background: linear-gradient(135deg, 
        rgba(219, 10, 91, 0.95) 0%, 
        rgba(255, 20, 147, 0.9) 25%, 
        rgba(199, 21, 133, 0.95) 50%, 
        rgba(139, 0, 139, 1) 100%);
    border: 4px solid rgba(255, 20, 147, 0.8);
    box-shadow: 0 10px 40px rgba(255, 20, 147, 0.6);
}

.player-detail-card[data-rarity="Legend"] {
    background: linear-gradient(135deg, 
        rgba(218, 165, 32, 0.95) 0%, 
        rgba(255, 215, 0, 0.9) 25%, 
        rgba(184, 134, 11, 0.95) 50%, 
        rgba(139, 101, 8, 1) 100%);
    border: 4px solid rgba(255, 215, 0, 0.8);
    box-shadow: 0 10px 40px rgba(255, 215, 0, 0.6);
}

.player-detail-card[data-rarity="Black"] {
    background: linear-gradient(135deg, 
        rgba(40, 40, 40, 0.95) 0%, 
        rgba(60, 60, 60, 0.9) 25%, 
        rgba(30, 30, 30, 0.95) 50%, 
        rgba(10, 10, 10, 1) 100%);
    border: 4px solid rgba(80, 80, 80, 0.8);
    box-shadow: 0 10px 40px rgba(0, 0, 0, 0.8);
}

.player-detail-card[data-rarity="Gold"] {
    background: linear-gradient(135deg, 
        rgba(255, 195, 0, 0.95) 0%, 
        rgba(255, 215, 100, 0.9) 25%, 
        rgba(218, 165, 32, 0.95) 50%, 
        rgba(184, 134, 11, 1) 100%);
    border: 4px solid rgba(255, 195, 0, 0.8);
    box-shadow: 0 10px 40px rgba(255, 195, 0, 0.6);
}

.player-detail-card[data-rarity="Silver"] {
    background: linear-gradient(135deg, 
        rgba(192, 192, 192, 0.95) 0%, 
        rgba(220, 220, 220, 0.9) 25%, 
        rgba(169, 169, 169, 0.95) 50%, 
        rgba(128, 128, 128, 1) 100%);
    border: 4px solid rgba(192, 192, 192, 0.8);
    box-shadow: 0 10px 40px rgba(192, 192, 192, 0.6);
}

.player-detail-card[data-rarity="Bronze"] {
    background: linear-gradient(135deg, 
        rgba(205, 127, 50, 0.95) 0%, 
        rgba(230, 150, 80, 0.9) 25%, 
        rgba(184, 115, 51, 0.95) 50%, 
        rgba(139, 90, 43, 1) 100%);
    border: 4px solid rgba(205, 127, 50, 0.8);
    box-shadow: 0 10px 40px rgba(205, 127, 50, 0.6);
}

.player-detail-card[data-rarity="White"] {
    background: linear-gradient(135deg, 
        rgba(245, 245, 245, 0.95) 0%, 
        rgba(255, 255, 255, 0.9) 25%, 
        rgba(230, 230, 230, 0.95) 50%, 
        rgba(200, 200, 200, 1) 100%);
    border: 4px solid rgba(255, 255, 255, 0.8);
    box-shadow: 0 10px 40px rgba(255, 255, 255, 0.4);
}

.player-card-position {
    position: absolute;
    top: 10px;
    left: 10px;
    color: white;
    padding: 3px 10px;
    border-radius: 5px;
    font-weight: bold;
    font-size: 1em;
    background: rgba(0, 0, 0, 0.4);
    z-index: 10;
}

.player-card-rating {
    position: absolute;
    top: 40px;
    left: 10px;
    color: #FFED00;
    font-weight: 900;
    font-size: 2.5em;
    text-shadow: 2px 2px 4px rgba(0, 0, 0, 0.8);
    z-index: 10;
    line-height: 1;
}

.player-card-rarity {
    position: absolute;
    top: 95px;
    left: 10px;
    font-size: 2em;
    z-index: 10;
    filter: drop-shadow(2px 2px 3px rgba(0, 0, 0, 0.8));
}

.player-card-rarity-bottom {
    position: absolute;
    bottom: 10px;
    left: 10px;
    right: 10px;
    background: rgba(0, 0, 0, 0.8);
    color: white;
    padding: 6px;
    border-radius: 8px;
    font-weight: bold;
    text-align: center;
    font-size: 0.85em;
    z-index: 10;
}

.player-detail-image {
    width: 100%;
    height: 100%;
    object-fit: cover;
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    z-index: 1;
}

.player-detail-right {
    flex: 1;
    color: white;
}

.player-detail-header {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 20px;
    margin-bottom: 30px;
}

.player-detail-info {
    display: flex;
    flex-direction: column;
    gap: 10px;
}

.player-detail-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 10px 15px;
    background: rgba(255, 255, 255, 0.05);
    border-radius: 8px;
}

.player-detail-label {
    font-weight: bold;
    color: rgba(255, 255, 255, 0.7);
}

.player-detail-value {
    font-weight: bold;
    color: white;
    font-size: 1.1em;
}

.player-detail-section-title {
    color: #3b82f6;
    font-size: 1.3em;
    margin: 20px 0 15px 0;
    font-weight: bold;
}

.player-detail-stats {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 12px;
}

.player-detail-stat {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 12px 15px;
    background: rgba(255, 255, 255, 0.05);
    border-radius: 8px;
}

.stat-icon {
    font-size: 1.3em;
}

.stat-label {
    flex: 1;
    color: rgba(255, 255, 255, 0.8);
}

.stat-value {
    font-weight: bold;
    color: white;
    font-size: 1.1em;
}

.player-detail-skills {
    color: rgba(255, 255, 255, 0.7);
    line-height: 1.8;
    padding: 15px;
    background: rgba(255, 255, 255, 0.05);
    border-radius: 8px;
}