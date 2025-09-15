import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

console.log("supabaseUrl", supabaseUrl);
console.log("supabaseAnonKey", supabaseAnonKey);

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Admin API client for authenticated requests
export const adminApi = {
  async request(endpoint: string, options: RequestInit = {}) {
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session) {
      throw new Error("Not authenticated");
    }

    const url = `${supabaseUrl}/functions/v1/admin-competition-api${endpoint}`;

    const response = await fetch(url, {
      ...options,
      headers: {
        Authorization: `Bearer ${session.access_token}`,
        apikey: supabaseAnonKey,
        "Content-Type": "application/json",
        ...options.headers,
      },
    });

    if (!response.ok) {
      const error = await response
        .json()
        .catch(() => ({ error: "Request failed" }));
      throw new Error(error.error || "Request failed");
    }

    return response.json();
  },

  // Competition Templates
  async getTemplates(category?: string) {
    const params = new URLSearchParams();
    if (category) params.set("category", category);

    return this.request(`/templates?${params}`);
  },

  async createTemplate(template: any) {
    return this.request("/templates", {
      method: "POST",
      body: JSON.stringify(template),
    });
  },

  async updateTemplate(id: string, template: any) {
    return this.request(`/templates/${id}`, {
      method: "PUT",
      body: JSON.stringify(template),
    });
  },

  async deleteTemplate(id: string) {
    return this.request(`/templates/${id}`, {
      method: "DELETE",
    });
  },

  // Competitions
  async getCompetitions(status?: string, page = 1, limit = 10) {
    const params = new URLSearchParams({
      page: page.toString(),
      limit: limit.toString(),
    });
    if (status) params.set("status", status);

    return this.request(`/competitions?${params}`);
  },

  async createCompetition(competition: any) {
    return this.request("/competitions", {
      method: "POST",
      body: JSON.stringify(competition),
    });
  },

  async updateCompetition(id: string, competition: any) {
    return this.request(`/competitions/${id}`, {
      method: "PUT",
      body: JSON.stringify(competition),
    });
  },

  async deleteCompetition(id: string) {
    return this.request(`/competitions/${id}`, {
      method: "DELETE",
    });
  },

  // Categories
  async getCategories() {
    return this.request("/categories");
  },

  // Dashboard
  async getDashboardStats() {
    return this.request("/dashboard");
  },
};
