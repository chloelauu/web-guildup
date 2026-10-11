const collisionZones = [

    // Top wall band
    { xPct: 0.000, yPct: 0.000, wPct: 1.000, hPct: 0.110 }, // top stone wall

    // ============================================================
    // Middle
    // ============================================================
    { xPct: 0.175, yPct: 0.000, wPct: 0.540, hPct: 0.270 },

    // ============================================================
    // Main table
    // ============================================================
    { xPct: 0.360, yPct: 0.390, wPct: 0.190, hPct: 0.100 }, // main table surface
    
    // ============================================================
    // Right-side
    // ============================================================
    { xPct: 0.785, yPct: 0.000, wPct: 0.065, hPct: 0.210 }, // short ledge near doorway (main)
    
    // Short ledge near doorway (stepped diagonal)
    { xPct: 0.770, yPct: 0.060, wPct: 0.055, hPct: 0.035 },
    { xPct: 0.775, yPct: 0.090, wPct: 0.050, hPct: 0.035 },
    { xPct: 0.780, yPct: 0.120, wPct: 0.045, hPct: 0.035 },

    { xPct: 0.930, yPct: 0.000, wPct: 0.120, hPct: 0.255 }, // right stair block

    { xPct: 0.975, yPct: 0.000, wPct: 0.045, hPct: 0.360 }, // far right upper wall

    // ============================================================
    // left-side
    // ============================================================
    // Full left and right outer map walls
    { xPct: 0.000, yPct: 0.000, wPct: 0.035, hPct: 0.360 }, // left upper wall
    { xPct: 0.000, yPct: 0.000, wPct: 0.120, hPct: 0.255 }, // left stair block

    // ============================================================
    // objects
    // ============================================================
    { xPct: 0.555, yPct: 0.185, wPct: 0.21, hPct: 0.125 }, // bulletin board

    // ============================================================
    // Decorations
    // ============================================================
    { xPct: 0.11, yPct: 0.37, wPct: 0.065, hPct: 0.1 }, // barrel01
    { xPct: 0.065, yPct: 0.45, wPct: 0.14, hPct: 0.09 }, // barrel02

    { xPct: 0.26, yPct: 0.49, wPct: 0.13, hPct: 0.06 }, // corpse

    { xPct: 0.4, yPct: 0.2, wPct: 0.03, hPct: 0.1 }, // plant01
    { xPct: 0.46, yPct: 0.2, wPct: 0.04, hPct: 0.1 }, // plant02

    // the 2 assets at the corner
    { xPct: 0.93, yPct: 0.2, wPct: 0.08, hPct: 0.1 }, // bucket01 & bucket02
    
    
    // 2 torchjes at the corner
    { xPct: 0.056, yPct: 0.78, wPct: 0.038, hPct: 0.06 }, // torch 1
    { xPct: 0.915, yPct: 0.78, wPct: 0.038, hPct: 0.06 }, // torch 1
    
    // sofa group
    { xPct: 0.16, yPct: 0.73, wPct: 0.268, hPct: 0.1 }, // mug

    // bottom right corner group
    { xPct: 0.72, yPct: 0.74, wPct: 0.160, hPct: 0.1}, // mug
    { xPct: 0.74, yPct: 0.72, wPct: 0.09, hPct: 0.1}, // mug
    { xPct: 0.775, yPct: 0.79, wPct: 0.105, hPct: 0.07 }, // mug
];