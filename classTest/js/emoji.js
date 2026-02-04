const emojis = ['😀', '😂', '😍', '😎', '🤔', '😢', '😡', '🥳', '😱', '😴', '🚀', '😁', '🤩', '🤯', '😰', '🤡', '🥹', '☠️', '🤖', '🐵', '🐭', '🦄', '🐕', '🎉', '🎊', '🎈', '🌟', '💫', '⭐', '🔥', '💥', '🎯', '🎪', '🎭', '🎨', '🎬', '🎤', '🎧'];

const container = document.getElementById('emoji-container');
const generateBtn = document.getElementById('generateBtn');
const emojiCountInput = document.getElementById('emojiCount');

generateBtn.addEventListener('click', generateEmojis);
emojiCountInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
        generateEmojis();
    }
});

function generateEmojis() {
    const count = parseInt(emojiCountInput.value);
    if (!count || count < 1 || count > 200) {
        alert('Please enter a number between 1 and 200');
        return;
    }
    
    container.innerHTML = '';
    container.style.width = getContainerSize(count);
    container.style.height = getContainerSize(count);
    
    for (let i = 0; i < count; i++) {
        const emoji = document.createElement('div');
        emoji.className = 'emoji';
        emoji.innerText = emojis[Math.floor(Math.random() * emojis.length)];
        
        const angle = Math.random() * 2 * Math.PI;
        const radius = Math.random() * (getMaxRadius(count));
        const x = Math.cos(angle) * radius;
        const y = Math.sin(angle) * radius;
        
        emoji.style.transform = `translate(${x}px, ${y}px)`;
        container.appendChild(emoji);
    }
}

function getContainerSize(count) {
    if (count <= 20) return '300px';
    if (count <= 50) return '400px';
    if (count <= 100) return '500px';
    return '600px';
}

function getMaxRadius(count) {
    if (count <= 20) return 100;
    if (count <= 50) return 150;
    if (count <= 100) return 200;
    return 250;
}
