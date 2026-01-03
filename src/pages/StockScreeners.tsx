import { useEffect } from "react";

const StockScreeners = () => {
  useEffect(() => {
    window.location.href = "http://runalgo.xyz:5000/";
  }, []);

  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="text-foreground">Redirecting to Stock Screeners...</div>
    </div>
  );
};

export default StockScreeners;
