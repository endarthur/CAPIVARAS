/**
 * Pathfinding - A* and uniform cost search for mesh navigation
 * Extracted from Slope.js - used for intelligent trace digitizing
 */

/**
 * Uniform cost search (Dijkstra's algorithm)
 * Finds shortest path between two vertices on a mesh
 */
export function uniformCostSearch(start, end, graph, graph_index, cost) {
    let came_from = {};
    let cost_so_far = {};
    came_from[start] = null;
    cost_so_far[start] = 0;
    let queue = [[start, 0]];

    while (queue.length > 0) {
        let current = queue.shift()[0];

        if (current === end) {
            break;
        }

        let graph_start = graph_index[current];
        let graph_end = graph_index[current + 1];
        for (let i = graph_start; i < graph_end; i++) {
            let next = graph[i];
            let new_cost = cost_so_far[current] + cost[i];
            if (!(next in cost_so_far) || new_cost < cost_so_far[next]) {
                cost_so_far[next] = new_cost;
                let priority = new_cost;
                //queue.push([next, priority]);
                let j = 0;
                while (j < queue.length && priority > queue[j][1]) {
                    j++;
                }
                queue.splice(j, 0, [next, priority]);
                came_from[next] = current;
            }
        }
    }
    return came_from;
}

/**
 * A* search - pathfinding with heuristic
 * Faster than uniform cost search when a good heuristic is available
 */
export function aStarSearch(start, end, graph, graph_index, cost, heuristic) {
    let came_from = {};
    let cost_so_far = {};
    came_from[start] = null;
    cost_so_far[start] = 0;
    let queue = [[start, 0]];

    while (queue.length > 0) {
        let current = queue.shift()[0];

        if (current === end) {
            break;
        }

        let graph_start = graph_index[current];
        let graph_end = graph_index[current + 1];
        for (let i = graph_start; i < graph_end; i++) {
            let next = graph[i];
            let new_cost = cost_so_far[current] + cost[i];
            if (!(next in cost_so_far) || new_cost < cost_so_far[next]) {
                cost_so_far[next] = new_cost;
                let priority = new_cost + heuristic(end, next);
                let j = 0;
                while (j < queue.length && priority > queue[j][1]) {
                    j++;
                }
                queue.splice(j, 0, [next, priority]);
                came_from[next] = current;
            }
        }
    }
    return came_from;
}

/**
 * Rebuild path from came_from dictionary
 * Traces back from end to start
 */
export function rebuildPath(start, end, came_from) {
    let current = end;
    let path = [current];
    while (current !== start) {
        current = came_from[current];
        if (current === undefined) {
            return [];
        }
        path.push(current);
    }
    path.reverse();
    return path;
}

export default {
    uniformCostSearch,
    aStarSearch,
    rebuildPath
};
