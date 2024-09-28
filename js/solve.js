function solve(gridInfo, figuresInfo) {
  // Log figures for e2e testing
  let figuresOutput = "";
  figuresInfo.forEach((figure, index) => {
    const paddedFigure = padFigureTo5x5(figure);
    figuresOutput += `Figure ${index + 1}: ${paddedFigure.map(row => row.join('')).join('')} `;
  });
  console.log(figuresOutput.trim());

  let solution = findBestSolution(gridInfo, figuresInfo);

  // If no lines to clear, place the figures in a way to minimize gaps
  if (!solution) {
    solution = findBestFitWithoutClearing(gridInfo, figuresInfo);
  }

  if (solution) {
    displaySolution(solution.grid, solution.placements, solution.completedLines);
    const movementCount = solution.placements.length;
    displayResult(`You can get ${solution.completedLines.length} line${solution.completedLines.length !== 1 ? 's' : ''} in ${movementCount} movement${movementCount !== 1 ? 's' : ''}`);
    console.log(`SolutionGrid:${solution.grid.flat().join(" ")}`);
  } else {
    console.log("SolutionGrid:No solution found");
    clearPreviousGrid();
    displayResult("No lines possible with current figures");
  }
}

function padFigureTo5x5(figure) {
  const paddedFigure = Array(5).fill().map(() => Array(5).fill(0));
  for (let i = 0; i < figure.length; i++) {
    for (let j = 0; j < figure[i].length; j++) {
      paddedFigure[i][j] = figure[i][j];
    }
  }
  return paddedFigure;
}

function findBestSolution(grid, figures) {
  let bestSolution = null;

  // Try to find the best solution considering all figures together
  const multiFigureSolution = findSolutionWithMultipleFigures(grid, figures);
  if (multiFigureSolution) {
    bestSolution = multiFigureSolution;
  }

  return bestSolution;
}

function findSolutionWithMultipleFigures(grid, figures) {
  const positions = getSortedPositions(grid);
  const maxMovements = Math.min(3, figures.length);

  let bestSolution = null;

  for (let movements = 1; movements <= maxMovements; movements++) {
    const result = findSolutionWithMovements(grid, figures, movements, positions);
    if (result && (!bestSolution || result.completedLines.length > bestSolution.completedLines.length)) {
      bestSolution = result;
    }
  }

  return bestSolution;
}

function findSolutionWithMovements(grid, figures, movements, positions, currentPlacements = [], usedFigures = []) {
  if (movements === 0) {
    const completedLines = getCompletedLines(grid);
    if (completedLines.length > 0) {
      return { grid, placements: currentPlacements, completedLines };
    }
    return null;
  }

  let bestResult = null;

  for (const [i, j] of positions) {
    for (let figureIndex = 0; figureIndex < figures.length; figureIndex++) {
      if (usedFigures.includes(figureIndex)) continue;

      const figure = figures[figureIndex];
      if (canPlaceFigure(grid, figure, i, j)) {
        const newGrid = placeFigure(grid, figure, i, j);
        const placement = getFigurePlacement(figure, i, j);
        const result = findSolutionWithMovements(
          newGrid,
          figures,
          movements - 1,
          positions,
          [...currentPlacements, placement],
          [...usedFigures, figureIndex]
        );
        if (result && (!bestResult || result.completedLines.length > bestResult.completedLines.length)) {
          bestResult = result;
        }
        // Backtrack
        grid = removeFigure(grid, figure, i, j);
      }
    }
  }
  return bestResult;
}

function findBestFitWithoutClearing(grid, figures) {
  let bestFit = null;
  let bestScore = -Infinity;

  const positions = getSortedPositions(grid);

  for (let figureIndex = 0; figureIndex < figures.length; figureIndex++) {
    const figure = figures[figureIndex];

    for (const [i, j] of positions) {
      if (canPlaceFigure(grid, figure, i, j)) {
        const newGrid = placeFigure(grid, figure, i, j);
        const proximityScore = calculateProximityScore(newGrid);

        if (proximityScore > bestScore) {
          bestScore = proximityScore;
          bestFit = {
            grid: newGrid,
            placements: [getFigurePlacement(figure, i, j)],
            completedLines: []
          };
        }
      }
    }
  }

  return bestFit;
}

