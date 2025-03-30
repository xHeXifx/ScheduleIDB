// Flowchart visualization for drug recipes using D3.js

class DrugMindmap {
    constructor(selector, data) {
        this.selector = selector;
        this.drugsData = data;
        this.width = 1000;
        this.height = 800;
        this.nodeWidth = 180;
        this.nodeHeight = 60;
        this.nodeCornerRadius = 10;
        this.horizontalSpacing = 250;
        this.verticalSpacing = 100;
        this.zoomExtent = [0.1, 3];
        this.selectedDrug = null;
        this.svg = null;
        this.zoomBehavior = null;
        this.nodes = [];
        this.links = [];
        this.colorScale = d3.scaleOrdinal(d3.schemeCategory10);
    }

    // Initialize the flowchart visualization
    init() {
        const container = d3.select(this.selector);
        container.html('');

        // Create SVG element
        this.svg = container.append('svg')
            .attr('width', '100%')
            .attr('height', '100%')
            .attr('viewBox', `0 0 ${this.width} ${this.height}`)
            .attr('class', 'flowchart-svg');

        // Add zoom and pan behavior
        this.zoomBehavior = d3.zoom()
            .scaleExtent(this.zoomExtent)
            .on('zoom', (event) => {
                this.svg.select('g.flowchart-container')
                    .attr('transform', event.transform);
            });

        this.svg.call(this.zoomBehavior);

        // Create a container for the flowchart
        this.svg.append('g')
            .attr('class', 'flowchart-container')
            .attr('transform', 'translate(0,0)');

        // Add legend
        this.createLegend();

        // Add drug selection dropdown
        this.createDrugSelector();
    }

    // Create a legend for the flowchart
    createLegend() {
        const legend = this.svg.append('g')
            .attr('class', 'legend')
            .attr('transform', 'translate(20, 20)');

        const legendItems = [
            { label: 'Drug', color: '#1f77b4', type: 'rect' },
            { label: 'Basic Component', color: '#2ca02c', type: 'rect' },
            { label: 'Complex Component', color: '#ff7f0e', type: 'rect' },
            { label: 'Circular Reference', color: '#d62728', type: 'rect' },
            { label: 'Expanded', color: '#000', type: 'rect', dashed: true },
            { label: 'Collapsed', color: '#000', type: 'rect', dashed: false }
        ];

        legendItems.forEach((item, i) => {
            const g = legend.append('g')
                .attr('transform', `translate(0, ${i * 25})`);

            if (item.type === 'rect') {
                g.append('rect')
                    .attr('width', 16)
                    .attr('height', 12)
                    .attr('rx', 3)
                    .attr('ry', 3)
                    .attr('fill', item.color)
                    .attr('stroke', item.dashed ? '#000' : 'none')
                    .attr('stroke-width', item.dashed ? 2 : 0)
                    .attr('stroke-dasharray', item.dashed ? '2,2' : 'none');
            }

            g.append('text')
                .attr('x', 25)
                .attr('y', 10)
                .text(item.label)
                .attr('class', 'legend-text');
        });
    }

