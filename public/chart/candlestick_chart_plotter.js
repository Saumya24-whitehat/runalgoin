// ========================================
// CANDLESTICK PATTERN CHART PLOTTER
// Plots patterns directly on TradingView charts
// ========================================

/**
 * Chart Pattern Plotter - Draws patterns on TradingView chart
 */
class ChartPatternPlotter {
    constructor(tvWidget) {
        this.tvWidget = tvWidget;
        this.chart = tvWidget.chart();
        this.drawnShapes = new Map(); // Track drawn shapes by pattern ID
        this.drawnLines = new Map(); // Track drawn lines by pattern ID
        this.shapeColors = {
            'bullish': '#4CAF50',
            'bearish': '#F44336',
            'neutral': '#999999'
        };
        this.lineWidth = 2;
    }

    /**
     * Plot all patterns from detected list
     */
    plotPatterns(patterns) {
        if (!Array.isArray(patterns)) {
            console.warn('Invalid patterns array');
            return;
        }

        console.log('📊 Plotting', patterns.length, 'patterns on chart');
        patterns.forEach(pattern => {
            this.plotPattern(pattern);
        });
    }

    /**
     * Plot a single pattern on the chart
     */
    plotPattern(patternParsed) {
        try {
            var pattern=patternParsed.original
            // console.log(pattern)
            if (!pattern || !pattern.dataThis) {
                console.warn('⚠️ Invalid pattern structure');
                return;
            }

            const patternData = pattern.dataThis[0];
            if (!patternData || !patternData.metadata) {
                console.warn('⚠️ No metadata in pattern');
                return;
            }

            // console.log(patternData)
            const metadata = patternData.metadata;
            const candles = metadata.patternCandles || [];
            const values = metadata.values || [];
            const index = metadata.indices || [];
            const indices = metadata.indices || [];

            if (candles.length === 0) {
                console.warn('⚠️ No candles in pattern:', pattern.name);
                return;
            }

            console.log(`🕯️ Plotting ${pattern.name} with ${candles.length} candles`);

            // Get color based on signal
            const color = this.shapeColors[pattern.signal] || this.shapeColors['neutral'];

            // Draw pattern based on type
            switch (pattern.conditionName) {
                case 'Bullish Engulfing':
                case 'Bearish Engulfing':
                    this.plotEngulfingPattern(pattern, candles, color);
                    break;

                case 'Bullish Harami':
                case 'Bearish Harami':
                    this.plotHaramiPattern(pattern, candles, color);
                    break;

                case 'Morning Star':
                case 'Evening Star':
                    this.plotStarPattern(pattern, candles, color);
                    break;

                // case 'Double Bottom':
                // case 'Double Top':
                //     this.plotDoublePattern(pattern, candles, color);
                //     break;

                case 'Hammer':
                case 'Hanging Man':
                    this.plotHammerPattern(pattern, candles, color);
                    break;

                case 'Three White Soldiers':
                case 'Three Black Crows':
                    this.plotThreeCandlePattern(pattern, candles, color);
                    break;

                default:
                    // Generic pattern plotting
                    this.plotGenericPattern(pattern, candles,values,index, color);
            }

        } catch (error) {
            console.error('❌ Error plotting pattern:', error, pattern);
        }
    }

    /**
     * Plot Engulfing pattern - vertical line through both candles
     */
    plotEngulfingPattern(pattern, candles, color) {
        if (candles.length < 2) return;

        const firstCandle = candles[0];
        const secondCandle = candles[1];

        // Create line from first candle's high to second candle's high
        const points = [
            { time: this.parseTimestamp(firstCandle.timestamp), price: firstCandle.highPrice },
            { time: this.parseTimestamp(secondCandle.timestamp), price: secondCandle.highPrice }
        ];

        this.drawLineOnChart(pattern.id, points, color, 'Engulfing: ' + pattern.name);

        // Add markers on candles
        this.addCandleMarker(firstCandle.timestamp, firstCandle.closePrice, '⬛', color);
        this.addCandleMarker(secondCandle.timestamp, secondCandle.closePrice, '⬜', color);
    }

