import { useEffect, useRef } from "react";
import { Card } from "@/components/ui/card";

interface StockDetailChartProps {
  symbol: string;
}

declare global {
  interface Window {
    TradingView: any;
  }
}

export const StockDetailChart = ({ symbol }: StockDetailChartProps) => {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    // Clear existing widget
    containerRef.current.innerHTML = '';

    const script = document.createElement('script');
    script.src = 'https://s3.tradingview.com/tv.js';
    script.async = true;
    script.onload = () => {
      if (window.TradingView && containerRef.current) {
        new window.TradingView.widget({
          width: '100%',
          height: 500,
          symbol: `NSE:${symbol}`,
          interval: '5',
          timezone: 'Asia/Kolkata',
          theme: 'dark',
          style: '1',
          locale: 'en',
          toolbar_bg: '#0f172a',
          enable_publishing: false,
          hide_top_toolbar: false,
          hide_legend: false,
          save_image: false,
          container_id: 'tradingview_chart',
          studies: ['Volume@tv-basicstudies'],
        });
      }
    };

    document.head.appendChild(script);

    return () => {
      const existingScripts = document.querySelectorAll('script[src="https://s3.tradingview.com/tv.js"]');
      existingScripts.forEach(s => s.remove());
    };
  }, [symbol]);

  return (
    <Card className="p-0 overflow-hidden bg-card border-border">
      <div id="tradingview_chart" ref={containerRef} className="w-full h-[500px]" />
    </Card>
  );
};