    // Create a dropdown to select drugs
    createDrugSelector() {
        const container = d3.select(this.selector);
        
        const selectorContainer = container.append('div')
            .attr('class', 'drug-selector-container')
            .style('position', 'absolute')
            .style('top', '20px')
            .style('right', '20px')
            .style('background-color', 'var(--card-bg)')
            .style('padding', '10px')
            .style('border-radius', '5px')
            .style('box-shadow', '0 2px 5px rgba(0,0,0,0.2)');

        selectorContainer.append('label')
            .attr('for', 'drug-selector')
            .text('Select Drug: ')
            .style('display', 'block')
            .style('margin-bottom', '5px');

        const selector = selectorContainer.append('select')
            .attr('id', 'drug-selector')
            .attr('class', 'form-select')
            .style('width', '200px');

        // Add options for each drug
        selector.append('option')
            .attr('value', '')
            .text('-- Select a drug --');

        this.drugsData.sort((a, b) => a['Drug Name'].localeCompare(b['Drug Name'])).forEach(drug => {
            selector.append('option')
                .attr('value', drug['Drug Name'])
                .text(drug['Drug Name']);
        });

        // Add event listener
        selector.on('change', (event) => {
            const drugName = event.target.value;
            if (drugName) {
                this.visualizeDrugRecipe(drugName);
            } else {
                this.clearVisualization();
            }
        });

        // Add reset button
        selectorContainer.append('button')
            .attr('id', 'reset-zoom')
            .attr('class', 'btn btn-sm btn-secondary mt-2')
            .style('width', '200px')
            .text('Reset View')
            .on('click', () => {
                this.resetZoom();
            });

        // Add expand/collapse all button
        selectorContainer.append('button')
            .attr('id', 'toggle-expand')
            .attr('class', 'btn btn-sm btn-primary mt-2')
            .style('width', '200px')
            .text('Expand All')
            .on('click', () => {
                this.toggleExpandAll();
            });
    }

    // Reset zoom and pan to default
    resetZoom() {
        this.svg.transition().duration(750).call(
            this.zoomBehavior.transform,
            d3.zoomIdentity.translate(this.width / 2 - this.nodeWidth, 50).scale(0.8)
        );
    }

    // Toggle expand/collapse all nodes
    toggleExpandAll() {
        const button = d3.select('#toggle-expand');
        const isExpanding = button.text() === 'Expand All';
        
        this.nodes.forEach(node => {
            if (node.children && node.children.length > 0) {
                node._children = isExpanding ? null : node.children;
                node.children = isExpanding ? node.children : null;
            }
        });

        button.text(isExpanding ? 'Collapse All' : 'Expand All');
        this.updateVisualization();
    }

    // Clear the visualization
    clearVisualization() {
        this.svg.select('g.flowchart-container').selectAll('*').remove();
        this.nodes = [];
        this.links = [];
        this.selectedDrug = null;
    }

    // Find a drug by name
    findDrugByName(name) {
        return this.drugsData.find(drug => drug['Drug Name'].toLowerCase() === name.toLowerCase());
    }

    // Parse recipe to find components
    parseRecipe(recipeText) {
        if (!recipeText || recipeText === 'NaN') return [];
        
        // Split on '+' which is the common separator in this dataset
        return recipeText.split(/\s*\+\s*/).map(i => i.trim()).filter(i => i);
    }

    // Build the hierarchical data structure for the flowchart
    buildRecipeTree(drugName, visited = new Set()) {
        // Prevent infinite recursion
        if (visited.has(drugName.toLowerCase())) {
            return { 
                name: drugName, 
                components: [], 
                isCircular: true,
                _children: null,
                children: null
            };
        }
        
        visited.add(drugName.toLowerCase());
        
        const drug = this.findDrugByName(drugName);
        if (!drug) {
            return { 
                name: drugName, 
                components: [], 
                isBasic: true,
                _children: null,
                children: null
            };
        }
        
        const components = this.parseRecipe(drug.Recipe);
        const recipeTree = {
            name: drug['Drug Name'],
            recipe: drug.Recipe,
            price: drug.Price,
            effects: drug.Effects,
            addictiveness: drug.Addictiveness,
            components: [],
            children: [],
            _children: null
        };
        
        for (const component of components) {
            const childTree = this.buildRecipeTree(component, new Set(visited));
            recipeTree.components.push(childTree);
            recipeTree.children.push(childTree);
        }
        
        return recipeTree;
    }

    // Assign positions to nodes in a hierarchical tree layout
    assignNodePositions(node, x = this.width / 2, y = 80, level = 0, horizontalOffset = 0) {
        node.x = x + horizontalOffset;
        node.y = y;
        node.level = level;
        
        if (node.children && node.children.length > 0) {
            const childCount = node.children.length;
            const totalWidth = (childCount - 1) * this.horizontalSpacing;
            let startX = x - totalWidth / 2;
            
            node.children.forEach((child, i) => {
                const childX = startX + i * this.horizontalSpacing;
                this.assignNodePositions(child, childX, y + this.verticalSpacing, level + 1);
            });
        }
    }

