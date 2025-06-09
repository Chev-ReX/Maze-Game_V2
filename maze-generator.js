class MazeGenerator {
    constructor() {
        this.directions = [
            { x: 0, y: -2 }, // Up
            { x: 2, y: 0 },  // Right
            { x: 0, y: 2 },  // Down
            { x: -2, y: 0 }  // Left
        ];
    }

    generate(level) {
        // Maze dimensions increase with level
        const baseWidth = 15;
        const baseHeight = 11;
        const width = baseWidth + Math.floor(level / 2) * 2;
        const height = baseHeight + Math.floor(level / 3) * 2;
        
        // Ensure odd dimensions for proper maze generation
        const mazeWidth = width % 2 === 0 ? width + 1 : width;
        const mazeHeight = height % 2 === 0 ? height + 1 : height;

        // Initialize maze with all walls
        const maze = [];
        for (let y = 0; y < mazeHeight; y++) {
            const row = [];
            for (let x = 0; x < mazeWidth; x++) {
                row.push(1); // 1 = wall, 0 = path
            }
            maze.push(row);
        }

        // Generate maze using recursive backtracking
        this.generatePaths(maze, 1, 1, mazeWidth, mazeHeight);

        // Add complexity based on level
        this.addComplexity(maze, level, mazeWidth, mazeHeight);

        // Ensure start and end are accessible
        maze[1][1] = 0; // Start position
        maze[mazeHeight - 2][mazeWidth - 2] = 0; // End position

        // Create path to ensure end is reachable
        this.ensurePathToEnd(maze, mazeWidth, mazeHeight);

        return {
            maze: maze,
            width: mazeWidth,
            height: mazeHeight,
            startX: 1,
            startY: 1,
            endX: mazeWidth - 2,
            endY: mazeHeight - 2
        };
    }

    generatePaths(maze, startX, startY, width, height) {
        const stack = [{ x: startX, y: startY }];
        maze[startY][startX] = 0; // Mark starting cell as path

        while (stack.length > 0) {
            const current = stack[stack.length - 1];
            const neighbors = this.getUnvisitedNeighbors(maze, current.x, current.y, width, height);

            if (neighbors.length > 0) {
                // Choose random neighbor
                const neighbor = neighbors[Math.floor(Math.random() * neighbors.length)];
                
                // Remove wall between current and chosen neighbor
                const wallX = current.x + (neighbor.x - current.x) / 2;
                const wallY = current.y + (neighbor.y - current.y) / 2;
                
                maze[neighbor.y][neighbor.x] = 0;
                maze[wallY][wallX] = 0;
                
                stack.push(neighbor);
            } else {
                stack.pop();
            }
        }
    }

    getUnvisitedNeighbors(maze, x, y, width, height) {
        const neighbors = [];
        
        for (const dir of this.directions) {
            const newX = x + dir.x;
            const newY = y + dir.y;
            
            if (newX > 0 && newX < width - 1 && 
                newY > 0 && newY < height - 1 && 
                maze[newY][newX] === 1) {
                neighbors.push({ x: newX, y: newY });
            }
        }
        
        return neighbors;
    }

    addComplexity(maze, level, width, height) {
        // Add extra paths to create loops and multiple routes
        const extraPaths = Math.min(level * 2, 15);
        
        for (let i = 0; i < extraPaths; i++) {
            let attempts = 0;
            while (attempts < 50) {
                const x = 1 + Math.floor(Math.random() * (width - 2));
                const y = 1 + Math.floor(Math.random() * (height - 2));
                
                if (maze[y][x] === 1 && this.canRemoveWall(maze, x, y, width, height)) {
                    maze[y][x] = 0;
                    break;
                }
                attempts++;
            }
        }

        // Add dead ends for higher levels
        if (level > 2) {
            this.addDeadEnds(maze, level, width, height);
        }
    }

    canRemoveWall(maze, x, y, width, height) {
        // Check if removing this wall creates a meaningful path
        let pathNeighbors = 0;
        const neighbors = [
            { x: x - 1, y: y },
            { x: x + 1, y: y },
            { x: x, y: y - 1 },
            { x: x, y: y + 1 }
        ];

        for (const neighbor of neighbors) {
            if (neighbor.x >= 0 && neighbor.x < width && 
                neighbor.y >= 0 && neighbor.y < height && 
                maze[neighbor.y][neighbor.x] === 0) {
                pathNeighbors++;
            }
        }

        // Only remove wall if it connects exactly 2 paths (creates a connection)
        return pathNeighbors === 2;
    }

    addDeadEnds(maze, level, width, height) {
        const deadEndCount = Math.floor(level / 2);
        
        for (let i = 0; i < deadEndCount; i++) {
            // Find a path cell that can become a dead end
            for (let attempts = 0; attempts < 30; attempts++) {
                const x = 2 + Math.floor(Math.random() * (width - 4));
                const y = 2 + Math.floor(Math.random() * (height - 4));
                
                if (maze[y][x] === 0 && this.canCreateDeadEnd(maze, x, y, width, height)) {
                    this.createDeadEndBranch(maze, x, y, width, height);
                    break;
                }
            }
        }
    }

    canCreateDeadEnd(maze, x, y, width, height) {
        // Check if we can create a dead end branch from this position
        const directions = [
            { x: 0, y: -1 }, { x: 1, y: 0 }, { x: 0, y: 1 }, { x: -1, y: 0 }
        ];

        for (const dir of directions) {
            const wallX = x + dir.x;
            const wallY = y + dir.y;
            const endX = x + dir.x * 2;
            const endY = y + dir.y * 2;

            if (endX > 0 && endX < width - 1 && 
                endY > 0 && endY < height - 1 && 
                maze[wallY][wallX] === 1 && 
                maze[endY][endX] === 1) {
                return true;
            }
        }
        return false;
    }

    createDeadEndBranch(maze, x, y, width, height) {
        const directions = [
            { x: 0, y: -1 }, { x: 1, y: 0 }, { x: 0, y: 1 }, { x: -1, y: 0 }
        ];
        
        // Shuffle directions for randomness
        const shuffled = directions.sort(() => Math.random() - 0.5);
        
        for (const dir of shuffled) {
            const wallX = x + dir.x;
            const wallY = y + dir.y;
            const endX = x + dir.x * 2;
            const endY = y + dir.y * 2;

            if (endX > 0 && endX < width - 1 && 
                endY > 0 && endY < height - 1 && 
                maze[wallY][wallX] === 1 && 
                maze[endY][endX] === 1) {
                
                maze[wallY][wallX] = 0;
                maze[endY][endX] = 0;
                
                // 30% chance to extend the dead end further
                if (Math.random() < 0.3) {
                    this.createDeadEndBranch(maze, endX, endY, width, height);
                }
                break;
            }
        }
    }

    ensurePathToEnd(maze, width, height) {
        // Use simple pathfinding to ensure end is reachable
        const visited = new Set();
        const queue = [{ x: 1, y: 1 }];
        visited.add('1,1');
        
        const directions = [
            { x: 0, y: -1 }, { x: 1, y: 0 }, { x: 0, y: 1 }, { x: -1, y: 0 }
        ];

        while (queue.length > 0) {
            const current = queue.shift();
            
            if (current.x === width - 2 && current.y === height - 2) {
                return; // Path exists
            }

            for (const dir of directions) {
                const newX = current.x + dir.x;
                const newY = current.y + dir.y;
                const key = `${newX},${newY}`;

                if (newX >= 0 && newX < width && 
                    newY >= 0 && newY < height && 
                    maze[newY][newX] === 0 && 
                    !visited.has(key)) {
                    
                    visited.add(key);
                    queue.push({ x: newX, y: newY });
                }
            }
        }

        // If no path exists, create one
        this.createSimplePath(maze, width, height);
    }

    createSimplePath(maze, width, height) {
        // Create a simple L-shaped path to ensure connectivity
        let x = 1, y = 1;
        
        // Move right
        while (x < width - 2) {
            maze[y][x] = 0;
            x++;
        }
        
        // Move down
        while (y < height - 2) {
            maze[y][x] = 0;
            y++;
        }
        
        maze[height - 2][width - 2] = 0; // Ensure end is clear
    }

    findPowerUpPositions(mazeData, count) {
        const positions = [];
        const { maze, width, height } = mazeData;
        
        // Find all valid positions (paths that are not start/end)
        const validPositions = [];
        for (let y = 1; y < height - 1; y++) {
            for (let x = 1; x < width - 1; x++) {
                if (maze[y][x] === 0 && 
                    !(x === 1 && y === 1) && 
                    !(x === width - 2 && y === height - 2)) {
                    validPositions.push({ x, y });
                }
            }
        }

        // Select random positions
        for (let i = 0; i < Math.min(count, validPositions.length); i++) {
            const randomIndex = Math.floor(Math.random() * validPositions.length);
            const pos = validPositions.splice(randomIndex, 1)[0];
            positions.push(pos);
        }

        return positions;
    }

    findEnemyPositions(mazeData, count) {
        const positions = [];
        const { maze, width, height } = mazeData;
        
        // Find positions away from start and end
        const validPositions = [];
        for (let y = 2; y < height - 2; y++) {
            for (let x = 2; x < width - 2; x++) {
                if (maze[y][x] === 0) {
                    const distFromStart = Math.abs(x - 1) + Math.abs(y - 1);
                    const distFromEnd = Math.abs(x - (width - 2)) + Math.abs(y - (height - 2));
                    
                    // Only place enemies with some distance from start and end
                    if (distFromStart > 3 && distFromEnd > 3) {
                        validPositions.push({ x, y });
                    }
                }
            }
        }

        // Select random positions
        for (let i = 0; i < Math.min(count, validPositions.length); i++) {
            const randomIndex = Math.floor(Math.random() * validPositions.length);
            const pos = validPositions.splice(randomIndex, 1)[0];
            positions.push(pos);
        }

        return positions;
    }
}
