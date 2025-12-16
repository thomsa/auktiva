import Link from "next/link";
import { useEffect, useState } from "react";
import packageJson from "../../../package.json";

export function Hero() {
  const [mounted, setMounted] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/exhaustive-deps
    setMounted(true);
  }, []);

  return (
    <section className="relative min-h-screen flex items-center justify-center pt-20 overflow-hidden">
      {/* Background Elements */}
      <div className="absolute inset-0 -z-10">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-primary/20 rounded-full blur-[128px] animate-pulse"></div>
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-secondary/20 rounded-full blur-[128px] animate-pulse delay-1000"></div>
        <div className="absolute inset-0 bg-[url('/grid.svg')] opacity-[0.03]"></div>
      </div>

      <div className="container mx-auto px-4 text-center relative z-10">
        <div
          className={`transition-all duration-1000 transform ${
            mounted ? "translate-y-0 opacity-100" : "translate-y-10 opacity-0"
          }`}
        >
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-base-200/50 border border-base-content/10 backdrop-blur-sm mb-8 hover:border-primary/50 transition-colors cursor-default">
            <span className="relative flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-primary"></span>
            </span>
            <span className="text-sm font-medium text-base-content/80">
              {packageJson.version} is now live
            </span>
          </div>

          <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight mb-8 leading-tight">
            Auctions made <br />
            <span className="bg-linear-to-r from-primary via-secondary to-accent bg-clip-text text-transparent">
              simple & social
            </span>
          </h1>

          <p className="text-xl md:text-2xl text-base-content/60 max-w-2xl mx-auto mb-12 leading-relaxed">
            The open-source platform for modern fundraising. Host private
            auctions, invite your community, and manage everything in one place.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            <Link
              href="/register"
              className="btn btn-primary btn-lg h-14 px-8 rounded-full shadow-xl shadow-primary/20 hover:shadow-primary/40 hover:-translate-y-1 transition-all duration-300"
            >
              <span className="icon-[tabler--rocket] size-6"></span>
              Start Your Auction
            </Link>
            <Link
              href="https://github.com/thomsa/auktiva"
              target="_blank"
              className="btn btn-ghost btn-lg h-14 px-8 rounded-full border border-base-content/10 hover:bg-base-200 hover:border-base-content/20 transition-all duration-300"
            >
              <span className="icon-[tabler--brand-github] size-6"></span>
              View on GitHub
            </Link>
          </div>

          <div className="mt-16 p-4 mb-18 rounded-2xl bg-base-200/30 border border-base-content/5 backdrop-blur-sm max-w-4xl mx-auto shadow-2xl transform hover:scale-[1.01] transition-transform duration-500">
            {/* Mock UI/Screenshot placeholder */}
            <div className="aspect-video rounded-xl overflow-hidden relative group bg-base-200 ">
              {!imageLoaded && (
                <div className="absolute inset-0 skeleton w-full h-full rounded-none"></div>
              )}
              <img
                src="/pictures/recording.gif"
                alt="Interactive Demo Preview"
                className={`w-full h-full object-cover transition-opacity duration-500 ${
                  imageLoaded ? "opacity-100" : "opacity-0"
                }`}
                onLoad={() => setImageLoaded(true)}
              />

              {/* Floating Cards Animation */}
              <div className="absolute top-10 left-10 w-64 h-40 bg-base-100 rounded-lg shadow-lg border border-base-content/5 p-4 transform -rotate-6 group-hover:-rotate-3 transition-transform duration-500 hidden sm:block">
                <div className="flex gap-3 mb-3">
                  <div className="w-12 h-12 rounded bg-primary/20"></div>
                  <div className="space-y-2">
                    <div className="w-32 h-4 rounded bg-base-content/10"></div>
                    <div className="w-20 h-3 rounded bg-base-content/5"></div>
                  </div>
                </div>
                <div className="flex justify-between items-end">
                  <div className="w-16 h-6 rounded bg-secondary/20"></div>
                  <div className="w-20 h-8 rounded bg-primary text-primary-content text-xs flex items-center justify-center">
                    Bid Now
                  </div>
                </div>
              </div>

              <div className="absolute bottom-10 right-10 w-64 h-40 bg-base-100 rounded-lg shadow-lg border border-base-content/5 p-4 transform rotate-3 group-hover:rotate-1 transition-transform duration-500 z-10 hidden sm:block">
                <div className="flex gap-3 mb-3">
                  <div className="w-12 h-12 rounded bg-secondary/20"></div>
                  <div className="space-y-2">
                    <div className="w-32 h-4 rounded bg-base-content/10"></div>
                    <div className="w-20 h-3 rounded bg-base-content/5"></div>
                  </div>
                </div>
                <div className="flex justify-between items-end">
                  <div className="w-16 h-6 rounded bg-primary/20"></div>
                  <div className="w-20 h-8 rounded bg-primary text-primary-content text-xs flex items-center justify-center">
                    Bid Now
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
