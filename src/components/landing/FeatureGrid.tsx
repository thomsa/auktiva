import React from "react";
import { useTranslations } from "next-intl";

const featureKeys = [
  {
    key: "realTimeBidding",
    icon: "icon-[tabler--bolt]",
    color: "text-yellow-500",
    bg: "bg-yellow-500/10",
  },
  {
    key: "privateSecure",
    icon: "icon-[tabler--shield-lock]",
    color: "text-emerald-500",
    bg: "bg-emerald-500/10",
  },
  {
    key: "multiCurrency",
    icon: "icon-[tabler--world-dollar]",
    color: "text-blue-500",
    bg: "bg-blue-500/10",
  },
  {
    key: "smartNotifications",
    icon: "icon-[tabler--bell-ringing]",
    color: "text-purple-500",
    bg: "bg-purple-500/10",
  },
  {
    key: "richMedia",
    icon: "icon-[tabler--photo-star]",
    color: "text-pink-500",
    bg: "bg-pink-500/10",
  },
  {
    key: "offlineExchange",
    icon: "icon-[tabler--transfer]",
    color: "text-orange-500",
    bg: "bg-orange-500/10",
  },
];

export function FeatureGrid() {
  const t = useTranslations("landing.features");

  return (
    <section id="features" className="py-32 relative bg-base-200/30">
      <div className="container mx-auto px-4">
        <div className="text-center max-w-3xl mx-auto mb-20">
          <h2 className="text-3xl md:text-5xl font-bold mb-6">
            {t("sectionTitle")} <br />
            <span className="text-primary">{t("sectionTitleHighlight")}</span>
          </h2>
          <p className="text-xl text-base-content/60">
            {t("sectionDescription")}
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
          {featureKeys.map((feature, idx) => (
            <div
              key={idx}
              className="group p-8 rounded-3xl bg-base-100 border border-base-content/5 hover:border-primary/20 hover:shadow-xl hover:shadow-primary/5 transition-all duration-300 hover:-translate-y-1"
            >
              <div
                className={`w-14 h-14 rounded-2xl ${feature.bg} flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300`}
              >
                <span
                  className={`${feature.icon} ${feature.color} size-8`}
                ></span>
              </div>
              <h3 className="text-xl font-bold mb-3">
                {t(`${feature.key}.title`)}
              </h3>
              <p className="text-base-content/60 leading-relaxed">
                {t(`${feature.key}.description`)}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
