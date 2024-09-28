
function initializeApp() {
    const fileInput = document.getElementById('dropzone-file');
    fileInput.addEventListener('change', handleFileUpload);

    // Add event listener for the example image
    const exampleImage = document.getElementById('example-image');
    exampleImage.addEventListener('click', handleExampleImageClick);
}

function handleFileUpload(event) {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => processUploadedImage(e.target.result);
    reader.readAsDataURL(file);
    console.log('Outputing to console');

    // Track the solve attempt event
    if (window.sa_event) {
        window.sa_event('solve_attempt');
    }
}

function processUploadedImage(imageDataUrl) {
    const img = new Image();
    img.onload = () => {
        try {
            // Reset previous results
            resetAnalysis();

            const canvas = createCanvasFromImage(img);
            const imageData = getImageDataFromCanvas(canvas);

            const croppedCanvas = cropImageToGrid(canvas);
            const gridInfo = analyzeGrid(croppedCanvas);
            const figuresInfo = analyzeFigures(canvas, imageData);

            solve(gridInfo, figuresInfo);

            if (isDebugMode()) {
                displayDebugInfo(canvas, croppedCanvas);
            }

            // Hide the example section
            const exampleSection = document.getElementById('example-image').closest('.bg-white');
            exampleSection.classList.add('hidden');

            // Scroll to the grid analysis section
            setTimeout(() => {  
                const gridContainer = document.getElementById('grid-container');
                gridContainer.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }, 200);
        } catch (error) {
            console.error('Error processing image:', error);
            // Display an error message to the user
            const resultContainer = document.getElementById('result-container');
            resultContainer.textContent = 'An error occurred while processing the image. Please try again.';
            resultContainer.classList.remove('hidden');
        } finally {
            // Show and reset the feedback buttons
            showFeedbackButtons();

            // Show the report issue button
            const reportIssueButton = document.getElementById('report-issue');
            reportIssueButton.classList.remove('hidden');
            reportIssueButton.onclick = () => reportIssue(imageDataUrl);
        }
    };
    img.src = imageDataUrl;
}

function isTablet(canvas) {
    return canvas.width / canvas.height > 0.5;
}

function showFeedbackButtons() {
    const feedbackContainer = document.getElementById('feedback-container');
    if (!feedbackContainer) {
        const container = document.createElement('div');
        container.id = 'feedback-container';
        container.className = 'mt-4 flex flex-col items-center space-y-4';
        container.innerHTML = `
            <div class="flex justify-center space-x-4">
                <button id="upvote-button" class="bg-green-500 hover:bg-green-600 text-white font-bold py-2 px-4 rounded transition duration-300 ease-in-out">
                    👍 I like it!
                </button>
                <button id="downvote-button" class="bg-red-500 hover:bg-red-600 text-white font-bold py-2 px-4 rounded transition duration-300 ease-in-out">
                    👎 Sucks!
                </button>
            </div>
            <div id="feedback-text-container" class="hidden w-full items-center">
                <textarea id="feedback-text" class="w-full p-2 border rounded" rows="3" placeholder="Please provide your feedback"></textarea>
                <button id="report-issue" class="mt-2 bg-blue-500 hover:bg-blue-600 text-white font-bold py-2 px-4 rounded transition duration-300 ease-in-out" disabled>
                    Report an issue
                </button>
            </div>
        `;
        const reportIssueButton = document.getElementById('report-issue');
        reportIssueButton.parentNode.insertBefore(container, reportIssueButton);

        const upvoteButton = document.getElementById('upvote-button');
        const downvoteButton = document.getElementById('downvote-button');
        const feedbackText = document.getElementById('feedback-text');
        const reportIssueBtn = document.getElementById('report-issue');

        upvoteButton.addEventListener('click', handleUpvote);
        downvoteButton.addEventListener('click', handleDownvote);
        feedbackText.addEventListener('input', () => {
            reportIssueBtn.disabled = feedbackText.value.length < 3;
        });
    }

    // Reset buttons
    const upvoteButton = document.getElementById('upvote-button');
    const downvoteButton = document.getElementById('downvote-button');
    upvoteButton.disabled = false;
    downvoteButton.disabled = false;
    upvoteButton.classList.remove('opacity-50', 'cursor-not-allowed');
    downvoteButton.classList.remove('opacity-50', 'cursor-not-allowed');
}

function handleUpvote() {
    if (window.sa_event) {
        window.sa_event('upvote');
    }
    disableFeedbackButtons();
}

