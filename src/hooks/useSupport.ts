import { useMutation } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";

export interface SupportRequestInput {
  email: string;
  subject: string;
  message: string;
}

export const useCreateSupportRequest = () =>
  useMutation({
    mutationFn: async (input: SupportRequestInput) => {
      const { data, error } = await supabase.functions.invoke("create-support-request", {
        body: input,
      });

      if (error) throw new Error(error.message);
      if (data?.error) throw new Error(data.error);

      return data as { ok: boolean; support_pin: string };
    },
  });
