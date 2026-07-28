import { motion } from "framer-motion";
import { Github, Twitter, Linkedin, Mail, Heart } from "lucide-react";

const footerLinks = [
  {
    title: "Product",
    links: ["Features", "Integrations", "Pricing", "Changelog", "Roadmap"],
  },
  {
    title: "Resources",
    links: ["Documentation", "API Reference", "Guides", "Community", "Status"],
  },
  {
    title: "Company",
    links: ["About", "Blog", "Careers", "Press", "Contact"],
  },
  {
    title: "Legal",
    links: ["Privacy", "Terms", "Security", "Cookies", "GDPR"],
  },
];

export default function Footer() {
  return (
    <footer className="relative pt-20 pb-10 px-4">
      {/* Divider */}
      <div className="max-w-6xl mx-auto mb-16">
        <div className="h-px bg-gradient-to-r from-transparent via-border/60 to-transparent" />
      </div>

      <div className="max-w-6xl mx-auto">
        <div className="grid grid-cols-2 md:grid-cols-5 gap-8 mb-12">
          {/* Brand Column */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="col-span-2 md:col-span-1"
          >
            <div className="flex items-center gap-2.5 mb-4">
              <div className="w-8 h-8 rounded-lg bg-[#0E9F6E] flex items-center justify-center">
                <span className="text-white font-bold text-sm tracking-tight">K</span>
              </div>
              <span className="font-semibold text-sm tracking-tight text-foreground">
                KORTEX
              </span>
            </div>
            <p className="text-sm text-muted-foreground/60 leading-relaxed max-w-xs">
              The AI-native project management operating system for modern
              engineering teams.
            </p>

            {/* Social */}
            <div className="flex items-center gap-3 mt-6">
              {[Github, Twitter, Linkedin, Mail].map((Icon, i) => (
                <a
                  key={i}
                  href="#"
                  className="w-8 h-8 rounded-full glass flex items-center justify-center hover:bg-[#0E9F6E]/10 transition-colors duration-200 group"
                >
                  <Icon className="w-3.5 h-3.5 text-muted-foreground group-hover:text-[#0E9F6E] transition-colors duration-200" />
                </a>
              ))}
            </div>
          </motion.div>

          {/* Link Columns */}
          {footerLinks.map((group, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: 0.1 * i }}
            >
              <h4 className="text-xs font-semibold text-foreground uppercase tracking-wider mb-4">
                {group.title}
              </h4>
              <ul className="space-y-2.5">
                {group.links.map((link, j) => (
                  <li key={j}>
                    <a
                      href="#"
                      className="text-sm text-muted-foreground/60 hover:text-foreground transition-colors duration-200"
                    >
                      {link}
                    </a>
                  </li>
                ))}
              </ul>
            </motion.div>
          ))}
        </div>

        {/* Bottom Bar */}
        <div className="pt-8 border-t border-border/40 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-xs text-muted-foreground/40">
            &copy; {new Date().getFullYear()} KORTEX AI. All rights reserved.
          </p>
          <p className="text-xs text-muted-foreground/40 flex items-center gap-1">
            Built with <Heart className="w-3 h-3 text-[#0E9F6E]" /> by the KORTEX team
          </p>
        </div>
      </div>
    </footer>
  );
}