function handleDownvote() {
    const feedbackTextContainer = document.getElementById('feedback-text-container');
    feedbackTextContainer.classList.remove('hidden');
    disableFeedbackButtons();
}

function disableFeedbackButtons() {
    const upvoteButton = document.getElementById('upvote-button');
    const downvoteButton = document.getElementById('downvote-button');
    upvoteButton.disabled = true;
    downvoteButton.disabled = true;
    upvoteButton.classList.add('opacity-50', 'cursor-not-allowed');
    downvoteButton.classList.add('opacity-50', 'cursor-not-allowed');
}

function resetAnalysis() {
    // Reset final grid analysis
    const solutionContainer = document.getElementById('solution-container');
    const solutionGrid = document.getElementById('solution-grid');
    solutionContainer.classList.add('hidden');
    solutionGrid.innerHTML = '';

    // Reset step-by-step solution
    const stepsContainer = document.getElementById('steps-container');
    const stepsList = document.getElementById('steps-list');
    stepsContainer.classList.add('hidden');
    stepsList.innerHTML = '';

    // Reset result message
    const resultContainer = document.getElementById('result-container');
    if (resultContainer) {
        resultContainer.textContent = '';
        resultContainer.classList.add('hidden');
    }

    // Reset feedback buttons
    const feedbackContainer = document.getElementById('feedback-container');
    if (feedbackContainer) {
        feedbackContainer.remove();
    }
}

function createCanvasFromImage(img) {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    canvas.width = img.width;
    canvas.height = img.height;
    ctx.drawImage(img, 0, 0, img.width, img.height);
    return canvas;
}

function getImageDataFromCanvas(canvas) {
    const ctx = canvas.getContext('2d');
    return ctx.getImageData(0, 0, canvas.width, canvas.height);
}

function cropImageToGrid(canvas) {
    let startY, endY;

    if (isTablet(canvas)) {
        startY = Math.floor(canvas.height * 0.1785);
        endY = Math.floor(canvas.height * 0.6779);
    } else {
        startY = Math.floor(canvas.height * 0.2375);
        endY = Math.floor(canvas.height * 0.65);
    }

    const height = endY - startY;
    const width = height;  // Assuming the grid is square
    const startX = Math.floor((canvas.width - width) / 2);  // Center horizontally

    return cropCanvasToRegion(canvas, startX, startY, width, height);
}

function isColorMatch(color1, color2, tolerance) {
    return color1.every((value, index) => Math.abs(value - color2[index]) <= tolerance);
}

function cropCanvasToRegion(canvas, startX, startY, width, height) {
    const croppedCanvas = document.createElement('canvas');
    const ctx = croppedCanvas.getContext('2d');
    croppedCanvas.width = width;
    croppedCanvas.height = height;
    ctx.drawImage(canvas, startX, startY, width, height, 0, 0, width, height);
    return croppedCanvas;
}

function analyzeGrid(canvas) {
    const gridContainer = document.getElementById('grid-container');
    const gridTiles = document.getElementById('grid-tiles');
    const margin = 8;
    const effectiveWidth = canvas.width - 2 * margin;
    const effectiveHeight = canvas.height - 2 * margin;
    const tileWidth = Math.floor(effectiveWidth / 8);
    const tileHeight = Math.floor(effectiveHeight / 8);
    const emptyColor = [28, 36, 70];
    const filledColor = [141, 96, 209];
    const colorTolerance = 50;

    gridTiles.innerHTML = '';
    const gridInfo = [];

    for (let row = 0; row < 8; row++) {
        const rowInfo = [];
        for (let col = 0; col < 8; col++) {
            const tileCanvas = cropTileFromGrid(canvas, row, col, margin, tileWidth, tileHeight);
            const tileColor = getTileColor(tileCanvas);
            const isEmpty = isCloserToColor(tileColor, emptyColor, filledColor);

            rowInfo.push(isEmpty ? 0 : 1);
            createTileElement(gridTiles, isEmpty, row, col);
        }
        gridInfo.push(rowInfo);
    }

    gridContainer.classList.remove('hidden');

    // Print the grid in the console
    console.log(`InitialGrid:${gridInfo.flat().join(" ")}`);

    return gridInfo;
}

function cropTileFromGrid(canvas, row, col, margin, tileWidth, tileHeight) {
    const x = margin + col * tileWidth;
    const y = margin + row * tileHeight;

    const tileCanvas = document.createElement('canvas');
    const ctx = tileCanvas.getContext('2d');
    tileCanvas.width = tileWidth;
    tileCanvas.height = tileHeight;
    ctx.drawImage(canvas, x, y, tileWidth, tileHeight, 0, 0, tileWidth, tileHeight);

    // Append the tile canvas to the body
    //document.body.appendChild(tileCanvas); // un/comment this line to 

    return tileCanvas;
}

