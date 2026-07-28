import { motion } from "framer-motion";
import { useNavigate } from "react-router";
import { Check, Sparkles } from "lucide-react";

const plans = [
  {
    name: "Starter",
    description: "Perfect for small teams getting started.",
    price: "Free",
    period: "forever",
    features: ["Up to 3 projects", "5 team members", "AI task suggestions", "Kanban board", "Basic analytics"],
    cta: "Get Started",
    popular: false,
  },
  {
    name: "Professional",
    description: "For teams needing advanced AI capabilities.",
    price: "$29",
    period: "/month per user",
    features: ["Unlimited projects", "Up to 20 members", "Full AI Copilot", "Sprint planning AI", "Predictive analytics", "Risk detection", "Integrations"],
    cta: "Start Free Trial",
    popular: true,
  },
  {
    name: "Enterprise",
    description: "For organizations requiring custom solutions.",
    price: "Custom",
    period: "contact us",
    features: ["Everything in Pro", "Unlimited members", "Custom AI models", "Dedicated support", "SSO & SAML", "Audit logs", "Custom integrations", "SLA guarantee"],
    cta: "Contact Sales",
    popular: false,
  },
];

export default function Pricing() {
  const navigate = useNavigate();

  return (
    <section id="pricing" className="relative py-28 px-4">
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[700px] rounded-full bg-[rgba(14,159,110,0.02)] blur-[120px] pointer-events-none" />

      <div className="max-w-6xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full glass mb-6">
            <Sparkles className="w-3 h-3 text-[#0E9F6E]" />
            <span className="text-xs font-medium text-[rgba(232,245,238,0.6)]">Simple Pricing</span>
          </div>
          <h2 className="text-4xl sm:text-5xl font-bold tracking-tight mb-4 text-[#E8F5EE]">
            Choose Your <span className="text-gradient-green">Plan</span>
          </h2>
          <p className="text-[rgba(232,245,238,0.45)] text-lg max-w-2xl mx-auto">
            Start free. Scale as you grow. No hidden fees.
          </p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 max-w-5xl mx-auto">
          {plans.map((plan, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: i * 0.1 }}
              whileHover={{ y: -4 }}
              className={`glass-card rounded-2xl p-7 flex flex-col ${
                plan.popular ? "ring-1 ring-[rgba(14,159,110,0.2)] shadow-lg shadow-[rgba(14,159,110,0.05)]" : ""
              }`}
            >
              {plan.popular && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <span className="px-4 py-1 rounded-full text-[10px] font-semibold bg-[#0E9F6E] text-white">
                    Most Popular
                  </span>
                </div>
              )}
              <div className="mb-6 relative">
                <h3 className="text-lg font-semibold text-[#E8F5EE]">{plan.name}</h3>
                <p className="mt-2 text-sm text-[rgba(232,245,238,0.4)]">{plan.description}</p>
              </div>
              <div className="mb-6">
                <span className="text-4xl font-bold text-[#E8F5EE]">{plan.price}</span>
                <span className="text-sm text-[rgba(232,245,238,0.35)] ml-1">{plan.period}</span>
              </div>
              <div className="flex-1 space-y-3 mb-8">
                {plan.features.map((f, j) => (
                  <div key={j} className="flex items-start gap-3">
                    <Check className="w-4 h-4 text-[#0E9F6E] shrink-0 mt-0.5" />
                    <span className="text-sm text-[rgba(232,245,238,0.55)]">{f}</span>
                  </div>
                ))}
              </div>
              <button
                onClick={() => navigate("/auth")}
                className={`w-full h-11 rounded-xl text-sm font-medium transition-all duration-300 ${
                  plan.popular
                    ? "btn-liquid btn-liquid-solid"
                    : "btn-liquid"
                }`}
              >
                {plan.cta}
              </button>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
