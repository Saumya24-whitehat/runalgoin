// ========================================
// CANDLESTICK PATTERN INDICATOR WITH API
// Supports real API response format
// ========================================

/**
 * Candlestick Pattern Analyzer - Fetches patterns from real API
 * Works with actual API response format
 */
class CandlestickPatternAnalyzer {
    constructor() {
        this.patterns = [];
        this.loading = false;
        this.cacheTime = 5 * 60 * 1000; // 5 minutes cache
        this.lastFetch = {};
        this.detectionInterval = null;
        this.apiBaseUrl = './api'; // Adjust based on your API location
    }

    /**
     * Fetch candlestick patterns from API
     * Works with the provided API response format
     * @param {string} symbol - Trading symbol (e.g., "ADANIENT", "RELIANCE")
     * @param {string} timeframe - Chart timeframe (15mi, 1hr, 4hr, 1day, etc)
     * @param {number} limit - Number of recent patterns to return
     */
    async fetchPatternsFromAPI(symbol, timeframe = '15mi', limit = 50) {
        try {
            const cacheKey = `${symbol}_${timeframe}`;
            const now = Date.now();

            // Check cache
            if (this.lastFetch[cacheKey] && (now - this.lastFetch[cacheKey].time) < this.cacheTime) {
                console.log('📊 Using cached patterns for:', symbol);
                return this.lastFetch[cacheKey].data;
            }

            this.loading = true;
            console.log('🔍 Fetching candlestick patterns for:', symbol, timeframe);

            // API endpoint - replace with your actual API URL
            const apiUrl = `${this.apiBaseUrl}/get_candlestick_patterns.php?symbol=${encodeURIComponent(symbol)}&timeframe=${encodeURIComponent(timeframe)}&limit=${limit}`;

            const response = await fetch(apiUrl);
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            const rawData = await response.json();
            console.log('📨 Raw API Response:', rawData);

            // Parse the API response and normalize it
            const patterns = this.normalizeAPIResponse(rawData);

            // Cache the results
            this.lastFetch[cacheKey] = {
                time: now,
                data: patterns
            };

            this.patterns = patterns;
            console.log('✅ Fetched and normalized patterns:', this.patterns.length);

            return this.patterns;

        } catch (error) {
            console.error('❌ Error fetching patterns:', error);
            return [];
        } finally {
            this.loading = false;
        }
    }

    /**
     * Normalize API response to standard format
     * Converts the raw API response to internal format
     */
    normalizeAPIResponse(rawData) {
        if (!Array.isArray(rawData)) {
            console.warn('⚠️ Expected array response, got:', typeof rawData);
            return [];
        }

        return rawData.map((item, index) => {
            const normalized = {
                id: item.id,
                name: item.conditionName || 'Unknown Pattern',
                signal: (item.trendType || '').toLowerCase() === 'bullish' ? 'bullish' : 
                        (item.trendType || '').toLowerCase() === 'bearish' ? 'bearish' : 'neutral',
                strength: this.calculatePatternStrength(item),
                trend_type: item.trendType || '',
                bar_index: index,
                time: item.timestamp,
                timeframe: item.timeFrame || '',
                symbol: item.tradingSymbol || '',
                exchange: item.exchange || '',
                
                // Pattern metadata
                pattern_type: item.subTypeLabel || 'Candlesticks',
                title: item.title || '',
                description: item.securityDescription || '',
                
                // Condition details
                condition_id: item.conditionId,
                token: item.token,
                token_type: item.tokenType,
                
                // Pattern-specific data
                pattern_width: item.dataThis?.[0]?.metadata?.patternWidth || 1,
                indices: item.dataThis?.[0]?.metadata?.indices || [],
                pattern_candles: item.dataThis?.[0]?.metadata?.patternCandles || [],
                
                // Original data
                original: item
            };

            return normalized;
        });
    }

