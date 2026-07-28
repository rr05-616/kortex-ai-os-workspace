import { Github, Twitter, Linkedin, Mail, Heart } from "lucide-react";

const footerLinks = [
  { title: "Product", links: ["Features", "Integrations", "Pricing", "Changelog", "Roadmap"] },
  { title: "Resources", links: ["Documentation", "API Reference", "Guides", "Community", "Status"] },
  { title: "Company", links: ["About", "Blog", "Careers", "Press", "Contact"] },
  { title: "Legal", links: ["Privacy", "Terms", "Security", "Cookies", "GDPR"] },
];

export default function Footer() {
  return (
    <footer className="relative pt-20 pb-10 px-4">
      <div className="max-w-6xl mx-auto mb-16">
        <div className="h-px bg-gradient-to-r from-transparent via-[rgba(255,255,255,0.06)] to-transparent" />
      </div>

      <div className="max-w-6xl mx-auto">
        <div className="grid grid-cols-2 md:grid-cols-5 gap-8 mb-12">
          <div className="col-span-2 md:col-span-1">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 rounded-lg bg-[rgba(14,159,110,0.15)] flex items-center justify-center">
                <span className="text-[#0E9F6E] font-bold text-sm">K</span>
              </div>
              <span className="font-semibold text-sm text-[#E8F5EE]">KORTEX</span>
            </div>
            <p className="text-sm text-[rgba(232,245,238,0.3)] leading-relaxed max-w-xs">
              The AI-native project management operating system.
            </p>
            <div className="flex items-center gap-3 mt-6">
              {[Github, Twitter, Linkedin, Mail].map((Icon, i) => (
                <a key={i} href="#" className="w-8 h-8 rounded-full glass flex items-center justify-center hover:bg-[rgba(14,159,110,0.1)] transition-colors group">
                  <Icon className="w-3.5 h-3.5 text-[rgba(232,245,238,0.3)] group-hover:text-[#0E9F6E] transition-colors" />
                </a>
              ))}
            </div>
          </div>

          {footerLinks.map((group, i) => (
            <div key={i}>
              <h4 className="text-xs font-semibold text-[rgba(232,245,238,0.6)] uppercase tracking-wider mb-4">
                {group.title}
              </h4>
              <ul className="space-y-2.5">
                {group.links.map((link, j) => (
                  <li key={j}>
                    <a href="#" className="text-sm text-[rgba(232,245,238,0.3)] hover:text-[#E8F5EE] transition-colors">
                      {link}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="pt-8 border-t border-[rgba(255,255,255,0.04)] flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-xs text-[rgba(232,245,238,0.2)]">
            © {new Date().getFullYear()} KORTEX AI. All rights reserved.
          </p>
          <p className="text-xs text-[rgba(232,245,238,0.2)] flex items-center gap-1">
            Built with <Heart className="w-3 h-3 text-[#0E9F6E]" /> by the KORTEX team
          </p>
        </div>
      </div>
    </footer>
  );
}