function getTileColor(canvas) {
    const ctx = canvas.getContext('2d');
    const centerX = Math.floor(canvas.width / 2);
    const centerY = Math.floor(canvas.height / 2);
    const centerPixel = ctx.getImageData(centerX, centerY, 1, 1).data;

    return [
        centerPixel[0],
        centerPixel[1],
        centerPixel[2]
    ];
}

function isCloserToColor(color, target1, target2) {
    const distance1 = getColorDistance(color, target1);
    const distance2 = getColorDistance(color, target2);
    return distance1 < distance2 / 2; // divided by two because the empty tile is darker
}

function getColorDistance(color1, color2) {
    return Math.sqrt(
        Math.pow(color1[0] - color2[0], 2) +
        Math.pow(color1[1] - color2[1], 2) +
        Math.pow(color1[2] - color2[2], 2)
    );
}

function createTileElement(container, isEmpty, row, col) {
    const tileDiv = document.createElement('div');
    tileDiv.className = `w-8 h-8 sm:w-8 sm:h-8 ${isEmpty ? 'bg-green-500' : 'bg-red-500'}`;
    tileDiv.title = `Row ${row + 1}, Column ${col + 1}: ${isEmpty ? 'Empty' : 'Filled'}`;
    container.appendChild(tileDiv);
}

function analyzeFigures(canvas, imageData) {
    const figuresContainer = document.getElementById('figures-container');
    const figuresGrid = document.getElementById('figures-grid');

    let startY, endY;

    if(isTablet(canvas)) {
        startY = Math.floor(canvas.height * 0.6779);
        endY = Math.floor(canvas.height * 0.93);
    } else {
        startY = Math.floor(canvas.height * 2 / 3);
        endY = Math.floor(canvas.height * 5 / 6);
    }

    const startX = 0;
    const endX = canvas.width;

    const croppedCanvas = cropCanvasToRegion(canvas, startX, startY, endX - startX, endY - startY);

    // Split the cropped canvas into three equal parts
    let figures, figureWidth;

    if(isTablet(canvas)) {
        figureWidth = Math.floor((croppedCanvas.width - 85 * 2) / 3);
         figures = [
            { startX: 85, endX: figureWidth + 85 },
            { startX: figureWidth + 85, endX: figureWidth * 2 },
            { startX: figureWidth * 2 + 85, endX: croppedCanvas.width - 85}
        ];
    } else {
        figureWidth = Math.floor(croppedCanvas.width / 3);

        figures = [
            { startX: 0, endX: figureWidth },
            { startX: figureWidth, endX: figureWidth * 2 },
            { startX: figureWidth * 2, endX: croppedCanvas.width }
        ];
    }

    const figuresInfo = displayFigures(croppedCanvas, figures, figuresGrid, canvas);
    figuresContainer.classList.remove('hidden');
    return figuresInfo;
}

function displayFigures(canvas, figures, container, originalCanvas) {
    container.innerHTML = '';
    const figuresInfo = [];
    const colors = ['blue', 'yellow', 'fuchsia'];

    const validFigures = filterValidFigures(canvas, figures);

    validFigures.forEach((figure, index) => {
        const figureArray = getFigureArray(figure.subcroppedFigure, originalCanvas);
        figuresInfo.push(figureArray);

        renderFigure(container, figureArray, index, colors[index]);

        // Add debug image of the intermediary cropped figure
        if (isDebugMode()) {
            const debugImg = document.createElement('img');
            debugImg.src = figure.subcroppedFigure.toDataURL();
            debugImg.alt = `Debug Figure ${index + 1}`;
            debugImg.className = 'max-w-full h-auto mt-2';
            container.appendChild(debugImg);

            // Add visual representation of figure detection
            const debugCanvas = document.createElement('canvas');
            debugCanvas.width = figure.subcroppedFigure.width;
            debugCanvas.height = figure.subcroppedFigure.height;
            const ctx = debugCanvas.getContext('2d');
            ctx.drawImage(figure.subcroppedFigure, 0, 0);

            // Draw grid
            ctx.strokeStyle = 'rgba(255, 0, 0, 0.5)';
            ctx.lineWidth = 1;
            const cellSize = Math.min(debugCanvas.width, debugCanvas.height) / Math.max(figureArray.length, figureArray[0].length);
            for (let i = 0; i <= figureArray.length; i++) {
                ctx.beginPath();
                ctx.moveTo(0, i * cellSize);
                ctx.lineTo(debugCanvas.width, i * cellSize);
                ctx.stroke();
            }
            for (let j = 0; j <= figureArray[0].length; j++) {
                ctx.beginPath();
                ctx.moveTo(j * cellSize, 0);
                ctx.lineTo(j * cellSize, debugCanvas.height);
                ctx.stroke();
            }

            // Highlight detected cells
            ctx.fillStyle = 'rgba(0, 255, 0, 0.3)';
            for (let i = 0; i < figureArray.length; i++) {
                for (let j = 0; j < figureArray[i].length; j++) {
                    if (figureArray[i][j] === 1) {
                        ctx.fillRect(j * cellSize, i * cellSize, cellSize, cellSize);
                    }
                }
            }

            const debugVisualImg = document.createElement('img');
            debugVisualImg.src = debugCanvas.toDataURL();
            debugVisualImg.alt = `Debug Visual Figure ${index + 1}`;
            debugVisualImg.className = 'max-w-full h-auto mt-2';
            container.appendChild(debugVisualImg);
        }
    });

    return figuresInfo;
}