    /**
     * Plot Harami pattern - box around the second candle
     */
    plotHaramiPattern(pattern, candles, color) {
        if (candles.length < 2) return;

        const firstCandle = candles[0];
        const secondCandle = candles[1];

        // Draw rectangle representing the harami pattern
        const lines = [
            // Top line
            [
                { time: this.parseTimestamp(firstCandle.timestamp), price: secondCandle.highPrice },
                { time: this.parseTimestamp(secondCandle.timestamp), price: secondCandle.highPrice }
            ],
            // Right line
            [
                { time: this.parseTimestamp(secondCandle.timestamp), price: secondCandle.highPrice },
                { time: this.parseTimestamp(secondCandle.timestamp), price: secondCandle.lowPrice }
            ],
            // Bottom line
            [
                { time: this.parseTimestamp(secondCandle.timestamp), price: secondCandle.lowPrice },
                { time: this.parseTimestamp(firstCandle.timestamp), price: secondCandle.lowPrice }
            ]
        ];

        lines.forEach((line, idx) => {
            this.drawLineOnChart(pattern.id + '_' + idx, line, color, 'Harami: ' + pattern.name);
        });

        this.addCandleMarker(secondCandle.timestamp, secondCandle.closePrice, '📦', color);
    }

    /**
     * Plot Morning/Evening Star pattern - connecting lines
     */
    plotStarPattern(pattern, candles, color) {
        if (candles.length < 3) return;

        const firstCandle = candles[0];
        const secondCandle = candles[1];
        const thirdCandle = candles[2];

        // Connect high points of all three candles
        const points = [
            { time: this.parseTimestamp(firstCandle.timestamp), price: firstCandle.highPrice },
            { time: this.parseTimestamp(secondCandle.timestamp), price: secondCandle.highPrice },
            { time: this.parseTimestamp(thirdCandle.timestamp), price: thirdCandle.highPrice }
        ];

        this.drawLineOnChart(pattern.id, points, color, 'Star: ' + pattern.name);

        // Mark the middle candle
        this.addCandleMarker(secondCandle.timestamp, secondCandle.closePrice, '⭐', color);
    }

    /**
     * Plot Double Bottom/Top pattern - connecting the lows/highs
     */
    plotDoublePattern(pattern, candles, color) {
        if (candles.length < 2) return;

        // Get the extreme points (low for bottom, high for top)
        const isBottom = pattern.name.includes('Bottom');
        const extremePoints = candles.map(candle => ({
            time: this.parseTimestamp(candle.timestamp),
            price: isBottom ? candle.lowPrice : candle.highPrice
        }));

        // Draw line connecting all extreme points
        this.drawLineOnChart(pattern.id, extremePoints, color, 'Double: ' + pattern.name);

        // Highlight the two main points
        if (candles.length >= 2) {
            const price = isBottom ? candles[candles.length - 1].lowPrice : candles[candles.length - 1].highPrice;
            this.addCandleMarker(candles[candles.length - 1].timestamp, price, '🎯', color);
        }
    }

    /**
     * Plot Hammer/Hanging Man pattern - highlight the long wick
     */
    plotHammerPattern(pattern, candles, color) {
        if (candles.length < 1) return;

        const candle = candles[0];
        const time = this.parseTimestamp(candle.timestamp);

        // Draw vertical line from low to high
        const points = [
            { time: time, price: candle.lowPrice },
            { time: time, price: candle.highPrice }
        ];

        this.drawLineOnChart(pattern.id, points, color, 'Hammer: ' + pattern.name, 3);

        this.addCandleMarker(candle.timestamp, candle.closePrice, '🔨', color);
    }

    /**
     * Plot Three Soldiers/Crows pattern - connecting close prices
     */
    plotThreeCandlePattern(pattern, candles, color) {
        if (candles.length < 3) return;

        // Connect closing prices of three candles
        const points = candles.slice(0, 3).map(candle => ({
            time: this.parseTimestamp(candle.timestamp),
            price: candle.closePrice
        }));

        this.drawLineOnChart(pattern.id, points, color, 'Three: ' + pattern.name);

        // Mark all three candles
        candles.slice(0, 3).forEach((candle, idx) => {
            this.addCandleMarker(candle.timestamp, candle.closePrice, (idx + 1).toString(), color);
        });
    }

