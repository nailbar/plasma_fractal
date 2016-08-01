/**
 * Class for generating plasma fractal maps
 * 
 * @author Martin Wikström
 */

/**
 * Plasma fractal class
 */
function plasma_fractal() {
    this.map = [];
    this.width = 0;
    this.height = 0;
    
    /**
     * Generate a new map
     * 
     * @param int width
     * @param int height
     * @param float peaksize
     * @param float peakfall
     */
    this.generate = function(width, height, peaksize, peakfall) {
        this.map = [];
        var i = 1;
        while(i < width && i < height) {
            i *= 2;
            if(i < width) this.width = i * 2;
            if(i < height) this.height = i * 2;
        }
        
        // Temporary variables for within the loops
        var rgb;
        var neighbors;
        var neighbor;
        var value;
        var bump;
        var bump_x;
        var bump_y;
        
        // Find the highest power of two that fits the world size
        for(var detail = 1; detail < this.width && detail < this.height; detail *= 2);
        detail /= 2;
        
        // Generate world in ever finer detail
        while(detail > 1) {
            detail /= 2;
            for(var x = 0; x < this.width; x += detail) for(var y = 0; y < this.height; y += detail) {
                
                // Will generate the area in this order
                // 0 5 1
                // 8 4 6
                // 3 7 2
                
                // Get neighbor values (generate them if none exist)
                neighbors = [];
                neighbors.push(this.pick(x, y, 1, 1));
                neighbors.push(this.pick(x + detail, y, 1, 1));
                neighbors.push(this.pick(x + detail, y + detail, 1, 1));
                neighbors.push(this.pick(x, y + detail, 1, 1));
                
                // Interpolate
                neighbors.push(this.put(x + detail / 2, y + detail / 2, this.plasma([neighbors[0], neighbors[1], neighbors[2], neighbors[3]], peaksize), 1));
                neighbors.push(this.put(x + detail / 2, y, this.plasma([neighbors[0], neighbors[1], neighbors[4]], peaksize), 1));
                neighbors.push(this.put(x + detail, y + detail / 2, this.plasma([neighbors[1], neighbors[2], neighbors[4]], peaksize), 1));
                neighbors.push(this.put(x + detail / 2, y + detail, this.plasma([neighbors[2], neighbors[3], neighbors[4]], peaksize), 1));
                neighbors.push(this.put(x, y + detail / 2, this.plasma([neighbors[3], neighbors[0], neighbors[4]], peaksize), 1));
            }
            
            peaksize *= peakfall;
        }
    }

    /**
    * Generate a value for a plasma map
    * 
    * @param bool|array neighbors Neighboring values to interpolate from, false if none
    * @param float maxdelta Maximum amount the generated value is allowed to differ from the mean
    * 
    * @param return float;
    */
    this.plasma = function(neighbors, maxdelta) {
        
        // Calculate mean value
        var mean = 0;
        if(neighbors) {
            for(var i = 0; i < neighbors.length; i++) {
                mean += neighbors[i];
            }
            if(neighbors.length > 1) mean = mean / neighbors.length;
        }
        
        // Randomize
        var mean = mean + (Math.random() - 0.5) * maxdelta;
        return mean;
    }

    /**
    * Pick a value from a map
    * 
    * @param float x
    * @param float y
    * @param bool generate Generate a random value if none is already set
    * @return float
    */
    this.pick = function(x, y, generate) {
        
        // Wrap overflowing coordinates
        while(x < 0) x += this.width;
        x = Math.round(x) % this.width;
        while(y < 0) y += this.height;
        y = Math.round(y) % this.height;
        
        // Look for value
        var pos = (x + y * this.width);
        if(this.map.length < pos) this.map[pos] = 0;
        
        // Generate random value
        if(!this.map[pos] && generate) this.map[pos] = Math.random();
        
        // Return result
        return (this.map[pos] ? this.map[pos] : 0);
    }

    /**
    * Put a value on a map
    * 
    * @param float x
    * @param float y
    * @param flaot value
    * @return float
    */
    this.put = function(x, y, value) {
        
        // Wrap overflowing coordinates
        while(x < 0) x += this.width;
        x = Math.round(x) % this.width;
        while(y < 0) y += this.height;
        y = Math.round(y) % this.height;
        
        // Set the value
        var pos = (x + y * this.width);
        this.map[pos] = value;
        return value;
    }
    
    /**
     * Pick an interpolated value
     * 
     * @param float x
     * @param float y
     * @return float
     */
    this.pick_inter = function(x, y) {
        var ix = Math.floor(x);
        var iy = Math.floor(y);
        
        // Get corner values
        values = [];
        values.push(this.pick(ix, iy));
        values.push(this.pick(ix + 1, iy));
        values.push(this.pick(ix, iy + 1));
        values.push(this.pick(ix + 1, iy + 1));
        
        // Interpolate vertically
        values.push(values[0] + (values[1] - values[0]) * (x - Math.floor(x)));
        values.push(values[2] + (values[3] - values[2]) * (x - Math.floor(x)));
        
        // Interpolate horizontally
        return (values[4] + (values[5] - values[4]) * (y - Math.floor(y)));
    }
}