function calculateProximityScore(grid) {
  let score = 0;

  for (let i = 0; i < 8; i++) {
    for (let j = 0; j < 8; j++) {
      if (grid[i][j] === 1) {
        score += countAdjacentBlocks(grid, i, j);
      }
    }
  }

  return score;
}

function countAdjacentBlocks(grid, row, col) {
  let count = 0;

  // Check the four adjacent cells (up, down, left, right)
  if (row > 0 && grid[row - 1][col] === 1) count++;        // Up
  if (row < 7 && grid[row + 1][col] === 1) count++;        // Down
  if (col > 0 && grid[row][col - 1] === 1) count++;        // Left
  if (col < 7 && grid[row][col + 1] === 1) count++;        // Right

  return count;
}

function getCompletedLines(grid) {
  const completedLines = [];

  // Check horizontal lines
  for (let i = 0; i < 8; i++) {
    if (grid[i].every(cell => cell === 1)) {
      completedLines.push({ type: 'horizontal', index: i });
    }
  }

  // Check vertical lines
  for (let j = 0; j < 8; j++) {
    if (grid.every(row => row[j] === 1)) {
      completedLines.push({ type: 'vertical', index: j });
    }
  }

  return completedLines;
}

function hasCompleteLine(grid) {
  return getCompletedLines(grid).length > 0;
}

function getSortedPositions(grid) {
  const positions = [];
  for (let i = 0; i < 8; i++) {
    for (let j = 0; j < 8; j++) {
      positions.push([i, j]);
    }
  }

  // Sort positions based on their potential to form straight lines
  return positions.sort((a, b) => {
    const [aRow, aCol] = a;
    const [bRow, bCol] = b;
    const aScore = getLineScore(grid, aRow, aCol);
    const bScore = getLineScore(grid, bRow, bCol);
    return bScore - aScore; // Higher scores first
  });
}

function getLineScore(grid, row, col) {
  let horizontalScore = 0;
  let verticalScore = 0;

  // Check horizontal line
  for (let j = 0; j < 8; j++) {
    if (grid[row][j] === 1) horizontalScore++;
  }

  // Check vertical line
  for (let i = 0; i < 8; i++) {
    if (grid[i][col] === 1) verticalScore++;
  }

  return Math.max(horizontalScore, verticalScore);
}

function canPlaceFigure(grid, figure, row, col) {
  for (let i = 0; i < figure.length; i++) {
    for (let j = 0; j < figure[0].length; j++) {
      if (figure[i][j] === 1) {
        if (row + i >= 8 || col + j >= 8 || grid[row + i][col + j] !== 0) {
          return false;
        }
      }
    }
  }
  return true;
}

function placeFigure(grid, figure, row, col) {
  const newGrid = grid.map(row => [...row]);
  for (let i = 0; i < figure.length; i++) {
    for (let j = 0; j < figure[0].length; j++) {
      if (figure[i][j] === 1) {
        newGrid[row + i][col + j] = 1;
      }
    }
  }
  return newGrid;
}

function removeFigure(grid, figure, row, col) {
  const newGrid = grid.map(row => [...row]);
  for (let i = 0; i < figure.length; i++) {
    for (let j = 0; j < figure[0].length; j++) {
      if (figure[i][j] === 1) {
        newGrid[row + i][col + j] = 0;
      }
    }
  }
  return newGrid;
}

function getFigurePlacement(figure, row, col) {
  const placement = [];
  for (let i = 0; i < figure.length; i++) {
    for (let j = 0; j < figure[0].length; j++) {
      if (figure[i][j] === 1) {
        placement.push([row + i, col + j]);
      }
    }
  }
  return placement;
}