    /**
     * Plot generic pattern - connect high points
     */
    plotGenericPattern(pattern, candles,values,index, color) {
        if (candles.length === 0) return;

        var i=-1;
        const points = candles.map((candle) => {
            i+=1
        return {
            time: this.parseTimestamp(candle.timestamp),
            price: values[i],
            closeprice: candle.closePrice,
            index:index[i]
        }})

        this.drawLineOnChart(pattern.id, points, color, pattern.conditionName);
    }

    /**
     * Draw line on chart using TradingView API
     */
    drawLineOnChart(id, points, color, title, width = 2) {
        try {
            if (!this.chart || points.length < 2) return;

            // console.log(points)
            // Create line coordinates
            const createLinePoints = points.map((point, idx) => ({
                time: point.time,
                price: point.price,
                index:point.index,
                closeprice:point.closeprice
            }));

            // Draw using chart drawing tools
            // Note: This requires proper API access
            // console.log(title)
            // if(title=="Rising Wedge"){
            //     this.createRisingWedgeShape(createLinePoints, color, title, id, width);
            // }else if(title=="Falling Wedge"){
            //     this.createFallingWedgeShape(createLinePoints, color, title, id, width);
            // }else 
            if(title=="Double Bottom"){
                this.createDoubleBottomShape(createLinePoints, color, title, id, width);
            }else if(title=="Double Top"){
                this.createDoubleTopShape(createLinePoints, color, title, id, width);
            }else if(title=="Inverse Head and Shoulders"){
                this.createInverseHeadAndShouldersShape(createLinePoints, color, title, id, width);
                
            }else if(title=="Head and Shoulders"){
                this.createHeadAndShouldersShape(createLinePoints, color, title, id, width);
                
            }

        } catch (error) {
            console.error('❌ Error drawing line:', error);
        }
    }

