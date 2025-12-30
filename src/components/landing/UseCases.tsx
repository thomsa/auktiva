"use client";

import { useTranslations } from "next-intl";

const useCases = [
  {
    key: "charity",
    icon: "icon-[tabler--heart-handshake]",
    color: "text-primary",
    bgColor: "bg-primary/10",
  },
  {
    key: "declutter",
    icon: "icon-[tabler--home-move]",
    color: "text-secondary",
    bgColor: "bg-secondary/10",
  },
  {
    key: "family",
    icon: "icon-[tabler--users-group]",
    color: "text-accent",
    bgColor: "bg-accent/10",
  },
  {
    key: "office",
    icon: "icon-[tabler--building]",
    color: "text-info",
    bgColor: "bg-info/10",
  },
];

export function UseCases() {
  const t = useTranslations("landing.useCases");

  return (
    <section className="py-24 bg-base-200/50">
      <div className="container mx-auto px-4">
        {/* Section Header */}
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            {t("sectionTitle")}{" "}
            <span className="bg-linear-to-r from-primary to-secondary bg-clip-text text-transparent">
              {t("sectionTitleHighlight")}
            </span>
          </h2>
          <p className="text-base-content/60 max-w-2xl mx-auto text-lg">
            {t("sectionDescription")}
          </p>
        </div>

        {/* Use Cases Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-6xl mx-auto">
          {useCases.map((useCase) => (
            <div
              key={useCase.key}
              className="card bg-base-100 border border-base-content/5 hover:border-primary/20 transition-all duration-300 hover:shadow-xl hover:-translate-y-1"
            >
              <div className="card-body items-center text-center p-6">
                <div
                  className={`w-16 h-16 rounded-2xl ${useCase.bgColor} flex items-center justify-center mb-4`}
                >
                  <span className={`${useCase.icon} size-8 ${useCase.color}`} />
                </div>
                <h3 className="card-title text-lg mb-2">
                  {t(`${useCase.key}.title`)}
                </h3>
                <p className="text-base-content/60 text-sm">
                  {t(`${useCase.key}.description`)}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