function filterValidFigures(canvas, figures) {
    return figures.map(figure => {
        const figureCanvas = cropCanvasToRegion(canvas, figure.startX, 0, figure.endX - figure.startX, canvas.height);
        const subcroppedFigure = subcropFigure(figureCanvas);

        const ctx = subcroppedFigure.getContext('2d');
        const centerX = Math.floor(subcroppedFigure.width / 2);
        const centerY = Math.floor(subcroppedFigure.height / 2);
        const centerPixel = ctx.getImageData(centerX, centerY, 1, 1).data;
        const isWhite = centerPixel[0] < 10 && centerPixel[1] < 10 && centerPixel[2] < 10;

        return { subcroppedFigure, isValid: !isWhite };
    }).filter(figure => figure.isValid);
}

function renderFigure(container, figureArray, index, color) {
    const figureDiv = document.createElement('div');
    figureDiv.className = 'flex flex-col items-center mb-8';
    figureDiv.innerHTML = `
        <h3 class="text-lg font-semibold mb-2">Figure ${index + 1}</h3>
        <div class="grid" style="grid-template-columns: repeat(${figureArray[0].length}, 1fr);">
            ${figureArray.flat().map(cell => `
                <div class="w-8 h-8 ${cell ? `bg-${color}-500` : 'bg-white'} border border-white"></div>
            `).join('')}
        </div>
    `;

    container.appendChild(figureDiv);
}

function subcropFigure(canvas) {
    const ctx = canvas.getContext('2d');
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const data = imageData.data;
    const backgroundColor = [49, 72, 131]; // #314883
    const tolerance = 60;

    let startX = canvas.width, startY = canvas.height, endX = 0, endY = 0;

    for (let y = 0; y < canvas.height; y++) {
        for (let x = 0; x < canvas.width; x++) {
            const i = (y * canvas.width + x) * 4;
            const [r, g, b] = [data[i], data[i + 1], data[i + 2]];

            if (!isColorMatch([r, g, b], backgroundColor, tolerance)) {
                startX = Math.min(startX, x);
                startY = Math.min(startY, y);
                endX = Math.max(endX, x);
                endY = Math.max(endY, y);
            }
        }
    }

    // Add a small padding
    const padding = 5;
    startX = Math.max(0, startX - padding);
    startY = Math.max(0, startY - padding);
    endX = Math.min(canvas.width, endX + padding);
    endY = Math.min(canvas.height, endY + padding);

    return cropCanvasToRegion(canvas, startX, startY, endX - startX, endY - startY);
}