    /**
     * Create polyline shape on chart
     */
    createDoubleTopShape(points, color, title, id, width) {
        try {
            // Store shape reference
            this.drawnLines.set(id, {
                points: points,
                color: color,
                title: title,
                width: width
            });
    
            let pointsFinal1 = [];
    
            let time1 = 0;
            let time2 = 0;
    
            let high1 = 0;
            let high2 = 0;
            let low1 = 0;
    
            let m = 0;
            let point1 = [0, 0];
            let point2 = [0, 0];
    
            if (points.length >= 2) {
                for (let i = 0; i < points.length; i++) {
                    const p1 = points[i];
                    const p2 = points[i + 1];
    
                    if (high1 === 0 && p1.price !== -1) {
                        high1 = p1.price;
                    }
    
                    if (p1.price !== -1) {
                        high1 = Math.max(high1, p1.price);
                        pointsFinal1.push({ time: p1.time, price: p1.price });
                    }
    
                    if (low1 === 0 && p1.price !== -1) {
                        low1 = p1.price;
                    }
    
                    if (p1.price !== -1) {
                        low1 = Math.min(low1, p1.price);
                    }
    
                    if (time1 === 0) {
                        time1 = p1.time;
                    }
                    time2 = p1.time;
    
                    if (m === 0 && p2) {
                        m = (p2.price - p1.price) / (p2.index - p1.index);
                        point1 = p1;
                        point2 = p2;
                    }
                }
            }
    
            // Convert index → time using bars
            const indexMy1 = Object.keys(window.bars).indexOf(
                (point1.time * 1000).toFixed(0)
            );
            const indexMy2 = Object.keys(window.bars).indexOf(
                (point2.time * 1000).toFixed(0)
            );
    
            // Projection towards breakdown (neckline)
            const NeededTime = Math.floor(
                (points[2].price - (point1.price - m * point1.index)) / m
            );
    
            const projectedIndex = Math.floor(
                ((indexMy2 - indexMy1) /
                    (point2.index - point1.index)) *
                    (NeededTime - point1.index) +
                    indexMy1
            );
    
            const projectedTime = parseInt(
                Object.keys(window.bars)[projectedIndex] / 1000
            );
    
            // Adjust first point to projected breakdown
            pointsFinal1[0].time = projectedTime;
            pointsFinal1[0].price = points[2].price;
    
            // === 1️⃣ Zig-zag structure ===
            this.chart.createMultipointShape(pointsFinal1, {
                shape: "polyline",
                lock: true
            });
    
            // === 2️⃣ Neckline (support) ===
            this.chart.createMultipointShape(
                [
                    { time: time1, price: points[2].price },
                    { time: time2, price: points[2].price }
                ],
                {
                    shape: "trend_line",
                    lock: true,
                    disableSelection: true,
                    disableSave: true,
                    disableUndo: true,
                    overrides: {
                        linestyle: 1,
                        linewidth: 4
                    },
                    zOrder: 4
                }
            );
    
            // === 3️⃣ Projection line (breakdown target) ===
            this.chart.createMultipointShape(
                [
                    points[0],
                    { time: projectedTime, price: points[2].price }
                ],
                {
                    shape: "trend_line",
                    lock: true,
                    disableSelection: true,
                    disableSave: true,
                    disableUndo: true,
                    zOrder: 4
                }
            );
    
            // === 4️⃣ Top resistance line ===
            this.chart.createMultipointShape(
                [
                    { time: time1, price: high1 },
                    { time: time2, price: high1 }
                ],
                {
                    shape: "trend_line",
                    lock: true,
                    disableSelection: true,
                    disableSave: true,
                    disableUndo: true,
                    overrides: {
                        linestyle: 1,
                        linewidth: 4
                    },
                    zOrder: 4
                }
            );
    
            console.log("✅ Drew Double Top pattern:", title);
    
        } catch (error) {
            console.error("❌ Error creating Double Top shape:", error);
        }
    }
    createHeadAndShouldersShape(points, color, title, id, width) {
        try {
            this.drawnLines.set(id, { points, color, title, width });
    
            const LS = points[1];
            const H  = points[3];
            const RS = points[5];
    
            const NL1 = points[2];
            const NL2 = points[4];
    
            // Shoulder trend
            const m = (points[0].price - points[1].price) /
                      (points[0].index - points[1].index);
            const c = points[1].price - m * points[1].index;
    
            // Neckline
            const mNeckline = (NL2.price - NL1.price) /
                              (NL2.index - NL1.index);
            const cNeckline = NL1.price - mNeckline * NL1.index;
    
            // Convert index → time
            const indexMy1 = Object.keys(window.bars).indexOf(
                (points[0].time * 1000).toFixed(0)
            );
            const indexMy2 = Object.keys(window.bars).indexOf(
                (points[1].time * 1000).toFixed(0)
            );
    
            // Breakdown intersection (price crosses neckline)
            const NeededTime = Math.floor(
                (c - cNeckline) / (mNeckline - m)
            );
    
            const projectedIndex = Math.floor(
                ((indexMy2 - indexMy1) /
                    (points[1].index - points[0].index)) *
                    (NeededTime - points[0].index) +
                    indexMy1
            );
    
            const projectedTime = parseInt(
                Object.keys(window.bars)[projectedIndex] / 1000
            );
    
            // 1️⃣ Zig-zag structure
            this.chart.createMultipointShape(
                [
                    { time: projectedTime, price: mNeckline * NeededTime + cNeckline },
                    LS,
                    NL1,
                    H,
                    NL2,
                    RS,
                    points[6]
                ],
                {
                    shape: "polyline",
                    lock: true
                }
            );
    
            // 2️⃣ Breakdown projection line
            this.chart.createMultipointShape(
                [
                    points[0],
                    { time: projectedTime, price: mNeckline * NeededTime + cNeckline }
                ],
                {
                    shape: "trend_line",
                    lock: true,
                    disableSelection: true,
                    disableSave: true,
                    disableUndo: true,
                    zOrder: 4
                }
            );
    
            // 3️⃣ Measured move target (DOWN)
            const necklinePrice = (NL1.price + NL2.price) / 2;
            const height = H.price - necklinePrice;
            const targetPrice = necklinePrice - height;
    
            console.log("✅ Drew Head & Shoulders:", title);
    
        } catch (error) {
            console.error("❌ Head & Shoulders error:", error);
        }
    }
    
