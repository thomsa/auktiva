import Link from "next/link";

export function CallToAction() {
  return (
    <section className="py-20 px-4">
      <div className="container mx-auto">
        <div className="relative rounded-[3rem] overflow-hidden bg-primary text-primary-content px-8 py-20 text-center">
          {/* Background decorative elements */}
          <div className="absolute top-0 left-0 w-full h-full overflow-hidden z-0">
            <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-white/10 rounded-full blur-[100px] -translate-y-1/2 translate-x-1/2"></div>
            <div className="absolute bottom-0 left-0 w-[600px] h-[600px] bg-black/10 rounded-full blur-[100px] translate-y-1/2 -translate-x-1/2"></div>
          </div>

          <div className="relative z-10 max-w-3xl mx-auto">
            <h2 className="text-4xl md:text-6xl font-extrabold mb-8 tracking-tight">
              Ready to host your <br /> next big event?
            </h2>
            <p className="text-xl opacity-90 mb-12 max-w-2xl mx-auto font-light">
              Join thousands of organizers using Auktiva to raise funds
              effortlessly. Open source, free, and designed for you.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link
                href="/register"
                className="btn btn-lg bg-white text-primary hover:bg-white/90 border-none shadow-xl h-14 px-8 rounded-full"
              >
                Get Started for Free
              </Link>
              <Link
                href="https://github.com/thomsa/auktiva"
                target="_blank"
                className="btn btn-lg btn-outline border-white/30 text-white hover:bg-white/10 hover:border-white h-14 px-8 rounded-full"
              >
                Self-Host
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
