import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { User, Lock, Loader2 } from "lucide-react";
import { useLocation } from "wouter";

export default function AuthPage() {
  const { user, loginMutation } = useAuth();
  const [, setLocation] = useLocation();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");

  useEffect(() => {
    if (user) {
      setLocation("/dashboard");
    }
  }, [user, setLocation]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username || !password) return;
    
    try {
      await loginMutation.mutateAsync({ username, password });
      setLocation("/dashboard");
    } catch (error) {
      console.error("Login failed:", error);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-300 via-teal-100 to-cyan-200 flex items-center justify-center p-4">
      <div className="relative">
        {/* Background geometric shape */}
        <div className="absolute inset-0 transform rotate-12">
          <div className="w-96 h-64 bg-gradient-to-r from-teal-600 to-teal-500 rounded-lg shadow-2xl opacity-80"></div>
        </div>
        
        {/* Login container */}
        <div className="relative z-10 w-96 bg-gradient-to-b from-teal-700 to-teal-800 rounded-lg shadow-2xl overflow-hidden">
          {/* Header */}
          <div className="bg-teal-600 text-center py-6">
            <h1 className="text-white text-xl font-light tracking-wider">MEMBER LOGIN</h1>
          </div>
          
          {/* Form */}
          <div className="p-8 space-y-6">
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Username field */}
              <div className="relative">
                <User className="absolute left-3 top-3 h-5 w-5 text-white/70" />
                <Input
                  type="text"
                  placeholder="Username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="bg-transparent border-0 border-b-2 border-white/30 rounded-none pl-12 pr-4 py-3 text-white placeholder:text-white/70 focus:border-white focus:ring-0 focus-visible:ring-0"
                />
              </div>

              {/* Password field */}
              <div className="relative">
                <Lock className="absolute left-3 top-3 h-5 w-5 text-white/70" />
                <Input
                  type="password"
                  placeholder="Password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="bg-transparent border-0 border-b-2 border-white/30 rounded-none pl-12 pr-4 py-3 text-white placeholder:text-white/70 focus:border-white focus:ring-0 focus-visible:ring-0"
                />
              </div>

              {/* Login button */}
              <Button
                type="submit"
                disabled={loginMutation.isPending || !username || !password}
                className="w-full bg-emerald-400 hover:bg-emerald-500 text-teal-800 font-semibold py-4 rounded-none text-lg tracking-wider transition-colors"
              >
                {loginMutation.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                    ENTRANDO...
                  </>
                ) : (
                  "LOGIN"
                )}
              </Button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}