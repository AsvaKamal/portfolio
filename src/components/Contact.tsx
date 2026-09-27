import { useEffect, useRef, useState } from "react";
import { contactForm, fullName, profile } from "../data/content";
import { ToolIcon } from "../data/icons";
import { prefersReducedMotion } from "../lib";
import FooterName from "./FooterName";
import { BrandMark, SectionLabel, SectionTitle } from "./ui";

type Field = "name" | "email" | "message";
type Values = Record<Field, string>;
type Errors = Partial<Record<Field, string>>;
type Toast = { id: number; kind: "success" | "error" | "info"; title: string; text: string };

// Keep in sync with MAX_* in integrations/google-sheets-form.gs (the server enforces them too).
const LIMITS: Record<Field, number> = { name: 100, email: 254, message: 5000 };
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const SEND_TIMEOUT_MS = 15000;
const EMPTY: Values = { name: "", email: "", message: "" };

function validate(v: Values): Errors {
  const e: Errors = {};
  if (v.name.trim().length < 2) e.name = "Please tell me your name.";
  if (!v.email.trim()) e.email = "I need an email address to reply to.";
  else if (!EMAIL_RE.test(v.email.trim())) e.email = "That email doesn't look quite right.";
  if (v.message.trim().length < 10) e.message = "A sentence or two about the project helps.";
  return e;
}

/**
 * Posts the form to the configured service, giving up after SEND_TIMEOUT_MS.
 * Google Apps Script: a plain form-encoded POST (no custom headers, so no CORS preflight); the
 * script replies with JSON {ok}. Formspree: FormData with Accept: application/json.
 */
async function send(endpoint: string, data: FormData) {
  const ctrl = new AbortController();
  const timer = window.setTimeout(() => ctrl.abort(), SEND_TIMEOUT_MS);
  try {
    if (new URL(endpoint).hostname === "script.google.com") {
      const body = new URLSearchParams();
      data.forEach((v, k) => typeof v === "string" && body.append(k, v));
      const res = await fetch(endpoint, { method: "POST", body, signal: ctrl.signal });
      const json = await res.json().catch(() => ({ ok: false }));
      if (!json.ok) throw new Error("Submission rejected");
      return;
    }
    const res = await fetch(endpoint, { method: "POST", body: data, headers: { Accept: "application/json" }, signal: ctrl.signal });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
  } finally {
    clearTimeout(timer);
  }
}

function Toasts({ toasts, dismiss }: { toasts: Toast[]; dismiss: (id: number) => void }) {
  return (
    <div className="toasts" role="status" aria-live="polite">
      {toasts.map((t) => (
        <div key={t.id} className={`toast toast--${t.kind}`}>
          <span className="toast__icon" aria-hidden="true">
            {t.kind === "success" ? "✓" : t.kind === "error" ? "!" : "→"}
          </span>
          <div>
            <strong>{t.title}</strong>
            <p>{t.text}</p>
          </div>
          <button className="toast__close" aria-label="Dismiss" onClick={() => dismiss(t.id)}>
            ✕
          </button>
          <span className="toast__timer" />
        </div>
      ))}
    </div>
  );
}