    /**
     * Calculate pattern strength/confidence
     * Can be customized based on pattern type
     */
    calculatePatternStrength(item) {
        let strength = 0.7; // Default strength

        // Candlestick patterns are typically more reliable
        if (item.subTypeLabel === 'Candlesticks') {
            strength = 0.75;
        }
        // Chart patterns need more confirmation
        else if (item.subTypeLabel === 'Chart Patterns') {
            strength = 0.65;
        }

        // Adjust based on pattern name
        const highStrengthPatterns = [
            'Bullish Engulfing',
            'Bearish Engulfing',
            'Morning Star',
            'Evening Star',
            'Three White Soldiers',
            'Three Black Crows',
            'Double Bottom',
            'Double Top'
        ];

        if (highStrengthPatterns.some(p => item.conditionName?.includes(p))) {
            strength += 0.15;
        }

        return Math.min(strength, 1.0); // Cap at 1.0
    }

    /**
     * Process and categorize detected patterns
     */
    processPatterns(patterns) {
        if (!Array.isArray(patterns)) return {};

        const categorized = {
            bullish: [],
            bearish: [],
            neutral: [],
            reversal: [],
            continuation: [],
            by_timeframe: {},
            by_pattern_type: {}
        };

        patterns.forEach(pattern => {
            // Categorize by signal type
            if (pattern.signal === 'bullish') {
                categorized.bullish.push(pattern);
            } else if (pattern.signal === 'bearish') {
                categorized.bearish.push(pattern);
            } else {
                categorized.neutral.push(pattern);
            }

            // Categorize by pattern type
            const reversalPatterns = [
                'Hammer', 'Hanging Man', 'Engulfing', 'Morning Star', 'Evening Star',
                'Doji', 'Harami', 'Bottom', 'Top'
            ];

            if (reversalPatterns.some(p => pattern.name.includes(p))) {
                categorized.reversal.push(pattern);
            } else {
                categorized.continuation.push(pattern);
            }

            // Group by timeframe
            const tf = pattern.timeframe || 'unknown';
            if (!categorized.by_timeframe[tf]) {
                categorized.by_timeframe[tf] = [];
            }
            categorized.by_timeframe[tf].push(pattern);

            // Group by pattern type
            const pt = pattern.pattern_type || 'unknown';
            if (!categorized.by_pattern_type[pt]) {
                categorized.by_pattern_type[pt] = [];
            }
            categorized.by_pattern_type[pt].push(pattern);
        });

        return categorized;
    }

    /**
     * Get patterns by name
     */
    getPatternsByName(name) {
        return this.patterns.filter(p => 
            p.name.toLowerCase().includes(name.toLowerCase())
        );
    }

    /**
     * Get patterns by timeframe
     */
    getPatternsByTimeframe(timeframe) {
        return this.patterns.filter(p => p.timeframe === timeframe);
    }

    /**
     * Get patterns by signal type
     */
    getPatternsBySignal(signal) {
        return this.patterns.filter(p => p.signal === signal.toLowerCase());
    }

    /**
     * Get strongest patterns (by confidence/strength)
     */
    getStrongestPatterns(count = 5) {
        return [...this.patterns]
            .sort((a, b) => (b.strength || 0) - (a.strength || 0))
            .slice(0, count);
    }

    /**
     * Get most recent patterns
     */
    getRecentPatterns(count = 10) {
        return [...this.patterns]
            .sort((a, b) => (b.time || 0) - (a.time || 0))
            .slice(0, count);
    }

    /**
     * Get pattern with detailed candle data
     */
    getPatternDetails(patternId) {
        const pattern = this.patterns.find(p => p.id === patternId);
        if (!pattern) return null;

        return {
            ...pattern,
            candles: pattern.pattern_candles,
            candle_count: pattern.pattern_candles.length,
            pattern_indices: pattern.indices,
            formatted_time: new Date(pattern.time).toLocaleString()
        };
    }

    /**
     * Enable automatic pattern detection
     */
    enableAutoDetection(symbol, timeframe = '15mi', interval = 60000) {
        console.log('🔄 Enabling automatic pattern detection for:', symbol, timeframe);

        // Fetch initial patterns
        this.fetchPatternsFromAPI(symbol, timeframe);

        this.detectionInterval = setInterval(async () => {
            const patterns = await this.fetchPatternsFromAPI(symbol, timeframe);
            if (patterns.length > 0) {
                this.notifyNewPatterns(patterns);
            }
        }, interval);

        return this.detectionInterval;
    }

