import { createClient } from "@supabase/supabase-js";

const supabaseUrl = (import.meta as any).env.VITE_SUPABASE_URL || "https://sssadjcttfxmbhajqehd.supabase.co";
const supabaseAnonKey = (import.meta as any).env.VITE_SUPABASE_ANON_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNzc2FkamN0dGZ4bWJoYWpxZWhkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzk0MjM1MjcsImV4cCI6MjA5NDk5OTUyN30.-ak5LbQPF3IqYrCpU2MLKFW0RzJ_HwGys4ME7YapeYA";

let clientInstance: any = null;

function getClient() {
  if (!supabaseUrl || !supabaseAnonKey) {
    console.error("Supabase environment variables are missing! Ensure VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY are set.");
    // Return a safe mocked proxy so the application doesn't crash on module loading.
    const emptyChain = () => {
      const mockObj: any = {
        select: () => mockObj,
        order: () => mockObj,
        insert: () => mockObj,
        update: () => mockObj,
        delete: () => mockObj,
        eq: () => mockObj,
        gt: () => mockObj,
        on: () => mockObj,
        subscribe: () => mockObj,
        then: (onfulfilled: any) => onfulfilled({ data: [], error: null }),
      };
      return mockObj;
    };
    return new Proxy({}, {
      get(_, prop) {
        if (prop === "channel") {
          return () => ({
            on: () => ({
              subscribe: () => ({})
            })
          });
        }
        return emptyChain;
      }
    }) as any;
  }
  if (!clientInstance) {
    clientInstance = createClient(supabaseUrl, supabaseAnonKey);
  }
  return clientInstance;
}

export const supabase = new Proxy({}, {
  get(_, prop) {
    const client = getClient();
    const value = client[prop];
    if (typeof value === "function") {
      return value.bind(client);
    }
    return value;
  }
}) as any;