function ContactForm() {
  const [values, setValues] = useState<Values>(EMPTY);
  const [errors, setErrors] = useState<Errors>({});
  const [tried, setTried] = useState(false);
  const [shake, setShake] = useState(0);
  const [sending, setSending] = useState(false);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const mountedAt = useRef(Date.now());
  const refs = { name: useRef<HTMLInputElement>(null), email: useRef<HTMLInputElement>(null), message: useRef<HTMLTextAreaElement>(null) };

  const dismiss = (id: number) => setToasts((all) => all.filter((x) => x.id !== id));
  const toast = (t: Omit<Toast, "id">) => {
    const id = Date.now() + Math.random();
    setToasts((all) => [...all.slice(-2), { ...t, id }]);
    window.setTimeout(() => dismiss(id), 5000);
  };

  const update = (f: Field) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const next = { ...values, [f]: e.target.value };
    setValues(next);
    if (tried) setErrors(validate(next)); // live feedback only after the first attempt
  };

  const onSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (sending) return;
    setTried(true);
    const errs = validate(values);
    setErrors(errs);
    const first = (Object.keys(errs) as Field[])[0];
    if (first) {
      setShake((n) => n + 1);
      refs[first].current?.focus();
      toast({ kind: "error", title: "Almost there", text: "A couple of fields need a quick look." });
      return;
    }

    if (!contactForm.endpoint) {
      // No form service configured: hand the message to the visitor's email app instead.
      const body = `${values.message}\n\nFrom ${values.name} (${values.email})`;
      toast({ kind: "info", title: "Opening your email app", text: `Your message is ready to send to ${profile.email}.` });
      window.location.href = `mailto:${profile.email}?subject=${encodeURIComponent("Project enquiry")}&body=${encodeURIComponent(body)}`;
      return;
    }

    const data = new FormData(e.currentTarget);
    data.set("page", window.location.origin + window.location.pathname);
    data.set("_t", String(Math.round((Date.now() - mountedAt.current) / 1000))); // seconds on page: bots submit instantly
    setSending(true);
    try {
      await send(contactForm.endpoint, data);
      setValues(EMPTY);
      setTried(false);
      toast({ kind: "success", title: "Message sent", text: "Thanks! I'll get back to you within a day." });
    } catch {
      toast({ kind: "error", title: "Couldn't send that", text: `Please try again, or email me at ${profile.email}.` });
    } finally {
      setSending(false);
    }
  };

  const fieldClass = (f: Field) => `field${errors[f] ? ` has-error shake-${shake % 2}` : ""}`;
  // A render helper, not a component: a component declared inside render would remount (and
  // replay its entrance animation) on every keystroke.
  const error = (f: Field) =>
    errors[f] && (
      <span className="field__error" id={`err-${f}`} role="alert">
        <span className="field__error-icon">!</span>
        {errors[f]}
      </span>
    );
  const a11y = (f: Field) => ({ "aria-invalid": !!errors[f], "aria-describedby": errors[f] ? `err-${f}` : undefined, maxLength: LIMITS[f] });

  return (
    <>
      <form className="form" onSubmit={onSubmit} noValidate data-reveal>
        <div className="form__head">
          <span className="mono dim">New message</span>
          <span className="mono form__status">
            <span className="dot dot--live" /> Replies within a day
          </span>
        </div>
        <label className={fieldClass("name")}>
          <span className="mono dim">Name</span>
          <input ref={refs.name} name="name" autoComplete="name" placeholder="Jane Smith" value={values.name} onChange={update("name")} {...a11y("name")} />
          {error("name")}
        </label>
        <label className={fieldClass("email")}>
          <span className="mono dim">Email</span>
          <input ref={refs.email} name="email" type="email" inputMode="email" autoComplete="email" placeholder="jane@company.com" value={values.email} onChange={update("email")} {...a11y("email")} />
          {error("email")}
        </label>
        <label className={fieldClass("message")}>
          <span className="mono dim">Project</span>
          <textarea ref={refs.message} name="message" rows={5} placeholder="What are you trying to automate or understand?" value={values.message} onChange={update("message")} {...a11y("message")} />
          {error("message")}
        </label>
        {/* spam trap: hidden from people and assistive tech, so only bots fill it */}
        <input type="text" name="_gotcha" tabIndex={-1} autoComplete="off" className="form__trap" aria-hidden="true" />
        <input type="hidden" name="_subject" value="New portfolio enquiry" />
        <button className="btn btn--light form__submit" type="submit" disabled={sending}>
          {sending ? "Sending…" : "Send message"}
          <span className="btn__arrow">{sending ? <span className="spinner" /> : "↗"}</span>
        </button>
      </form>
      <Toasts toasts={toasts} dismiss={dismiss} />
    </>
  );
}