function displaySolution(solution, placements, completedLines) {
  const solutionContainer = document.getElementById('solution-container');
  const solutionGrid = document.getElementById('solution-grid');
  const stepsContainer = document.getElementById('steps-container');
  const stepsList = document.getElementById('steps-list');

  solutionContainer.classList.remove('hidden');
  solutionGrid.innerHTML = '';
  stepsContainer.classList.remove('hidden');
  stepsList.innerHTML = '';

  const colors = ['bg-blue-500', 'bg-yellow-500', 'bg-fuchsia-500'];

  for (let i = 0; i < 8; i++) {
    for (let j = 0; j < 8; j++) {
      const cell = document.createElement('div');
      if (solution[i][j] === 0) {
        cell.className = 'w-6 h-6 sm:w-8 sm:h-8 bg-green-500';
      } else {
        const figureIndex = placements.findIndex(placement =>
          placement.some(coord => coord[0] === i && coord[1] === j)
        );
        if (figureIndex !== -1 && figureIndex < 3) {
          cell.className = `w-6 h-6 sm:w-8 sm:h-8 ${colors[figureIndex]}`;
        } else {
          cell.className = 'w-6 h-6 sm:w-8 sm:h-8 bg-red-500';
        }
      }

      // Highlight the completed lines with a border
      completedLines.forEach(line => {
        if (line.type === 'horizontal' && i === line.index) {
          cell.classList.add('border-4', 'border-purple-500');
        } else if (line.type === 'vertical' && j === line.index) {
          cell.classList.add('border-4', 'border-purple-500');
        }
      });

      solutionGrid.appendChild(cell);
    }
  }

  // Display step-by-step instructions
  placements.forEach((placement, index) => {
    const stepElement = document.createElement('div');
    stepElement.className = 'p-4 bg-gray-100 rounded-lg shadow-md';
    stepElement.innerHTML = `<h3 class="font-bold">Step ${index + 1}</h3>`;

    // Create a grid for this step
    const stepGrid = document.createElement('div');
    stepGrid.className = 'grid grid-cols-8 gap-1 sm:gap-2 mb-4';

    // Initialize a new grid state for this step
    let stepGridState = Array.from({ length: 8 }, () => Array(8).fill(0));

    // Place the figure on the step grid
    placement.forEach(([row, col]) => {
      stepGridState[row][col] = 1;
    });

    // Remove completed lines
    const stepCompletedLines = getCompletedLines(stepGridState);
    stepCompletedLines.forEach(line => {
      if (line.type === 'horizontal') {
        stepGridState[line.index].fill(0);
      } else if (line.type === 'vertical') {
        for (let i = 0; i < 8; i++) {
          stepGridState[i][line.index] = 0;
        }
      }
    });

    // Render the step grid
    for (let i = 0; i < 8; i++) {
      for (let j = 0; j < 8; j++) {
        const cell = document.createElement('div');
        if (stepGridState[i][j] === 0) {
          cell.className = 'w-6 h-6 sm:w-8 sm:h-8 bg-green-500';
        } else {
          cell.className = 'w-6 h-6 sm:w-8 sm:h-8 bg-blue-500';
        }
        stepGrid.appendChild(cell);
      }
    }

    stepElement.appendChild(stepGrid);
    stepsList.appendChild(stepElement);
  });
}

function displayResult(message) {
  const resultContainer = document.getElementById('result-container');
  if (!resultContainer) {
    const solutionContainer = document.getElementById('solution-container');
    const newResultContainer = document.createElement('div');
    newResultContainer.id = 'result-container';
    newResultContainer.className = 'mt-4 text-lg font-semibold';
    solutionContainer.appendChild(newResultContainer);
  }

  const resultElement = document.getElementById('result-container');
  resultElement.textContent = message;
  resultElement.classList.remove('hidden');
}

function clearPreviousGrid() {
  const solutionContainer = document.getElementById('solution-container');
  const solutionGrid = document.getElementById('solution-grid');

  solutionContainer.classList.remove('hidden');
  solutionGrid.innerHTML = '';

  for (let i = 0; i < 64; i++) {
    const cell = document.createElement('div');
    cell.className = 'w-6 h-6 sm:w-8 sm:h-8 bg-gray-200';
    solutionGrid.appendChild(cell);
  }
}