    createInverseHeadAndShouldersShape(points, color, title, id, width) {
        try {
            this.drawnLines.set(id, { points, color, title, width });
    
            const LS = points[1];
            const H  = points[3];
            const RS = points[5];
    
            const NL1 = points[2];
            const NL2 = points[4];
    
            
            var m = (points[0].price-points[1].price)/(points[0].index-points[1].index)
            var c = points[1].price-m*points[1].index
            var mNeckline = (NL2.price-NL1.price)/(NL2.index-NL1.index)
            var cNeckline = NL1.price-mNeckline*NL1.index

            // Convert index → time using bars
            const indexMy1 = Object.keys(window.bars).indexOf(
                (points[0].time * 1000).toFixed(0)
            );
            const indexMy2 = Object.keys(window.bars).indexOf(
                (points[1].time * 1000).toFixed(0)
            );
    
            // Projection towards breakdown (neckline)
            const NeededTime = Math.floor(
                (cNeckline-c)/(m-mNeckline)
            );
    
            const projectedIndex = Math.floor(
                ((indexMy2 - indexMy1) /
                    (points[1].index - points[0].index)) *
                    (NeededTime - points[0].index) +
                    indexMy1
            );
    
            const projectedTime = parseInt(
                Object.keys(window.bars)[projectedIndex] / 1000
            );
            console.log(NeededTime,projectedTime)
            console.log(points)
            // 1️⃣ Structure zig-zag
            this.chart.createMultipointShape(
                [
                    {time:projectedTime,price:mNeckline*NeededTime+cNeckline},
                    LS,
                    NL1,
                    H,
                    NL2,
                    RS,
                    points[6]
                ],
                {
                    shape: "polyline",
                    lock: true
                }
            );
    
            // 3️⃣ Measured move target (up)
            const necklinePrice = (NL1.price + NL2.price) / 2;
            const height = necklinePrice - H.price;
            const targetPrice = necklinePrice + height;
    
            this.chart.createMultipointShape(
                [
                    points[0],
                    {time:projectedTime,price:mNeckline*NeededTime+cNeckline}
                ],
                {
                    shape: "trend_line",
                    lock: true,
                    disableSelection: true,
                    disableSave: true,
                    disableUndo: true,
                    zOrder: 4
                }
            );
    
            console.log("✅ Drew Inverted Head & Shoulders:", title);
    
        } catch (error) {
            console.error("❌ Inverted H&S error:", error);
        }
    }
            
