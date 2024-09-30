function solve(gridInfo, figuresInfo) {
  clearPreviousSolution();
  let figuresOutput = "";
  figuresInfo.forEach( (figure, index) => {
      const paddedFigure = padFigureTo5x5(figure);
      figuresOutput += `Figure ${index + 1}: ${paddedFigure.map(row => row.join("")).join("")} `
  }
  );
  console.log(figuresOutput.trim());
  const allSolutions = findAllSolutions(gridInfo, figuresInfo);
  const bestSolution = getBestSolution(allSolutions);
  if (bestSolution) {
      const optimizedSolution = optimizeLastPlacement(bestSolution);
      displaySolutionStepByStep(optimizedSolution);
      const movementCount = optimizedSolution.placements.length;
      const totalLines = optimizedSolution.completedLines.length;
      console.log(`SolutionGrid:${optimizedSolution.finalGrid.flat().join(" ")}`);
      console.log(`CompletedLines:${optimizedSolution.completedLines.length}`);
      console.log(`placementsCount:${optimizedSolution.placements.length}`);
      document.getElementById("next-turn-message").classList.remove("hidden")
  } else {
      const partialSolution = findPartialSolution(gridInfo, figuresInfo);
      if (partialSolution && partialSolution.placements.length > 0) {
          displaySolutionStepByStep(partialSolution);
          console.log(`PartialSolutionGrid:${partialSolution.finalGrid.flat().join(" ")}`);
          console.log(`CompletedLines:${partialSolution.completedLines.length}`);
          console.log(`placementsCount:${partialSolution.placements.length}`)
      } else {
          console.log("SolutionGrid:No solution found");
          console.log("Solution:No solution found")
      }
      displayCookedMessage()
  }
}
function findAllSolutions(grid, figures, placements=[], completedLines=[], steps=[]) {
  if (figures.length === 0) {
      return [{
          finalGrid: grid,
          placements: placements,
          completedLines: completedLines,
          steps: steps
      }]
  }
  const currentFigure = figures[0];
  const remainingFigures = figures.slice(1);
  let solutions = [];
  for (let i = 0; i < 8; i++) {
      for (let j = 0; j < 8; j++) {
          if (canPlaceFigure(grid, currentFigure, i, j)) {
              const newGrid = placeFigure(grid, currentFigure, i, j);
              const newCompletedLines = getCompletedLines(newGrid);
              const newPlacements = [...placements, {
                  placement: getFigurePlacement(currentFigure, i, j),
                  figure: currentFigure
              }];
              let updatedGrid = newGrid;
              newCompletedLines.forEach(line => {
                  if (line.type === "horizontal") {
                      updatedGrid[line.index].fill(0)
                  } else if (line.type === "vertical") {
                      for (let k = 0; k < 8; k++) {
                          updatedGrid[k][line.index] = 0
                      }
                  }
              }
              );
              const newStep = {
                  grid: newGrid,
                  updatedGrid: updatedGrid,
                  placement: newPlacements[newPlacements.length - 1],
                  completedLines: newCompletedLines
              };
              const subSolutions = findAllSolutions(updatedGrid, remainingFigures, newPlacements, [...completedLines, ...newCompletedLines], [...steps, newStep]);
              solutions = solutions.concat(subSolutions)
          }
      }
  }
  return solutions
}
function findPartialSolution(grid, figures, placements=[], completedLines=[], steps=[]) {
  let partialSolution = {
      finalGrid: grid,
      placements: [],
      completedLines: [],
      steps: []
  };
  for (let figureIndex = 0; figureIndex < figures.length; figureIndex++) {
      const currentFigure = figures[figureIndex];
      let placed = false;
      for (let i = 0; i < 8 && !placed; i++) {
          for (let j = 0; j < 8 && !placed; j++) {
              if (canPlaceFigure(partialSolution.finalGrid, currentFigure, i, j)) {
                  const newGrid = placeFigure(partialSolution.finalGrid, currentFigure, i, j);
                  const newCompletedLines = getCompletedLines(newGrid);
                  const newPlacement = {
                      placement: getFigurePlacement(currentFigure, i, j),
                      figure: currentFigure
                  };
                  let updatedGrid = newGrid;
                  newCompletedLines.forEach(line => {
                      if (line.type === "horizontal") {
                          updatedGrid[line.index].fill(0)
                      } else if (line.type === "vertical") {
                          for (let k = 0; k < 8; k++) {
                              updatedGrid[k][line.index] = 0
                          }
                      }
                  }
                  );
                  const newStep = {
                      grid: newGrid,
                      updatedGrid: updatedGrid,
                      placement: newPlacement,
                      completedLines: newCompletedLines
                  };
                  partialSolution.finalGrid = updatedGrid;
                  partialSolution.placements.push(newPlacement);
                  partialSolution.completedLines = partialSolution.completedLines.concat(newCompletedLines);
                  partialSolution.steps.push(newStep);
                  placed = true
              }
          }
      }
  }
  return partialSolution
}
function getBestSolution(solutions) {
  if (solutions.length === 0)
      return null;
  return solutions.reduce( (best, current) => {
      if (current.completedLines.length > best.completedLines.length) {
          return current
      } else if (current.completedLines.length === best.completedLines.length) {
          if (current.placements.length < best.placements.length) {
              return current
          } else if (current.placements.length === best.placements.length) {
              const currentEarliestLine = current.steps.findIndex(step => step.completedLines.length > 0);
              const bestEarliestLine = best.steps.findIndex(step => step.completedLines.length > 0);
              return currentEarliestLine < bestEarliestLine ? current : best
          }
      }
      return best
  }
  )
}
function optimizeLastPlacement(solution) {
  if (solution.steps.length === 0)
      return solution;
  const lastStep = solution.steps[solution.steps.length - 1];
  if (lastStep.completedLines.length > 0)
      return solution;
  const lastFigure = lastStep.placement.figure;
  const grid = solution.steps[solution.steps.length - 2]?.updatedGrid || solution.finalGrid;
  let bestPlacement = null;
  let bestDistance = Infinity;
  for (let i = 0; i < 8; i++) {
      for (let j = 0; j < 8; j++) {
          if (canPlaceFigure(grid, lastFigure, i, j)) {
              const distance = Math.sqrt(Math.pow(i - 3.5, 2) + Math.pow(j - 3.5, 2));
              if (distance < bestDistance) {
                  bestDistance = distance;
                  bestPlacement = {
                      row: i,
                      col: j
                  }
              }
          }
      }
  }
  if (bestPlacement) {
      const newGrid = placeFigure(grid, lastFigure, bestPlacement.row, bestPlacement.col);
      const newPlacement = {
          placement: getFigurePlacement(lastFigure, bestPlacement.row, bestPlacement.col),
          figure: lastFigure
      };
      solution.steps[solution.steps.length - 1] = {
          ...lastStep,
          grid: newGrid,
          updatedGrid: newGrid,
          placement: newPlacement
      };
      solution.finalGrid = newGrid;
      solution.placements[solution.placements.length - 1] = newPlacement
  }
  return solution
}
function padFigureTo5x5(figure) {
  const paddedFigure = Array(5).fill().map( () => Array(5).fill(0));
  for (let i = 0; i < figure.length; i++) {
      for (let j = 0; j < figure[i].length; j++) {
          paddedFigure[i][j] = figure[i][j]
      }
  }
  return paddedFigure
}
function canPlaceFigure(grid, figure, row, col) {
  for (let i = 0; i < figure.length; i++) {
      for (let j = 0; j < figure[0].length; j++) {
          if (figure[i][j] === 1) {
              if (row + i >= 8 || col + j >= 8 || grid[row + i][col + j] !== 0) {
                  return false
              }
          }
      }
  }
  return true
}
function placeFigure(grid, figure, row, col) {
  const newGrid = grid.map(row => [...row]);
  for (let i = 0; i < figure.length; i++) {
      for (let j = 0; j < figure[0].length; j++) {
          if (figure[i][j] === 1) {
              newGrid[row + i][col + j] = 1
          }
      }
  }
  return newGrid
}
function getFigurePlacement(figure, row, col) {
  const placement = [];
  for (let i = 0; i < figure.length; i++) {
      for (let j = 0; j < figure[0].length; j++) {
          if (figure[i][j] === 1) {
              placement.push([row + i, col + j])
          }
      }
  }
  return placement
}
function getCompletedLines(grid) {
  const completedLines = [];
  for (let i = 0; i < 8; i++) {
      if (grid[i].every(cell => cell === 1)) {
          completedLines.push({
              type: "horizontal",
              index: i
          })
      }
  }
  for (let j = 0; j < 8; j++) {
      if (grid.every(row => row[j] === 1)) {
          completedLines.push({
              type: "vertical",
              index: j
          })
      }
  }
  return completedLines
}
function displaySolutionStepByStep(solution) {
  const stepsContainer = document.getElementById("steps-container");
  const stepsList = document.getElementById("steps-list");
  stepsContainer.classList.remove("hidden");
  stepsList.innerHTML = "";
  const colors = ["bg-blue-500"];
  solution.steps.forEach( (step, index) => {
      const stepElement = document.createElement("div");
      stepElement.className = "p-4 mb-4";
      stepElement.innerHTML = `<h3 class="font-bold mb-2">Step ${index + 1}</h3>`;
      const stepGrid = document.createElement("div");
      stepGrid.className = "grid grid-cols-8 gap-1 sm:gap-2 mb-4";
      for (let i = 0; i < 8; i++) {
          for (let j = 0; j < 8; j++) {
              const cell = document.createElement("div");
              if (step.grid[i][j] === 0 && !step.placement.placement.some( ([x,y]) => x === i && y === j)) {
                  cell.className = "w-6 h-6 sm:w-8 sm:h-8 bg-green-500"
              } else {
                  const isNewlyPlaced = step.placement.placement.some( ([x,y]) => x === i && y === j);
                  cell.className = `w-6 h-6 sm:w-8 sm:h-8 ${isNewlyPlaced ? "bg-blue-500" : "bg-red-500"}`
              }
              step.completedLines.forEach(line => {
                  if (line.type === "horizontal" && i === line.index || line.type === "vertical" && j === line.index) {
                      cell.classList.add("border-4", "border-purple-500")
                  }
              }
              );
              stepGrid.appendChild(cell)
          }
      }
      stepElement.appendChild(stepGrid);
      const infoElement = document.createElement("div");
      infoElement.innerHTML = `
          <p class="font-bold">Completed lines: ${step.completedLines.length}</p>
      `;
      stepElement.appendChild(infoElement);
      stepsList.appendChild(stepElement)
  }
  );
  const totalLines = solution.completedLines.length;
  const totalLinesElement = document.createElement("div");
  totalLinesElement.className = "mt-4 p-4 bg-gray-100 rounded";
  totalLinesElement.innerHTML = `<p class="font-bold text-lg">Total lines completed: ${totalLines}</p>`;
  stepsList.appendChild(totalLinesElement);
  const showStepsButton = document.createElement("button");
  showStepsButton.textContent = "Hide Steps";
  showStepsButton.className = "mt-4 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600";
  showStepsButton.onclick = () => {
      stepsContainer.classList.toggle("hidden");
      showStepsButton.textContent = stepsContainer.classList.contains("hidden") ? "Show Steps" : "Hide Steps"
  }
}
function displayCookedMessage() {
  const cookedMessage = document.getElementById("cooked-message");
  cookedMessage.classList.remove("hidden")
}
function clearPreviousSolution() {
  clearPreviousGrid();
  const stepsContainer = document.getElementById("steps-container");
  stepsContainer.classList.add("hidden");
  document.getElementById("steps-list").innerHTML = "";
  const resultContainer = document.getElementById("result-container");
  if (resultContainer) {
      resultContainer.textContent = "";
      resultContainer.classList.add("hidden")
  }
  document.getElementById("next-turn-message").classList.add("hidden");
  document.getElementById("cooked-message").classList.add("hidden")
}
function clearPreviousGrid() {
  const solutionGrid = document.getElementById("solution-grid");
  solutionGrid.innerHTML = "";
  for (let i = 0; i < 64; i++) {
      const cell = document.createElement("div");
      cell.className = "w-6 h-6 sm:w-8 sm:h-8 bg-green-500";
      solutionGrid.appendChild(cell)
  }
}
