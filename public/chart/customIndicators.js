// Initialize window.bars for custom indicators
window.bars = window.bars || {};

// Custom indicators configuration
window.customIndicatorsGetter = function(PineJS) {
						//console.log('🔧 Loading Open Interest indicators...');

						return Promise.resolve([
							{
								name: "Up/Down Volume",
								metainfo: {
									_metainfoVersion: 51,
									id: "Up/Down Volume@tv-basicstudies-1",
									name: "Up/Down Volume",
									description: "Up/Down Volume Indicator",
									shortDescription: "Up/Down Vol",
									is_hidden_study: false,
									is_price_study: false,
									isCustomIndicator: true,
									linkedToSeries: false,
									format: {
										type: "volume",
										precision: 0
									},
									plots: [
										{
											id: "plot_0",
											type: "columns"
										},
										{
											id: "plot_1", 
											type: "columns"
										},
										{
											id: "plot_2",
											type: "chars"
										}
									],
									defaults: {
										styles: {
											plot_0: {
												linestyle: 0,
												linewidth: 1,
												plottype: 5,        // Columns
												trackPrice: false,
												transparency: 40,
												visible: true,
												color: "#4CAF50",
											},
											plot_1: {
												linestyle: 0,
												linewidth: 1,
												plottype: 5,        // Columns
												trackPrice: false,
												transparency: 40,
												visible: true,
												color: "#F44336",
											},
											plot_2: {
												char: '-',
												location: "Absolute",
												visible: true,
												color: "#2196F3",
											}
										},
										inputs: {
											useCustomTimeframe: false,
											customTimeframe: "1"
										}
									},
									styles: {
										plot_0: {
											title: "Up Volume",
											histogramBase: 0,
											joinPoints: false
										},
										plot_1: {
											title: "Down Volume",
											histogramBase: 0,
											joinPoints: false
										},
										plot_2: {
											title: "Delta",
											histogramBase: 0,
											joinPoints: false
										}
									},
									inputs: [
										{
											id: "useCustomTimeframe",
											name: "Use Custom Timeframe",
											defval: false,
											type: "bool"
										},
										{
											id: "customTimeframe", 
											name: "Custom Timeframe",
											defval: "1",
											type: "text"
										}
									]
								},
								constructor: function() {
									this.init = function(context, inputCallback) {
										this._context = context;
										this._input = inputCallback;
										this.last_time = 0;
										
									};

									this.main = function(context, inputCallback) {
										this._context = context;
										this._input = inputCallback;
										var time = PineJS.Std.time(this._context);


										const filteredObject = Object.keys(window.bars)
										.filter( (key)=>{
											return parseFloat(key) <= time && parseFloat(key) >= this.last_time;
										}) // Filter keys based on a condition
										.reduce((acc, key) => {
											acc[key] = window.bars[key]; // Add the key-value pair to the new object
											return acc;
										}, {});
										this.last_time=time;

										var upVolume = 0;
										var downVolume = 0;
										for(var i = 0; i < Object.keys(filteredObject).length; i++){
											// console.log()
											filteredObjectThis=filteredObject[Object.keys(filteredObject)[i]]

											const close = filteredObjectThis.close;
											const volume = filteredObjectThis.volume;
											const open = filteredObjectThis.open;

											if (close > open) {
												upVolume += volume;
												downVolume -= 0;
											} else if (close < open) {
												upVolume += 0;
												downVolume -= volume;
											} else {
												upVolume += volume / 2;
												downVolume -= volume / 2;
											}
										}

										var delta=upVolume + downVolume;
										return [upVolume, downVolume, delta];
									};
								}
							},{
								name: "Zigzag2",
								metainfo: {
									_metainfoVersion: 51,
									id: "Zigzag2@tv-basicstudies-1",
									name: "Zigzag2",
									description: "Simple Zigzag Indicator",
									shortDescription: "Zigzag2",
									is_hidden_study: false,
									is_price_study: true,
									isCustomIndicator: true,
									linkedToSeries: true,
									format: {
										type: "price",
										precision: 4
									},
									plots: [
										{
											id: "plot_0",
											type: "line"
										}
									],
									defaults: {
										styles: {
											plot_0: {
												linestyle: 0,
												linewidth: 2,
												plottype: 2, // Line
												trackPrice: false,
												transparency: 0,
												visible: true,
												color: "#2196F3",
											}
										},
										inputs: {
											length: 8,
											depth: 55
										}
									},
									styles: {
										plot_0: {
											title: "Zigzag Line",
											histogramBase: 0,
											joinPoints: true
										}
									},
									inputs: [
										{
											id: "length",
											name: "Length",
											defval: 8,
											type: "integer",
											min: 1
										},
										{
											id: "depth",
											name: "Depth (%)",
											defval: 55,
											type: "integer",
											min: 1,
											max: 100
										}
									]
								},
								constructor: function() {
									this.init = function(context, inputCallback) {
										this._context = context;
										this._input = inputCallback;
										
										// Zigzag state variables
										this.lastPivotHigh = null;
										this.lastPivotLow = null;
										this.lastPivotTime = 0;
										this.lastPivotPrice = null;
										this.direction = 0; // 1 for up, -1 for down, 0 for uninitialized
										this.currentZigzagValue = null;
									};

									this.main = function(context, inputCallback) {
										this._context = context;
										this._input = inputCallback;

										var time = PineJS.Std.time(this._context);

										// Get inputs with defaults
										var length = this._input(0) || 8;
										var depth = this._input(1) || 55;

										// Get current bar data
										var currentBar = this.getCurrentBarData(time);
										if (!currentBar) {
											// Return previous value if no data available
											return [this.currentZigzagValue];
										}

										var zigzagValue = this.calculateZigzag(currentBar, length, depth);

										return [zigzagValue];
									};
									
									this.getCurrentBarData = function(time) {
										// Try to get data from window.bars first
										if (window.bars && window.bars[time]) {
											return {
												time: time,
												open: window.bars[time].open,
												high: window.bars[time].high,
												low: window.bars[time].low,
												close: window.bars[time].close
											};
										}

										// Fallback to PineJS context data
										try {
											return {
												time: time,
												open: PineJS.Std.open(this._context),
												high: PineJS.Std.high(this._context),
												low: PineJS.Std.low(this._context),
												close: PineJS.Std.close(this._context)
											};
										} catch (e) {
											console.log('Zigzag: No data available for time', time);
											return null;
										}
									};
									
									this.calculateZigzag = function(bar, length, depth) {
										var depthPercent = depth / 10000; // Convert depth to decimal (55 = 0.55%)

										// Initialize on first bar
										if (this.direction === 0) {
											this.lastPivotHigh = bar.high;
											this.lastPivotLow = bar.low;
											this.lastPivotTime = bar.time;
											this.lastPivotPrice = bar.close;
											this.direction = bar.close > bar.open ? 1 : -1;
											this.currentZigzagValue = this.lastPivotPrice;
											return this.currentZigzagValue;
										}
										
										var newPivot = false;
										var newZigzagValue = this.currentZigzagValue;
										
										if (this.direction === 1) {
											// Currently in uptrend, looking for higher high or reversal
											if (bar.high > this.lastPivotHigh) {
												// New higher high
												this.lastPivotHigh = bar.high;
												this.lastPivotTime = bar.time;
												this.lastPivotPrice = bar.high;
												newZigzagValue = bar.high;
											} else {
												// Check for reversal (significant decline from high)
												var decline = (this.lastPivotHigh - bar.low) / this.lastPivotHigh;
												if (decline >= depthPercent) {
													// Reversal confirmed - switch to downtrend
													this.direction = -1;
													this.lastPivotLow = bar.low;
													this.lastPivotTime = bar.time;
													this.lastPivotPrice = bar.low;
													newZigzagValue = bar.low;
													newPivot = true;
												}
											}
										} else {
											// Currently in downtrend, looking for lower low or reversal
											if (bar.low < this.lastPivotLow) {
												// New lower low
												this.lastPivotLow = bar.low;
												this.lastPivotTime = bar.time;
												this.lastPivotPrice = bar.low;
												newZigzagValue = bar.low;
											} else {
												// Check for reversal (significant rise from low)
												var rise = (bar.high - this.lastPivotLow) / this.lastPivotLow;
												if (rise >= depthPercent) {
													// Reversal confirmed - switch to uptrend
													this.direction = 1;
													this.lastPivotHigh = bar.high;
													this.lastPivotTime = bar.time;
													this.lastPivotPrice = bar.high;
													newZigzagValue = bar.high;
													newPivot = true;
												}
											}
										}
										
										this.currentZigzagValue = newZigzagValue;
										return this.currentZigzagValue;
									};
								}
							},
							{
								name: "Candlestick Patterns",
								metainfo: {
									_metainfoVersion: 51,
									id: "Candlestick Patterns@tv-basicstudies-1",
									name: "Candlestick Patterns",
									description: "Candlestick Patterns",
									shortDescription: "Candlestick Patterns",
									is_hidden_study: !1,
									is_price_study: !0,
									isCustomIndicator: !0,
									linkedToSeries: !0,
									format: {
										type: "price",
										precision: 2
									},
									plots: [
										{
											id: "abandoned_baby_bull_plot",
											type: "shapes"
										}, {
											id: "abandoned_baby_bear_plot",
											type: "shapes"
										}, {
											id: "dark_cloud_cover_plot",
											type: "shapes"
										}, {
											id: "doji_plot",
											type: "shapes"
										}, {
											id: "doji_star_bullish_plot",
											type: "shapes"
										}, {
											id: "doji_star_bearish_plot",
											type: "shapes"
										}, {
											id: "downside_tasuki_gap_plot",
											type: "shapes"
										}, {
											id: "dragonfly_doji_plot",
											type: "shapes"
										}, {
											id: "engulfing_bull_plot",
											type: "shapes"
										}, {
											id: "engulfing_bear_plot",
											type: "shapes"
										}, {
											id: "evening_doji_star_plot",
											type: "shapes"
										}, {
											id: "evening_star_plot",
											type: "shapes"
										}, {
											id: "falling_three_methods_plot",
											type: "shapes"
										}, {
											id: "falling_window_plot",
											type: "shapes"
										}, {
											id: "gravestone_doji_plot",
											type: "shapes"
										}, {
											id: "hammer_plot",
											type: "shapes"
										}, {
											id: "hanging_man_plot",
											type: "shapes"
										}, {
											id: "harami_cross_bull_plot",
											type: "shapes"
										}, {
											id: "harami_cross_bear_plot",
											type: "shapes"
										}, {
											id: "harami_bull_plot",
											type: "shapes"
										}, {
											id: "harami_bear_plot",
											type: "shapes"
										}, {
											id: "inverted_hammer_plot",
											type: "shapes"
										}, {
											id: "kicking_bull_plot",
											type: "shapes"
										}, {
											id: "kicking_bear_plot",
											type: "shapes"
										}, {
											id: "long_lower_shadow_plot",
											type: "shapes"
										}, {
											id: "long_upper_shadow_plot",
											type: "shapes"
										}, {
											id: "marubozu_black_plot",
											type: "shapes"
										}, {
											id: "marubozu_white_plot",
											type: "shapes"
										}, {
											id: "morning_doji_star_plot",
											type: "shapes"
										}, {
											id: "morning_star_plot",
											type: "shapes"
										}, {
											id: "on_neck_plot",
											type: "shapes"
										}, {
											id: "piercing_plot",
											type: "shapes"
										}, {
											id: "rising_three_methods_plot",
											type: "shapes"
										}, {
											id: "rising_window_plot",
											type: "shapes"
										}, {
											id: "shooting_star_plot",
											type: "shapes"
										}, {
											id: "spinning_top_black_plot",
											type: "shapes"
										}, {
											id: "spinning_top_white_plot",
											type: "shapes"
										}, {
											id: "three_black_crows_plot",
											type: "shapes"
										}, {
											id: "three_white_soldiers_plot",
											type: "shapes"
										}, {
											id: "tri_star_bull_plot",
											type: "shapes"
										}, {
											id: "tri_star_bear_plot",
											type: "shapes"
										}, {
											id: "tweezer_bottom_plot",
											type: "shapes"
										}, {
											id: "tweezer_top_plot",
											type: "shapes"
										}, {
											id: "upside_tasuki_gap_plot",
											type: "shapes"
										}
									],
									defaults: {
										styles: {
											abandoned_baby_bull_plot: {
												
												plottype: "shape_label_up",
												location: "BelowBar",
												transparency: 0,
												color: "#4CAF50",
												textColor: "white"
											},
											abandoned_baby_bear_plot: {
												
												plottype: "shape_label_down",
												location: "AboveBar",
												transparency: 0,
												color: "#F7525F",
												textColor: "white"
											},
											dark_cloud_cover_plot: {
												
												plottype: "shape_label_down",
												location: "AboveBar",
												transparency: 0,
												color: "#F7525F",
												textColor: "white"
											},
											doji_plot: {
												
												plottype: "shape_label_down",
												location: "AboveBar",
												transparency: 0,
												color: "#797b86",
												textColor: "white"
											},
											doji_star_bullish_plot: {
												
												plottype: "shape_label_up",
												location: "BelowBar",
												transparency: 0,
												color: "#4CAF50",
												textColor: "white"
											},
											doji_star_bearish_plot: {
												
												plottype: "shape_label_down",
												location: "AboveBar",
												transparency: 0,
												color: "#F7525F",
												textColor: "white"
											},
											downside_tasuki_gap_plot: {
												
												plottype: "shape_label_down",
												location: "AboveBar",
												transparency: 0,
												color: "#F7525F",
												textColor: "white"
											},
											dragonfly_doji_plot: {
												
												plottype: "shape_label_up",
												location: "BelowBar",
												transparency: 0,
												color: "#4CAF50",
												textColor: "white"
											},
											engulfing_bull_plot: {
												
												plottype: "shape_label_up",
												location: "BelowBar",
												transparency: 0,
												color: "#4CAF50",
												textColor: "white"
											},
											engulfing_bear_plot: {
												
												plottype: "shape_label_down",
												location: "AboveBar",
												transparency: 0,
												color: "#F7525F",
												textColor: "white"
											},
											evening_doji_star_plot: {
												
												plottype: "shape_label_down",
												location: "AboveBar",
												transparency: 0,
												color: "#F7525F",
												textColor: "white"
											},
											evening_star_plot: {
												
												plottype: "shape_label_down",
												location: "AboveBar",
												transparency: 0,
												color: "#F7525F",
												textColor: "white"
											},
											falling_three_methods_plot: {
												
												plottype: "shape_label_down",
												location: "AboveBar",
												transparency: 0,
												color: "#F7525F",
												textColor: "white"
											},
											falling_window_plot: {
												
												plottype: "shape_label_down",
												location: "AboveBar",
												transparency: 0,
												color: "#F7525F",
												textColor: "white"
											},
											gravestone_doji_plot: {
												
												plottype: "shape_label_down",
												location: "AboveBar",
												transparency: 0,
												color: "#F7525F",
												textColor: "white"
											},
											hammer_plot: {
												
												plottype: "shape_label_up",
												location: "BelowBar",
												transparency: 0,
												color: "#4CAF50",
												textColor: "white"
											},
											hanging_man_plot: {
												
												plottype: "shape_label_down",
												location: "AboveBar",
												transparency: 0,
												color: "#F7525F",
												textColor: "white"
											},
											harami_cross_bull_plot: {
												
												plottype: "shape_label_up",
												location: "BelowBar",
												transparency: 0,
												color: "#4CAF50",
												textColor: "white"
											},
											harami_cross_bear_plot: {
												
												plottype: "shape_label_down",
												location: "AboveBar",
												transparency: 0,
												color: "#F7525F",
												textColor: "white"
											},
											harami_bull_plot: {
												
												plottype: "shape_label_up",
												location: "BelowBar",
												transparency: 0,
												color: "#4CAF50",
												textColor: "white"
											},
											harami_bear_plot: {
												
												plottype: "shape_label_down",
												location: "AboveBar",
												transparency: 0,
												color: "#F7525F",
												textColor: "white"
											},
											inverted_hammer_plot: {
												
												plottype: "shape_label_up",
												location: "BelowBar",
												transparency: 0,
												color: "#4CAF50",
												textColor: "white"
											},
											kicking_bull_plot: {
												
												plottype: "shape_label_up",
												location: "BelowBar",
												transparency: 0,
												color: "#4CAF50",
												textColor: "white"
											},
											kicking_bear_plot: {
												
												plottype: "shape_label_down",
												location: "AboveBar",
												transparency: 0,
												color: "#F7525F",
												textColor: "white"
											},
											long_lower_shadow_plot: {
												
												plottype: "shape_label_up",
												location: "BelowBar",
												transparency: 0,
												color: "#4CAF50",
												textColor: "white"
											},
											long_upper_shadow_plot: {
												
												plottype: "shape_label_down",
												location: "AboveBar",
												transparency: 0,
												color: "#F7525F",
												textColor: "white"
											},
											marubozu_black_plot: {
												
												plottype: "shape_label_down",
												location: "AboveBar",
												transparency: 0,
												color: "#F7525F",
												textColor: "white"
											},
											marubozu_white_plot: {
												
												plottype: "shape_label_up",
												location: "BelowBar",
												transparency: 0,
												color: "#4CAF50",
												textColor: "white"
											},
											morning_doji_star_plot: {
												
												plottype: "shape_label_up",
												location: "BelowBar",
												transparency: 0,
												color: "#4CAF50",
												textColor: "white"
											},
											morning_star_plot: {
												
												plottype: "shape_label_up",
												location: "BelowBar",
												transparency: 0,
												color: "#4CAF50",
												textColor: "white"
											},
											on_neck_plot: {
												
												plottype: "shape_label_down",
												location: "AboveBar",
												transparency: 0,
												color: "#F7525F",
												textColor: "white"
											},
											piercing_plot: {
												
												plottype: "shape_label_up",
												location: "BelowBar",
												transparency: 0,
												color: "#4CAF50",
												textColor: "white"
											},
											rising_three_methods_plot: {
												
												plottype: "shape_label_up",
												location: "BelowBar",
												transparency: 0,
												color: "#4CAF50",
												textColor: "white"
											},
											rising_window_plot: {
												
												plottype: "shape_label_up",
												location: "BelowBar",
												transparency: 0,
												color: "#4CAF50",
												textColor: "white"
											},
											shooting_star_plot: {
												
												plottype: "shape_label_down",
												location: "AboveBar",
												transparency: 0,
												color: "#F7525F",
												textColor: "white"
											},
											spinning_top_black_plot: {
												
												plottype: "shape_label_down",
												location: "AboveBar",
												transparency: 0,
												color: "#797b86",
												textColor: "white"
											},
											spinning_top_white_plot: {
												
												plottype: "shape_label_up",
												location: "BelowBar",
												transparency: 0,
												color: "#797b86",
												textColor: "white"
											},
											three_black_crows_plot: {
												
												plottype: "shape_label_down",
												location: "AboveBar",
												transparency: 0,
												color: "#F7525F",
												textColor: "white"
											},
											three_white_soldiers_plot: {
												
												plottype: "shape_label_up",
												location: "BelowBar",
												transparency: 0,
												color: "#4CAF50",
												textColor: "white"
											},
											tri_star_bull_plot: {
												
												plottype: "shape_label_up",
												location: "BelowBar",
												transparency: 0,
												color: "#4CAF50",
												textColor: "white"
											},
											tri_star_bear_plot: {
												
												plottype: "shape_label_down",
												location: "AboveBar",
												transparency: 0,
												color: "#F7525F",
												textColor: "white"
											},
											tweezer_bottom_plot: {
												
												plottype: "shape_label_up",
												location: "BelowBar",
												transparency: 0,
												color: "#4CAF50",
												textColor: "white"
											},
											tweezer_top_plot: {
												
												plottype: "shape_label_down",
												location: "AboveBar",
												transparency: 0,
												color: "#F7525F",
												textColor: "white"
											},
											upside_tasuki_gap_plot: {
												
												plottype: "shape_label_up",
												location: "BelowBar",
												transparency: 0,
												color: "#4CAF50",
												textColor: "white"
											}
										},
										precision: 2,
										inputs: {
											trend: "SMA50",
											patternType: "Both",
											AbandonedBabyInput: !0,
											DarkCloudCoverInput: !0,
											DojiInput: !0,
											DojiStarInput: !0,
											DownsideTasukiGapInput: !0,
											DragonflyDojiInput: !0,
											EngulfingInput: !0,
											EveningDojiStarInput: !0,
											EveningStarInput: !0,
											FallingThreeMethodsInput: !0,
											FallingWindowInput: !0,
											GravestoneDojiInput: !0,
											HammerInput: !0,
											HangingManInput: !0,
											HaramiCrossInput: !0,
											HaramiInput: !0,
											InvertedHammerInput: !0,
											KickingInput: !0,
											LongLowerShadowInput: !0,
											LongUpperShadowInput: !0,
											MarubozuBlackInput: !0,
											MarubozuWhiteInput: !0,
											MorningDojiStarInput: !0,
											MorningStarInput: !0,
											OnNeckInput: !0,
											PiercingInput: !0,
											RisingThreeMethodsInput: !0,
											RisingWindowInput: !0,
											ShootingStarInput: !0,
											SpinningTopBlackInput: !0,
											SpinningTopWhiteInput: !0,
											ThreeBlackCrowsInput: !0,
											ThreeWhiteSoldiersInput: !0,
											TriStarInput: !0,
											TweezerBottomInput: !0,
											TweezerTopInput: !0,
											UpsideTasukiGapInput: !0
										}
									},
									styles: {
										abandoned_baby_bull_plot: {
											
											idx: 0,
											title: "Abandoned Baby Bullish",
											plottype: "shape_label_up",
											location: "BelowBar",
											transparency: 0,
											color: "#4CAF50",
											text: "Abandoned Baby Bullish",
											size: "small",
											textColor: "white"
										},
										abandoned_baby_bear_plot: {
											
											idx: 1,
											title: "Abandoned Baby Bearish",
											plottype: "shape_label_down",
											location: "AboveBar",
											transparency: 0,
											color: "#F7525F",
											text: "Abandoned Baby Bearish",
											size: "small",
											textColor: "white"
										},
										dark_cloud_cover_plot: {
											
											idx: 2,
											title: "Dark Cloud Cover",
											plottype: "shape_label_down",
											location: "AboveBar",
											transparency: 0,
											color: "#F7525F",
											text: "Dark Cloud Cover",
											size: "small",
											textColor: "white"
										},
										doji_plot: {
											
											idx: 3,
											title: "Doji",
											plottype: "shape_label_down",
											location: "AboveBar",
											transparency: 0,
											color: "#797b86",
											text: "Doji",
											size: "small",
											textColor: "white"
										},
										doji_star_bullish_plot: {
											
											idx: 4,
											title: "Doji Star Bullish",
											plottype: "shape_label_up",
											location: "BelowBar",
											transparency: 0,
											color: "#4CAF50",
											text: "Doji Star Bullish",
											size: "small",
											textColor: "white"
										},
										doji_star_bearish_plot: {
											
											idx: 5,
											title: "Doji Star Bearish",
											plottype: "shape_label_down",
											location: "AboveBar",
											transparency: 0,
											color: "#F7525F",
											text: "Doji Star Bearish",
											size: "small",
											textColor: "white"
										},
										downside_tasuki_gap_plot: {
											
											idx: 6,
											title: "Downside Tasuki Gap",
											plottype: "shape_label_down",
											location: "AboveBar",
											transparency: 0,
											color: "#F7525F",
											text: "Downside Tasuki Gap",
											size: "small",
											textColor: "white"
										},
										dragonfly_doji_plot: {
											
											idx: 7,
											title: "Dragonfly Doji",
											plottype: "shape_label_up",
											location: "BelowBar",
											transparency: 0,
											color: "#4CAF50",
											text: "Dragonfly Doji",
											size: "small",
											textColor: "white"
										},
										engulfing_bull_plot: {
											
											idx: 8,
											title: "Bullish Engulfing",
											plottype: "shape_label_up",
											location: "BelowBar",
											transparency: 0,
											color: "#4CAF50",
											text: "Bullish Engulfing",
											size: "small",
											textColor: "white"
										},
										engulfing_bear_plot: {
											
											idx: 9,
											title: "Bearish Engulfing",
											plottype: "shape_label_down",
											location: "AboveBar",
											transparency: 0,
											color: "#F7525F",
											text: "Bearish Engulfing",
											size: "small",
											textColor: "white"
										},
										evening_doji_star_plot: {
											
											idx: 10,
											title: "Evening Doji Star",
											plottype: "shape_label_down",
											location: "AboveBar",
											transparency: 0,
											color: "#F7525F",
											text: "Evening Doji Star",
											size: "small",
											textColor: "white"
										},
										evening_star_plot: {
											
											idx: 11,
											title: "Evening Star",
											plottype: "shape_label_down",
											location: "AboveBar",
											transparency: 0,
											color: "#F7525F",
											text: "Evening Star",
											size: "small",
											textColor: "white"
										},
										falling_three_methods_plot: {
											
											idx: 12,
											title: "Falling Three Methods",
											plottype: "shape_label_down",
											location: "AboveBar",
											transparency: 0,
											color: "#F7525F",
											text: "Falling Three Methods",
											size: "small",
											textColor: "white"
										},
										falling_window_plot: {
											
											idx: 13,
											title: "Falling Window",
											plottype: "shape_label_down",
											location: "AboveBar",
											transparency: 0,
											color: "#F7525F",
											text: "Falling Window",
											size: "small",
											textColor: "white"
										},
										gravestone_doji_plot: {
											
											idx: 14,
											title: "Gravestone Doji",
											plottype: "shape_label_down",
											location: "AboveBar",
											transparency: 0,
											color: "#F7525F",
											text: "Gravestone Doji",
											size: "small",
											textColor: "white"
										},
										hammer_plot: {
											
											idx: 15,
											title: "Hammer",
											plottype: "shape_label_up",
											location: "BelowBar",
											transparency: 0,
											color: "#4CAF50",
											text: "Hammer",
											size: "small",
											textColor: "white"
										},
										hanging_man_plot: {
											
											idx: 16,
											title: "Hanging Man",
											plottype: "shape_label_down",
											location: "AboveBar",
											transparency: 0,
											color: "#F7525F",
											text: "Hanging Man",
											size: "small",
											textColor: "white"
										},
										harami_cross_bull_plot: {
											
											idx: 17,
											title: "Harami Cross Bullish",
											plottype: "shape_label_up",
											location: "BelowBar",
											transparency: 0,
											color: "#4CAF50",
											text: "Harami Cross Bullish",
											size: "small",
											textColor: "white"
										},
										harami_cross_bear_plot: {
											
											idx: 18,
											title: "Harami Cross Bearish",
											plottype: "shape_label_down",
											location: "AboveBar",
											transparency: 0,
											color: "#F7525F",
											text: "Harami Cross Bearish",
											size: "small",
											textColor: "white"
										},
										harami_bull_plot: {
											
											idx: 19,
											title: "Harami Bullish",
											plottype: "shape_label_up",
											location: "BelowBar",
											transparency: 0,
											color: "#4CAF50",
											text: "Harami Bullish",
											size: "small",
											textColor: "white"
										},
										harami_bear_plot: {
											
											idx: 20,
											title: "Harami Bearish",
											plottype: "shape_label_down",
											location: "AboveBar",
											transparency: 0,
											color: "#F7525F",
											text: "Harami Bearish",
											size: "small",
											textColor: "white"
										},
										inverted_hammer_plot: {
											
											idx: 21,
											title: "Inverted Hammer",
											plottype: "shape_label_up",
											location: "BelowBar",
											transparency: 0,
											color: "#4CAF50",
											text: "Inverted Hammer",
											size: "small",
											textColor: "white"
										},
										kicking_bull_plot: {
											
											idx: 22,
											title: "Kicking Bullish",
											plottype: "shape_label_up",
											location: "BelowBar",
											transparency: 0,
											color: "#4CAF50",
											text: "Kicking Bullish",
											size: "small",
											textColor: "white"
										},
										kicking_bear_plot: {
											
											idx: 23,
											title: "Kicking Bearish",
											plottype: "shape_label_down",
											location: "AboveBar",
											transparency: 0,
											color: "#F7525F",
											text: "Kicking Bearish",
											size: "small",
											textColor: "white"
										},
										long_lower_shadow_plot: {
											
											idx: 24,
											title: "Long Lower Wicks",
											plottype: "shape_label_up",
											location: "BelowBar",
											transparency: 0,
											color: "#4CAF50",
											text: "Long Lower Wicks",
											size: "small",
											textColor: "white"
										},
										long_upper_shadow_plot: {
											
											idx: 25,
											title: "Long Upper Wicks",
											plottype: "shape_label_down",
											location: "AboveBar",
											transparency: 0,
											color: "#F7525F",
											text: "Long Upper Wicks",
											size: "small",
											textColor: "white"
										},
										marubozu_black_plot: {
											
											idx: 26,
											title: "Marubozu Bearish",
											plottype: "shape_label_down",
											location: "AboveBar",
											transparency: 0,
											color: "#F7525F",
											text: "Marubozu Bearish",
											size: "small",
											textColor: "white"
										},
										marubozu_white_plot: {
											
											idx: 27,
											title: "Marubozu Bullish",
											plottype: "shape_label_up",
											location: "BelowBar",
											transparency: 0,
											color: "#4CAF50",
											text: "Marubozu Bullish",
											size: "small",
											textColor: "white"
										},
										morning_doji_star_plot: {
											
											idx: 28,
											title: "Morning Doji Star",
											plottype: "shape_label_up",
											location: "BelowBar",
											transparency: 0,
											color: "#4CAF50",
											text: "Morning Doji Star",
											size: "small",
											textColor: "white"
										},
										morning_star_plot: {
											
											idx: 29,
											title: "Morning Star",
											plottype: "shape_label_up",
											location: "BelowBar",
											transparency: 0,
											color: "#4CAF50",
											text: "Morning Star",
											size: "small",
											textColor: "white"
										},
										on_neck_plot: {
											
											idx: 30,
											title: "On Neck",
											plottype: "shape_label_down",
											location: "AboveBar",
											transparency: 0,
											color: "#F7525F",
											text: "On Neck",
											size: "small",
											textColor: "white"
										},
										piercing_plot: {
											
											idx: 31,
											title: "Piercing",
											plottype: "shape_label_up",
											location: "BelowBar",
											transparency: 0,
											color: "#4CAF50",
											text: "Piercing",
											size: "small",
											textColor: "white"
										},
										rising_three_methods_plot: {
											
											idx: 32,
											title: "Rising Three Methods",
											plottype: "shape_label_up",
											location: "BelowBar",
											transparency: 0,
											color: "#4CAF50",
											text: "Rising Three Methods",
											size: "small",
											textColor: "white"
										},
										rising_window_plot: {
											
											idx: 33,
											title: "Rising Window",
											plottype: "shape_label_up",
											location: "BelowBar",
											transparency: 0,
											color: "#4CAF50",
											text: "Rising Window",
											size: "small",
											textColor: "white"
										},
										shooting_star_plot: {
											
											idx: 34,
											title: "Shooting Star",
											plottype: "shape_label_down",
											location: "AboveBar",
											transparency: 0,
											color: "#F7525F",
											text: "Shooting Star",
											size: "small",
											textColor: "white"
										},
										spinning_top_black_plot: {
											
											idx: 35,
											title: "Spinning Top Bearish",
											plottype: "shape_label_down",
											location: "AboveBar",
											transparency: 0,
											color: "#797b86",
											text: "Spinning Top Bearish",
											size: "small",
											textColor: "white"
										},
										spinning_top_white_plot: {
											
											idx: 36,
											title: "Spinning Top Bullish",
											plottype: "shape_label_up",
											location: "BelowBar",
											transparency: 0,
											color: "#797b86",
											text: "Spinning Top Bullish",
											size: "small",
											textColor: "white"
										},
										three_black_crows_plot: {
											
											idx: 37,
											title: "Three Black Crows",
											plottype: "shape_label_down",
											location: "AboveBar",
											transparency: 0,
											color: "#F7525F",
											text: "Three Black Crows",
											size: "small",
											textColor: "white"
										},
										three_white_soldiers_plot: {
											
											idx: 38,
											title: "Three White Soldiers",
											plottype: "shape_label_up",
											location: "BelowBar",
											transparency: 0,
											color: "#4CAF50",
											text: "Three White Soldiers",
											size: "small",
											textColor: "white"
										},
										tri_star_bull_plot: {
											
											idx: 39,
											title: "Tri Star Bullish",
											plottype: "shape_label_up",
											location: "BelowBar",
											transparency: 0,
											color: "#4CAF50",
											text: "Tri Star Bullish",
											size: "small",
											textColor: "white"
										},
										tri_star_bear_plot: {
											
											idx: 40,
											title: "Tri Star Bearish",
											plottype: "shape_label_down",
											location: "AboveBar",
											transparency: 0,
											color: "#F7525F",
											text: "Tri Star Bearish",
											size: "small",
											textColor: "white"
										},
										tweezer_bottom_plot: {
											
											idx: 41,
											title: "Tweezer Bottom",
											plottype: "shape_label_up",
											location: "BelowBar",
											transparency: 0,
											color: "#4CAF50",
											text: "Tweezer Bottom",
											size: "small",
											textColor: "white"
										},
										tweezer_top_plot: {
											
											idx: 42,
											title: "Tweezer Top",
											plottype: "shape_label_down",
											location: "AboveBar",
											transparency: 0,
											color: "#F7525F",
											text: "Tweezer Top",
											size: "small",
											textColor: "white"
										},
										upside_tasuki_gap_plot: {
											
											idx: 43,
											title: "Upside Tasuki Gap",
											plottype: "shape_label_up",
											location: "BelowBar",
											transparency: 0,
											color: "#4CAF50",
											text: "Upside Tasuki Gap",
											size: "small",
											textColor: "white"
										}
									},
									inputs: [{
											id: "trend",
											name: "Detect Trend Based On",
											type: "text",
											defval: "SMA50",
											options: ["SMA50", "SMA50,SMA200", "No Detection"],
											optionsTitles: {
												SMA50: "SMA50",
												"SMA50,SMA200": "SMA50,SMA200",
												"No Detection": "No Detection"
											}
										}, {
											id: "patternType",
											name: "Pattern Type",
											type: "text",
											defval: "Both",
											options: ["Both", "Bullish", "Bearish"],
											optionsTitles: {
												Both: "Both",
												Bullish: "Bullish",
												Bearish: "Bearish"
											}
										}, {
											id: "AbandonedBabyInput",
											name: "Abandoned Baby",
											type: "bool",
											defval: !0
										}, {
											id: "DarkCloudCoverInput",
											name: "Dark Cloud Cover",
											type: "bool",
											defval: !1
										}, {
											id: "DojiInput",
											name: "Doji",
											type: "bool",
											defval: !0
										}, {
											id: "DojiStarInput",
											name: "Doji Star",
											type: "bool",
											defval: !1
										}, {
											id: "DownsideTasukiGapInput",
											name: "Downside Tasuki Gap",
											type: "bool",
											defval: !1
										}, {
											id: "DragonflyDojiInput",
											name: "Dragonfly Doji",
											type: "bool",
											defval: !0
										}, {
											id: "EngulfingInput",
											name: "Engulfing",
											type: "bool",
											defval: !0
										}, {
											id: "EveningDojiStarInput",
											name: "Evening Doji Star",
											type: "bool",
											defval: !1
										}, {
											id: "EveningStarInput",
											name: "Evening Star",
											type: "bool",
											defval: !1
										}, {
											id: "FallingThreeMethodsInput",
											name: "Falling Three Methods",
											type: "bool",
											defval: !1
										}, {
											id: "FallingWindowInput",
											name: "Falling Window",
											type: "bool",
											defval: !1
										}, {
											id: "GravestoneDojiInput",
											name: "Gravestone Doji",
											type: "bool",
											defval: !1
										}, {
											id: "HammerInput",
											name: "Hammer",
											type: "bool",
											defval: !0
										}, {
											id: "HangingManInput",
											name: "Hanging Man",
											type: "bool",
											defval: !1
										}, {
											id: "HaramiCrossInput",
											name: "Harami Cross",
											type: "bool",
											defval: !1
										}, {
											id: "HaramiInput",
											name: "Harami",
											type: "bool",
											defval: !1
										}, {
											id: "InvertedHammerInput",
											name: "Inverted Hammer",
											type: "bool",
											defval: !1
										}, {
											id: "KickingInput",
											name: "Kicking",
											type: "bool",
											defval: !1
										}, {
											id: "LongLowerShadowInput",
											name: "Long Lower Wicks",
											type: "bool",
											defval: !1
										}, {
											id: "LongUpperShadowInput",
											name: "Long Upper Wicks",
											type: "bool",
											defval: !1
										}, {
											id: "MarubozuBlackInput",
											name: "Marubozu Bearish",
											type: "bool",
											defval: !1
										}, {
											id: "MarubozuWhiteInput",
											name: "Marubozu Bullish",
											type: "bool",
											defval: !1
										}, {
											id: "MorningDojiStarInput",
											name: "Morning Doji Star",
											type: "bool",
											defval: !1
										}, {
											id: "MorningStarInput",
											name: "Morning Star",
											type: "bool",
											defval: !1
										}, {
											id: "OnNeckInput",
											name: "On Neck",
											type: "bool",
											defval: !1
										}, {
											id: "PiercingInput",
											name: "Piercing",
											type: "bool",
											defval: !1
										}, {
											id: "RisingThreeMethodsInput",
											name: "Rising Three Methods",
											type: "bool",
											defval: !1
										}, {
											id: "RisingWindowInput",
											name: "Rising Window",
											type: "bool",
											defval: !1
										}, {
											id: "ShootingStarInput",
											name: "Shooting Star",
											type: "bool",
											defval: !1
										}, {
											id: "SpinningTopBlackInput",
											name: "Spinning Top Bearish",
											type: "bool",
											defval: !1
										}, {
											id: "SpinningTopWhiteInput",
											name: "Spinning Top Bullish",
											type: "bool",
											defval: !1
										}, {
											id: "ThreeBlackCrowsInput",
											name: "Three Black Crows",
											type: "bool",
											defval: !1
										}, {
											id: "ThreeWhiteSoldiersInput",
											name: "Three White Soldiers",
											type: "bool",
											defval: !1
										}, {
											id: "TriStarInput",
											name: "Tri Star",
											type: "bool",
											defval: !1
										}, {
											id: "TweezerBottomInput",
											name: "Tweezer Bottom",
											type: "bool",
											defval: !1
										}, {
											id: "TweezerTopInput",
											name: "Tweezer Top",
											type: "bool",
											defval: !1
										}, {
											id: "UpsideTasukiGapInput",
											name: "Upside Tasuki Gap",
											type: "bool",
											defval: !1
										}]
								},
								constructor: function() {
									this.init = function(context, inputData) {
										this._context = context,
										this._input = inputData
									}
									,
									this.main = function(ctx, inputVals) {
										// try {
										const patterns = new Array(46).fill(NaN);
										this._context = ctx,
										this._input = inputVals;
										const smaFifty = "SMA50"
										, smaCombo = "SMA50,SMA200"
										, filterType = this._input(0)
										, signalDirection = this._input(1)
										, enableBullish = "Both" === signalDirection || "Bullish" === signalDirection
										, enableBearish = "Both" === signalDirection || "Bearish" === signalDirection
										, openPrice = PineJS.Std.open(this._context)
										, highPrice = PineJS.Std.high(this._context)
										, lowPrice = PineJS.Std.low(this._context)
										, closePrice = PineJS.Std.close(this._context)
										, openVar = this._context.new_var(openPrice)
										, lowVar = this._context.new_var(lowPrice)
										, closeVar = this._context.new_var(closePrice)
										, highVar = this._context.new_var(highPrice);
										// console.log([openPrice,highPrice,lowPrice,closePrice])
										let bearishTrend = !0
										, bullishTrend = !0;
										const bearishSignal = this._context.new_var(1)
										, bullishSignal = this._context.new_var(1);
										if (filterType === smaFifty) {
											// console.log('hi')
											const sma50 = PineJS.Std.sma(closeVar, 50, this._context);
											bearishTrend = closePrice < sma50,
											bullishTrend = closePrice > sma50,
											bearishSignal.set(bearishTrend ? 1 : 0),
											bullishSignal.set(bullishTrend ? 1 : 0)
										} else if (filterType === smaCombo) {
											const sma50 = PineJS.Std.sma(closeVar, 50, this._context)
											, sma200 = PineJS.Std.sma(closeVar, 200, this._context);
											bearishTrend = closePrice < sma50 && sma50 < sma200,
											bullishTrend = closePrice > sma50 && sma50 > sma200,
											bearishSignal.set(bearishTrend ? 1 : 0),
											bullishSignal.set(bullishTrend ? 1 : 0)
										} else
											bearishSignal.set(1),
											bullishSignal.set(1);

										// console.log(bearishSignal,bullishSignal)
										const emaPeriod = 14
										, shadowThreshold = 5
										, balancePercent = 100
										, bodyPercentage = 5
										, multiplier = 2
										, upperBound = Math.max(openPrice, closePrice)
										, upperVar = this._context.new_var(upperBound)
										, lowerBound = Math.min(openPrice, closePrice)
										, lowerVar = this._context.new_var(lowerBound)
										, bodySize = upperBound - lowerBound
										, bodySizeVar = this._context.new_var(bodySize)
										, emaBody = PineJS.Std.ema(bodySizeVar, emaPeriod, this._context)
										, smallBody = bodySize < emaBody
										, smallBodyVar = this._context.new_var(smallBody ? 1 : 0)
										, largeBody = bodySize > emaBody
										, largeBodyVar = this._context.new_var(largeBody ? 1 : 0)
										, upperShadow = highPrice - upperBound
										, upperShadowVar = this._context.new_var(upperShadow)
										, lowerShadow = lowerBound - lowPrice
										, lowerShadowVar = this._context.new_var(lowerShadow)
										, longUpperShadow = upperShadow > shadowThreshold / 100 * bodySize
										, longLowerShadow = lowerShadow > shadowThreshold / 100 * bodySize
										, greenCandle = openPrice < closePrice
										, greenVar = this._context.new_var(greenCandle ? 1 : 0)
										, redCandle = openPrice > closePrice
										, redVar = this._context.new_var(redCandle ? 1 : 0)
										, totalRange = highPrice - lowPrice
										, rangeVar = this._context.new_var(totalRange)
										, midPoint = bodySize / 2 + lowerBound
										, midVar = this._context.new_var(midPoint)
										, upperRatio = Math.abs(upperShadow - lowerShadow) / lowerShadow * 100
										, lowerRatio = Math.abs(lowerShadow - upperShadow) / upperShadow * 100
										, shadowBalance = upperShadow === lowerShadow || upperRatio < balancePercent && lowerRatio < balancePercent
										, isSmallBody = totalRange > 0 && bodySize <= totalRange * (bodyPercentage / 100)
										, smallBodyPattern = this._context.new_var(isSmallBody ? 1 : 0)
										, dojiPattern = isSmallBody && shadowBalance
										, dojiVar = this._context.new_var(dojiPattern ? 1 : 0)
										, pattern1Enabled = this._input(2);
										
										// console.log(longLowerShadow)
										if (pattern1Enabled && enableBullish) {
											const bearFilter = bearishSignal.get(2)
											, redPrev = redVar.get(2)
											, smallPrev = smallBodyPattern.get(1)
											, lowPrev = lowVar.get(2)
											, highCurr = highVar.get(1)
											, isGreen = greenCandle
											, currentLow = lowPrice
											, prevHigh = highVar.get(1);
											bearFilter && redPrev && smallPrev && lowPrev > highCurr && isGreen && prevHigh < currentLow && (patterns[0] = 1)
										}
										if (pattern1Enabled && enableBearish) {
											const bullFilter = bullishSignal.get(2)
											, greenPrev = greenVar.get(2)
											, smallPrev = smallBodyPattern.get(1)
											, highPrev = highVar.get(2)
											, lowCurr = lowVar.get(1);
											bullFilter && greenPrev && smallPrev && highPrev < lowCurr && redCandle && lowCurr > highPrice && (patterns[1] = 1)
										}
										if (this._input(3) && enableBearish) {
											const bullFilter = bullishSignal.get(1)
											, greenPrev = greenVar.get(1)
											, largePrev = largeBodyVar.get(1)
											, highPrev = highVar.get(1)
											, midPrev = midVar.get(1)
											, openPrev = openVar.get(1);
											bullFilter && greenPrev && largePrev && redCandle && openPrice >= highPrev && closePrice < midPrev && closePrice > openPrev && (patterns[2] = 1)
										}
										if (this._input(4)) {
											!dojiPattern || isSmallBody && upperShadow <= bodySize || isSmallBody && lowerShadow <= bodySize || (patterns[3] = 1)
										}
										const pattern5Enabled = this._input(5);
										if (pattern5Enabled && enableBullish) {
											const bearFilter = bearishTrend
											, redPrev = redVar.get(1)
											, largePrev = largeBodyVar.get(1)
											, smallCurr = isSmallBody
											, upperCurr = upperBound
											, lowerPrev = lowerVar.get(1);
											bearFilter && redPrev && largePrev && smallCurr && upperCurr < lowerPrev && (patterns[4] = 1)
										}
										if (pattern5Enabled && enableBearish) {
											const bullFilter = bullishTrend
											, greenPrev = greenVar.get(1)
											, largePrev = largeBodyVar.get(1)
											, smallCurr = isSmallBody
											, lowerCurr = lowerBound
											, upperPrev = upperVar.get(1);
											bullFilter && greenPrev && largePrev && smallCurr && lowerCurr > upperPrev && (patterns[5] = 1)
										}
										if (this._input(6) && enableBearish) {
											const largePrev2 = largeBodyVar.get(2)
											, smallPrev1 = smallBodyVar.get(1)
											, bearFilter = bearishTrend
											, redPrev2 = redVar.get(2)
											, upperPrev1 = upperVar.get(1)
											, lowerPrev2 = lowerVar.get(2)
											, redPrev1 = redVar.get(1);
											largePrev2 && smallPrev1 && bearFilter && redPrev2 && upperPrev1 < lowerPrev2 && redPrev1 && greenCandle && upperBound <= lowerPrev2 && upperBound >= upperPrev1 && (patterns[6] = 1)
										}
										if (this._input(7) && enableBullish) {
											isSmallBody && upperShadow <= bodySize && (patterns[7] = 1)
										}
										const pattern8Enabled = this._input(8);
										if (pattern8Enabled && enableBullish) {
											const bearFilter = bearishTrend
											, isGreen = greenCandle
											, isLarge = largeBody
											, redPrev = redVar.get(1)
											, smallPrev = smallBodyVar.get(1)
											, currClose = closePrice
											, prevOpen = openVar.get(1)
											, currOpen = openPrice
											, prevClose = closeVar.get(1);
											bearFilter && isGreen && isLarge && redPrev && smallPrev && currClose >= prevOpen && currOpen <= prevClose && (currClose > prevOpen || currOpen < prevClose) && (patterns[8] = 1)
										}
										if (pattern8Enabled && enableBearish) {
											const bullFilter = bullishTrend
											, isRed = redCandle
											, isLarge = largeBody
											, greenPrev = greenVar.get(1)
											, smallPrev = smallBodyVar.get(1)
											, currClose = closePrice
											, prevOpen = openVar.get(1)
											, currOpen = openPrice
											, prevClose = closeVar.get(1);
											bullFilter && isRed && isLarge && greenPrev && smallPrev && currClose <= prevOpen && currOpen >= prevClose && (currClose < prevOpen || currOpen > prevClose) && (patterns[9] = 1)
										}
										if (this._input(9) && enableBearish) {
											const largePrev2 = largeBodyVar.get(2)
											, smallPrev1 = smallBodyPattern.get(1)
											, isLarge = largeBody
											, bullFilter = bullishTrend
											, greenPrev2 = greenVar.get(2)
											, isRed = redCandle
											, midPrev2 = midVar.get(2)
											, lowerCurr = lowerBound
											, lowerPrev1 = lowerVar.get(1)
											, upperPrev2 = upperVar.get(2);
											largePrev2 && smallPrev1 && isLarge && bullFilter && greenPrev2 && lowerPrev1 > upperPrev2 && isRed && lowerCurr <= midPrev2 && lowerCurr > lowerPrev1 && lowerPrev1 > upperPrev2 && (patterns[10] = 1)
										}
										if (this._input(10) && enableBearish) {
											const largePrev2 = largeBodyVar.get(2)
											, smallPrev1 = smallBodyVar.get(1)
											, isLarge = largeBody
											, bullFilter = bullishTrend
											, greenPrev2 = greenVar.get(2)
											, isRed = redCandle
											, lowerPrev1 = lowerVar.get(1)
											, lowerPrev2 = lowerVar.get(2)
											, upperPrev2 = upperVar.get(2)
											, upperCurr = upperBound
											, lowerCurr = lowerBound
											, midPrev2 = midVar.get(2);
											largePrev2 && smallPrev1 && isLarge && bullFilter && greenPrev2 && lowerPrev1 > upperPrev2 && isRed && lowerCurr <= midPrev2 && lowerCurr > lowerPrev2 && lowerPrev1 > upperCurr && (patterns[11] = 1)
										}
										if (this._input(11) && enableBearish) {
											const bearFilter4 = bearishSignal.get(4)
											, large4 = largeBodyVar.get(4)
											, red4 = redVar.get(4)
											, small3 = smallBodyVar.get(3)
											, green3 = greenVar.get(3)
											, open3 = openVar.get(3)
											, close3 = closeVar.get(3)
											, small2 = smallBodyVar.get(2)
											, green2 = greenVar.get(2)
											, open2 = openVar.get(2)
											, close2 = closeVar.get(2)
											, small1 = smallBodyVar.get(1)
											, green1 = greenVar.get(1)
											, open1 = openVar.get(1)
											, close1 = closeVar.get(1)
											, low4 = lowVar.get(4)
											, high4 = highVar.get(4)
											, close4 = closeVar.get(4);
											bearFilter4 && large4 && red4 && small3 && green3 && open3 > low4 && close3 < high4 && small2 && green2 && open2 > low4 && close2 < high4 && small1 && green1 && open1 > low4 && close1 < high4 && largeBody && redCandle && closePrice < close4 && (patterns[12] = 1)
										}
										if (this._input(12) && enableBearish) {
											const bearFilter1 = bearishSignal.get(1)
											, prevRange = highVar.get(1) - lowVar.get(1)
											, currRange = totalRange
											, prevLow = lowVar.get(1);
											bearFilter1 && 0 !== currRange && 0 !== prevRange && highPrice < prevLow && (patterns[13] = 1)
										}
										if (this._input(13) && enableBearish) {
											isSmallBody && lowerShadow <= bodySize && (patterns[14] = 1)
										}
										if (this._input(14) && enableBullish) {
											smallBody && bodySize > 0 && lowerBound > (highPrice + lowPrice) / 2 && lowerShadow >= multiplier * bodySize && !longUpperShadow && bearishTrend && (patterns[15] = 1)
										}
										if (this._input(15) && enableBearish) {
											smallBody && bodySize > 0 && lowerBound > (highPrice + lowPrice) / 2 && lowerShadow >= multiplier * bodySize && !longUpperShadow && bullishTrend && (patterns[16] = 1)
										}
										const pattern16Enabled = this._input(16);
										if (pattern16Enabled && enableBullish) {
											const largePrev = largeBodyVar.get(1)
											, redPrev = redVar.get(1)
											, bearFilter = bearishSignal.get(1)
											, smallCurr = isSmallBody
											, highWithin = highPrice <= upperVar.get(1)
											, lowWithin = lowPrice >= lowerVar.get(1);
											largePrev && redPrev && bearFilter && smallCurr && highWithin && lowWithin && (patterns[17] = 1)
										}
										if (pattern16Enabled && enableBearish) {
											const largePrev = largeBodyVar.get(1)
											, greenPrev = greenVar.get(1)
											, bullFilter = bullishSignal.get(1)
											, smallCurr = isSmallBody
											, highWithin = highPrice <= upperVar.get(1)
											, lowWithin = lowPrice >= lowerVar.get(1);
											largePrev && greenPrev && bullFilter && smallCurr && highWithin && lowWithin && (patterns[18] = 1)
										}
										const pattern17Enabled = this._input(17);
										if (pattern17Enabled && enableBullish) {
											const largePrev = largeBodyVar.get(1)
											, redPrev = redVar.get(1)
											, bearFilter = bearishSignal.get(1)
											, isGreen = greenCandle
											, isSmall = smallBody
											, highWithin = highPrice <= upperVar.get(1)
											, lowWithin = lowPrice >= lowerVar.get(1);
											largePrev && redPrev && bearFilter && isGreen && isSmall && highWithin && lowWithin && (patterns[19] = 1)
										}
										if (pattern17Enabled && enableBearish) {
											const largePrev = largeBodyVar.get(1)
											, greenPrev = greenVar.get(1)
											, bullFilter = bullishSignal.get(1)
											, isRed = redCandle
											, isSmall = smallBody
											, highWithin = highPrice <= upperVar.get(1)
											, lowWithin = lowPrice >= lowerVar.get(1);
											largePrev && greenPrev && bullFilter && isRed && isSmall && highWithin && lowWithin && (patterns[20] = 1)
										}
										if (this._input(18) && enableBullish) {
											// console.log(smallBody , bodySize > 0 , upperBound < (highPrice + lowPrice) / 2 , upperShadow >= multiplier * bodySize , !longLowerShadow , bearishTrend , (patterns[21] = 1))
											smallBody && bodySize > 0 && upperBound < (highPrice + lowPrice) / 2 && upperShadow >= multiplier * bodySize && !longLowerShadow && bearishTrend && (patterns[21] = 1)
										}
										const pattern19Enabled = this._input(19);
										if (pattern19Enabled && enableBullish) {
											const threshold = 5
											, conditions = largeBody && highPrice - upperBound <= threshold / 100 * bodySize && lowerBound - lowPrice <= threshold / 100 * bodySize && greenCandle
											, highDiff = highVar.get(1) - upperVar.get(1)
											, lowDiff = lowerVar.get(1) - lowVar.get(1)
											, bodyPrev = bodySizeVar.get(1)
											, largePrev = largeBodyVar.get(1)
											, redPrev = redVar.get(1);
											conditions && (largePrev && highDiff <= threshold / 100 * bodyPrev && lowDiff <= threshold / 100 * bodyPrev && redPrev) && highVar.get(1) < lowPrice && (patterns[22] = 1)
										}
										// console.log(pattern19Enabled,enableBearish)
										if (pattern19Enabled && enableBearish) {
											const threshold = 5
											, conditions = largeBody && highPrice - upperBound <= threshold / 100 * bodySize && lowerBound - lowPrice <= threshold / 100 * bodySize && redCandle
											, highDiff = highVar.get(1) - upperVar.get(1)
											, lowDiff = lowerVar.get(1) - lowVar.get(1)
											, bodyPrev = bodySizeVar.get(1)
											, largePrev = largeBodyVar.get(1)
											, greenPrev = greenVar.get(1);
											// console.log(conditions, [largePrev , highDiff <= threshold / 100 * bodyPrev ,lowDiff <= threshold / 100 * bodyPrev , greenPrev] , lowVar.get(1) > highPrice  )
											conditions && (largePrev && highDiff <= threshold / 100 * bodyPrev && lowDiff <= threshold / 100 * bodyPrev && greenPrev) && lowVar.get(1) > highPrice && (patterns[23] = 1)
										}
										if (this._input(20) && enableBullish) {
											lowerShadow > totalRange / 100 * 75 && (patterns[24] = 1)
										}
										if (this._input(21) && enableBearish) {
											upperShadow > totalRange / 100 * 75 && (patterns[25] = 1)
										}
										if (this._input(22) && enableBearish) {
											const threshold = 5;
											redCandle && largeBody && upperShadow <= threshold / 100 * bodySize && lowerShadow <= threshold / 100 * bodySize && (patterns[26] = 1)
										}
										if (this._input(23) && enableBullish) {
											const threshold = 5;
											greenCandle && largeBody && upperShadow <= threshold / 100 * bodySize && lowerShadow <= threshold / 100 * bodySize && (patterns[27] = 1)
										}
										if (this._input(24) && enableBullish) {
											const largePrev2 = largeBodyVar.get(2)
											, smallPrev1 = smallBodyPattern.get(1)
											, isLarge = largeBody
											, bearFilter = bearishTrend
											, redPrev2 = redVar.get(2)
											, upperPrev1 = upperVar.get(1)
											, lowerPrev2 = lowerVar.get(2)
											, isGreen = greenCandle
											, upperCurr = upperBound
											, midPrev2 = midVar.get(2)
											, upperPrev2 = upperVar.get(2);
											largePrev2 && smallPrev1 && isLarge && bearFilter && redPrev2 && upperPrev1 < lowerPrev2 && isGreen && upperCurr >= midPrev2 && upperCurr < upperPrev2 && upperPrev1 < lowerBound && (patterns[28] = 1)
										}
										if (this._input(25) && enableBullish) {
											const largePrev2 = largeBodyVar.get(2)
											, smallPrev1 = smallBodyVar.get(1)
											, isLarge = largeBody
											, bearFilter = bearishTrend
											, redPrev2 = redVar.get(2)
											, upperPrev1 = upperVar.get(1)
											, lowerPrev2 = lowerVar.get(2)
											, isGreen = greenCandle
											, upperCurr = upperBound
											, midPrev2 = midVar.get(2)
											, upperPrev2 = upperVar.get(2);
											largePrev2 && smallPrev1 && isLarge && bearFilter && redPrev2 && upperPrev1 < lowerPrev2 && isGreen && upperCurr >= midPrev2 && upperCurr < upperPrev2 && upperPrev1 < lowerBound && (patterns[29] = 1)
										}
										if (this._input(26) && enableBullish) {
											const bearFilter = bearishTrend
											, redPrev = redVar.get(1)
											, largePrev = largeBodyVar.get(1)
											, isGreen = greenCandle
											, isSmall = smallBody
											, currOpen = openPrice
											, prevClose = closeVar.get(1)
											, currClose = closePrice
											, prevLow = lowVar.get(1)
											, currRange = totalRange
											, emaVal = emaBody
											, closeDiff = Math.abs(currClose - prevLow);
											bearFilter && redPrev && largePrev && isGreen && currOpen < prevClose && isSmall && 0 !== currRange && closeDiff <= .05 * emaVal && (patterns[30] = 1)
										}
										if (this._input(27) && enableBullish) {
											const bearFilter = bearishSignal.get(1)
											, redPrev = redVar.get(1)
											, largePrev = largeBodyVar.get(1)
											, isGreen = greenCandle
											, currOpen = openPrice
											, currClose = closePrice
											, prevLow = lowVar.get(1)
											, prevOpen = openVar.get(1)
											, midPrev = midVar.get(1);
											bearFilter && redPrev && largePrev && isGreen && currOpen <= prevLow && currClose > midPrev && currClose < prevOpen && (patterns[31] = 1)
										}
										if (this._input(28) && enableBullish) {
											const bullFilter4 = bullishSignal.get(4)
											, large4 = largeBodyVar.get(4)
											, green4 = greenVar.get(4)
											, small3 = smallBodyVar.get(3)
											, red3 = redVar.get(3)
											, open3 = openVar.get(3)
											, close3 = closeVar.get(3)
											, small2 = smallBodyVar.get(2)
											, red2 = redVar.get(2)
											, open2 = openVar.get(2)
											, close2 = closeVar.get(2)
											, small1 = smallBodyVar.get(1)
											, red1 = redVar.get(1)
											, open1 = openVar.get(1)
											, close1 = closeVar.get(1)
											, isLarge = largeBody
											, isGreen = greenCandle
											, currClose = closePrice
											, high4 = highVar.get(4)
											, low4 = lowVar.get(4)
											, close4 = closeVar.get(4);
											bullFilter4 && large4 && green4 && small3 && red3 && open3 < high4 && close3 > low4 && small2 && red2 && open2 < high4 && close2 > low4 && small1 && red1 && open1 < high4 && close1 > low4 && isLarge && isGreen && currClose > close4 && (patterns[32] = 1)
										}
										if (this._input(29) && enableBullish) {
											const bullFilter = bullishSignal.get(1)
											, currRange = totalRange
											, prevRange = rangeVar.get(1)
											, currLow = lowPrice
											, prevHigh = highVar.get(1);
											bullFilter && 0 !== currRange && 0 !== prevRange && currLow > prevHigh && (patterns[33] = 1)
										}
										if (this._input(30) && enableBearish) {
											smallBody && bodySize > 0 && upperBound < (highPrice + lowPrice) / 2 && upperShadow >= multiplier * bodySize && !longLowerShadow && bullishTrend && (patterns[34] = 1)
										}
										if (this._input(31)) {
											const threshold = totalRange / 100 * 34;
											lowerShadow >= threshold && upperShadow >= threshold && !isSmallBody && redCandle && (patterns[35] = 1)
										}
										if (this._input(32)) {
											const threshold = totalRange / 100 * 34;
											lowerShadow >= threshold && upperShadow >= threshold && !isSmallBody && greenCandle && (patterns[36] = 1)
										}
										if (this._input(33) && enableBearish) {
											const threshold = 5
											, isLarge = largeBody
											, largePrev1 = largeBodyVar.get(1)
											, largePrev2 = largeBodyVar.get(2)
											, isRed = redCandle
											, redPrev1 = redVar.get(1)
											, redPrev2 = redVar.get(2)
											, lowerCurr = lowerShadow
											, lowerPrev1 = lowerShadowVar.get(1)
											, lowerPrev2 = lowerShadowVar.get(2)
											, rangeCurr = totalRange
											, rangePrev1 = rangeVar.get(1)
											, rangePrev2 = rangeVar.get(2)
											, closeCurr = closePrice
											, closePrev1 = closeVar.get(1)
											, closePrev2 = closeVar.get(2)
											, openCurr = openPrice
											, openPrev1 = openVar.get(1)
											, openPrev2 = openVar.get(2);
											isLarge && largePrev1 && largePrev2 && isRed && redPrev1 && redPrev2 && rangeCurr * threshold / 100 > lowerCurr && rangePrev1 * threshold / 100 > lowerPrev1 && rangePrev2 * threshold / 100 > lowerPrev2 && (closeCurr < closePrev1 && closePrev1 < closePrev2 && openCurr > closePrev1 && openCurr < openPrev1 && openPrev1 > closePrev2 && openPrev1 < openPrev2) && (patterns[37] = 1)
										}
										if (this._input(34) && enableBullish) {
											const threshold = 5
											, isLarge = largeBody
											, largePrev1 = largeBodyVar.get(1)
											, largePrev2 = largeBodyVar.get(2)
											, isGreen = greenCandle
											, greenPrev1 = greenVar.get(1)
											, greenPrev2 = greenVar.get(2)
											, rangeCurr = totalRange
											, rangePrev1 = rangeVar.get(1)
											, rangePrev2 = rangeVar.get(2)
											, upperCurr = upperShadow
											, upperPrev1 = upperShadowVar.get(1)
											, upperPrev2 = upperShadowVar.get(2)
											, closeCurr = closePrice
											, closePrev1 = closeVar.get(1)
											, closePrev2 = closeVar.get(2)
											, openCurr = openPrice
											, openPrev1 = openVar.get(1)
											, openPrev2 = openVar.get(2);
											 
											isLarge && largePrev1 && largePrev2 && isGreen && greenPrev1 && greenPrev2 && rangeCurr * threshold / 100 > upperCurr && rangePrev1 * threshold / 100 > upperPrev1 && rangePrev2 * threshold / 100 > upperPrev2 && (closeCurr > closePrev1 && closePrev1 > closePrev2 && openCurr < closePrev1 && openCurr > openPrev1 && openPrev1 < closePrev2 && openPrev1 > openPrev2) && (patterns[38] = 1)

										}

											
										const pattern35Enabled = this._input(35);
										if (pattern35Enabled && enableBullish) {
											const currentDoji = dojiPattern
											, dojiPrev1 = dojiVar.get(1)
											, dojiPrev2 = dojiVar.get(2)
											, lowerCurr = lowerBound
											, upperPrev1 = upperVar.get(1)
											, lowerPrev2 = lowerVar.get(2)
											, bearFilter2 = bearishSignal.get(2);
											currentDoji && dojiPrev1 && dojiPrev2 && bearFilter2 && lowerPrev2 > upperPrev1 && upperPrev1 < lowerCurr && (patterns[39] = 1)
										}
										if (pattern35Enabled && enableBearish) {
											const currentDoji = dojiPattern
											, dojiPrev1 = dojiVar.get(1)
											, dojiPrev2 = dojiVar.get(2)
											, bullFilter2 = bullishSignal.get(2)
											, lowerCurr = lowerBound
											, lowerPrev1 = lowerVar.get(1)
											, upperPrev1 = upperVar.get(1)
											, upperPrev2 = upperVar.get(2);
											currentDoji && dojiPrev1 && dojiPrev2 && bullFilter2 && upperPrev2 < lowerPrev1 && lowerCurr > upperPrev1 && (patterns[40] = 1)
										}
										if (this._input(36) && enableBullish) {
											const bearFilter = bearishSignal.get(1)
											, smallCurr = isSmallBody
											, longUpper = longUpperShadow
											, longLower = longLowerShadow
											, lowCurr = lowVar.get(0)
											, lowPrev = lowVar.get(1)
											, lowBalance = Math.abs(lowCurr - lowPrev) <= .05 * emaBody
											, redPrev = redVar.get(1)
											, isGreen = greenCandle
											, largePrev = largeBodyVar.get(1);
											bearFilter && (!smallCurr || longUpper && longLower) && lowBalance && redPrev && isGreen && largePrev && (patterns[41] = 1)
										}
										if (this._input(37) && enableBearish) {
											const bullFilter = bullishSignal.get(1)
											, smallCurr = isSmallBody
											, longUpper = longUpperShadow
											, longLower = longLowerShadow
											, highCurr = highVar.get(0)
											, highPrev = highVar.get(1)
											, highBalance = Math.abs(highCurr - highPrev) <= .05 * emaBody
											, greenPrev = greenVar.get(1)
											, isRed = redCandle
											, largePrev = largeBodyVar.get(1);
											bullFilter && (!smallCurr || longUpper && longLower) && highBalance && greenPrev && isRed && largePrev && (patterns[42] = 1)
										}
										if (this._input(38) && enableBullish) {
											const largePrev2 = largeBodyVar.get(2)
											, greenPrev2 = greenVar.get(2)
											, smallPrev1 = smallBodyVar.get(1)
											, greenPrev1 = greenVar.get(1)
											, lowerPrev1 = lowerVar.get(1)
											, upperPrev2 = upperVar.get(2);
											largePrev2 && smallPrev1 && bullishTrend && greenPrev2 && greenPrev1 && redCandle && lowerPrev1 > upperPrev2 && (lowerBound >= upperPrev2 && lowerBound <= lowerPrev1) && (patterns[43] = 1)
										}
										return patterns
									}
								}
							},
							
							{
								name: 'Open Interest',
								metainfo: {
									_metainfoVersion: 51,
									id: 'openinterest@tv-basicstudies-1',
									name: 'Open Interest',
									description: 'Open Interest Indicator',
									shortDescription: 'OI',
									isCustomIndicator: true,
									is_price_study: false,
									format: {
										type: 'price',
										precision: 0,
									},
									plots: [
										{
											id: 'plot_0',
											type: 'line',
										}
									],
									defaults: {
										styles: {
											plot_0: {
												linestyle: 0,
												linewidth: 2,
												plottype: 0,
												trackPrice: false,
												transparency: 0,
												visible: true,
												color: '#2196F3'
											}
										},
										precision: 0,
										inputs: {
										}
									},
									styles: {
										plot_0: {
											title: 'Open Interest',
											histogramBase: 0,
										}
									},
									inputs: [
									]
								},
								constructor: function() {
									this.main = function(context, inputCallback) {
										this._context = context;
										this._input = inputCallback;

										this._context.select_sym(0);
										// //console.log(/)
										// Get close price using PineJS
										const close = PineJS.Std.close(this._context);
										const volume = PineJS.Std.volume(this._context);

										if(window.bars[PineJS.Std.time(this._context)]){
											var openInterest =window.bars[PineJS.Std.time(this._context)].oi
										}else{
											var openInterest =0
										}

										//console.log('OI Calculated:', openInterest, 'Close:', close, 'Volume:', volume);

										return [openInterest];
									};
								}
							},
							// Day Money Flow Joint Indicator
							{
								name: "Day Money Flow Joint",
								metainfo: {
									_metainfoVersion: 51,
									id: "Day Money Flow Joint@tv-basicstudies-1",
									name: "Day Money Flow Joint",
									description: "Day Money Flow Joint - Call vs Put Options Money Flow Analysis",
									shortDescription: "Day Money Flow Joint",
									is_hidden_study: false,
									is_price_study: false,
									isCustomIndicator: true,
									linkedToSeries: false,
									format: {
										type: "price",
										precision: 2
									},
									plots: [
										{id: "plot_0", type: "line"},  // Call Money Flow (Daily)
										{id: "plot_1", type: "line"},  // Put Money Flow (Daily)
										{id: "plot_2", type: "line"},  // Net Money Flow (Daily)
									],
									defaults: {
										styles: {
											plot_0: {
												linestyle: 0,
												linewidth: 2,
												plottype: 0,
												trackPrice: false,
												transparency: 0,
												visible: true,
												color: "#00FF00"  // Green for Call Money Flow
											},
											plot_1: {
												linestyle: 0,
												linewidth: 2,
												plottype: 0,
												trackPrice: false,
												transparency: 0,
												visible: true,
												color: "#FF0000"  // Red for Put Money Flow
											},
											plot_2: {
												linestyle: 2,
												linewidth: 1,
												plottype: 0,
												trackPrice: false,
												transparency: 0,
												visible: true,
												color: "#FFFF00"  // Yellow for Zero Line
											}
										},
										inputs: {
											ema_length: 9,
											show_ema: true,
											show_background: true,
											strike:"0"
										}
									},
									styles: {
										plot_0: {
											title: "Call Money Flow (Daily)",
											histogramBase: 0,
											joinPoints: false
										},
										plot_1: {
											title: "Put Money Flow (Daily)",
											histogramBase: 0,
											joinPoints: false
										},
										plot_2: {
											title: "Zero Line",
											histogramBase: 0,
											joinPoints: false
										}
									},
									inputs: [
										{
											id: "strike",
											name: "Strike",
											defval: "0",
											type: "text"
										},
										{
											id: "show_background",
											name: "Show Background Color",
											defval: true,
											type: "bool"
										}
									]
								},
								constructor: function() {
									this.init = function(context, inputCallback) {
										this._context = context;
										this._input = inputCallback;

										this._strike = this._input(0) || '0';
										this._show_background = this._input(1) !== false;

										// Initialize variables
										this._day_money_flow_1 = 0;
										this._day_money_flow_2 = 0;
										this._cumulative_flow_1 = 0;
										this._cumulative_flow_2 = 0;
										this._prev_avg_1 = null;
										this._prev_avg_2 = null;
										this._prev_flow_1 = 0;
										this._prev_flow_2 = 0;
										this._current_day = null;

										// EMA calculation arrays
										this._ema_values_1 = [];
										this._ema_values_2 = [];
										this._cumulative_ema_values_1 = [];
										this._cumulative_ema_values_2 = [];
										this._cumulative_net_ema_values = [];
									};

									this.main = function(context, inputCallback) {
										this._context = context;
										this._input = inputCallback;

										
										// Use PineJS to get OHLCV data
										if(this._strike=='0'){

											this._context.select_sym(0);
											var open = PineJS.Std.open(this._context);
											var close = PineJS.Std.close(this._context);
											var volume = PineJS.Std.volume(this._context);
											var time = PineJS.Std.time(this._context);
										}else{

											this._context.select_sym(0);
											var open = PineJS.Std.open(this._context);
											var close = PineJS.Std.close(this._context);
											var volume = PineJS.Std.volume(this._context);
											var time = PineJS.Std.time(this._context);
										}

										// Check for new day
										const currentDay = new Date(time * 1000).toDateString();
										const isNewDay = this._current_day !== currentDay;

										if (isNewDay) {
											this._current_day = currentDay;
											this._day_money_flow_1 = 0;
											this._day_money_flow_2 = 0;
											this._prev_avg_1 = null;
											this._prev_avg_2 = null;
											this._prev_flow_1 = 0;
											this._prev_flow_2 = 0;
										}

										// Calculate money flow for symbol 1 (Call)
										const avg_price_1 = (open + close) / 2;
										let current_flow_1 = 0;

										if (this._prev_avg_1 === null) {
											// First candle of the day
											this._prev_avg_1 = avg_price_1;
											current_flow_1 = volume * avg_price_1;
											this._day_money_flow_1 = current_flow_1;
											this._prev_flow_1 = current_flow_1;
										} else {
											// Subsequent candles
											if (avg_price_1 > this._prev_avg_1) {
												current_flow_1 = volume * avg_price_1;
											} else if (avg_price_1 < this._prev_avg_1) {
												current_flow_1 = -volume * avg_price_1;
											} else {
												// When prices are equal, maintain previous direction
												current_flow_1 = this._prev_flow_1 > 0 ? volume * avg_price_1 : -volume * avg_price_1;
											}
											this._day_money_flow_1 += current_flow_1;
											this._prev_avg_1 = avg_price_1;
											this._prev_flow_1 = current_flow_1;
										}

										// Calculate money flow for symbol 2 (Put) - same logic
										const avg_price_2 = (open + close) / 2;
										let current_flow_2 = 0;

										if (this._prev_avg_2 === null) {
											this._prev_avg_2 = avg_price_2;
											current_flow_2 = volume * avg_price_2;
											this._day_money_flow_2 = current_flow_2;
											this._prev_flow_2 = current_flow_2;
										} else {
											if (avg_price_2 > this._prev_avg_2) {
												current_flow_2 = volume * avg_price_2;
											} else if (avg_price_2 < this._prev_avg_2) {
												current_flow_2 = -volume * avg_price_2;
											} else {
												current_flow_2 = this._prev_flow_2 > 0 ? volume * avg_price_2 : -volume * avg_price_2;
											}
											this._day_money_flow_2 += current_flow_2;
											this._prev_avg_2 = avg_price_2;
											this._prev_flow_2 = current_flow_2;
										}

										// Return plot values
										return [
											this._day_money_flow_1,                                    // plot_0: Call Money Flow (Daily)
											this._day_money_flow_2,                                    // plot_1: Put Money Flow (Daily)
											0                                                          // plot_2: Zero Line
										];
									};

									// Helper function to calculate EMA
									this.calculateEMA = function(value, valuesArray, length) {
										valuesArray.push(value);

										if (valuesArray.length === 1) {
											return value;
										}

										if (valuesArray.length > length) {
											valuesArray.shift();
										}

										const multiplier = 2 / (length + 1);
										const previousEMA = valuesArray.length > 1 ?
											valuesArray[valuesArray.length - 2] : value;

										return (value * multiplier) + (previousEMA * (1 - multiplier));
									};
								}
							},
							
						]);
};