    createDoubleBottomShape(points, color, title, id, width) {
        try {
            // Store shape reference
            this.drawnLines.set(id, {
                points: points,
                color: color,
                title: title,
                width: width
            });

            // Create visual indicator using chart API()
            // This is a workaround using horizontal/vertical lines
            // console.log(points)
            var pointsFinal=[]
            var pointsFinal1=[];
            // var middlePoint=points[2].price
            var time1=0
            var time2=0
            var low1=0
            var low2=0
            var high1=0
            var high2=0
            var m=0
            var point1=[0,0]
            var point2=[0,0]
            // var point3=[0,0]
            if (points.length >= 2) {
                for (let i = 0; i < points.length; i++) {
                    const p1 = points[i];
                    const p2 = points[i + 1];
                    high1=Math.max(p1.price,high1)
                    high2=Math.max(p1.price,high2)
                    // console.log(p1.price)
                    if(low1==0){
                        low1=p1.price
                    }
                    if(p1.price!=-1){
                        low1=Math.min(p1.price,low1)
                    }
                    if(p1.price==-1){
                        low2=p1.closeprice
                    }
                    if(time1==0){
                        time1=p1.time
                    }
                    time2=p1.time
                    if(p1.price!=-1){
                        pointsFinal1.push({ time: p1.time, price: p1.price })
                    }
                    if(m==0){
                        m=(p2.price-p1.price)/(p2.index-p1.index)
                        point1=p1
                        point2=p2
                    }
                }
            }
            // console.log()
            var indexMy1=Object.keys(window.bars).indexOf((point1.time*1000).toFixed(0))
            var indexMy2=Object.keys(window.bars).indexOf((point2.time*1000).toFixed(0))
            var NeededTime=Math.floor((points[2].price-(point1.price-m*point1.index))/m)

            console.log(indexMy2,indexMy1,point1,point2,Math.floor((points[2].price-(point1.price-m*point1.index))/m))
            console.log(Math.floor((indexMy2-indexMy1)/(point2.index-point1.index)*(NeededTime-point1.index)+indexMy1))
            pointsFinal1[0].time=parseInt(Object.keys(window.bars)[Math.floor((indexMy2-indexMy1)/(point2.index-point1.index)*(NeededTime-point1.index)+indexMy1)]/1000)
            pointsFinal1[0].price=points[2].price
            // console.log(pointsFinal1)
            this.chart.createMultipointShape(
                pointsFinal1,
                {
                    shape: "polyline",
                    lock:true,
                }
            );
            
            this.chart.createMultipointShape(
                [{ time: time1, price: points[2].price },{ time: time2, price: points[2].price }],
                {
                    shape: "trend_line",
                    lock: true,
                    disableSelection: true,
                    disableSave: true,
                    disableUndo: true,
                    text: "text",
                    overrides:{
                        linestyle:1,
                        linewidth:4,
                        // linecolor:'#0000ff'
                    },
                    zOrder:4
                }
            );
            this.chart.createMultipointShape(
                [points[0],{time: parseInt(Object.keys(window.bars)[Math.floor((indexMy2-indexMy1)/(point2.index-point1.index)*(NeededTime-point1.index)+indexMy1)]/1000),price:points[2].price}],
                {
                    shape: "trend_line",
                    lock: true,
                    disableSelection: true,
                    disableSave: true,
                    disableUndo: true,
                    text: "text",
                    zOrder:4
                }
            );
            this.chart.createMultipointShape(
                [{ time: time1, price: low1 },{ time: time2, price: low1 }],
                {
                    shape: "trend_line",
                    lock: true,
                    disableSelection: true,
                    disableSave: true,
                    disableUndo: true,
                    text: "text",
                    overrides:{
                        linestyle:1,
                        linewidth:4,
                        // linecolor:'#0000ff'
                    },
                    zOrder:4
                }
            );

            console.log('✅ Drew pattern:', title);

        } catch (error) {
            console.error('❌ Error creating shape:', error);
        }
    }
    createRisingWedgeShape(points, color, title, id, width) {
        try {
            // Store shape reference
            this.drawnLines.set(id, {
                points: points,
                color: color,
                title: title,
                width: width
            });

            // Create visual indicator using chart API()
            // This is a workaround using horizontal/vertical lines
            // console.log(points)
            var pointsFinal=[]
            var pointsFinal1=[];
            var time1=0
            var time2=0
            var low1=0
            var low2=0
            var high1=0
            var high2=0
            if (points.length >= 2) {
                for (let i = 0; i < points.length; i++) {
                    const p1 = points[i];
                    const p2 = points[i + 1];
                    high1=Math.max(p1.price,high1)
                    high2=Math.max(p1.price,high2)
                    // console.log(p1.price)
                    if(low1==0){
                        low1=p1.price
                    }
                    if(p1.price!=-1){
                        low1=Math.min(p1.price,low1)
                    }
                    if(p1.price==-1){
                        low2=p1.closeprice
                    }
                    if(time1==0){
                        time1=p1.time
                    }
                    time2=p1.time
                    if(p1.price!=-1 && p2?.price!=-1){
                        // pointsFinal1.push()
                        
                        this.chart.createMultipointShape(
                            [{ time: p1.time, price: p1.price },{ time: p2.time, price: p2.price }],
                            {
                                shape: "trend_line",
                                lock: true,
                                disableSelection: true,
                                disableSave: true,
                                disableUndo: true,
                                text: "text",
                                overrides:{
                                    linestyle:1,
                                    linewidth:4,
                                    // linecolor:'#0000ff'
                                },
                                zOrder:4
                            }
                        );
                    }
                    
                    // console.log(this.chart)
                }
            }
            pointsFinal=[
                { time: time1, price: low1 },
                { time: time1, price: high1 },
                { time: time2, price: high2 },
                { time: time2, price: low2 }
            ]
            // console.log(pointsFinal1)

            this.chart.createMultipointShape(
                pointsFinal,
                {
                    shape: "polyline",
                    lock:true,
                }
            );

            console.log('✅ Drew pattern:', title);

        } catch (error) {
            console.error('❌ Error creating shape:', error);
        }
    }
    createFallingWedgeShape(points, color, title, id, width) {
        try {
            // Store shape reference
            this.drawnLines.set(id, {
                points: points,
                color: color,
                title: title,
                width: width
            });

            // Create visual indicator using chart API()
            // This is a workaround using horizontal/vertical lines
            // console.log(points)
            var pointsFinal=[]
            var pointsFinal1=[];
            var time1=0
            var time2=0
            var low1=0
            var low2=0
            var high1=0
            var high2=0
            if (points.length >= 2) {
                for (let i = 0; i < points.length; i++) {
                    const p1 = points[i];
                    const p2 = points[i + 1];
                    high1=Math.max(p1.price,high1)
                    // console.log(p1.price)
                    if(low1==0){
                        low1=p1.price
                    }
                    if(p1.price!=-1){
                        low1=Math.min(p1.price,low1)
                    }
                    if(low2==0){
                        low2=p1.price
                    }
                    if(p1.price!=-1){
                        low2=Math.min(p1.price,low2)
                    }
                    if(p1.price==-1){
                        high2=p1.closeprice
                    }
                    if(time1==0){
                        time1=p1.time
                    }
                    time2=p1.time
                    if(p1.price!=-1 && p2?.price!=-1){
                        // pointsFinal1.push()
                        
                        this.chart.createMultipointShape(
                            [{ time: p1.time, price: p1.price },{ time: p2.time, price: p2.price }],
                            {
                                shape: "trend_line",
                                lock: true,
                                disableSelection: true,
                                disableSave: true,
                                disableUndo: true,
                                text: "text",
                                overrides:{
                                    linestyle:1,
                                    linewidth:4,
                                    linecolor:'#ff0000'
                                },
                                zOrder:4
                            }
                        );
                    }
                    
                    // console.log(this.chart)
                }
            }
            pointsFinal=[
                { time: time1, price: low1 },
                { time: time1, price: high1 },
                { time: time2, price: high2 },
                { time: time2, price: low2 }
            ]
            // console.log(pointsFinal1)

            this.chart.createMultipointShape(
                pointsFinal,
                {
                    shape: "polyline",
                    lock:true,
                    overrides:{
                        backgroundColor:"rgba(212, 20, 0, 0.2)",
                        linecolor:"rgba(212, 20, 0,1)"
                    }
                    

                }
            );

            console.log('✅ Drew pattern:', title);

        } catch (error) {
            console.error('❌ Error creating shape:', error);
        }
    }

