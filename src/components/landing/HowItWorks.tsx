import { useTranslations } from "next-intl";

export function HowItWorks() {
  const t = useTranslations("landing.howItWorks");

  const steps = [
    { num: "01", key: "step1" },
    { num: "02", key: "step2" },
    { num: "03", key: "step3" },
    { num: "04", key: "step4" },
    { num: "05", key: "step5" },
  ];

  return (
    <section id="how-it-works" className="py-32 bg-base-100">
      <div className="container mx-auto px-4">
        <div className="flex flex-col lg:flex-row gap-16 items-center">
          <div className="lg:w-1/2">
            <h2 className="text-4xl md:text-5xl font-bold mb-8 leading-tight">
              {t("sectionTitle")} <br />
              <span className="text-secondary">
                {t("sectionTitleHighlight")}
              </span>
            </h2>
            <p className="text-xl text-base-content/60 mb-12">
              {t("sectionDescription")}
            </p>

            <div className="space-y-8">
              {steps.map((step, idx) => (
                <div key={idx} className="flex gap-6 group">
                  <div className="shrink-0 w-12 h-12 rounded-full border-2 border-base-content/10 flex items-center justify-center font-bold text-lg text-base-content/40 group-hover:border-primary group-hover:text-primary transition-colors duration-300">
                    {step.num}
                  </div>
                  <div>
                    <h3 className="text-xl font-bold mb-2">
                      {t(`${step.key}.title`)}
                    </h3>
                    <p className="text-base-content/60">
                      {t(`${step.key}.description`)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="lg:w-1/2 w-full">
            <div className="relative">
              <div className="absolute inset-0 bg-linear-to-tr from-primary/20 to-secondary/20 rounded-3xl blur-3xl"></div>
              <div className="relative bg-base-200 rounded-3xl p-8 border border-base-content/5 shadow-2xl">
                {/* Abstract visualization of workflow */}
                <div className="space-y-4">
                  <div className="h-40 rounded-xl bg-base-100 p-4 shadow-sm border border-base-content/5 animate-pulse">
                    <div className="w-1/3 h-4 bg-base-content/10 rounded mb-4"></div>
                    <div className="flex gap-4">
                      <div className="w-24 h-24 bg-base-content/5 rounded-lg"></div>
                      <div className="flex-1 space-y-3">
                        <div className="w-full h-3 bg-base-content/5 rounded"></div>
                        <div className="w-2/3 h-3 bg-base-content/5 rounded"></div>
                        <div className="w-1/2 h-8 bg-primary/20 rounded mt-auto"></div>
                      </div>
                    </div>
                  </div>
                  <div className="h-20 rounded-xl bg-base-100 p-4 flex items-center justify-between shadow-sm border border-base-content/5">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-secondary/20"></div>
                      <div className="w-32 h-3 bg-base-content/10 rounded"></div>
                    </div>
                    <div className="w-20 h-8 bg-secondary rounded text-secondary-content flex items-center justify-center text-xs font-bold">
                      {t("newBid")}
                    </div>
                  </div>
                  <div className="h-20 rounded-xl bg-base-100 p-4 flex items-center justify-between shadow-sm border border-base-content/5 opacity-60">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-base-content/10"></div>
                      <div className="w-32 h-3 bg-base-content/10 rounded"></div>
                    </div>
                    <div className="w-20 h-8 bg-base-content/10 rounded"></div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
