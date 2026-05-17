import { useState, useEffect, useRef } from "react";
import { Mail, Lock, Eye, EyeOff, ArrowRight } from "lucide-react";
import { AuthService } from "@/services/AuthService";
import "@/styles/login.css";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [focused, setFocused] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const logoImg = "/fitnex/logo.webp";

  useEffect(() => {
    const t = setTimeout(() => setMounted(true), 60);
    return () => clearTimeout(t);
  }, []);

  // Animated canvas: floating rings + moving lines
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let raf: number;
    let t = 0;

    const resize = () => {
      canvas.width = canvas.offsetWidth * window.devicePixelRatio;
      canvas.height = canvas.offsetHeight * window.devicePixelRatio;
      ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
    };
    resize();
    window.addEventListener("resize", resize);

    const particles = Array.from({ length: 28 }, () => ({
      x: Math.random() * 100,
      y: Math.random() * 100,
      r: 1 + Math.random() * 2.5,
      speed: 0.008 + Math.random() * 0.012,
      phase: Math.random() * Math.PI * 2,
      opacity: 0.15 + Math.random() * 0.35,
    }));

    const rings = [
      { cx: 78, cy: 18, r: 38, stroke: 0.6 },
      { cx: 78, cy: 18, r: 58, stroke: 0.4 },
      { cx: 78, cy: 18, r: 80, stroke: 0.25 },
      { cx: 15, cy: 85, r: 28, stroke: 0.5 },
      { cx: 15, cy: 85, r: 46, stroke: 0.3 },
    ];

    const draw = () => {
      const w = canvas.offsetWidth;
      const h = canvas.offsetHeight;
      ctx.clearRect(0, 0, w, h);
      t += 0.008;

      rings.forEach(({ cx, cy, r, stroke }) => {
        ctx.beginPath();
        ctx.arc(
          (cx / 100) * w,
          (cy / 100) * h,
          (r / 100) * Math.min(w, h) * 1.6,
          0,
          Math.PI * 2,
        );
        ctx.strokeStyle = `rgba(255,255,255,${stroke * 0.22})`;
        ctx.lineWidth = 1;
        ctx.stroke();
      });

      particles.forEach((p) => {
        const x = (p.x / 100) * w;
        const y = (p.y / 100) * h + Math.sin(t * p.speed * 80 + p.phase) * 8;
        ctx.beginPath();
        ctx.arc(x, y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255,255,255,${p.opacity})`;
        ctx.fill();
      });

      const scanX = ((Math.sin(t * 0.4) + 1) / 2) * w * 1.4 - w * 0.2;
      const grad = ctx.createLinearGradient(scanX - 60, 0, scanX + 60, h);
      grad.addColorStop(0, "rgba(255,255,255,0)");
      grad.addColorStop(0.5, "rgba(255,255,255,0.04)");
      grad.addColorStop(1, "rgba(255,255,255,0)");
      ctx.fillStyle = grad;
      ctx.fillRect(scanX - 80, 0, 160, h);

      ctx.save();
      ctx.strokeStyle = "rgba(255,255,255,0.12)";
      ctx.lineWidth = 1;
      for (let i = 0; i < 5; i++) {
        const offset = i * 14;
        ctx.beginPath();
        ctx.moveTo(w - 60 + offset, 0);
        ctx.lineTo(w, 60 - offset);
        ctx.stroke();
      }
      ctx.restore();

      raf = requestAnimationFrame(draw);
    };

    draw();
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
    };
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password || isLoading) return;

    setIsLoading(true);
    setError(null);

    try {
      await AuthService.signIn(email, password);
    } catch (err: any) {
      setError(err.message || "Invalid login credentials");
      setIsLoading(false);
    }
  };

  return (
    <div className="login-root">
      {/* ── HERO ── */}
      <div className="login-hero">
        <div className="hero-bg" />
        <div className="hero-bloom" />
        <canvas ref={canvasRef} className="hero-canvas" />

        {/* Logo
        <div className={`hero-logo ${mounted ? "mounted" : ""}`}>
          <div className="logo-dumbbell">
            <div className="logo-plate" />
            <div className="logo-bar" />
            <div className="logo-plate" />
          </div>
          <span className="logo-text">FitTrack</span>
        </div> */}

        {/* Premium Hero Brand */}
        {/* Premium Hero Brand */}
        <div className={`hero-logo ${mounted ? "mounted" : ""}`}>
          <img src={logoImg} alt="FITNEX" className="logo-image" />
        </div>

        {/* Version tag
        <div className={`hero-tag ${mounted ? "mounted" : ""}`}>
          <span className="hero-tag-text">v2.0 is here</span>
        </div> */}

        {/* Headline */}
        <div className="hero-headline">
          {(["HUSTLE", "FOR", "MUSCLE"] as const).map((word, i) => (
            <div key={word} className="hero-word-wrap">
              <span
                className={`hero-word ${i === 2 ? "accent" : ""} ${mounted ? `mounted-${i}` : ""}`}
              >
                {word}
              </span>
            </div>
          ))}
        </div>

        {/* Subtext */}
        <div className={`hero-subtext ${mounted ? "mounted" : ""}`}>
          <div className="hero-subtext-line" />
          <p>Track Your Progress.</p>
        </div>

        {/* Metrics */}
        {/* <div className={`hero-metrics ${mounted ? "mounted" : ""}`}>
          {[
            { num: "12K+", label: "Workouts" },
            { num: "340", label: "Exercises" },
            { num: "4.9", label: "App rating" },
          ].map((m, i) => (
            <div key={m.label} className="metric">
              <span className="metric-num">{m.num}</span>
              <span className="metric-label">{m.label}</span>
              {i < 2 && <span className="metric-dot">·</span>}
            </div>
          ))}
        </div> */}

        {/* Diagonal cut */}
        <div className="hero-cut">
          <div className="hero-cut-fill" />
        </div>
      </div>

      {/* ── FORM SECTION ── */}
      <div className="login-form-section">
        <form className="login-form" onSubmit={handleSubmit}>
          {/* Welcome */}
          <div className={`form-welcome ${mounted ? "mounted" : ""}`}>
            <h2>Welcome back</h2>
            <p>Sign in to continue your streak</p>
          </div>

          {/* Fields */}
          <div className={`form-fields ${mounted ? "mounted" : ""}`}>
            {/* Email */}
            <div>
              <div className="field-label-row">
                <label
                  className={`field-label ${focused === "email" ? "focused" : ""}`}
                >
                  <Mail size={11} strokeWidth={2.5} />
                  Email
                </label>
              </div>
              <div className="input-wrap">
                <div
                  className={`input-icon ${focused === "email" ? "focused" : ""}`}
                >
                  <Mail size={16} strokeWidth={2} />
                </div>
                <input
                  className={`input-field ${focused === "email" ? "focused" : ""}`}
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  onFocus={() => setFocused("email")}
                  onBlur={() => setFocused(null)}
                  placeholder="you@fittrack.app"
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <div className="field-label-row">
                <label
                  className={`field-label ${focused === "password" ? "focused" : ""}`}
                >
                  <Lock size={11} strokeWidth={2.5} />
                  Password
                </label>
                <button className="forgot-btn" type="button">
                  Forgot?
                </button>
              </div>
              <div className="input-wrap">
                <div
                  className={`input-icon ${focused === "password" ? "focused" : ""}`}
                >
                  <Lock size={16} strokeWidth={2} />
                </div>
                <input
                  className={`input-field password-pad ${focused === "password" ? "focused" : ""}`}
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  onFocus={() => setFocused("password")}
                  onBlur={() => setFocused(null)}
                  placeholder="••••••••••"
                />
                <button
                  className="eye-toggle"
                  onClick={() => setShowPassword(!showPassword)}
                  type="button"
                >
                  {showPassword ? (
                    <EyeOff size={16} strokeWidth={2} />
                  ) : (
                    <Eye size={16} strokeWidth={2} />
                  )}
                </button>
              </div>
            </div>

            {error && <p className="form-error">{error}</p>}

            {/* CTA */}
            <button className="sign-in-btn" type="submit" disabled={isLoading}>
              {isLoading ? (
                <>
                  <svg
                    width="18"
                    height="18"
                    viewBox="0 0 24 24"
                    fill="none"
                    className="spin-icon"
                  >
                    <circle
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="3"
                      strokeOpacity="0.25"
                    />
                    <path
                      d="M12 2a10 10 0 0 1 10 10"
                      stroke="currentColor"
                      strokeWidth="3"
                      strokeLinecap="round"
                    />
                  </svg>
                  Signing in...
                </>
              ) : (
                <>
                  Sign In
                  <ArrowRight size={17} strokeWidth={2.5} />
                </>
              )}
            </button>
          </div>

          {/* Divider */}
          <div className={`form-divider ${mounted ? "mounted" : ""}`}>
            <div className="divider-line" />
            <span className="divider-label">or</span>
            <div className="divider-line" />
          </div>

          {/* Social */}
          {/* <div className={`social-grid ${mounted ? "mounted" : ""}`}>
            {[
              {
                label: "Google",
                icon: (
                  <svg
                    width="18"
                    height="18"
                    viewBox="0 0 24 24"
                    aria-hidden="true"
                  >
                    <path
                      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                      fill="#4285F4"
                    />
                    <path
                      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                      fill="#34A853"
                    />
                    <path
                      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                      fill="#FBBC05"
                    />
                    <path
                      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                      fill="#EA4335"
                    />
                  </svg>
                ),
              },
              {
                label: "Apple",
                icon: (
                  <svg
                    width="18"
                    height="18"
                    viewBox="0 0 24 24"
                    fill="currentColor"
                    aria-hidden="true"
                  >
                    <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z" />
                  </svg>
                ),
              },
            ].map((s) => (
              <button key={s.label} type="button" className="social-btn">
                {s.icon}
                {s.label}
              </button>
            ))}
          </div> */}

          {/* Footer */}
          <p className={`form-footer ${mounted ? "mounted" : ""}`}>
            New here?{" "}
            <button className="signup-link" type="button">
              Create your account →
            </button>
          </p>
        </form>
      </div>
    </div>
  );
}
