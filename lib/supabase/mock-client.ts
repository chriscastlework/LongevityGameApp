/**
 * Mock Supabase client for development/testing when Supabase is not available
 */

export interface MockUser {
  id: string;
  email: string;
  user_metadata: Record<string, any>;
  app_metadata: Record<string, any>;
}

export interface MockSession {
  access_token: string;
  refresh_token: string;
  user: MockUser;
  expires_at?: number;
}

class MockSupabaseClient {
  private mockSession: MockSession | null = null;
  private mockUsers: MockUser[] = [
    {
      id: 'test-user-123',
      email: 'test@example.com',
      user_metadata: { name: 'Test User' },
      app_metadata: {}
    }
  ];

  auth = {
    signUp: async (credentials: { email: string; password: string }) => {
      console.log('🔧 Mock Supabase: signUp called with email:', credentials.email);
      
      const newUser: MockUser = {
        id: `user-${Date.now()}`,
        email: credentials.email,
        user_metadata: {},
        app_metadata: {}
      };
      
      this.mockUsers.push(newUser);
      
      return {
        data: {
          user: newUser,
          session: null // Email confirmation required
        },
        error: null
      };
    },

    signInWithPassword: async (credentials: { email: string; password: string }) => {
      console.log('🔧 Mock Supabase: signInWithPassword called with email:', credentials.email);
      
      const user = this.mockUsers.find(u => u.email === credentials.email);
      
      if (!user) {
        return {
          data: { user: null, session: null },
          error: { message: 'Invalid credentials' }
        };
      }

      if (credentials.password === 'testpassword123' || credentials.password === 'password123') {
        this.mockSession = {
          access_token: 'mock-access-token',
          refresh_token: 'mock-refresh-token',
          user,
          expires_at: Date.now() + (24 * 60 * 60 * 1000)
        };

        return {
          data: {
            user,
            session: this.mockSession
          },
          error: null
        };
      }

      return {
        data: { user: null, session: null },
        error: { message: 'Invalid credentials' }
      };
    },

    signOut: async () => {
      console.log('🔧 Mock Supabase: signOut called');
      this.mockSession = null;
      return { error: null };
    },

    getSession: async () => {
      return {
        data: { session: this.mockSession },
        error: null
      };
    },

    getUser: async () => {
      return {
        data: { user: this.mockSession?.user || null },
        error: null
      };
    },

    onAuthStateChange: (callback: (event: string, session: MockSession | null) => void) => {
      // Mock implementation
      return {
        data: { subscription: { unsubscribe: () => {} } },
        error: null
      };
    }
  };

  from = (table: string) => ({
    select: (columns?: string) => ({
      eq: (column: string, value: any) => ({
        single: () => Promise.resolve({ data: null, error: null })
      }),
      limit: (count: number) => Promise.resolve({ data: [], error: null })
    }),
    insert: (data: any) => Promise.resolve({ data: null, error: null }),
    update: (data: any) => ({
      eq: (column: string, value: any) => Promise.resolve({ data: null, error: null })
    }),
    delete: () => ({
      eq: (column: string, value: any) => Promise.resolve({ data: null, error: null })
    })
  });
}

export function createMockClient() {
  return new MockSupabaseClient();
}