    /**
     * Alternative method to draw line using study creation
     */
    drawLineSegmentAlternative(p1, p2, color, width, title) {
        try {
            // Use trend line or drawing tools if available
            if (this.chart.createStudy) {
                // Alternative: overlay trend line using technical indicators
                this.chart.createStudy('Extended Line', false, false, [
                    0, // start price (p1.price)
                    0  // end price (p2.price)
                ]);
            }
        } catch (error) {
            console.log('⚠️ Alternative drawing method also unavailable');
        }
    }

    /**
     * Add marker on specific candle
     */
    addCandleMarker(timestamp, price, marker, color) {
        try {
            const time = this.parseTimestamp(timestamp);
            
            // Create shape annotation
            const key = `marker_${time}_${price}`;
            
            // Store marker info
            if (!this.drawnShapes.has(key)) {
                this.drawnShapes.set(key, {
                    time: time,
                    price: price,
                    marker: marker,
                    color: color
                });
            }

            // Note: Visual marker display would require chart API features
            console.log(`🎯 Marker at ${time} price ${price}: ${marker}`);

        } catch (error) {
            console.error('❌ Error adding marker:', error);
        }
    }

    /**
     * Parse timestamp to TradingView format
     */
    parseTimestamp(timestamp) {
        try {
            if (typeof timestamp === 'number') {
                // Convert milliseconds to seconds if needed
                if (timestamp > 10000000000) {
                    return Math.floor(timestamp / 1000);
                }
                return timestamp;
            }

            if (typeof timestamp === 'string') {
                // Parse ISO string: "2025-12-11T11:30:00+05:30"
                const date = new Date(timestamp);
                return Math.floor(date.getTime() / 1000);
            }

            return timestamp;
        } catch (error) {
            console.error('❌ Error parsing timestamp:', error);
            return new Date().getTime() / 1000;
        }
    }

    /**
     * Clear all drawn patterns
     */
    clearAllPatterns() {
        try {
            this.drawnLines.forEach((line, id) => {
                console.log('🗑️ Clearing pattern:', id);
            });

            this.drawnLines.clear();
            this.drawnShapes.clear();
            console.log('✅ All patterns cleared');

        } catch (error) {
            console.error('❌ Error clearing patterns:', error);
        }
    }

    /**
     * Remove specific pattern
     */
    removePattern(patternId) {
        try {
            this.drawnLines.delete(patternId);
            this.drawnShapes.delete(patternId);
            console.log('🗑️ Pattern removed:', patternId);
        } catch (error) {
            console.error('❌ Error removing pattern:', error);
        }
    }