    /**
     * Disable automatic detection
     */
    disableAutoDetection() {
        if (this.detectionInterval) {
            clearInterval(this.detectionInterval);
            this.detectionInterval = null;
            console.log('⏹️ Pattern detection disabled');
        }
    }

    /**
     * Notify about new patterns
     */
    notifyNewPatterns(patterns) {
        const recentPatterns = this.getRecentPatterns(3);
        
        recentPatterns.forEach(pattern => {
            const message = `🕯️ ${pattern.name} detected on ${pattern.timeframe}! ${pattern.signal.toUpperCase()}`;
            console.log(message);
            
            // Show notification if strength is high
            if (pattern.strength >= 0.75) {
                this.showNotification(message, pattern.signal === 'bullish' ? 'success' : 'warning');
            }
        });
    }

    /**
     * Show visual notification
     */
    showNotification(message, type = 'info') {
        const notification = document.createElement('div');
        notification.style.cssText = `
            position: fixed;
            top: 100px;
            right: 20px;
            padding: 15px 20px;
            border-radius: 6px;
            color: white;
            font-family: Arial, sans-serif;
            font-size: 14px;
            z-index: 10000;
            box-shadow: 0 4px 12px rgba(0,0,0,0.3);
            animation: slideIn 0.3s ease-out;
            max-width: 300px;
        `;

        switch (type) {
            case 'success':
                notification.style.backgroundColor = '#4CAF50';
                break;
            case 'warning':
                notification.style.backgroundColor = '#ff9800';
                break;
            case 'error':
                notification.style.backgroundColor = '#f44336';
                break;
            default:
                notification.style.backgroundColor = '#2196F3';
        }

        notification.textContent = message;
        document.body.appendChild(notification);

        setTimeout(() => {
            notification.style.opacity = '0';
            notification.style.transform = 'translateX(100%)';
            notification.style.transition = 'all 0.3s ease';
            setTimeout(() => notification.remove(), 300);
        }, 5000);
    }
}

// ========================================
// GLOBAL INSTANCE AND FUNCTIONS
// ========================================

window.candlestickAnalyzer = new CandlestickPatternAnalyzer();

/**
 * Quick function to analyze symbol
 */
window.analyzeCandlestickPatterns = async function(symbol = 'RELIANCE', timeframe = '15mi') {
    console.log('🔍 Analyzing candlestick patterns for:', symbol, timeframe);
    const patterns = await window.candlestickAnalyzer.fetchPatternsFromAPI(symbol, timeframe);
    console.log('📊 Found', patterns.length, 'patterns');
    return patterns;
};

/**
 * Display patterns in console table
 */
window.showPatterns = async function(symbol = 'RELIANCE', timeframe = '15mi') {
    const patterns = await window.analyzeCandlestickPatterns(symbol, timeframe);
    
    if (patterns.length === 0) {
        console.log('📭 No patterns detected');
        return [];
    }

    console.table(patterns.map(p => ({
        'Pattern': p.name,
        'Signal': p.signal.toUpperCase(),
        'Strength': (p.strength || 0).toFixed(2),
        'Timeframe': p.timeframe,
        'Type': p.pattern_type,
        'Time': new Date(p.time).toLocaleString()
    })));
    
    return patterns;
};

/**
 * Get bullish patterns
 */
window.getBullishPatterns = async function(symbol = 'RELIANCE', timeframe = '15mi') {
    const patterns = await window.analyzeCandlestickPatterns(symbol, timeframe);
    const bullish = patterns.filter(p => p.signal === 'bullish');
    console.log(`📈 Found ${bullish.length} bullish patterns`);
    console.table(bullish);
    return bullish;
};

/**
 * Get bearish patterns
 */
window.getBearishPatterns = async function(symbol = 'RELIANCE', timeframe = '15mi') {
    const patterns = await window.analyzeCandlestickPatterns(symbol, timeframe);
    const bearish = patterns.filter(p => p.signal === 'bearish');
    console.log(`📉 Found ${bearish.length} bearish patterns`);
    console.table(bearish);
    return bearish;
};

/**
 * Get strong patterns with confidence > threshold
 */
