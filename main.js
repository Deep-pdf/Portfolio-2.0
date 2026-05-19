setInterval(() => {
    document.getElementById("time").innerHTML =
        new Date().toLocaleTimeString([], {
            hour: '2-digit',
            minute: '2-digit'
        });
}, 1000);

const icons = document.querySelectorAll('.icon');

const GRID_SIZE = 100;

icons.forEach(icon => {

    let isDragging = false;

    let offsetX = 0;
    let offsetY = 0;

    icon.addEventListener('mousedown', (e) => {

        isDragging = true;

        icon.classList.add('dragging');

        offsetX = e.clientX - icon.offsetLeft;
        offsetY = e.clientY - icon.offsetTop;

    });

    document.addEventListener('mousemove', (e) => {

        if (!isDragging) return;

        let x = e.clientX - offsetX;
        let y = e.clientY - offsetY;

        icon.style.left = x + 'px';
        icon.style.top = y + 'px';

    });

    document.addEventListener('mouseup', () => {

        if (!isDragging) return;

        isDragging = false;

        icon.classList.remove('dragging');

        /* GRID SNAP */

        let finalX = parseInt(icon.style.left);
        let finalY = parseInt(icon.style.top);

        finalX = Math.round(finalX / GRID_SIZE) * GRID_SIZE;
        finalY = Math.round(finalY / GRID_SIZE) * GRID_SIZE;

        /* Smooth Snap */

        icon.style.transition = 'all 0.18s ease';

        icon.style.left = finalX + 'px';
        icon.style.top = finalY + 'px';

        setTimeout(() => {
            icon.style.transition = '';
        }, 200);
    });
});