import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Position } from "@/services/optionBuilderApi";
import { toast } from "sonner";

export interface SavedStrategy {
  id: string;
  name: string;
  description: string;
  type: string;
  positions: Position[];
  symbol: string;
  createdAt: string;
  source: "builder" | "simulator";
}

interface UseSavedStrategiesOptions {
  source: "builder" | "simulator";
}

export const useSavedStrategies = ({ source }: UseSavedStrategiesOptions) => {
  const { user } = useAuth();
  const [strategies, setStrategies] = useState<SavedStrategy[]>([]);
  const [loading, setLoading] = useState(true);

  // Fetch strategies from database
  const fetchStrategies = useCallback(async () => {
    if (!user) {
      setStrategies([]);
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from("saved_strategies")
        .select("*")
        .eq("user_id", user.id)
        .eq("source", source)
        .order("created_at", { ascending: false });

      if (error) throw error;

      const formattedStrategies: SavedStrategy[] = (data || []).map((s) => ({
        id: s.id,
        name: s.name,
        description: s.description || "",
        type: s.type,
        positions: s.positions as unknown as Position[],
        symbol: s.symbol,
        createdAt: s.created_at,
        source: s.source as "builder" | "simulator",
      }));

      setStrategies(formattedStrategies);
    } catch (error) {
      console.error("Error fetching strategies:", error);
      toast.error("Failed to load strategies");
    } finally {
      setLoading(false);
    }
  }, [user, source]);

  // Load strategies on mount and when user changes
  useEffect(() => {
    fetchStrategies();
  }, [fetchStrategies]);

  // Save a new strategy
  const saveStrategy = useCallback(
    async (name: string, description: string, type: string, positions: Position[], symbol: string) => {
      if (!user) {
        toast.error("Please sign in to save strategies");
        return null;
      }

      try {
        const { data, error } = await supabase
          .from("saved_strategies")
          .insert([{
            user_id: user.id,
            name,
            description,
            type,
            source,
            symbol,
            positions: JSON.parse(JSON.stringify(positions)),
          }])
          .select()
          .single();

        if (error) throw error;

        const newStrategy: SavedStrategy = {
          id: data.id,
          name: data.name,
          description: data.description || "",
          type: data.type,
          positions: data.positions as unknown as Position[],
          symbol: data.symbol,
          createdAt: data.created_at,
          source: data.source as "builder" | "simulator",
        };

        setStrategies((prev) => [newStrategy, ...prev]);
        toast.success("Strategy saved");
        return newStrategy;
      } catch (error) {
        console.error("Error saving strategy:", error);
        toast.error("Failed to save strategy");
        return null;
      }
    },
    [user, source]
  );

  // Delete a strategy
  const deleteStrategy = useCallback(
    async (id: string) => {
      if (!user) return;

      try {
        const { error } = await supabase
          .from("saved_strategies")
          .delete()
          .eq("id", id)
          .eq("user_id", user.id);

        if (error) throw error;

        setStrategies((prev) => prev.filter((s) => s.id !== id));
        toast.success("Strategy deleted");
      } catch (error) {
        console.error("Error deleting strategy:", error);
        toast.error("Failed to delete strategy");
      }
    },
    [user]
  );

  return {
    strategies,
    loading,
    saveStrategy,
    deleteStrategy,
    refetch: fetchStrategies,
  };
};

// Hook for fetching all strategies (used in Profile page)
export const useAllSavedStrategies = () => {
  const { user } = useAuth();
  const [strategies, setStrategies] = useState<SavedStrategy[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchAllStrategies = useCallback(async () => {
    if (!user) {
      setStrategies([]);
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from("saved_strategies")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (error) throw error;

      const formattedStrategies: SavedStrategy[] = (data || []).map((s) => ({
        id: s.id,
        name: s.name,
        description: s.description || "",
        type: s.type,
        positions: s.positions as unknown as Position[],
        symbol: s.symbol,
        createdAt: s.created_at,
        source: s.source as "builder" | "simulator",
      }));

      setStrategies(formattedStrategies);
    } catch (error) {
      console.error("Error fetching strategies:", error);
      toast.error("Failed to load strategies");
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchAllStrategies();
  }, [fetchAllStrategies]);

  const deleteStrategy = useCallback(
    async (id: string) => {
      if (!user) return;

      try {
        const { error } = await supabase
          .from("saved_strategies")
          .delete()
          .eq("id", id)
          .eq("user_id", user.id);

        if (error) throw error;

        setStrategies((prev) => prev.filter((s) => s.id !== id));
        toast.success("Strategy deleted");
      } catch (error) {
        console.error("Error deleting strategy:", error);
        toast.error("Failed to delete strategy");
      }
    },
    [user]
  );

  return {
    strategies,
    loading,
    deleteStrategy,
    refetch: fetchAllStrategies,
  };
};