/** Round button with a ring that fills as you scroll down the page. */
function BackToTop() {
  const ring = useRef<SVGCircleElement>(null);
  const C = 2 * Math.PI * 30;
  useEffect(() => {
    let raf = 0;
    const onScroll = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        const max = document.documentElement.scrollHeight - window.innerHeight;
        if (ring.current) ring.current.style.strokeDashoffset = String(C * (1 - (max > 0 ? window.scrollY / max : 0)));
      });
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("scroll", onScroll);
    };
  }, [C]);
  const toTop = () => window.scrollTo({ top: 0, behavior: prefersReducedMotion() ? "auto" : "smooth" });
  return (
    <button className="totop" onClick={toTop} aria-label="Back to top">
      <svg viewBox="0 0 68 68" className="totop__ring" aria-hidden="true">
        <circle cx="34" cy="34" r="30" className="totop__track" />
        <circle cx="34" cy="34" r="30" className="totop__progress" ref={ring} strokeDasharray={C} strokeDashoffset={C} />
      </svg>
      <span className="totop__arrow" aria-hidden="true">
        <svg viewBox="0 0 24 24">
          <path d="M12 19V5M5 12l7-7 7 7" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </span>
    </button>
  );
}

function CopyEmail({ address, label }: { address: string; label?: string }) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(address);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
    } catch {
      window.location.href = `mailto:${address}`; // clipboard blocked (insecure context / permissions)
    }
  };
  return (
    <div className="femail">
      {label && <span className="mono dim">{label}</span>}
      <div className="femail__row">
        <a href={`mailto:${address}`}>{address}</a>
        <button className={`femail__copy${copied ? " is-copied" : ""}`} onClick={copy} aria-label={`Copy ${address}`}>
          {copied ? "Copied" : "Copy"}
        </button>
      </div>
    </div>
  );
}

export default function Contact() {
  return (
    <>
      <section className="section contact" id="contact">
        <div className="wrap">
          <SectionLabel id="contact" title="Contact" note="Let's work together" />
          <div className="contact__grid">
            <div>
              <SectionTitle lines={["Let's build", "something", "*smart.*"]} className="h-xl" />
              <p className="about__body contact__lead" data-reveal>
                Have data you're not using, or a process that eats hours every week? Tell me about it and I usually reply within a day.
              </p>
              <a className="btn" href={`mailto:${profile.email}`} data-reveal>
                {profile.email} <span className="btn__arrow">↗</span>
              </a>
            </div>
            <ContactForm />
          </div>
        </div>
      </section>

      <footer className="footer">
        <div className="wrap">
          <div className="footer__top">
            <div className="footer__brand">
              <span className="nav__logo">
                <BrandMark />
              </span>
              <p>
                {profile.title} based in {profile.location.split(",")[0]}. Turning repetitive work into systems that run themselves.
              </p>
              {profile.available && (
                <span className="mono footer__avail">
                  <span className="dot dot--live" /> Available for new projects
                </span>
              )}
            </div>
            <div className="footer__col">
              <span className="mono dim">Connect</span>
              {profile.socials.map((s) => (
                <a key={s.label} className="fsocial" href={s.href} target="_blank" rel="noopener noreferrer">
                  <span className="fsocial__icon">
                    <ToolIcon name={s.icon} size={18} />
                  </span>
                  {s.label}
                  <span className="fsocial__arrow" aria-hidden="true">
                    ↗
                  </span>
                </a>
              ))}
            </div>
            <div className="footer__col">
              <span className="mono dim">Email</span>
              {profile.emails.map((e) => (
                <CopyEmail key={e.address} address={e.address} label={profile.emails.length > 1 ? e.label : undefined} />
              ))}
            </div>
            <div className="footer__col footer__col--top">
              <BackToTop />
              <span className="mono dim">Back to top</span>
            </div>
          </div>
          <div className="footer__bottom mono dim">
            <span>
              ©{new Date().getFullYear()} {fullName}
            </span>
            <span>{profile.title}</span>
            <span>{profile.location}</span>
          </div>
        </div>
        <FooterName text={fullName} />
      </footer>
    </>
  );
}