    // Convert hierarchical data to nodes and links for D3
    processHierarchicalData(root, parent = null, depth = 0) {
        // Add this node
        root.id = this.nodes.length;
        root.depth = depth;
        root.parent = parent;
        this.nodes.push(root);
        
        // Add links to children
        if (root.children) {
            root.children.forEach(child => {
                this.processHierarchicalData(child, root, depth + 1);
                this.links.push({
                    source: root.id,
                    target: child.id
                });
            });
        }
    }

    // Visualize the recipe for a specific drug
    visualizeDrugRecipe(drugName) {
        this.clearVisualization();
        this.selectedDrug = drugName;
        
        // Build the recipe tree
        const recipeTree = this.buildRecipeTree(drugName);
        
        // Process the hierarchical data
        this.processHierarchicalData(recipeTree);
        
        // Assign positions to nodes in a tree layout
        this.assignNodePositions(recipeTree);
        
        // Create the visualization
        this.createVisualization();
        
        // Center the view on the root node
        this.resetZoom();
    }

    // Create the visualization elements
    createVisualization() {
        const container = this.svg.select('g.flowchart-container');
        
        // Create links with arrowheads
        container.selectAll('.link').remove();
        
        // Add arrow marker definitions
        const defs = this.svg.append('defs');
        
        defs.append('marker')
            .attr('id', 'arrowhead')
            .attr('viewBox', '0 -5 10 10')
            .attr('refX', 10)
            .attr('refY', 0)
            .attr('orient', 'auto')
            .attr('markerWidth', 6)
            .attr('markerHeight', 6)
            .attr('xoverflow', 'visible')
            .append('path')
            .attr('d', 'M 0,-5 L 10,0 L 0,5')
            .attr('fill', '#999')
            .style('stroke', 'none');
        
        const link = container.append('g')
            .attr('class', 'links')
            .selectAll('path')
            .data(this.links)
            .enter().append('path')
            .attr('class', 'link')
            .attr('stroke', '#999')
            .attr('stroke-opacity', 0.6)
            .attr('stroke-width', d => {
                const source = this.nodes[d.source.id || d.source];
                return source.depth === 0 ? 2 : 1;
            })
            .attr('fill', 'none')
            .attr('marker-end', 'url(#arrowhead)')
            .attr('d', d => {
                const source = this.nodes[d.source.id || d.source];
                const target = this.nodes[d.target.id || d.target];
                
                // Calculate path points
                const sourceX = source.x;
                const sourceY = source.y + this.nodeHeight / 2;
                const targetX = target.x;
                const targetY = target.y - this.nodeHeight / 2;
                
                // Create a curved path
                return `M ${sourceX} ${sourceY} 
                        C ${sourceX} ${sourceY + 40}, 
                          ${targetX} ${targetY - 40}, 
                          ${targetX} ${targetY}`;
            });
        
        // Create nodes
        container.selectAll('.node').remove();
        const node = container.append('g')
            .attr('class', 'nodes')
            .selectAll('g')
            .data(this.nodes)
            .enter().append('g')
            .attr('class', 'node')
            .attr('transform', d => `translate(${d.x - this.nodeWidth/2},${d.y - this.nodeHeight/2})`);
        
        // Add rectangles to nodes
        node.append('rect')
            .attr('width', this.nodeWidth)
            .attr('height', this.nodeHeight)
            .attr('rx', this.nodeCornerRadius)
            .attr('ry', this.nodeCornerRadius)
            .attr('fill', d => {
                if (d.isBasic) return '#2ca02c'; // Basic component
                if (d.isCircular) return '#d62728'; // Circular reference
                if (d.depth === 0) return '#1f77b4'; // Root drug
                return '#ff7f0e'; // Complex component
            })
            .attr('stroke', d => d._children ? '#000' : 'none')
            .attr('stroke-width', 2)
            .attr('stroke-dasharray', d => d._children ? '3,3' : 'none')
            .style('cursor', d => (d.children || d._children) ? 'pointer' : 'default')
            .on('click', (event, d) => {
                if (d.children || d._children) {
                    // Toggle children
                    if (d.children) {
                        d._children = d.children;
                        d.children = null;
                    } else {
                        d.children = d._children;
                        d._children = null;
                    }
                    this.updateVisualization();
                }
            });
        
        // Add labels to nodes
        node.append('text')
            .attr('x', this.nodeWidth / 2)
            .attr('y', this.nodeHeight / 2)
            .attr('text-anchor', 'middle')
            .attr('dominant-baseline', 'middle')
            .attr('class', 'node-title')
            .text(d => d.name)
            .style('font-size', d => d.depth === 0 ? '14px' : '12px')
            .style('font-weight', d => d.depth === 0 ? 'bold' : 'normal')
            .style('fill', 'white')
            .each(function(d) {
                // Add title for tooltip
                const nodeGroup = d3.select(this.parentNode);
                let tooltipContent = `<strong>${d.name}</strong>`;
                
                if (d.recipe) tooltipContent += `<br>Recipe: ${d.recipe}`;
                if (d.price) tooltipContent += `<br>Price: $${d.price}`;
                if (d.effects && d.effects !== 'NaN') tooltipContent += `<br>Effects: ${d.effects}`;
                if (d.addictiveness) tooltipContent += `<br>Addictiveness: ${d.addictiveness}`;
                
                nodeGroup.append('title').text(tooltipContent);
            });
    }