    /**
     * Get all drawn patterns
     */
    getDrawnPatterns() {
        return {
            lines: Array.from(this.drawnLines.entries()),
            shapes: Array.from(this.drawnShapes.entries())
        };
    }

    /**
     * Change pattern colors
     */
    setPatternColors(bullishColor, bearishColor, neutralColor) {
        this.shapeColors = {
            'bullish': bullishColor,
            'bearish': bearishColor,
            'neutral': neutralColor
        };
        console.log('✅ Pattern colors updated');
    }

    /**
     * Set line width
     */
    setLineWidth(width) {
        this.lineWidth = width;
        console.log('✅ Line width set to:', width);
    }

    /**
     * Toggle pattern visibility
     */
    togglePatternVisibility(patternId, visible) {
        try {
            const pattern = this.drawnLines.get(patternId);
            if (pattern) {
                pattern.visible = visible;
                console.log('👁️ Pattern visibility:', patternId, visible);
            }
        } catch (error) {
            console.error('❌ Error toggling visibility:', error);
        }
    }
}

// ========================================
// GLOBAL FUNCTIONS
// ========================================

/**
 * Initialize chart plotter with TradingView widget
 */
window.initChartPlotter = function(tvWidget) {
    window.chartPlotter = new ChartPatternPlotter(tvWidget);
    console.log('✅ Chart Pattern Plotter initialized');
    return window.chartPlotter;
};

/**
 * Plot patterns on chart
 */
window.plotPatternsOnChart = async function(symbol, timeframe = '15mi') {
    if (!window.chartPlotter) {
        console.error('❌ Chart plotter not initialized');
        return;
    }

    // Fetch patterns
    const patterns = await window.candlestickAnalyzer.fetchPatternsFromAPI(symbol, timeframe);

    if (patterns.length === 0) {
        console.log('📭 No patterns to plot');
        return;
    }

    // Plot on chart
    window.chartPlotter.plotPatterns(patterns);
    console.log('✅ Plotted', patterns.length, 'patterns on chart');
};

/**
 * Clear all patterns from chart
 */
window.clearPatterns = function() {
    if (!window.chartPlotter) return;
    window.chartPlotter.clearAllPatterns();
};

/**
 * Quick plot function
 */
window.plotPatterns = function(patterns) {
    if (!window.chartPlotter) {
        console.error('❌ Chart plotter not initialized');
        return;
    }
    window.chartPlotter.plotPatterns(patterns);
};

/**
 * Get pattern drawing info
 */
window.getDrawnPatterns = function() {
    if (!window.chartPlotter) return null;
    return window.chartPlotter.getDrawnPatterns();
};

/**
 * Chart plotter help
 */
window.chartPlotterHelp = function() {
    const help = `
📊 CHART PATTERN PLOTTER - Help Guide

🎯 Functions:
  initChartPlotter(tvWidget) - Initialize with TradingView widget
  plotPatternsOnChart(symbol, timeframe) - Fetch and plot patterns
  plotPatterns(patterns) - Plot given patterns array
  clearPatterns() - Clear all patterns from chart
  getDrawnPatterns() - Get info about drawn patterns
  
⚙️ Configuration:
  chartPlotter.setPatternColors(bullish, bearish, neutral)
  chartPlotter.setLineWidth(width)
  chartPlotter.togglePatternVisibility(patternId, visible)
  
📈 Supported Patterns:
  - Bullish/Bearish Engulfing
  - Bullish/Bearish Harami
  - Morning/Evening Star
  - Double Bottom/Top
  - Hammer/Hanging Man
  - Three White Soldiers/Black Crows
  - And many more...
  
💡 Example Usage:
  1. initChartPlotter(window.tvWidget)
  2. plotPatternsOnChart('RELIANCE', '15mi')
  3. getDrawnPatterns()
  4. clearPatterns()
  
📝 Notes:
  - Patterns are drawn with colored lines
  - Bullish = Green, Bearish = Red, Neutral = Gray
  - Markers show specific candle positions
  - Lines automatically parse timestamps
    `;
    console.log(help);
};

console.log('🎨 Chart Pattern Plotter loaded');
console.log('Type chartPlotterHelp() for usage information');