window.getStrongPatterns = async function(symbol = 'RELIANCE', threshold = 0.75) {
    const patterns = await window.analyzeCandlestickAnalyzer.fetchPatternsFromAPI(symbol);
    const strong = patterns.filter(p => (p.strength || 0) >= threshold);
    console.log(`🔥 Strong patterns (>${threshold}):`);
    console.table(strong);
    return strong;
};

/**
 * Get patterns by timeframe
 */
window.getPatternsByTimeframe = async function(symbol = 'RELIANCE', timeframe = '15mi') {
    const patterns = await window.analyzeCandlestickPatterns(symbol, timeframe);
    console.log(`📊 Patterns for ${timeframe}:`);
    console.table(patterns);
    return patterns;
};

/**
 * Get pattern details with candle data
 */
window.getPatternDetails = async function(symbol = 'RELIANCE', patternId) {
    const patterns = await window.analyzeCandlestickPatterns(symbol);
    const pattern = patterns.find(p => p.id === patternId);
    if (pattern) {
        console.log('📋 Pattern Details:', pattern);
        if (pattern.pattern_candles && pattern.pattern_candles.length > 0) {
            console.log('🕯️ Candle Data:');
            console.table(pattern.pattern_candles.map(c => ({
                'Open': c.openPrice,
                'High': c.highPrice,
                'Low': c.lowPrice,
                'Close': c.closePrice,
                'Volume': c.volume,
                'Time': new Date(c.timestamp).toLocaleString()
            })));
        }
    }
    return pattern;
};

/**
 * Monitor specific pattern
 */
window.monitorPattern = async function(symbol = 'RELIANCE', patternName, timeframe = '15mi') {
    console.log(`👀 Monitoring for ${patternName}...`);
    window.candlestickAnalyzer.enableAutoDetection(symbol, timeframe, 60000);
    console.log(`✅ Monitoring enabled for ${patternName}`);
};

/**
 * Stop monitoring patterns
 */
window.stopMonitoring = function() {
    window.candlestickAnalyzer.disableAutoDetection();
};

/**
 * Get help information
 */
window.candlestickHelp = function() {
    const help = `
🕯️ CANDLESTICK PATTERN ANALYZER - Help Guide

📊 Analysis Functions:
  analyzeCandlestickPatterns(symbol, timeframe) - Get all patterns
  showPatterns(symbol, timeframe) - Display patterns in table
  getBullishPatterns(symbol, timeframe) - Get bullish patterns only
  getBearishPatterns(symbol, timeframe) - Get bearish patterns only
  getStrongPatterns(symbol, threshold) - Get high-confidence patterns
  getPatternsByTimeframe(symbol, timeframe) - Filter by timeframe
  getPatternDetails(symbol, patternId) - Get detailed pattern info with candles
  
👀 Monitoring Functions:
  monitorPattern(symbol, patternName, timeframe) - Auto-detect specific pattern
  stopMonitoring() - Stop pattern monitoring
  
📈 Pattern Categories:
  Bullish: Bullish Engulfing, Morning Star, Hammer, etc.
  Bearish: Bearish Engulfing, Evening Star, Hanging Man, etc.
  Candlesticks: Doji, Harami, Spinning Top
  Chart Patterns: Double Bottom, Double Top, Head & Shoulders
  
💡 Example Usage:
  1. showPatterns('RELIANCE', '15mi')
  2. getBullishPatterns('ADANIENT', '1hr')
  3. getStrongPatterns('RELIANCE', 0.8)
  4. getPatternDetails('RELIANCE', 2613161)
  5. monitorPattern('TCS', 'Bullish Engulfing', '15mi')
  
⏰ Supported Timeframes:
  15mi, 30mi, 1hr, 4hr, 1day, 1week, 1month
  
📝 Notes:
  - Patterns are cached for 5 minutes
  - Auto-detection checks every 60 seconds
  - Strength ranges from 0 to 1 (0-100%)
  - Pattern data includes detailed candle information
    `;
    console.log(help);
};

// Export class to window for global access
window.CandlestickPatternAnalyzer = CandlestickPatternAnalyzer;

// Auto-initialize
console.log('🕯️ Candlestick Pattern Analyzer loaded');
console.log('Type candlestickHelp() for usage information');