    // Update the visualization after changes
    updateVisualization() {
        // Rebuild links based on current node structure
        this.links = [];
        this.nodes.forEach(node => {
            if (node.children) {
                node.children.forEach(child => {
                    this.links.push({
                        source: node.id,
                        target: child.id
                    });
                });
            }
        });
        
        // Recalculate positions
        const rootNode = this.nodes.find(n => n.depth === 0);
        if (rootNode) {
            this.assignNodePositions(rootNode);
        }
        
        const container = this.svg.select('g.flowchart-container');
        
        // Update links
        const link = container.select('.links').selectAll('path')
            .data(this.links);
        
        link.exit().remove();
        
        const linkEnter = link.enter().append('path')
            .attr('class', 'link')
            .attr('stroke', '#999')
            .attr('stroke-opacity', 0.6)
            .attr('stroke-width', d => {
                const source = this.nodes[d.source.id || d.source];
                return source.depth === 0 ? 2 : 1;
            })
            .attr('fill', 'none')
            .attr('marker-end', 'url(#arrowhead)');
        
        link.merge(linkEnter)
            .attr('d', d => {
                const source = this.nodes[d.source.id || d.source];
                const target = this.nodes[d.target.id || d.target];
                
                // Calculate path points
                const sourceX = source.x;
                const sourceY = source.y + this.nodeHeight / 2;
                const targetX = target.x;
                const targetY = target.y - this.nodeHeight / 2;
                
                // Create a curved path
                return `M ${sourceX} ${sourceY} 
                        C ${sourceX} ${sourceY + 40}, 
                          ${targetX} ${targetY - 40}, 
                          ${targetX} ${targetY}`;
            });
        
        // Update nodes
        const node = container.select('.nodes').selectAll('g.node')
            .data(this.nodes, d => d.id);
        
        node.exit().remove();
        
        node.transition().duration(500)
            .attr('transform', d => `translate(${d.x - this.nodeWidth/2},${d.y - this.nodeHeight/2})`);
        
        node.select('rect')
            .attr('stroke', d => d._children ? '#000' : 'none')
            .attr('stroke-dasharray', d => d._children ? '3,3' : 'none');
    }
}