function getFigureArray(canvas, originalCanvas) {
    const ctx = canvas.getContext('2d');
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const data = imageData.data;
    const backgroundColor = [49, 72, 131]; // #314883
    const tolerance = 30;

    console.log(originalCanvas.width, originalCanvas.height);

    const margin = Math.floor(originalCanvas.height * 0.0007153075823); // 2px margin on top, bottom, left, and right
    const gap = Math.floor(originalCanvas.height * 0.0003949447077); // 1px gap between squares
    let squareSize;

    if(isTablet(originalCanvas)) {
        squareSize = Math.floor(originalCanvas.height * 0.02567095851); // Approximate size of each square
    } else {
        squareSize = Math.floor(originalCanvas.height * 0.02067095851); // Approximate size of each square
    }
    const totalSquareSize = squareSize + gap; // Total size including gap

    const cols = Math.floor((canvas.width - 2 * margin + gap) / totalSquareSize);
    const rows = Math.floor((canvas.height - 2 * margin + gap) / totalSquareSize);
    const figureArray = [];

    for (let y = 0; y < rows; y++) {
        const row = [];
        for (let x = 0; x < cols; x++) {
            const centerX = margin + x * totalSquareSize + Math.floor(squareSize / 1.1);
            const centerY = margin + y * totalSquareSize + Math.floor(squareSize / 1.1);
            const i = (centerY * canvas.width + centerX) * 4;
            const [r, g, b] = [data[i], data[i + 1], data[i + 2]];

            if (!isColorMatch([r, g, b], backgroundColor, tolerance)) {
                row.push(1);
            } else {
                row.push(0);
            }
        }
        figureArray.push(row);
    }

    return figureArray;
}

function isDebugMode() {
    const urlParams = new URLSearchParams(window.location.search);
    const isDebugMode = urlParams.get('debug') === 'true';

    if(isDebugMode) {
        console.log('---- DEBUG MODE ----   ');
    }

    return urlParams.get('debug') === 'true';
}

function displayDebugInfo(fullCanvas, croppedCanvas) {
    const debugContainer = document.getElementById('debug-container');

    if (!debugContainer) {
        const debugContainer = document.createElement('div');
        debugContainer.id = 'debug-container';
        debugContainer.className = 'mt-8 p-4 bg-white rounded-lg shadow-md';
        document.body.appendChild(debugContainer);
    }

    debugContainer.innerHTML = `
        <h2 class="text-xl font-bold mb-4">Debug Information</h2>
        <div class="flex flex-col space-y-4">
            <div>
                <h3 class="text-lg font-semibold mb-2">Full Image</h3>
                <img src="${fullCanvas.toDataURL()}" alt="Full Image" class="max-w-full h-auto">
            </div>
            <div>
                <h3 class="text-lg font-semibold mb-2">Cropped Grid</h3>
                <img src="${croppedCanvas.toDataURL()}" alt="Cropped Grid" class="max-w-full h-auto">
            </div>
        </div>
    `;

    debugContainer.classList.remove('hidden');

}

function handleExampleImageClick() {
    if (window.sa_event) {
        window.sa_event('example_attempt');
    }

    loadImage('samples/1x4.PNG', function() {
        const canvas = document.createElement('canvas');
        canvas.width = this.width;
        canvas.height = this.height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(this, 0, 0);

        // Convert canvas to blob
        canvas.toBlob(function(blob) {
            const file = new File([blob], '1x4.PNG', { type: 'image/png' });
            const dataTransfer = new DataTransfer();
            dataTransfer.items.add(file);

            const fileInput = document.getElementById('dropzone-file');
            fileInput.files = dataTransfer.files;

            // Trigger the change event manually
            const changeEvent = new Event('change', { bubbles: true });
            fileInput.dispatchEvent(changeEvent);

            // Hide the example section
            const exampleSection = document.getElementById('example-image').closest('.bg-white');
            exampleSection.classList.add('hidden');
        }, 'image/png');
    });
}

function loadImage(src, callback) {
    var img = new Image();

    img.onload = callback;
    img.setAttribute('crossorigin', 'anonymous');

    img.src = src;

    return img;
}

function reportIssue(imageDataUrl) {
    if (window.sa_event) {
        window.sa_event('downvote');
    }
    const reportIssueButton = document.getElementById('report-issue');
    reportIssueButton.innerHTML = '<div class="spinner-border animate-spin inline-block w-4 h-4 border-2 rounded-full"></div>';
    reportIssueButton.disabled = true;

    const feedbackText = document.getElementById('feedback-text').value;

    const feedbackTextContainer = document.getElementById('feedback-text');
    feedbackTextContainer.classList.add('hidden');

    // Convert base64 to blob
    fetch(imageDataUrl)
        .then(res => res.blob())
        .then(blob => {
            const formData = new FormData();
            formData.append('file', blob, 'screenshot.png');
            formData.append('text', feedbackText);

            fetch('https://blockblastsolver.fly.dev/upload', {
                method: 'POST',
                body: formData
            })
            .then(response => response.json())
            .then(data => {
                console.log('Success:', data);
                reportIssueButton.innerHTML = 'Thank you!';
            })
            .catch((error) => {
                console.error('Error:', error);
                reportIssueButton.innerHTML = 'Thank you!';
            });
        });

}
