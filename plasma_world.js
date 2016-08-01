/**
 * World generator and viewer
 * 
 * @author Martin Wikström
 * 
 * @requires class plasma_fractal
 */

/**
 * Plasma world class
 * 
 * @param HTMLCanvasElement canvas
 * @param int width
 * @param int height
 * @param float scale_x Width of one unit
 * @param float scale_y Depth of one unit
 * @param float scale_y Height of the largest mountain
 */
function plasma_world(canvas, width, height, scale_x, scale_y, scale_z) {
    this.canvas = canvas;
    this.c = this.canvas.getContext("2d");
    this.scale_x = scale_x;
    this.scale_y = scale_y;
    this.scale_z = scale_z;
    
    // Create the world data
    this.map = new plasma_fractal();
    this.map.generate(width, height, Math.random() * 2.0 + 0.25, Math.random() * 0.2 + 0.35);
    this.trees = new plasma_fractal();
    this.trees.generate(Math.floor(width * 0.1), Math.floor(height * 0.1), Math.random() * 2.0 + 0.25, Math.random() * 0.2 + 0.35);
    
    // Second world data
    this.map2 = new plasma_fractal();
    this.trees2 = new plasma_fractal();
    
    // State data
    this.fade_state = 0; // Show 1, Fade 1 - 2, Show 2, Fade 2 - 1
    this.fade_tick = 0;
    
    /**
     * Draw one row
     * 
     * @param int y Row coordinate to draw
     * @param int width How many units of the row to draw
     * @param float ambient Ambient light
     * @param int y_pos Y coordinate to draw the row at
     */
    this.drawrow = function(y, width, ambient, y_pos) {
        this.fade_tick++;
        if(this.fade_tick > this.map.height / 2) {
            this.fade_tick = 0;
            this.fade_state++;
            switch(this.fade_state) {
                case 1: // Start fading from map to map2
                    this.map2.generate(this.map.width, this.map.height, Math.random() * 2.0 + 0.25, Math.random() * 0.2 + 0.35);
                    this.trees2.generate(Math.floor(this.map.width * 0.1), Math.floor(this.map.height * 0.1), Math.random() * 2.0 + 0.25, Math.random() * 0.2 + 0.35);
                    break;
                case 3: // Start fading from map2 to map
                    this.map.generate(this.map2.width, this.map2.height, Math.random() * 2.0 + 0.25, Math.random() * 0.2 + 0.35);
                    this.trees.generate(Math.floor(this.map2.width * 0.1), Math.floor(this.map2.height * 0.1), Math.random() * 2.0 + 0.25, Math.random() * 0.2 + 0.35);
                    break;
                case 4: this.fade_state = 0;
            }
        }
            
        // Loop through the tiles
        var v = {
            'waterline': 0.2,
            'grassline': 0.75,
            'snowline': 0.95
        };
        for(var x = 0; x < width; x++) {
            
            // Interpolate height of polygon
            v.center = this.pick_inter(x + 0.5, y + 0.5);
            
            // Get the highest point
            v.highest = Math.max(
                this.pick(x, y),
                this.pick(x + 1, y),
                this.pick(x + 1, y + 1),
                this.pick(x, y + 1)
            );
            
            // Get the lowest point
            v.lowest = Math.min(
                this.pick(x, y),
                this.pick(x + 1, y),
                this.pick(x + 1, y + 1),
                this.pick(x, y + 1)
            );
            
            // Calculate shadows
            v.left = this.pick_inter(x, y + 0.5);
            v.right = this.pick_inter(x + 1, y + 0.5);
            v.tilt = v.right - v.left;
            v.shadow = Math.min(1, Math.max(ambient, v.tilt * 2.0 * this.scale_y + 1.0));
            
            // Convert height into color
            if(v.highest < v.waterline) {
                v.lev = 1.0 / v.waterline * v.center;
                v.r = 0 + v.lev * 0.4;
                v.g = 0.2 + v.lev * 0.3;
                v.b = 0.5 + v.lev * 0.4;
            } else if(v.center < v.grassline) {
                v.lev = 1.0 / (v.grassline - v.waterline) * (v.center - v.waterline);
                v.r = 0.3 + v.lev * 0.4;
                v.g = 0.9 - v.lev * 0.1;
                v.b = 0.3;
            } else if(v.center < v.snowline) {
                v.lev = 1.0 / (v.snowline - v.grassline) * (v.center - v.grassline);
                v.r = 0.7 + v.lev * 0.2;
                v.g = 0.7 + v.lev * 0.1;
                v.b = 0.5 + v.lev * 0.4;
            } else {
                v.r = 1;
                v.g = 1;
                v.b = 1;
            }
            
            // Apply shadow to color
            v.r *= v.shadow;
            v.g *= v.shadow;
            v.b *= v.shadow;
            
            // Calculate trees
            if(v.highest > v.waterline && v.center < v.snowline) {
                
                // Less trees the closer you get to the snowline
                v.trees = 1.0 - 1.0 / (v.snowline - v.waterline) * (v.center - v.waterline);
                v.treesize = v.trees;
                
                // Much less trees after you get abouve the grassline
                if(v.center > v.grassline) v.trees *= 0.3;
                
                // Check for forest areas
                v.forest = this.pick_inter(
                    x * 1.0 / this.map.width * this.trees.width,
                    y * 1.0 / this.map.height * this.trees.height,
                    1
                ) - 0.3;
                
                // Remove trees where there are no forests
                if(v.forest < 0) v.treesize = 0;
                else if(v.forest < 0.2) {
                    v.trees *= v.forest / 0.2;
                    v.treesize *= v.forest / 0.2;
                }
                
                // Check if terrain allows trees
                v.slope = Math.abs(v.lowest - v.highest);
                if(v.slope > 0.06) v.trees = 0;
                else if(v.slope > 0.04) {
                    v.treesize *= 1.0 - 1.0 / 0.02 * (v.slope - 0.04);
                }
            } else v.trees = 0;
            
            // Make sure color values are sane
            v.r = Math.max(0, Math.min(255, Math.floor(v.r * 256)));
            v.g = Math.max(0, Math.min(255, Math.floor(v.g * 256)));
            v.b = Math.max(0, Math.min(255, Math.floor(v.b * 256)));
            this.c.fillStyle = "rgb(" + v.r + "," + v.g + "," + v.b + ")";
            this.c.strokeStyle = "rgb(" + v.r + "," + v.g + "," + v.b + ")";
            
            // Calculate corner heights
            v.h_topleft = Math.max(v.waterline, this.pick(x, y)) * this.scale_z;
            v.h_topright = Math.max(v.waterline, this.pick(x + 1, y)) * this.scale_z;
            v.h_bottomright = Math.max(v.waterline, this.pick(x + 1, y + 1)) * this.scale_z;
            v.h_bottomleft = Math.max(v.waterline, this.pick(x, y + 1)) * this.scale_z;
            
            // Draw the polygon
            this.c.beginPath();
            this.c.moveTo(x * this.scale_x, y_pos - v.h_topleft);
            this.c.lineTo((x + 1) * this.scale_x, y_pos - v.h_topright);
//             this.c.lineTo((x + 1) * this.scale_x, y_offset + (y + 1) * this.scale_y - v.h_bottomright);
//             this.c.lineTo(x * this.scale_x, y_offset + (y + 1) * this.scale_y - v.h_bottomleft);
            this.c.lineTo((x + 1) * this.scale_x, this.canvas.height);
            this.c.lineTo(x * this.scale_x, this.canvas.height);
            this.c.closePath();
            this.c.fill();
            this.c.stroke();
            
            // Draw trees
            if(v.treesize > 0.1) for(var i = 1; i < v.trees * v.trees * 10.0; i++) {
                v.tree_x = x + Math.random();
                v.tree_y = y + Math.random();
                v.tree_z = this.pick_inter(v.tree_x, v.tree_y) * this.scale_z;
                v.tree_s = 0.2 + v.treesize * 0.8 * Math.random();
                
                v.r = Math.floor((30 + Math.random() * 30) * v.shadow);
                v.g = Math.floor((70 + Math.random() * 60) * v.shadow);
                v.b = Math.floor((20 + Math.random() * 30) * v.shadow);
                this.c.fillStyle = "rgb(" + v.r + "," + v.g + "," + v.b + ")";
                
                this.c.beginPath();
                this.c.moveTo(v.tree_x * this.scale_x, y_pos + (v.tree_y - y) * this.scale_y - v.tree_z - v.tree_s * 12.0);
                this.c.lineTo(v.tree_x * this.scale_x + v.tree_s * 3.0, y_pos + (v.tree_y - y) * this.scale_y - v.tree_z);
                this.c.lineTo(v.tree_x * this.scale_x - v.tree_s * 3.0, y_pos + (v.tree_y - y) * this.scale_y - v.tree_z);
                this.c.closePath();
                this.c.fill();
                
            }
        }
    }
    
    /**
     * Pick a value from the map at a specific coordinate
     * 
     * Takes fading between maps into account and returns an interpolated value
     * 
     * @param int x
     * @param int y
     * @return float
     */
    this.pick = function(x, y) {
        switch(this.fade_state) {
            case 0: return this.map.pick(x, y);
            case 1:
                var v1 = this.map.pick(x, y);
                var v2 = this.map2.pick(x, y);
                return v1 + (v2 - v1) * (this.fade_tick / (this.map.height / 2));
            case 2: return this.map2.pick(x, y);
            case 3:
                var v1 = this.map2.pick(x, y);
                var v2 = this.map.pick(x, y);
                return v1 + (v2 - v1) * (this.fade_tick / (this.map.height / 2));
        }
    }
    
    /**
     * Pick an interpolated value between coordinates
     * 
     * Takes fading between maps into account and returns an interpolated value
     * 
     * @param float x
     * @param float y
     * @param bool t Pick from tree map instead of landscape map
     * @return float
     */
    this.pick_inter = function(x, y, t) {
        if(t) {
            switch(this.fade_state) {
                case 0: return this.trees.pick_inter(x, y);
                case 1:
                    var v1 = this.trees.pick_inter(x, y);
                    var v2 = this.trees2.pick_inter(x, y);
                    return v1 + (v2 - v1) * (this.fade_tick / (this.map.height / 2));
                case 2: return this.trees2.pick_inter(x, y);
                case 3:
                    var v1 = this.trees2.pick_inter(x, y);
                    var v2 = this.trees.pick_inter(x, y);
                    return v1 + (v2 - v1) * (this.fade_tick / (this.map.height / 2));
            }
        } else switch(this.fade_state) {
            case 0: return this.map.pick_inter(x, y);
            case 1:
                var v1 = this.map.pick_inter(x, y);
                var v2 = this.map2.pick_inter(x, y);
                return v1 + (v2 - v1) * (this.fade_tick / (this.map.height / 2));
            case 2: return this.map2.pick_inter(x, y);
            case 3:
                var v1 = this.map2.pick_inter(x, y);
                var v2 = this.map.pick_inter(x, y);
                return v1 + (v2 - v1) * (this.fade_tick / (this.map.height / 2));
        }
    }
}