// Initialize the flowchart when the DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    // Add a tab for the flowchart visualization
    const navbarNav = document.querySelector('#navbarNav .navbar-nav');
    const flowchartTab = document.createElement('li');
    flowchartTab.className = 'nav-item';
    flowchartTab.innerHTML = `<a class="nav-link" href="#" id="flowchartTab">Flowchart</a>`;
    navbarNav.insertBefore(flowchartTab, navbarNav.lastElementChild);
    
    // Add a container for the flowchart
    const container = document.querySelector('.container');
    const flowchartContainer = document.createElement('div');
    flowchartContainer.id = 'flowchartContainer';
    flowchartContainer.className = 'row d-none';
    flowchartContainer.innerHTML = `
        <div class="col-12">
            <div class="card">
                <div class="card-header">
                    <h5 class="mb-0">Drug Recipe Flowchart</h5>
                </div>
                <div class="card-body p-0">
                    <div id="mindmap" style="width: 100%; height: 700px; position: relative;"></div>
                </div>
            </div>
        </div>
    `;
    container.insertBefore(flowchartContainer, document.getElementById('drugsContainer'));
    
    // Add CSS for the flowchart
    const style = document.createElement('style');
    style.textContent = `
        #mindmap {
            background-color: var(--bg-color);
            transition: background-color 0.3s ease;
        }
        .flowchart-svg {
            cursor: move;
        }
        .node text {
            fill: var(--text-color);
            pointer-events: none;
            transition: fill 0.3s ease;
        }
        .legend-text {
            fill: var(--text-color);
            font-size: 12px;
            transition: fill 0.3s ease;
        }
        .drug-selector-container {
            color: var(--text-color);
            transition: color 0.3s ease, background-color 0.3s ease;
        }
    `;
    document.head.appendChild(style);
    
    // Add event listeners for tab switching
    const homeTab = document.querySelector('.nav-link.active');
    const flowchartTabLink = document.getElementById('flowchartTab');
    const drugsContainer = document.getElementById('drugsContainer');
    
    homeTab.addEventListener('click', function(e) {
        e.preventDefault();
        homeTab.classList.add('active');
        flowchartTabLink.classList.remove('active');
        drugsContainer.classList.remove('d-none');
        flowchartContainer.classList.add('d-none');
    });
    
    flowchartTabLink.addEventListener('click', function(e) {
        e.preventDefault();
        homeTab.classList.remove('active');
        flowchartTabLink.classList.add('active');
        drugsContainer.classList.add('d-none');
        flowchartContainer.classList.remove('d-none');
        
        // Initialize the flowchart if it hasn't been initialized yet
        if (!window.drugMindmap) {
            // Load D3.js dynamically
            if (!window.d3) {
                const script = document.createElement('script');
                script.src = 'https://d3js.org/d3.v7.min.js';
                script.onload = function() {
                    // Fetch the drug data and initialize the flowchart
                    fetch('data.json')
                        .then(response => response.json())
                        .then(data => {
                            window.drugMindmap = new DrugMindmap('#mindmap', data);
                            window.drugMindmap.init();
                        })
                        .catch(error => {
                            console.error('Error loading drug data:', error);
                            document.getElementById('mindmap').innerHTML = `
                                <div class="alert alert-danger m-3">
                                    Failed to load drug data. Please try again later.
                                </div>
                            `;
                        });
                };
                document.head.appendChild(script);
            } else {
                // D3 is already loaded, just initialize the flowchart
                fetch('data.json')
                    .then(response => response.json())
                    .then(data => {
                        window.drugMindmap = new DrugMindmap('#mindmap', data);
                        window.drugMindmap.init();
                    })
                    .catch(error => {
                        console.error('Error loading drug data:', error);
                        document.getElementById('mindmap').innerHTML = `
                            <div class="alert alert-danger m-3">
                                Failed to load drug data. Please try again later.
                            </div>
                        `;
                    });
            }
        }
    });
});