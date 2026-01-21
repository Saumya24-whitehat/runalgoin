import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Json } from "@/integrations/supabase/types";

interface UseUserPreferencesOptions<T> {
  key: string;
  defaultValue: T;
}

export function useUserPreferences<T>({ key, defaultValue }: UseUserPreferencesOptions<T>) {
  const { user } = useAuth();
  const [value, setValue] = useState<T>(defaultValue);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  // Load preferences from database
  useEffect(() => {
    const loadPreferences = async () => {
      if (!user) {
        setValue(defaultValue);
        setIsLoading(false);
        return;
      }

      try {
        const { data, error } = await supabase
          .from("user_preferences")
          .select("preference_value")
          .eq("user_id", user.id)
          .eq("preference_key", key)
          .maybeSingle();

        if (error) {
          console.error("Error loading preferences:", error);
          setValue(defaultValue);
        } else if (data) {
          setValue(data.preference_value as T);
        } else {
          setValue(defaultValue);
        }
      } catch (err) {
        console.error("Error loading preferences:", err);
        setValue(defaultValue);
      } finally {
        setIsLoading(false);
      }
    };

    loadPreferences();
  }, [user, key, defaultValue]);

  // Save preferences to database
  const savePreferences = useCallback(
    async (newValue: T) => {
      setValue(newValue);

      if (!user) {
        return;
      }

      setIsSaving(true);
      try {
        // First try to update existing record
        const { data: existing } = await supabase
          .from("user_preferences")
          .select("id")
          .eq("user_id", user.id)
          .eq("preference_key", key)
          .maybeSingle();

        if (existing) {
          // Update existing record
          const { error } = await supabase
            .from("user_preferences")
            .update({
              preference_value: newValue as Json,
            })
            .eq("id", existing.id);

          if (error) {
            console.error("Error updating preferences:", error);
          }
        } else {
          // Insert new record
          const { error } = await supabase.from("user_preferences").insert({
            user_id: user.id,
            preference_key: key,
            preference_value: newValue as Json,
          });

          if (error) {
            console.error("Error inserting preferences:", error);
          }
        }
      } catch (err) {
        console.error("Error saving preferences:", err);
      } finally {
        setIsSaving(false);
      }
    },
    [user, key]
  );

  return {
    value,
    setValue: savePreferences,
    isLoading,
    isSaving,
  };
}
