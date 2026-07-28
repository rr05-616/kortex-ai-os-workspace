import { motion } from "framer-motion";
import { useNavigate } from "react-router";
import { Sparkles, Check, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";

const plans = [
  {
    name: "Starter",
    description: "Perfect for small teams getting started with AI-powered project management.",
    price: "Free",
    period: "forever",
    features: [
      "Up to 3 projects",
      "5 team members",
      "AI task suggestions",
      "Kanban board",
      "Basic analytics",
    ],
    cta: "Get Started",
    popular: false,
  },
  {
    name: "Professional",
    description: "For growing teams that need advanced AI capabilities and insights.",
    price: "$29",
    period: "/month per user",
    features: [
      "Unlimited projects",
      "Up to 20 team members",
      "Full AI Copilot",
      "Sprint planning AI",
      "Predictive analytics",
      "Risk detection",
      "Integrations",
    ],
    cta: "Start Free Trial",
    popular: true,
  },
  {
    name: "Enterprise",
    description: "For organizations requiring enterprise-grade security and customization.",
    price: "Custom",
    period: "contact us",
    features: [
      "Everything in Professional",
      "Unlimited team members",
      "Custom AI models",
      "Dedicated support",
      "SSO & SAML",
      "Audit logs",
      "Custom integrations",
      "SLA guarantee",
    ],
    cta: "Contact Sales",
    popular: false,
  },
];

export default function Pricing() {
  const navigate = useNavigate();

  return (
    <section id="pricing" className="relative py-28 px-4">
      {/* Background glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] rounded-full bg-[#0E9F6E]/[0.02] blur-[120px] pointer-events-none" />

      <div className="max-w-6xl mx-auto">
        {/* Section Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <span className="inline-flex items-center px-3.5 py-1.5 rounded-full text-xs font-medium bg-[#0E9F6E]/10 text-[#0E9F6E] border border-[#0E9F6E]/20 mb-6">
            <Sparkles className="w-3 h-3 mr-1.5" />
            Simple Pricing
          </span>
          <h2 className="text-4xl sm:text-5xl font-bold tracking-tight mb-4">
            Choose Your{" "}
            <span className="text-gradient-green">Plan</span>
          </h2>
          <p className="text-muted-foreground/70 text-lg max-w-2xl mx-auto">
            Start free. Scale as you grow. No hidden fees.
          </p>
        </motion.div>

        {/* Pricing Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 max-w-5xl mx-auto">
          {plans.map((plan, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-50px" }}
              transition={{ duration: 0.5, delay: i * 0.1 }}
              whileHover={{ y: -4 }}
              className={`relative glass-card rounded-3xl p-8 transition-all duration-300 flex flex-col ${
                plan.popular
                  ? "ring-1 ring-[#0E9F6E]/20 shadow-xl shadow-green-500/5"
                  : ""
              }`}
            >
              {/* Popular Badge */}
              {plan.popular && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <span className="px-4 py-1 rounded-full text-[10px] font-semibold bg-[#0E9F6E] text-white shadow-lg shadow-green-500/20">
                    Most Popular
                  </span>
                </div>
              )}

              {/* Plan Header */}
              <div className="mb-6">
                <h3 className="text-lg font-semibold text-foreground">
                  {plan.name}
                </h3>
                <p className="mt-2 text-sm text-muted-foreground/70">
                  {plan.description}
                </p>
              </div>

              {/* Price */}
              <div className="mb-6">
                <div className="flex items-baseline gap-1">
                  <span className="text-4xl font-bold text-foreground">
                    {plan.price}
                  </span>
                  <span className="text-sm text-muted-foreground">
                    {plan.period}
                  </span>
                </div>
              </div>

              {/* Features */}
              <div className="flex-1 space-y-3 mb-8">
                {plan.features.map((feature, j) => (
                  <div key={j} className="flex items-start gap-3">
                    <Check className="w-4 h-4 text-[#0E9F6E] shrink-0 mt-0.5" />
                    <span className="text-sm text-muted-foreground/80">
                      {feature}
                    </span>
                  </div>
                ))}
              </div>

              {/* CTA */}
              <Button
                onClick={() => navigate("/auth")}
                className={`w-full rounded-full h-11 text-sm font-medium transition-all duration-300 ${
                  plan.popular
                    ? "bg-[#0E9F6E] hover:bg-[#0C8A5F] text-white shadow-lg shadow-green-500/20 hover:shadow-xl hover:shadow-green-500/30"
                    : "glass hover:glass-strong text-foreground"
                }`}
              >
                {plan.cta}
                <ArrowRight className="w-3.5 h-3.5 ml-1.5" />
              </Button>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
